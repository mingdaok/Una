import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createVoiceCallSocket } from '../voiceCallSocket.js';


class FakeWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    this.binaryType = '';
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = 1;
    this.onopen?.({});
  }

  message(data) {
    this.onmessage?.({ data });
  }

  send(data) {
    this.sent.push(data);
  }

  close(code = 1000) {
    this.closeCode = code;
    this.readyState = 3;
    this.onclose?.({ code });
  }
}


function fixture() {
  const callbacks = {
    onControl: vi.fn(),
    onPcm: vi.fn(),
    onClose: vi.fn(),
    onError: vi.fn(),
  };
  const createTicket = vi.fn(async () => 'once ticket');
  const socket = createVoiceCallSocket({
    createTicket,
    WebSocketImpl: FakeWebSocket,
    websocketBase: 'ws://127.0.0.1:8000',
    ...callbacks,
  });
  return { socket, createTicket, ...callbacks };
}


async function connect(fixtureValue) {
  const promise = fixtureValue.socket.connect();
  await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
  const websocket = FakeWebSocket.instances[0];
  websocket.open();
  await promise;
  return websocket;
}


function outputHeader(overrides = {}) {
  return JSON.stringify({
    type: 'output_audio_chunk',
    session_id: 's1',
    turn_id: 2,
    direction: 'output',
    sequence: 0,
    byte_length: 4,
    ...overrides,
  });
}


describe('voice call socket', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
  });

  it('只把与 output_audio_chunk 元数据相邻且等长的 bytes 交给播放器', async () => {
    const value = fixture();
    const websocket = await connect(value);
    websocket.message(outputHeader());
    websocket.message(new Uint8Array([0, 1, 2, 3]).buffer);

    expect(value.onPcm).toHaveBeenCalledWith(
      expect.objectContaining({ turn_id: 2, sequence: 0 }),
      expect.any(ArrayBuffer),
    );
    expect(websocket.binaryType).toBe('arraybuffer');
  });

  it.each([
    ['bytes 无 header', websocket => websocket.message(new ArrayBuffer(4))],
    ['长度不匹配', websocket => {
      websocket.message(outputHeader());
      websocket.message(new ArrayBuffer(2));
    }],
    ['两个 header 连续', websocket => {
      websocket.message(outputHeader());
      websocket.message(outputHeader({ sequence: 1 }));
    }],
    ['非法 JSON', websocket => websocket.message('{bad json')],
  ])('%s 会报告协议错误并关闭连接', async (_name, trigger) => {
    const value = fixture();
    const websocket = await connect(value);
    trigger(websocket);

    expect(value.onError).toHaveBeenCalledTimes(1);
    expect(websocket.closeCode).toBe(1003);
    expect(value.onPcm).not.toHaveBeenCalled();
  });

  it('一次连接只请求一次票据并按相邻帧发送上行 PCM', async () => {
    const value = fixture();
    const firstConnect = value.socket.connect();
    const secondConnect = value.socket.connect();
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    const websocket = FakeWebSocket.instances[0];
    websocket.open();
    await Promise.all([firstConnect, secondConnect]);

    expect(value.createTicket).toHaveBeenCalledTimes(1);
    expect(websocket.url).toBe('ws://127.0.0.1:8000/ws/voice-call?ticket=once%20ticket');
    expect(value.socket.sendAudio('s1', 1, 0, new ArrayBuffer(4)))
      .toEqual({ accepted: true });
    expect(JSON.parse(websocket.sent[0])).toMatchObject({
      type: 'input_audio_chunk',
      sequence: 0,
      byte_length: 4,
    });
    expect(websocket.sent[1]).toBeInstanceOf(ArrayBuffer);
    expect(value.socket.sendAudio('s1', 1, 1, new ArrayBuffer(3))).toMatchObject({
      accepted: false,
      reason: 'invalid_pcm',
    });
  });

  it('关闭后不自动连接或恢复旧轮次', async () => {
    const value = fixture();
    const websocket = await connect(value);
    value.socket.disconnect();

    expect(websocket.closeCode).toBe(1000);
    await expect(value.socket.connect()).rejects.toThrow('已关闭');
    expect(value.createTicket).toHaveBeenCalledTimes(1);
    expect(value.socket.sendSpeechEnd('s1', 1))
      .toEqual({ accepted: false, reason: 'closed' });
  });
});
