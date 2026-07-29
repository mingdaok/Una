import { describe, expect, it } from 'vitest';
import { compileMotionPlan, normalizeMotionEvent } from '../motionProtocol';

const track = (channel, keyframes, mode = 'override') => ({
  channel,
  mode,
  keyframes: keyframes.map(([t, value, easing]) => ({
    t,
    value,
    ...(easing ? { easing } : {}),
  })),
});

const validEvent = (overrides = {}) => ({
  type: 'live2d_motion_v3',
  motion_id: 'm-1',
  source: 'ai_reply',
  created_at_ms: 1000,
  expires_at_ms: 9000,
  duration_ms: 1200,
  blend: { in_ms: 100, out_ms: 180 },
  tracks: [track('head_pitch', [[0, 0], [0.5, -0.5], [1, 0]])],
  ...overrides,
});

describe('normalizeMotionEvent', () => {
  it('accepts Hiyori arm tracks at 1 but rejects values above the arm range', () => {
    const valid = normalizeMotionEvent(validEvent({
      tracks: [track('left_arm_raise', [[0, 0], [1, 1]])],
    }), { nowMs: 2000, modelName: 'hiyori' });
    const invalid = normalizeMotionEvent(validEvent({
      tracks: [track('left_arm_raise', [[0, 0], [1, 1.1]])],
    }), { nowMs: 2000, modelName: 'hiyori' });

    expect(valid.tracks.map(item => item.channel)).toEqual(['left_arm_raise']);
    expect(invalid).toBeNull();
  });

  it('keeps common tracks while filtering model-specific tracks for another model', () => {
    const normalized = normalizeMotionEvent(validEvent({
      tracks: [
        track('head_pitch', [[0, 0], [1, 0.5]]),
        track('left_arm_raise', [[0, 0], [1, 1]]),
      ],
    }), { nowMs: 2000, modelName: 'panda_cake' });

    expect(normalized.tracks.map(item => item.channel)).toEqual(['head_pitch']);
  });

  it('filters disallowed tracks before applying the eight-track limit', () => {
    const normalized = normalizeMotionEvent(validEvent({
      tracks: [
        ...Array.from({ length: 8 }, (_, index) => track(
          index % 2 === 0 ? 'left_arm_raise' : 'right_hand_wave',
          [[0, 0], [1, 1]],
        )),
        track('head_pitch', [[0, 0], [1, 0.5]]),
      ],
    }), { nowMs: 2000, modelName: 'panda_cake' });

    expect(normalized.tracks.map(item => item.channel)).toEqual(['head_pitch']);
  });

  it('keeps all known semantic channels for legacy calls without a model name', () => {
    const normalized = normalizeMotionEvent(validEvent({
      tracks: [
        track('left_arm_raise', [[0, 0], [1, 1]]),
        track('panda_hug', [[0, 0], [1, 1]]),
      ],
    }), { nowMs: 2000 });

    expect(normalized.tracks.map(item => item.channel)).toEqual(['left_arm_raise', 'panda_hug']);
  });

  it('rejects negative panda activation instead of accepting a track projection will ignore', () => {
    const normalized = normalizeMotionEvent(validEvent({
      tracks: [track('panda_hug', [[0, 0], [0.5, -0.1], [1, 0]])],
    }), { nowMs: 2000, modelName: 'panda_cake' });

    expect(normalized).toBeNull();
  });

  it('rejects events whose source is outside the v3 protocol source set', () => {
    expect(normalizeMotionEvent(validEvent({ source: 'network_override' }), { nowMs: 2000 })).toBeNull();
  });

  it('rejects expired events and bad sibling tracks while retaining safe tracks', () => {
    const normalized = normalizeMotionEvent(validEvent({
      tracks: [
        track('head_pitch', [[0, 0], [0.5, -0.5], [1, 0]]),
        track('mouth_open', [[0, 0], [1, 1]]),
        track('head_yaw', [[0, Number.NaN], [1, 0]]),
      ],
    }), { nowMs: 2000 });

    expect(normalized.tracks.map(item => item.channel)).toEqual(['head_pitch']);
    expect(normalizeMotionEvent(validEvent({ expires_at_ms: 1500 }), { nowMs: 2000 })).toBeNull();
  });

  it('drops tracks with unordered keyframe times', () => {
    expect(normalizeMotionEvent(validEvent({
      tracks: [track('head_pitch', [[0, 0], [0.75, 0.5], [0.5, 0]])],
    }), { nowMs: 2000 })).toBeNull();
  });

  it('keeps at most eight safe tracks', () => {
    const channels = [
      'head_yaw', 'head_pitch', 'head_roll', 'body_yaw', 'body_pitch', 'body_roll', 'gaze_x', 'gaze_y',
    ];
    const normalized = normalizeMotionEvent(validEvent({
      tracks: [...channels.map(channel => track(channel, [[0, 0], [1, 0]])), track('eye_open', [[0, 0], [1, 0]])],
    }), { nowMs: 2000 });

    expect(normalized.tracks).toHaveLength(8);
    expect(normalized.tracks.map(item => item.channel)).toEqual(channels);
  });

  it('drops a track with more than twelve keyframes', () => {
    const frames = Array.from({ length: 13 }, (_, index) => [index / 12, 0]);

    expect(normalizeMotionEvent(validEvent({ tracks: [track('head_pitch', frames)] }), { nowMs: 2000 })).toBeNull();
  });

  it.each(['spring', 'toString', 'constructor'])('drops tracks with unknown easing %s', easing => {
    expect(normalizeMotionEvent(validEvent({
      tracks: [track('head_pitch', [[0, 0], [1, 0, easing]])],
    }), { nowMs: 2000 })).toBeNull();
  });
});

describe('compileMotionPlan', () => {
  it('interpolates keyframes with destination easing and bounded output', () => {
    const compiled = compileMotionPlan(normalizeMotionEvent(validEvent({
      tracks: [track('head_pitch', [[0, 0], [0.5, -0.8], [1, 0]])],
    }), { nowMs: 2000 }));

    expect(compiled.sample(0).head_pitch).toBe(0);
    expect(compiled.sample(0.5).head_pitch).toBeCloseTo(-0.8);
    expect(compiled.sample(1).head_pitch).toBe(0);
  });

  it('冻结按通道保存的轨道模式，供混合器区分 additive 与 override', () => {
    const compiled = compileMotionPlan(normalizeMotionEvent(validEvent({
      tracks: [
        track('head_pitch', [[0, 0], [1, 0.3]], 'additive'),
        track('gaze_x', [[0, 0], [1, 0.2]], 'override'),
      ],
    }), { nowMs: 2000 }));

    expect(compiled.trackModes).toEqual({ head_pitch: 'additive', gaze_x: 'override' });
    expect(Object.isFrozen(compiled.trackModes)).toBe(true);
    expect(Object.isFrozen(compiled)).toBe(true);
  });
});
