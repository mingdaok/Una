export const INPUT_SAMPLE_RATE = 16000;
export const MAX_INPUT_BYTES = 960000;
export const MAX_PCM_CHUNK_BYTES = 65536;
export const MAX_SEQUENCE = 4095;
export const MAX_CONTROL_MESSAGE_BYTES = 8192;

const EVENT_FIELDS = Object.freeze({
  call_start: [],
  user_speech_start: ['session_id', 'turn_id'],
  input_audio_chunk: ['session_id', 'turn_id', 'sequence', 'byte_length'],
  user_speech_end: ['session_id', 'turn_id'],
  interrupt: ['session_id'],
  call_end: ['session_id'],
  pong: [],
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
  if (!Number.isSafeInteger(value) || value <= 0) throw protocolError(`${field} 必须为正整数`);
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
  if (fields.includes('sequence')) {
    if (!Number.isSafeInteger(value.sequence) || value.sequence < 0 || value.sequence > MAX_SEQUENCE) {
      throw protocolError('sequence 超出范围');
    }
    event.sequence = value.sequence;
  }
  if (fields.includes('byte_length')) {
    event.byte_length = validateBinaryHeader({
      session_id: event.session_id,
      direction: 'input',
      turn_id: event.turn_id,
      sequence: event.sequence,
      byte_length: value.byte_length,
    }).byte_length;
  }
  return event;
}

export function makeClientEvent(type, fields = {}) {
  return JSON.stringify(validateClientEvent({ type, ...fields }));
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
  if (typeof event.type !== 'string' || !event.type) throw protocolError('控制消息缺少 type');
  return event;
}
