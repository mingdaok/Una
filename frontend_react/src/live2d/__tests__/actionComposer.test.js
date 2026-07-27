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

describe('compileLegacyAction', () => {
  it('把 v2 意图转换成 legacy_fallback 语义轨道且不包含嘴部', () => {
    const compiled = compileLegacyAction(shyHappyEvent, 'panda_cake', {
      nowMs: 1000,
      idFactory: () => 'legacy-1',
    });
    const frame = compiled.sample(0.5);

    expect(compiled.source).toBe('legacy_fallback');
    expect(compiled.motionId).toBe('legacy-1');
    expect(frame).toHaveProperty('head_pitch');
    expect(frame).not.toHaveProperty('mouth_open');
    expect(frame).not.toHaveProperty('mouth_form');
    expect(frame).not.toHaveProperty('headAngleY');
  });

  it('把 local_micro_reaction 标记为本地微反应来源', () => {
    const compiled = compileLegacyAction({
      ...shyHappyEvent,
      type: 'local_micro_reaction',
    }, 'panda_cake', {
      nowMs: 1000,
      idFactory: () => 'micro-1',
    });

    expect(compiled.source).toBe('local_micro_reaction');
  });

  it('为相同随机种子生成相同的语义动作帧', () => {
    const first = compileLegacyAction(shyHappyEvent, 'panda_cake', {
      nowMs: 1000,
      idFactory: () => 'legacy-1',
    });
    const second = compileLegacyAction(shyHappyEvent, 'panda_cake', {
      nowMs: 1000,
      idFactory: () => 'legacy-2',
    });

    expect(first.sample(0.5)).toEqual(second.sample(0.5));
  });

  it('将兼容动作限制在归一化语义值域内', () => {
    const frame = compileLegacyAction(shyHappyEvent, 'hiyori', {
      nowMs: 1000,
      idFactory: () => 'legacy-1',
    }).sample(0.5);

    expect(Object.values(frame).every(value => value >= -1 && value <= 1)).toBe(true);
    expect(frame).not.toHaveProperty('mouth_open');
    expect(frame).not.toHaveProperty('mouth_form');
  });

  it('refuses unsupported models and intents instead of inventing parameters', () => {
    expect(compileLegacyAction(shyHappyEvent, 'unknown')).toBeNull();
    expect(compileLegacyAction({ ...shyHappyEvent, intent: 'wave_forever' }, 'panda_cake')).toBeNull();
  });

  it('uses an 800ms safe duration when the event duration is missing or invalid', () => {
    const { duration_ms: _durationMs, ...withoutDuration } = shyHappyEvent;

    expect(compileLegacyAction(withoutDuration, 'panda_cake').durationMs).toBe(800);
    expect(compileLegacyAction({ ...shyHappyEvent, duration_ms: -1 }, 'panda_cake').durationMs).toBe(800);
  });

  it('保留 compileAction 作为兼容别名', () => {
    expect(compileAction).toBe(compileLegacyAction);
  });
});
