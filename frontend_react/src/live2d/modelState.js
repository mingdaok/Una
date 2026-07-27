/**
 * 释放 pixi-live2d-display 的预设 Expression，并把 CoreModel 参数恢复为模型默认值。
 * 聊天动作只能由 useLive2DController 后续接管，禁止通过 model.expression() 随机复位。
 */
export function resetLive2DModelState(model) {
  if (!model) return false;

  let resetPerformed = false;
  const expressionManager = model.internalModel?.motionManager?.expressionManager;
  if (typeof expressionManager?.resetExpression === 'function') {
    try {
      expressionManager.resetExpression();
      resetPerformed = true;
    } catch (error) {
      console.warn('⚠️ [Live2D] ExpressionManager 复位失败:', error);
    }
  }

  const coreModel = model.internalModel?.coreModel;
  const canRestoreParameters = (
    typeof coreModel?.getParameterCount === 'function'
    && typeof coreModel?.getParameterDefaultValue === 'function'
    && typeof coreModel?.setParameterValueByIndex === 'function'
  );
  if (!canRestoreParameters) return resetPerformed;

  try {
    const parameterCount = coreModel.getParameterCount();
    for (let index = 0; index < parameterCount; index += 1) {
      const defaultValue = coreModel.getParameterDefaultValue(index);
      if (Number.isFinite(defaultValue)) {
        coreModel.setParameterValueByIndex(index, defaultValue);
      }
    }
    resetPerformed = true;
  } catch (error) {
    console.warn('⚠️ [Live2D] 模型默认参数恢复失败:', error);
  }

  return resetPerformed;
}
