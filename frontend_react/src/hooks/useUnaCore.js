import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiBase, getWebSocketBase } from '../config';
import { authFetch, createWebSocketTicket } from '../auth/session';
import { isImmediateGestureRequest, parseImmediateGesture } from '../live2d/gestureParser';
import { createImmediateMotion, createListeningMotion } from '../live2d/gestureGenerator';
import { normalizeMotionEvent } from '../live2d/motionProtocol';
import { readSelectedLive2DModel } from '../live2d/modelSelection';
import { createAudioStreamQueue, MAX_CHUNK_INDEX } from '../audio/audioStreamQueue';
import { createAudioBufferLoader, startSyncedPlayback } from '../audio/syncedAudioPlayer';

const MAX_SEEN_MOTION_IDS = 100;
const AUDIO_RUNTIME_UNAVAILABLE = 'AUDIO_RUNTIME_UNAVAILABLE';
const SPEECH_METRIC_FIELDS = ['replyId', 'chunkIndex', 'stage', 'durationMs', 'status'];

export function reportSpeechMetric(metric) {
    try {
        const source = metric && typeof metric === 'object' ? metric : {};
        const safeMetric = {};
        for (const field of SPEECH_METRIC_FIELDS) safeMetric[field] = source[field];
        console.info('[SpeechMetric]', safeMetric);
    } catch {
        // Telemetry must never interrupt queueing or playback.
    }
}

function findReplyMessageIndex(messages, replyId) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (messages[index]?.replyId === replyId) return index;
    }
    return -1;
}

class AudioRuntimeUnavailableError extends Error {
    constructor() {
        super('AudioContext could not be resumed');
        this.name = 'AudioRuntimeUnavailableError';
        this.code = AUDIO_RUNTIME_UNAVAILABLE;
    }
}

function isAudioRuntimeUnavailable(error) {
    const seen = new Set();
    let current = error;
    for (let depth = 0; depth <= 1; depth += 1) {
        const objectLike = current !== null
            && (typeof current === 'object' || typeof current === 'function');
        if (!objectLike || seen.has(current)) return false;
        seen.add(current);
        if (current.code === AUDIO_RUNTIME_UNAVAILABLE) return true;
        if (current instanceof AudioRuntimeUnavailableError) return true;
        if (depth === 1) return false;
        try {
            current = current.cause;
        } catch {
            return false;
        }
    }
    return false;
}

function pruneSeenMotionIds(seenMotionIds, nowMs) {
    for (const [motionId, expiresAtMs] of seenMotionIds) {
        if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) seenMotionIds.delete(motionId);
    }
}

