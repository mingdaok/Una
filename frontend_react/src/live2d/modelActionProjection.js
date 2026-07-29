import { getModelActionProfile } from './modelActionProfiles';

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function clampToRange(value, range) {
  if (!range || !finite(value)) return null;
  return Math.max(range.minimum, Math.min(range.maximum, value));
}

function parameterInfo(capabilityMap, id) {
  try {
    const info = capabilityMap?.getParameterInfo?.(id);
    return info && finite(info.minimum) && finite(info.maximum) && finite(info.defaultValue)
      && info.minimum <= info.maximum ? info : null;
  } catch {
    return null;
  }
}

function currentValue(coreModel, id) {
  try {
    const value = Number(coreModel?.getParameterValueById?.(id));
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function visiblePart(partOpacityById, id) {
  try {
    const value = partOpacityById instanceof Map ? partOpacityById.get(id) : partOpacityById?.[id];
    return finite(value) && value > 0;
  } catch {
    return false;
  }
}

function write(writes, id, value, range) {
  const bounded = clampToRange(value, range);
  if (bounded !== null) writes.push({ id, value: bounded });
}

function phaseFor(frame) {
  const seed = finite(frame?.variation_seed) ? Math.trunc(frame.variation_seed) : 0;
  const timeMs = finite(frame?.monotonic_time_ms) ? frame.monotonic_time_ms : 0;
  return ((timeMs / 180) + ((seed >>> 0) % 360) / 360) * Math.PI * 2;
}

function pandaPhysicsValue(range, activation, phase, offset) {
  const span = range.maximum - range.minimum;
  return range.defaultValue + (Math.sin(phase + offset) * span * 0.04 * activation);
}

function projectHiyori({ coreModel, semanticFrame, capabilityMap, partOpacityById, profile, writes, claimedChannels }) {
  if (!visiblePart(partOpacityById, 'PartArmA')) return;

  for (const [armChannel, handChannel, armId, handId] of [
    ['left_arm_raise', 'left_hand_wave', 'ParamArmLA', 'ParamHandL'],
    ['right_arm_raise', 'right_hand_wave', 'ParamArmRA', 'ParamHandR'],
  ]) {
    const armValue = semanticFrame?.[armChannel];
    if (!finite(armValue) || armValue < 0 || armValue > 1) continue;
    const armRange = parameterInfo(capabilityMap, armId);
    if (!armRange) continue;

    const armCurrent = currentValue(coreModel, armId);
    if (armCurrent === null) continue;
    if (armValue > 0) {
      const targetValue = profile.channels[armChannel].targetValue;
      write(writes, armId, armCurrent + ((targetValue - armCurrent) * armValue), armRange);
      claimedChannels.add(armChannel);
    }

    const handValue = semanticFrame?.[handChannel];
    if (armValue <= 0 || !finite(handValue) || handValue < -1 || handValue > 1) continue;
    const handRange = parameterInfo(capabilityMap, handId);
    if (!handRange) continue;
    const amplitude = (handRange.maximum - handRange.minimum) * 0.18 * armValue * handValue;
    write(writes, handId, handRange.defaultValue + (Math.sin(phaseFor(semanticFrame)) * amplitude), handRange);
    claimedChannels.add(handChannel);
  }
}

const PANDA_CHANNELS = Object.freeze(['panda_hug', 'hands_to_face']);
const PANDA_SWITCH_IDS = Object.freeze({
  panda_hug: Object.freeze(['Param3', 'Param6']),
  hands_to_face: Object.freeze(['Param5', 'Param6']),
});
const PANDA_RESTORE_MS = 140;

function pandaLevels(state) {
  return Object.fromEntries(PANDA_CHANNELS.map(channel => {
    const value = state?.levels?.[channel];
    return [channel, finite(value) && value > 0 && value <= 1 ? value : 0];
  }));
}

function hasPandaLevel(levels) {
  return PANDA_CHANNELS.some(channel => levels[channel] > 0.0001);
}

function pandaFrameValues(semanticFrame) {
  const values = {};
  let hasInvalid = false;
  for (const channel of PANDA_CHANNELS) {
    if (!Object.hasOwn(semanticFrame, channel)) continue;
    const value = semanticFrame[channel];
    if (!finite(value) || value < 0 || value > 1) {
      hasInvalid = true;
      continue;
    }
    values[channel] = value;
  }
  return { values, hasInvalid };
}

function selectedPandaChannel(semanticFrame, values) {
  const primary = semanticFrame.panda_primary_channel;
  if (PANDA_CHANNELS.includes(primary) && Object.hasOwn(values, primary)) return primary;
  // A direct unit caller has no mixer ordering metadata. Keep this fallback fixed rather than value-based.
  return ['hands_to_face', 'panda_hug'].find(channel => Object.hasOwn(values, channel)) || null;
}

function restoreRate(deltaMs) {
  return finite(deltaMs) && deltaMs >= 0 ? Math.min(1, deltaMs / PANDA_RESTORE_MS) : 1;
}

function projectPanda({ semanticFrame, capabilityMap, profile, writes, claimedChannels, pandaState, deltaMs }) {
  const previousLevels = pandaLevels(pandaState);
  const hadPreviousPose = hasPandaLevel(previousLevels);
  const { values, hasInvalid } = pandaFrameValues(semanticFrame);
  const hasValidFrame = Object.keys(values).length > 0;
  if (!hasValidFrame && hasInvalid) return pandaState || null;
  if (!hasValidFrame && !hadPreviousPose) return null;

  const levels = { ...previousLevels };
  const selected = selectedPandaChannel(semanticFrame, values);
  if (selected) {
    const other = selected === 'panda_hug' ? 'hands_to_face' : 'panda_hug';
    const target = values[selected];
    if (levels[other] > 0) {
      const rate = restoreRate(deltaMs);
      levels[selected] = levels[selected] + ((target - levels[selected]) * rate);
      levels[other] *= 1 - rate;
    } else if (target === 0 && levels[selected] > 0) {
      levels[selected] *= 1 - restoreRate(deltaMs);
    } else {
      levels[selected] = target;
      levels[other] = 0;
    }
    claimedChannels.add(selected);
  } else {
    const rate = restoreRate(deltaMs);
    for (const channel of PANDA_CHANNELS) levels[channel] *= 1 - rate;
  }

  for (const channel of PANDA_CHANNELS) {
    if (levels[channel] <= 0.0001) levels[channel] = 0;
  }
  const hasNextPose = hasPandaLevel(levels);
  if (hasNextPose) {
    const requiredIds = PANDA_CHANNELS
      .filter(channel => levels[channel] > 0)
      .flatMap(channel => PANDA_SWITCH_IDS[channel]);
    if (requiredIds.some(id => !parameterInfo(capabilityMap, id))) return pandaState || null;
  }

  const switchActivation = {
    Param3: levels.panda_hug,
    Param5: levels.hands_to_face,
    Param6: Math.max(levels.panda_hug, levels.hands_to_face),
  };
  for (const [id, activation] of Object.entries(switchActivation)) {
    const range = parameterInfo(capabilityMap, id);
    if (!range) continue;
    write(writes, id, range.defaultValue + ((1 - range.defaultValue) * activation), range);
  }

  const phase = phaseFor(semanticFrame);
  let physicsOffset = 0;
  for (const channel of PANDA_CHANNELS) {
    for (const id of profile.channels[channel].optionalPhysicsParameterIds) {
      const range = parameterInfo(capabilityMap, id);
      if (range) write(writes, id, pandaPhysicsValue(range, levels[channel], phase, physicsOffset), range);
      physicsOffset += 1;
    }
  }
  return hasNextPose ? { levels } : null;
}

/**
 * Projects model-only semantic channels after Cubism's native update. It is pure:
 * callers own the actual CoreModel write and therefore preserve TTS as the final layer.
 */
export function projectModelSpecificActions({
  coreModel, modelName, semanticFrame = {}, capabilityMap, partOpacityById = new Map(), pandaState = null, deltaMs,
} = {}) {
  const profile = getModelActionProfile(modelName);
  const writes = [];
  const claimedChannels = new Set();
  if (!profile || !semanticFrame || typeof semanticFrame !== 'object') return { writes, claimedChannels, pandaState };

  if (profile.model === 'hiyori') {
    projectHiyori({ coreModel, semanticFrame, capabilityMap, partOpacityById, profile, writes, claimedChannels });
  } else if (profile.model === 'panda_cake') {
    pandaState = projectPanda({
      semanticFrame, capabilityMap, profile, writes, claimedChannels, pandaState, deltaMs,
    });
  }
  return { writes, claimedChannels, pandaState };
}
