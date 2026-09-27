import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import QQConnectionPanel from '../QQConnectionPanel';
import { authFetch } from '../../auth/session';
vi.mock('../../auth/session', () => ({ authFetch: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
let binding;
beforeEach(() => {
  binding = null;
  authFetch.mockImplementation(async (path, options = {}) => {
    let data = {};
    if (path.endsWith('/status')) data = { enabled: true, connected: true, is_admin: false };
    if (path.endsWith('/binding')) data = { binding, pending: [] };
    if (path.endsWith('/binding-codes')) data = { code: 'test-code', expires_in: 300 };
    return { ok: true, json: async () => data };
  });
});
it('generates a binding command without exposing a token', async () => {
  render(<QQConnectionPanel onClose={() => {}} />);
  await screen.findByText('已连接 QQ');
  fireEvent.click(screen.getByRole('button', { name: '生成绑定码' }));
  await screen.findByText('/una bind test-code');
  expect(authFetch).toHaveBeenCalledWith('/api/channels/qq/binding-codes', expect.objectContaining({ method: 'POST' }));
});
it('persists an explicit sharing preference and can revoke binding', async () => {
  binding = { external_id: '***0200', prefs: { voice_mode: 'follow', share_memory: false } };
  render(<QQConnectionPanel onClose={() => {}} />);
  const input = await screen.findByLabelText('共享长期记忆');
  fireEvent.click(input);
  await waitFor(() => expect(authFetch).toHaveBeenCalledWith('/api/channels/qq/preferences', expect.objectContaining({ method: 'PATCH', body: '{"share_memory":true}' })));
  await waitFor(() => expect(screen.getByRole('button', { name: '解除 QQ 绑定' }).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: '解除 QQ 绑定' }));
  await waitFor(() => expect(authFetch).toHaveBeenCalledWith('/api/channels/qq/binding', expect.objectContaining({ method: 'DELETE' })));
});
it('shows failure and closes using Escape', async () => {
  authFetch.mockResolvedValue({ ok: false, json: async () => ({ detail: '会话失效' }) });
  const onClose = vi.fn(); render(<QQConnectionPanel onClose={onClose} />);
  expect((await screen.findByRole('alert')).textContent).toBe('会话失效');
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(onClose).toHaveBeenCalledOnce();
});

it('shows the owner media failure and uncertain delivery separately', async () => {
  authFetch.mockImplementation(async path => ({ ok: true, json: async () => path.endsWith('/status') ? { enabled: true, connected: true, is_admin: false } : path.endsWith('/binding') ? { binding: null, pending: [] } : [{ id: 'job', created: 1, status: 'done', stage: 'tts', delivery_status: 'unknown' }] }));
  render(<QQConnectionPanel onClose={() => {}} />);
  await screen.findByText('我的语音任务');
  await screen.findByText(/回执不明（不重发）/);
});
