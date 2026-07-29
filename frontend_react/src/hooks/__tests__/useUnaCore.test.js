import { renderHook, act, waitFor } from '@testing-library/react';
import { useUnaCore } from '../useUnaCore';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

        rerender({ user: 'second-user' });
        await waitFor(() => expect(sockets).toHaveLength(2));
        act(() => sockets[1].onopen());
        act(() => sockets[1].onmessage({
            data: JSON.stringify(validServerMotion({ motion_id: 'new-connection-motion' })),
        }));
        const activeMotion = result.current.motionEvent;

        act(() => sockets[0].onmessage({
            data: JSON.stringify(validServerMotion({ motion_id: 'stale-connection-motion' })),
        }));
        expect(result.current.motionEvent).toBe(activeMotion);
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
});
