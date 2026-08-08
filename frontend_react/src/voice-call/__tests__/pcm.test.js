import { afterEach, describe, expect, it, vi } from 'vitest';

import { concatPcm, float32ToPcm16 } from '../pcm.js';


describe('PCM helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('把 Float32 饱和转换为小端 PCM16', () => {
    const view = new DataView(float32ToPcm16(new Float32Array([-2, -1, 0, 1, 2])));
    expect(Array.from({ length: 5 }, (_, index) => view.getInt16(index * 2, true)))
      .toEqual([-32768, -32768, 0, 32767, 32767]);
  });

  it('拼接时尊重 TypedArray 的 byteOffset 且不修改输入', () => {
    const source = new Uint8Array([99, 1, 2, 3, 4, 88]);
    const output = concatPcm([
      source.subarray(1, 3),
      new Uint8Array([3, 4]).buffer,
    ]);

    expect(Array.from(new Uint8Array(output))).toEqual([1, 2, 3, 4]);
    expect(Array.from(source)).toEqual([99, 1, 2, 3, 4, 88]);
  });

  it('拒绝不明确的输入类型', () => {
    expect(() => float32ToPcm16([0])).toThrow('Float32Array');
    expect(() => concatPcm(["pcm"])).toThrow('ArrayBuffer');
  });

  it('AudioWorklet 以分段加权平均把 48kHz 降为 16kHz 的 320 样本帧', async () => {
    let Processor;
    const postMessage = vi.fn();
    vi.stubGlobal('sampleRate', 48000);
    vi.stubGlobal('AudioWorkletProcessor', class {
      constructor() {
        this.port = { postMessage };
      }
    });
    vi.stubGlobal('registerProcessor', (name, implementation) => {
      expect(name).toBe('pcm-capture');
      Processor = implementation;
    });
    await import('../../../public/voice/pcm-capture.worklet.js?worklet-test');

    const processor = new Processor();
    processor.process([[new Float32Array(960).fill(0.25)]]);

    expect(postMessage).toHaveBeenCalledTimes(1);
    const output = new Float32Array(postMessage.mock.calls[0][0]);
    expect(output).toHaveLength(320);
    expect(Array.from(output).every(sample => sample === 0.25)).toBe(true);
  });
});
