import { describe, expect, it, vi } from 'vitest';
import { buildModelCapabilityMap } from '../modelCapabilities';

function coreModelWith(ids, {
  minimums = ids.map(() => -1),
  maximums = ids.map(() => 1),
  defaults = ids.map(() => 0),
  idShape = 'private',
} = {}) {
  const core = {
    getParameterCount: () => ids.length,
    getParameterMinimumValue: vi.fn(index => minimums[index]),
    getParameterMaximumValue: vi.fn(index => maximums[index]),
    getParameterDefaultValue: vi.fn(index => defaults[index]),
  };

  if (idShape === 'private') core._parameterIds = ids;
  if (idShape === 'internal') core._model = { parameters: { ids } };
  return core;
}

describe('buildModelCapabilityMap', () => {
  it('uses existing Cubism index APIs without calling a missing getParameterId API', () => {
    const coreModel = coreModelWith(
      ['ParamAngleY', 'ParamEyeLOpen', 'ParamEyeROpen'],
      {
        minimums: [-30, 0, 0],
        maximums: [30, 1, 1],
        defaults: [0, 1, 1],
      },
    );
    coreModel.getParameterId = vi.fn(() => {
      throw new Error('Cubism 4 CoreModel does not expose getParameterId');
    });

    const map = buildModelCapabilityMap(coreModel, { modelName: 'hiyori' });

    expect(map.hasChannel('head_pitch')).toBe(true);
    expect(map.project({ head_pitch: -0.5 })).toContainEqual({
      id: 'ParamAngleY',
      value: -15,
    });
    expect(coreModel.getParameterId).not.toHaveBeenCalled();
  });

  it('reads parameter IDs from the nested Cubism wrapper shape', () => {
    const coreModel = coreModelWith(['ParamAngleX'], { idShape: 'internal' });

    const map = buildModelCapabilityMap(coreModel, { modelName: 'hiyori' });

    expect(map.parameterIds).toEqual(new Set(['ParamAngleX']));
    expect(map.hasChannel('head_yaw')).toBe(true);
  });

  it('returns a partial safe map when a single range getter throws', () => {
    const coreModel = coreModelWith(['ParamAngleX', 'ParamAngleY']);
    coreModel.getParameterMaximumValue.mockImplementation(index => {
      if (index === 1) throw new Error('bad Cubism parameter range');
      return 30;
    });
    coreModel.getParameterMinimumValue.mockImplementation(index => (index === 0 ? -30 : -30));
    coreModel.getParameterDefaultValue.mockImplementation(() => 0);

    const map = buildModelCapabilityMap(coreModel, { modelName: 'hiyori' });

    expect(map.hasChannel('head_yaw')).toBe(true);
    expect(map.hasChannel('head_pitch')).toBe(false);
    expect(map.project({ head_yaw: 2, head_pitch: -0.5 })).toEqual([
      { id: 'ParamAngleX', value: 30 },
    ]);
  });

  it('uses panda_cake cheek fallback Param159 when standard cheek is absent', () => {
    const coreModel = coreModelWith(['Param159'], {
      minimums: [0],
      maximums: [1],
      defaults: [0],
    });

    const map = buildModelCapabilityMap(coreModel, { modelName: 'panda_cake' });

    expect(map.hasChannel('cheek')).toBe(true);
    expect(map.project({ cheek: 0.5 })).toEqual([{ id: 'Param159', value: 0.5 }]);
  });

  it('projects eye channels to both available eyes and reserves mouth channels from external frames', () => {
    const coreModel = coreModelWith(
      ['ParamEyeLOpen', 'ParamEyeROpen', 'ParamMouthOpenY', 'ParamMouthForm', 'ParamBreath'],
      {
        minimums: [0, 0, 0, -1, 0],
        maximums: [1, 1, 1, 1, 1],
        defaults: [1, 1, 0, 0, 0],
      },
    );
    const map = buildModelCapabilityMap(coreModel, { modelName: 'hiyori' });

    expect(map.project({ eye_open: -1, mouth_open: 1 })).toEqual([
      { id: 'ParamEyeLOpen', value: 0 },
      { id: 'ParamEyeROpen', value: 0 },
    ]);
    expect(map.projectLipSync({ mouth_open: 0.5, mouth_form: -0.5 })).toEqual([
      { id: 'ParamMouthOpenY', value: 0.5 },
      { id: 'ParamMouthForm', value: -0.5 },
    ]);
    expect(map.projectBreath(0.5)).toEqual([{ id: 'ParamBreath', value: 0.5 }]);
  });

  it('uses model fallback IDs when Cubism private ID arrays are unavailable', () => {
    const coreModel = coreModelWith([], { idShape: 'none' });
    coreModel.getParameterCount = () => 0;

    const map = buildModelCapabilityMap(coreModel, { modelName: 'hiyori' });

    expect(map.parameterIds).toEqual(expect.any(Set));
    expect(map.parameterIds.has('ParamAngleY')).toBe(true);
    expect(map.hasChannel('head_pitch')).toBe(false);
  });
});
