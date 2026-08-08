const PREBUFFER_SECONDS = 0.12;
const INITIAL_LEAD_SECONDS = 0.03;
const CONTINUATION_LEAD_SECONDS = 0.01;
const MAX_SEQUENCE = 4095;

const noop = () => {};

function validateTurnId(turnId) {
  if (!Number.isSafeInteger(turnId) || turnId <= 0) {
    throw new TypeError('turnId 必须为正安全整数');
  }
}

function validateFormat(format) {
  if (!format || typeof format !== 'object') throw new TypeError('PCM format 必须为对象');
  if (!Number.isSafeInteger(format.sample_rate) || format.sample_rate < 8000 || format.sample_rate > 48000) {
    throw new RangeError('sample_rate 必须在 8000..48000');
  }
  if (format.channels !== 1) throw new RangeError('channels 必须为 1');
  if (format.sample_width !== 2) throw new RangeError('sample_width 必须为 2');
  return Object.freeze({
    sample_rate: format.sample_rate,
    channels: 1,
    sample_width: 2,
  });
}

function copyPcm(pcm) {
  let view;
  if (pcm instanceof ArrayBuffer) view = new Uint8Array(pcm);
  else if (ArrayBuffer.isView(pcm)) view = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  else throw new TypeError('PCM 必须为 ArrayBuffer 或 TypedArray');
  if (!view.byteLength || view.byteLength % 2) throw new RangeError('PCM16 必须为非空偶数字节');
  return view.slice().buffer;
}

