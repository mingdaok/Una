import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import QQSocialAdmin from '../QQSocialAdmin';

afterEach(cleanup);
const groups = [{ group_id: '100', enabled: true }];
it('changes collection independently from autonomous speech', async () => {
  const request = vi.fn(async () => ({ autonomous: true, collect: false, context_count: 60 }));
  render(<QQSocialAdmin groups={groups} request={request} />);
  fireEvent.click(await screen.findByLabelText('收集本群表情（会调用识图模型）'));
  await waitFor(() => expect(request).toHaveBeenCalledWith('admin/groups/100/behavior', 'PATCH', { collect: true }));
});
it('queues historical import and requires a second click to clear context', async () => {
  const request = vi.fn(async path => path.includes('/behavior') ? {} : []);
  render(<QQSocialAdmin groups={groups} request={request} />);
  fireEvent.click(screen.getByRole('tab', { name: '聊天记录' }));
  fireEvent.click(await screen.findByText('补取最近 100 条'));
  await screen.findByText('已排队，请到后台任务查看实际获取数量');
  expect(request).toHaveBeenCalledWith('admin/groups/100/history-sync', 'POST');
  fireEvent.click(screen.getByText('清空本群上下文'));
  expect(request).not.toHaveBeenCalledWith('admin/groups/100/context', 'DELETE');
  fireEvent.click(screen.getByText('确认清空本群上下文'));
  await waitFor(() => expect(request).toHaveBeenCalledWith('admin/groups/100/context', 'DELETE'));
});
it('switches sticker scope without enabling collection', async () => {
  const request = vi.fn(async path => path.includes('/behavior') ? {} : []);
  render(<QQSocialAdmin groups={groups} request={request} />);
  fireEvent.click(screen.getByRole('tab', { name: '表情库' }));
  fireEvent.change(await screen.findByLabelText('图库范围'), { target: { value: '100' } });
  await waitFor(() => expect(request).toHaveBeenCalledWith('admin/stickers?scope=100&offset=0&limit=30'));
  expect(request.mock.calls.every(call => !call[1])).toBe(true);
});

it('starts a scoped thirty minute test and can end it without changing collection', async () => {
  const request = vi.fn(async path => path.endsWith('test-mode') ? { percent: 95, until: Date.now() / 1000 + 1800 } : {});
  render(<QQSocialAdmin groups={groups} request={request} />);
  fireEvent.click(await screen.findByText('测试 30 分钟（95%）'));
  await waitFor(() => expect(request).toHaveBeenCalledWith('admin/groups/100/test-mode', 'PUT', { percent: 95, minutes: 30 }));
  await waitFor(() => expect(screen.getByText('结束本群测试').closest('fieldset').disabled).toBe(false));
  fireEvent.click(screen.getByText('结束本群测试'));
  await waitFor(() => expect(request).toHaveBeenCalledWith('admin/groups/100/test-mode', 'PUT', { percent: 0 }));
  expect(request.mock.calls.some(call => call[1] === 'PATCH')).toBe(false);
});

it('shows generation failure stage without relabeling it as a successful direct reply', async () => {
  const request = vi.fn(async path => path.includes('/decisions') ? [{ reason: 'generation_failed', stage: 'generation', error_code: 'ValueError', elapsed: 0.2, created: 1 }] : {});
  render(<QQSocialAdmin groups={groups} request={request} />);
  fireEvent.click(screen.getByRole('tab', { name: '插话诊断' }));
  expect((await screen.findByText(/阶段：generation/)).textContent).toContain('生成失败');
});
