import { compileMotionPlan, normalizeMotionEvent } from './motionProtocol';

const ACTION_TYPES = new Set(['live2d_action_v2', 'local_micro_reaction']);

// 这八组仅用于兼容旧的 intent 事件。新动作由 v3 语义轨道直接表达。
const PANDA_PROFILES = {
  warm_listening: [{ headAngleY: -1.2, bodyAngleZ: 1.2, eyeOpen: 0.82, smile: 0.56 }],
  thinking: [{ headAngleX: 2.5, headAngleY: -2.2, bodyAngleZ: -1.2, browAngle: 0.3 }],
  shy_happy: [
    { headAngleY: -5, bodyAngleZ: 3, eyeOpen: 0.7, cheek: 0.5, smile: 0.7, browAngle: 0.42 },
    { headAngleX: -3, headAngleY: -4, bodyAngleZ: -2.5, eyeOpen: 0.72, cheek: 0.48, smile: 0.68 },
  ],
  happy_surprise: [{ headAngleY: -6, bodyAngleZ: 4, eyeOpen: 0.96, cheek: 0.35, smile: 0.86 }],
  gentle_comfort: [{ headAngleY: -2.5, bodyAngleZ: 1.8, eyeOpen: 0.76, smile: 0.58, browAngle: 0.46 }],
  sad_support: [{ headAngleY: -3.5, bodyAngleZ: -1.5, eyeOpen: 0.68, smile: 0.34, browAngle: 0.25 }],
  encouraging: [{ headAngleY: 2.5, bodyAngleZ: 2.4, eyeOpen: 0.88, smile: 0.78, browAngle: 0.58 }],
  curious_question: [{ headAngleX: 4, headAngleY: -1, bodyAngleZ: -2, eyeOpen: 0.87, browAngle: 0.5 }],
};

const HIYORI_PROFILES = {
  ...PANDA_PROFILES,
  shy_happy: [
    { headAngleY: -5.5, bodyAngleZ: 3.5, eyeOpen: 0.72, cheek: 0.35, smile: 0.68, browAngle: 0.42 },
    { headAngleX: -3.5, headAngleY: -4.5, bodyAngleZ: -3, eyeOpen: 0.74, cheek: 0.3, smile: 0.66 },
  ],
};

export const ACTION_PROFILES = Object.freeze({
  panda_cake: PANDA_PROFILES,
  hiyori: HIYORI_PROFILES,
});

const LEGACY_TO_SEMANTIC = Object.freeze({
  headAngleX: 'head_yaw',
  headAngleY: 'head_pitch',
  bodyAngleZ: 'body_roll',
  eyeOpen: 'eye_open',
  cheek: 'cheek',
  smile: 'eye_smile',
  browAngle: 'brow_y',
});

function seededUnit(seed) {
  let value = (seed >>> 0) + 0x6D2B79F5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function boundedIntensity(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function boundedDuration(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0
    ? Math.max(400, Math.min(2500, Math.trunc(duration)))
    : 800;
}

function boundedNow(nowMs) {
  return typeof nowMs === 'number' && Number.isFinite(nowMs) ? nowMs : Date.now();
}

function fallbackMotionId(nowMs, seed, idFactory) {
  try {
    const generated = typeof idFactory === 'function' ? idFactory() : null;
    if (typeof generated === 'string' && generated) return generated;
  } catch {
    // 可选的 ID 生成器失败不能阻断旧动作兼容路径。
  }
  return `legacy-${nowMs}-${seed}`;
}

function clampSemantic(value) {
  return Math.max(-1, Math.min(1, value));
}

function toSemanticValue(parameter, value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;

  switch (parameter) {
    case 'headAngleX':
    case 'headAngleY':
      return clampSemantic(numericValue / 8);
    case 'bodyAngleZ':
      return clampSemantic(numericValue / 5);
    case 'eyeOpen':
      // 旧配置使用绝对睁眼度；v3 的 0 是模型默认值，因此转为偏差量。
      return clampSemantic(numericValue - 1);
    default:
      return clampSemantic(numericValue);
  }
}

function semanticTracks(profile, intensity) {
  return Object.entries(profile).flatMap(([parameter, legacyValue]) => {
    const channel = LEGACY_TO_SEMANTIC[parameter];
    const semanticValue = toSemanticValue(parameter, legacyValue);
    if (!channel || semanticValue === null) return [];

    return [{
      channel,
      mode: 'override',
      keyframes: [
        { t: 0, value: 0, easing: 'ease_in_out' },
        { t: 0.5, value: clampSemantic(semanticValue * intensity), easing: 'ease_in_out' },
        { t: 1, value: 0, easing: 'ease_in_out' },
      ],
    }];
  });
}

export function compileLegacyAction(event, currentModel, { nowMs = Date.now(), idFactory } = {}) {
  if (!event || !ACTION_TYPES.has(event.type)) return null;
  const variants = ACTION_PROFILES[currentModel]?.[event.intent];
  if (!variants?.length) return null;

  const seed = Number.isInteger(event.variation_seed) ? event.variation_seed : 0;
  const profile = variants[Math.floor(seededUnit(seed) * variants.length)];
  const durationMs = boundedDuration(event.duration_ms);
  const createdAtMs = boundedNow(nowMs);
  const source = event.type === 'local_micro_reaction'
    ? 'local_micro_reaction'
    : 'legacy_fallback';
  const normalized = normalizeMotionEvent({
    type: 'live2d_motion_v3',
    motion_id: fallbackMotionId(createdAtMs, seed, idFactory),
    source,
    created_at_ms: createdAtMs,
    expires_at_ms: createdAtMs + durationMs + 1000,
    duration_ms: durationMs,
    blend: { in_ms: 80, out_ms: 120 },
    tracks: semanticTracks(profile, boundedIntensity(event.intensity)),
  }, { nowMs: createdAtMs });

  return normalized ? compileMotionPlan(normalized) : null;
}

// P1 期间保留旧导出，避免尚未接入状态混合器的调用方中断。
export const compileAction = compileLegacyAction;
