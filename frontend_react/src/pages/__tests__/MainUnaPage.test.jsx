import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import MainUnaPage from '../MainUnaPage';
import { useUnaCore } from '../../hooks/useUnaCore';

const { feedbackSpy, viewerSpy } = vi.hoisted(() => ({
  feedbackSpy: vi.fn(),
  viewerSpy: vi.fn(),
}));

vi.mock('../../components/Live2DViewer', () => ({
  default: props => {
    viewerSpy(props);
    return <div data-testid="live2d-viewer" />;
  },
}));

vi.mock('../../components/life/LifeWorldPage', () => ({
  default: ({ onClose, onOpenSocial }) => (
    <section aria-label="UNA 生活测试页">
      <button type="button" onClick={onClose}>关闭生活页</button>
      <button type="button" onClick={onOpenSocial}>从生活页查看朋友圈</button>
    </section>
  ),
}));

vi.mock('../../components/social/SocialFeed', () => ({
  default: () => <section aria-label="UNA 朋友圈测试页" />,
}));

vi.mock('../../hooks/useUnaCore', () => ({ useUnaCore: vi.fn() }));
vi.mock('../../life/api', () => ({ submitProactiveFeedback: feedbackSpy }));
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

function coreResult(motionEvent, messages = []) {
  return {
    messages, setMessages: vi.fn(), sendMessage: vi.fn(), sendAudioData: vi.fn(), sendImage: vi.fn(),
    lipValue: { openY: 0, form: 0, volume: 0 }, interrupt: vi.fn(), playAudio: vi.fn(),
    connectionStatus: 'OPEN', replayChunks: vi.fn(), sendStopSignal: vi.fn(), motionEvent,
  };
}

afterEach(cleanup);

describe('MainUnaPage 的 Live2D 动作兼容桥接', () => {
  beforeEach(() => {
    viewerSpy.mockClear();
    feedbackSpy.mockReset();
    feedbackSpy.mockResolvedValue({ reaction: 'more', topic_score: 2 });
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

  it('从统一导航打开并关闭 UNA 的生活页', async () => {
    useUnaCore.mockReturnValue(coreResult(null));

    render(<MainUnaPage />);
    fireEvent.click(screen.getByRole('button', { name: '打开功能菜单' }));
    fireEvent.click(await screen.findByRole('button', { name: /UNA 的生活/ }));

    expect(screen.getByRole('region', { name: 'UNA 生活测试页' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '关闭生活页' }));
    await vi.waitFor(() => {
      expect(screen.queryByRole('region', { name: 'UNA 生活测试页' })).toBeNull();
    });
  });

  it('从最近来往进入朋友圈并关闭生活页', async () => {
    useUnaCore.mockReturnValue(coreResult(null));

    render(<MainUnaPage />);
    fireEvent.click(screen.getByRole('button', { name: '打开功能菜单' }));
    fireEvent.click(await screen.findByRole('button', { name: /UNA 的生活/ }));
    fireEvent.click(screen.getByRole('button', { name: '从生活页查看朋友圈' }));

    expect(screen.getByRole('region', { name: 'UNA 朋友圈测试页' })).toBeTruthy();
    await vi.waitFor(() => {
      expect(screen.queryByRole('region', { name: 'UNA 生活测试页' })).toBeNull();
    });
  });

  it('为主动生活分享显示克制的来源提示', () => {
    useUnaCore.mockReturnValue(coreResult(null, [{
      role: 'ai',
      isAI: true,
      text: '你不在的时候，我去河边散了会儿步。',
      proactiveKind: 'life_share',
    }]));

    render(<MainUnaPage />);

    expect(screen.getByText('她主动提起')).toBeTruthy();
    expect(screen.getByText('你不在的时候，我去河边散了会儿步。')).toBeTruthy();
  });

  it('允许用户直接评价主动分享并显示保存结果', async () => {
    useUnaCore.mockImplementation(() => {
      const [messages, setMessages] = useState([{
        role: 'ai',
        isAI: true,
        text: '你不在的时候，我去河边散了会儿步。',
        proactiveKind: 'life_share',
        proactiveDeliveryId: 'delivery-1',
      }]);
      return { ...coreResult(null, messages), setMessages };
    });

    render(<MainUnaPage />);
    fireEvent.click(screen.getByRole('button', { name: '喜欢听' }));

    await vi.waitFor(() => {
      expect(feedbackSpy).toHaveBeenCalledWith('delivery-1', 'more');
      expect(screen.getByText('记住了，以后可以多聊一点。')).toBeTruthy();
    });
  });
});
