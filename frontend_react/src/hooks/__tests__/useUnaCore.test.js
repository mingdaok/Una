import { renderHook, act } from '@testing-library/react';
import { useUnaCore } from '../useUnaCore';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
});
