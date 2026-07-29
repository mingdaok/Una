import { useEffect, useRef } from 'react';
import { compileLegacyAction } from '../live2d/actionComposer';
import { projectModelSpecificActions } from '../live2d/modelActionProjection';
import { buildModelCapabilityMap } from '../live2d/modelCapabilities';
import { compileMotionPlan, normalizeMotionEvent } from '../live2d/motionProtocol';
import { installPostUpdateHook } from '../live2d/postUpdateHook';
import { createLive2DStateMixer } from '../live2d/stateMixer';

const EMOTION_FRAMES = Object.freeze({
  happy: { eye_open: -0.05, eye_smile: 0.35, brow_y: 0.2, brow_form: 0.2, cheek: 0.3 },
  joy: { eye_open: 0.05, eye_smile: 0.45, brow_y: 0.25, brow_form: 0.25, cheek: 0.4 },
  excited: { eye_open: 0.2, eye_smile: 0.45, brow_y: 0.4, brow_form: 0.25, cheek: 0.45 },
  thinking: { eye_open: -0.15, eye_smile: -0.1, brow_y: -0.15, brow_form: -0.15, cheek: 0 },
  sad: { eye_open: -0.35, eye_smile: -0.3, brow_y: -0.35, brow_form: -0.2, cheek: 0.1 },
  angry: { eye_open: 0.1, eye_smile: -0.35, brow_y: -0.4, brow_form: -0.25, cheek: 0.2 },
  surprised: { eye_open: 0.3, eye_smile: 0.05, brow_y: 0.5, brow_form: 0.1, cheek: 0.15 },
  neutral: { eye_open: -0.1, eye_smile: 0, brow_y: 0, brow_form: 0, cheek: 0 },
});

const EMOTION_ALIASES = Object.freeze({
  laugh: 'joy', smile: 'happy', funny: 'happy',
  shy: 'happy', blush: 'happy', cute: 'happy',
  confused: 'thinking', doubt: 'thinking', serious: 'thinking', focus: 'thinking', idle: 'neutral',
  cry: 'sad', depressed: 'sad', sorry: 'sad', disappointed: 'sad',
  mad: 'angry', annoyed: 'angry', disgusted: 'angry',
  shocked: 'surprised', wow: 'surprised',
  uneasy: 'thinking', fear: 'sad', nervous: 'thinking', worried: 'sad',
});

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value) {
  return Math.max(-1, Math.min(1, value));
}

function lerp(current, target, factor) {
  return current + (target - current) * factor;
}

function writeProjected(coreModel, projected) {
  for (const { id, value } of projected) {
    if (!id || !finite(value)) continue;
    try {
      coreModel.setParameterValueById(id, value);
    } catch {
      // 单个模型参数失败不能阻塞本帧其他参数和下一帧。
    }
  }
}

function readablePartOpacities(coreModel) {
  const values = new Map();
  try {
    const opacity = Number(coreModel?.getPartOpacityById?.('PartArmA'));
    if (Number.isFinite(opacity)) values.set('PartArmA', opacity);
  } catch {
    // Part visibility is optional metadata; unavailable parts simply disable the guarded Hiyori track.
  }
  return values;
}

function emotionFrame(emotion) {
  const key = typeof emotion === 'string' ? emotion.toLowerCase().trim() : 'neutral';
  return EMOTION_FRAMES[EMOTION_ALIASES[key] || key] || EMOTION_FRAMES.neutral;
}

function lipSyncFrame(lipValue, currentOpenRef, currentFormRef) {
  const viseme = lipValue?.rhubarb || 'X';
  const map = {
    A: [0, 0], B: [0.4, 1], C: [1, 0], D: [0.8, 0],
    E: [0.5, -1], F: [0.4, -0.5], G: [0.2, 0], H: [0.3, 0], X: [0, 0],
  };
  const [mappedOpen, mappedForm] = map[viseme] || map.X;
  const targetOpen = finite(lipValue?.openY) ? clamp(lipValue.openY) : mappedOpen;
  const targetForm = finite(lipValue?.form) ? clamp(lipValue.form) : mappedForm;
  const openRate = targetOpen > currentOpenRef.current ? 0.35 : 0.15;
  currentOpenRef.current = clamp(lerp(currentOpenRef.current, targetOpen, openRate));
  currentFormRef.current = clamp(lerp(currentFormRef.current, targetForm, 0.25));
  return { mouth_open: currentOpenRef.current, mouth_form: currentFormRef.current };
}