export function createPcmStreamPlayer(dependencies = {}) {
  const createAudioContext = dependencies.createAudioContext || (() => new AudioContext());
  const now = dependencies.now || (() => performance.now());
  const reportMetric = dependencies.reportMetric || noop;

  let context = null;
  let current = null;
  let destroyed = false;
  let scheduling = Promise.resolve();

  function ensureContext() {
    if (!context) context = createAudioContext();
    return context;
  }

  function stopSources(state) {
    for (const source of state.sources) {
      try {
        source.stop();
      } catch {
        // A source that ended naturally is already terminal.
      }
    }
    state.sources.clear();
  }

  function invalidateCurrent(status) {
    if (!current) return;
    current.active = false;
    current.status = status;
    current.pending.clear();
    stopSources(current);
  }

  function pcmToAudioBuffer(state, pcm, sequence) {
    const sampleCount = pcm.byteLength / 2;
    const buffer = context.createBuffer(1, sampleCount, state.format.sample_rate);
    const output = buffer.getChannelData(0);
    const input = new DataView(pcm);
    for (let index = 0; index < sampleCount; index += 1) {
      output[index] = input.getInt16(index * 2, true) / 32768;
    }
    buffer.__voiceSequence = sequence;
    return buffer;
  }

  function contiguousSamples(state) {
    let sequence = state.expectedSequence;
    let samples = 0;
    while (state.pending.has(sequence)) {
      samples += state.pending.get(sequence).byteLength / 2;
      sequence += 1;
    }
    return samples;
  }

  function scheduleContiguous(state) {
    if (!state.active || current !== state) return;
    if (!state.playbackBegun) {
      const samples = contiguousSamples(state);
      const threshold = Math.ceil(state.format.sample_rate * PREBUFFER_SECONDS);
      if (!state.sealed && samples < threshold) return;
      if (!samples) return;
      state.playbackBegun = true;
      state.nextStartAt = context.currentTime + INITIAL_LEAD_SECONDS;
    }

    while (state.active && state.pending.has(state.expectedSequence)) {
      const sequence = state.expectedSequence;
      const pcm = state.pending.get(sequence);
      state.pending.delete(sequence);
      if (context.currentTime > state.nextStartAt) {
        reportMetric('pcm_playback_underflow', {
          turn_id: state.turnId,
          sequence,
          gap_ms: Math.round((context.currentTime - state.nextStartAt) * 1000),
          at_ms: now(),
        });
      }
      const audioBuffer = pcmToAudioBuffer(state, pcm, sequence);
      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.__voiceSequence = sequence;
      source.connect(context.destination);
      const startAt = Math.max(state.nextStartAt, context.currentTime + CONTINUATION_LEAD_SECONDS);
      source.onended = () => {
        state.sources.delete(source);
        if (state.active && state.sealed && !state.pending.size && !state.sources.size) {
          state.status = 'completed';
        }
      };
      state.sources.add(source);
      source.start(startAt);
      state.nextStartAt = startAt + audioBuffer.duration;
      state.expectedSequence += 1;
      state.status = state.sealed ? 'sealed' : 'playing';
    }
    if (state.sealed && !state.pending.size && !state.sources.size) state.status = 'completed';
  }

  function requestScheduling(state) {
    scheduling = scheduling.catch(noop).then(async () => {
      if (!state.active || current !== state || destroyed) return;
      if (context.state === 'suspended') await context.resume();
      scheduleContiguous(state);
    });
    return scheduling;
  }

  function scheduleAndReport(state) {
    void requestScheduling(state).catch(error => {
      reportMetric('pcm_playback_error', {
        turn_id: state.turnId,
        message: error instanceof Error ? error.message : String(error),
        at_ms: now(),
      });
    });
  }

  function start(turnId, format) {
    if (destroyed) throw new Error('PCM 播放器已销毁');
    validateTurnId(turnId);
    const normalizedFormat = validateFormat(format);
    ensureContext();
    invalidateCurrent('superseded');
    current = {
      turnId,
      format: normalizedFormat,
      active: true,
      status: 'buffering',
      sealed: false,
      playbackBegun: false,
      expectedSequence: 0,
      seenSequences: new Set(),
      pending: new Map(),
      sources: new Set(),
      nextStartAt: 0,
    };
    return { accepted: true };
  }

  function enqueue(turnId, sequence, pcm) {
    if (!current || !current.active || current.turnId !== turnId) {
      return { accepted: false, reason: 'stale' };
    }
    if (current.sealed) return { accepted: false, reason: 'sealed' };
    if (!Number.isSafeInteger(sequence) || sequence < 0 || sequence > MAX_SEQUENCE) {
      return { accepted: false, reason: 'invalid_sequence' };
    }
    if (current.seenSequences.has(sequence)) {
      return { accepted: false, reason: 'duplicate' };
    }
    let ownedPcm;
    try {
      ownedPcm = copyPcm(pcm);
    } catch (error) {
      return { accepted: false, reason: 'invalid_pcm', error };
    }
    current.seenSequences.add(sequence);
    current.pending.set(sequence, ownedPcm);
    current.status = 'buffering';
    scheduleAndReport(current);
    return { accepted: true };
  }

  function seal(turnId) {
    if (!current || !current.active || current.turnId !== turnId) {
      return { accepted: false, reason: 'stale' };
    }
    current.sealed = true;
    current.status = 'sealed';
    const pendingSequences = [...current.pending.keys()].sort((a, b) => a - b);
    const maximum = pendingSequences.at(-1);
    let missingSequence = null;
    if (maximum !== undefined) {
      for (let sequence = current.expectedSequence; sequence <= maximum; sequence += 1) {
        if (!current.seenSequences.has(sequence)) {
          missingSequence = sequence;
          break;
        }
      }
    }
    if (missingSequence !== null) {
      current.status = 'sequence_gap';
      reportMetric('pcm_sequence_gap', {
        turn_id: turnId,
        expected_sequence: missingSequence,
        at_ms: now(),
      });
    }
    scheduleAndReport(current);
    return missingSequence === null
      ? { accepted: true }
      : { accepted: false, reason: 'missing_sequence', expected_sequence: missingSequence };
  }

  function interrupt(turnId) {
    if (!current || current.turnId !== turnId || !current.active) {
      return { accepted: false, reason: 'stale' };
    }
    invalidateCurrent('interrupted');
    return { accepted: true };
  }

  async function destroy() {
    if (destroyed) return;
    destroyed = true;
    invalidateCurrent('destroyed');
    await scheduling.catch(noop);
    if (context && context.state !== 'closed') await context.close();
  }

  function snapshot() {
    if (!current) return Object.freeze({ status: destroyed ? 'destroyed' : 'idle' });
    const bufferedSamples = [...current.pending.values()]
      .reduce((total, pcm) => total + pcm.byteLength / 2, 0);
    return Object.freeze({
      turnId: current.turnId,
      status: current.status,
      active: current.active,
      sealed: current.sealed,
      expectedSequence: current.expectedSequence,
      pendingSequences: Object.freeze([...current.pending.keys()].sort((a, b) => a - b)),
      bufferedMs: Math.round(bufferedSamples / current.format.sample_rate * 1000),
      nextStartAt: current.nextStartAt,
    });
  }

  return {
    start,
    enqueue,
    seal,
    interrupt,
    destroy,
    snapshot,
    whenScheduled: () => scheduling,
  };
}
