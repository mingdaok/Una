import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NpcWorldInspector from '../NpcWorldInspector';

const { loadActors, loadDebug, loadAcceptance, resetAcceptance, advanceAcceptance, releaseAcceptance, createQualityJob, loadQualityJob, cancelQualityJob, auditContent, evaluateSafety } = vi.hoisted(() => ({
  loadActors: vi.fn(),
  loadDebug: vi.fn(),
  loadAcceptance: vi.fn(),
  resetAcceptance: vi.fn(),
  advanceAcceptance: vi.fn(),
  releaseAcceptance: vi.fn(),
  createQualityJob: vi.fn(),
  loadQualityJob: vi.fn(),
  cancelQualityJob: vi.fn(),
  auditContent: vi.fn(),
  evaluateSafety: vi.fn(),
}));

vi.mock('../../../life/api', () => ({
  loadNpcActors: loadActors,
  loadNpcActorDebug: loadDebug,
  loadLifeAcceptanceStatus: loadAcceptance,
  resetLifeAcceptance: resetAcceptance,
  advanceLifeAcceptance: advanceAcceptance,
  releaseLifeAcceptance: releaseAcceptance,
  createLifeQualityJob: createQualityJob,
  loadLifeQualityJob: loadQualityJob,
  cancelLifeQualityJob: cancelQualityJob,
  auditLifeContent: auditContent,
  evaluateContentSafety: evaluateSafety,
}));

const actors = [
  { actor_id: 'npc_preset_1', display_name: '小满', traits: ['亲切'], prompt_identity: '生活感很强的朋友' },
  { actor_id: 'npc_preset_2', display_name: '知夏', traits: ['安静'], prompt_identity: '观察细致的朋友' },
];