function legacyChatActionToMotion(event, nowMs) {
  if (!event || typeof event !== 'object' || !event.action) return null;
  const direction = event.params?.direction || event.params?.head_tilt;
  let channel = 'head_pitch';
  let value = 0;
  if (direction === 'left' || direction === '头左偏') {
    channel = 'head_yaw'; value = 0.3;
  } else if (direction === 'right' || direction === '头右偏') {
    channel = 'head_yaw'; value = -0.3;
  } else if (direction === '头低下') {
    channel = 'head_pitch'; value = -0.35;
  } else if (event.action === '开心') {
    channel = 'body_roll'; value = 0.25;
  } else if (event.action === '害羞') {
    channel = 'cheek'; value = 0.35;
  } else if (event.action === '惊讶') {
    channel = 'eye_open'; value = 0.25;
  } else {
    return null;
  }
  return compileMotionPlan({
    motion_id: `legacy-chat-${event.action_id || nowMs}-${channel}`,
    source: 'legacy_fallback',
    duration_ms: 800,
    expires_at_ms: nowMs + 1800,
    blend: { in_ms: 80, out_ms: 120 },
    tracks: [{
      channel,
      mode: 'override',
      keyframes: [
        { t: 0, value: 0, easing: 'ease_in_out' },
        { t: 0.5, value, easing: 'ease_in_out' },
        { t: 1, value: 0, easing: 'ease_in_out' },
      ],
    }],
  });
}

/**
 * Live2D 参数写入的唯一入口。
 * 所有动作先编译为语义通道，再由状态混合器合成；口型和呼吸通过保留层独立投影。
 */
