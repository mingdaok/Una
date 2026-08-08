import { createPcmStreamPlayer } from './pcmStreamPlayer.js';
import { createVoiceCallSocket } from './voiceCallSocket.js';
import { createVoiceCapture } from './voiceCapture.js';


export function createVoiceCallController(dependencies = {}) {
  const documentImpl = dependencies.documentImpl || (typeof document === 'undefined' ? null : document);
  const player = dependencies.player || (dependencies.createPlayer || createPcmStreamPlayer)(
    dependencies.playerDependencies,
  );
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
  let lastTurnId = 0;
  let inputSequence = 0;
  let recording = false;
  let started = false;
  let ending = false;
  let visibilityAttached = false;
  let cleanupPromise = null;

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
    player.interrupt(turnId);
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
    if (result.accepted) inputSequence += 1;
  }

  function handleSpeechEnd() {
    if (!recording || !value.sessionId || value.activeTurnId === null) return;
    recording = false;
    socket.sendSpeechEnd(value.sessionId, value.activeTurnId);
    publish({ state: 'recognizing' });
  }

  function handleMisfire() {
    if (!recording) return;
    recording = false;
    cancelActiveTurn();
    publish({ state: 'listening', activeTurnId: null });
  }

  const capture = dependencies.capture || (dependencies.createCapture || createVoiceCapture)({
    onSpeechStart: handleSpeechStart,
    onPcm: handleCapturedPcm,
    onSpeechEnd: handleSpeechEnd,
    onMisfire: handleMisfire,
    onError: fail,
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
    player.enqueue(header.turn_id, header.sequence, pcm);
  }

  async function handleVisibilityChange() {
    if (!documentImpl || documentImpl.visibilityState !== 'hidden' || ending) return;
    recording = false;
    cancelActiveTurn();
    await capture.pause();
    publish({ state: 'interrupted', activeTurnId: null });
  }

  const socket = dependencies.socket || (dependencies.createSocket || createVoiceCallSocket)({
    ...dependencies.socketDependencies,
    onControl: event => handleControl(event).catch(fail),
    onPcm: handleOutputPcm,
    onError: fail,
    onClose: () => {
      if (!ending && value.state !== 'ended') {
        fail(new Error('语音连接已断开'));
        void cleanupLocalResources();
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

  async function start() {
    if (ending) throw new Error('通话已经结束');
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
