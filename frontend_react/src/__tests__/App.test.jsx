import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import App from '../App';


const loaded = vi.hoisted(() => ({ main: false, voice: false }));

vi.mock('../auth/session', () => ({
  authenticate: vi.fn(),
  getSession: () => ({ access_token: 'access', user: { id: 'u1' } }),
  refreshSession: vi.fn(async () => null),
}));
vi.mock('../pages/MainUnaPage.jsx', () => {
  loaded.main = true;
  return { default: () => <div>主应用</div> };
});
vi.mock('../pages/VoiceCallPage.jsx', () => {
  loaded.voice = true;
  return { default: () => <button>开始通话</button> };
});

beforeEach(() => {
  loaded.main = false;
  loaded.voice = false;
});

it('voice 查询参数只渲染语音页', async () => {
  window.history.replaceState({}, '', '/?view=voice');
  render(<App />);
  expect(await screen.findByRole('button', { name: '开始通话' })).toBeTruthy();
  expect(loaded.voice).toBe(true);
  expect(loaded.main).toBe(false);
});
