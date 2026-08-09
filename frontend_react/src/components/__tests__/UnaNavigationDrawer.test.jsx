import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import UnaNavigationDrawer from '../UnaNavigationDrawer';

afterEach(cleanup);

function renderDrawer(overrides = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    user: { username: 'tester' },
    connectionStatus: 'OPEN',
    scene: 'living',
    currentModel: 'panda_cake',
    avatarUrl: '/avatar.png',
    onOpenChat: vi.fn(),
    onOpenSocial: vi.fn(),
    onOpenDiary: vi.fn(),
    onToggleScene: vi.fn(),
    onOpenCharacterSettings: vi.fn(),
    onOpenSettings: vi.fn(),
    onLogout: vi.fn(),
    ...overrides,
  };

  return { props, ...render(<UnaNavigationDrawer {...props} />) };
}

describe('UnaNavigationDrawer', () => {
  it('uses one top-left trigger for the consolidated navigation', () => {
    const onOpenChange = vi.fn();
    renderDrawer({ open: false, onOpenChange });

    fireEvent.click(screen.getByRole('button', { name: '打开功能菜单' }));

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('dialog', { name: 'UNA 功能菜单' })).toBeNull();
  });

  it('shows every existing feature entry and current state', () => {
    renderDrawer();

    expect(screen.getByRole('dialog', { name: 'UNA 功能菜单' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /实时语音/ }).getAttribute('href')).toBe('./?view=voice');
    expect(screen.getByRole('button', { name: /文字聊天/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /UNA 动态/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /回忆日记/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /切换场景/ }).textContent).toContain('客厅');
    expect(screen.getByRole('button', { name: /角色与显示/ }).textContent).toContain('panda_cake');
    expect(screen.getByText('私有陪伴空间 · 已连接')).toBeTruthy();
  });

  it('closes the drawer before opening an existing feature', () => {
    const { props } = renderDrawer();

    fireEvent.click(screen.getByRole('button', { name: /UNA 动态/ }));

    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(props.onOpenSocial).toHaveBeenCalledOnce();
  });

  it('keeps logout as an explicit action', () => {
    const { props } = renderDrawer();

    fireEvent.click(screen.getByRole('button', { name: /退出登录/ }));

    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(props.onLogout).toHaveBeenCalledOnce();
  });
});
