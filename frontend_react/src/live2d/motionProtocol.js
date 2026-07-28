export const SEMANTIC_CHANNELS = Object.freeze([
  'head_yaw', 'head_pitch', 'head_roll',
  'body_yaw', 'body_pitch', 'body_roll',
  'gaze_x', 'gaze_y', 'eye_open', 'eye_smile',
  'brow_y', 'brow_form', 'cheek',
]);

export const RESERVED_MOTION_CHANNELS = Object.freeze([
  'mouth_open', 'mouth_form', 'mouth_open_y', 'mouth_form_y',
]);

const CHANNEL_SET = new Set(SEMANTIC_CHANNELS);
const EASING = {
  linear: t => t,
  ease_in: t => t * t,
  ease_out: t => 1 - ((1 - t) ** 2),
  ease_in_out: t => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2),
};
const MODE_SET = new Set(['override', 'additive']);
const SOURCE_SET = new Set([
  'ai_reply', 'user_command', 'local_micro_reaction', 'legacy_fallback',
]);
const MAX_TRACKS = 8;
const MAX_KEYFRAMES = 12;

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clampedMilliseconds(value, minimum, maximum, fallback) {
  const number = finiteNumber(value);
  return number === null ? fallback : Math.max(minimum, Math.min(maximum, Math.trunc(number)));
}

function normalizeTrack(track) {
  if (!track || typeof track !== 'object' || !CHANNEL_SET.has(track.channel)
    || !MODE_SET.has(track.mode) || !Array.isArray(track.keyframes)
    || track.keyframes.length < 2 || track.keyframes.length > MAX_KEYFRAMES) {
    return null;
  }

  const keyframes = [];
  let previousT = -1;
  for (const keyframe of track.keyframes) {
    if (!keyframe || typeof keyframe !== 'object') return null;
    const t = finiteNumber(keyframe.t);
    const value = finiteNumber(keyframe.value);
    const easing = keyframe.easing ?? 'linear';
    if (t === null || value === null || !Object.hasOwn(EASING, easing)
      || t < 0 || t > 1 || value < -1 || value > 1 || t <= previousT) {
      return null;
    }
    keyframes.push({ t, value, easing });
    previousT = t;
  }

  return { channel: track.channel, mode: track.mode, keyframes };
}

export function normalizeMotionEvent(event, { nowMs = Date.now() } = {}) {
  if (!event || typeof event !== 'object' || event.type !== 'live2d_motion_v3'
    || typeof event.motion_id !== 'string' || !event.motion_id
    || !SOURCE_SET.has(event.source)
    || !Array.isArray(event.tracks)) {
    return null;
  }

  const createdAtMs = finiteNumber(event.created_at_ms);
  const expiresAtMs = finiteNumber(event.expires_at_ms);
  const currentMs = finiteNumber(nowMs);
  if (createdAtMs === null || expiresAtMs === null || currentMs === null || expiresAtMs <= currentMs) return null;

  const blend = event.blend ?? {};
  if (!blend || typeof blend !== 'object' || Array.isArray(blend)) return null;

  const tracks = [];
  for (const track of event.tracks) {
    const normalizedTrack = normalizeTrack(track);
    if (normalizedTrack) tracks.push(normalizedTrack);
    if (tracks.length === MAX_TRACKS) break;
  }
  if (!tracks.length) return null;

  return {
    type: 'live2d_motion_v3',
    motion_id: event.motion_id,
    source: event.source,
    created_at_ms: createdAtMs,
    expires_at_ms: expiresAtMs,
    duration_ms: clampedMilliseconds(event.duration_ms, 400, 4000, 800),
    blend: {
      in_ms: clampedMilliseconds(blend.in_ms, 0, 500, 0),
      out_ms: clampedMilliseconds(blend.out_ms, 0, 500, 0),
    },
    tracks,
  };
}

function sampleTrack(track, progress) {
  const frames = track.keyframes;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  if (clampedProgress <= frames[0].t) return frames[0].value;
  if (clampedProgress >= frames.at(-1).t) return frames.at(-1).value;

  for (let index = 1; index < frames.length; index += 1) {
    const destination = frames[index];
    if (clampedProgress <= destination.t) {
      const origin = frames[index - 1];
      const localProgress = (clampedProgress - origin.t) / (destination.t - origin.t);
      const easedProgress = EASING[destination.easing](localProgress);
      return Math.max(-1, Math.min(1, origin.value + ((destination.value - origin.value) * easedProgress)));
    }
  }
  return null;
}

export function compileMotionPlan(plan) {
  if (!plan || typeof plan !== 'object' || !Array.isArray(plan.tracks)) return null;

  const safeTracks = plan.tracks.map(normalizeTrack).filter(Boolean).slice(0, MAX_TRACKS);
  if (!safeTracks.length) return null;

  return Object.freeze({
    motionId: typeof plan.motion_id === 'string' ? plan.motion_id : null,
    source: typeof plan.source === 'string' ? plan.source : null,
    durationMs: clampedMilliseconds(plan.duration_ms, 400, 4000, 800),
    blendInMs: clampedMilliseconds(plan.blend?.in_ms, 0, 500, 0),
    blendOutMs: clampedMilliseconds(plan.blend?.out_ms, 0, 500, 0),
    expiresAtMs: finiteNumber(plan.expires_at_ms),
    // 混合器需要轨道模式来区分叠加和覆盖；冻结快照避免调用方改写编译结果。
    trackModes: Object.freeze(Object.fromEntries(
      safeTracks.map(track => [track.channel, track.mode]),
    )),
    sample(progress) {
      const numericProgress = finiteNumber(progress);
      if (numericProgress === null) return {};
      return Object.fromEntries(safeTracks.flatMap(track => {
        try {
          const value = sampleTrack(track, numericProgress);
          return value === null || !Number.isFinite(value) ? [] : [[track.channel, value]];
        } catch {
          return [];
        }
      }));
    },
  });
}
