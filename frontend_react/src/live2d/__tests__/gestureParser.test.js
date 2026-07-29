import { describe, expect, it } from 'vitest';
import { parseImmediateGesture } from '../gestureParser';

describe('parseImmediateGesture', () => {
  it('parses a counted nod as one gesture group', () => {
    expect(parseImmediateGesture('上下点头三次')).toMatchObject({
      groups: [{ gestures: [{ kind: 'nod', count: 3 }] }],
    });
  });

  it('keeps known gestures on both sides of 并 in the same parallel group', () => {
    expect(parseImmediateGesture('慢慢摇头两次并眨眼')).toMatchObject({
      groups: [{
        gestures: [
          { kind: 'shake', count: 2, speed: 'slow' },
          { kind: 'blink', count: 1 },
        ],
      }],
    });
  });

  it('separates 先…再… into non-overlapping gesture groups', () => {
    expect(parseImmediateGesture('先点头两次，再摇头')).toMatchObject({
      groups: [
        { gestures: [{ kind: 'nod', count: 2 }] },
        { gestures: [{ kind: 'shake', count: 1 }] },
      ],
    });
  });

  it('parses Chinese and Arabic counts but clamps them to five', () => {
    expect(parseImmediateGesture('点头4次')).toMatchObject({
      groups: [{ gestures: [{ kind: 'nod', count: 4 }] }],
    });
    expect(parseImmediateGesture('点头十次')).toMatchObject({
      groups: [{ gestures: [{ kind: 'nod', count: 5 }] }],
    });
  });

  it('rejects negated requests before extracting any gesture keywords', () => {
    expect(parseImmediateGesture('不要点头')).toBeNull();
    expect(parseImmediateGesture('我不是让你摇头')).toBeNull();
  });

  it('does not invent a parallel gesture when only one side is known', () => {
    expect(parseImmediateGesture('点头和我说话')).toMatchObject({
      groups: [{ gestures: [{ kind: 'nod', count: 1 }] }],
    });
  });

  it.each([
    '举左手', '举右手', '举起双手', '左挥手', '右挥手',
    '抱熊猫', '熊猫手', '捧脸', '双手捧脸', '戳脸',
  ])('rejects negated model-specific command %s', command => {
    expect(parseImmediateGesture(`不要${command}`)).toBeNull();
  });

  it('parses model-specific commands into semantic action channels', () => {
    expect(parseImmediateGesture('举起双手')).toMatchObject({
      groups: [{ gestures: [{ kind: 'both_arms_raise' }] }],
    });
    expect(parseImmediateGesture('抱熊猫')).toMatchObject({
      groups: [{ gestures: [{ kind: 'panda_hug' }] }],
    });
    expect(parseImmediateGesture('戳脸')).toMatchObject({
      groups: [{ gestures: [{ kind: 'hands_to_face' }] }],
    });
  });
});
