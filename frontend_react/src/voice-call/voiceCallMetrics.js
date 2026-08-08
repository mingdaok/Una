const SAFE_STAGES = new Set([
  'vad_endpoint',
  'first_audio',
  'buffer_depth',
  'starvation',
  'barge_in_stop',
]);
const SAFE_STATUSES = new Set([
  'started', 'completed', 'accepted', 'cancelled', 'stale', 'underflow', 'error',
]);
const INTEGER_FIELDS = ['turn_id', 'sequence', 'byte_count'];

function read(input, field) {
  return Reflect.get(input, field);
}

export function sanitizeVoiceCallMetric(input) {
  if (!input || typeof input !== 'object') return null;
  try {
    const stage = read(input, 'stage');
    if (!SAFE_STAGES.has(stage)) return null;
    const safe = { stage };

    const sessionId = read(input, 'session_id');
    if (typeof sessionId === 'string' && sessionId.length) safe.session_id = sessionId.slice(0, 8);

    const status = read(input, 'status');
    if (SAFE_STATUSES.has(status)) safe.status = status;

    for (const field of INTEGER_FIELDS) {
      const value = read(input, field);
      if (Number.isSafeInteger(value) && value >= 0) safe[field] = value;
    }

    const duration = read(input, 'duration_ms');
    if (typeof duration === 'number' && Number.isFinite(duration) && duration >= 0) {
      safe.duration_ms = Math.round(duration * 1000) / 1000;
    }
    return Object.freeze(safe);
  } catch {
    return null;
  }
}

export function createVoiceCallMetricReporter(sink = safe => console.info('[VoiceCallMetric]', safe)) {
  return input => {
    try {
      const safe = sanitizeVoiceCallMetric(input);
      if (safe) sink(safe);
    } catch {
      // Observability must never interrupt capture, playback, or barge-in.
    }
  };
}