export function useLive2DController(appRef, modelRef, currentModel, emotion, lipValue, motionEvent, modelReady, motionGeneration) {
  const capabilityMapRef = useRef(null);
  const mixerRef = useRef(createLive2DStateMixer());
  const currentModelRef = useRef(currentModel);
  const lipValueRef = useRef(lipValue || { rhubarb: 'X' });
  const emotionTargetRef = useRef(emotionFrame(emotion));
  const emotionCurrentRef = useRef({ ...emotionFrame(emotion) });
  const blinkRef = useRef({ timer: 220, progress: 0, active: false });
  const breathRef = useRef({ phase: 0 });
  const mouthOpenRef = useRef(0);
  const mouthFormRef = useRef(0);
  const applyControllerFrameRef = useRef(() => {});
  const motionGenerationRef = useRef(null);
  const pandaStateRef = useRef(null);
  currentModelRef.current = currentModel;

  applyControllerFrameRef.current = (deltaMs = 1000 / 60) => {
    const model = modelRef.current;
    const coreModel = model?.internalModel?.coreModel;
    const capabilityMap = capabilityMapRef.current;
    if (!coreModel?.setParameterValueById || !capabilityMap) return;

    const frameStep = finite(deltaMs)
      ? Math.max(0, Math.min(4, deltaMs / (1000 / 60)))
      : 1;
    const target = emotionTargetRef.current;
    const current = emotionCurrentRef.current;
    for (const key of Object.keys(target)) {
      current[key] = clamp(lerp(current[key] ?? 0, target[key], 0.12));
    }

    const blink = blinkRef.current;
    blink.timer -= frameStep;
    if (!blink.active && blink.timer <= 0) {
      blink.active = true;
      blink.progress = 0;
      blink.timer = 180 + Math.floor(Math.random() * 240);
    }
    let blinkModifier = 0;
    if (blink.active) {
      blink.progress += 0.18 * frameStep;
      blinkModifier = blink.progress < 0.5
        ? -blink.progress * 2
        : -(1 - blink.progress) * 2;
      if (blink.progress >= 1) blink.active = false;
    }

    breathRef.current.phase = (
      breathRef.current.phase + (frameStep / 60) * Math.PI
    ) % (Math.PI * 2);
    const breath = (Math.sin(breathRef.current.phase) + 1) / 2;
    const lipSync = lipSyncFrame(lipValueRef.current, mouthOpenRef, mouthFormRef);
    const semanticFrame = mixerRef.current.sample({
      nowMs: Date.now(),
      idle: {
        head_yaw: 0,
        head_pitch: 0,
        body_yaw: 0,
        body_pitch: 0,
        body_roll: 0,
      },
      emotion: current,
      blink: { eye_open: blinkModifier },
      lipSync,
    });
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      semanticFrame.monotonic_time_ms = performance.now();
    }

    writeProjected(coreModel, capabilityMap.project(semanticFrame));
    writeProjected(coreModel, capabilityMap.projectBreath(breath));
    const modelSpecific = projectModelSpecificActions({
      coreModel,
      modelName: currentModelRef.current,
      semanticFrame,
      capabilityMap,
      partOpacityById: readablePartOpacities(coreModel),
      pandaState: pandaStateRef.current,
      deltaMs,
    });
    pandaStateRef.current = modelSpecific.pandaState;
    writeProjected(coreModel, modelSpecific.writes);
    writeProjected(coreModel, capabilityMap.projectLipSync(lipSync));
  };

  useEffect(() => {
    lipValueRef.current = lipValue || { rhubarb: 'X' };
  }, [lipValue]);

  useEffect(() => {
    emotionTargetRef.current = emotionFrame(emotion);
  }, [emotion]);

  // 切换意图一出现就清空旧模型的能力表和动作；不能借用尚未卸载的旧实例。
  useEffect(() => {
    capabilityMapRef.current = null;
    mixerRef.current.reset();
    motionGenerationRef.current = null;
    pandaStateRef.current = null;
  }, [currentModel]);

  // A newer socket generation cannot retain parameter tracks received by its predecessor.
  useEffect(() => {
    const generation = motionGeneration;
    if (!Number.isFinite(generation)) return;
    if (motionGenerationRef.current !== null && motionGenerationRef.current !== generation) {
      mixerRef.current.reset();
    }
    motionGenerationRef.current = generation;
  }, [motionGeneration]);

  // 只有 Viewer 宣告“该实例已准备好”后才建表。这替代有限次数轮询，慢加载也能恢复。
  useEffect(() => {
    if (
      !modelReady
      || modelReady.modelName !== currentModel
      || modelReady.model !== modelRef.current
    ) return undefined;

    const internalModel = modelReady.model?.internalModel;
    const coreModel = internalModel?.coreModel;
    if (
      typeof internalModel?.update !== 'function'
      || typeof coreModel?.setParameterValueById !== 'function'
    ) return undefined;

    const replacesReadyInstance = capabilityMapRef.current !== null;
    capabilityMapRef.current = buildModelCapabilityMap(coreModel, {
      modelName: currentModel,
    });
    if (replacesReadyInstance) mixerRef.current.reset();

    const installedModel = modelReady.model;
    const removePostUpdateHook = installPostUpdateHook(
      internalModel,
      deltaMs => applyControllerFrameRef.current(deltaMs),
      {
        onAfterUpdateError: error => {
          console.warn(
            '[Live2DCtrl] Post-update frame failed and will recover next frame.',
            error,
          );
        },
      },
    );

    return () => {
      removePostUpdateHook();
      if (modelRef.current === installedModel) {
        capabilityMapRef.current = null;
      }
      mixerRef.current.reset();
      motionGenerationRef.current = null;
    };
  }, [currentModel, modelReady?.version, modelReady?.model, modelReady?.modelName, modelRef]);

  useEffect(() => {
    const nowMs = Date.now();
    let compiled = null;
    if (motionEvent?.type === 'live2d_motion_v3') {
      const normalized = normalizeMotionEvent(motionEvent, { nowMs });
      compiled = normalized && compileMotionPlan(normalized);
    } else if (motionEvent?.type === 'live2d_action_v2' || motionEvent?.type === 'local_micro_reaction') {
      compiled = compileLegacyAction(motionEvent, currentModelRef.current, { nowMs });
    } else {
      compiled = legacyChatActionToMotion(motionEvent, nowMs);
    }
    if (compiled) {
      const variationSeed = Number.isInteger(motionEvent?.variation_seed)
        ? motionEvent.variation_seed
        : 0;
      mixerRef.current.enqueue({ ...compiled, variationSeed }, nowMs);
    }
  }, [motionEvent]);

}