const debugData = {
  actor: actors[0],
  state: {
    current_activity: 'intentional_project', current_location: 'home',
    energy: 68, hunger: 24, stress: 18, social_need: 32, solitude_need: 20,
    boredom: 44, focus: 62, confidence: 58, comfort: 73,
    mood: { label: '平静' },
  },
  schedule: [{
    schedule_id: 'schedule-1', starts_at: '2026-08-11T02:00:00Z',
    summary: '整理最近试过的食谱。', window_key: 'morning', location_id: 'home', status: 'planned',
  }],
  events: [{
    event_id: 'event-1', schedule_id: 'schedule-1', end_at: '2026-08-11T01:00:00Z',
    summary: '继续推进了甜点计划。', event_type: 'intentional_project', location_id: 'home',
    location_name: '家中', source: '目标驱动',
  }],
  interactions: [{
    event_id: 'shared-1', end_at: '2026-08-10T12:00:00Z', summary: '和知夏重新谈清楚了误会。',
    event_type: 'relationship_repair', location_id: 'neighborhood',
    participants: [{ actor_id: 'npc_preset_1' }, { actor_id: 'npc_preset_2' }],
    perspective: { interpretation: '愿意再往前走一点。' },
  }],
  relationships: [{
    other_ai_id: 'npc_preset_2', display_name: '知夏', relationship_tier: 'close',
    closeness_score: 52, familiarity: 60, affinity: 55, trust: 52, tension: 8,
    disclosure_level: 'close', private_summary: '不能显示的内部摘要',
  }],
  intentions: [{
    intention_instance_id: 'intent-1', status: 'active', summary: '想继续推进甜点计划。',
    driver: 'growth', template_id: 'deepen_interest', formed_at: '2026-08-11T00:00:00Z',
    earliest_at: '2026-08-11T06:00:00Z', motivation: '不能显示的内部动机',
  }],
  suggestions: [{
    suggestion_id: 'suggestion-1', status: 'adjusted', suggestion_type: 'project',
    response_text: '方向我愿意试试，不过会换成自己的节奏。', created_at: '2026-08-10T22:00:00Z',
    linked_intention_id: 'intent-1', evaluation: { score: 99 },
  }],
  decisions: [{
    decision_id: 'decision-1', decision_at: '2026-08-11T00:00:00Z',
    selected_candidate_id: 'candidate-project', engine_version: 'npc-agency-v2',
    temperature: 26.4, random_seed_hash: 'abcd1234', used_llm: false,
    candidate_scores: [{
      candidate_id: 'candidate-project', action_type: 'focus_project', location_id: 'home',
      summary: '在家把甜点笔记往前推了一步。', score: 47, probability: 0.61, selected: true,
      components: { need_satisfaction: 20, personality_fit: 12, time_cost: -4 },
    }],
    rejected_candidates: [],
  }],
  goals: [{ goal_id: 'goal-1', title: '持续整理甜点笔记', goal_type: 'creative', status: 'active', priority: 58, progress: 0.35 }],
  commitments: [{ commitment_id: 'commitment-1', title: '基础睡眠窗口', flexibility: 'hard' }],
  plans: [{ plan_id: 'plan-1', starts_at: '2026-08-11T00:00:00Z', plan_type: 'flexible', status: 'completed', reason_code: 'energy_low', public_reason: '精神不太够，所以临时放轻了安排。', original_action: { summary: '去市场' }, actual_action: { summary: '在家休息' } }],
  invitations: [{ invitation_id: 'invite-1', initiator_actor_id: 'npc_preset_2', target_actor_id: 'npc_preset_1', starts_at: '2026-08-11T10:00:00Z', ends_at: '2026-08-11T13:00:00Z', location_id: 'old_town', status: 'rejected', public_reason: '这次就先不去了。' }],
  environment: { weather: { condition: 'rain', severity: 2 }, opportunities: [{ opportunity_id: 'world-1', opportunity_type: 'public_event', title: '旧书交换角今天开放', starts_at: '2026-08-11T06:00:00Z', location_id: 'old_bookstore', action_type: 'explore' }] },
  llm_calls: [{ call_id: 'call-1', status: 'accepted', trigger_reason: 'close_consequential_candidates', model: 'test-model', decision_at: '2026-08-11T06:00:00Z', latency_ms: 27, input_tokens: 120, output_tokens: 34 }],
  reflections: [{ reflection_id: 'reflection-1', period_type: 'daily', period_end: '2026-08-11T00:00:00Z', summary: '回顾了昨天的生活节奏。', source_event_ids: ['event-1'], memory_changes: ['memory-1'], goal_changes: [] }],
  goal_transitions: [{ transition_id: 'transition-1', previous_status: 'candidate', next_status: 'active', reason_code: 'candidate_ready', public_reason: '方向已经足够清楚。', decided_at: '2026-08-11T00:00:00Z' }],
  decision_context: {
    relationships: [{ other_ai_id: 'npc_preset_2', display_name: '知夏', affinity: 55, trust: 52, tension: 8, last_interaction_at: '2026-08-10T12:00:00Z' }],
    memory_signals: [{ memory_id: 'memory-1', memory_kind: 'episodic', source_kind: 'npc_interaction', confidence: 88, learned_at: '2026-08-10T12:00:00Z' }],
  },
};

afterEach(cleanup);

beforeEach(() => {
  loadActors.mockReset();
  loadDebug.mockReset();
  loadActors.mockResolvedValue(actors);
  loadDebug.mockResolvedValue(debugData);
  loadAcceptance.mockReset();
  resetAcceptance.mockReset();
  advanceAcceptance.mockReset();
  releaseAcceptance.mockReset();
  createQualityJob.mockReset();
  loadQualityJob.mockReset();
  cancelQualityJob.mockReset();
  auditContent.mockReset();
  evaluateSafety.mockReset();
  loadAcceptance.mockResolvedValue(null);
});