export function useUnaCore(authenticated) {
    const [messages, setMessages] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState("CONNECTING");
    const [lipValue, setLipValue] = useState({ openY: 0, form: 0, volume: 0 });
    const [motionEvent, setMotionEvent] = useState(null);
    const [motionGeneration, setMotionGeneration] = useState(0);

    const websocketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const heartbeatIntervalRef = useRef(null);
    const audioContext = useRef(null);
    const audioLoaderRef = useRef(null);
    const audioUnlockPromiseRef = useRef(null);
    const activePlaybackRef = useRef(null);
    const replayAbortRef = useRef(null);
    const streamQueueRef = useRef(null);
    const activeStreamReplyRef = useRef(null);
    const currentLipRef = useRef({ openY: 0, form: 0, volume: 0 });
    const mountedRef = useRef(true);
    const isConnecting = useRef(false);
    const seenActionIdsRef = useRef(new Set());
    const seenMotionIdsRef = useRef(new Map());
    const connectionGenerationRef = useRef(0);

    function makeAbortError() {
        const error = new Error('Audio playback aborted');
        error.name = 'AbortError';
        return error;
    }

    function awaitWithAbort(promise, signal) {
        if (!signal) return Promise.resolve(promise);
        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (callback, value) => {
                if (settled) return;
                settled = true;
                signal.removeEventListener('abort', abortAwait);
                callback(value);
            };
            const abortAwait = () => finish(reject, makeAbortError());

            Promise.resolve(promise).then(
                value => finish(resolve, value),
                error => finish(reject, error),
            );
            signal.addEventListener('abort', abortAwait, { once: true });
            if (signal.aborted) abortAwait();
        });
    }

    function setLipSyncValue(value = 'X') {
        const next = { rhubarb: value };
        currentLipRef.current = next;
        if (mountedRef.current) setLipValue(next);
    }

    function ensureAudioRuntime() {
        if (!audioContext.current) {
            const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
            if (typeof AudioContextConstructor !== 'function') {
                throw new Error('AudioContext is unavailable');
            }
            audioContext.current = new AudioContextConstructor();
            audioLoaderRef.current = createAudioBufferLoader({
                audioContext: audioContext.current,
                fetchImpl: (...args) => fetch(...args),
            });
        }
        return audioContext.current;
    }

    function unlockAudioRuntime() {
        if (audioUnlockPromiseRef.current) return audioUnlockPromiseRef.current;
        let context;
        try {
            context = ensureAudioRuntime();
        } catch {
            // Text, recording, and Live2D actions remain available without Web Audio.
            return Promise.resolve(false);
        }
        if (context.state === 'running') return Promise.resolve(true);
        if (context.state !== 'suspended' || typeof context.resume !== 'function') {
            return Promise.resolve(false);
        }

        let resumeResult;
        try {
            resumeResult = context.resume();
        } catch {
            return Promise.resolve(false);
        }

        let pendingUnlock;
        pendingUnlock = Promise.resolve(resumeResult)
            .then(() => true, () => false)
            .finally(() => {
                if (audioUnlockPromiseRef.current === pendingUnlock) {
                    audioUnlockPromiseRef.current = null;
                }
            });
        audioUnlockPromiseRef.current = pendingUnlock;
        return pendingUnlock;
    }

    async function resumeAudioContext() {
        const pendingUnlock = unlockAudioRuntime();
        const context = audioContext.current;
        const unlocked = await pendingUnlock;
        if (!context || audioContext.current !== context) {
            throw makeAbortError();
        }
        if (!unlocked && context.state !== 'running') {
            throw new AudioRuntimeUnavailableError();
        }
        return context;
    }

    async function prepareAudioChunk(chunk, { signal } = {}) {
        if (!chunk?.audio_url) throw new Error('Audio chunk URL is unavailable');
        ensureAudioRuntime();
        const audioBuffer = await awaitWithAbort(
            audioLoaderRef.current(chunk.audio_url),
            signal,
        );
        return { audioBuffer, visemes: chunk.visemes || [] };
    }

    function playPreparedChunk(prepared, { signal } = {}) {
        return new Promise((resolve, reject) => {
            let handle = null;
            let settled = false;

            const finish = (error) => {
                if (settled) return;
                settled = true;
                signal?.removeEventListener('abort', abortPlayback);
                if (activePlaybackRef.current === handle) activePlaybackRef.current = null;
                if (error) reject(error);
                else resolve();
            };
            const abortPlayback = () => {
                handle?.stop();
                finish(makeAbortError());
            };

            if (signal?.aborted) {
                finish(makeAbortError());
                return;
            }
            signal?.addEventListener('abort', abortPlayback, { once: true });

            Promise.resolve().then(async () => {
                const context = await resumeAudioContext();
                if (signal?.aborted) throw makeAbortError();
                handle = startSyncedPlayback({
                    audioContext: context,
                    audioBuffer: prepared.audioBuffer,
                    visemes: prepared.visemes,
                    onViseme: setLipSyncValue,
                    onEnded: () => finish(),
                    onError: error => finish(error),
                    requestFrame: callback => requestAnimationFrame(callback),
                    cancelFrame: frameId => cancelAnimationFrame(frameId),
                });
                if (!settled) activePlaybackRef.current = handle;
            }).catch(error => finish(error));
        });
    }

    function getStreamQueue() {
        if (!streamQueueRef.current) {
            streamQueueRef.current = createAudioStreamQueue({
                prepareChunk: prepareAudioChunk,
                playChunk: playPreparedChunk,
                now: () => globalThis.performance?.now?.() ?? Date.now(),
                reportMetric: reportSpeechMetric,
            });
        }
        return streamQueueRef.current;
    }

    function stopCurrentAudio() {
        streamQueueRef.current?.stop();
        activeStreamReplyRef.current = null;
        replayAbortRef.current?.abort();
        replayAbortRef.current = null;
        activePlaybackRef.current?.stop();
        activePlaybackRef.current = null;
        setLipSyncValue('X');
    }

    function disposeAudioRuntime() {
        stopCurrentAudio();
        const context = audioContext.current;
        audioContext.current = null;
        audioLoaderRef.current = null;
        audioUnlockPromiseRef.current = null;
        try {
            Promise.resolve(context?.close?.()).catch(() => {});
        } catch {
            // Closing is best-effort during hook teardown.
        }
    }

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
        const activationEvents = ['pointerdown', 'touchstart', 'keydown'];
        let active = true;
        let listening = true;
        const removeActivationListeners = () => {
            if (!listening) return;
            listening = false;
            for (const eventName of activationEvents) {
                window.removeEventListener(eventName, activateAudio, true);
            }
        };
        const activateAudio = () => {
            unlockAudioRuntime().then(unlocked => {
                if (!active || !listening) return;
                if (unlocked || audioContext.current?.state === 'running') {
                    removeActivationListeners();
                }
            });
        };

        for (const eventName of activationEvents) {
            window.addEventListener(eventName, activateAudio, { capture: true, passive: true });
        }
        return () => {
            active = false;
            removeActivationListeners();
        };
    }, [authenticated]);

    // --- 1. 初始化：同步历史记录 ---
    useEffect(() => {
        if (!authenticated) return;
        let cancelled = false;
        const fetchHistory = async () => {
            try {
                const res = await authFetch('/history');
                if (!res.ok) throw new Error('无法获取聊天记录');
                const data = await res.json();

                if (!cancelled && Array.isArray(data)) {
                    const formatted = data.map(m => ({
                        role: m.role,
                        text: m.content,
                        content: m.content,
                        audio_url: formatUrl(m.audio_path), // 格式化音频地址
                        isAI: m.role === 'ai',
                        emotion: m.emotion || 'neutral',
                        date: new Date(m.timestamp)
                    })).reverse();
                    setMessages(formatted);
                }
            } catch (e) {
                if (!cancelled) console.error("❌ 获取历史失败:", e);
            }
        };
        fetchHistory();
        return () => { cancelled = true; };
    }, [authenticated]);

    // --- 2. WebSocket 连接 (含心跳 & 重连) ---
    const connectWebSocket = useCallback(async () => {
        if (!authenticated || isConnecting.current) return;
        isConnecting.current = true;
        setConnectionStatus("CONNECTING");
        const connectionGeneration = connectionGenerationRef.current + 1;
        connectionGenerationRef.current = connectionGeneration;
        setMotionGeneration(connectionGeneration);

        try {
            const ticket = await createWebSocketTicket();
            if (connectionGeneration !== connectionGenerationRef.current) return;
            const wsUrl = `${getWebSocketBase()}/ws/chat?ticket=${encodeURIComponent(ticket)}`;
            console.log("🔌 [WS] 准备连接");
            const ws = new WebSocket(wsUrl);
            websocketRef.current = ws;

            ws.onopen = () => {
                if (connectionGeneration !== connectionGenerationRef.current) {
                    ws.close();
                    return;
                }
                console.log("✅ [WS] 连接成功");
                setConnectionStatus("OPEN");
                isConnecting.current = false;
                websocketRef.current = ws;

                // 💓 心跳保活 (30s)
                if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
                }, 30000);
            };

            ws.onmessage = (event) => {
                if (connectionGeneration !== connectionGenerationRef.current) return;
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'pong') return;

                    // 收到语音识别同步
                    if (data.type === 'user_sync') {
                        setMessages(prev => {
                            if (data.client_message_id && prev.some(message => message.clientMessageId === data.client_message_id)) {
                                return prev;
                            }
                            return [...prev, {
                                role: 'user',
                                text: data.text,
                                content: data.text,
                                clientMessageId: data.client_message_id,
                                date: new Date()
                            }];
                        });
                        return;
                    }

                    // 收到动作标签指令
                    if (data.type === 'chat_action') {
                        setMotionEvent({ action: data.action, params: data.params || {}, timestamp: Date.now() });
                        return;
                    }

                    if (data.type === 'live2d_action_v2') {
                        if (!data.action_id || seenActionIdsRef.current.has(data.action_id)) return;
                        if (seenActionIdsRef.current.size >= 100) seenActionIdsRef.current.clear();
                        seenActionIdsRef.current.add(data.action_id);
                        setMotionEvent({ ...data, timestamp: Date.now() });
                        return;
                    }

                    if (data.type === 'live2d_motion_v3') {
                        if (data.source !== 'ai_reply') return;
                        const nowMs = Date.now();
                        const normalizedMotion = normalizeMotionEvent(data, { nowMs });
                        if (!normalizedMotion) return;

                        const seenMotionIds = seenMotionIdsRef.current;
                        pruneSeenMotionIds(seenMotionIds, nowMs);
                        if (seenMotionIds.has(normalizedMotion.motion_id)) return;
                        if (seenMotionIds.size >= MAX_SEEN_MOTION_IDS) {
                            const oldestMotionId = seenMotionIds.keys().next().value;
                            if (oldestMotionId !== undefined) seenMotionIds.delete(oldestMotionId);
                        }
                        seenMotionIds.set(normalizedMotion.motion_id, normalizedMotion.expires_at_ms);
                        setMotionEvent(normalizedMotion);
                        return;
                    }

                    // 收到 AI 回复
                    if (data.type === 'final_reply' || data.type === 'ai_reply') {
                        const fullAudioUrl = formatUrl(data.audio_url || data.audio);
                        const newMsg = {
                            role: 'ai',
                            text: data.text || "...",
                            content: data.text || "...",
                            audio_url: fullAudioUrl,
                            visemes: data.visemes || [],
                            isAI: true,
                            emotion: data.emotion,
                            date: new Date()
                        };

                        // 🔥 音文同步爆发：只有等音频 Buffer 准备就绪，文本才被展示。防止“文字泄露”导致的脱节感
                        if (fullAudioUrl) {
                            playAudio(fullAudioUrl, data.visemes || [], () => {
                                setMessages(prev => [...prev, newMsg]);
                            });
                        } else {
                            setMessages(prev => [...prev, newMsg]);
                        }
                    }

                    // 🔥 [优化] 收到文字碎片：立即上屏显示，不等音频
                    if (data.type === 'text_stream_chunk') {
                        if (
                            typeof data.reply_id !== 'string'
                            || data.reply_id.trim().length === 0
                            || data.reply_id !== activeStreamReplyRef.current
                        ) return;
                        const chunkText = data.text || '';
                        if (chunkText) {
                            setMessages(prev => {
                                const messageIndex = findReplyMessageIndex(prev, data.reply_id);
                                if (messageIndex >= 0) {
                                    const message = prev[messageIndex];
                                    if (!message.isStreamingAI) return prev;
                                    // 追加到已有的流式气泡
                                    const updated = [...prev];
                                    updated[messageIndex] = {
                                        ...message,
                                        text: message.text + chunkText,
                                        content: (message.content || '') + chunkText,
                                        emotion: data.emotion || message.emotion
                                    };
                                    return updated;
                                } else {
                                    // 第一个碎片，创建新的流式气泡
                                    return [...prev, {
                                        role: 'ai',
                                        text: chunkText,
                                        content: chunkText,
                                        isAI: true,
                                        emotion: data.emotion || 'neutral',
                                        date: new Date(),
                                        isStreamingAI: true,
                                        replyId: data.reply_id,
                                        chunkList: []
                                    }];
                                }
                            });
                        }
                        return;
                    }

                    // 🌊 开始处理流式分段音频
                    if (data.type === 'audio_stream_start') {
                        if (typeof data.reply_id !== 'string' || data.reply_id.trim().length === 0) return;
                        replayAbortRef.current?.abort();
                        replayAbortRef.current = null;
                        activePlaybackRef.current?.stop();
                        activePlaybackRef.current = null;
                        setLipSyncValue('X');
                        setMessages(prev => prev.map(message => (
                            message.isStreamingAI && message.replyId !== data.reply_id
                                ? { ...message, isStreamingAI: false }
                                : message
                        )));
                        activeStreamReplyRef.current = data.reply_id;
                        getStreamQueue().start(data.reply_id);
                        return;
                    }

                    // 收到单个句子的音频碎片（此时文字已先行上屏）
                    if (data.type === 'audio_stream_chunk') {
                        if (
                            typeof data.reply_id !== 'string'
                            || data.reply_id !== activeStreamReplyRef.current
                            || !Number.isSafeInteger(data.chunk_index)
                            || data.chunk_index < 0
                            || data.chunk_index > MAX_CHUNK_INDEX
                        ) return;
                        const chunk = {
                            index: data.chunk_index,
                            text: data.text,
                            audio_url: formatUrl(data.audio_url),
                            visemes: data.visemes || [],
                            emotion: data.emotion || 'neutral'
                        };
                        const enqueueResult = getStreamQueue().enqueue(data.reply_id, chunk);
                        if (!enqueueResult.accepted) return;

                        // 🔥 将音频碎片关联到当前流式气泡的 chunkList（供回放用）
                        setMessages(prev => {
                            const messageIndex = findReplyMessageIndex(prev, data.reply_id);
                            const message = prev[messageIndex];
                            if (message?.isStreamingAI) {
                                const updated = [...prev];
                                updated[messageIndex] = {
                                    ...message,
                                    chunkList: message.chunkList ? [...message.chunkList, chunk] : [chunk]
                                };
                                return updated;
                            }
                            return prev;
                        });
                        return;
                    }

                    // 流式结束标记：关闭当前流式气泡的追加状态
                    if (data.type === 'audio_stream_end') {
                        if (
                            typeof data.reply_id !== 'string'
                            || data.reply_id !== activeStreamReplyRef.current
                        ) return;
                        const sealResult = getStreamQueue().seal(data.reply_id);
                        if (!sealResult.accepted) return;
                        activeStreamReplyRef.current = null;
                        setMessages(prev => {
                            const messageIndex = findReplyMessageIndex(prev, data.reply_id);
                            const message = prev[messageIndex];
                            if (message?.isStreamingAI) {
                                const completeText = data.full_text || message.text;
                                const updated = [...prev];
                                updated[messageIndex] = {
                                    ...message,
                                    isStreamingAI: false,
                                    text: completeText,
                                    content: completeText,
                                };
                                return updated;
                            }
                            return prev;
                        });
                        return;
                    }
                } catch (e) { }
            };

            ws.onclose = (e) => {
                if (connectionGeneration !== connectionGenerationRef.current) return;
                console.log("❌ [WS] 断开:", e.code);
                stopCurrentAudio();
                setConnectionStatus("CLOSED");
                websocketRef.current = null;
                isConnecting.current = false;
                if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

                // 自动重连
                if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
            };

            ws.onerror = (e) => { ws.close(); };

        } catch (err) {
            if (connectionGeneration !== connectionGenerationRef.current) return;
            isConnecting.current = false;
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
        }
    }, [authenticated]);

    useEffect(() => {
        mountedRef.current = true;
        setLipSyncValue('X');
        connectWebSocket();
        return () => {
            mountedRef.current = false;
            connectionGenerationRef.current += 1;
            isConnecting.current = false;
            if (websocketRef.current) websocketRef.current.close();
            websocketRef.current = null;
            seenActionIdsRef.current.clear();
            seenMotionIdsRef.current.clear();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
            disposeAudioRuntime();
        };
    }, [connectWebSocket]);

    // --- 3. 辅助功能 ---

    // URL 格式化 (补全 http)
    const formatUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const apiBase = getApiBase();
        if (!apiBase) return path; // Web 环境保留相对路径
        return `${apiBase}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    // 发送文字
    const sendMessage = (text) => {
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
            unlockAudioRuntime();
            const clientMessageId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            setMessages(prev => [...prev, { role: 'user', text, content: text, clientMessageId, date: new Date() }]);
            const nowMs = Date.now();
            const modelName = readSelectedLive2DModel();
            const command = parseImmediateGesture(text);
            const localMotion = command
                ? createImmediateMotion(command, { nowMs, modelName })
                : (isImmediateGestureRequest(text) ? null : createListeningMotion({ nowMs }));
            setMotionEvent(localMotion);
            websocketRef.current.send(JSON.stringify({
                type: 'text', content: text, client_message_id: clientMessageId, live2d_model: modelName,
            }));
        } else {
            // 尝试重连
            if (connectionStatus === "CLOSED") connectWebSocket();
        }
    };

    // 发送语音 (二进制)
    const sendAudioData = (blobOrBuffer) => {
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
            unlockAudioRuntime();
            websocketRef.current.send(blobOrBuffer);
        }
    };

    // 发送图片 (Base64)
    // 只更新 UI 显示图片，不发 WebSocket 给普通聊天
    // 图片识别由 App.jsx 的 fetch(/api/vision_chat) 单独处理，防止两个回复冲突
    const sendImage = (base64) => {
        setMessages(prev => [...prev, {
            role: 'user',
            text: '[分享了一张图片]',
            isImage: true,
            img: base64,
            date: new Date()
        }]);
    };

    const interrupt = () => {
        stopCurrentAudio();
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
            websocketRef.current.send(JSON.stringify({ type: "interrupt" }));
        }
    };

    // 通知后端音频已发送完毕，触发 ASR 识别
    const sendStopSignal = () => {
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
            websocketRef.current.send(JSON.stringify({ text: "stop" }));
            console.log("🛑 [WS] Stop 信号已发送，等待 ASR 识别...");
        }
    };

    // 🔥 供外部使用的连续回放功能：按顺序纯净重放，不修改消息气泡
    const replayChunks = async (chunkList) => {
        stopCurrentAudio();
        if (!chunkList || chunkList.length === 0) return;

        const controller = new AbortController();
        replayAbortRef.current = controller;
        try {
            for (const chunk of chunkList) {
                if (controller.signal.aborted) break;
                try {
                    const prepared = await prepareAudioChunk(chunk, { signal: controller.signal });
                    await playPreparedChunk(prepared, { signal: controller.signal });
                } catch (error) {
                    if (
                        error?.name === 'AbortError'
                        || isAudioRuntimeUnavailable(error)
                    ) break;
                    // One unavailable replay chunk must not block later chunks.
                }
            }
        } finally {
            if (replayAbortRef.current === controller) replayAbortRef.current = null;
            setLipSyncValue('X');
        }
    };

    // 🔥 核心：播放音频 + 高阶物理音素同步 (AudioBuffer + Rhubarb 时间轴)
    const playAudio = async (url, visemes = [], onReady = null, onEnded = null) => {
        if (!url) {
            onEnded?.();
            return;
        }
        stopCurrentAudio();
        const controller = new AbortController();
        replayAbortRef.current = controller;
        let readyCalled = false;
        const notifyReady = () => {
            if (readyCalled) return;
            readyCalled = true;
            try { onReady?.(); } catch { }
        };
        try {
            const prepared = await prepareAudioChunk(
                { audio_url: url, visemes },
                { signal: controller.signal },
            );
            if (controller.signal.aborted) throw makeAbortError();
            notifyReady();
            await playPreparedChunk(prepared, { signal: controller.signal });
        } catch (error) {
            if (error?.name !== 'AbortError') notifyReady();
        } finally {
            if (replayAbortRef.current === controller) replayAbortRef.current = null;
            if (!controller.signal.aborted && mountedRef.current) {
                try { onEnded?.(); } catch { }
            }
        }
    };

    return {
        messages, setMessages, sendMessage, sendAudioData, sendImage,
        lipValue, interrupt, playAudio, connectionStatus,
        sendStopSignal,  // 供 useAudioRecorder 在录音结束后调用
        replayChunks,    // 新增：连续播放音频碎片
        motionEvent,
        motionGeneration,
        actionOverride: motionEvent, // P1 迁移期兼容旧调用方；Task 9 会统一改用 motionEvent
    };
}
