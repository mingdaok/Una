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
});
