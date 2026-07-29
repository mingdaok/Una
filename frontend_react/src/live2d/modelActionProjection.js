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

function projectPanda({ semanticFrame, capabilityMap, profile, writes, claimedChannels }) {
  const hugPresent = Object.hasOwn(semanticFrame || {}, 'panda_hug');
  const facePresent = Object.hasOwn(semanticFrame || {}, 'hands_to_face');
  if (!hugPresent && !facePresent) return;

  const hug = finite(semanticFrame.panda_hug) ? Math.max(0, semanticFrame.panda_hug) : 0;
  const face = finite(semanticFrame.hands_to_face) ? Math.max(0, semanticFrame.hands_to_face) : 0;
  const selected = face > hug ? 'hands_to_face' : (hug > 0 ? 'panda_hug' : null);
  const switchIds = { panda_hug: ['Param3', 'Param6'], hands_to_face: ['Param5', 'Param6'] };
  const selectedIds = selected ? switchIds[selected] : [];
  const selectedRanges = selectedIds.map(id => parameterInfo(capabilityMap, id));
  if (selected && selectedRanges.some(range => !range)) return;

  const allSwitchIds = new Set(['Param3', 'Param5', 'Param6']);
  const activation = selected === 'panda_hug' ? hug : face;
  for (const id of allSwitchIds) {
    const range = parameterInfo(capabilityMap, id);
    if (!range) continue;
    const target = selectedIds.includes(id) ? profile.channels[selected].targetValue : range.defaultValue;
    write(writes, id, range.defaultValue + ((target - range.defaultValue) * activation), range);
  }

  const phase = phaseFor(semanticFrame);
  let physicsOffset = 0;
  for (const channel of ['panda_hug', 'hands_to_face']) {
    const channelActivation = selected === channel ? activation : 0;
    for (const id of profile.channels[channel].optionalPhysicsParameterIds) {
      const range = parameterInfo(capabilityMap, id);
      if (range) write(writes, id, pandaPhysicsValue(range, channelActivation, phase, physicsOffset), range);
      physicsOffset += 1;
    }
  }
  if (selected) {
    claimedChannels.add(selected);
  }
  if (hugPresent) claimedChannels.add('panda_hug');
  if (facePresent) claimedChannels.add('hands_to_face');
}

/**
 * Projects model-only semantic channels after Cubism's native update. It is pure:
 * callers own the actual CoreModel write and therefore preserve TTS as the final layer.
 */
export function projectModelSpecificActions({
  coreModel, modelName, semanticFrame = {}, capabilityMap, partOpacityById = new Map(),
} = {}) {
  const profile = getModelActionProfile(modelName);
  const writes = [];
  const claimedChannels = new Set();
  if (!profile || !semanticFrame || typeof semanticFrame !== 'object') return { writes, claimedChannels };

  if (profile.model === 'hiyori') {
    projectHiyori({ coreModel, semanticFrame, capabilityMap, partOpacityById, profile, writes, claimedChannels });
  } else if (profile.model === 'panda_cake') {
    projectPanda({ semanticFrame, capabilityMap, profile, writes, claimedChannels });
  }
  return { writes, claimedChannels };
}
