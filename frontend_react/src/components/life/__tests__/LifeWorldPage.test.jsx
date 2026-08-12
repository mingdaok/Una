import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LifeWorldPage from '../LifeWorldPage';

const { loadDashboard, resolveChoice, saveSettings } = vi.hoisted(() => ({
  loadDashboard: vi.fn(),
  resolveChoice: vi.fn(),
  saveSettings: vi.fn(),
}));

vi.mock('../../../life/api', () => ({
  loadLifeDashboard: loadDashboard,
  resolveLifeChoice: resolveChoice,
  updateLifeSettings: saveSettings,
  loadNpcActors: vi.fn().mockResolvedValue([]),
  loadNpcActorDebug: vi.fn(),
  loadLifeAcceptanceStatus: vi.fn().mockResolvedValue(null),
  resetLifeAcceptance: vi.fn(),
  advanceLifeAcceptance: vi.fn(),
  releaseLifeAcceptance: vi.fn(),
  evaluateLifeQuality: vi.fn(),
  auditLifeContent: vi.fn(),
}));

const profile = {
  timezone: 'Asia/Shanghai',
  simulation_enabled: true,
  activity_level: 'natural',
  social_posts_enabled: true,
  diaries_enabled: true,
  proactive_messages_enabled: false,
  proactive_frequency: 'natural',
};

const dashboard = {
  profile,
  state: {
    current_activity: 'evening_walk',
    current_location: 'riverside',
    energy: 72,
    hunger: 25,
    stress: 18,
    social_need: 42,
    last_settled_at: '2026-08-10T12:30:00+00:00',
  },
  summary: {
    headline: '傍晚沿河散了会儿步，风很舒服。',
    event_count: 1,
    important_count: 1,
  },
  events: [
    {
      event_id: 'event-1',
      event_type: 'evening_walk',
      status: 'completed',
      start_at: '2026-08-10T11:45:00+00:00',
      end_at: '2026-08-10T12:15:00+00:00',
      location_id: 'riverside',
      summary: '沿河走了一小段，看到晚霞落在水面上。',
      interpretation: '散步让紧绷的心情松了下来。',
      importance: 52,
      mentionability: 70,
      publicability: 20,
      private_thought: '不应该直接显示的私密想法',
    },
  ],
  arcs: [
    {
      story_arc_id: 'arc-1',
      title: '把零碎光影做成完整作品',
      status: 'active',
      stage: 'shaping',
      stage_label: '慢慢形成轮廓',
      last_advanced_at: '2026-08-10T11:30:00+00:00',
    },
  ],
  relationships: [
    {
      other_ai_id: 'ai_xiaoman',
      display_name: '小满',
      familiarity: 14,
      affinity: 10,
      trust: 8,
      tension: 0,
      last_interaction_at: '2026-08-10T10:00:00+00:00',
      private_summary: '不应该直接显示的关系总结',
    },
  ],
  choices: [],
  intentions: [],
};

afterEach(cleanup);

beforeEach(() => {
  loadDashboard.mockReset();
  saveSettings.mockReset();
  resolveChoice.mockReset();
  loadDashboard.mockResolvedValue(dashboard);
  saveSettings.mockImplementation(settings => Promise.resolve({ ...profile, ...settings }));
  resolveChoice.mockResolvedValue({
    choice: { resolution_text: 'UNA 记住了你给她的空间。她会自己想清楚。' },
    intention: {
      intention_id: 'intention-1',
      summary: '按自己的感受决定是否赴约',
      status: 'active',
      updated_at: '2026-08-10T12:31:00+00:00',
    },
    state: dashboard.state,
  });
});

