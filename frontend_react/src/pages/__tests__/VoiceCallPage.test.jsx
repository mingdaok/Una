import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import VoiceCallPage from '../VoiceCallPage';
import { useVoiceCall } from '../../voice-call/useVoiceCall';


vi.mock('../../voice-call/useVoiceCall', () => ({ useVoiceCall: vi.fn() }));

it('展示通话状态、双方转写并允许结束', async () => {
  const endCall = vi.fn();
  useVoiceCall.mockReturnValue({
    status: 'speaking',
    userTranscript: '今天有点累',
    assistantText: '我陪你歇一会儿。',
    error: '', muted: false,
    startCall: vi.fn(), endCall, continueCall: vi.fn(), toggleMute: vi.fn(),
  });
  render(<VoiceCallPage authenticated />);

  expect(screen.getByText('UNA 正在说话')).toBeTruthy();
  expect(screen.getByText('今天有点累')).toBeTruthy();
  expect(screen.getByText('我陪你歇一会儿。')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '结束通话' }));
  expect(endCall).toHaveBeenCalledTimes(1);
});

it('暂停后只在用户点击时继续', async () => {
  const continueCall = vi.fn();
  useVoiceCall.mockReturnValue({
    status: 'interrupted', userTranscript: '', assistantText: '', error: '', muted: false,
    startCall: vi.fn(), endCall: vi.fn(), continueCall, toggleMute: vi.fn(),
  });
  render(<VoiceCallPage authenticated />);
  fireEvent.click(screen.getByRole('button', { name: '继续通话' }));
  expect(continueCall).toHaveBeenCalledTimes(1);
});
