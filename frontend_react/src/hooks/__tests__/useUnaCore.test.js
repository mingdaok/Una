import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useUnaCore } from '../useUnaCore';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const originalFetch = globalThis.fetch;
const originalWebSocket = globalThis.WebSocket;
const originalAudioContext = window.AudioContext;
const originalWebkitAudioContext = window.webkitAudioContext;
const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

function withTimeout(promise, label, timeoutMs = 150) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function installFakeAudioRuntime({
    responseForAudio,
    configureSource,
    decodeAudioData,
    initialState = 'running',
    resumeAudioContext,
    constructAudioContext,
} = {}) {
    const sources = [];
    const contexts = [];
    const audioRequests = [];
    const frames = new Map();
    let nextFrameId = 1;
    let constructionAttempts = 0;

    class FakeAudioContext {
        constructor() {
            constructionAttempts += 1;
            constructAudioContext?.(constructionAttempts);
            this.currentTime = 5;
            this.state = initialState;
            this.destination = { id: 'destination' };
            this.resume = vi.fn().mockImplementation(() => {
                if (resumeAudioContext) return resumeAudioContext(this);
                this.state = 'running';
                return Promise.resolve();
            });
            this.close = vi.fn().mockResolvedValue(undefined);
            this.decodeAudioData = vi.fn(decodeAudioData || (async bytes => ({
                bytes,
                decodeIndex: this.decodeAudioData.mock.calls.length,
            })));
            contexts.push(this);
        }

        createBufferSource() {
            const source = {
                buffer: null,
                connect: vi.fn(),
                disconnect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
                onended: null,
                onerror: null,
            };
            configureSource?.(source, sources.length);
            sources.push(source);
            return source;
        }
    }

    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = undefined;
    globalThis.requestAnimationFrame = vi.fn(callback => {
        const id = nextFrameId;
        nextFrameId += 1;
        frames.set(id, callback);
        return id;
    });
    globalThis.cancelAnimationFrame = vi.fn(id => frames.delete(id));
    globalThis.fetch = vi.fn(async url => {
        const value = String(url);
        if (value.includes('/api/auth/ws-ticket')) {
            return { ok: true, status: 200, json: async () => ({ ticket: 'test-ticket' }) };
        }
        if (value.includes('/history')) {
            return { ok: true, status: 200, json: async () => [] };
        }
        audioRequests.push(value);
        if (responseForAudio) return responseForAudio(value, audioRequests.length - 1);
        return {
            ok: true,
            status: 200,
            arrayBuffer: async () => new ArrayBuffer(8),
        };
    });

    return {
        sources,
        contexts,
        audioRequests,
        frames,
        get constructionAttempts() { return constructionAttempts; },
    };
}

function validServerMotion(overrides = {}) {
    const now = Date.now();
    return {
        type: 'live2d_motion_v3',
        motion_id: 'server-motion',
        source: 'ai_reply',
        created_at_ms: now,
        expires_at_ms: now + 10_000,
        duration_ms: 800,
        blend: { in_ms: 80, out_ms: 120 },
        tracks: [{
            channel: 'head_pitch',
            mode: 'override',
            keyframes: [
                { t: 0, value: 0, easing: 'linear' },
                { t: 1, value: -0.4, easing: 'ease_in_out' },
            ],
        }],
        ...overrides,
    };
}

