import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLive2DController } from '../useLive2DController';

const protocolControl = vi.hoisted(() => ({ brokenMotionId: null }));

vi.mock('../../live2d/motionProtocol', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    compileMotionPlan: (plan) => {
      if (plan?.motion_id === protocolControl.brokenMotionId) {
        return {
          motionId: plan.motion_id,
          source: plan.source,
          durationMs: 800,
          sample: () => { throw new Error('损坏的动作采样器'); },
        };
      }
      return original.compileMotionPlan(plan);
    },
  };
});

const IDS = [
  'ParamAngleX', 'ParamAngleY', 'ParamAngleZ',
  'ParamBodyAngleX', 'ParamBodyAngleY', 'ParamBodyAngleZ',
  'ParamEyeLOpen', 'ParamEyeROpen',
  'ParamEyeBallX', 'ParamEyeBallY',
  'ParamMouthOpenY', 'ParamMouthForm', 'ParamBreath',
];

function createCoreModel(ids = IDS, { partOpacityById = {} } = {}) {
  const values = new Map(ids.map((id, index) => [
    id,
    ids[index].includes('Eye') ? 1 : 0,
  ]));
  return {
    _parameterIds: ids,
    getParameterCount: () => ids.length,
    getParameterMinimumValue: index => ids[index].includes('Open') ? 0 : -30,
    getParameterMaximumValue: index => ids[index].includes('Open') ? 1 : 30,
    getParameterDefaultValue: index => ids[index].includes('Eye') ? 1 : 0,
    getParameterValueById: id => values.get(id),
    getPartOpacityById: id => partOpacityById[id],
    setParameterValueById: vi.fn((id, value) => values.set(id, value)),
  };
}

function createModel(coreModel = createCoreModel()) {
  const internalModel = {
    coreModel,
    update: vi.fn(() => {
      coreModel.setParameterValueById('ParamAngleX', 0);
      coreModel.setParameterValueById('ParamAngleY', 0);
    }),
  };
  return { internalModel };
}

function renderFrame(model, deltaMs = 1000 / 60, elapsedMs = Date.now()) {
  const result = model.internalModel.update(deltaMs, elapsedMs);
  return {
    result,
    angleX: model.internalModel.coreModel.getParameterValueById('ParamAngleX'),
    angleY: model.internalModel.coreModel.getParameterValueById('ParamAngleY'),
  };
}

function motion({ id, source = 'ai_reply', channel, value = 1 }) {
  return {
    type: 'live2d_motion_v3',
    motion_id: id,
    source,
    created_at_ms: Date.now(),
    expires_at_ms: Date.now() + 3000,
    duration_ms: 800,
    blend: { in_ms: 0, out_ms: 0 },
    tracks: [{
      channel,
      mode: 'override',
      keyframes: [{ t: 0, value }, { t: 1, value }],
    }],
  };
}

function callsFor(coreModel, id) {
  return coreModel.setParameterValueById.mock.calls.filter(([writtenId]) => writtenId === id);
}

