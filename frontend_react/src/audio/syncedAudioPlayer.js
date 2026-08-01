const PLAYBACK_LEAD_SECONDS = 0.01;

class AudioBufferLoadError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AudioBufferLoadError';
  }
}

export function createAudioBufferLoader({ audioContext, fetchImpl = globalThis.fetch }) {
  const requests = new Map();

  return function loadAudioBuffer(url) {
    if (requests.has(url)) return requests.get(url);

    const request = (async () => {
      try {
        const response = await fetchImpl(url);
        if (!response?.ok) {
          const status = Number.isInteger(response?.status) ? ` (${response.status})` : '';
          throw new AudioBufferLoadError(`Audio request failed${status}`);
        }
        const bytes = await response.arrayBuffer();
        return await audioContext.decodeAudioData(bytes);
      } catch (error) {
        if (error instanceof AudioBufferLoadError) throw error;
        throw new AudioBufferLoadError('Audio buffer loading failed');
      }
    })();

    requests.set(url, request);
    request.catch(() => {
      if (requests.get(url) === request) requests.delete(url);
    });
    return request;
  };
}

function normalizeVisemes(visemes) {
  if (!Array.isArray(visemes)) return [];
  const normalized = [];
  for (const cue of visemes) {
    try {
      const start = Number(cue?.start);
      const end = Number(cue?.end);
      const value = cue?.value;
      if (
        Number.isFinite(start)
        && Number.isFinite(end)
        && start >= 0
        && end >= start
        && typeof value === 'string'
        && value.length > 0
      ) {
        normalized.push({ start, end, value });
      }
    } catch {
      // Ignore malformed cue accessors without interrupting audio playback.
    }
  }
  normalized.sort((left, right) => left.start - right.start || left.end - right.end);
  return normalized;
}

export function startSyncedPlayback({
  audioContext,
  audioBuffer,
  visemes,
  onViseme = () => {},
  onEnded = () => {},
  onError = () => {},
  requestFrame = globalThis.requestAnimationFrame,
  cancelFrame = globalThis.cancelAnimationFrame,
}) {
  const cues = normalizeVisemes(visemes);
  const contextTime = Number(audioContext?.currentTime);
  const startAt = (Number.isFinite(contextTime) ? contextTime : 0) + PLAYBACK_LEAD_SECONDS;
  let source = null;
  let cueIndex = 0;
  let frameId = null;
  let frameScheduled = false;
  let terminal = false;

  function emitViseme(value) {
    try {
      onViseme(value);
    } catch {
      // A UI callback must not leak the owned audio/RAF resources.
    }
  }

  function cleanup(outcome, error) {
    if (terminal) return;
    terminal = true;

    if (frameScheduled) {
      try {
        cancelFrame(frameId);
      } catch {
        // The source still needs to be stopped if a host RAF shim fails.
      }
      frameScheduled = false;
      frameId = null;
    }

    if (source) {
      source.onended = null;
      source.onerror = null;
      try {
        source.stop();
      } catch {
        // AudioBufferSourceNode.stop() may throw after natural completion.
      }
      try {
        source.disconnect?.();
      } catch {
        // Disconnect is best-effort cleanup.
      }
    }

    emitViseme('X');
    if (outcome === 'ended') {
      try {
        onEnded();
      } catch {
        // Terminal callback errors must not trigger a second outcome.
      }
    } else if (outcome === 'error') {
      try {
        onError(error instanceof Error ? error : new Error('Audio playback failed'));
      } catch {
        // Terminal callback errors must not trigger a second outcome.
      }
    }
  }

  function scheduleFrame() {
    if (terminal) return;
    frameId = requestFrame(tick);
    frameScheduled = true;
  }

  function tick() {
    if (terminal) return;
    frameScheduled = false;
    frameId = null;

    try {
      const elapsed = Number(audioContext.currentTime) - startAt;
      let value = 'X';
      if (Number.isFinite(elapsed) && elapsed >= 0) {
        while (cueIndex < cues.length && elapsed > cues[cueIndex].end) {
          cueIndex += 1;
        }
        const cue = cues[cueIndex];
        if (cue && elapsed >= cue.start && elapsed <= cue.end) value = cue.value;
      }
      emitViseme(value);
      if (terminal) return;
      scheduleFrame();
    } catch (error) {
      cleanup('error', error);
    }
  }

  const handle = {
    startAt,
    stop() {
      cleanup('stop');
    },
  };

  emitViseme('X');
  try {
    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.onended = () => cleanup('ended');
    source.onerror = error => cleanup('error', error);
    source.connect(audioContext.destination);
    source.start(startAt);
    scheduleFrame();
  } catch (error) {
    cleanup('error', error);
  }

  return handle;
}