describe('NpcWorldInspector', () => {
  it('按人物读取并切换状态、关系、事件和决策视图', async () => {
    render(<NpcWorldInspector onClose={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: '小满' })).toBeTruthy();
    await waitFor(() => expect(loadDebug).toHaveBeenCalledWith('npc_preset_1'));
    expect(await screen.findByText('整理最近试过的食谱。')).toBeTruthy();
    expect(screen.getByText('想继续推进甜点计划。')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '事件与互动' }));
    expect(screen.getByText('继续推进了甜点计划。')).toBeTruthy();
    expect(screen.getByText('目标驱动')).toBeTruthy();
    expect(screen.queryByText('固定日程')).toBeNull();
    expect(screen.getByText('intentional_project · 家中')).toBeTruthy();
    expect(screen.getByText('和知夏重新谈清楚了误会。')).toBeTruthy();
    expect(screen.getByText('愿意再往前走一点。')).toBeTruthy();
    expect(screen.getByText('已拒绝：这次就先不去了。')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '关系网络' }));
    expect(screen.getByText('亲近')).toBeTruthy();
    expect(screen.getAllByText('52').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '意图与建议' }));
    expect(screen.getByText('行动决策证据')).toBeTruthy();
    expect(screen.getByText('已选择 · 在家把甜点笔记往前推了一步。')).toBeTruthy();
    expect(screen.getByText('持续整理甜点笔记')).toBeTruthy();
    expect(screen.getByText('在家休息')).toBeTruthy();
    expect(screen.getByText('重要决策 LLM')).toBeTruthy();
    expect(screen.getByText(/test-model · close_consequential_candidates/)).toBeTruthy();
    expect(screen.getByText('关系与记忆信号')).toBeTruthy();
    expect(screen.getByText(/知夏 · 好感 55 · 信任 52 · 紧张 8/)).toBeTruthy();
    expect(screen.getByText(/episodic · npc_interaction · 置信 88/)).toBeTruthy();
    expect(screen.getByText('环境与世界机会')).toBeTruthy();
    expect(screen.getByText('旧书交换角今天开放')).toBeTruthy();
    expect(screen.getByText('反思与记忆巩固')).toBeTruthy();
    expect(screen.getByText('回顾了昨天的生活节奏。')).toBeTruthy();
    expect(screen.getByText('candidate → active')).toBeTruthy();
    expect(screen.getByText('方向我愿意试试，不过会换成自己的节奏。')).toBeTruthy();
    expect(screen.getByText(/已转化为意图/)).toBeTruthy();
    expect(screen.queryByText('不能显示的内部摘要')).toBeNull();
    expect(screen.queryByText('不能显示的内部动机')).toBeNull();
    expect(screen.queryByText('99')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /知夏/ }));
    await waitFor(() => expect(loadDebug).toHaveBeenLastCalledWith('npc_preset_2'));
  });

  it('支持刷新、关闭和错误重试', async () => {
    const onClose = vi.fn();
    render(<NpcWorldInspector onClose={onClose} />);
    await screen.findByRole('heading', { name: '小满' });

    fireEvent.click(screen.getByRole('button', { name: '刷新人物数据' }));
    await waitFor(() => expect(loadDebug).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: '返回 UNA 的生活' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('在开发环境建立、推进并释放可复现验收场景', async () => {
    loadAcceptance.mockResolvedValue({ active: false, seed: null, virtual_now: null, started_at: null });
    resetAcceptance.mockResolvedValue({
      active: true, seed: 'manual-review',
      virtual_now: '2026-02-01T00:00:00Z', started_at: '2026-01-31T00:00:00Z',
    });
    advanceAcceptance.mockResolvedValue({
      active: true, seed: 'manual-review',
      virtual_now: '2026-02-02T00:00:00Z', started_at: '2026-01-31T00:00:00Z',
    });
    releaseAcceptance.mockResolvedValue({ active: false, seed: null, virtual_now: null, started_at: null });
    render(<NpcWorldInspector onClose={vi.fn()} />);

    expect(await screen.findByRole('region', { name: '模拟验收控制' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '建立测试场景' }));
    expect(screen.getByText(/再次点击将只清空/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '确认清空当前生活模拟数据' }));
    await waitFor(() => expect(resetAcceptance).toHaveBeenCalledWith({ seed: 'manual-review', scenario: 'one_day' }));

    fireEvent.click(await screen.findByRole('button', { name: '+24h' }));
    await waitFor(() => expect(advanceAcceptance).toHaveBeenCalledWith(24));
    fireEvent.click(screen.getByRole('button', { name: '退出虚拟时间' }));
    await waitFor(() => expect(releaseAcceptance).toHaveBeenCalledTimes(1));
  });

  it('明确标记验收世界的年份、时区和相对日期', async () => {
    loadAcceptance.mockResolvedValue({
      active: true, seed: 'release-review-01',
      virtual_now: '2026-08-10T02:00:00Z', started_at: '2026-08-09T12:00:00Z',
    });
    render(<NpcWorldInspector onClose={vi.fn()} />);

    expect(await screen.findByText('2026/08/10 10:00（UTC+8）')).toBeTruthy();
    expect(screen.getByText(/release-review-01.*2026\/08\/09 20:00（UTC\+8）.*模拟时间/)).toBeTruthy();
    expect(screen.getByText('1 项 · 模拟时间')).toBeTruthy();
    expect(await screen.findByText('明天 · 2026/08/11 10:00')).toBeTruthy();
  });

  it('批量运行临时世界并展示质量调参指标', async () => {
    loadAcceptance.mockResolvedValue({ active: false, seed: null, virtual_now: null, started_at: null });
    const qualityResult = {
      seed_count: 3, days_per_seed: 3, warnings: ['NPC 共同互动偏少。'],
      metrics: {
        actor_event_count: 90, events_per_actor_day: 3.333,
        unique_summary_count: 30, summary_repetition_rate: 0.667,
        interaction_count: 6, interactions_per_seed_day: 0.667,
        conflict_count: 1, repair_count: 1, repair_conflict_ratio: 1,
        intention_count: 9, completed_intention_count: 6, intention_completion_rate: 0.667,
        suggestion_outcomes: { accepted: 4, adjusted: 3, declined: 2 },
        relationship_tiers: { familiar: 12, close: 6 },
        event_type_distribution: { sleep: 20, project: 12 },
      },
      runs: [{ seed: 'baseline-a', actor_events: 30, unique_summaries: 10, interactions: 2, conflicts: 1, repairs: 1, intentions: 3, completed_intentions: 2, suggestion_outcomes: { accepted: 2 } }],
    };
    createQualityJob.mockResolvedValue({
      job_id: 'quality-job-1', status: 'completed', progress_current: 3,
      progress_total: 3, result: qualityResult,
    });
    render(<NpcWorldInspector onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: '质量评估' }));
    fireEvent.click(screen.getByRole('button', { name: '开始后台评估' }));
    await waitFor(() => expect(createQualityJob).toHaveBeenCalledWith(
      ['baseline-a', 'baseline-b', 'baseline-c'], 3,
    ));
    expect(await screen.findByText('3.333')).toBeTruthy();
    expect(screen.getAllByText('67%').length).toBeGreaterThan(0);
    expect(screen.getByText('NPC 共同互动偏少。')).toBeTruthy();
    expect(screen.getByRole('table', { name: '逐种子评估结果' })).toBeTruthy();
  });

  it('审计生成内容并隐藏高风险内容片段', async () => {
    loadAcceptance.mockResolvedValue({ active: false, seed: null, virtual_now: null, started_at: null });
    auditContent.mockResolvedValue({
      summary: { scanned: 12, posts: 4, diaries: 3, chats: 5, issues: 2, high_risk: 1, errors: 0, warnings: 1 },
      metrics: {
        source_traceability_rate: 1, source_alignment_rate: 0.72,
        temporal_consistency_rate: 1, voice_consistency_rate: 0.9,
        duplicate_pair_count: 1, duplicate_content_rate: 0.083,
        privacy_leak_count: 1, life_chat_reference_count: 2, traceable_life_chat_count: 0,
      },
      issue_codes: { private_thought_leak: 1, chat_source_untraceable: 1 },
      issues: [{
        severity: 'high', code: 'private_thought_leak', channel: 'post', item_id: '7', author_id: 'npc_preset_1',
        message: '内容疑似逐字包含内部私人想法。', excerpt: '[高风险内容片段已隐藏]',
      }],
    });
    evaluateSafety.mockResolvedValue({
      corpus_version: 'content-safety-corpus-v1', case_count: 10, gate_passed: true,
      metrics: { unsafe_recall: 1, safe_pass_rate: 1, expected_code_miss_count: 0 },
    });
    render(<NpcWorldInspector onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: '内容审计' }));
    fireEvent.click(screen.getByRole('button', { name: '审计最近内容' }));
    await waitFor(() => expect(auditContent).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('来源可追溯率')).toBeTruthy();
    expect(screen.getByText('[高风险内容片段已隐藏]')).toBeTruthy();
    expect(screen.getByText(/迁移前旧消息/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '运行安全门禁' }));
    await waitFor(() => expect(evaluateSafety).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('region', { name: '内容安全门禁结果' })).toBeTruthy();
    expect(screen.getByText('content-safety-corpus-v1')).toBeTruthy();
  });
});
