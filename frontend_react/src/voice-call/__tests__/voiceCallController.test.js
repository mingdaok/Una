import { describe, expect, it, vi } from 'vitest';

import { createVoiceCallController } from '../voiceCallController.js';


function makeFixture() {
  const order = [];
  let socketCallbacks;
  let captureCallbacks;
  const socket = {
    connect: vi.fn(async () => {}),
    sendCallStart: vi.fn(() => { order.push('socket.call_start'); return { accepted: true }; }),
    sendSpeechStart: vi.fn((_session, turn) => {
      order.push(`socket.user_speech_start:${turn}`);
      return { accepted: true };
    }),
    sendAudio: vi.fn((_session, turn, sequence) => {
      order.push(`socket.audio:${turn}:${sequence}`);
      return { accepted: true };
    }),
    sendSpeechEnd: vi.fn((_session, turn) => {
      order.push(`socket.user_speech_end:${turn}`);
      return { accepted: true };
    }),
    sendInterrupt: vi.fn((_session, turn) => {
      order.push(`socket.interrupt:${turn}`);
      return { accepted: true };
    }),
    sendCallEnd: vi.fn(() => { order.push('socket.call_end'); return { accepted: true }; }),
    disconnect: vi.fn(() => order.push('socket.disconnect')),
  };
  const capture = {
    start: vi.fn(async () => order.push('capture.start')),
    pause: vi.fn(async () => order.push('capture.pause')),
    destroy: vi.fn(async () => order.push('capture.destroy')),
    speechStart: () => captureCallbacks.onSpeechStart(),
    pcm: pcm => captureCallbacks.onPcm(pcm),
    speechEnd: () => captureCallbacks.onSpeechEnd(),
    misfire: () => captureCallbacks.onMisfire(),
  };
  const player = {
    start: vi.fn(turn => order.push(`player.start:${turn}`)),
    enqueue: vi.fn((turn, sequence) => {
      order.push(`player.enqueue:${turn}:${sequence}`);
      return { accepted: true };
    }),
    seal: vi.fn(turn => order.push(`player.seal:${turn}`)),
    interrupt: vi.fn(turn => {
      order.push(`player.interrupt:${turn}`);
      return { accepted: true };
    }),
    destroy: vi.fn(async () => order.push('player.destroy')),
  };
  const visibilityListeners = new Set();
  const documentImpl = {
    visibilityState: 'visible',
    addEventListener: vi.fn((_name, listener) => visibilityListeners.add(listener)),
    removeEventListener: vi.fn((_name, listener) => visibilityListeners.delete(listener)),
    async setVisibility(next) {
      this.visibilityState = next;
      await Promise.all([...visibilityListeners].map(listener => listener()));
    },
  };
  const controller = createVoiceCallController({
    documentImpl,
    player,
    createCapture: callbacks => {
      captureCallbacks = callbacks;
      return capture;
    },
    createSocket: callbacks => {
      socketCallbacks = callbacks;
      return socket;
    },
  });
  socket.control = event => socketCallbacks.onControl(event);
  socket.pcm = (header, pcm) => socketCallbacks.onPcm(header, pcm);
  socket.close = () => socketCallbacks.onClose({ code: 1006 });
  return { controller, socket, capture, player, order, documentImpl };
}


async function ready(fixture) {
  await fixture.controller.start();
  await fixture.socket.control({ type: 'call_ready', session_id: 's1' });
  expect(fixture.controller.snapshot().state).toBe('listening');
}