describe('LifeWorldPage', () => {
  it('展示当前生活、离线摘要和可展开的事件', async () => {
    const openSocial = vi.fn();
    render(<LifeWorldPage avatarUrl="/una.png" onClose={vi.fn()} onOpenSocial={openSocial} />);

    expect(screen.getByLabelText('正在读取 UNA 的生活')).toBeTruthy();
    expect(await screen.findByRole('heading', { name: '在晚风里散步' })).toBeTruthy();
    expect(screen.getByText('傍晚沿河散了会儿步，风很舒服。')).toBeTruthy();
    expect(screen.getByText('把零碎光影做成完整作品')).toBeTruthy();
    expect(screen.getByText('慢慢形成轮廓')).toBeTruthy();
    expect(screen.getByText('小满')).toBeTruthy();
    expect(screen.getByText('来往渐渐自然')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '去朋友圈' }));
    expect(openSocial).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /沿河走了一小段/ }));
    expect(screen.getByText('散步让紧绷的心情松了下来。')).toBeTruthy();
    expect(screen.queryByText('不应该直接显示的私密想法')).toBeNull();
    expect(screen.queryByText('不应该直接显示的关系总结')).toBeNull();
  });

  it('按可分享程度筛选并呈现空状态', async () => {
    render(<LifeWorldPage avatarUrl="/una.png" onClose={vi.fn()} />);
    await screen.findByRole('heading', { name: '在晚风里散步' });

    fireEvent.click(screen.getByRole('button', { name: '可能分享' }));

    expect(screen.getByRole('heading', { name: '这段时间很安静' })).toBeTruthy();
  });

  it('保存用户可以理解的生活设置', async () => {
    render(<LifeWorldPage avatarUrl="/una.png" onClose={vi.fn()} />);
    await screen.findByRole('heading', { name: '在晚风里散步' });

    fireEvent.click(screen.getByRole('button', { name: '打开生活设置' }));
    fireEvent.click(screen.getByRole('button', { name: '丰富' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /允许发布动态/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /主动聊起生活/ }));
    fireEvent.click(screen.getByRole('button', { name: '多一点' }));
    fireEvent.click(screen.getByRole('button', { name: '保存设置' }));

    await waitFor(() => {
      expect(saveSettings).toHaveBeenCalledWith(expect.objectContaining({
        activity_level: 'dramatic',
        social_posts_enabled: false,
        proactive_messages_enabled: true,
        proactive_frequency: 'frequent',
      }));
    });
    expect(await screen.findByText('已保存')).toBeTruthy();
  });

  it('把共同商量呈现为建议，并在原位显示回应', async () => {
    loadDashboard.mockResolvedValue({
      ...dashboard,
      choices: [{
        choice_id: 'choice-1',
        context_text: '小满邀请 UNA 去看看旧城区的新展。',
        prompt: '“我还没决定，要不要把这个约定认真排进生活里。你怎么看？”',
        options: [
          { id: 'encourage', label: '鼓励她赴约', description: '看看这段来往会走向哪里。' },
          { id: 'slow', label: '建议先留点自己的时间', description: '不必立刻答应。' },
          { id: 'autonomy', label: '让她自己决定', description: '给她空间。' },
        ],
      }],
    });
    render(<LifeWorldPage avatarUrl="/una.png" onClose={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: '她想听听你的意见' })).toBeTruthy();
    expect(screen.getByText('这是给她的建议。最后怎样行动，仍由她自己决定。')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /让她自己决定/ }));

    await waitFor(() => expect(resolveChoice).toHaveBeenCalledWith('choice-1', 'autonomy'));
    expect(await screen.findByRole('heading', { name: '她记住了你的想法' })).toBeTruthy();
    expect(screen.getByText('UNA 记住了你给她的空间。她会自己想清楚。')).toBeTruthy();
  });

  it('读取失败后允许用户重试', async () => {
    loadDashboard
      .mockRejectedValueOnce(new Error('网络暂时不可用'))
      .mockResolvedValueOnce(dashboard);

    render(<LifeWorldPage avatarUrl="/una.png" onClose={vi.fn()} />);

    expect((await screen.findByRole('alert')).textContent).toContain('网络暂时不可用');
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));

    expect(await screen.findByRole('heading', { name: '在晚风里散步' })).toBeTruthy();
    expect(loadDashboard).toHaveBeenCalledTimes(2);
  });

  it('从生活页打开并关闭 NPC 世界检查器', async () => {
    render(<LifeWorldPage avatarUrl="/una.png" onClose={vi.fn()} />);
    await screen.findByRole('heading', { name: '在晚风里散步' });

    fireEvent.click(screen.getByRole('button', { name: '打开 NPC 世界检查' }));
    expect(await screen.findByRole('dialog', { name: 'NPC 世界检查' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '返回 UNA 的生活' }));
    expect(screen.queryByRole('dialog', { name: 'NPC 世界检查' })).toBeNull();
  });

  it('重新打开生活页后仍展示共同决定的结果状态', async () => {
    loadDashboard.mockResolvedValue({
      ...dashboard,
      intentions: [{
        intention_id: 'intention-2',
        summary: '先照顾自己的节奏，再决定是否赴约',
        status: 'deferred',
        created_at: '2026-08-10T08:00:00+00:00',
        updated_at: '2026-08-10T08:00:00+00:00',
      }],
    });

    render(<LifeWorldPage avatarUrl="/una.png" onClose={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: '她决定先放一放' })).toBeTruthy();
    expect(screen.getByText(/先照顾自己的节奏/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /鼓励她/ })).toBeNull();
  });
});
