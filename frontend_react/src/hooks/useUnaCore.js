import { useState, useEffect, useRef, useCallback } from 'react';
import { API_HOST } from '../config';

// 🛠️ 工具：获取后端基准地址
const getApiBase = () => {
    const ENV_HOST = API_HOST;
    let cleanHost = ENV_HOST.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const isPlus = window.plus || navigator.userAgent.indexOf("Html5Plus") > -1 || window.location.protocol === 'file:';
    return isPlus ? `http://${cleanHost}` : "";
};

export function useUnaCore(userId) {
    const [messages, setMessages] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState("CONNECTING");
    const [lipValue, setLipValue] = useState({ openY: 0, form: 0, volume: 0 });

    const websocketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const heartbeatIntervalRef = useRef(null);
    const audioContext = useRef(null);
    const currentAudioRef = useRef(null);
    const currentLipRef = useRef({ openY: 0, form: 0, volume: 0 });
    const isConnecting = useRef(false);

    // 🌊 流式音频列车队列
    const audioQueueRef = useRef([]);
    const isPlayingQueueRef = useRef(false);

    // --- 1. 初始化：同步历史记录 ---
    useEffect(() => {
        if (!userId) return;
        const fetchHistory = async () => {
            try {
                const apiBase = getApiBase();
                const url = apiBase ? `${apiBase}/history?user_id=${userId}` : `/history?user_id=${userId}`;
                const res = await fetch(url);
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
    }, [userId]);

    // --- 2. WebSocket 连接 (含心跳 & 重连) ---
    const connectWebSocket = useCallback(() => {
        if (!userId || isConnecting.current) return;
        isConnecting.current = true;
        setConnectionStatus("CONNECTING");

        const apiBase = getApiBase();
        let wsHost = apiBase.replace("http://", "").replace("https://", "");
        if (!wsHost) wsHost = window.location.host;

        const wsUrl = `ws://${wsHost}/ws/chat/${userId}`;
        console.log("🔌 [WS] 准备连接:", wsUrl);

        try {
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
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
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'pong') return;

                    // 收到语音识别同步
                    if (data.type === 'user_sync') {
                        setMessages(prev => [...prev, {
                            role: 'user',
                            text: data.text,
                            content: data.text,
                            date: new Date()
                        }]);
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

                    // 🌊 开始处理流式分段音频
                    if (data.type === 'audio_stream_start') {
                        audioQueueRef.current = [];
                        isPlayingQueueRef.current = false;
                    }

                    // 收到单个句子碎片
                    if (data.type === 'audio_stream_chunk') {
                        audioQueueRef.current.push({
                            index: data.chunk_index,
                            text: data.text,
                            audio_url: formatUrl(data.audio_url),
                            visemes: data.visemes || [],
                            emotion: data.emotion || 'neutral'
                        });
                        // 催促消费
                        playNextInQueue();
                    }
                } catch (e) { }
            };

            ws.onclose = (e) => {
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
    }, [userId]);

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (websocketRef.current) websocketRef.current.close();
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
            setMessages(prev => [...prev, { role: 'user', text, content: text, date: new Date() }]);
            websocketRef.current.send(JSON.stringify({ type: 'text', content: text }));
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

    // 🌊 流式播放轮询消费器
    const playNextInQueue = () => {
        if (isPlayingQueueRef.current || audioQueueRef.current.length === 0) return;
        
        // 保证按顺序出队
        audioQueueRef.current.sort((a,b) => a.index - b.index);
        const chunk = audioQueueRef.current.shift();
        
        isPlayingQueueRef.current = true;
        
        playAudio(chunk.audio_url, chunk.visemes, 
            () => { // onReady: 这个碎片开始发出声音
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.isStreamingAI) {
                        const updated = [...prev];
                        updated[updated.length - 1] = {
                            ...lastMsg,
                            text: lastMsg.text + chunk.text,
                            content: lastMsg.content + chunk.text,
                            emotion: chunk.emotion,
                            chunkList: lastMsg.chunkList ? [...lastMsg.chunkList, chunk] : [chunk]
                        };
                        return updated;
                    } else {
                        // 第一个碎片，创建气泡
                        return [...prev, {
                            role: 'ai',
                            text: chunk.text,
                            content: chunk.text,
                            isAI: true,
                            emotion: chunk.emotion,
                            date: new Date(),
                            isStreamingAI: true,
                            chunkList: [chunk]
                        }];
                    }
                });
            },
            () => { // onEnded: 这个碎片播完了
                isPlayingQueueRef.current = false;
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
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

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
        replayChunks    // 新增：连续播放音频碎片
    };
}