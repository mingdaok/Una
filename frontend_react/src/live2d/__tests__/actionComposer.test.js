import { describe, expect, it } from 'vitest';
import { compileAction, compileLegacyAction } from '../actionComposer';

const shyHappyEvent = {
  type: 'live2d_action_v2',
  action_id: 'action-1',
  intent: 'shy_happy',
  intensity: 0.8,
  expression: 'subtle',
  timing: 'after_sentence',
  duration_ms: 1200,
  variation_seed: 7,
};

const compile = (event = shyHappyEvent, model = 'panda_cake', options = {}) => compileLegacyAction(
  event,
  model,
  { nowMs: 1000, ...options },
);

const physicalNames = new Set([
  'headAngleX', 'headAngleY', 'bodyAngleZ', 'eyeOpen', 'smile', 'browAngle',
]);

const semanticProfiles = [
  ['warm_listening', ['head_pitch', 'body_roll', 'eye_open', 'eye_smile']],
  ['thinking', ['head_yaw', 'head_pitch', 'body_roll', 'brow_y']],
  ['happy_surprise', ['head_pitch', 'body_roll', 'eye_open', 'cheek', 'eye_smile']],
  ['gentle_comfort', ['head_pitch', 'body_roll', 'eye_open', 'eye_smile', 'brow_y']],
  ['sad_support', ['head_pitch', 'body_roll', 'eye_open', 'eye_smile', 'brow_y']],
  ['encouraging', ['head_pitch', 'body_roll', 'eye_open', 'eye_smile', 'brow_y']],
  ['curious_question', ['head_yaw', 'head_pitch', 'body_roll', 'eye_open', 'brow_y']],
];

