import { normalizeLive2DModel } from './modelActionProfiles';

const STORAGE_KEY = 'live2d_model';
const DEFAULT_MODEL = 'panda_cake';

export function readSelectedLive2DModel() {
  try {
    return normalizeLive2DModel(globalThis.localStorage?.getItem(STORAGE_KEY)) ?? DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

export function writeSelectedLive2DModel(modelName) {
  const selectedModel = normalizeLive2DModel(modelName);
  if (!selectedModel) return null;

  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, selectedModel);
  } catch {
    return null;
  }
  return selectedModel;
}
