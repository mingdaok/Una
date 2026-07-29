import { describe, expect, it } from 'vitest';
import { buildModelCapabilityMap } from '../modelCapabilities';
import { projectModelSpecificActions } from '../modelActionProjection';

function coreModelWith(ids, { minimums, maximums, defaults, values } = {}) {
  const valueById = new Map(ids.map((id, index) => [id, values?.[index] ?? defaults?.[index] ?? 0]));
  return {
    _parameterIds: ids,
    getParameterCount: () => ids.length,
    getParameterMinimumValue: index => minimums?.[index] ?? -30,
    getParameterMaximumValue: index => maximums?.[index] ?? 30,
    getParameterDefaultValue: index => defaults?.[index] ?? 0,
    getParameterValueById: id => valueById.get(id),
  };
}

function project(coreModel, modelName, semanticFrame, partOpacityById = new Map()) {
  return projectModelSpecificActions({
    coreModel,
    modelName,
    semanticFrame,
    capabilityMap: buildModelCapabilityMap(coreModel, { modelName }),
    partOpacityById,
  });
}

describe('projectModelSpecificActions', () => {
  it('Hiyori only moves a visible Arm A relatively and gates hand waves behind the matching raised arm', () => {
    const coreModel = coreModelWith(
      ['PartArmA', 'ParamArmLA', 'ParamHandL'],
      { minimums: [0, -30, -20], maximums: [1, 30, 20], defaults: [1, -10, 0], values: [1, -10, 0] },
    );
    const active = project(coreModel, 'hiyori', {
      left_arm_raise: 0.5,
      left_hand_wave: 1,
      variation_seed: 7,
      monotonic_time_ms: 250,
    }, new Map([['PartArmA', 1]]));
    const resting = project(coreModel, 'hiyori', { left_arm_raise: 0, left_hand_wave: 1 }, new Map([['PartArmA', 1]]));

    expect(active.writes).toContainEqual({ id: 'ParamArmLA', value: -5 });
    expect(active.writes.some(write => write.id === 'ParamHandL')).toBe(true);
    expect(resting.writes).toEqual([]);
  });

  it('Hiyori safely ignores hidden arms and a side with missing required parameters', () => {
    const hiddenCore = coreModelWith(['PartArmA', 'ParamArmLA'], {
      minimums: [0, -30], maximums: [1, 30], defaults: [1, -10], values: [1, -10],
    });
    const missingCore = coreModelWith(['PartArmA', 'ParamHandL'], {
      minimums: [0, -20], maximums: [1, 20], defaults: [1, 0], values: [1, 0],
    });

    expect(project(hiddenCore, 'hiyori', { left_arm_raise: 1 }, new Map([['PartArmA', 0]])).writes).toEqual([]);
    expect(project(missingCore, 'hiyori', { left_arm_raise: 1, left_hand_wave: 1 }, new Map([['PartArmA', 1]])).writes).toEqual([]);
  });

  it('writes panda posture switches, optional physics details, and restores defaults without activating both postures', () => {
    const ids = ['Param3', 'Param5', 'Param6', 'Param150', 'Param151', 'Param152'];
    const coreModel = coreModelWith(ids, {
      minimums: [0, 0, 0, -10, -10, -10],
      maximums: [1, 1, 1, 10, 10, 10],
      defaults: [0, 0, 0, 0, 0, 0],
      values: [0, 0, 0, 0, 0, 0],
    });
    const hug = project(coreModel, 'panda_cake', { panda_hug: 1, monotonic_time_ms: 100 });
    const conflict = project(coreModel, 'panda_cake', { panda_hug: 0.5, hands_to_face: 1 });
    const restore = project(coreModel, 'panda_cake', { panda_hug: 0 });

    expect(hug.writes).toEqual(expect.arrayContaining([
      { id: 'Param3', value: 1 },
      { id: 'Param6', value: 1 },
      expect.objectContaining({ id: 'Param150' }),
    ]));
    expect(conflict.writes).toEqual(expect.arrayContaining([
      { id: 'Param3', value: 0 },
      { id: 'Param5', value: 1 },
      { id: 'Param6', value: 1 },
    ]));
    expect(restore.writes).toEqual(expect.arrayContaining([
      { id: 'Param3', value: 0 },
      { id: 'Param6', value: 0 },
      { id: 'Param150', value: 0 },
    ]));
  });

  it('uses the semantic posture envelope to blend each panda switch toward its target', () => {
    const coreModel = coreModelWith(['Param3', 'Param6'], {
      minimums: [0, 0], maximums: [1, 1], defaults: [0, 0], values: [0, 0],
    });

    const projected = project(coreModel, 'panda_cake', { panda_hug: 0.5 });

    expect(projected.writes).toEqual(expect.arrayContaining([
      { id: 'Param3', value: 0.5 },
      { id: 'Param6', value: 0.5 },
    ]));
  });

  it('uses mixer-selected posture order to cross-fade a new panda pose and restore it after its channel vanishes', () => {
    const ids = ['Param3', 'Param5', 'Param6', 'Param150', 'Param153'];
    const coreModel = coreModelWith(ids, {
      minimums: [0, 0, 0, -10, -10], maximums: [1, 1, 1, 10, 10],
      defaults: [0, 0, 0, 0, 0], values: [0, 0, 0, 0, 0],
    });
    const hug = projectModelSpecificActions({
      coreModel, modelName: 'panda_cake', capabilityMap: buildModelCapabilityMap(coreModel, { modelName: 'panda_cake' }),
      semanticFrame: { panda_hug: 1, panda_primary_channel: 'panda_hug' }, pandaState: null, deltaMs: 16,
    });
    const switching = projectModelSpecificActions({
      coreModel, modelName: 'panda_cake', capabilityMap: buildModelCapabilityMap(coreModel, { modelName: 'panda_cake' }),
      semanticFrame: { panda_hug: 1, hands_to_face: 1, panda_primary_channel: 'hands_to_face' },
      pandaState: hug.pandaState, deltaMs: 70,
    });
    const ending = projectModelSpecificActions({
      coreModel, modelName: 'panda_cake', capabilityMap: buildModelCapabilityMap(coreModel, { modelName: 'panda_cake' }),
      semanticFrame: {}, pandaState: switching.pandaState, deltaMs: 140,
    });

    expect(hug.pandaState).toEqual(expect.any(Object));
    expect(switching.writes).toEqual(expect.arrayContaining([
      { id: 'Param3', value: 0.5 },
      { id: 'Param5', value: 0.5 },
      { id: 'Param6', value: 0.5 },
    ]));
    expect(ending.writes).toEqual(expect.arrayContaining([
      { id: 'Param3', value: 0 },
      { id: 'Param5', value: 0 },
      { id: 'Param6', value: 0 },
      { id: 'Param150', value: 0 },
      { id: 'Param153', value: 0 },
    ]));
  });

  it('skips an invalid panda semantic value instead of treating it as an active or reset frame', () => {
    const coreModel = coreModelWith(['Param3', 'Param6'], {
      minimums: [0, 0], maximums: [1, 1], defaults: [0, 0], values: [0, 0],
    });

    expect(project(coreModel, 'panda_cake', { panda_hug: 2 }).writes).toEqual([]);
    expect(project(coreModel, 'panda_cake', { hands_to_face: Number.NaN }).writes).toEqual([]);
  });
});
