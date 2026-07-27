import { describe, expect, it } from 'vitest';
import { createImmediateMotion, createListeningMotion } from '../gestureGenerator';
import { parseImmediateGesture } from '../gestureParser';

const options = { nowMs: 1000, idFactory: () => 'local-1', seed: 9 };

function activeRange(track) {
  const active = track.keyframes.filter(frame => Math.abs(frame.value) > 0.0001);
  return [active[0].t, active.at(-1).t];
}

describe('createImmediateMotion', () => {
  it('creates exactly three negative nod peaks and returns the track to neutral', () => {
    const motion = createImmediateMotion(parseImmediateGesture('轻轻点头三次'), options);
    const track = motion.tracks.find(item => item.channel === 'head_pitch');

    expect(track.keyframes.filter(frame => frame.value < -0.1)).toHaveLength(3);
    expect(track.keyframes.at(-1)).toMatchObject({ t: 1, value: 0 });
    expect(motion.source).toBe('user_command');
    expect(motion.motion_id).toBe('local-1');
  });

  it('makes slow gestures last longer than the same normal gesture', () => {
    const normal = createImmediateMotion(parseImmediateGesture('摇头两次'), options);
    const slow = createImmediateMotion(parseImmediateGesture('慢慢摇头两次'), options);

    expect(slow.duration_ms).toBeGreaterThan(normal.duration_ms);
  });

  it('keeps parallel gestures in a shared active time range', () => {
    const motion = createImmediateMotion(parseImmediateGesture('摇头并眨眼'), options);
    const shake = motion.tracks.find(item => item.channel === 'head_yaw');
    const blink = motion.tracks.find(item => item.channel === 'eye_open');

    expect(activeRange(shake)).toEqual(activeRange(blink));
  });

  it('keeps sequential gesture groups from overlapping', () => {
    const motion = createImmediateMotion(parseImmediateGesture('先点头，再摇头'), options);
    const nod = motion.tracks.find(item => item.channel === 'head_pitch');
    const shake = motion.tracks.find(item => item.channel === 'head_yaw');

    expect(activeRange(nod)[1]).toBeLessThan(activeRange(shake)[0]);
  });

  it('preserves repeated same-channel peaks when sequential groups would exceed twelve frames', () => {
    const motion = createImmediateMotion(parseImmediateGesture('先点头五次，再点头五次'), options);
    const track = motion.tracks.find(item => item.channel === 'head_pitch');

    expect(track.keyframes.filter(frame => frame.value < -0.1)).toHaveLength(10);
    expect(track.keyframes.length).toBeLessThanOrEqual(12);
    expect(track.keyframes.at(-1)).toMatchObject({ t: 1, value: 0 });
  });

  it('is deterministic for a seed without changing bounded direction or counts', () => {
    const command = parseImmediateGesture('点头三次');
    const first = createImmediateMotion(command, options);
    const second = createImmediateMotion(command, options);
    const track = first.tracks.find(item => item.channel === 'head_pitch');

    expect(second).toEqual(first);
    expect(track.keyframes.filter(frame => frame.value < -0.1)).toHaveLength(3);
    expect(first.tracks.flatMap(item => item.keyframes).every(frame => frame.value >= -1 && frame.value <= 1)).toBe(true);
    expect(first.tracks.every(item => item.keyframes.length <= 12 && item.keyframes.at(-1).value === 0)).toBe(true);
  });

  it('parses and generates a common command within a bounded synchronous budget', () => {
    const startedAt = performance.now();
    for (let index = 0; index < 1000; index += 1) {
      createImmediateMotion(parseImmediateGesture('轻轻点头三次'), {
        nowMs: 1000 + index,
        idFactory: () => `local-${index}`,
        seed: index,
      });
    }
    expect(performance.now() - startedAt).toBeLessThan(500);
  });
});

describe('createListeningMotion', () => {
  it('creates a bounded local listening micro-reaction', () => {
    const motion = createListeningMotion(options);

    expect(motion).toMatchObject({
      type: 'live2d_motion_v3',
      motion_id: 'local-1',
      source: 'local_micro_reaction',
      created_at_ms: 1000,
    });
    expect(motion.tracks.flatMap(item => item.keyframes).every(frame => frame.value >= -1 && frame.value <= 1)).toBe(true);
    expect(motion.tracks.every(item => item.keyframes.at(-1).value === 0)).toBe(true);
  });
});
