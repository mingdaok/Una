import { describe, expect, it, vi } from 'vitest';
import { installPostUpdateHook } from '../postUpdateHook';

describe('installPostUpdateHook', () => {
  it('在原生 update 成功后、调用方继续绘制前执行 UNA 后处理', () => {
    const order = [];
    const internalModel = {
      marker: 'model-instance',
      update(deltaMs, elapsedMs) {
        expect(this).toBe(internalModel);
        order.push(`native:${deltaMs}:${elapsedMs}`);
        return 'native-result';
      },
    };

    installPostUpdateHook(internalModel, (deltaMs, elapsedMs) => {
      order.push(`una:${deltaMs}:${elapsedMs}`);
    });

    const result = internalModel.update(16.67, 1000);
    order.push('draw');

    expect(result).toBe('native-result');
    expect(order).toEqual([
      'native:16.67:1000',
      'una:16.67:1000',
      'draw',
    ]);
  });

  it('原生 update 抛错时保持异常并且不运行 UNA 后处理', () => {
    const nativeError = new Error('native update failed');
    const afterUpdate = vi.fn();
    const internalModel = {
      update: vi.fn(() => { throw nativeError; }),
    };

    installPostUpdateHook(internalModel, afterUpdate);

    expect(() => internalModel.update(16.67, 1000)).toThrow(nativeError);
    expect(afterUpdate).not.toHaveBeenCalled();
  });

  it('UNA 后处理单帧失败后仍允许下一帧恢复', () => {
    const onAfterUpdateError = vi.fn();
    let frame = 0;
    const internalModel = { update: vi.fn(() => 'ok') };
    const afterUpdate = vi.fn(() => {
      frame += 1;
      if (frame === 1) throw new Error('one broken UNA frame');
    });

    installPostUpdateHook(internalModel, afterUpdate, { onAfterUpdateError });

    expect(() => internalModel.update(16.67, 1000)).not.toThrow();
    expect(() => internalModel.update(16.67, 1017)).not.toThrow();
    expect(afterUpdate).toHaveBeenCalledTimes(2);
    expect(onAfterUpdateError).toHaveBeenCalledOnce();
  });

  it('cleanup 幂等恢复原函数且不覆盖外部后来安装的函数', () => {
    const originalUpdate = vi.fn();
    const internalModel = { update: originalUpdate };
    const cleanup = installPostUpdateHook(internalModel, vi.fn());
    const wrappedUpdate = internalModel.update;

    cleanup();
    cleanup();
    expect(internalModel.update).toBe(originalUpdate);

    const secondCleanup = installPostUpdateHook(internalModel, vi.fn());
    const externalUpdate = vi.fn();
    internalModel.update = externalUpdate;
    secondCleanup();

    expect(wrappedUpdate).not.toBe(originalUpdate);
    expect(internalModel.update).toBe(externalUpdate);
  });
});
