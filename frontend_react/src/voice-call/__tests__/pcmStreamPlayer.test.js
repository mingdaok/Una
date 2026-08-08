import { describe, expect, it, vi } from 'vitest';

import { createPcmStreamPlayer } from '../pcmStreamPlayer.js';


function pcmForMs(milliseconds, sampleRate = 32000) {
  return new ArrayBuffer(Math.round(sampleRate * milliseconds / 1000) * 2);
}

function makeAudio({ currentTime = 10, state = 'running' } = {}) {
  const starts = [];
  const sources = [];
  const metrics = [];
  const context = {
    currentTime,
    state,
    destination: {},
    resume: vi.fn(async () => { context.state = 'running'; }),
    close: vi.fn(async () => { context.state = 'closed'; }),
    createBuffer: vi.fn((channels, length, sampleRate) => {
      const samples = new Float32Array(length);
      return {
        duration: length / sampleRate,
        getChannelData: () => samples,
      };
    }),
    createBufferSource: vi.fn(() => {
      const source = {
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(at => starts.push({ sequence: source.__voiceSequence, at })),
        stop: vi.fn(),
        onended: null,
      };
      sources.push(source);
      return source;
    }),
  };
  const player = createPcmStreamPlayer({
    createAudioContext: () => context,
    now: () => 1234,
    reportMetric: (name, detail) => metrics.push({ name, detail }),
  });
  return { player, context, starts, sources, metrics };
}


const FORMAT = { sample_rate: 32000, channels: 1, sample_width: 2 };


describe('PCM stream player', () => {
  it('累计 120ms 后按 sequence 在单一时间轴连续调度', async () => {
    const audio = makeAudio();
    audio.player.start(7, FORMAT);
    audio.player.enqueue(7, 1, pcmForMs(60));
    audio.player.enqueue(7, 0, pcmForMs(60));
    await audio.player.whenScheduled();

    expect(audio.starts.map(call => call.sequence)).toEqual([0, 1]);
    expect(audio.starts[0].at).toBeCloseTo(10.03, 5);
    expect(audio.starts[1].at).toBeCloseTo(audio.starts[0].at + 0.06, 5);
  });

  it('插话同步 stop 所有 source 并拒绝迟到分片', async () => {
    const audio = makeAudio();
    audio.player.start(3, FORMAT);
    audio.player.enqueue(3, 0, pcmForMs(120));
    await audio.player.whenScheduled();

    expect(audio.player.interrupt(3)).toEqual({ accepted: true });
    expect(audio.sources.every(source => source.stop.mock.calls.length === 1)).toBe(true);
    expect(audio.player.enqueue(3, 1, pcmForMs(20)))
      .toEqual({ accepted: false, reason: 'stale' });
  });

  it('拒绝重复序号并在 seal 报告缺失序号', async () => {
    const audio = makeAudio();
    audio.player.start(4, FORMAT);
    expect(audio.player.enqueue(4, 1, pcmForMs(60))).toEqual({ accepted: true });
    expect(audio.player.enqueue(4, 1, pcmForMs(60)))
      .toEqual({ accepted: false, reason: 'duplicate' });
    expect(audio.player.seal(4)).toEqual({
      accepted: false,
      reason: 'missing_sequence',
      expected_sequence: 0,
    });
    await audio.player.whenScheduled();

    expect(audio.starts).toEqual([]);
    expect(audio.metrics).toEqual([{
      name: 'pcm_sequence_gap',
      detail: { turn_id: 4, expected_sequence: 0, at_ms: 1234 },
    }]);
  });

  it('总音频不足 120ms 时 seal 仍立即播放', async () => {
    const audio = makeAudio();
    audio.player.start(5, FORMAT);
    audio.player.enqueue(5, 0, pcmForMs(40));
    await audio.player.whenScheduled();
    expect(audio.starts).toEqual([]);

    expect(audio.player.seal(5)).toEqual({ accepted: true });
    expect(audio.player.enqueue(5, 1, pcmForMs(20)))
      .toEqual({ accepted: false, reason: 'sealed' });
    await audio.player.whenScheduled();
    expect(audio.starts.map(call => call.sequence)).toEqual([0]);
  });

  it('拒绝非法格式、奇数字节和错误序号', () => {
    const audio = makeAudio();
    expect(() => audio.player.start(1, { ...FORMAT, channels: 2 })).toThrow('channels');
    audio.player.start(1, FORMAT);
    expect(audio.player.enqueue(1, 0, new ArrayBuffer(3))).toMatchObject({
      accepted: false,
      reason: 'invalid_pcm',
    });
    expect(audio.player.enqueue(1, 5000, pcmForMs(20)))
      .toEqual({ accepted: false, reason: 'invalid_sequence' });
  });

  it('AudioContext 挂起时先 resume 再调度', async () => {
    const audio = makeAudio({ state: 'suspended' });
    audio.player.start(2, FORMAT);
    audio.player.enqueue(2, 0, pcmForMs(120));
    await audio.player.whenScheduled();

    expect(audio.context.resume).toHaveBeenCalledTimes(1);
    expect(audio.starts).toHaveLength(1);
  });

  it('断粮后续播时记录 underflow 指标', async () => {
    const audio = makeAudio();
    audio.player.start(6, FORMAT);
    audio.player.enqueue(6, 0, pcmForMs(120));
    await audio.player.whenScheduled();
    audio.context.currentTime = 11;
    audio.player.enqueue(6, 1, pcmForMs(20));
    await audio.player.whenScheduled();

    expect(audio.metrics).toEqual([{
      name: 'pcm_playback_underflow',
      detail: { turn_id: 6, sequence: 1, gap_ms: 850, at_ms: 1234 },
    }]);
  });

  it('新轮次替换旧轮次，destroy 停止并关闭 context', async () => {
    const audio = makeAudio();
    audio.player.start(8, FORMAT);
    audio.player.enqueue(8, 0, pcmForMs(120));
    await audio.player.whenScheduled();
    audio.player.start(9, FORMAT);

    expect(audio.sources[0].stop).toHaveBeenCalledTimes(1);
    expect(audio.player.enqueue(8, 1, pcmForMs(20)))
      .toEqual({ accepted: false, reason: 'stale' });
    await audio.player.destroy();
    await audio.player.destroy();
    expect(audio.context.close).toHaveBeenCalledTimes(1);
    expect(audio.player.snapshot().status).toBe('destroyed');
  });
});
