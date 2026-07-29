import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Live2DViewer from '../Live2DViewer';
import { readSelectedLive2DModel, writeSelectedLive2DModel } from '../../live2d/modelSelection';

describe('Live2DViewer 参数控制层', () => {
  let app;
  let model;
  let resetExpression;

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    resetExpression = vi.fn();
    model = {
      anchor: { set: vi.fn() }, scale: { set: vi.fn() }, destroy: vi.fn(), motion: vi.fn(), expression: vi.fn(),
      internalModel: { motionManager: { expressionManager: { resetExpression } }, coreModel: {
        _parameterIds: ['ParamAngleY', 'ParamMouthOpenY', 'ParamMouthForm', 'ParamBreath'],
        getParameterCount: () => 4,
        getParameterMinimumValue: index => index === 1 ? 0 : -30,
        getParameterMaximumValue: index => index === 1 ? 1 : 30,
        getParameterDefaultValue: () => 0,
        setParameterValueById: vi.fn(), setParameterValueByIndex: vi.fn(),
      } },
    };
    app = { stage: { addChild: vi.fn(), removeChild: vi.fn() }, ticker: { add: vi.fn(), remove: vi.fn() }, destroy: vi.fn() };
    class FakeApplication { constructor() { return app; } }
    window.PIXI = { Application: FakeApplication, live2d: { Live2DModel: { from: vi.fn(() => Promise.resolve(model)) } } };
  });

  afterEach(() => { delete window.PIXI; vi.restoreAllMocks(); });

  it('将 motionEvent 传入统一控制器，并且模型加载和情绪切换不调用预设 Motion 或 Expression', async () => {
    const event = {
      type: 'live2d_motion_v3', motion_id: 'viewer-motion', source: 'ai_reply',
      created_at_ms: Date.now(), expires_at_ms: Date.now() + 3000, duration_ms: 800,
      blend: { in_ms: 0, out_ms: 0 },
      tracks: [{ channel: 'head_pitch', mode: 'override', keyframes: [{ t: 0, value: 0.5 }, { t: 1, value: 0.5 }] }],
    };
    const view = render(<Live2DViewer lipValue={{ rhubarb: 'X' }} emotion="neutral" motionEvent={event} />);
    await waitFor(() => expect(app.stage.addChild).toHaveBeenCalledWith(model));
    view.rerender(<Live2DViewer lipValue={{ rhubarb: 'X' }} emotion="thinking" motionEvent={event} />);
    await act(async () => Promise.resolve());
    expect(resetExpression).toHaveBeenCalledOnce();
    expect(model.motion).not.toHaveBeenCalled();
    expect(model.expression).not.toHaveBeenCalled();
  });
  it('persists model selection through the shared selection API', async () => {
    const view = render(<Live2DViewer lipValue={{}} emotion="neutral" motionEvent={null} />);
    await waitFor(() => expect(app.stage.addChild).toHaveBeenCalled());

    expect(readSelectedLive2DModel()).toBe('panda_cake');
    expect(writeSelectedLive2DModel('hiyori')).toBe('hiyori');
    expect(readSelectedLive2DModel()).toBe('hiyori');

    writeSelectedLive2DModel('panda_cake');
    fireEvent.click(view.container.querySelector('button'));
    fireEvent.click(view.getByText(/Hiyori/));
    expect(readSelectedLive2DModel()).toBe('hiyori');
  });
});
