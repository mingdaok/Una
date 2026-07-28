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

  it('同来源同通道未提供 blend 参数时也在 140 毫秒内交叉淡化', () => {
    const mixer = createLive2DStateMixer({ clock: () => 1000 });
    mixer.enqueue(compiled('default-old', 'ai_reply', { head_pitch: 0.8 }), 1000);
    mixer.enqueue(compiled('default-new', 'ai_reply', { head_pitch: -0.6 }), 1100);

    expect(mixer.sample(frameInputs({ nowMs: 1100 })).head_pitch).toBeCloseTo(0.8);
    expect(mixer.sample(frameInputs({ nowMs: 1170 })).head_pitch).toBeCloseTo(0.1);
    expect(mixer.sample(frameInputs({ nowMs: 1240 })).head_pitch).toBeCloseTo(-0.6);
  });

  it('同来源同通道被新 override 替换后，旧轨道不会在新动作结束时重新出现，但其他通道继续', () => {
    const mixer = createLive2DStateMixer({ clock: () => 1000 });
    mixer.enqueue(compiled('old-two-channels', 'ai_reply', {
      head_pitch: 0.8,
      gaze_x: 0.4,
    }, { durationMs: 2000 }), 1000);
    mixer.enqueue(compiled('short-replacement', 'ai_reply', {
      head_pitch: -0.6,
    }, { durationMs: 300 }), 1100);

    expect(mixer.sample(frameInputs({ nowMs: 1170 })).head_pitch).toBeCloseTo(0.1);
    expect(mixer.sample(frameInputs({ nowMs: 1500 })).head_pitch).toBeUndefined();
    expect(mixer.sample(frameInputs({ nowMs: 1500 })).gaze_x).toBeCloseTo(0.4);
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

  it('去重缓存按动作生命周期 TTL 清扫：有效期内拒绝，过期后允许同 ID 新动作', () => {
    const mixer = createLive2DStateMixer({ clock: () => 1000 });
    const first = compiled('ttl-motion', 'ai_reply', { gaze_x: 0.6 }, { durationMs: 100 });

    expect(mixer.enqueue(first, 1000)).toBe(true);
    expect(mixer.enqueue(compiled('ttl-motion', 'ai_reply', { gaze_x: -0.2 }), 1050)).toBe(false);
    expect(mixer.sample(frameInputs({ nowMs: 1100 })).gaze_x).toBeUndefined();
    expect(mixer.enqueue(compiled('ttl-motion', 'ai_reply', { gaze_x: -0.2 }, {
      durationMs: 300,
    }), 1100)).toBe(true);
  });

  it('去重缓存达到容量上限后仍拒绝活跃动作重放，生命周期结束后才释放同 ID', () => {
    const mixer = createLive2DStateMixer({ clock: () => 1000 });
    for (let index = 0; index <= 256; index += 1) {
      expect(mixer.enqueue(compiled(`capacity-${index}`, 'ai_reply', {}, {
        durationMs: 10000,
      }), 1000)).toBe(true);
    }

    expect(mixer.enqueue(compiled('capacity-0', 'ai_reply', {}, {
      durationMs: 10000,
    }), 1000)).toBe(false);
    mixer.sample(frameInputs({ nowMs: 11000 }));
    expect(mixer.enqueue(compiled('capacity-0', 'ai_reply', {}, {
      durationMs: 10000,
    }), 11000)).toBe(true);
  });

  it('同来源同通道 additive 无显式 blend 时立即叠加，不套用默认接替淡入', () => {
    const mixer = createLive2DStateMixer({ clock: () => 1000 });
    mixer.enqueue(compiled('additive-old', 'ai_reply', { head_yaw: 0.2 }, {
      mode: 'additive',
    }), 1000);
    mixer.enqueue(compiled('additive-new', 'ai_reply', { head_yaw: 0.3 }, {
      mode: 'additive',
    }), 1100);

    expect(mixer.sample(frameInputs({ nowMs: 1100, idle: { head_yaw: 0.1 } })).head_yaw).toBeCloseTo(0.6);
  });

  it('同来源同通道的 additive 旧层不会让新 override 发生默认接替淡入', () => {
    const mixer = createLive2DStateMixer({ clock: () => 1000 });
    mixer.enqueue(compiled('mixed-additive', 'ai_reply', { head_yaw: 0.2 }, {
      mode: 'additive',
    }), 1000);
    mixer.enqueue(compiled('mixed-override', 'ai_reply', { head_yaw: -0.5 }), 1100);

    expect(mixer.sample(frameInputs({ nowMs: 1100 })).head_yaw).toBeCloseTo(-0.5);
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

  it('隔离采样帧属性读取异常，健康动作和下一帧不会中断', () => {
    const mixer = createLive2DStateMixer({ clock: () => 1000 });
    const brokenFrame = new Proxy({}, {
      get() {
        throw new Error('broken sampled frame getter');
      },
    });
    const broken = compiled('broken-getter', 'ai_reply', {});
    broken.sample = () => brokenFrame;
    const healthy = compiled('healthy-after-getter', 'ai_reply', { gaze_y: -0.4 });

    mixer.enqueue(broken, 1000);
    mixer.enqueue(healthy, 1000);
    expect(mixer.sample(frameInputs()).gaze_y).toBeCloseTo(-0.4);
    expect(mixer.sample(frameInputs({ nowMs: 1600 })).gaze_y).toBeCloseTo(-0.4);
  });

  it('旧 CompiledMotion 缺少 trackModes 时仍默认按 override 混合', () => {
    const mixer = createLive2DStateMixer({ clock: () => 1000 });
    const legacyMotion = compiled('legacy-override', 'ai_reply', { head_yaw: 0.4 });
    delete legacyMotion.trackModes;

    expect(mixer.enqueue(legacyMotion, 1000)).toBe(true);
    expect(mixer.sample(frameInputs({ idle: { head_yaw: -0.2 } })).head_yaw).toBeCloseTo(0.4);
  });
});