describe('useLive2DController 统一状态混合', () => {
  let appRef;
  let modelRef;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-29T12:00:00.000Z'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    protocolControl.brokenMotionId = null;
    appRef = { current: null };
    modelRef = { current: createModel() };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function renderController({ currentModel = 'panda_cake', lipValue = { rhubarb: 'X' }, motionEvent = null, readyToken } = {}) {
    const initialReadyToken = readyToken === undefined
      ? { model: modelRef.current, modelName: currentModel, version: currentModel }
      : readyToken;
    return renderHook(({ model, lip, event, ready = initialReadyToken }) => useLive2DController(
      appRef, modelRef, model, 'neutral', lip, event, ready,
    ), { initialProps: { model: currentModel, lip: lipValue, event: motionEvent, ready: initialReadyToken } });
  }

  it('原生更新重置参数后仍在当前绘制前写入可见摇头值', () => {
    const originalUpdate = modelRef.current.internalModel.update;
    const view = renderController({
      motionEvent: motion({
        id: 'visible-after-native-update',
        source: 'user_command',
        channel: 'head_yaw',
        value: 0.8,
      }),
    });

    const frame = renderFrame(modelRef.current);

    expect(originalUpdate).toHaveBeenCalledOnce();
    expect(frame.angleX).toBeGreaterThan(0);
    view.unmount();
  });

  it('将 v3 head_pitch 投影写入 ParamAngleY', () => {
    const view = renderController({ motionEvent: motion({ id: 'pitch', channel: 'head_pitch', value: 0.6 }) });
    renderFrame(modelRef.current);
    expect(callsFor(modelRef.current.internalModel.coreModel, 'ParamAngleY').at(-1)[1]).toBeGreaterThan(0);
    view.unmount();
  });

  it('用户命令与 AI 回复在不同通道时都会写入', () => {
    const view = renderController({ motionEvent: motion({ id: 'user-pitch', source: 'user_command', channel: 'head_pitch' }) });
    view.rerender({ model: 'panda_cake', lip: { rhubarb: 'X' }, event: motion({ id: 'ai-roll', channel: 'body_roll', value: -0.5 }) });
    renderFrame(modelRef.current);
    const coreModel = modelRef.current.internalModel.coreModel;
    expect(callsFor(coreModel, 'ParamAngleY').at(-1)[1]).toBeGreaterThan(0);
    expect(callsFor(coreModel, 'ParamBodyAngleZ').at(-1)[1]).toBeLessThan(0);
    view.unmount();
  });

  it('兼容 v2 与本地微反应事件，并仍通过混合器写入语义参数', () => {
    const view = renderController({
      motionEvent: {
        type: 'live2d_action_v2', action_id: 'v2-listening', intent: 'warm_listening',
        intensity: 1, duration_ms: 800, variation_seed: 1,
      },
    });
    renderFrame(modelRef.current);
    const coreModel = modelRef.current.internalModel.coreModel;
    expect(callsFor(coreModel, 'ParamAngleY')).not.toHaveLength(0);

    view.rerender({
      model: 'panda_cake', lip: { rhubarb: 'X' },
      event: {
        type: 'local_micro_reaction', action_id: 'local-listening', intent: 'warm_listening',
        intensity: 1, duration_ms: 800, variation_seed: 2,
      },
    });
    renderFrame(modelRef.current);
    expect(callsFor(coreModel, 'ParamAngleY')).not.toHaveLength(0);
    view.unmount();
  });

  it('动作轨道不能改写口型保留参数', () => {
    const view = renderController({ motionEvent: motion({ id: 'blocked-mouth', channel: 'mouth_open', value: 1 }) });
    renderFrame(modelRef.current);
    const coreModel = modelRef.current.internalModel.coreModel;
    expect(callsFor(coreModel, 'ParamMouthOpenY').at(-1)[1]).toBe(0);
    expect(callsFor(coreModel, 'ParamMouthForm').at(-1)[1]).toBe(0);
    view.unmount();
  });

  it('TTS 仍可通过保留层写入口型', () => {
    const view = renderController({ lipValue: { rhubarb: 'C' } });
    renderFrame(modelRef.current);
    const coreModel = modelRef.current.internalModel.coreModel;
    expect(callsFor(coreModel, 'ParamMouthOpenY').at(-1)[1]).toBeGreaterThan(0);
    expect(callsFor(coreModel, 'ParamMouthForm').at(-1)[1]).toBe(0);
    view.unmount();
  });

  it('在通用映射之后投影 Hiyori 专属参数，并始终让 TTS 口型最后写入', () => {
    const coreModel = createCoreModel([...IDS, 'ParamArmLA', 'ParamHandL'], {
      partOpacityById: { PartArmA: 1 },
    });
    const hiyoriModel = createModel(coreModel);
    hiyoriModel.internalModel.update.mockImplementation(() => {
      coreModel.setParameterValueById('ParamAngleX', 0);
      coreModel.setParameterValueById('ParamAngleY', 0);
      coreModel.setParameterValueById('ParamArmLA', -10);
    });
    modelRef.current = hiyoriModel;
    const event = {
      type: 'live2d_motion_v3', motion_id: 'hiyori-arm-order', source: 'user_command',
      created_at_ms: Date.now(), expires_at_ms: Date.now() + 3000, duration_ms: 800,
      variation_seed: 12, blend: { in_ms: 0, out_ms: 0 },
      tracks: [
        { channel: 'head_yaw', mode: 'override', keyframes: [{ t: 0, value: 0.4 }, { t: 1, value: 0.4 }] },
        { channel: 'left_arm_raise', mode: 'override', keyframes: [{ t: 0, value: 0.5 }, { t: 1, value: 0.5 }] },
        { channel: 'left_hand_wave', mode: 'override', keyframes: [{ t: 0, value: 1 }, { t: 1, value: 1 }] },
      ],
    };
    const view = renderController({ currentModel: 'hiyori', lipValue: { rhubarb: 'C' }, motionEvent: event });
    coreModel.setParameterValueById.mockClear();

    renderFrame(hiyoriModel);
    const writes = coreModel.setParameterValueById.mock.calls;
    const genericIndex = writes.findLastIndex(([id]) => id === 'ParamAngleX');
    const armIndex = writes.findLastIndex(([id]) => id === 'ParamArmLA');
    const handIndex = writes.findLastIndex(([id]) => id === 'ParamHandL');
    const mouthIndex = writes.findLastIndex(([id]) => id === 'ParamMouthOpenY');

    expect(genericIndex).toBeGreaterThanOrEqual(0);
    expect(armIndex).toBeGreaterThan(genericIndex);
    expect(handIndex).toBeGreaterThan(armIndex);
    expect(mouthIndex).toBeGreaterThan(handIndex);
    expect(writes.at(-1)[0]).toBe('ParamMouthForm');
    view.unmount();
  });

  it('WebSocket generation 变化时清除仍在运行的模型专属轨道', () => {
    const coreModel = createCoreModel([...IDS, 'ParamArmLA'], { partOpacityById: { PartArmA: 1 } });
    const hiyoriModel = createModel(coreModel);
    hiyoriModel.internalModel.update.mockImplementation(() => {
      coreModel.setParameterValueById('ParamAngleX', 0);
      coreModel.setParameterValueById('ParamAngleY', 0);
      coreModel.setParameterValueById('ParamArmLA', -10);
    });
    modelRef.current = hiyoriModel;
    const activeArm = {
      type: 'live2d_motion_v3', motion_id: 'clear-on-generation', source: 'ai_reply',
      created_at_ms: Date.now(), expires_at_ms: Date.now() + 3000, duration_ms: 800,
      blend: { in_ms: 0, out_ms: 0 }, generation: 1,
      tracks: [{ channel: 'left_arm_raise', mode: 'override', keyframes: [{ t: 0, value: 0.5 }, { t: 1, value: 0.5 }] }],
    };
    const view = renderController({ currentModel: 'hiyori', motionEvent: activeArm });
    renderFrame(hiyoriModel);
    expect(callsFor(coreModel, 'ParamArmLA').at(-1)[1]).toBe(-5);

    coreModel.setParameterValueById.mockClear();
    view.rerender({ model: 'hiyori', lip: { rhubarb: 'X' }, event: { generation: 2 } });
    renderFrame(hiyoriModel);

    expect(callsFor(coreModel, 'ParamArmLA')).toEqual([['ParamArmLA', -10]]);
    view.unmount();
  });

  it('切换模型时重置混合器并重建能力表', () => {
    const view = renderController({ motionEvent: motion({ id: 'old-model-pitch', channel: 'head_pitch' }) });
    renderFrame(modelRef.current);
    const firstCoreModel = modelRef.current.internalModel.coreModel;
    expect(callsFor(firstCoreModel, 'ParamAngleY').at(-1)[1]).toBeGreaterThan(0);

    const replacementCoreModel = createCoreModel(IDS.filter(id => id !== 'ParamAngleY'));
    const replacementModel = createModel(replacementCoreModel);
    modelRef.current = replacementModel;
    view.rerender({
      model: 'hiyori', lip: { rhubarb: 'X' }, event: motion({ id: 'new-model-yaw', channel: 'head_yaw' }),
      ready: { model: replacementModel, modelName: 'hiyori', version: 2 },
    });
    renderFrame(modelRef.current);

    expect(callsFor(replacementCoreModel, 'ParamAngleY')).toHaveLength(1);
    expect(callsFor(replacementCoreModel, 'ParamAngleX').at(-1)[1]).toBeGreaterThan(0);
    view.unmount();
  });

  it('异步切换期间不会用新模型名绑定旧 CoreModel，新的 ready 实例才会建表', () => {
    const oldCoreModel = createCoreModel(IDS.filter(id => id !== 'ParamAngleX'));
    const oldModel = createModel(oldCoreModel);
    modelRef.current = oldModel;
    const view = renderController({ readyToken: { model: oldModel, modelName: 'panda_cake', version: 1 } });
    renderFrame(modelRef.current);
    oldCoreModel.setParameterValueById.mockClear();

    view.rerender({ model: 'hiyori', lip: { rhubarb: 'X' }, event: null, ready: null });
    renderFrame(modelRef.current);
    expect(oldCoreModel.setParameterValueById.mock.calls).toEqual([
      ['ParamAngleX', 0],
      ['ParamAngleY', 0],
    ]);

    const newCoreModel = createCoreModel(IDS.filter(id => id !== 'ParamAngleY'));
    const newModel = createModel(newCoreModel);
    modelRef.current = newModel;
    view.rerender({
      model: 'hiyori', lip: { rhubarb: 'X' }, event: motion({ id: 'new-ready-yaw', channel: 'head_yaw' }),
      ready: { model: newModel, modelName: 'hiyori', version: 2 },
    });
    renderFrame(modelRef.current);
    expect(callsFor(newCoreModel, 'ParamAngleX').at(-1)[1]).toBeGreaterThan(0);
    expect(callsFor(newCoreModel, 'ParamAngleY')).toHaveLength(1);
    view.unmount();
  });

  it('慢加载超过三秒后仍等待新的 ready 信号建立能力表', () => {
    modelRef.current = null;
    const view = renderController({ motionEvent: null, readyToken: null });
    vi.advanceTimersByTime(6000);
    const coreModel = createCoreModel();
    const newModel = createModel(coreModel);
    modelRef.current = newModel;
    view.rerender({
      model: 'panda_cake', lip: { rhubarb: 'X' }, event: motion({ id: 'slow-ready', channel: 'head_pitch' }),
      ready: { model: newModel, modelName: 'panda_cake', version: 1 },
    });
    renderFrame(modelRef.current);
    expect(callsFor(coreModel, 'ParamAngleY').at(-1)[1]).toBeGreaterThan(0);
    view.unmount();
  });

  it('仅切换模型而不更换事件时不会在新模型重播旧 motion_id', () => {
    const oldModel = modelRef.current;
    const oldEvent = motion({ id: 'do-not-replay', channel: 'head_pitch', value: 0.7 });
    const view = renderController({ readyToken: { model: oldModel, modelName: 'panda_cake', version: 1 }, motionEvent: oldEvent });
    renderFrame(modelRef.current);

    view.rerender({ model: 'hiyori', lip: { rhubarb: 'X' }, event: oldEvent, ready: null });
    const newCoreModel = createCoreModel();
    const newModel = createModel(newCoreModel);
    modelRef.current = newModel;
    view.rerender({
      model: 'hiyori', lip: { rhubarb: 'X' }, event: oldEvent,
      ready: { model: newModel, modelName: 'hiyori', version: 2 },
    });
    renderFrame(modelRef.current);
    expect(callsFor(newCoreModel, 'ParamAngleY').at(-1)[1]).toBe(0);
    view.unmount();
  });

  it('单个动作采样异常不会冻结下一帧', () => {
    protocolControl.brokenMotionId = 'broken-motion';
    const view = renderController({ motionEvent: motion({ id: 'broken-motion', channel: 'head_pitch' }) });
    const coreModel = modelRef.current.internalModel.coreModel;
    expect(() => renderFrame(modelRef.current)).not.toThrow();
    const writesAfterFailure = coreModel.setParameterValueById.mock.calls.length;
    expect(writesAfterFailure).toBeGreaterThan(0);
    expect(() => renderFrame(modelRef.current)).not.toThrow();
    expect(coreModel.setParameterValueById.mock.calls.length).toBeGreaterThan(writesAfterFailure);
    view.unmount();
  });

  it('动作结束后回归基础层，并在卸载时恢复原生 update', () => {
    const originalUpdate = modelRef.current.internalModel.update;
    const view = renderController({ motionEvent: motion({ id: 'return-center', channel: 'head_pitch' }) });
    const wrappedUpdate = modelRef.current.internalModel.update;

    expect(wrappedUpdate).not.toBe(originalUpdate);
    expect(renderFrame(modelRef.current).angleY).toBeGreaterThan(0);
    vi.advanceTimersByTime(801);
    expect(renderFrame(modelRef.current).angleY).toBe(0);

    view.unmount();
    expect(modelRef.current.internalModel.update).toBe(originalUpdate);
  });

  it('只向能力表中的参数写入有限且范围内的值', () => {
    const view = renderController({
      lipValue: { rhubarb: 'C' },
      motionEvent: motion({ id: 'bounded', channel: 'body_pitch', value: 1 }),
    });
    renderFrame(modelRef.current);
    const coreModel = modelRef.current.internalModel.coreModel;
    for (const [id, value] of coreModel.setParameterValueById.mock.calls) {
      const index = IDS.indexOf(id);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(coreModel.getParameterMinimumValue(index));
      expect(value).toBeLessThanOrEqual(coreModel.getParameterMaximumValue(index));
    }
    view.unmount();
  });

  it('同实例 ready 更新不会叠加包装，切换后旧实例恢复原生 update', () => {
    const oldModel = modelRef.current;
    const oldOriginalUpdate = oldModel.internalModel.update;
    const view = renderController({
      readyToken: {
        model: oldModel,
        modelName: 'panda_cake',
        version: 1,
      },
    });

    view.rerender({
      model: 'panda_cake',
      lip: { rhubarb: 'X' },
      event: null,
      ready: {
        model: oldModel,
        modelName: 'panda_cake',
        version: 2,
      },
    });
    oldModel.internalModel.update(16.67, 1000);
    expect(oldOriginalUpdate).toHaveBeenCalledOnce();

    const newModel = createModel();
    modelRef.current = newModel;
    view.rerender({
      model: 'hiyori',
      lip: { rhubarb: 'X' },
      event: null,
      ready: {
        model: newModel,
        modelName: 'hiyori',
        version: 3,
      },
    });

    expect(oldModel.internalModel.update).toBe(oldOriginalUpdate);
    view.unmount();
  });
});
