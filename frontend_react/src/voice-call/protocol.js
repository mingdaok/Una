export const INPUT_SAMPLE_RATE = 16000;
export const MAX_INPUT_BYTES = 960000;
export const MAX_PCM_CHUNK_BYTES = 65536;
export const MAX_SEQUENCE = 4095;
export const MAX_TURN_ID = 9007199254740991;
export const MAX_CONTROL_MESSAGE_BYTES = 8192;

const EVENT_FIELDS = Object.freeze({
  call_start: [],
  user_speech_start: ['session_id', 'turn_id'],
  input_audio_chunk: ['session_id', 'turn_id', 'direction', 'sequence', 'byte_length'],
  user_speech_end: ['session_id', 'turn_id'],
  interrupt: ['session_id', 'turn_id'],
  call_end: ['session_id'],
  pong: [],
});

const SERVER_EVENT_FIELDS = Object.freeze({
  call_ready: ['session_id'],
  transcript_final: ['session_id', 'turn_id', 'text'],
  assistant_text_delta: ['session_id', 'turn_id', 'text'],
  assistant_text_end: ['session_id', 'turn_id'],
  tts_start: ['session_id', 'turn_id', 'sample_rate', 'channels', 'sample_width'],
  tts_end: ['session_id', 'turn_id'],
  output_audio_chunk: ['session_id', 'turn_id', 'direction', 'sequence', 'byte_length'],
  turn_cancelled: ['session_id', 'turn_id', 'reason'],
  call_error: ['session_id', 'turn_id', 'code', 'message'],
  call_ended: ['session_id'],
});

function protocolError(message) {
  return new Error(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireNonemptyString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw protocolError(`${field} 不能为空`);
  return value;
}

function requirePositiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_TURN_ID) {
    throw protocolError(`${field} 必须为正整数`);
  }
  return value;
}

function requireExactFields(value, fields) {
  const expected = new Set(fields);
  const actual = Object.keys(value);
  if (actual.some(key => !expected.has(key))) throw protocolError('控制消息含未知字段');
  if (actual.length !== expected.size) throw protocolError('控制消息缺少字段');
}

export function validateBinaryHeader(value) {
  if (!isPlainObject(value)) throw protocolError('二进制帧头必须是对象');
  requireExactFields(value, ['session_id', 'direction', 'turn_id', 'sequence', 'byte_length']);
  const session_id = requireNonemptyString(value.session_id, 'session_id');
  if (value.direction !== 'input' && value.direction !== 'output') {
    throw protocolError('direction 必须为 input 或 output');
  }
  const turn_id = requirePositiveInteger(value.turn_id, 'turn_id');
  if (!Number.isSafeInteger(value.sequence) || value.sequence < 0 || value.sequence > MAX_SEQUENCE) {
    throw protocolError('sequence 超出范围');
  }
  if (!Number.isSafeInteger(value.byte_length) || value.byte_length <= 0 || value.byte_length > MAX_PCM_CHUNK_BYTES) {
    throw protocolError(`byte_length 必须在 1..${MAX_PCM_CHUNK_BYTES}`);
  }
  if (value.byte_length % 2) throw protocolError('PCM16 必须为偶数字节');
  return Object.freeze({
    session_id,
    direction: value.direction,
    turn_id,
    sequence: value.sequence,
    byte_length: value.byte_length,
  });
}

function validateClientEvent(value) {
  if (!isPlainObject(value)) throw protocolError('控制消息必须是对象');
  if (typeof value.type !== 'string' || !Object.hasOwn(EVENT_FIELDS, value.type)) {
    throw protocolError('未知事件类型');
  }
  const fields = EVENT_FIELDS[value.type];
  requireExactFields(value, ['type', ...fields]);

  const event = { type: value.type };
  if (fields.includes('session_id')) event.session_id = requireNonemptyString(value.session_id, 'session_id');
  if (fields.includes('turn_id')) event.turn_id = requirePositiveInteger(value.turn_id, 'turn_id');
  if (fields.includes('direction')) {
    if (value.direction !== 'input') throw protocolError('direction 必须为 input');
    event.direction = 'input';
  }
  if (fields.includes('sequence')) {
    if (!Number.isSafeInteger(value.sequence) || value.sequence < 0 || value.sequence > MAX_SEQUENCE) {
      throw protocolError('sequence 超出范围');
    }
    event.sequence = value.sequence;
  }
  if (fields.includes('byte_length')) {
    event.byte_length = validateBinaryHeader({
      session_id: event.session_id,
      direction: event.direction,
      turn_id: event.turn_id,
      sequence: event.sequence,
      byte_length: value.byte_length,
    }).byte_length;
  }
  return event;
}

export function makeClientEvent(type, fields = {}) {
  const raw = JSON.stringify(validateClientEvent({ type, ...fields }));
  if (new TextEncoder().encode(raw).byteLength > MAX_CONTROL_MESSAGE_BYTES) {
    throw protocolError(`控制消息不能超过 ${MAX_CONTROL_MESSAGE_BYTES} 字节`);
  }
  return raw;
}

export function parseServerEvent(raw) {
  if (typeof raw !== 'string') throw protocolError('控制消息必须是字符串');
  if (new TextEncoder().encode(raw).byteLength > MAX_CONTROL_MESSAGE_BYTES) {
    throw protocolError(`控制消息不能超过 ${MAX_CONTROL_MESSAGE_BYTES} 字节`);
  }
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    throw protocolError('控制消息不是合法 JSON');
  }
  if (!isPlainObject(event)) throw protocolError('控制消息必须是对象');
  if (typeof event.type !== 'string' || !Object.hasOwn(SERVER_EVENT_FIELDS, event.type)) {
    throw protocolError('未知事件类型');
  }

  const fields = SERVER_EVENT_FIELDS[event.type];
  requireExactFields(event, ['type', ...fields]);
  const normalized = { type: event.type };
  if (fields.includes('session_id')) normalized.session_id = requireNonemptyString(event.session_id, 'session_id');
  if (fields.includes('turn_id')) normalized.turn_id = requirePositiveInteger(event.turn_id, 'turn_id');
  if (fields.includes('text')) normalized.text = requireNonemptyString(event.text, 'text');
  if (fields.includes('reason')) normalized.reason = requireNonemptyString(event.reason, 'reason');
  if (fields.includes('code')) normalized.code = requireNonemptyString(event.code, 'code');
  if (fields.includes('message')) normalized.message = requireNonemptyString(event.message, 'message');
  if (event.type === 'tts_start') {
    if (!Number.isSafeInteger(event.sample_rate) || event.sample_rate < 8000 || event.sample_rate > 48000) {
      throw protocolError('sample_rate 必须在 8000..48000');
    }
    if (event.channels !== 1) throw protocolError('channels 必须为 1');
    if (event.sample_width !== 2) throw protocolError('sample_width 必须为 2');
    normalized.sample_rate = event.sample_rate;
    normalized.channels = event.channels;
    normalized.sample_width = event.sample_width;
  }
  if (event.type === 'output_audio_chunk') {
    const header = validateBinaryHeader({
      session_id: event.session_id,
      turn_id: event.turn_id,
      direction: event.direction,
      sequence: event.sequence,
      byte_length: event.byte_length,
    });
    if (header.direction !== 'output') throw protocolError('direction 必须为 output');
    normalized.session_id = header.session_id;
    normalized.turn_id = header.turn_id;
    normalized.direction = header.direction;
    normalized.sequence = header.sequence;
    normalized.byte_length = header.byte_length;
  }
  return normalized;
}
