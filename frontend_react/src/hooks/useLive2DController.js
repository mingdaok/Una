import { useEffect, useRef } from 'react';
import { compileLegacyAction } from '../live2d/actionComposer';
import { buildModelCapabilityMap } from '../live2d/modelCapabilities';
import { compileMotionPlan, normalizeMotionEvent } from '../live2d/motionProtocol';
import { createLive2DStateMixer } from '../live2d/stateMixer';

const MAX_MODEL_RETRIES = 60;
const MODEL_RETRY_MS = 50;

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
export function useLive2DController(appRef, modelRef, currentModel, emotion, lipValue, motionEvent) {
  const capabilityMapRef = useRef(null);
  const mixerRef = useRef(createLive2DStateMixer());
  const lipValueRef = useRef(lipValue || { rhubarb: 'X' });
  const emotionTargetRef = useRef(emotionFrame(emotion));
  const emotionCurrentRef = useRef({ ...emotionFrame(emotion) });
  const blinkRef = useRef({ timer: 220, progress: 0, active: false });
  const breathRef = useRef({ phase: 0 });
  const mouthOpenRef = useRef(0);
  const mouthFormRef = useRef(0);

  useEffect(() => {
    lipValueRef.current = lipValue || { rhubarb: 'X' };
  }, [lipValue]);

  useEffect(() => {
    emotionTargetRef.current = emotionFrame(emotion);
  }, [emotion]);

  // CoreModel 没有公开 getParameterId()；能力图只读取实际可见的参数 ID 与索引范围。
  useEffect(() => {
    let attempts = 0;
    let retryTimer = null;
    let disposed = false;
    capabilityMapRef.current = null;
    mixerRef.current.reset();

    const buildCapabilities = () => {
      if (disposed) return;
      const coreModel = modelRef.current?.internalModel?.coreModel;
      if (coreModel?.setParameterValueById) {
        capabilityMapRef.current = buildModelCapabilityMap(coreModel, { modelName: currentModel });
        mixerRef.current.reset();
        return;
      }
      attempts += 1;
      if (attempts < MAX_MODEL_RETRIES) retryTimer = setTimeout(buildCapabilities, MODEL_RETRY_MS);
    };

    buildCapabilities();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      mixerRef.current.reset();
      capabilityMapRef.current = null;
    };
  }, [currentModel, modelRef]);

  useEffect(() => {
    const nowMs = Date.now();
    let compiled = null;
    if (motionEvent?.type === 'live2d_motion_v3') {
      const normalized = normalizeMotionEvent(motionEvent, { nowMs });
      compiled = normalized && compileMotionPlan(normalized);
    } else if (motionEvent?.type === 'live2d_action_v2' || motionEvent?.type === 'local_micro_reaction') {
      compiled = compileLegacyAction(motionEvent, currentModel, { nowMs });
    } else {
      compiled = legacyChatActionToMotion(motionEvent, nowMs);
    }
    if (compiled) mixerRef.current.enqueue(compiled, nowMs);
  }, [motionEvent, currentModel]);

  useEffect(() => {
    let pollTimer = null;
    let removeTicker = null;
    let disposed = false;

    const writeProjected = (coreModel, projected) => {
      for (const { id, value } of projected) {
        if (!id || !finite(value)) continue;
        try {
          coreModel.setParameterValueById(id, value);
        } catch {
          // 单个模型参数失败不能中断本帧其余保留层和下帧动画。
        }
      }
    };

    const tick = (deltaTime = 1) => {
      try {
        const model = modelRef.current;
        const coreModel = model?.internalModel?.coreModel;
        const capabilityMap = capabilityMapRef.current;
        if (!coreModel?.setParameterValueById || !capabilityMap) return;

        const target = emotionTargetRef.current;
        const current = emotionCurrentRef.current;
        for (const key of Object.keys(target)) current[key] = clamp(lerp(current[key] ?? 0, target[key], 0.12));

        const blink = blinkRef.current;
        blink.timer -= 1;
        if (!blink.active && blink.timer <= 0) {
          blink.active = true;
          blink.progress = 0;
          blink.timer = 180 + Math.floor(Math.random() * 240);
        }
        let blinkModifier = 0;
        if (blink.active) {
          blink.progress += 0.18;
          blinkModifier = blink.progress < 0.5 ? -blink.progress * 2 : -(1 - blink.progress) * 2;
          if (blink.progress >= 1) blink.active = false;
        }

        const dt = finite(deltaTime) ? Math.max(0, deltaTime) / 60 : 1 / 60;
        breathRef.current.phase = (breathRef.current.phase + dt * Math.PI) % (Math.PI * 2);
        const breath = (Math.sin(breathRef.current.phase) + 1) / 2;
        const lipSync = lipSyncFrame(lipValueRef.current, mouthOpenRef, mouthFormRef);
        const semanticFrame = mixerRef.current.sample({
          nowMs: Date.now(),
          idle: { head_yaw: 0, head_pitch: 0, body_yaw: 0, body_pitch: 0, body_roll: 0 },
          emotion: current,
          blink: { eye_open: blinkModifier },
          lipSync,
        });

        // 运动层只能经 project() 触达白名单语义参数；嘴与呼吸只走独立保留层。
        writeProjected(coreModel, capabilityMap.project(semanticFrame));
        writeProjected(coreModel, capabilityMap.projectBreath(breath));
        writeProjected(coreModel, capabilityMap.projectLipSync(lipSync));
      } catch (error) {
        console.warn('[Live2DCtrl] Ticker frame failed and will recover next frame.', error);
      }
    };

    const mountTicker = () => {
      if (disposed) return;
      const ticker = appRef.current?.ticker;
      if (!ticker?.add) {
        pollTimer = setTimeout(mountTicker, 100);
        return;
      }
      ticker.add(tick, undefined, -25);
      removeTicker = () => ticker.remove?.(tick);
    };

    mountTicker();
    return () => {
      disposed = true;
      if (pollTimer) clearTimeout(pollTimer);
      removeTicker?.();
      mixerRef.current.reset();
    };
  }, [appRef, modelRef]);
}