describe('voice call controller', () => {
  it('连接完成后 call_start，call_ready 后才启动唯一采集器', async () => {
    const fixture = makeFixture();
    await fixture.controller.start();
    expect(fixture.order).toEqual(['socket.call_start']);
    expect(fixture.controller.snapshot().state).toBe('connecting');

    await fixture.socket.control({ type: 'call_ready', session_id: 's1' });
    expect(fixture.order).toEqual(['socket.call_start', 'capture.start']);
    expect(fixture.controller.snapshot()).toMatchObject({
      state: 'listening',
      sessionId: 's1',
    });
  });

  it('speaking 时检测到用户语音会先停播，再 interrupt，再开始新 turn', async () => {
    const fixture = makeFixture();
    await ready(fixture);
    fixture.capture.speechStart();
    fixture.capture.speechEnd();
    await fixture.socket.control({
      type: 'tts_start', session_id: 'other-session', turn_id: 1,
      sample_rate: 32000, channels: 1, sample_width: 2,
    });
    expect(fixture.player.start).not.toHaveBeenCalled();
    await fixture.socket.control({
      type: 'tts_start', session_id: 's1', turn_id: 1,
      sample_rate: 32000, channels: 1, sample_width: 2,
    });
    expect(fixture.controller.snapshot().state).toBe('speaking');
    fixture.order.length = 0;

    fixture.capture.speechStart();
    expect(fixture.order).toEqual([
      'player.interrupt:1',
      'socket.interrupt:1',
      'socket.user_speech_start:2',
    ]);
    expect(fixture.controller.snapshot()).toMatchObject({
      state: 'listening',
      activeTurnId: 2,
    });
  });

  it('pre-roll 从 sequence 0 开始、每帧递增，结束后进入 recognizing', async () => {
    const fixture = makeFixture();
    await ready(fixture);
    fixture.order.length = 0;
    fixture.capture.speechStart();
    fixture.capture.pcm(new ArrayBuffer(3840));
    fixture.capture.pcm(new ArrayBuffer(640));
    fixture.capture.speechEnd();

    expect(fixture.order).toEqual([
      'socket.user_speech_start:1',
      'socket.audio:1:0',
      'socket.audio:1:1',
      'socket.user_speech_end:1',
    ]);
    expect(fixture.controller.snapshot().state).toBe('recognizing');
  });

  it('只接收当前轮 ASR/LLM/TTS/PCM，丢弃旧轮事件', async () => {
    const fixture = makeFixture();
    await ready(fixture);
    fixture.capture.speechStart();
    fixture.capture.speechEnd();
    await fixture.socket.control({
      type: 'transcript_final', session_id: 's1', turn_id: 1, text: '你好',
    });
    expect(fixture.controller.snapshot()).toMatchObject({ state: 'thinking', transcript: '你好' });
    await fixture.socket.control({
      type: 'assistant_text_delta', session_id: 's1', turn_id: 1, text: '我在',
    });
    await fixture.socket.control({
      type: 'tts_start', session_id: 's1', turn_id: 1,
      sample_rate: 32000, channels: 1, sample_width: 2,
    });
    fixture.socket.pcm({ session_id: 's1', turn_id: 1, sequence: 0 }, new ArrayBuffer(4));
    await fixture.socket.control({ type: 'tts_end', session_id: 's1', turn_id: 1 });
    expect(fixture.player.start).toHaveBeenCalledTimes(1);
    expect(fixture.player.enqueue).toHaveBeenCalledWith(1, 0, expect.any(ArrayBuffer));
    expect(fixture.player.seal).toHaveBeenCalledWith(1);

    fixture.capture.speechStart();
    await fixture.socket.control({
      type: 'assistant_text_delta', session_id: 's1', turn_id: 1, text: '迟到',
    });
    fixture.socket.pcm({ session_id: 's1', turn_id: 1, sequence: 1 }, new ArrayBuffer(4));
    expect(fixture.controller.snapshot().assistantText).toBe('');
    expect(fixture.player.enqueue).toHaveBeenCalledTimes(1);
  });

  it('当前轮服务端错误立即停播并进入可见 error 终态', async () => {
    const fixture = makeFixture();
    await ready(fixture);
    fixture.capture.speechStart();
    fixture.capture.speechEnd();

    await fixture.socket.control({
      type: 'call_error', session_id: 's1', turn_id: 1,
      code: 'TTS_FAILED', message: '克隆语音暂时不可用',
    });

    expect(fixture.player.interrupt).toHaveBeenCalledWith(1);
    expect(fixture.controller.snapshot()).toMatchObject({
      state: 'error',
      activeTurnId: null,
      error: '克隆语音暂时不可用',
    });
  });

  it('静音和后台都会暂停且取消当前轮，恢复必须由用户操作', async () => {
    const fixture = makeFixture();
    await ready(fixture);
    fixture.capture.speechStart();
    await fixture.controller.toggleMute();
    fixture.capture.pcm(new ArrayBuffer(4));
    expect(fixture.capture.pause).toHaveBeenCalledTimes(1);
    expect(fixture.socket.sendAudio).not.toHaveBeenCalled();
    expect(fixture.controller.snapshot()).toMatchObject({ muted: true, state: 'interrupted' });

    await fixture.controller.toggleMute();
    expect(fixture.capture.start).toHaveBeenCalledTimes(2);
    fixture.capture.speechStart();
    await fixture.documentImpl.setVisibility('hidden');
    expect(fixture.controller.snapshot().state).toBe('interrupted');
    const startsBeforeVisible = fixture.capture.start.mock.calls.length;
    await fixture.documentImpl.setVisibility('visible');
    expect(fixture.capture.start).toHaveBeenCalledTimes(startsBeforeVisible);
    await fixture.controller.start();
    expect(fixture.capture.start).toHaveBeenCalledTimes(startsBeforeVisible + 1);
  });

  it('end 完整清理采集、播放、socket 和 visibility listener', async () => {
    const fixture = makeFixture();
    await ready(fixture);
    fixture.capture.speechStart();
    fixture.order.length = 0;
    await fixture.controller.end();
    await fixture.controller.end();

    expect(fixture.order).toEqual([
      'player.interrupt:1',
      'socket.call_end',
      'capture.destroy',
      'player.destroy',
      'socket.disconnect',
    ]);
    expect(fixture.documentImpl.removeEventListener).toHaveBeenCalledTimes(1);
    expect(fixture.controller.snapshot()).toMatchObject({
      state: 'ended', sessionId: null, activeTurnId: null,
    });
  });
});
