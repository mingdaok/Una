import { describe, expect, it } from 'vitest';
import { ModelActionScheduler } from '../modelActionScheduler';

function sourceGate(active = []) {
  return {
    hasActiveSource: source => active.includes(source),
  };
}

function trackChannels(event) {
  return event.tracks.map(track => track.channel);
}

describe('ModelActionScheduler', () => {
  it('replays the same seed, clock and model inputs as the same safe event sequence', () => {
    const collect = () => {
      const scheduler = new ModelActionScheduler({ sessionSeed: 'repeatable-session', now: () => 0 });
      scheduler.reset({ modelName: 'hiyori', generation: 3 });
      return [0, 6000, 12000, 18000, 24000, 30000, 36000, 42000].map(nowMs => scheduler.schedule({
        modelName: 'hiyori', emotion: 'happy', nowMs, mixer: sourceGate(),
      })).filter(Boolean).map(event => ({
        motion_id: event.motion_id,
        source: event.source,
        channels: trackChannels(event),
      }));
    };

    expect(collect()).toEqual(collect());
  });

  it('stays idle after reset until the seeded first common cooldown expires', () => {
    const scheduler = new ModelActionScheduler({
      sessionSeed: 'first-deadline',
      now: () => 10000,
    });
    scheduler.reset({ modelName: 'hiyori', generation: 1 });

    expect(scheduler.schedule({
      modelName: 'hiyori', emotion: 'neutral', nowMs: 10000, mixer: sourceGate(),
    })).toBeNull();
    expect(scheduler.schedule({
      modelName: 'hiyori', emotion: 'neutral', nowMs: 12999, mixer: sourceGate(),
    })).toBeNull();

    const first = [13000, 14000, 15000, 16000]
      .map(nowMs => scheduler.schedule({
        modelName: 'hiyori', emotion: 'neutral', nowMs, mixer: sourceGate(),
      }))
      .find(Boolean);
    expect(first).not.toBeNull();
    expect(first.created_at_ms).toBeGreaterThanOrEqual(13000);
    expect(first.created_at_ms).toBeLessThanOrEqual(16000);
  });

  it('keeps ordinary idle events 3–6 seconds apart and prevents the last three families from repeating', () => {
    const scheduler = new ModelActionScheduler({ sessionSeed: 'ordinary-cooldown', now: () => 0 });
    scheduler.reset({ modelName: 'hiyori', generation: 1 });
    const events = [];
    for (let nowMs = 0; nowMs <= 48000; nowMs += 1000) {
      const event = scheduler.schedule({ modelName: 'hiyori', emotion: 'neutral', nowMs, mixer: sourceGate() });
      if (event) events.push(event);
    }

    expect(events.length).toBeGreaterThan(3);
    for (let index = 1; index < events.length; index += 1) {
      expect(events[index].created_at_ms - events[index - 1].created_at_ms).toBeGreaterThanOrEqual(3000);
      expect(events[index].created_at_ms - events[index - 1].created_at_ms).toBeLessThanOrEqual(6000);
      expect(events.slice(Math.max(0, index - 3), index).map(event => event.motion_id.split('-').at(-1)))
        .not.toContain(events[index].motion_id.split('-').at(-1));
    }
  });

  it('applies a deterministic low-probability gate when a model-specific candidate is due', () => {
    const scheduler = new ModelActionScheduler({ sessionSeed: 'special-cooldown', now: () => 0 });
    scheduler.reset({ modelName: 'panda_cake', generation: 5 });
    scheduler.random = () => 0.2;

    const declined = scheduler.schedule({
      modelName: 'panda_cake', emotion: 'comfort', nowMs: 25000, mixer: sourceGate(),
    });
    expect(declined && trackChannels(declined).some(channel => (
      channel === 'panda_hug' || channel === 'hands_to_face'
    ))).toBeFalsy();

    const acceptedScheduler = new ModelActionScheduler({
      sessionSeed: 'special-cooldown',
      now: () => 0,
    });
    acceptedScheduler.reset({ modelName: 'panda_cake', generation: 5 });
    acceptedScheduler.random = () => 0.19;
    const accepted = acceptedScheduler.schedule({
      modelName: 'panda_cake', emotion: 'comfort', nowMs: 25000, mixer: sourceGate(),
    });
    expect(trackChannels(accepted)).toEqual(expect.arrayContaining([
      expect.stringMatching(/^(panda_hug|hands_to_face)$/),
    ]));
  });

  it('stays idle for unknown models and active user or AI actions', () => {
    const scheduler = new ModelActionScheduler({ sessionSeed: 'priority-gate', now: () => 0 });

    expect(scheduler.schedule({ modelName: 'unknown', emotion: 'happy', nowMs: 0, mixer: sourceGate() })).toBeNull();
    scheduler.reset({ modelName: 'hiyori', generation: 1 });
    expect(scheduler.schedule({ modelName: 'hiyori', emotion: 'happy', nowMs: 0, mixer: sourceGate(['user_command']) })).toBeNull();
    expect(scheduler.schedule({ modelName: 'hiyori', emotion: 'happy', nowMs: 0, mixer: sourceGate(['ai_reply']) })).toBeNull();
  });

  it('does not treat happy or joy as panda-specific action contexts', () => {
    for (const emotion of ['happy', 'joy']) {
      const scheduler = new ModelActionScheduler({ sessionSeed: `panda-${emotion}`, now: () => 0 });
      scheduler.reset({ modelName: 'panda_cake', generation: 1 });
      const event = scheduler.schedule({
        modelName: 'panda_cake', emotion, nowMs: 6000, mixer: sourceGate(),
      });

      expect(trackChannels(event).some(channel => channel === 'panda_hug' || channel === 'hands_to_face')).toBe(false);
    }
  });

  it('reset clears cooldown and history when a ready model or generation changes', () => {
    const now = [0];
    const scheduler = new ModelActionScheduler({
      sessionSeed: 'reset-isolation',
      now: () => now[0],
    });
    scheduler.reset({ modelName: 'hiyori', generation: 1 });
    expect(scheduler.schedule({ modelName: 'hiyori', emotion: 'happy', nowMs: 0, mixer: sourceGate() })).toBeNull();

    now[0] = 1000;
    scheduler.reset({ modelName: 'panda_cake', generation: 2 });
    const afterReset = scheduler.schedule({
      modelName: 'panda_cake', emotion: 'comfort', nowMs: 1000, mixer: sourceGate(),
    });

    expect(afterReset).toBeNull();
  });

  it('never crosses model action families or emits mouth channels', () => {
    const hiyori = new ModelActionScheduler({ sessionSeed: 'hiyori-safe', now: () => 0 });
    const panda = new ModelActionScheduler({ sessionSeed: 'panda-safe', now: () => 0 });
    hiyori.reset({ modelName: 'hiyori', generation: 1 });
    panda.reset({ modelName: 'panda_cake', generation: 1 });
    const hiyoriEvents = [0, 6000, 12000, 18000, 24000, 30000].map(nowMs => hiyori.schedule({
      modelName: 'hiyori', emotion: 'happy', nowMs, mixer: sourceGate(),
    })).filter(Boolean);
    const pandaEvents = [0, 6000, 12000, 18000, 24000, 30000].map(nowMs => panda.schedule({
      modelName: 'panda_cake', emotion: 'comfort', nowMs, mixer: sourceGate(),
    })).filter(Boolean);

    expect(hiyoriEvents.flatMap(trackChannels)).not.toEqual(expect.arrayContaining(['panda_hug', 'hands_to_face']));
    expect(pandaEvents.flatMap(trackChannels)).not.toEqual(expect.arrayContaining([
      'left_arm_raise', 'right_arm_raise', 'left_hand_wave', 'right_hand_wave',
    ]));
    expect([...hiyoriEvents, ...pandaEvents].flatMap(trackChannels)).not.toEqual(expect.arrayContaining([
      'mouth_open', 'mouth_form', 'mouth_open_y', 'mouth_form_y',
    ]));
    expect([...hiyoriEvents, ...pandaEvents].every(event => (
      event.type === 'live2d_motion_v3' && event.source === 'local_random'
    ))).toBe(true);
  });
});