describe('useUnaCore WebSocket handling', () => {
    let mockWebSocket;
    
    beforeEach(() => {
        // Mock fetch to prevent network errors
        global.fetch = vi.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
        }));

        mockWebSocket = {
            send: vi.fn(),
            close: vi.fn(),
            readyState: 1 // WebSocket.OPEN
        };
        global.WebSocket = function() { return mockWebSocket; };
        global.WebSocket.OPEN = 1;
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.restoreAllMocks();
        globalThis.fetch = originalFetch;
        globalThis.WebSocket = originalWebSocket;
        window.AudioContext = originalAudioContext;
        window.webkitAudioContext = originalWebkitAudioContext;
        globalThis.requestAnimationFrame = originalRequestAnimationFrame;
        globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
        delete window.__current_replay_interrupt;
        localStorage.clear();
    });

    it('should parse chat_action and set actionOverride', async () => {
        const { result } = renderHook(() => useUnaCore('test_user'));
        
        // 等待 useEffect 执行完成
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        // 模拟 WebSocket 触发 onopen
        act(() => {
            if (mockWebSocket.onopen) mockWebSocket.onopen();
        });

        // 模拟收到 chat_action
        act(() => {
            if (mockWebSocket.onmessage) {
                mockWebSocket.onmessage({
                    data: JSON.stringify({
                        type: 'chat_action',
                        action: '惊讶',
                        params: { direction: '头左偏' }
                    })
                });
            }
        });

        // 验证 actionOverride 状态是否被更新
        expect(result.current.actionOverride).not.toBeNull();
        expect(result.current.actionOverride.action).toBe('惊讶');
        expect(result.current.actionOverride.params.direction).toBe('头左偏');
    });

    it('dispatches an explicit immediate gesture before its WebSocket message is sent', async () => {
        const { result } = renderHook(() => useUnaCore('test_user'));
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
        act(() => mockWebSocket.onopen());

        act(() => result.current.sendMessage('上下点头三次'));

        expect(result.current.motionEvent).toMatchObject({
            type: 'live2d_motion_v3',
            source: 'user_command',
        });
        expect(result.current.motionEvent.tracks[0].channel).toBe('head_pitch');
        expect(mockWebSocket.send).toHaveBeenCalledOnce();
        expect(JSON.parse(mockWebSocket.send.mock.calls[0][0])).toMatchObject({
            type: 'text',
            content: '上下点头三次',
            live2d_model: 'panda_cake',
        });
    });

    it('records local motion before a synchronous server event triggered by WebSocket.send', async () => {
        const { result } = renderHook(() => useUnaCore('test_user'));
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
        act(() => mockWebSocket.onopen());

        mockWebSocket.send.mockImplementation(() => {
            mockWebSocket.onmessage({
                data: JSON.stringify(validServerMotion({ motion_id: 'reply-after-send' })),
            });
        });

        act(() => result.current.sendMessage('上下点头三次'));

        // If send ran first, the later local state update would overwrite this reply event.
        expect(result.current.motionEvent.motion_id).toBe('reply-after-send');
    });

    it('uses listening only for ordinary text, not negated explicit commands', async () => {
        const { result } = renderHook(() => useUnaCore('test_user'));
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
        act(() => mockWebSocket.onopen());

        act(() => result.current.sendMessage('不要点头'));
        expect(result.current.motionEvent).toBeNull();

        act(() => result.current.sendMessage('今天天气怎么样'));
        expect(result.current.motionEvent).toMatchObject({
            type: 'live2d_motion_v3',
            source: 'local_micro_reaction',
        });
    });

    it('reads the selected model for every message and keeps unsupported explicit commands silent', async () => {
        const { result } = renderHook(() => useUnaCore('test_user'));
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
        act(() => mockWebSocket.onopen());

        localStorage.setItem('live2d_model', 'panda_cake');
        act(() => result.current.sendMessage('举左手'));
        expect(result.current.motionEvent).toBeNull();
        expect(JSON.parse(mockWebSocket.send.mock.calls.at(-1)[0]).live2d_model).toBe('panda_cake');

        localStorage.setItem('live2d_model', 'hiyori');
        act(() => result.current.sendMessage('举左手'));
        expect(result.current.motionEvent.tracks.map(track => track.channel)).toEqual(['left_arm_raise']);
        expect(JSON.parse(mockWebSocket.send.mock.calls.at(-1)[0]).live2d_model).toBe('hiyori');
    });

    it('accepts one valid v3 server motion but ignores its duplicate and expired events', async () => {
        const { result } = renderHook(() => useUnaCore('test_user'));
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
        act(() => mockWebSocket.onopen());

        act(() => mockWebSocket.onmessage({
            data: JSON.stringify(validServerMotion({ motion_id: 'server-1' })),
        }));
        expect(result.current.motionEvent.motion_id).toBe('server-1');

        const first = result.current.motionEvent;
        act(() => mockWebSocket.onmessage({
            data: JSON.stringify(validServerMotion({ motion_id: 'server-1' })),
        }));
        expect(result.current.motionEvent).toBe(first);

        act(() => mockWebSocket.onmessage({
            data: JSON.stringify(validServerMotion({
                motion_id: 'expired-server-motion',
                expires_at_ms: Date.now() - 1,
            })),
        }));
        expect(result.current.motionEvent).toBe(first);
    });

    it('accepts ai_reply v3 motions but rejects user_command events at the WebSocket boundary', async () => {
        const { result } = renderHook(() => useUnaCore('test_user'));
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
        act(() => mockWebSocket.onopen());

        act(() => mockWebSocket.onmessage({
            data: JSON.stringify(validServerMotion({ motion_id: 'trusted-ai-reply' })),
        }));
        const trustedMotion = result.current.motionEvent;
        expect(trustedMotion.motion_id).toBe('trusted-ai-reply');

        act(() => mockWebSocket.onmessage({
            data: JSON.stringify(validServerMotion({
                motion_id: 'forged-user-command',
                source: 'user_command',
            })),
        }));
        expect(result.current.motionEvent).toBe(trustedMotion);
    });

    it('evicts the oldest live v3 motion id when the bounded de-duplication cache is full', async () => {
        const { result } = renderHook(() => useUnaCore('test_user'));
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
        act(() => mockWebSocket.onopen());

        act(() => {
            for (let index = 0; index <= 100; index += 1) {
                mockWebSocket.onmessage({
                    data: JSON.stringify(validServerMotion({ motion_id: `bounded-${index}` })),
                });
            }
        });
        expect(result.current.motionEvent.motion_id).toBe('bounded-100');

        act(() => mockWebSocket.onmessage({
            data: JSON.stringify(validServerMotion({ motion_id: 'bounded-0' })),
        }));
        expect(result.current.motionEvent.motion_id).toBe('bounded-0');
    });

    it('does not let malformed v3 events replace the current usable motion state', async () => {
        const { result } = renderHook(() => useUnaCore('test_user'));
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
        act(() => mockWebSocket.onopen());

        act(() => mockWebSocket.onmessage({
            data: JSON.stringify(validServerMotion({ motion_id: 'safe-motion' })),
        }));
        const safeMotion = result.current.motionEvent;

        act(() => mockWebSocket.onmessage({
            data: JSON.stringify(validServerMotion({
                motion_id: 'malformed-mouth-motion',
                tracks: [{
                    channel: 'mouth_open',
                    mode: 'override',
                    keyframes: [{ t: 0, value: 0 }, { t: 1, value: 1 }],
                }],
            })),
        }));
        expect(result.current.motionEvent).toBe(safeMotion);
    });

    it('ignores an old WebSocket generation after reconnecting with a newer connection', async () => {
        const sockets = [];
        global.WebSocket = function() {
            const socket = { send: vi.fn(), close: vi.fn(), readyState: 1 };
            sockets.push(socket);
            return socket;
        };
        global.WebSocket.OPEN = 1;

        const { result, rerender } = renderHook(
            ({ user }) => useUnaCore(user),
            { initialProps: { user: 'first-user' } },
        );
        await waitFor(() => expect(sockets).toHaveLength(1));
        act(() => sockets[0].onopen());
        const firstGeneration = result.current.motionGeneration;
        expect(firstGeneration).toEqual(expect.any(Number));
        expect(firstGeneration).toBeGreaterThan(0);

        rerender({ user: 'second-user' });
        await waitFor(() => expect(sockets).toHaveLength(2));
        act(() => sockets[1].onopen());
        expect(result.current.motionGeneration).toBeGreaterThan(firstGeneration);
        act(() => sockets[1].onmessage({
            data: JSON.stringify(validServerMotion({ motion_id: 'new-connection-motion' })),
        }));
        const activeMotion = result.current.motionEvent;

        act(() => sockets[0].onmessage({
            data: JSON.stringify(validServerMotion({ motion_id: 'stale-connection-motion' })),
        }));
        expect(result.current.motionEvent).toBe(activeMotion);
    });

    it('closes the React mouth state when authenticated effect dependencies switch', async () => {
        const audio = installFakeAudioRuntime();
        const { result, rerender } = renderHook(
            ({ user }) => useUnaCore(user),
            { initialProps: { user: 'first-user' } },
        );
        await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));
        act(() => mockWebSocket.onopen());
        act(() => {
            mockWebSocket.onmessage({
                data: JSON.stringify({ type: 'audio_stream_start', reply_id: 'reply-first' }),
            });
            mockWebSocket.onmessage({
                data: JSON.stringify({
                    type: 'audio_stream_chunk', reply_id: 'reply-first', chunk_index: 0,
                    audio_url: '/voice/first.wav',
                    visemes: [{ start: 0, end: 1, value: 'A' }],
                }),
            });
        });
        await waitFor(() => expect(audio.sources).toHaveLength(1));

        const [frameId, frame] = audio.frames.entries().next().value;
        audio.frames.delete(frameId);
        audio.contexts[0].currentTime = audio.sources[0].start.mock.calls[0][0] + 0.1;
        act(() => frame());
        expect(result.current.lipValue).toEqual({ rhubarb: 'A' });

        rerender({ user: 'second-user' });

        expect(audio.sources[0].stop).toHaveBeenCalledOnce();
        expect(audio.contexts[0].close).toHaveBeenCalledOnce();
        expect(result.current.lipValue).toEqual({ rhubarb: 'X' });
    });

    it('allows a new session to connect while the previous WebSocket ticket request is still pending', async () => {
        const ticketResolvers = [];
        const sockets = [];
        global.fetch = vi.fn((url) => {
            if (String(url).includes('/api/auth/ws-ticket')) {
                return new Promise(resolve => ticketResolvers.push(resolve));
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });
        global.WebSocket = function(url) {
            const socket = { url, send: vi.fn(), close: vi.fn(), readyState: 1 };
            sockets.push(socket);
            return socket;
        };
        global.WebSocket.OPEN = 1;

        const { result, rerender } = renderHook(
            ({ user }) => useUnaCore(user),
            { initialProps: { user: 'first-user' } },
        );
        await waitFor(() => expect(ticketResolvers).toHaveLength(1));

        rerender({ user: 'second-user' });
        await waitFor(() => expect(ticketResolvers).toHaveLength(2));

        await act(async () => {
            ticketResolvers[1]({ ok: true, json: async () => ({ ticket: 'second-ticket' }) });
            await Promise.resolve();
        });
        act(() => sockets[0].onopen());
        expect(result.current.connectionStatus).toBe('OPEN');
        expect(sockets).toHaveLength(1);

        await act(async () => {
            ticketResolvers[0]({ ok: true, json: async () => ({ ticket: 'first-ticket' }) });
            await Promise.resolve();
        });
        expect(sockets).toHaveLength(1);
        expect(result.current.connectionStatus).toBe('OPEN');
    });

    it('does not let delayed history from an old session overwrite the new session', async () => {
        const historyResponses = [deferred(), deferred()];
        let historyRequestCount = 0;
        global.fetch = vi.fn(url => {
            const value = String(url);
            if (value.includes('/api/auth/ws-ticket')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ ticket: `ticket-${historyRequestCount}` }),
                });
            }
            if (value.includes('/history')) {
                const response = historyResponses[historyRequestCount];
                historyRequestCount += 1;
                return response.promise;
            }
            throw new Error('unexpected request');
        });

        const { result, rerender } = renderHook(
            ({ user }) => useUnaCore(user),
            { initialProps: { user: 'first-user' } },
        );
        await waitFor(() => expect(historyRequestCount).toBe(1));
        rerender({ user: 'second-user' });
        await waitFor(() => expect(historyRequestCount).toBe(2));

        await act(async () => {
            historyResponses[1].resolve({
                ok: true,
                status: 200,
                json: async () => [{
                    role: 'ai', content: '新会话历史', timestamp: '2026-08-01T00:00:00Z',
                }],
            });
            await Promise.resolve();
        });
        await waitFor(() => expect(result.current.messages.at(-1)?.text).toBe('新会话历史'));

        await act(async () => {
            historyResponses[0].resolve({
                ok: true,
                status: 200,
                json: async () => [{
                    role: 'ai', content: '旧会话迟到历史', timestamp: '2026-07-31T00:00:00Z',
                }],
            });
            await Promise.resolve();
        });

        expect(result.current.messages.at(-1)?.text).toBe('新会话历史');
    });

    it('accepts only bounded chunks correlated to the active reply and seals its complete text', async () => {
        const audio = installFakeAudioRuntime();
        const { result } = renderHook(() => useUnaCore('test_user'));
        await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));
        act(() => mockWebSocket.onopen());

        act(() => mockWebSocket.onmessage({
            data: JSON.stringify({ type: 'audio_stream_start', reply_id: 'reply-1' }),
        }));
        act(() => mockWebSocket.onmessage({
            data: JSON.stringify({ type: 'text_stream_chunk', text: '分段文字' }),
        }));
        for (const event of [
            { type: 'audio_stream_chunk', reply_id: 'reply-stale', chunk_index: 0, audio_url: '/voice/stale.wav' },
            { type: 'audio_stream_chunk', reply_id: 'reply-1', chunk_index: -1, audio_url: '/voice/negative.wav' },
            { type: 'audio_stream_chunk', reply_id: 'reply-1', chunk_index: 4096, audio_url: '/voice/large.wav' },
            { type: 'audio_stream_chunk', reply_id: 'reply-1', chunk_index: 0.5, audio_url: '/voice/fraction.wav' },
            { type: 'audio_stream_chunk', chunk_index: 0, audio_url: '/voice/legacy.wav' },
        ]) {
            act(() => mockWebSocket.onmessage({ data: JSON.stringify(event) }));
        }
        await act(async () => { await Promise.resolve(); });
        expect(audio.audioRequests).toEqual([]);

        act(() => mockWebSocket.onmessage({
            data: JSON.stringify({
                type: 'audio_stream_chunk',
                reply_id: 'reply-1',
                chunk_index: 0,
                audio_url: '/voice/accepted.wav',
                visemes: [{ start: 0, end: 0.2, value: 'A' }],
            }),
        }));
        await waitFor(() => expect(audio.sources).toHaveLength(1));

        act(() => mockWebSocket.onmessage({
            data: JSON.stringify({
                type: 'audio_stream_end',
                reply_id: 'reply-1',
                full_text: '这是完整文字。',
            }),
        }));

        expect(audio.audioRequests).toEqual(['/voice/accepted.wav']);
        expect(result.current.messages.at(-1)).toMatchObject({
            text: '这是完整文字。',
            content: '这是完整文字。',
            isStreamingAI: false,
        });
    });

    it('unlocks the shared AudioContext when voice data is sent', async () => {
        const audio = installFakeAudioRuntime();
        const { result } = renderHook(() => useUnaCore('test_user'));
        await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));
        act(() => mockWebSocket.onopen());
        const voiceData = new ArrayBuffer(4);

        act(() => result.current.sendAudioData(voiceData));

        expect(audio.contexts).toHaveLength(1);
        expect(mockWebSocket.send).toHaveBeenCalledWith(voiceData);
    });

    it('creates and resumes one shared AudioContext from a real user activation', async () => {
        const audio = installFakeAudioRuntime({ initialState: 'suspended' });
        const { unmount } = renderHook(() => useUnaCore('test_user'));
        await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));
        expect(audio.contexts).toHaveLength(0);

        act(() => window.dispatchEvent(new Event('pointerdown', { bubbles: true })));

        expect(audio.contexts).toHaveLength(1);
        expect(audio.contexts[0].resume).toHaveBeenCalledOnce();
        expect(audio.contexts[0].state).toBe('running');

        act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })));
        expect(audio.contexts).toHaveLength(1);
        expect(audio.contexts[0].resume).toHaveBeenCalledOnce();

        unmount();
        act(() => window.dispatchEvent(new Event('pointerdown', { bubbles: true })));
        expect(audio.contexts).toHaveLength(1);
    });

    it('keeps activation listeners after a failed resume and deduplicates a pending retry', async () => {
        const firstResume = deferred();
        let resumeAttempt = 0;
        const audio = installFakeAudioRuntime({
            initialState: 'suspended',
            resumeAudioContext: context => {
                resumeAttempt += 1;
                if (resumeAttempt === 1) return firstResume.promise;
                context.state = 'running';
                return Promise.resolve();
            },
        });
        renderHook(() => useUnaCore('test_user'));
        await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));

        act(() => window.dispatchEvent(new Event('pointerdown')));
        act(() => window.dispatchEvent(new Event('touchstart')));
        expect(audio.contexts[0].resume).toHaveBeenCalledOnce();

        await act(async () => {
            firstResume.reject(new Error('activation denied'));
            await Promise.resolve();
        });
        await act(async () => {
            window.dispatchEvent(new Event('pointerdown'));
            await Promise.resolve();
        });
        expect(audio.contexts[0].resume).toHaveBeenCalledTimes(2);
        expect(audio.contexts[0].state).toBe('running');

        act(() => window.dispatchEvent(new Event('pointerdown')));
        expect(audio.contexts[0].resume).toHaveBeenCalledTimes(2);
    });

    it('retries AudioContext construction on the next user activation', async () => {
        const audio = installFakeAudioRuntime({
            constructAudioContext: attempt => {
                if (attempt === 1) throw new Error('constructor denied');
            },
        });
        renderHook(() => useUnaCore('test_user'));
        await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));

        act(() => window.dispatchEvent(new Event('pointerdown')));
        expect(audio.contexts).toHaveLength(0);

        await act(async () => {
            window.dispatchEvent(new Event('pointerdown'));
            await Promise.resolve();
        });
        expect(audio.constructionAttempts).toBe(2);
        expect(audio.contexts).toHaveLength(1);
        expect(audio.contexts[0].state).toBe('running');
    });

    it.each(['playAudio', 'replayChunks'])(
        'shares one pending activation resume with %s before starting a source',
        async playbackApi => {
            const pendingResume = deferred();
            let resumeContext;
            const audio = installFakeAudioRuntime({
                initialState: 'suspended',
                resumeAudioContext: context => {
                    resumeContext = context;
                    return pendingResume.promise;
                },
            });
            const { result } = renderHook(() => useUnaCore('test_user'));
            await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));

            let playback;
            act(() => {
                window.dispatchEvent(new Event('pointerdown'));
                playback = playbackApi === 'playAudio'
                    ? result.current.playAudio('/voice/shared-resume.wav', [])
                    : result.current.replayChunks([{
                        audio_url: '/voice/shared-resume.wav', visemes: [],
                    }]);
            });
            await waitFor(() => expect(audio.contexts[0].decodeAudioData).toHaveBeenCalledOnce());
            await act(async () => {
                await Promise.resolve();
                await Promise.resolve();
            });

            expect(audio.contexts[0].resume).toHaveBeenCalledOnce();
            expect(audio.sources).toHaveLength(0);

            await act(async () => {
                resumeContext.state = 'running';
                pendingResume.resolve();
                await Promise.resolve();
            });
            await waitFor(() => expect(audio.sources).toHaveLength(1));
            expect(audio.sources[0].start).toHaveBeenCalledOnce();

            act(() => audio.sources[0].onended());
            await playback;
        },
    );

    it.each(['playAudio', 'replayChunks'])(
        'settles %s after a shared resume rejection and retries on the next gesture',
        async playbackApi => {
            const pendingResume = deferred();
            let firstResumePending = true;
            const audio = installFakeAudioRuntime({
                initialState: 'suspended',
                resumeAudioContext: context => {
                    if (firstResumePending) return pendingResume.promise;
                    context.state = 'running';
                    return Promise.resolve();
                },
            });
            const { result } = renderHook(() => useUnaCore('test_user'));
            await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));

            let playback;
            act(() => {
                window.dispatchEvent(new Event('pointerdown'));
                playback = playbackApi === 'playAudio'
                    ? result.current.playAudio('/voice/rejected-resume.wav', [])
                    : result.current.replayChunks([{
                        audio_url: '/voice/rejected-resume.wav', visemes: [],
                    }]);
            });
            await waitFor(() => expect(audio.contexts[0].decodeAudioData).toHaveBeenCalledOnce());
            await act(async () => {
                await Promise.resolve();
                await Promise.resolve();
            });
            expect(audio.contexts[0].resume).toHaveBeenCalledOnce();

            firstResumePending = false;
            await act(async () => {
                pendingResume.reject(new Error('resume denied'));
                await Promise.resolve();
            });
            await withTimeout(playback, `${playbackApi} rejected resume`);
            expect(audio.sources).toHaveLength(0);

            await act(async () => {
                window.dispatchEvent(new Event('pointerdown'));
                await Promise.resolve();
            });
            expect(audio.contexts[0].resume).toHaveBeenCalledTimes(2);
            expect(audio.contexts[0].state).toBe('running');
        },
    );

    it('stops multi-chunk replay after a shared audio runtime failure', async () => {
        const pendingResume = deferred();
        let allowGestureRetry = false;
        const audio = installFakeAudioRuntime({
            initialState: 'suspended',
            resumeAudioContext: context => {
                if (audio.contexts[0]?.resume.mock.calls.length === 1) {
                    return pendingResume.promise;
                }
                if (allowGestureRetry) {
                    context.state = 'running';
                    return Promise.resolve();
                }
                return Promise.reject(new Error('resume still denied'));
            },
        });
        const { result } = renderHook(() => useUnaCore('test_user'));
        await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));

        let replay;
        act(() => {
            window.dispatchEvent(new Event('pointerdown'));
            replay = result.current.replayChunks([
                { audio_url: '/voice/runtime-failure-0.wav', visemes: [] },
                { audio_url: '/voice/runtime-failure-1.wav', visemes: [] },
                { audio_url: '/voice/runtime-failure-2.wav', visemes: [] },
            ]);
        });
        await waitFor(() => expect(audio.contexts[0].decodeAudioData).toHaveBeenCalledOnce());

        await act(async () => {
            pendingResume.reject(new Error('resume denied'));
            await Promise.resolve();
        });
        await withTimeout(replay, 'multi-chunk runtime failure replay');

        expect(audio.contexts[0].resume).toHaveBeenCalledOnce();
        expect(audio.audioRequests).toEqual(['/voice/runtime-failure-0.wav']);
        expect(audio.contexts[0].decodeAudioData).toHaveBeenCalledOnce();
        expect(audio.sources).toHaveLength(0);

        allowGestureRetry = true;
        await act(async () => {
            window.dispatchEvent(new Event('pointerdown'));
            await Promise.resolve();
        });
        expect(audio.contexts[0].resume).toHaveBeenCalledTimes(2);
        expect(audio.contexts[0].state).toBe('running');
    });

    it('closes the old streaming bubble before text for a new reply arrives', async () => {
        installFakeAudioRuntime();
        const { result } = renderHook(() => useUnaCore('test_user'));
        await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));
        act(() => mockWebSocket.onopen());

        act(() => {
            mockWebSocket.onmessage({
                data: JSON.stringify({ type: 'audio_stream_start', reply_id: 'reply-old' }),
            });
            mockWebSocket.onmessage({
                data: JSON.stringify({ type: 'text_stream_chunk', text: '旧回复文字' }),
            });
            mockWebSocket.onmessage({
                data: JSON.stringify({ type: 'audio_stream_start', reply_id: 'reply-new' }),
            });
            mockWebSocket.onmessage({
                data: JSON.stringify({ type: 'text_stream_chunk', text: '新回复文字' }),
            });
        });

        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[0]).toMatchObject({
            text: '旧回复文字',
            isStreamingAI: false,
        });
        expect(result.current.messages[1]).toMatchObject({
            text: '新回复文字',
            isStreamingAI: true,
        });
    });

    it('prepares the following chunk while one source plays and reuses one AudioContext', async () => {
        const audio = installFakeAudioRuntime();
        renderHook(() => useUnaCore('test_user'));
        await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));
        act(() => mockWebSocket.onopen());

        act(() => mockWebSocket.onmessage({
            data: JSON.stringify({ type: 'audio_stream_start', reply_id: 'reply-1' }),
        }));
        act(() => {
            mockWebSocket.onmessage({
                data: JSON.stringify({
                    type: 'audio_stream_chunk', reply_id: 'reply-1', chunk_index: 0,
                    audio_url: '/voice/zero.wav', visemes: [],
                }),
            });
            mockWebSocket.onmessage({
                data: JSON.stringify({
                    type: 'audio_stream_chunk', reply_id: 'reply-1', chunk_index: 1,
                    audio_url: '/voice/one.wav', visemes: [],
                }),
            });
        });

        await waitFor(() => expect(audio.audioRequests).toEqual(['/voice/zero.wav', '/voice/one.wav']));
        await waitFor(() => expect(audio.sources).toHaveLength(1));
        expect(audio.contexts).toHaveLength(1);
        expect(audio.contexts[0].decodeAudioData).toHaveBeenCalledTimes(2);

        act(() => audio.sources[0].onended());
        await waitFor(() => expect(audio.sources).toHaveLength(2));
        expect(audio.sources[1].start).toHaveBeenCalledOnce();
        expect(audio.contexts).toHaveLength(1);
    });

    it('aborts the old reply before playing a new reply and ignores its late chunks', async () => {
        const audio = installFakeAudioRuntime();
        const { result } = renderHook(() => useUnaCore('test_user'));
        await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));
        act(() => mockWebSocket.onopen());

        act(() => {
            mockWebSocket.onmessage({
                data: JSON.stringify({ type: 'audio_stream_start', reply_id: 'reply-old' }),
            });
            mockWebSocket.onmessage({
                data: JSON.stringify({
                    type: 'audio_stream_chunk', reply_id: 'reply-old', chunk_index: 0,
                    audio_url: '/voice/old.wav', visemes: [{ start: 0, end: 1, value: 'A' }],
                }),
            });
        });
        await waitFor(() => expect(audio.sources).toHaveLength(1));

        const [frameId, frame] = audio.frames.entries().next().value;
        audio.frames.delete(frameId);
        audio.contexts[0].currentTime = audio.sources[0].start.mock.calls[0][0] + 0.1;
        act(() => frame());
        expect(result.current.lipValue).toEqual({ rhubarb: 'A' });

        act(() => mockWebSocket.onmessage({
            data: JSON.stringify({ type: 'audio_stream_start', reply_id: 'reply-new' }),
        }));
        expect(audio.sources[0].stop).toHaveBeenCalledOnce();
        expect(result.current.lipValue).toEqual({ rhubarb: 'X' });

        act(() => {
            mockWebSocket.onmessage({
                data: JSON.stringify({
                    type: 'audio_stream_chunk', reply_id: 'reply-old', chunk_index: 1,
                    audio_url: '/voice/late-old.wav', visemes: [],
                }),
            });
            mockWebSocket.onmessage({
                data: JSON.stringify({
                    type: 'audio_stream_chunk', reply_id: 'reply-new', chunk_index: 0,
                    audio_url: '/voice/new.wav', visemes: [],
                }),
            });
        });

        await waitFor(() => expect(audio.sources).toHaveLength(2));
        expect(audio.audioRequests).toEqual(['/voice/old.wav', '/voice/new.wav']);
        expect(audio.sources[0].stop.mock.invocationCallOrder[0])
            .toBeLessThan(audio.sources[1].start.mock.invocationCallOrder[0]);
        expect(audio.contexts).toHaveLength(1);
    });

    it('settles public playback before a streamed reply replaces it', async () => {
        const audio = installFakeAudioRuntime();
        const { result } = renderHook(() => useUnaCore('test_user'));
        await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));
        act(() => mockWebSocket.onopen());

        let publicPlaybackSettled = false;
        let publicPlayback;
        await act(async () => {
            publicPlayback = result.current.playAudio('/voice/public.wav', []);
            publicPlayback.then(() => { publicPlaybackSettled = true; });
            await Promise.resolve();
        });
        await waitFor(() => expect(audio.sources).toHaveLength(1));

        act(() => {
            mockWebSocket.onmessage({
                data: JSON.stringify({ type: 'audio_stream_start', reply_id: 'reply-stream' }),
            });
            mockWebSocket.onmessage({
                data: JSON.stringify({
                    type: 'audio_stream_chunk', reply_id: 'reply-stream', chunk_index: 0,
                    audio_url: '/voice/stream.wav', visemes: [],
                }),
            });
        });
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(publicPlaybackSettled).toBe(true);
        await publicPlayback;
        await waitFor(() => expect(audio.sources).toHaveLength(2));
        expect(audio.sources[0].stop.mock.invocationCallOrder[0])
            .toBeLessThan(audio.sources[1].start.mock.invocationCallOrder[0]);
    });

    it.each(['interrupt', 'new_reply', 'unmount'])(
        'settles loading public playback promptly on %s without starting late audio',
        async cancellation => {
            const delayedDecode = deferred();
            const audio = installFakeAudioRuntime({
                decodeAudioData: () => delayedDecode.promise,
            });
            const onReady = vi.fn();
            const onEnded = vi.fn();
            const { result, unmount } = renderHook(() => useUnaCore('test_user'));
            await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));
            act(() => mockWebSocket.onopen());

            let playback;
            act(() => {
                playback = result.current.playAudio(
                    `/voice/loading-${cancellation}.wav`, [], onReady, onEnded,
                );
            });
            await waitFor(() => expect(audio.contexts[0]?.decodeAudioData).toHaveBeenCalledOnce());

            if (cancellation === 'interrupt') {
                act(() => result.current.interrupt());
            } else if (cancellation === 'new_reply') {
                act(() => mockWebSocket.onmessage({
                    data: JSON.stringify({ type: 'audio_stream_start', reply_id: 'reply-new' }),
                }));
            } else {
                unmount();
            }

            await withTimeout(playback, `${cancellation} loading playback`);
            expect(onReady).not.toHaveBeenCalled();
            expect(onEnded).not.toHaveBeenCalled();
            expect(audio.sources).toHaveLength(0);

            delayedDecode.resolve({ id: 'late-buffer' });
            await Promise.resolve();
            await Promise.resolve();
            expect(audio.sources).toHaveLength(0);
        },
    );

    it('settles replay promptly when interrupted during shared decode', async () => {
        const delayedDecode = deferred();
        const audio = installFakeAudioRuntime({
            decodeAudioData: () => delayedDecode.promise,
        });
        const { result } = renderHook(() => useUnaCore('test_user'));
        await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));
        act(() => mockWebSocket.onopen());

        let replay;
        act(() => {
            replay = result.current.replayChunks([{
                audio_url: '/voice/loading-replay.wav', visemes: [],
            }]);
        });
        await waitFor(() => expect(audio.contexts[0]?.decodeAudioData).toHaveBeenCalledOnce());

        act(() => result.current.interrupt());

        await withTimeout(replay, 'loading replay');
        expect(audio.sources).toHaveLength(0);
        delayedDecode.reject(new Error('late decode failure'));
        await Promise.resolve();
        await Promise.resolve();
        expect(audio.sources).toHaveLength(0);
    });

    it('skips prepare and play failures while preserving the complete message', async () => {
        const audio = installFakeAudioRuntime({
            responseForAudio: async url => url.includes('prepare-fail')
                ? { ok: false, status: 503, arrayBuffer: vi.fn() }
                : { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) },
            configureSource: (source, sourceIndex) => {
                if (sourceIndex === 0) {
                    source.start.mockImplementation(() => { throw new Error('start failed'); });
                }
            },
        });
        const { result } = renderHook(() => useUnaCore('test_user'));
        await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));
        act(() => mockWebSocket.onopen());

        act(() => {
            mockWebSocket.onmessage({
                data: JSON.stringify({ type: 'audio_stream_start', reply_id: 'reply-1' }),
            });
            mockWebSocket.onmessage({
                data: JSON.stringify({ type: 'text_stream_chunk', text: '到达中的文字' }),
            });
            for (const [chunk_index, audio_url] of [
                [0, '/voice/prepare-fail.wav'],
                [1, '/voice/play-fail.wav'],
                [2, '/voice/plays.wav'],
            ]) {
                mockWebSocket.onmessage({
                    data: JSON.stringify({
                        type: 'audio_stream_chunk', reply_id: 'reply-1', chunk_index,
                        audio_url, visemes: [],
                    }),
                });
            }
            mockWebSocket.onmessage({
                data: JSON.stringify({
                    type: 'audio_stream_end', reply_id: 'reply-1', full_text: '完整回复没有丢字。',
                }),
            });
        });

        await waitFor(() => expect(audio.sources).toHaveLength(2));
        expect(audio.sources[0].start).toHaveBeenCalledOnce();
        expect(audio.sources[1].start).toHaveBeenCalledOnce();
        expect(result.current.messages.at(-1)).toMatchObject({
            text: '完整回复没有丢字。',
            content: '完整回复没有丢字。',
            isStreamingAI: false,
        });
    });

    it('stops active playback and closes the mouth on interrupt, disconnect, and unmount', async () => {
        const audio = installFakeAudioRuntime();
        const { result, unmount } = renderHook(() => useUnaCore('test_user'));
        await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));
        act(() => mockWebSocket.onopen());

        const startReply = (replyId, url) => {
            act(() => {
                mockWebSocket.onmessage({
                    data: JSON.stringify({ type: 'audio_stream_start', reply_id: replyId }),
                });
                mockWebSocket.onmessage({
                    data: JSON.stringify({
                        type: 'audio_stream_chunk', reply_id: replyId, chunk_index: 0,
                        audio_url: url, visemes: [],
                    }),
                });
            });
        };

        startReply('reply-interrupt', '/voice/interrupt.wav');
        await waitFor(() => expect(audio.sources).toHaveLength(1));
        act(() => result.current.interrupt());
        expect(audio.sources[0].stop).toHaveBeenCalledOnce();
        expect(result.current.lipValue).toEqual({ rhubarb: 'X' });

        startReply('reply-disconnect', '/voice/disconnect.wav');
        await waitFor(() => expect(audio.sources).toHaveLength(2));
        act(() => mockWebSocket.onclose({ code: 1006 }));
        expect(audio.sources[1].stop).toHaveBeenCalledOnce();
        expect(result.current.lipValue).toEqual({ rhubarb: 'X' });

        startReply('reply-unmount', '/voice/unmount.wav');
        await waitFor(() => expect(audio.sources).toHaveLength(3));
        unmount();
        expect(audio.sources[2].stop).toHaveBeenCalledOnce();
        expect(audio.frames.size).toBe(0);
        expect(audio.contexts[0].close).toHaveBeenCalledOnce();
    });

    it('does not run a delayed public playback callback after unmount', async () => {
        const delayedDecode = deferred();
        const audio = installFakeAudioRuntime({
            decodeAudioData: () => delayedDecode.promise,
        });
        const onReady = vi.fn();
        const onEnded = vi.fn();
        const { result, unmount } = renderHook(() => useUnaCore('test_user'));
        await waitFor(() => expect(mockWebSocket.onmessage).toEqual(expect.any(Function)));
        act(() => mockWebSocket.onopen());

        let playback;
        act(() => {
            playback = result.current.playAudio('/voice/delayed.wav', [], onReady, onEnded);
        });
        await waitFor(() => expect(audio.audioRequests).toEqual(['/voice/delayed.wav']));

        unmount();
        delayedDecode.resolve({ id: 'late-buffer' });
        await playback;

        expect(onReady).not.toHaveBeenCalled();
        expect(onEnded).not.toHaveBeenCalled();
        expect(audio.sources).toHaveLength(0);
        expect(audio.frames.size).toBe(0);
    });
});
