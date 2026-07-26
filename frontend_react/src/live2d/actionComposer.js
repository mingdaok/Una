const ACTION_TYPES = new Set(['live2d_action_v2', 'local_micro_reaction']);

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

function seededUnit(seed) {
  let value = (seed >>> 0) + 0x6D2B79F5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function envelope(progress) {
  return Math.sin(Math.PI * Math.max(0, Math.min(1, progress)));
}

function boundedIntensity(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

export function compileAction(event, currentModel) {
  if (!event || !ACTION_TYPES.has(event.type)) return null;
  const variants = ACTION_PROFILES[currentModel]?.[event.intent];
  if (!variants?.length) return null;

  const intensity = boundedIntensity(event.intensity);
  const seed = Number.isInteger(event.variation_seed) ? event.variation_seed : 0;
  const target = variants[Math.floor(seededUnit(seed) * variants.length)];
  const requestedDuration = Number(event.duration_ms);
  const durationMs = Number.isFinite(requestedDuration) && requestedDuration > 0
    ? Math.max(400, Math.min(2500, requestedDuration))
    : 800;

  return {
    actionId: event.action_id ?? null,
    durationMs,
    sample(progress) {
      const amount = envelope(progress) * intensity;
      return Object.fromEntries(
        Object.entries(target).map(([parameter, value]) => [parameter, value * amount]),
      );
    },
  };
}