describe('compileLegacyAction', () => {
  it('把 v2 意图转换成 legacy_fallback 语义轨道且不包含嘴部', () => {
    const compiled = compile();
    const frame = compiled.sample(0.5);

    expect(compiled.source).toBe('legacy_fallback');
    expect(compiled.motionId).toBe('legacy-action-1');
    expect(frame).toHaveProperty('head_pitch');
    expect(frame).not.toHaveProperty('mouth_open');
    expect(frame).not.toHaveProperty('mouth_form');
    expect(frame).not.toHaveProperty('headAngleY');
  });

  it('把 local_micro_reaction 标记为本地微反应来源', () => {
    const compiled = compile({
      ...shyHappyEvent,
      type: 'local_micro_reaction',
    });

    expect(compiled.source).toBe('local_micro_reaction');
  });

  it.each(['panda_cake', 'hiyori'])('将全部单变体旧配置映射为预期语义通道：%s', model => {
    for (const [intent, channels] of semanticProfiles) {
      const frame = compile({ ...shyHappyEvent, intent, variation_seed: 0 }, model).sample(0.5);

      expect(Object.keys(frame).sort()).toEqual([...channels].sort());
      expect(Object.keys(frame).some(channel => physicalNames.has(channel))).toBe(false);
    }
  });

  it.each(['panda_cake', 'hiyori'])('将 shy_happy 的两个旧变体完整映射为语义通道：%s', model => {
    const channels = new Set();
    for (let seed = 0; seed < 16; seed += 1) {
      Object.keys(compile({ ...shyHappyEvent, variation_seed: seed }, model).sample(0.5))
        .forEach(channel => channels.add(channel));
    }

    expect([...channels].sort()).toEqual([
      'brow_y', 'body_roll', 'cheek', 'eye_open', 'eye_smile', 'head_pitch', 'head_yaw',
    ].sort());
  });

  it('保留两个模型的 shy_happy 兼容差异，而不改变语义通道', () => {
    const panda = compile(shyHappyEvent, 'panda_cake').sample(0.5);
    const hiyori = compile(shyHappyEvent, 'hiyori').sample(0.5);

    expect(Object.keys(panda).sort()).toEqual(Object.keys(hiyori).sort());
    expect(panda).not.toEqual(hiyori);
  });

  it('为相同随机种子生成相同的语义动作帧', () => {
    const first = compile(shyHappyEvent);
    const second = compile(shyHappyEvent);

    expect(first.sample(0.5)).toEqual(second.sample(0.5));
  });

  it('把动作强度限制为有限归一化数值，并拒绝非数值类型', () => {
    const low = compile({ ...shyHappyEvent, intensity: 0.2 }).sample(0.5);
    const high = compile({ ...shyHappyEvent, intensity: 99 }).sample(0.5);

    expect(Math.abs(low.head_pitch)).toBeLessThan(Math.abs(high.head_pitch));
    for (const intensity of [Number.NaN, Number.POSITIVE_INFINITY, '0.5', null, {}]) {
      const frame = compile({ ...shyHappyEvent, intensity }).sample(0.5);
      expect(Object.values(frame).every(value => value === 0)).toBe(true);
    }
  });

  it('将兼容动作限制在归一化语义值域内且绝不输出嘴部或物理字段', () => {
    for (const model of ['panda_cake', 'hiyori']) {
      for (const intensity of [0, 0.2, 1, 99, Number.NaN, Number.POSITIVE_INFINITY, 'bad']) {
        const frame = compile({ ...shyHappyEvent, intensity }, model).sample(0.5);
        expect(Object.values(frame).every(value => Number.isFinite(value) && value >= -1 && value <= 1)).toBe(true);
        expect(Object.keys(frame).some(channel => physicalNames.has(channel))).toBe(false);
        expect(frame).not.toHaveProperty('mouth_open');
        expect(frame).not.toHaveProperty('mouth_form');
      }
    }
  });

  it('对合法 action_id 生成稳定且彼此不碰撞的 motionId', () => {
    const replay = compile({ ...shyHappyEvent, action_id: 'server-action-a' });
    const replayAgain = compile({ ...shyHappyEvent, action_id: 'server-action-a' });
    const distinct = compile({ ...shyHappyEvent, action_id: 'server-action-b' });

    expect(replay.motionId).toBe('legacy-server-action-a');
    expect(replayAgain.motionId).toBe(replay.motionId);
    expect(distinct.motionId).not.toBe(replay.motionId);
    expect(compile({ ...shyHappyEvent, action_id: 'server-action-a' }, 'panda_cake', {
      idFactory: () => 'factory-must-not-replace-action-id',
    }).motionId).toBe(replay.motionId);
  });

  it('只在 action_id 无效时使用 idFactory，并能安全处理恶意工厂', () => {
    const invalidActionId = { ...shyHappyEvent, action_id: '' };
    expect(compile(invalidActionId, 'panda_cake', { idFactory: () => 'factory-id' }).motionId)
      .toBe('factory-id');
    expect(compile({ ...shyHappyEvent, action_id: '   ' }, 'panda_cake', {
      idFactory: () => 'factory-for-blank-id',
    }).motionId).toBe('factory-for-blank-id');

    const fromThrowingFactory = compile(invalidActionId, 'panda_cake', {
      idFactory: () => { throw new Error('factory failure'); },
    });
    const fromInvalidFactory = compile({ ...shyHappyEvent, action_id: 42 }, 'panda_cake', {
      idFactory: () => '',
    });

    expect(fromThrowingFactory.motionId).toMatch(/^legacy-1000-7-\d+$/);
    expect(fromInvalidFactory.motionId).toMatch(/^legacy-1000-7-\d+$/);
    expect(fromThrowingFactory.motionId).not.toBe(fromInvalidFactory.motionId);
  });

  it('将 duration 限制在兼容区间，并把非有限或非法类型回退到 800ms', () => {
    expect(compile({ ...shyHappyEvent, duration_ms: 1 }).durationMs).toBe(400);
    expect(compile({ ...shyHappyEvent, duration_ms: 99999 }).durationMs).toBe(2500);

    for (const durationMs of [Number.NaN, Number.NEGATIVE_INFINITY, '1200', null, {}]) {
      expect(compile({ ...shyHappyEvent, duration_ms: durationMs }).durationMs).toBe(800);
    }
  });

  it('拒绝不支持的模型和意图，而不是编造参数', () => {
    expect(compile(shyHappyEvent, 'unknown')).toBeNull();
    expect(compile({ ...shyHappyEvent, intent: 'wave_forever' })).toBeNull();
  });

  it('保留 compileAction 作为兼容别名', () => {
    expect(compileAction).toBe(compileLegacyAction);
  });
});
