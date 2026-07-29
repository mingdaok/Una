export const LIVE2D_MODELS = Object.freeze(['hiyori', 'panda_cake']);

export const COMMON_SEMANTIC_CHANNELS = Object.freeze([
  'head_yaw', 'head_pitch', 'head_roll',
  'body_yaw', 'body_pitch', 'body_roll',
  'gaze_x', 'gaze_y', 'eye_open', 'eye_smile',
  'brow_y', 'brow_form', 'cheek',
]);

const MODEL_SET = new Set(LIVE2D_MODELS);
const COMMON_CHANNEL_SET = new Set(COMMON_SEMANTIC_CHANNELS);
const CHANNEL_RANGES = Object.freeze({
  left_arm_raise: Object.freeze({ min: 0, max: 1 }),
  right_arm_raise: Object.freeze({ min: 0, max: 1 }),
  left_hand_wave: Object.freeze({ min: -1, max: 1 }),
  right_hand_wave: Object.freeze({ min: -1, max: 1 }),
  panda_hug: Object.freeze({ min: 0, max: 1 }),
  hands_to_face: Object.freeze({ min: 0, max: 1 }),
});

function freezeProfile(profile) {
  for (const value of Object.values(profile)) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) freezeProfile(value);
  }
  return Object.freeze(profile);
}

const MODEL_ACTION_PROFILES = freezeProfile({
  hiyori: {
    model: 'hiyori',
    channels: {
      left_arm_raise: {
        parameterIds: ['PartArmA', 'ParamArmLA'],
        targetValue: 0,
        restingValue: -10,
      },
      right_arm_raise: {
        parameterIds: ['PartArmA', 'ParamArmRA'],
        targetValue: 0,
        restingValue: -10,
      },
      left_hand_wave: { parameterIds: ['ParamHandL'] },
      right_hand_wave: { parameterIds: ['ParamHandR'] },
    },
  },
  panda_cake: {
    model: 'panda_cake',
    channels: {
      panda_hug: {
        parameterIds: ['Param3'],
        optionalPhysicsParameterIds: ['Param150', 'Param151', 'Param152'],
        targetValue: 1,
      },
      hands_to_face: {
        parameterIds: ['Param5', 'Param6'],
        optionalPhysicsParameterIds: ['Param153', 'Param154', 'Param155', 'Param156', 'Param157', 'Param158'],
        targetValue: 1,
      },
    },
  },
});

export function normalizeLive2DModel(value) {
  return typeof value === 'string' && MODEL_SET.has(value) ? value : null;
}

export function channelsForModel(modelName) {
  const normalizedModel = normalizeLive2DModel(modelName);
  const channels = new Set(COMMON_SEMANTIC_CHANNELS);
  if (!normalizedModel) return channels;

  for (const channel of Object.keys(MODEL_ACTION_PROFILES[normalizedModel].channels)) {
    channels.add(channel);
  }
  return channels;
}

export function isChannelAllowedForModel(channel, modelName) {
  return typeof channel === 'string' && channelsForModel(modelName).has(channel);
}

export function isSemanticValueValid(channel, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  const range = CHANNEL_RANGES[channel];
  if (range) return value >= range.min && value <= range.max;
  return COMMON_CHANNEL_SET.has(channel) && value >= -1 && value <= 1;
}

export function filterMotionTracksForModel(tracks, modelName) {
  if (!Array.isArray(tracks)) return [];
  return tracks.filter(track => track && isChannelAllowedForModel(track.channel, modelName));
}

export function getModelActionProfile(modelName) {
  const normalizedModel = normalizeLive2DModel(modelName);
  return normalizedModel ? MODEL_ACTION_PROFILES[normalizedModel] : null;
}
