import { createWebSocketTicket } from '../auth/session.js';
import { getWebSocketBase } from '../config.js';
import { makeClientEvent, parseServerEvent } from './protocol.js';


export function createVoiceCallSocket(dependencies = {}) {
  const createTicket = dependencies.createTicket || (() => createWebSocketTicket('语音通话'));
  const WebSocketImpl = dependencies.WebSocketImpl || WebSocket;
  const websocketBase = (dependencies.websocketBase || getWebSocketBase()).replace(/\/$/, '');
  const onControl = dependencies.onControl || (() => {});
  const onPcm = dependencies.onPcm || (() => {});
  const onClose = dependencies.onClose || (() => {});
  const onError = dependencies.onError || (() => {});

  let socket = null;
  let connectPromise = null;
  let pendingHeader = null;
  let closed = false;

  function protocolFailure(message) {
    const error = message instanceof Error ? message : new Error(String(message));
    onError(error);
    pendingHeader = null;
    if (socket && socket.readyState < 2) socket.close(1003, 'protocol error');
  }

  function handleMessage(event) {
    if (closed) return;
    const data = event.data;
    if (typeof data === 'string') {
      if (pendingHeader) {
        protocolFailure('音频元数据后必须紧跟 PCM 二进制数据');
        return;
      }
      try {
        const control = parseServerEvent(data);
        if (control.type === 'output_audio_chunk') pendingHeader = control;
        else onControl(control);
      } catch (error) {
        protocolFailure(error);
      }
      return;
    }

    let pcm;
    if (data instanceof ArrayBuffer) pcm = data;
    else if (ArrayBuffer.isView(data)) {
      pcm = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    } else {
      protocolFailure('语音二进制消息必须为 ArrayBuffer');
      return;
    }
    if (!pendingHeader) {
      protocolFailure('PCM 二进制数据缺少元数据');
      return;
    }
    const header = pendingHeader;
    pendingHeader = null;
    if (pcm.byteLength !== header.byte_length) {
      protocolFailure('PCM 长度与元数据不一致');
      return;
    }
    onPcm(header, pcm);
  }

  async function connect() {
    if (closed) throw new Error('语音连接已关闭');
    if (connectPromise) return connectPromise;
    connectPromise = (async () => {
      const ticket = await createTicket();
      const url = `${websocketBase}/ws/voice-call?ticket=${encodeURIComponent(ticket)}`;
      socket = new WebSocketImpl(url);
      socket.binaryType = 'arraybuffer';
      await new Promise((resolve, reject) => {
        let settled = false;
        socket.onopen = () => {
          settled = true;
          resolve();
        };
        socket.onerror = () => {
          const error = new Error('语音 WebSocket 连接失败');
          onError(error);
          if (!settled) {
            reject(error);
            if (socket.readyState < 2) socket.close(1011, 'connect failed');
          }
        };
        socket.onclose = event => {
          pendingHeader = null;
          const wasClosed = closed;
          closed = true;
          onClose(event);
          if (!settled && !wasClosed) reject(new Error('语音 WebSocket 在连接前关闭'));
        };
        socket.onmessage = handleMessage;
      });
    })();
    return connectPromise;
  }

  function send(type, fields = {}) {
    if (!socket || socket.readyState !== 1 || closed) {
      return { accepted: false, reason: 'closed' };
    }
    socket.send(makeClientEvent(type, fields));
    return { accepted: true };
  }

  function sendAudio(sessionId, turnId, sequence, pcm) {
    if (!socket || socket.readyState !== 1 || closed) {
      return { accepted: false, reason: 'closed' };
    }
    const owned = pcm instanceof ArrayBuffer
      ? pcm
      : ArrayBuffer.isView(pcm)
        ? pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength)
        : null;
    if (!owned || !owned.byteLength) return { accepted: false, reason: 'invalid_pcm' };
    let metadata;
    try {
      metadata = makeClientEvent('input_audio_chunk', {
        session_id: sessionId,
        turn_id: turnId,
        direction: 'input',
        sequence,
        byte_length: owned.byteLength,
      });
    } catch (error) {
      return { accepted: false, reason: 'invalid_pcm', error };
    }
    socket.send(metadata);
    socket.send(owned);
    return { accepted: true };
  }

  function disconnect(code = 1000) {
    if (closed) return;
    closed = true;
    pendingHeader = null;
    if (socket && socket.readyState < 2) socket.close(code);
  }

  return {
    connect,
    sendCallStart: () => send('call_start'),
    sendSpeechStart: (sessionId, turnId) => send('user_speech_start', {
      session_id: sessionId, turn_id: turnId,
    }),
    sendAudio,
    sendSpeechEnd: (sessionId, turnId) => send('user_speech_end', {
      session_id: sessionId, turn_id: turnId,
    }),
    sendInterrupt: (sessionId, turnId) => send('interrupt', {
      session_id: sessionId, turn_id: turnId,
    }),
    sendCallEnd: sessionId => send('call_end', { session_id: sessionId }),
    disconnect,
    snapshot: () => Object.freeze({
      connected: Boolean(socket && socket.readyState === 1 && !closed),
      closed,
      awaitingPcm: Boolean(pendingHeader),
    }),
  };
}
