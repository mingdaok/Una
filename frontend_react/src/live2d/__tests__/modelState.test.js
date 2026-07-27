import { describe, expect, it, vi } from 'vitest';
import { resetLive2DModelState } from '../modelState';


describe('resetLive2DModelState', () => {
  it('使用正式 ExpressionManager API 并把全部参数恢复为模型默认值', () => {
    const resetExpression = vi.fn();
    const setParameterValueByIndex = vi.fn();
    const model = {
      motion: vi.fn(),
      expression: vi.fn(),
      internalModel: {
        motionManager: {
          expressionManager: { resetExpression },
        },
        coreModel: {
          getParameterCount: () => 3,
          getParameterDefaultValue: (index) => [0, 0, 1.5][index],
          setParameterValueByIndex,
        },
      },
    };

    expect(resetLive2DModelState(model)).toBe(true);
    expect(resetExpression).toHaveBeenCalledOnce();
    expect(setParameterValueByIndex.mock.calls).toEqual([
      [0, 0],
      [1, 0],
      [2, 1.5],
    ]);
    expect(model.motion).not.toHaveBeenCalled();
    expect(model.expression).not.toHaveBeenCalled();
  });

  it('模型缺少内部 API 时安全返回 false', () => {
    expect(() => resetLive2DModelState({})).not.toThrow();
    expect(resetLive2DModelState({})).toBe(false);
  });
});
