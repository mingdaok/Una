import { normalizeLive2DModel } from './modelActionProfiles';

const COMMON_COOLDOWN_MIN_MS = 3000;
const COMMON_COOLDOWN_MAX_MS = 6000;
const SPECIAL_COOLDOWN_MIN_MS = 15000;
const SPECIAL_COOLDOWN_MAX_MS = 25000;
const HISTORY_SIZE = 3;

const COMMON_CANDIDATES = Object.freeze([
  Object.freeze({ family: 'gaze', channel: 'gaze_x', value: 0.22 }),
  Object.freeze({ family: 'head_turn', channel: 'head_yaw', value: -0.2 }),
  Object.freeze({ family: 'head_nod', channel: 'head_pitch', value: 0.16 }),
  Object.freeze({ family: 'body_shift', channel: 'body_roll', value: -0.14 }),
]);

const SPECIAL_CANDIDATES = Object.freeze({
  hiyori: Object.freeze([
    Object.freeze({
      family: 'hiyori_wave',
      tracks: Object.freeze([
        Object.freeze(['left_arm_raise', 0.55]),
        Object.freeze(['left_hand_wave', 0.7]),
      ]),
    }),
    Object.freeze({
      family: 'hiyori_greeting',
      tracks: Object.freeze([
        Object.freeze(['right_arm_raise', 0.45]),
        Object.freeze(['right_hand_wave', -0.65]),
      ]),
    }),
  ]),
  panda_cake: Object.freeze([
    Object.freeze({ family: 'panda_hug', tracks: Object.freeze([Object.freeze(['panda_hug', 1])]) }),
    Object.freeze({ family: 'panda_face', tracks: Object.freeze([Object.freeze(['hands_to_face', 1])]) }),
  ]),
});

const HIYORI_EMOTIONS = new Set(['happy', 'joy', 'excited', 'greeting', 'welcome', 'emphasis']);
const PANDA_EMOTIONS = new Set(['comfort', 'companionship', 'shy', 'surprised', 'praise']);

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function seedFrom(value) {
  let hash = 2166136261;
  for (const character of String(value ?? '')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

function defaultClock() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function normalEmotion(emotion) {
  return typeof emotion === 'string' ? emotion.trim().toLowerCase() : '';
}

function keyframes(value) {
  return [
    { t: 0, value: 0, easing: 'ease_in_out' },
    { t: 0.5, value, easing: 'ease_in_out' },
    { t: 1, value: 0, easing: 'ease_in_out' },
  ];
}

/**
 * Produces low-priority semantic v3 motions only.  It neither reads nor writes
 * Cubism parameters, so controller post-update remains the single projection path.
 */
export class ModelActionScheduler {
  constructor({ sessionSeed, now = defaultClock } = {}) {
    this.sessionSeed = sessionSeed ?? 'default-live2d-session';
    this.now = typeof now === 'function' ? now : defaultClock;
    this.reset({ modelName: null, generation: 0 });
  }

  reset({ modelName, generation } = {}) {
    this.modelName = normalizeLive2DModel(modelName);
    this.generation = Number.isFinite(generation) ? generation : 0;
    this.randomState = seedFrom(`${this.sessionSeed}:${this.modelName ?? 'unknown'}:${this.generation}`);
    this.nextCommonAtMs = 0;
    this.nextSpecialAtMs = 0;
    this.history = [];
    this.sequence = 0;
  }

  random() {
    let value = this.randomState >>> 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.randomState = value >>> 0;
    return this.randomState / 4294967296;
  }

  cooldown(minimum, maximum) {
    return minimum + Math.floor(this.random() * (maximum - minimum + 1));
  }

  choose(candidates) {
    const allowed = candidates.filter(candidate => !this.history.includes(candidate.family));
    if (!allowed.length) return null;
    return allowed[Math.floor(this.random() * allowed.length)];
  }

  supportsSpecial(modelName, emotion) {
    const key = normalEmotion(emotion);
    return modelName === 'hiyori'
      ? HIYORI_EMOTIONS.has(key)
      : PANDA_EMOTIONS.has(key);
  }

  isBlocked(mixer, nowMs) {
    try {
      return Boolean(
        mixer?.hasActiveSource?.('user_command', nowMs)
        || mixer?.hasActiveSource?.('ai_reply', nowMs),
      );
    } catch {
      return true;
    }
  }

  event({ modelName, nowMs, candidate, special }) {
    const motionId = `local-random-${modelName}-${this.generation}-${this.sequence += 1}-${candidate.family}`;
    const rawTracks = special
      ? candidate.tracks
      : [[candidate.channel, candidate.value]];
    const durationMs = special ? 1600 : 1100;
    return Object.freeze({
      type: 'live2d_motion_v3',
      motion_id: motionId,
      source: 'local_random',
      created_at_ms: nowMs,
      expires_at_ms: nowMs + durationMs + 800,
      duration_ms: durationMs,
      variation_seed: Math.floor(this.random() * 0x7fffffff),
      blend: Object.freeze({ in_ms: 140, out_ms: 180 }),
      tracks: Object.freeze(rawTracks.map(([channel, value]) => Object.freeze({
        channel,
        mode: 'override',
        keyframes: Object.freeze(keyframes(value).map(frame => Object.freeze(frame))),
      }))),
    });
  }

  schedule({ modelName, emotion, nowMs = this.now(), mixer } = {}) {
    const normalizedModel = normalizeLive2DModel(modelName);
    const currentMs = finite(nowMs) ? nowMs : this.now();
    if (!normalizedModel || normalizedModel !== this.modelName || this.isBlocked(mixer, currentMs)) return null;

    const specialDue = currentMs >= this.nextSpecialAtMs && this.supportsSpecial(normalizedModel, emotion);
    // The 15–25 second cadence is the low-frequency gate. Once its seeded due
    // time arrives, emit deterministically instead of retrying every frame.
    if (specialDue) {
      const special = this.choose(SPECIAL_CANDIDATES[normalizedModel]);
      if (special) {
        this.nextSpecialAtMs = currentMs + this.cooldown(SPECIAL_COOLDOWN_MIN_MS, SPECIAL_COOLDOWN_MAX_MS);
        this.nextCommonAtMs = currentMs + this.cooldown(COMMON_COOLDOWN_MIN_MS, COMMON_COOLDOWN_MAX_MS);
        this.history.push(special.family);
        this.history = this.history.slice(-HISTORY_SIZE);
        return this.event({ modelName: normalizedModel, nowMs: currentMs, candidate: special, special: true });
      }
    }

    if (currentMs < this.nextCommonAtMs) return null;
    const common = this.choose(COMMON_CANDIDATES);
    if (!common) return null;
    this.nextCommonAtMs = currentMs + this.cooldown(COMMON_COOLDOWN_MIN_MS, COMMON_COOLDOWN_MAX_MS);
    this.history.push(common.family);
    this.history = this.history.slice(-HISTORY_SIZE);
    return this.event({ modelName: normalizedModel, nowMs: currentMs, candidate: common, special: false });
  }
}
