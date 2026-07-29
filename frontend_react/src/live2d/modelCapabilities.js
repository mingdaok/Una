const SEMANTIC_BINDINGS = Object.freeze({
  head_yaw: ['ParamAngleX'],
  head_pitch: ['ParamAngleY'],
  head_roll: ['ParamAngleZ'],
  body_yaw: ['ParamBodyAngleX'],
  body_pitch: ['ParamBodyAngleY'],
  body_roll: ['ParamBodyAngleZ'],
  gaze_x: ['ParamEyeBallX'],
  gaze_y: ['ParamEyeBallY'],
  eye_open: ['ParamEyeLOpen', 'ParamEyeROpen'],
  eye_smile: ['ParamEyeLSmile', 'ParamEyeRSmile'],
  brow_y: ['ParamBrowLY', 'ParamBrowRY'],
  brow_form: ['ParamBrowLForm', 'ParamBrowRForm'],
  cheek: ['ParamCheek'],
});

const RESERVED_BINDINGS = Object.freeze({
  mouth_open: ['ParamMouthOpenY'],
  mouth_form: ['ParamMouthForm'],
  breath: ['ParamBreath'],
});

const MODEL_FALLBACK_IDS = Object.freeze({
  hiyori: Object.freeze([
    'ParamAngleX', 'ParamAngleY', 'ParamAngleZ',
    'ParamBodyAngleX', 'ParamBodyAngleY', 'ParamBodyAngleZ',
    'ParamEyeBallX', 'ParamEyeBallY',
    'ParamEyeLOpen', 'ParamEyeROpen', 'ParamEyeLSmile', 'ParamEyeRSmile',
    'ParamBrowLY', 'ParamBrowRY', 'ParamBrowLForm', 'ParamBrowRForm',
    'ParamCheek', 'ParamMouthOpenY', 'ParamMouthForm', 'ParamBreath',
  ]),
  panda_cake: Object.freeze([
    'ParamAngleX', 'ParamAngleY', 'ParamAngleZ',
    'ParamBodyAngleX', 'ParamBodyAngleY', 'ParamBodyAngleZ',
    'ParamEyeBallX', 'ParamEyeBallY',
    'ParamEyeLOpen', 'ParamEyeROpen', 'ParamEyeLSmile', 'ParamEyeRSmile',
    'ParamBrowLY', 'ParamBrowRY', 'ParamBrowLForm', 'ParamBrowRForm',
    'ParamCheek', 'Param159', 'ParamMouthOpenY', 'ParamMouthForm', 'ParamBreath',
  ]),
});

function readParameterIds(coreModel) {
  try {
    if (Array.isArray(coreModel?._parameterIds)) return [...coreModel._parameterIds];
    const internalIds = coreModel?._model?.parameters?.ids;
    if (Array.isArray(internalIds)) return [...internalIds];
    return [];
  } catch {
    return [];
  }
}

function fallbackIds(modelName) {
  return [...(MODEL_FALLBACK_IDS[modelName] || MODEL_FALLBACK_IDS.hiyori)];
}

function readParameterRanges(coreModel, ids) {
  if (
    typeof coreModel?.getParameterCount !== 'function'
    || typeof coreModel?.getParameterMinimumValue !== 'function'
    || typeof coreModel?.getParameterMaximumValue !== 'function'
    || typeof coreModel?.getParameterDefaultValue !== 'function'
  ) {
    return new Map();
  }

  let count;
  try {
    count = Number(coreModel.getParameterCount());
  } catch {
    return new Map();
  }
  if (!Number.isInteger(count) || count < 0) return new Map();

  const ranges = new Map();
  ids.forEach((id, index) => {
    if (index >= count) return;
    try {
      const minimum = Number(coreModel.getParameterMinimumValue(index));
      const maximum = Number(coreModel.getParameterMaximumValue(index));
      const defaultValue = Number(coreModel.getParameterDefaultValue(index));
      if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || !Number.isFinite(defaultValue)) return;
      if (minimum > maximum) return;
      ranges.set(id, {
        minimum,
        maximum,
        defaultValue: Math.max(minimum, Math.min(maximum, defaultValue)),
      });
    } catch {
      // A broken model parameter must not prevent other parameters from being usable.
    }
  });
  return ranges;
}

function firstAvailable(ids, parameterIds) {
  return ids.find(id => parameterIds.has(id)) || null;
}

function buildBindings(parameterIds, modelName) {
  const bindings = new Map();
  for (const [channel, candidates] of Object.entries(SEMANTIC_BINDINGS)) {
    const resolved = [...candidates];
    if (channel === 'cheek' && modelName === 'panda_cake' && !parameterIds.has('ParamCheek')) {
      resolved.splice(0, resolved.length, 'Param159');
    }
    const ids = resolved.filter(id => parameterIds.has(id));
    if (ids.length > 0) bindings.set(channel, ids);
  }
  return bindings;
}

function projectNormalized(range, normalized) {
  if (!Number.isFinite(normalized)) return null;
  const projected = normalized >= 0
    ? range.defaultValue + normalized * (range.maximum - range.defaultValue)
    : range.defaultValue + (-normalized) * (range.minimum - range.defaultValue);
  if (!Number.isFinite(projected)) return null;
  return Math.max(range.minimum, Math.min(range.maximum, projected));
}

function projectBindings(bindings, ranges, frame) {
  if (!frame || typeof frame !== 'object') return [];
  const projected = [];
  for (const [channel, ids] of bindings) {
    const normalized = Number(frame[channel]);
    if (!Number.isFinite(normalized)) continue;
    for (const id of ids) {
      const range = ranges.get(id);
      if (!range) continue;
      const value = projectNormalized(range, normalized);
      if (value !== null) projected.push({ id, value });
    }
  }
  return projected;
}

export function buildModelCapabilityMap(coreModel, { modelName = 'hiyori' } = {}) {
  const discoveredIds = readParameterIds(coreModel);
  const parameterIds = new Set(discoveredIds.length > 0 ? discoveredIds : fallbackIds(modelName));
  const ranges = readParameterRanges(coreModel, discoveredIds);
  const semanticBindings = buildBindings(parameterIds, modelName);
  const reservedBindings = new Map(Object.entries(RESERVED_BINDINGS).map(([key, candidates]) => {
    const id = firstAvailable(candidates, parameterIds);
    return [key, id ? [id] : []];
  }));

  return Object.freeze({
    parameterIds,
    hasParameter(id) {
      return typeof id === 'string' && ranges.has(id);
    },
    getParameterInfo(id) {
      const range = typeof id === 'string' ? ranges.get(id) : null;
      return range ? { ...range } : null;
    },
    hasChannel(channel) {
      return (semanticBindings.get(channel) || []).some(id => ranges.has(id));
    },
    project(frame) {
      return projectBindings(semanticBindings, ranges, frame);
    },
    projectLipSync(frame) {
      return projectBindings(new Map([
        ['mouth_open', reservedBindings.get('mouth_open') || []],
        ['mouth_form', reservedBindings.get('mouth_form') || []],
      ]), ranges, frame);
    },
    projectBreath(value) {
      return projectBindings(new Map([
        ['breath', reservedBindings.get('breath') || []],
      ]), ranges, { breath: value });
    },
  });
}
