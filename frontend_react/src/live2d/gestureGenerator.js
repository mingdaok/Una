const GESTURE_CHANNELS = Object.freeze({
  nod: ['head_pitch', -1],
  shake: ['head_yaw', 1],
  look_up: ['head_pitch', 1],
  look_down: ['head_pitch', -1],
  look_left: ['head_yaw', -1],
  look_right: ['head_yaw', 1],
  tilt_left: ['head_roll', -1],
  tilt_right: ['head_roll', 1],
  lean_forward: ['body_pitch', 1],
  lean_back: ['body_pitch', -1],
  lean_left: ['body_roll', -1],
  lean_right: ['body_roll', 1],
  blink: ['eye_open', -1],
  close_eyes: ['eye_open', -1],
});

const SPEED_MS = Object.freeze({ normal: 260, slow: 420, fast: 180 });
const MAX_TRACKS = 8;

function boundedNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clampedCount(value) {
  return Math.max(1, Math.min(5, Math.trunc(boundedNumber(value, 1))));
}

function seededUnit(seed, salt = 0) {
  let value = (Math.trunc(boundedNumber(seed, 0)) ^ Math.imul(salt + 1, 0x9E3779B1)) >>> 0;
  value = (value + 0x6D2B79F5) >>> 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function motionId(nowMs, seed, idFactory) {
  try {
    const id = typeof idFactory === 'function' ? idFactory() : null;
    if (typeof id === 'string' && id) return id;
  } catch {
    // A local motion must remain usable when an optional ID factory fails.
  }
  return `local-${nowMs}-${Math.trunc(boundedNumber(seed, 0))}`;
}

function durationForGesture(gesture) {
  const unitMs = SPEED_MS[gesture.speed] ?? SPEED_MS.normal;
  return clampedCount(gesture.count) * unitMs;
}

function groupDuration(groups) {
  return groups.map(group => Math.max(...group.gestures.map(durationForGesture), 400));
}

function addFrameToTimeline(byTime, t, value) {
  const safeT = Math.max(0, Math.min(1, t));
  const safeValue = Math.max(-1, Math.min(1, value));
  byTime.set(safeT.toFixed(8), { t: safeT, value: safeValue, easing: 'ease_in_out' });
}

function addFrame(trackFrames, channel, t, value) {
  const byTime = trackFrames.get(channel) ?? new Map();
  addFrameToTimeline(byTime, t, value);
  trackFrames.set(channel, byTime);
}

function addGestureCurve(trackFrames, gesture, start, end, seed, groupIndex, gestureIndex) {
  const mapping = GESTURE_CHANNELS[gesture.kind];
  if (!mapping) return;

  const [channel, direction] = mapping;
  const count = clampedCount(gesture.count);
  const amplitudeJitter = (seededUnit(seed, (groupIndex * 17) + gestureIndex) - 0.5) * 0.16;
  const phaseJitter = (seededUnit(seed, groupIndex) - 0.5) * 0.12;
  const baseAmplitude = boundedNumber(gesture.amplitude, gesture.kind === 'close_eyes' ? 0.82 : 0.55);
  const amplitude = Math.max(0.05, Math.min(1, baseAmplitude * (1 + amplitudeJitter)));
  const span = end - start;

  addFrame(trackFrames, channel, start, 0);
  for (let index = 0; index < count; index += 1) {
    const cycleStart = start + ((span * index) / count);
    const cycleEnd = start + ((span * (index + 1)) / count);
    const peakT = cycleStart + ((cycleEnd - cycleStart) * (0.4 + phaseJitter));
    addFrame(trackFrames, channel, peakT, direction * amplitude);
    addFrame(trackFrames, channel, index === count - 1
      ? end
      : cycleStart + ((cycleEnd - cycleStart) * (0.84 + phaseJitter)), 0);
  }
}

function normalizeTracks(trackFrames) {
  return [...trackFrames.entries()].slice(0, MAX_TRACKS).flatMap(([channel, framesByTime]) => {
    addFrameToTimeline(framesByTime, 0, 0);
    addFrameToTimeline(framesByTime, 1, 0);
    const keyframes = [...framesByTime.values()].sort((left, right) => left.t - right.t);
    if (keyframes.length <= 12) return [{ channel, mode: 'override', keyframes }];

    const nonNeutralFrames = keyframes.filter(frame => Math.abs(frame.value) > 0.0001);
    if (nonNeutralFrames.length > 10) return [];
    return [{
      channel,
      mode: 'override',
      keyframes: [
        { t: 0, value: 0, easing: 'ease_in_out' },
        ...nonNeutralFrames,
        { t: 1, value: 0, easing: 'ease_in_out' },
      ],
    }];
  });
}

function createPlan(groups, source, { nowMs = Date.now(), idFactory, seed = 0 } = {}) {
  if (!Array.isArray(groups) || !groups.length || groups.some(group => !Array.isArray(group?.gestures) || !group.gestures.length)) {
    return null;
  }

  const createdAtMs = boundedNumber(nowMs, Date.now());
  const durations = groupDuration(groups);
  const totalDuration = durations.reduce((total, duration) => total + duration, 0);
  const durationMs = Math.max(400, Math.min(4000, Math.round(totalDuration)));
  const trackFrames = new Map();
  let elapsed = 0;

  groups.forEach((group, groupIndex) => {
    const start = elapsed / totalDuration;
    elapsed += durations[groupIndex];
    const end = elapsed / totalDuration;
    group.gestures.forEach((gesture, gestureIndex) => {
      addGestureCurve(trackFrames, gesture, start, end, seed, groupIndex, gestureIndex);
    });
  });

  const tracks = normalizeTracks(trackFrames);
  if (!tracks.length) return null;
  return {
    type: 'live2d_motion_v3',
    motion_id: motionId(createdAtMs, seed, idFactory),
    source,
    created_at_ms: createdAtMs,
    expires_at_ms: createdAtMs + durationMs + 1000,
    duration_ms: durationMs,
    variation_seed: Math.trunc(boundedNumber(seed, 0)),
    blend: { in_ms: 80, out_ms: 120 },
    tracks,
  };
}

export function createImmediateMotion(command, options) {
  return createPlan(command?.groups, 'user_command', options);
}

export function createListeningMotion(options) {
  return createPlan([{
    gestures: [
      { kind: 'tilt_left', count: 1, amplitude: 0.18 },
      { kind: 'lean_forward', count: 1, amplitude: 0.12 },
    ],
  }], 'local_micro_reaction', options);
}
