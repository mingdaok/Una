export function installPostUpdateHook(
  internalModel,
  afterUpdate,
  { onAfterUpdateError = () => {} } = {},
) {
  if (!internalModel || typeof internalModel.update !== 'function') {
    return () => {};
  }
  if (typeof afterUpdate !== 'function') {
    return () => {};
  }

  const originalUpdate = internalModel.update;
  let active = true;

  function wrappedUpdate(...args) {
    const result = originalUpdate.apply(this, args);
    if (active) {
      try {
        afterUpdate(...args);
      } catch (error) {
        try {
          onAfterUpdateError(error);
        } catch {
          // Error reporting must not leak UNA post-processing failures.
        }
      }
    }
    return result;
  }

  internalModel.update = wrappedUpdate;

  return () => {
    if (!active) return;
    active = false;
    if (internalModel.update === wrappedUpdate) {
      internalModel.update = originalUpdate;
    }
  };
}
