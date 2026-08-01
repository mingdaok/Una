import { describe, expect, it } from 'vitest';

import {
  INPUT_SAMPLE_RATE,
  MAX_INPUT_BYTES,
  MAX_PCM_CHUNK_BYTES,
  MAX_SEQUENCE,
  MAX_TURN_ID,
  makeClientEvent,
  parseServerEvent,
  validateBinaryHeader,
} from '../protocol';

describe('voice-call protocol', () => {
  it('creates documented client events without unknown fields', () => {
    expect(makeClientEvent('call_start')).toBe('{"type":"call_start"}');
    expect(makeClientEvent('user_speech_start', { session_id: 's1', turn_id: 1 }))
      .toBe('{"type":"user_speech_start","session_id":"s1","turn_id":1}');
    expect(() => makeClientEvent('call_start', { debug: true })).toThrow(/未知字段/);
    expect(() => makeClientEvent('unknown_event')).toThrow(/未知事件/);
  });

  it('serializes input audio metadata with an explicit input direction', () => {
    expect(makeClientEvent('input_audio_chunk', {
      session_id: 's1', turn_id: 1, direction: 'input', sequence: 0, byte_length: 320,
    })).toBe('{"type":"input_audio_chunk","session_id":"s1","turn_id":1,"direction":"input","sequence":0,"byte_length":320}');
    expect(() => makeClientEvent('input_audio_chunk', {
      session_id: 's1', turn_id: 1, sequence: 0, byte_length: 320,
    })).toThrow(/缺少字段/);
    expect(() => makeClientEvent('input_audio_chunk', {
      session_id: 's1', turn_id: 1, direction: 'output', sequence: 0, byte_length: 320,
    })).toThrow(/direction/);
  });

  it('rejects serialized client control messages larger than 8 KiB', () => {
    expect(() => makeClientEvent('call_end', { session_id: 'x'.repeat(8192) })).toThrow(/8192/);
  });

  it('serializes interrupt with the positive safe integer turn it cancels', () => {
    expect(makeClientEvent('interrupt', { session_id: 's1', turn_id: MAX_TURN_ID }))
      .toBe(`{"type":"interrupt","session_id":"s1","turn_id":${MAX_TURN_ID}}`);
    expect(() => makeClientEvent('interrupt', { session_id: 's1' })).toThrow(/缺少字段/);
    expect(() => makeClientEvent('interrupt', { session_id: 's1', turn_id: 0 })).toThrow(/turn_id/);
    expect(() => makeClientEvent('interrupt', { session_id: 's1', turn_id: MAX_TURN_ID + 1 })).toThrow(/turn_id/);
  });

  it('parses only documented server events with exact fields and value domains', () => {
    expect(parseServerEvent('{"type":"call_ready","session_id":"s1"}'))
      .toEqual({ type: 'call_ready', session_id: 's1' });
    expect(parseServerEvent('{"type":"tts_start","session_id":"s1","turn_id":1,"sample_rate":24000,"channels":1,"sample_width":2}'))
      .toEqual({ type: 'tts_start', session_id: 's1', turn_id: 1, sample_rate: 24000, channels: 1, sample_width: 2 });
    expect(parseServerEvent('{"type":"output_audio_chunk","session_id":"s1","turn_id":1,"direction":"output","sequence":0,"byte_length":320}'))
      .toEqual({ type: 'output_audio_chunk', session_id: 's1', turn_id: 1, direction: 'output', sequence: 0, byte_length: 320 });
    expect(parseServerEvent('{"type":"turn_cancelled","session_id":"s1","turn_id":1,"reason":"interrupted"}'))
      .toEqual({ type: 'turn_cancelled', session_id: 's1', turn_id: 1, reason: 'interrupted' });
    expect(parseServerEvent('{"type":"call_error","session_id":"s1","turn_id":1,"code":"tts_failed","message":"failed"}'))
      .toEqual({ type: 'call_error', session_id: 's1', turn_id: 1, code: 'tts_failed', message: 'failed' });
    expect(() => parseServerEvent('{"type":"not_a_server_event"}')).toThrow(/未知事件/);
    expect(() => parseServerEvent('{"type":"transcript_final","session_id":"s1","turn_id":1}'))
      .toThrow(/缺少字段/);
    expect(() => parseServerEvent('{"type":"call_ready","session_id":"s1","debug":true}'))
      .toThrow(/未知字段/);
    expect(() => parseServerEvent('{"type":"assistant_text_delta","session_id":"s1","turn_id":0,"text":"hi"}'))
      .toThrow(/turn_id/);
    expect(() => parseServerEvent('{"type":"tts_start","session_id":"s1","turn_id":1,"sample_rate":24000.5,"channels":1,"sample_width":2}'))
      .toThrow(/sample_rate/);
    expect(() => parseServerEvent('{"type":"output_audio_chunk","session_id":"s1","turn_id":1,"direction":"input","sequence":0,"byte_length":320}'))
      .toThrow(/direction/);
    expect(() => parseServerEvent('{"type":"output_audio_chunk","session_id":"s1","turn_id":1,"direction":"output","sequence":0,"byte_length":319}'))
      .toThrow(/偶数字节/);
    expect(() => parseServerEvent('{"type":"turn_cancelled","session_id":"s1","turn_id":1}'))
      .toThrow(/缺少字段/);
    expect(() => parseServerEvent('{"type":"call_error","session_id":"s1","code":"x","message":"failed"}'))
      .toThrow(/缺少字段/);
    expect(() => parseServerEvent('[]')).toThrow(/对象/);
    expect(() => parseServerEvent(JSON.stringify({ type: 'call_ready', padding: 'x'.repeat(8192) })))
      .toThrow(/8192/);
  });

  it.each([
    ['call_ready', '{"type":"call_ready","session_id":"s1"}'],
    ['transcript_final', '{"type":"transcript_final","session_id":"s1","turn_id":1,"text":"hello"}'],
    ['assistant_text_delta', '{"type":"assistant_text_delta","session_id":"s1","turn_id":1,"text":"hello"}'],
    ['assistant_text_end', '{"type":"assistant_text_end","session_id":"s1","turn_id":1}'],
    ['tts_start', '{"type":"tts_start","session_id":"s1","turn_id":1,"sample_rate":24000,"channels":1,"sample_width":2}'],
    ['output_audio_chunk', '{"type":"output_audio_chunk","session_id":"s1","turn_id":1,"direction":"output","sequence":0,"byte_length":320}'],
    ['tts_end', '{"type":"tts_end","session_id":"s1","turn_id":1}'],
    ['turn_cancelled', '{"type":"turn_cancelled","session_id":"s1","turn_id":1,"reason":"interrupted"}'],
    ['call_error', '{"type":"call_error","session_id":"s1","turn_id":1,"code":"tts_failed","message":"failed"}'],
    ['call_ended', '{"type":"call_ended","session_id":"s1"}'],
  ])('accepts the documented %s server event', (_name, raw) => {
    expect(parseServerEvent(raw).type).toBe(_name);
  });

  it('accepts the fixed input format and documented constants', () => {
    expect(INPUT_SAMPLE_RATE).toBe(16000);
    expect(MAX_INPUT_BYTES).toBe(960000);
    expect(MAX_PCM_CHUNK_BYTES).toBe(65536);
    expect(MAX_SEQUENCE).toBe(4095);
  });

  it('rejects non-positive turns and odd-byte PCM headers', () => {
    expect(() => validateBinaryHeader({
      session_id: 's1', direction: 'output', turn_id: 0, sequence: 1, byte_length: 320,
    })).toThrow(/turn_id/);
    expect(() => validateBinaryHeader({
      session_id: 's1', direction: 'output', turn_id: 1, sequence: 1, byte_length: 319,
    })).toThrow(/偶数字节/);
  });

  it('uses the shared positive safe-integer turn domain', () => {
    expect(MAX_TURN_ID).toBe(Number.MAX_SAFE_INTEGER);
    expect(validateBinaryHeader({
      session_id: 's1', direction: 'output', turn_id: MAX_TURN_ID, sequence: 1, byte_length: 320,
    }).turn_id).toBe(MAX_TURN_ID);
    expect(() => validateBinaryHeader({
      session_id: 's1', direction: 'output', turn_id: MAX_TURN_ID + 1, sequence: 1, byte_length: 320,
    })).toThrow(/turn_id/);
  });

  it('rejects unknown fields and values outside the binary frame domain', () => {
    expect(() => validateBinaryHeader({
      session_id: 's1', direction: 'input', turn_id: 1, sequence: MAX_SEQUENCE + 1, byte_length: 320,
    })).toThrow(/sequence/);
    expect(() => validateBinaryHeader({
      session_id: 's1', direction: 'input', turn_id: 1, sequence: 0, byte_length: MAX_PCM_CHUNK_BYTES + 2,
    })).toThrow(/65536/);
    expect(() => validateBinaryHeader({
      session_id: 's1', direction: 'input', turn_id: 1, sequence: 0, byte_length: 320, debug: true,
    })).toThrow(/未知字段/);
  });
});
