import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLive2DController } from '../useLive2DController';

const actionComposerControl = vi.hoisted(() => ({
  implementation: null,
}));

vi.mock('../../live2d/actionComposer', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    compileAction: (...args) => {
      if (actionComposerControl.implementation) {
        return actionComposerControl.implementation(...args);
      }
      return original.compileAction(...args);
    },
  };
});

describe('useLive2DController 动作覆写', () => {
  let tickerCallback;
  let appRef;
  let modelRef;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-26T12:00:00.000Z'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    actionComposerControl.implementation = null;

    const coreModel = {
      getParameterCount: () => 0,
      getParameterValueById: () => 0,
      setParameterValueById: vi.fn(),
    };

    appRef = {
      current: {
        ticker: {
          add: vi.fn((callback) => {
            tickerCallback = callback;
          }),
          remove: vi.fn(),
        },
      },
    };
    modelRef = {
      current: {
        internalModel: { coreModel },
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('执行不含 params 的自由动作时不会让 Ticker 抛出异常', () => {
    const actionOverride = {
      type: 'local_micro_reaction',
      action_id: 'local-test',
      intent: 'warm_listening',
      intensity: 0.3,
      duration_ms: 800,
      variation_seed: 1,
    };

    const { unmount } = renderHook(() => useLive2DController(
      appRef,
      modelRef,
      'panda_cake',
      'neutral',
      { rhubarb: 'X' },
      actionOverride,
    ));

    vi.advanceTimersByTime(16);

    expect(tickerCallback).toBeTypeOf('function');
    expect(() => tickerCallback(1)).not.toThrow();

    unmount();
  });

  it('动作采样器异常时丢弃当前动作并继续执行后续帧', () => {
    actionComposerControl.implementation = () => ({
      actionId: 'broken-action',
      durationMs: 800,
      sample: () => {
        throw new Error('动作帧损坏');
      },
    });

    const { unmount } = renderHook(() => useLive2DController(
      appRef,
      modelRef,
      'panda_cake',
      'neutral',
      { rhubarb: 'X' },
      {
        type: 'live2d_action_v2',
        action_id: 'broken-action',
        intent: 'warm_listening',
        intensity: 0.3,
        duration_ms: 800,
        variation_seed: 1,
      },
    ));

    vi.advanceTimersByTime(16);

    expect(() => tickerCallback(1)).not.toThrow();
    const writesAfterBrokenFrame = modelRef.current.internalModel.coreModel
      .setParameterValueById.mock.calls.length;

    expect(writesAfterBrokenFrame).toBeGreaterThan(0);
    expect(() => tickerCallback(1)).not.toThrow();
    expect(modelRef.current.internalModel.coreModel.setParameterValueById)
      .toHaveBeenCalledTimes(writesAfterBrokenFrame * 2);
    expect(console.warn).toHaveBeenCalledOnce();

    unmount();
  });

  it('动作时长缺失时使用安全默认时长并正常采样', () => {
    const sample = vi.fn(() => ({
      headAngleY: -1,
      bodyAngleZ: 1,
    }));
    actionComposerControl.implementation = () => ({
      actionId: 'missing-duration',
      sample,
    });

    const { unmount } = renderHook(() => useLive2DController(
      appRef,
      modelRef,
      'panda_cake',
      'neutral',
      { rhubarb: 'X' },
      {
        type: 'live2d_action_v2',
        action_id: 'missing-duration',
        intent: 'warm_listening',
        intensity: 0.3,
        variation_seed: 1,
      },
    ));

    vi.advanceTimersByTime(16);
    tickerCallback(1);

    expect(sample).toHaveBeenCalledOnce();
    expect(sample).toHaveBeenCalledWith(0.02);

    unmount();
  });

  it('旧版动作仍会应用 params 中的方向参数', () => {
    const { unmount } = renderHook(() => useLive2DController(
      appRef,
      modelRef,
      'panda_cake',
      'neutral',
      { rhubarb: 'X' },
      {
        action: '开心',
        params: { direction: 'left' },
      },
    ));

    vi.advanceTimersByTime(16);
    tickerCallback(1);

    const bodyAngleZWrites = modelRef.current.internalModel.coreModel
      .setParameterValueById.mock.calls
      .filter(([parameterId]) => parameterId === 'ParamBodyAngleZ');

    expect(bodyAngleZWrites).not.toHaveLength(0);
    expect(bodyAngleZWrites.at(-1)[1]).toBeGreaterThan(0);

    unmount();
  });
});
