import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiBase, getWebSocketBase } from '../config';
import { authFetch, createWebSocketTicket } from '../auth/session';
import { parseImmediateGesture } from '../live2d/gestureParser';
import { createImmediateMotion, createListeningMotion } from '../live2d/gestureGenerator';
import { normalizeMotionEvent } from '../live2d/motionProtocol';

const MAX_SEEN_MOTION_IDS = 100;

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

    const websocketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const heartbeatIntervalRef = useRef(null);
    const audioContext = useRef(null);
    const currentAudioRef = useRef(null);
    const currentLipRef = useRef({ openY: 0, form: 0, volume: 0 });
    const isConnecting = useRef(false);
    const seenActionIdsRef = useRef(new Set());
    const seenMotionIdsRef = useRef(new Map());
    const connectionGenerationRef = useRef(0);

    // 🌊 流式音频列车队列
    const audioQueueRef = useRef([]);
    const isPlayingQueueRef = useRef(false);
    const expectedChunkIndexRef = useRef(0);

    // 🔥 新增：音频预加载缓存 (URL -> AudioBuffer)
    const audioCacheRef = useRef(new Map());

    // 🔥 新增：预加载音频到缓存
    const preloadAudio = async (url) => {
        if (!url || audioCacheRef.current.has(url)) return; // 已缓存则跳过

        try {
            if (!audioContext.current) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContext.current = new AudioContext();
            }
            const ctx = audioContext.current;
            if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (e) { } }

            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            audioCacheRef.current.set(url, audioBuffer);
            console.log(`✅ [Preload] 音频缓存成功: ${url}`);
        } catch (e) {
            console.warn(`❌ [Preload] 预加载失败: ${url}`, e);
        }
    };

    // --- 1. 初始化：同步历史记录 ---
    useEffect(() => {
        if (!authenticated) return;
        const fetchHistory = async () => {
            try {
                const res = await authFetch('/history');
                if (!res.ok) throw new Error('无法获取聊天记录');
                const data = await res.json();

                if (Array.isArray(data)) {
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
            } catch (e) { console.error("❌ 获取历史失败:", e); }
        };
        fetchHistory();
    }, [authenticated]);

    // --- 2. WebSocket 连接 (含心跳 & 重连) ---
    const connectWebSocket = useCallback(async () => {
        if (!authenticated || isConnecting.current) return;
        isConnecting.current = true;
        setConnectionStatus("CONNECTING");
        const connectionGeneration = connectionGenerationRef.current + 1;
        connectionGenerationRef.current = connectionGeneration;

        try {
            const ticket = await createWebSocketTicket();
            const wsUrl = `${getWebSocketBase()}/ws/chat?ticket=${encodeURIComponent(ticket)}`;
            console.log("🔌 [WS] 准备连接");
            const ws = new WebSocket(wsUrl);

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
                        const chunkText = data.text || '';
                        const chunkIdx = data.chunk_index;
                        if (chunkText) {
                            setMessages(prev => {
                                const lastMsg = prev[prev.length - 1];
                                if (lastMsg && lastMsg.isStreamingAI) {
                                    // 追加到已有的流式气泡
                                    const updated = [...prev];
                                    updated[updated.length - 1] = {
                                        ...lastMsg,
                                        text: lastMsg.text + chunkText,
                                        content: (lastMsg.content || '') + chunkText,
                                        emotion: data.emotion || lastMsg.emotion
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
                                        chunkList: []
                                    }];
                                }
                            });
                        }
                        return;
                    }

                    // 🌊 开始处理流式分段音频
                    if (data.type === 'audio_stream_start') {
                        audioQueueRef.current = [];
                        isPlayingQueueRef.current = false;
                        expectedChunkIndexRef.current = 0;
                    }

                    // 收到单个句子的音频碎片（此时文字已先行上屏）
                    if (data.type === 'audio_stream_chunk') {
                        const chunk = {
                            index: data.chunk_index,
                            text: data.text,
                            audio_url: formatUrl(data.audio_url),
                            visemes: data.visemes || [],
                            emotion: data.emotion || 'neutral'
                        };
                        audioQueueRef.current.push(chunk);

                        // 🔥 将音频碎片关联到当前流式气泡的 chunkList（供回放用）
                        setMessages(prev => {
                            const lastMsg = prev[prev.length - 1];
                            if (lastMsg && lastMsg.isStreamingAI) {
                                const updated = [...prev];
                                updated[updated.length - 1] = {
                                    ...lastMsg,
                                    chunkList: lastMsg.chunkList ? [...lastMsg.chunkList, chunk] : [chunk]
                                };
                                return updated;
                            }
                            return prev;
                        });

                        // 预加载音频到缓存
                        preloadAudio(chunk.audio_url);
                        // 催促消费播放
                        playNextInQueue();
                    }

                    // 流式结束标记：关闭当前流式气泡的追加状态
                    if (data.type === 'audio_stream_end') {
                        setMessages(prev => {
                            const lastMsg = prev[prev.length - 1];
                            if (lastMsg && lastMsg.isStreamingAI) {
                                const updated = [...prev];
                                updated[updated.length - 1] = {
                                    ...lastMsg,
                                    isStreamingAI: false,
                                    text: data.full_text || lastMsg.text
                                };
                                return updated;
                            }
                            return prev;
                        });
                    }
                } catch (e) { }
            };

            ws.onclose = (e) => {
                if (connectionGeneration !== connectionGenerationRef.current) return;
                console.log("❌ [WS] 断开:", e.code);
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
            isConnecting.current = false;
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
        }
    }, [authenticated]);

    useEffect(() => {
        connectWebSocket();
        return () => {
            connectionGenerationRef.current += 1;
            if (websocketRef.current) websocketRef.current.close();
            websocketRef.current = null;
            seenActionIdsRef.current.clear();
            seenMotionIdsRef.current.clear();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
            stopCurrentAudio();
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
            const clientMessageId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            setMessages(prev => [...prev, { role: 'user', text, content: text, clientMessageId, date: new Date() }]);
            const nowMs = Date.now();
            const command = parseImmediateGesture(text);
            const localMotion = command
                ? createImmediateMotion(command, { nowMs })
                : createListeningMotion({ nowMs });
            setMotionEvent(localMotion);
            websocketRef.current.send(JSON.stringify({ type: 'text', content: text, client_message_id: clientMessageId }));
        } else {
            // 尝试重连
            if (connectionStatus === "CLOSED") connectWebSocket();
        }
    };

    // 发送语音 (二进制)
    const sendAudioData = (blobOrBuffer) => {
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
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

    // 停止播放
    const stopCurrentAudio = () => {
        if (currentAudioRef.current) {
            try {
                if (typeof currentAudioRef.current.stop === 'function') {
                    currentAudioRef.current.stop(); // AudioBufferSourceNode
                } else if (typeof currentAudioRef.current.pause === 'function') {
                    currentAudioRef.current.pause(); // 降级时的 HTMLAudioElement
                    currentAudioRef.current.currentTime = 0;
                }
            } catch (e) { }
        }
        const zero = { openY: 0, form: 0, volume: 0 };
        setLipValue(zero);
        currentLipRef.current = { ...zero };
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

    // 🌊 流式播放轮询消费器（文字已在 text_stream_chunk 阶段上屏，此处只管播放音频+嘴型）
    const playNextInQueue = () => {
        if (isPlayingQueueRef.current || audioQueueRef.current.length === 0) return;
        
        // 查找下一个需要播放的序号
        const nextIndex = audioQueueRef.current.findIndex(c => c.index === expectedChunkIndexRef.current);
        if (nextIndex === -1) {
            // 当前缺少的句段音频还未生成完毕返回，需等待
            return;
        }

        // 提取并移出队列
        const chunk = audioQueueRef.current.splice(nextIndex, 1)[0];
        
        isPlayingQueueRef.current = true;
        
        playAudio(chunk.audio_url, chunk.visemes, 
            null,  // onReady: 文字已提前上屏，无需再追加
            () => { // onEnded: 这个碎片播完了，继续下一个
                isPlayingQueueRef.current = false;
                expectedChunkIndexRef.current += 1;
                playNextInQueue();
            }
        );
    };

    // 🔥 供外部使用的连续回放功能：按顺序纯净重放，不修改消息气泡
    const replayChunks = async (chunkList) => {
        stopCurrentAudio();
        if (!chunkList || chunkList.length === 0) return;
        
        let shouldStop = false;
        const originalInterrupt = interrupt;
        
        // 临时包装停止机制
        window.__current_replay_interrupt = () => { shouldStop = true; };
        
        for (let i = 0; i < chunkList.length; i++) {
            if (shouldStop) break;
            const chunk = chunkList[i];
            await new Promise((resolve) => {
                playAudio(chunk.audio_url, chunk.visemes, null, resolve);
            });
        }
        window.__current_replay_interrupt = null;
    };

    // 🔥 核心：播放音频 + 高阶物理音素同步 (AudioBuffer + Rhubarb 时间轴)
    const playAudio = async (url, visemes = [], onReady = null, onEnded = null) => {
        if (!url) return;
        stopCurrentAudio();

        if (!audioContext.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext.current = new AudioContext();
        }
        const ctx = audioContext.current;
        if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (e) { } }

        try {
            // 🔥 新增：优先使用预加载缓存
            let audioBuffer = audioCacheRef.current.get(url);
            if (!audioBuffer) {
                // 缓存未命中，实时加载
                console.log(`🔄 [Play] 缓存未命中，实时加载: ${url}`);
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            } else {
                console.log(`🚀 [Play] 使用缓存播放: ${url}`);
            }

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            currentAudioRef.current = source;
            source.connect(ctx.destination);

            const startTime = ctx.currentTime;
            let isRunning = true;

            // 回调通知发声（配合 UI 字幕弹出）
            if (onReady) onReady();
            source.start(0);

            source.onended = () => {
                isRunning = false;
                if (currentAudioRef.current === source) {
                    const zero = { openY: 0, form: 0, rhubarb: 'X' };
                    setLipValue(zero);
                    currentLipRef.current = { ...zero };
                }
                if (onEnded) onEnded();
            };

            const updateLip = () => {
                if (!isRunning || currentAudioRef.current !== source) return;
                requestAnimationFrame(updateLip);

                const currentPlayTime = ctx.currentTime - startTime;
                let activeViseme = 'X';

                if (visemes && visemes.length > 0) {
                    for (let i = 0; i < visemes.length; i++) {
                        const v = visemes[i];
                        if (currentPlayTime >= v.start && currentPlayTime <= v.end) {
                            activeViseme = v.value;
                            break;
                        }
                    }
                }

                // 直接将离线算好的精确音素抛给底层 Live2DController 解析
                setLipValue({ rhubarb: activeViseme });
                currentLipRef.current = { rhubarb: activeViseme };
            };
            updateLip();
        } catch (e) {
            // 降级方案：如果是 fetch 错误，直接回归古老的 audio 播放 (没有口型)
            console.warn("AudioContext 或 Fetch 失败，触发降级无缓冲播放:", e);
            if (onReady) onReady();
            const audio = new Audio(url);
            audio.crossOrigin = "anonymous";
            currentAudioRef.current = audio;
            audio.onended = () => { if (onEnded) onEnded(); };
            audio.play().catch(ex => { console.warn(ex); if (onEnded) onEnded(); });
        }
    };

    return {
        messages, setMessages, sendMessage, sendAudioData, sendImage,
        lipValue, interrupt, playAudio, connectionStatus,
        sendStopSignal,  // 供 useAudioRecorder 在录音结束后调用
        replayChunks,    // 新增：连续播放音频碎片
        motionEvent,
        actionOverride: motionEvent, // P1 迁移期兼容旧调用方；Task 9 会统一改用 motionEvent
    };
}
