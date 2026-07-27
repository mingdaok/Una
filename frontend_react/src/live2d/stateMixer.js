import { SEMANTIC_CHANNELS } from './motionProtocol';

export const SOURCE_PRIORITY = Object.freeze({
  legacy_fallback: 15,
  local_micro_reaction: 20,
  ai_reply: 30,
  user_command: 40,
});

const MAX_SEEN_MOTION_IDS = 256;
const DEFAULT_REPLACEMENT_BLEND_MS = 140;

function clamp(value) {
  return Math.max(-1, Math.min(1, value));
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function finiteMilliseconds(value) {
  return finite(value) && value >= 0 ? value : null;
}

function safeLayer(layer, { rejectOnReadError = false } = {}) {
  if (!layer || typeof layer !== 'object' || Array.isArray(layer)) return {};
  const output = {};
  for (const channel of SEMANTIC_CHANNELS) {
    try {
      const value = layer[channel];
      if (finite(value)) output[channel] = clamp(value);
    } catch {
      if (rejectOnReadError) return null;
    }
  }
  return output;
}

function blendWeight(elapsed, durationMs, blendInMs, blendOutMs) {
  const inWeight = elapsed < blendInMs ? elapsed / blendInMs : 1;
  const remaining = durationMs - elapsed;
  const outWeight = remaining < blendOutMs ? remaining / blendOutMs : 1;
  return Math.max(0, Math.min(1, inWeight, outWeight));
}

function trackMode(motion, channel) {
  const modes = motion.trackModes;
  if (modes && typeof modes === 'object' && Object.hasOwn(modes, channel)) {
    return modes[channel] === 'additive' ? 'additive' : 'override';
  }
  // 兼容尚未提供逐通道模式的旧编译器调用。
  return motion.mode === 'additive' ? 'additive' : 'override';
}

function isValidMotion(motion) {
  return Boolean(
    motion
    && typeof motion === 'object'
    && typeof motion.motionId === 'string'
    && motion.motionId
    && Object.hasOwn(SOURCE_PRIORITY, motion.source)
    && finiteMilliseconds(motion.durationMs) !== null
    && motion.durationMs > 0
    && typeof motion.sample === 'function',
  );
}

/**
 * 将待机、情绪、不同来源的动作、眨眼和口型合成为单一归一化语义帧。
 * 所有可变状态封装在闭包内，reset() 可在模型切换或组件卸载时同步释放。
 */
export function createLive2DStateMixer({ clock = () => Date.now() } = {}) {
  const active = new Map();
  const seenIds = new Map();
  let sequence = 0;

  function cleanupSeenIds(nowMs) {
    for (const [motionId, expiresAtMs] of seenIds) {
      if (expiresAtMs <= nowMs) seenIds.delete(motionId);
    }
  }

  function rememberMotionId(motionId, expiresAtMs) {
    seenIds.set(motionId, expiresAtMs);
    while (seenIds.size > MAX_SEEN_MOTION_IDS) {
      const oldestMotionId = seenIds.keys().next().value;
      seenIds.delete(oldestMotionId);
    }
  }

  function cleanupActiveMotions(nowMs) {
    for (const [motionId, record] of active) {
      const elapsed = nowMs - record.startAtMs;
      const expiresAtMs = finiteMilliseconds(record.motion.expiresAtMs);
      if (elapsed >= record.motion.durationMs || (expiresAtMs !== null && expiresAtMs <= nowMs)) {
        active.delete(motionId);
      }
    }
  }

  function enqueue(motion, receivedAtMs = clock()) {
    if (!isValidMotion(motion) || !finite(receivedAtMs)) return false;
    cleanupActiveMotions(receivedAtMs);
    if (active.has(motion.motionId)) return false;
    cleanupSeenIds(receivedAtMs);
    if (seenIds.has(motion.motionId)) return false;
    const expiresAtMs = finiteMilliseconds(motion.expiresAtMs);
    if (expiresAtMs !== null && expiresAtMs <= receivedAtMs) return false;

    const startAtMs = receivedAtMs;
    active.set(motion.motionId, {
      motion,
      startAtMs,
      sequence: sequence += 1,
    });
    rememberMotionId(motion.motionId, expiresAtMs ?? (startAtMs + motion.durationMs));
    return true;
  }

  function collectActiveSamples(nowMs) {
    const samples = [];
    cleanupActiveMotions(nowMs);
    for (const [motionId, record] of active) {
      const { motion } = record;
      const elapsed = nowMs - record.startAtMs;
      const expiresAtMs = finiteMilliseconds(motion.expiresAtMs);
      if (elapsed < 0 || elapsed >= motion.durationMs || (expiresAtMs !== null && expiresAtMs <= nowMs)) {
        active.delete(motionId);
        continue;
      }

      let sampled;
      try {
        sampled = motion.sample(Math.max(0, Math.min(1, elapsed / motion.durationMs)));
      } catch {
        active.delete(motionId);
        continue;
      }

      const frame = safeLayer(sampled, { rejectOnReadError: true });
      if (frame === null) {
        active.delete(motionId);
        continue;
      }

      samples.push({
        motion,
        sequence: record.sequence,
        elapsed,
        priority: SOURCE_PRIORITY[motion.source],
        frame,
      });
    }
    return samples.sort((left, right) => left.priority - right.priority || left.sequence - right.sequence);
  }

  function sample({ nowMs = clock(), idle = {}, emotion = {}, blink = {}, lipSync = {} } = {}) {
    const currentMs = finite(nowMs) ? nowMs : clock();
    cleanupSeenIds(currentMs);
    const frame = { ...safeLayer(idle), ...safeLayer(emotion) };
    const samples = collectActiveSamples(currentMs);

    function weightFor(item, channel) {
      const requestedBlendInMs = finiteMilliseconds(item.motion.blendInMs) ?? 0;
      const hasOlderSameSourceOverride = trackMode(item.motion, channel) === 'override' && samples.some(other => (
        other.sequence < item.sequence
        && other.motion.source === item.motion.source
        && Object.hasOwn(other.frame, channel)
        && trackMode(other.motion, channel) === 'override'
      ));
      const blendInMs = requestedBlendInMs > 0
        ? requestedBlendInMs
        : (hasOlderSameSourceOverride ? DEFAULT_REPLACEMENT_BLEND_MS : 0);
      return blendWeight(
        item.elapsed,
        item.motion.durationMs,
        blendInMs,
        finiteMilliseconds(item.motion.blendOutMs) ?? 0,
      );
    }

    for (const item of samples) {
      for (const [channel, value] of Object.entries(item.frame)) {
        if (trackMode(item.motion, channel) !== 'additive') continue;
        frame[channel] = clamp((frame[channel] ?? 0) + value * weightFor(item, channel));
      }
    }

    // 低优先级先写入，高优先级最后写入；同来源新动作在淡入期间自然接替旧动作。
    for (const item of samples) {
      for (const [channel, value] of Object.entries(item.frame)) {
        if (trackMode(item.motion, channel) !== 'override') continue;
        const base = frame[channel] ?? 0;
        const weight = weightFor(item, channel);
        frame[channel] = clamp(base + (value - base) * weight);
      }
    }

    const blinkValue = blink && typeof blink === 'object' ? blink.eye_open : null;
    if (finite(blinkValue) && blinkValue < 0) {
      frame.eye_open = clamp((frame.eye_open ?? 0) + blinkValue);
    }

    // 嘴部不允许由待机、情绪或动作层控制，只使用 TTS 口型安全快照。
    if (lipSync && typeof lipSync === 'object') {
      for (const channel of ['mouth_open', 'mouth_form']) {
        if (finite(lipSync[channel])) frame[channel] = clamp(lipSync[channel]);
      }
    }
    return frame;
  }

  function reset() {
    active.clear();
    seenIds.clear();
    sequence = 0;
  }

  return Object.freeze({ enqueue, sample, reset });
}
