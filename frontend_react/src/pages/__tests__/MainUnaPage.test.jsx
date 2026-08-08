import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MainUnaPage from '../MainUnaPage';
import { useUnaCore } from '../../hooks/useUnaCore';

const { viewerSpy } = vi.hoisted(() => ({ viewerSpy: vi.fn() }));

vi.mock('../../components/Live2DViewer', () => ({
  default: props => {
    viewerSpy(props);
    return <div data-testid="live2d-viewer" />;
  },
}));

vi.mock('../../hooks/useUnaCore', () => ({ useUnaCore: vi.fn() }));
vi.mock('../../hooks/useAudioRecorder', () => ({
  useAudioRecorder: () => ({ isRecording: false, startRecording: vi.fn(), stopRecording: vi.fn() }),
}));
vi.mock('../../hooks/useVision', () => ({ useVision: () => ({ pickImage: vi.fn() }) }));
vi.mock('../../live2d/loadLive2dRuntime', () => ({ loadLive2dRuntime: () => Promise.resolve() }));
vi.mock('../../auth/session', () => ({
  authFetch: vi.fn(),
  authenticate: vi.fn(),
  clearSession: vi.fn(),
  getSession: () => ({ access_token: 'access-token', user: { id: 'u1', username: 'tester' } }),
  refreshSession: vi.fn(() => Promise.resolve(null)),
}));

function coreResult(motionEvent) {
  return {
    messages: [], setMessages: vi.fn(), sendMessage: vi.fn(), sendAudioData: vi.fn(), sendImage: vi.fn(),
    lipValue: { openY: 0, form: 0, volume: 0 }, interrupt: vi.fn(), playAudio: vi.fn(),
    connectionStatus: 'OPEN', replayChunks: vi.fn(), sendStopSignal: vi.fn(), motionEvent,
  };
}

describe('MainUnaPage 的 Live2D 动作兼容桥接', () => {
  beforeEach(() => {
    viewerSpy.mockClear();
  });

  it.each([
    { type: 'live2d_action_v2', action_id: 'legacy-v2', intent: 'thinking' },
    { action: '惊讶', params: { direction: '头左偏' } },
  ])('在 Task 9 前继续将旧动作事件传给 actionOverride', async motionEvent => {
    useUnaCore.mockReturnValue(coreResult(motionEvent));

    render(<MainUnaPage />);

    await vi.waitFor(() => expect(viewerSpy).toHaveBeenCalled());
    const live2dProps = viewerSpy.mock.calls.at(-1)[0];
    expect(live2dProps.motionEvent).toBe(motionEvent);
    expect(live2dProps.actionOverride).toBe(motionEvent);
  });
});
