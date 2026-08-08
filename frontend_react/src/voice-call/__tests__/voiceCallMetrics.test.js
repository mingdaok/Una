import { describe, expect, it, vi } from 'vitest';

import { createVoiceCallMetricReporter, sanitizeVoiceCallMetric } from '../voiceCallMetrics.js';


describe('voice call metrics', () => {
  it('只保留白名单标量并截断 session id', () => {
    const safe = sanitizeVoiceCallMetric({
      session_id: '1234567890', turn_id: 2, sequence: 3,
      stage: 'first_audio', status: 'completed', duration_ms: 12.34567, byte_count: 640,
      ticket: 'secret', Authorization: 'Bearer secret', text: '私人内容',
      pcm: new Uint8Array([1, 2]), url: '/ws/voice-call?ticket=secret',
    });
    expect(safe).toEqual({
      session_id: '12345678', turn_id: 2, sequence: 3,
      stage: 'first_audio', status: 'completed', duration_ms: 12.346, byte_count: 640,
    });
    expect(JSON.stringify(safe)).not.toMatch(/secret|私人内容|ticket|Authorization|pcm|url/);
  });

  it('拒绝未知阶段并安全处理循环对象和抛错 getter', () => {
    const cyclic = { stage: 'vad_endpoint' };
    cyclic.self = cyclic;
    expect(sanitizeVoiceCallMetric(cyclic)).toEqual({ stage: 'vad_endpoint' });

    const hostile = { stage: 'first_audio' };
    Object.defineProperty(hostile, 'session_id', { get: () => { throw new Error('secret'); } });
    expect(sanitizeVoiceCallMetric(hostile)).toBeNull();
    expect(sanitizeVoiceCallMetric({ stage: 'not_allowed', text: 'secret' })).toBeNull();
  });

  it('sink 失败不会向调用链抛出', () => {
    const sink = vi.fn(() => { throw new Error('sink failed'); });
    const report = createVoiceCallMetricReporter(sink);
    expect(() => report({ stage: 'barge_in_stop', status: 'completed' })).not.toThrow();
    expect(sink).toHaveBeenCalledTimes(1);
  });
});
