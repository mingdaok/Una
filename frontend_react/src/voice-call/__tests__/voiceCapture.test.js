import { describe, expect, it, vi } from 'vitest';

import { createVoiceCapture } from '../voiceCapture.js';


function makeFixture({ vadFailure = null } = {}) {
  const track = { stop: vi.fn() };
  const mediaStream = { getTracks: () => [track] };
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const worklet = {
    port: { onmessage: null },
    disconnect: vi.fn(),
    emit(samples) {
      this.port.onmessage?.({ data: samples.buffer });
    },
  };
  const audioContext = {
    sampleRate: 48000,
    state: 'running',
    audioWorklet: { addModule: vi.fn(async () => {}) },
    createMediaStreamSource: vi.fn(() => source),
    resume: vi.fn(async () => { audioContext.state = 'running'; }),
    suspend: vi.fn(async () => { audioContext.state = 'suspended'; }),
    close: vi.fn(async () => { audioContext.state = 'closed'; }),
  };
  let vadOptions;
  const vad = {
    start: vi.fn(async () => {}),
    pause: vi.fn(async () => {}),
    destroy: vi.fn(async () => {}),
    speechStart: () => vadOptions.onSpeechStart(),
    speechEnd: () => vadOptions.onSpeechEnd(),
    misfire: () => vadOptions.onVADMisfire(),
  };
  const callbacks = {
    onSpeechStart: vi.fn(),
    onPcm: vi.fn(),
    onSpeechEnd: vi.fn(),
    onMisfire: vi.fn(),
    onError: vi.fn(),
  };
  const getUserMedia = vi.fn(async () => mediaStream);
  const dependencies = {
    baseUrl: '/local-app/',
    getUserMedia,
    createAudioContext: () => audioContext,
    createWorkletNode: () => worklet,
    createVad: vi.fn(async options => {
      if (vadFailure) throw vadFailure;
      vadOptions = options;
      return vad;
    }),
  };
  const capture = createVoiceCapture(callbacks, dependencies);
  return {
    capture,
    callbacks,
    dependencies,
    getUserMedia,
    mediaStream,
    track,
    source,
    worklet,
    audioContext,
    vad,
    getVadOptions: () => vadOptions,
  };
}


function emitSamples(worklet, count, value = 0.25) {
  for (let offset = 0; offset < count; offset += 320) {
    worklet.emit(new Float32Array(Math.min(320, count - offset)).fill(value));
  }
}


describe('voice capture', () => {
  it('speech start 先输出 120ms pre-roll 且 destroy 只关闭唯一麦克风轨道', async () => {
    const fixture = makeFixture();
    await fixture.capture.start();
    emitSamples(fixture.worklet, 16000 * 0.2);
    fixture.vad.speechStart();

    expect(fixture.callbacks.onSpeechStart).toHaveBeenCalledTimes(1);
    expect(fixture.callbacks.onPcm.mock.calls[0][0].byteLength).toBe(16000 * 0.12 * 2);
    expect(fixture.getUserMedia).toHaveBeenCalledWith({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    expect(await fixture.getVadOptions().getStream()).toBe(fixture.mediaStream);

    await fixture.capture.destroy();
    await fixture.capture.destroy();
    expect(fixture.track.stop).toHaveBeenCalledTimes(1);
    expect(fixture.vad.pause).toHaveBeenCalledTimes(1);
    expect(fixture.vad.destroy).toHaveBeenCalledTimes(1);
    expect(fixture.source.disconnect).toHaveBeenCalledTimes(1);
    expect(fixture.worklet.disconnect).toHaveBeenCalledTimes(1);
    expect(fixture.audioContext.close).toHaveBeenCalledTimes(1);
  });

  it('显式使用本地 VAD、ONNX 和采集 Worklet 路径', async () => {
    const fixture = makeFixture();
    await fixture.capture.start();

    expect(fixture.audioContext.audioWorklet.addModule)
      .toHaveBeenCalledWith('/local-app/voice/pcm-capture.worklet.js');
    expect(fixture.getVadOptions()).toMatchObject({
      model: 'v5',
      baseAssetPath: '/local-app/vad/',
      onnxWASMBasePath: '/local-app/vad/',
      startOnLoad: false,
      preSpeechPadMs: 120,
    });
    expect(fixture.getVadOptions().baseAssetPath).not.toContain('http');
    await fixture.capture.destroy();
  });

  it('连续发言连同 pre-roll 严格限制在 30 秒 PCM 并重启 VAD 段', async () => {
    const fixture = makeFixture();
    await fixture.capture.start();
    emitSamples(fixture.worklet, 1920);
    fixture.vad.speechStart();
    fixture.worklet.emit(new Float32Array(16000 * 30).fill(0.1));
    await vi.waitFor(() => expect(fixture.vad.pause).toHaveBeenCalledTimes(1));

    const totalBytes = fixture.callbacks.onPcm.mock.calls
      .reduce((total, [pcm]) => total + pcm.byteLength, 0);
    expect(totalBytes).toBe(16000 * 30 * 2);
    expect(fixture.callbacks.onSpeechEnd).toHaveBeenCalledTimes(1);
    expect(fixture.vad.start).toHaveBeenCalledTimes(2);
    await fixture.capture.destroy();
  });

  it('pause 可恢复同一个流，misfire 不提交 speech end', async () => {
    const fixture = makeFixture();
    await fixture.capture.start();
    fixture.vad.speechStart();
    fixture.vad.misfire();
    expect(fixture.callbacks.onMisfire).toHaveBeenCalledTimes(1);
    expect(fixture.callbacks.onSpeechEnd).not.toHaveBeenCalled();

    await fixture.capture.pause();
    await fixture.capture.start();
    expect(fixture.getUserMedia).toHaveBeenCalledTimes(1);
    expect(fixture.vad.start).toHaveBeenCalledTimes(2);
    expect(fixture.audioContext.resume).toHaveBeenCalledTimes(1);
    await fixture.capture.destroy();
  });

  it('VAD 初始化失败时上报错误并释放已经打开的麦克风', async () => {
    const failure = new Error('model failed');
    const fixture = makeFixture({ vadFailure: failure });

    await expect(fixture.capture.start()).rejects.toThrow('model failed');
    expect(fixture.callbacks.onError).toHaveBeenCalledWith(failure);
    expect(fixture.track.stop).toHaveBeenCalledTimes(1);
    expect(fixture.source.disconnect).toHaveBeenCalledTimes(1);
    expect(fixture.worklet.disconnect).toHaveBeenCalledTimes(1);
    expect(fixture.audioContext.close).toHaveBeenCalledTimes(1);
  });
});
