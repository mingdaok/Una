import { describe, expect, it } from 'vitest';
import { createLive2DStateMixer } from '../stateMixer';

function compiled(motionId, source, values, {
  durationMs = 1000,
  blendInMs = 0,
  blendOutMs = 0,
  expiresAtMs = null,
  mode = 'override',
} = {}) {
  return {
    motionId,
    source,
    durationMs,
    blendInMs,
    blendOutMs,
    expiresAtMs,
    trackModes: Object.fromEntries(Object.keys(values).map(channel => [channel, mode])),
    sample: () => values,
  };
}

const frameInputs = (overrides = {}) => ({
  nowMs: 1500,
  idle: {},
  emotion: {},
  blink: {},
  lipSync: {},
  ...overrides,
});

describe('Live2DStateMixer', () => {
  it('用户点头占用 head_pitch，但 AI 仍控制 gaze_x，且口型始终由 TTS 提供', () => {
    const mixer = createLive2DStateMixer({ clock: () => 1000 });
    mixer.enqueue(compiled('ai-1', 'ai_reply', { head_pitch: 0.6, gaze_x: 0.4 }), 1000);
    mixer.enqueue(compiled('user-1', 'user_command', { head_pitch: -0.5 }), 1000);

    const frame = mixer.sample(frameInputs({
      idle: { head_pitch: 0.1 },
      lipSync: { mouth_open: 0.8, mouth_form: -0.2 },
    }));

    expect(frame.head_pitch).toBeCloseTo(-0.5);
    expect(frame.gaze_x).toBeCloseTo(0.4);
    expect(frame.mouth_open).toBe(0.8);
    expect(frame.mouth_form).toBe(-0.2);
  });

  it('拒绝重复 motion_id，并用同来源的新动作平滑替换旧动作', () => {
    const mixer = createLive2DStateMixer({ clock: () => 1000 });
    const oldMotion = compiled('same-source-old', 'user_command', { head_pitch: 0.8 });
    const replacement = compiled('same-source-new', 'user_command', { head_pitch: -0.6 }, { blendInMs: 200 });

    expect(mixer.enqueue(oldMotion, 1000)).toBe(true);
    expect(mixer.enqueue(oldMotion, 1000)).toBe(false);
    expect(mixer.enqueue(replacement, 1100)).toBe(true);
    expect(mixer.sample(frameInputs({ nowMs: 1200 })).head_pitch).toBeCloseTo(0.1);
    expect(mixer.sample(frameInputs({ nowMs: 1300 })).head_pitch).toBeCloseTo(-0.6);
  });

  it('不同通道的动作可以并发，低优先级 AI 不会被无关用户动作清除', () => {
    const mixer = createLive2DStateMixer({ clock: () => 1000 });
    mixer.enqueue(compiled('ai-gaze', 'ai_reply', { gaze_y: -0.3 }), 1000);
    mixer.enqueue(compiled('user-roll', 'user_command', { head_roll: 0.7 }), 1000);

    expect(mixer.sample(frameInputs()).gaze_y).toBeCloseTo(-0.3);
    expect(mixer.sample(frameInputs()).head_roll).toBeCloseTo(0.7);
  });

  it('在淡出阶段回到下一有效层，并在动作结束后清理', () => {
    const mixer = createLive2DStateMixer({ clock: () => 1000 });
    mixer.enqueue(compiled('ai-base', 'ai_reply', { head_pitch: 0.5 }, { durationMs: 2000 }), 1000);
    mixer.enqueue(compiled('user-fade', 'user_command', { head_pitch: -1 }, {
      durationMs: 1000,
      blendOutMs: 500,
    }), 1000);

    expect(mixer.sample(frameInputs({ nowMs: 1750 })).head_pitch).toBeCloseTo(-0.25);
    expect(mixer.sample(frameInputs({ nowMs: 2000 })).head_pitch).toBeCloseTo(0.5);
  });

  it('按优先级叠加 additive 轨道并将语义输出限幅到 -1～1', () => {
    const mixer = createLive2DStateMixer({ clock: () => 1000 });
    mixer.enqueue(compiled('micro-add', 'local_micro_reaction', { head_yaw: 0.5 }, { mode: 'additive' }), 1000);
    mixer.enqueue(compiled('ai-add', 'ai_reply', { head_yaw: 0.5 }, { mode: 'additive' }), 1000);

    expect(mixer.sample(frameInputs({ idle: { head_yaw: 0.7 } })).head_yaw).toBe(1);
  });

  it('过期动作会被清理，reset 会同时清除动作和去重缓存', () => {
    const mixer = createLive2DStateMixer({ clock: () => 1000 });
    const expiring = compiled('expired-motion', 'ai_reply', { gaze_x: 0.6 }, { expiresAtMs: 1200 });

    expect(mixer.enqueue(expiring, 1000)).toBe(true);
    expect(mixer.sample(frameInputs({ nowMs: 1200 })).gaze_x).toBeUndefined();
    expect(mixer.enqueue(expiring, 1200)).toBe(false);
    mixer.reset();
    expect(mixer.enqueue(compiled('expired-motion', 'ai_reply', { gaze_x: 0.6 }, {
      expiresAtMs: 2200,
    }), 1200)).toBe(true);
  });

  it('眨眼只能向闭眼方向修饰 eye_open，且不能影响 TTS 口型', () => {
    const mixer = createLive2DStateMixer();

    const frame = mixer.sample(frameInputs({
      idle: { eye_open: 0.3 },
      blink: { eye_open: -0.8 },
      lipSync: { mouth_open: 0.6, mouth_form: 0.4 },
    }));
    const ignoredPositiveBlink = mixer.sample(frameInputs({
      idle: { eye_open: 0.3 },
      blink: { eye_open: 0.8 },
    }));

    expect(frame.eye_open).toBeCloseTo(-0.5);
    expect(frame.mouth_open).toBe(0.6);
    expect(frame.mouth_form).toBe(0.4);
    expect(ignoredPositiveBlink.eye_open).toBeCloseTo(0.3);
  });

  it('隔离并移除采样失败的动作，其他通道和下一帧继续正常工作', () => {
    const mixer = createLive2DStateMixer({ clock: () => 1000 });
    const broken = {
      motionId: 'broken',
      source: 'ai_reply',
      durationMs: 1000,
      blendInMs: 0,
      blendOutMs: 0,
      expiresAtMs: null,
      sample: () => { throw new Error('broken track'); },
    };
    const healthy = compiled('healthy', 'ai_reply', { gaze_x: 0.4 });

    mixer.enqueue(broken, 1000);
    mixer.enqueue(healthy, 1000);
    expect(mixer.sample(frameInputs()).gaze_x).toBeCloseTo(0.4);
    expect(mixer.sample(frameInputs({ nowMs: 1600 })).gaze_x).toBeCloseTo(0.4);
  });
});
