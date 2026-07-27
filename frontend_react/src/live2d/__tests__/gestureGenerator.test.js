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

  it('rejects same-channel sequential gestures that cannot retain every neutral return in twelve frames', () => {
    const motion = createImmediateMotion(parseImmediateGesture('先点头五次，再点头五次'), options);

    expect(motion).toBeNull();
  });

  it('uses Chinese amplitude modifiers to order light, normal, and strong peaks', () => {
    const peakMagnitude = text => Math.abs(createImmediateMotion(
      parseImmediateGesture(text), options,
    ).tracks.find(item => item.channel === 'head_pitch').keyframes.reduce(
      (lowest, frame) => Math.min(lowest, frame.value),
      0,
    ));

    const normal = peakMagnitude('点头');
    const lightPeaks = ['轻轻点头', '小幅点头', '稍微点头'].map(peakMagnitude);
    const strongPeaks = ['明显点头', '用力点头', '大幅点头'].map(peakMagnitude);

    expect(lightPeaks.every(peak => peak < normal)).toBe(true);
    expect(strongPeaks.every(peak => peak > normal && peak <= 1)).toBe(true);
    expect(lightPeaks[0]).toBeLessThan(normal);
    expect(normal).toBeLessThan(strongPeaks[0]);
  });

  it('rejects parallel gestures that target the same semantic channel', () => {
    const motion = createImmediateMotion(parseImmediateGesture('点头并抬头'), options);

    expect(motion).toBeNull();
  });

  it.each([1, 2, 3, 4, 5])('keeps all %i normal nod cycles as neutral-to-peak-to-neutral frames', count => {
    const motion = createImmediateMotion(parseImmediateGesture(`点头${count}次`), options);
    const track = motion.tracks.find(item => item.channel === 'head_pitch');

    expect(track.keyframes).toHaveLength((count * 2) + 1);
    expect(track.keyframes.filter(frame => frame.value < -0.1)).toHaveLength(count);
    expect(track.keyframes.filter((frame, index) => index % 2 === 0).every(frame => frame.value === 0)).toBe(true);
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
