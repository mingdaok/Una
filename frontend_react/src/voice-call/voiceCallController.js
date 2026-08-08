import { createPcmStreamPlayer } from './pcmStreamPlayer.js';
import { createVoiceCallSocket } from './voiceCallSocket.js';
import { createVoiceCapture } from './voiceCapture.js';
import { createVoiceCallMetricReporter } from './voiceCallMetrics.js';


export function createVoiceCallController(dependencies = {}) {
  const documentImpl = dependencies.documentImpl || (typeof document === 'undefined' ? null : document);
  const now = dependencies.now || (() => performance.now());
  const reportMetric = createVoiceCallMetricReporter(dependencies.reportMetric);
  const listeners = new Set();
  let value = Object.freeze({
    state: 'ended',
    sessionId: null,
    activeTurnId: null,
    muted: false,
    transcript: '',
    assistantText: '',
    error: null,
  });
  const playerMetric = (name, detail = {}) => {
    if (name !== 'pcm_playback_underflow') return;
    reportMetric({
      session_id: value?.sessionId,
      turn_id: detail.turn_id,
      sequence: detail.sequence,
      stage: 'starvation',
      status: 'underflow',
      duration_ms: detail.gap_ms,
    });
  };
  const player = dependencies.player || (dependencies.createPlayer || createPcmStreamPlayer)(
    { ...dependencies.playerDependencies, reportMetric: playerMetric },
  );
  let lastTurnId = 0;
  let inputSequence = 0;
  let recording = false;
  let started = false;
  let ending = false;
  let failed = false;
  let failurePromise = null;
  let visibilityAttached = false;
  let cleanupPromise = null;
  let speechStartedAt = null;
  let speechByteCount = 0;
  let responseStartedAt = null;
  let firstAudioTurnId = null;

  function publish(patch) {
    value = Object.freeze({ ...value, ...patch });
    for (const listener of listeners) listener(value);
  }

  function fail(error) {
    publish({
      state: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  function acceptsTurn(event) {
    return Number.isSafeInteger(event.turn_id)
      && event.turn_id === value.activeTurnId
      && event.session_id === value.sessionId
      && value.state !== 'ended';
  }

  function cancelActiveTurn() {
    const turnId = value.activeTurnId;
    if (!turnId || !value.sessionId) return;
    const startedAt = now();
    const result = player.interrupt(turnId);
    reportMetric({
      session_id: value.sessionId,
      turn_id: turnId,
      stage: 'barge_in_stop',
      status: result?.accepted ? 'completed' : 'stale',
      duration_ms: Math.max(0, now() - startedAt),
    });
    socket.sendInterrupt(value.sessionId, turnId);
  }

  function handleSpeechStart() {
    if (!value.sessionId || value.muted || ending || value.state === 'connecting' || value.state === 'ended') {
      return;
    }
    if (value.activeTurnId !== null) cancelActiveTurn();
    lastTurnId += 1;
    inputSequence = 0;
    recording = true;
    speechStartedAt = now();
    speechByteCount = 0;
    responseStartedAt = null;
    firstAudioTurnId = null;
    socket.sendSpeechStart(value.sessionId, lastTurnId);
    publish({
      state: 'listening',
      activeTurnId: lastTurnId,
      transcript: '',
      assistantText: '',
      error: null,
    });
  }

  function handleCapturedPcm(pcm) {
    if (!recording || value.muted || !value.sessionId || value.activeTurnId === null) return;
    const result = socket.sendAudio(
      value.sessionId,
      value.activeTurnId,
      inputSequence,
      pcm,
    );
    if (result.accepted) {
      inputSequence += 1;
      if (Number.isSafeInteger(pcm?.byteLength)) speechByteCount += pcm.byteLength;
    }
  }

  function handleSpeechEnd() {
    if (!recording || !value.sessionId || value.activeTurnId === null) return;
    recording = false;
    socket.sendSpeechEnd(value.sessionId, value.activeTurnId);
    const endedAt = now();
    reportMetric({
      session_id: value.sessionId,
      turn_id: value.activeTurnId,
      stage: 'vad_endpoint',
      status: 'completed',
      duration_ms: speechStartedAt === null ? 0 : Math.max(0, endedAt - speechStartedAt),
      byte_count: speechByteCount,
    });
    responseStartedAt = endedAt;
    publish({ state: 'recognizing' });
  }

  function handleMisfire() {
    if (!recording) return;
    recording = false;
    reportMetric({
      session_id: value.sessionId,
      turn_id: value.activeTurnId,
      stage: 'vad_endpoint',
      status: 'cancelled',
      duration_ms: speechStartedAt === null ? 0 : Math.max(0, now() - speechStartedAt),
      byte_count: speechByteCount,
    });
    cancelActiveTurn();
    publish({ state: 'listening', activeTurnId: null });
  }

  const capture = dependencies.capture || (dependencies.createCapture || createVoiceCapture)({
    onSpeechStart: handleSpeechStart,
    onPcm: handleCapturedPcm,
    onSpeechEnd: handleSpeechEnd,
    onMisfire: handleMisfire,
    onError: error => { void abortAfterFailure(error); },
  }, dependencies.captureDependencies);

  async function handleControl(event) {
    if (event.type === 'call_ready') {
      if (value.state !== 'connecting' || value.sessionId) return;
      publish({ sessionId: event.session_id });
      await capture.start();
      publish({ state: 'listening' });
      return;
    }
    if (event.type === 'call_ended') {
      if (event.session_id !== value.sessionId) return;
      ending = true;
      recording = false;
      detachVisibilityListener();
      await cleanupLocalResources();
      socket.disconnect();
      publish({ state: 'ended', activeTurnId: null, sessionId: null });
      return;
    }
    if (!acceptsTurn(event)) return;

    if (event.type === 'transcript_final') {
      publish({ state: 'thinking', transcript: event.text });
    } else if (event.type === 'assistant_text_delta') {
      publish({
        state: 'thinking',
        assistantText: `${value.assistantText}${event.text}`,
      });
    } else if (event.type === 'tts_start') {
      player.start(event.turn_id, {
        sample_rate: event.sample_rate,
        channels: event.channels,
        sample_width: event.sample_width,
      });
      publish({ state: 'speaking' });
    } else if (event.type === 'tts_end') {
      player.seal(event.turn_id);
      publish({ state: 'listening' });
    } else if (event.type === 'turn_cancelled') {
      player.interrupt(event.turn_id);
      publish({ state: 'interrupted', activeTurnId: null });
    } else if (event.type === 'call_error') {
      player.interrupt(event.turn_id);
      publish({ state: 'error', activeTurnId: null, error: event.message });
    }
  }

  function handleOutputPcm(header, pcm) {
    if (!acceptsTurn(header)) return;
    const result = player.enqueue(header.turn_id, header.sequence, pcm);
    if (!result?.accepted) return;
    if (firstAudioTurnId !== header.turn_id) {
      firstAudioTurnId = header.turn_id;
      reportMetric({
        session_id: value.sessionId,
        turn_id: header.turn_id,
        sequence: header.sequence,
        stage: 'first_audio',
        status: 'accepted',
        duration_ms: responseStartedAt === null ? 0 : Math.max(0, now() - responseStartedAt),
        byte_count: pcm?.byteLength,
      });
    }
    const playerState = typeof player.snapshot === 'function' ? player.snapshot() : null;
    if (Number.isSafeInteger(playerState?.bufferedMs) && playerState.bufferedMs >= 0) {
      reportMetric({
        session_id: value.sessionId,
        turn_id: header.turn_id,
        sequence: header.sequence,
        stage: 'buffer_depth',
        status: 'accepted',
        duration_ms: playerState.bufferedMs,
        byte_count: pcm?.byteLength,
      });
    }
  }

  async function handleVisibilityChange() {
    if (!documentImpl || documentImpl.visibilityState !== 'hidden' || ending || failed) return;
    recording = false;
    cancelActiveTurn();
    await capture.pause();
    publish({ state: 'interrupted', activeTurnId: null });
  }

  const socket = dependencies.socket || (dependencies.createSocket || createVoiceCallSocket)({
    ...dependencies.socketDependencies,
    onControl: event => handleControl(event).catch(abortAfterFailure),
    onPcm: handleOutputPcm,
    onError: fail,
    onClose: () => {
      if (!ending && value.state !== 'ended') {
        void abortAfterFailure(new Error('语音连接已断开'));
      }
    },
  });

  function detachVisibilityListener() {
    if (documentImpl && visibilityAttached) {
      documentImpl.removeEventListener('visibilitychange', handleVisibilityChange);
      visibilityAttached = false;
    }
  }

  function cleanupLocalResources() {
    if (!cleanupPromise) {
      cleanupPromise = Promise.allSettled([capture.destroy(), player.destroy()]);
    }
    return cleanupPromise;
  }

  function abortAfterFailure(error) {
    fail(error);
    if (!failurePromise) {
      failed = true;
      recording = false;
      detachVisibilityListener();
      failurePromise = cleanupLocalResources().finally(() => socket.disconnect());
    }
    return failurePromise;
  }

  async function start() {
    if (ending) throw new Error('通话已经结束');
    if (failed) throw new Error('语音模块初始化失败，请重新加载通话');
    if (started) {
      if (value.state === 'interrupted' && !value.muted && documentImpl?.visibilityState !== 'hidden') {
        await capture.start();
        publish({ state: 'listening' });
      }
      return;
    }
    started = true;
    publish({ state: 'connecting', error: null });
    if (documentImpl && !visibilityAttached) {
      documentImpl.addEventListener('visibilitychange', handleVisibilityChange);
      visibilityAttached = true;
    }
    try {
      await socket.connect();
      const result = socket.sendCallStart();
      if (!result.accepted) throw new Error('无法开始语音通话');
    } catch (error) {
      fail(error);
      throw error;
    }
  }

  async function toggleMute() {
    if (ending || !started) return value.muted;
    const muted = !value.muted;
    publish({ muted });
    if (muted) {
      recording = false;
      cancelActiveTurn();
      await capture.pause();
      publish({ state: 'interrupted', activeTurnId: null });
    } else if (documentImpl?.visibilityState !== 'hidden') {
      await capture.start();
      publish({ state: 'listening' });
    }
    return muted;
  }

  async function end() {
    if (ending) return;
    ending = true;
    recording = false;
    detachVisibilityListener();
    if (value.activeTurnId !== null) player.interrupt(value.activeTurnId);
    if (value.sessionId) socket.sendCallEnd(value.sessionId);
    await cleanupLocalResources();
    socket.disconnect();
    publish({ state: 'ended', activeTurnId: null, sessionId: null });
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(value);
    return () => listeners.delete(listener);
  }

  return {
    start,
    end,
    toggleMute,
    subscribe,
    snapshot: () => value,
  };
}
