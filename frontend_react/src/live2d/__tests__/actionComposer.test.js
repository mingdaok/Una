import { describe, expect, it } from 'vitest';
import { compileAction } from '../actionComposer';

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

describe('compileAction', () => {
  it('creates the same free-motion frame for the same action seed', () => {
    const first = compileAction(shyHappyEvent, 'panda_cake');
    const second = compileAction(shyHappyEvent, 'panda_cake');

    expect(first.sample(0.5)).toEqual(second.sample(0.5));
  });

  it('keeps free-motion output bounded and leaves all mouth controls alone', () => {
    const frame = compileAction(shyHappyEvent, 'hiyori').sample(0.5);

    expect(Math.abs(frame.bodyAngleZ)).toBeLessThanOrEqual(5);
    expect(Math.abs(frame.headAngleY)).toBeLessThanOrEqual(8);
    expect(frame).not.toHaveProperty('mouthOpenY');
    expect(frame).not.toHaveProperty('mouthForm');
    expect(frame).not.toHaveProperty('JAW');
  });

  it('refuses unsupported models and intents instead of inventing parameters', () => {
    expect(compileAction(shyHappyEvent, 'unknown')).toBeNull();
    expect(compileAction({ ...shyHappyEvent, intent: 'wave_forever' }, 'panda_cake')).toBeNull();
  });

  it('uses an 800ms safe duration when the event duration is missing or invalid', () => {
    const { duration_ms: _durationMs, ...withoutDuration } = shyHappyEvent;

    expect(compileAction(withoutDuration, 'panda_cake').durationMs).toBe(800);
    expect(compileAction({ ...shyHappyEvent, duration_ms: -1 }, 'panda_cake').durationMs).toBe(800);
  });
});
