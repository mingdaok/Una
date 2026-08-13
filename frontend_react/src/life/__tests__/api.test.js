import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  advanceLifeAcceptance,
  auditLifeContent,
  cancelLifeQualityJob,
  createLifeQualityJob,
  evaluateLifeQuality,
  evaluateContentSafety,
  loadLifeAcceptanceStatus,
  loadLifeQualityJob,
  loadLifeDashboard,
  loadNpcActorDebug,
  loadNpcActors,
  loadProactiveStatus,
  resolveLifeChoice,
  submitProactiveFeedback,
  releaseLifeAcceptance,
  resetLifeAcceptance,
  updateLifeSettings,
} from '../api';

const { authFetch } = vi.hoisted(() => ({ authFetch: vi.fn() }));

vi.mock('../../auth/session', () => ({ authFetch }));

function response(data, ok = true) {
  return { ok, status: ok ? 200 : 400, json: () => Promise.resolve(data) };
}

beforeEach(() => {
  authFetch.mockReset();
});

describe('life api', () => {
  it('组合生活状态、事件、故事线和关系', async () => {
    const payloads = {
      '/api/life/offline-summary': { headline: '今天很平静。', event_count: 0 },
      '/api/life/status': { profile: { timezone: 'Asia/Shanghai' }, state: { energy: 70 } },
      '/api/life/events?limit=40': { items: [{ event_id: 'event-1' }] },
      '/api/life/arcs?status=active&limit=3': { items: [{ story_arc_id: 'arc-1' }] },
      '/api/life/relationships?limit=6': { items: [{ other_ai_id: 'ai_xiaoman' }] },
      '/api/life/choices?status=pending&limit=1': { items: [{ choice_id: 'choice-1' }] },
      '/api/life/intentions?limit=3': { items: [{ intention_id: 'intention-1' }] },
    };
    authFetch.mockImplementation(path => Promise.resolve(response(payloads[path])));

    const dashboard = await loadLifeDashboard();

    expect(dashboard.events).toEqual([{ event_id: 'event-1' }]);
    expect(dashboard.arcs).toEqual([{ story_arc_id: 'arc-1' }]);
    expect(dashboard.relationships).toEqual([{ other_ai_id: 'ai_xiaoman' }]);
    expect(dashboard.choices).toEqual([{ choice_id: 'choice-1' }]);
    expect(dashboard.intentions).toEqual([{ intention_id: 'intention-1' }]);
    expect(authFetch).toHaveBeenCalledTimes(7);
  });

  it('提交共同商量的建议', async () => {
    authFetch.mockResolvedValue(response({ choice: { status: 'resolved' } }));

    await resolveLifeChoice('choice/1', 'autonomy');

    expect(authFetch).toHaveBeenCalledWith('/api/life/choices/choice%2F1/resolve', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ option_id: 'autonomy' }),
    }));
  });

  it('只向设置接口提交用户改动', async () => {
    authFetch.mockResolvedValue(response({ activity_level: 'quiet' }));

    await updateLifeSettings({ activity_level: 'quiet' });

    expect(authFetch).toHaveBeenCalledWith('/api/life/settings', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ activity_level: 'quiet' }),
    }));
  });

  it('提交主动分享反馈并读取诊断状态', async () => {
    authFetch
      .mockResolvedValueOnce(response({ reaction: 'more', topic_score: 2 }))
      .mockResolvedValueOnce(response({ blocked_reason: 'cooldown' }));

    const feedback = await submitProactiveFeedback('delivery-1', 'more');
    const status = await loadProactiveStatus();

    expect(feedback.topic_score).toBe(2);
    expect(status.blocked_reason).toBe('cooldown');
    expect(authFetch).toHaveBeenNthCalledWith(1, '/api/life/proactive-feedback', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ delivery_id: 'delivery-1', reaction: 'more' }),
    }));
    expect(authFetch).toHaveBeenNthCalledWith(2, '/api/life/proactive-status', {});
  });

  it('按选中人物组合世界检查数据', async () => {
    const payloads = {
      '/api/life/actors?role=friend': { items: [{ actor_id: 'npc_preset_1' }] },
      '/api/life/actors/npc_preset_1/life': { actor: { actor_id: 'npc_preset_1' }, state: {}, schedule: [] },
      '/api/life/actors/npc_preset_1/events?limit=50': { items: [{ event_id: 'event-1' }] },
      '/api/life/actors/npc_preset_1/interactions?limit=50': { items: [{ event_id: 'shared-1' }] },
      '/api/life/actors/npc_preset_1/relationships?limit=30': { items: [{ other_ai_id: 'npc_preset_2' }] },
      '/api/life/actors/npc_preset_1/intentions?limit=30': { items: [{ intention_instance_id: 'intent-1' }] },
      '/api/life/actors/npc_preset_1/suggestions?limit=30': { items: [{ suggestion_id: 'suggest-1' }] },
      '/api/life/acceptance/actors/npc_preset_1/decisions?limit=30': { items: [{ decision_id: 'decision-1' }] },
      '/api/life/acceptance/actors/npc_preset_1/planning': { goals: [{ goal_id: 'goal-1' }], commitments: [], plans: [], invitations: [{ invitation_id: 'invite-1' }], environment: { weather: { condition: 'rain' }, opportunities: [{ opportunity_id: 'world-1' }] }, llm_calls: [{ call_id: 'call-1' }] },
    };
    authFetch.mockImplementation(path => Promise.resolve(response(payloads[path])));

    const actors = await loadNpcActors();
    const debug = await loadNpcActorDebug('npc_preset_1');

    expect(actors).toEqual([{ actor_id: 'npc_preset_1' }]);
    expect(debug.events[0].event_id).toBe('event-1');
    expect(debug.interactions[0].event_id).toBe('shared-1');
    expect(debug.relationships[0].other_ai_id).toBe('npc_preset_2');
    expect(debug.intentions[0].intention_instance_id).toBe('intent-1');
    expect(debug.suggestions[0].suggestion_id).toBe('suggest-1');
    expect(debug.decisions[0].decision_id).toBe('decision-1');
    expect(debug.goals[0].goal_id).toBe('goal-1');
    expect(debug.invitations[0].invitation_id).toBe('invite-1');
    expect(debug.environment.opportunities[0].opportunity_id).toBe('world-1');
    expect(debug.llm_calls[0].call_id).toBe('call-1');
  });

  it('控制开发环境的可复现验收时钟', async () => {
    authFetch
      .mockResolvedValueOnce(response({ active: false }))
      .mockResolvedValueOnce(response({ active: true, seed: 'review' }))
      .mockResolvedValueOnce(response({ active: true, advanced_hours: 24 }))
      .mockResolvedValueOnce(response({ active: false }));

    expect((await loadLifeAcceptanceStatus()).active).toBe(false);
    await resetLifeAcceptance({ seed: 'review', scenario: 'three_days' });
    await advanceLifeAcceptance(24);
    await releaseLifeAcceptance();

    expect(authFetch).toHaveBeenNthCalledWith(2, '/api/life/acceptance/reset', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ seed: 'review', scenario: 'three_days' }),
    }));
    expect(authFetch).toHaveBeenNthCalledWith(3, '/api/life/acceptance/advance', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ hours: 24 }),
    }));
    expect(authFetch).toHaveBeenNthCalledWith(4, '/api/life/acceptance/release', expect.objectContaining({ method: 'POST' }));
  });

  it('生产环境未注册验收路由时隐藏控制台', async () => {
    authFetch.mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({ detail: 'Not Found' }) });

    expect(await loadLifeAcceptanceStatus()).toBeNull();
  });

  it('提交隔离的多种子质量评估', async () => {
    authFetch.mockResolvedValue(response({ seed_count: 2, metrics: {} }));

    const result = await evaluateLifeQuality(['seed-a', 'seed-b'], 5);

    expect(result.seed_count).toBe(2);
    expect(authFetch).toHaveBeenCalledWith('/api/life/acceptance/evaluate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ seeds: ['seed-a', 'seed-b'], days: 5 }),
    }));
  });

  it('创建、查询并取消长周期后台质量评估', async () => {
    authFetch
      .mockResolvedValueOnce(response({ job_id: 'job/1', status: 'queued' }))
      .mockResolvedValueOnce(response({ job_id: 'job/1', status: 'running' }))
      .mockResolvedValueOnce(response({ job_id: 'job/1', status: 'cancelled' }));

    await createLifeQualityJob(['long-a'], 90);
    await loadLifeQualityJob('job/1');
    await cancelLifeQualityJob('job/1');

    expect(authFetch).toHaveBeenNthCalledWith(1, '/api/life/acceptance/evaluation-jobs', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ seeds: ['long-a'], days: 90 }),
    }));
    expect(authFetch).toHaveBeenNthCalledWith(2, '/api/life/acceptance/evaluation-jobs/job%2F1', expect.any(Object));
    expect(authFetch).toHaveBeenNthCalledWith(3, '/api/life/acceptance/evaluation-jobs/job%2F1/cancel', expect.objectContaining({ method: 'POST' }));
  });

  it('提交当前用户生成内容的只读审计', async () => {
    authFetch.mockResolvedValue(response({ summary: { scanned: 8 }, issues: [] }));

    const result = await auditLifeContent({ postLimit: 20, diaryLimit: 10, chatLimit: 40 });

    expect(result.summary.scanned).toBe(8);
    expect(authFetch).toHaveBeenCalledWith('/api/life/acceptance/content-audit', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ post_limit: 20, diary_limit: 10, chat_limit: 40 }),
    }));
  });

  it('在隔离世界运行内容安全回归门禁', async () => {
    authFetch.mockResolvedValue(response({ gate_passed: true, case_count: 10 }));

    const result = await evaluateContentSafety();

    expect(result.gate_passed).toBe(true);
    expect(authFetch).toHaveBeenCalledWith('/api/life/acceptance/safety-evaluate', expect.objectContaining({
      method: 'POST',
    }));
  });
});
