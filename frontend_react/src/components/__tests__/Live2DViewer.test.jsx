import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Live2DViewer from '../Live2DViewer';


describe('Live2DViewer 参数控制权', () => {
  let app;
  let model;
  let resetExpression;

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    resetExpression = vi.fn();
    model = {
      anchor: { set: vi.fn() },
      scale: { set: vi.fn() },
      destroy: vi.fn(),
      motion: vi.fn(),
      expression: vi.fn(),
      internalModel: {
        motionManager: {
          expressionManager: { resetExpression },
        },
        coreModel: {
          getParameterCount: () => 2,
          getParameterDefaultValue: () => 0,
          getParameterValueById: () => 0,
          setParameterValueByIndex: vi.fn(),
        },
      },
    };

    app = {
      stage: {
        addChild: vi.fn(),
        removeChild: vi.fn(),
      },
      ticker: {
        add: vi.fn(),
        remove: vi.fn(),
      },
      destroy: vi.fn(),
    };

    class FakeApplication {
      constructor() {
        return app;
      }
    }

    window.PIXI = {
      Application: FakeApplication,
      live2d: {
        Live2DModel: {
          from: vi.fn(() => Promise.resolve(model)),
        },
      },
    };
  });

  afterEach(() => {
    delete window.PIXI;
    vi.restoreAllMocks();
  });

  it('加载时正式复位，情绪变化时不再调用预设 Motion 或 Expression', async () => {
    const view = render(
      <Live2DViewer
        lipValue={{ rhubarb: 'X' }}
        emotion="neutral"
        actionOverride={null}
      />,
    );

    await waitFor(() => expect(app.stage.addChild).toHaveBeenCalledWith(model));

    view.rerender(
      <Live2DViewer
        lipValue={{ rhubarb: 'X' }}
        emotion="thinking"
        actionOverride={null}
      />,
    );
    await act(async () => Promise.resolve());

    expect(resetExpression).toHaveBeenCalledOnce();
    expect(model.motion).not.toHaveBeenCalled();
    expect(model.expression).not.toHaveBeenCalled();
  });
});
