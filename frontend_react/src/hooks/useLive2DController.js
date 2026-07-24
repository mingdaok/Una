import { useEffect, useRef } from 'react';

// ============================================================
// useLive2DController
// 
// 职责：替代 Live2DViewer.jsx 中所有分散的 useEffect + Ticker 逻辑，
// 成为 Live2D 参数写入的唯一权威入口。
//
// 核心设计：分层拦截器 (Layered Interceptor)
//   Layer 1 - 情感目标层   : 接收后端情感字符串，换算成 5 个目标参数
//   Layer 2 - Lerp 平滑层  : 在 PIXI Ticker 中将当前值缓慢插值到目标值
//   Layer 3 - 联动计算层   : 情感值联动身体轴、呼吸频率（正弦波注入）
//   Layer 4 - 参数写入层   : safeSetParam + 参数白名单过滤，防止异常
//   Layer 5 - 后期覆写层   : Ticker 最末尾强制覆写口型/眨眼/cheek，
//                            此层不受任何 Motion 关键帧影响
//
// @param {React.MutableRefObject} appRef       - PIXI.Application 实例的 ref
// @param {React.MutableRefObject} modelRef     - Live2D 模型实例的 ref
// @param {string} currentModel                 - 当前模型名称 ('panda_cake' | 'hiyori')
// @param {string|null} emotion                 - 情感字符串，来自后端 WS data.emotion
// @param {{ openY: number, form: number }} lipValue - 口型数据，来自 useUnaCore 的 FFT 分析
// ============================================================
export function useLive2DController(appRef, modelRef, currentModel, emotion, lipValue, actionOverride) {

  // --- 参数白名单 (在模型加载后填充) ---
  const validParamsRef = useRef(new Set());

  // --- 当前实际参数缓存 (Lerp 的"当前值") ---
  // 脸部参数
  const curFaceRef = useRef({
    smile: 0.5,
    browAngle: 0.3,
    eyeOpen: 0.8,
    mouthForm: 0.2,
    cheek: 0.0,
  });

  // 身体参数（更慢的独立插值通道）
  const curBodyRef = useRef({
    bodyAngleX: 0.0,  // 左右倾斜
    bodyAngleY: 0.0,  // 前后倾斜（低头/抬头）
    bodyAngleZ: 0.0,  // 左右摇摆
    headAngleX: 0.0,  // 头部左右
    headAngleY: 0.0,  // 头部前后
  });

  // --- 目标参数缓存 (由情感计算层写入) ---
  const targetFaceRef = useRef({ ...curFaceRef.current });
  const targetBodyRef = useRef({ ...curBodyRef.current });

  // --- 口型参数缓存（直通最高优先级层，不经过 Lerp）---
  const lipValueRef = useRef({ rhubarb: 'X' });
  const currentOpenYRef = useRef(0);
  const currentFormRef = useRef(0);

  // --- 呼吸动画状态 ---
  const breathStateRef = useRef({
    phase: 0,       // 当前相位 (0 ~ 2π)
    frequency: 0.8, // 呼吸频率（弧度/秒），越高越急促
  });

  // --- 自动眨眼状态 ---
  const blinkStateRef = useRef({
    timer: 0,             // 距下次眨眼的倒计时（帧数）
    isBlinking: false,    // 正在眨眼中
    blinkProgress: 0,     // 眨眼进度 0=睁开 1=闭合
  });

  // --- 当前情感强度（用于身体控制权移交判断）---
  const emotionIntensityRef = useRef(0.0);

  // --- 动作覆写通道 (Action Override) ---
  const actionOverrideRef = useRef(null);

  useEffect(() => {
    if (actionOverride && actionOverride.action) {
      actionOverrideRef.current = {
        action: actionOverride.action,
        params: actionOverride.params || {},
        startTime: Date.now(),
        duration: 800 // 800ms 内完成
      };
    }
  }, [actionOverride]);

  // ============================================================
  // 情感字符串 → 5个目标参数的映射表
  // 参数说明：
  //   smile    : 嘴角上扬 (0=紧绷 1=大笑)
  //   browAngle: 眉毛角度 (0=皱眉 1=扬眉)
  //   eyeOpen  : 眼睛睁开度 (0=完全闭合 1=瞪大)
  //   mouthForm: 嘴型扁圆 (0=扁平 1=圆形O型嘴)
  //   cheek    : 脸颊红晕 (0=正常 1=深红)
  // ============================================================
  const EMOTION_TO_PARAMS = {
    // === 积极情绪 ===
    happy:       { smile: 0.85, browAngle: 0.65, eyeOpen: 0.85, mouthForm: 0.4,  cheek: 0.3 },
    joy:         { smile: 0.90, browAngle: 0.70, eyeOpen: 0.90, mouthForm: 0.5,  cheek: 0.4 },
    excited:     { smile: 0.95, browAngle: 0.75, eyeOpen: 0.95, mouthForm: 0.55, cheek: 0.5 },
    laugh:       { smile: 1.0,  browAngle: 0.70, eyeOpen: 0.70, mouthForm: 0.6,  cheek: 0.4 },
    smile:       { smile: 0.70, browAngle: 0.55, eyeOpen: 0.80, mouthForm: 0.3,  cheek: 0.2 },
    funny:       { smile: 0.80, browAngle: 0.60, eyeOpen: 0.75, mouthForm: 0.4,  cheek: 0.3 },
    // === 害羞/可爱 ===
    shy:         { smile: 0.55, browAngle: 0.45, eyeOpen: 0.60, mouthForm: 0.2,  cheek: 0.7 },
    blush:       { smile: 0.50, browAngle: 0.40, eyeOpen: 0.55, mouthForm: 0.15, cheek: 0.8 },
    cute:        { smile: 0.65, browAngle: 0.50, eyeOpen: 0.70, mouthForm: 0.3,  cheek: 0.6 },
    // === 思考/中性 ===
    thinking:    { smile: 0.30, browAngle: 0.25, eyeOpen: 0.65, mouthForm: 0.1,  cheek: 0.0 },
    confused:    { smile: 0.25, browAngle: 0.20, eyeOpen: 0.70, mouthForm: 0.1,  cheek: 0.1 },
    doubt:       { smile: 0.20, browAngle: 0.15, eyeOpen: 0.65, mouthForm: 0.0,  cheek: 0.0 },
    serious:     { smile: 0.15, browAngle: 0.30, eyeOpen: 0.75, mouthForm: 0.0,  cheek: 0.0 },
    focus:       { smile: 0.20, browAngle: 0.35, eyeOpen: 0.80, mouthForm: 0.05, cheek: 0.0 },
    neutral:     { smile: 0.40, browAngle: 0.35, eyeOpen: 0.75, mouthForm: 0.15, cheek: 0.0 },
    idle:        { smile: 0.40, browAngle: 0.35, eyeOpen: 0.75, mouthForm: 0.15, cheek: 0.0 },
    // === 悲伤/消极 ===
    sad:         { smile: 0.05, browAngle: 0.05, eyeOpen: 0.50, mouthForm: 0.0,  cheek: 0.1 },
    cry:         { smile: 0.0,  browAngle: 0.0,  eyeOpen: 0.35, mouthForm: 0.0,  cheek: 0.15 },
    depressed:   { smile: 0.05, browAngle: 0.05, eyeOpen: 0.40, mouthForm: 0.0,  cheek: 0.05 },
    sorry:       { smile: 0.10, browAngle: 0.08, eyeOpen: 0.45, mouthForm: 0.0,  cheek: 0.1 },
    disappointed:{ smile: 0.08, browAngle: 0.06, eyeOpen: 0.45, mouthForm: 0.0,  cheek: 0.05 },
    // === 愤怒 ===
    angry:       { smile: 0.05, browAngle: 0.05, eyeOpen: 0.90, mouthForm: 0.0,  cheek: 0.2 },
    mad:         { smile: 0.0,  browAngle: 0.0,  eyeOpen: 0.95, mouthForm: 0.0,  cheek: 0.25 },
    annoyed:     { smile: 0.10, browAngle: 0.10, eyeOpen: 0.85, mouthForm: 0.05, cheek: 0.1 },
    disgusted:   { smile: 0.05, browAngle: 0.05, eyeOpen: 0.80, mouthForm: 0.0,  cheek: 0.1 },
    // === 惊讶 ===
    surprised:   { smile: 0.50, browAngle: 0.80, eyeOpen: 1.0,  mouthForm: 0.6,  cheek: 0.15 },
    shocked:     { smile: 0.30, browAngle: 0.90, eyeOpen: 1.0,  mouthForm: 0.7,  cheek: 0.1 },
    wow:         { smile: 0.55, browAngle: 0.85, eyeOpen: 0.95, mouthForm: 0.65, cheek: 0.2 },
    // === 不安/恐惧 ===
    uneasy:      { smile: 0.15, browAngle: 0.15, eyeOpen: 0.60, mouthForm: 0.1,  cheek: 0.0 },
    fear:        { smile: 0.05, browAngle: 0.70, eyeOpen: 0.90, mouthForm: 0.2,  cheek: 0.0 },
    nervous:     { smile: 0.20, browAngle: 0.25, eyeOpen: 0.70, mouthForm: 0.1,  cheek: 0.1 },
    worried:     { smile: 0.15, browAngle: 0.20, eyeOpen: 0.60, mouthForm: 0.05, cheek: 0.05 },
  };

  // ============================================================
  // Layer 1: 情感字符串 → 目标参数换算
  // 每次 emotion props 变化时更新目标值
  // ============================================================
  useEffect(() => {
    const tag = (emotion || 'neutral').toLowerCase().trim();
    const params = EMOTION_TO_PARAMS[tag] || EMOTION_TO_PARAMS.neutral;

    targetFaceRef.current = { ...params };

    // --- 情绪强度：用 smile 和 eyeOpen 的偏离中性程度来衡量 ---
    const intensity = Math.abs(params.smile - 0.4) + Math.abs(params.eyeOpen - 0.75);
    emotionIntensityRef.current = Math.min(1.0, intensity * 1.2);

    // --- 身体目标值：根据情绪类型决定身体朝向 ---
    const isHappy    = params.smile > 0.6;
    const isSad      = params.smile < 0.15;
    const isAngry    = params.browAngle < 0.1 && params.eyeOpen > 0.85;
    const isSurp     = params.browAngle > 0.75;

    if (isHappy) {
      // 开心：身体微微抬起，头稍微上扬
      targetBodyRef.current.bodyAngleY = 5.0;
      targetBodyRef.current.headAngleY = 0.0;
    } else if (isSad) {
      // 悲伤：身体前倾/低头
      targetBodyRef.current.bodyAngleY = -8.0;
      targetBodyRef.current.headAngleY = -10.0;
    } else if (isAngry) {
      // 愤怒：身体略微后仰，头平视
      targetBodyRef.current.bodyAngleY = -3.0;
      targetBodyRef.current.headAngleY = 5.0;
    } else if (isSurp) {
      // 惊讶：身体略微后仰
      targetBodyRef.current.bodyAngleY = -5.0;
      targetBodyRef.current.headAngleY = 8.0;
    } else {
      // 中性：回归中心
      targetBodyRef.current.bodyAngleY = 0.0;
      targetBodyRef.current.headAngleY = 0.0;
    }

    // --- 呼吸频率：情绪越激动，呼吸越快 ---
    // 平静时约 0.5 rad/s（约12秒一次），激动时约 1.5 rad/s（约4秒一次）
    breathStateRef.current.frequency = 0.5 + emotionIntensityRef.current * 1.0;

  }, [emotion]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // 同步 lipValue 到 ref（避免 Ticker 闭包过时问题）
  // ============================================================
  useEffect(() => {
    lipValueRef.current = lipValue || { openY: 0, form: 0 };
  }, [lipValue]);

  // ============================================================
  // Layer 0: 参数嗅探 - 模型加载后建立白名单
  // 每次 currentModel 变化（新模型加载）时重新扫描
  // ============================================================
  useEffect(() => {
    // 等待模型实例出现（最多等待 3 秒）
    let attempts = 0;
    const maxAttempts = 60; // 50ms * 60 = 3s

    const trySniff = () => {
      const model = modelRef.current;
      if (!model) {
        if (++attempts < maxAttempts) setTimeout(trySniff, 50);
        return;
      }

      try {
        const coreModel = model.internalModel?.coreModel;
        if (!coreModel) {
          if (++attempts < maxAttempts) setTimeout(trySniff, 50);
          return;
        }

        // 扫描所有参数 ID，建立白名单
        const paramSet = new Set();
        const paramCount = coreModel.getParameterCount
          ? coreModel.getParameterCount()
          : 0;

        for (let i = 0; i < paramCount; i++) {
          if (typeof coreModel.getParameterId === 'function') {
            const id = coreModel.getParameterId(i);
            if (id) paramSet.add(id);
          }
        }

        // 如果 getParameterCount 不可用，用常规参数名尝试嗅探
        if (paramSet.size === 0) {
          const commonParams = [
            'ParamAngleX', 'ParamAngleY', 'ParamAngleZ',
            'ParamBodyAngleX', 'ParamBodyAngleY', 'ParamBodyAngleZ',
            'ParamEyeLOpen', 'ParamEyeROpen',
            'ParamEyeBallX', 'ParamEyeBallY',
            'ParamBrowLY', 'ParamBrowRY', 'ParamBrowLForm', 'ParamBrowRForm',
            'ParamMouthOpenY', 'ParamMouthForm', 'ParamMouthOpenY4',
            'ParamCheek', 'ParamBreath',
            'ParamArmLA', 'ParamArmRA', 'ParamArmLB', 'ParamArmRB',
            'JAW',
            // panda_cake 特有参数
            'Param159', 'Param160', 'Param161', 'Param170', 'Param171', 'Param173',
            'Param15', 'Param4', 'ParamMouthOpenY2',
          ];
          for (const id of commonParams) {
            try {
              // 尝试读取参数值，不会抛错则说明存在
              const v = coreModel.getParameterValueById(id);
              if (v !== undefined && v !== null) paramSet.add(id);
            } catch (e) {
              // 参数不存在，忽略
            }
          }
        }

        validParamsRef.current = paramSet;
        console.log(`✅ [Live2DCtrl] 参数嗅探完成，${currentModel} 共 ${paramSet.size} 个参数`);

      } catch (e) {
        console.warn('⚠️ [Live2DCtrl] 参数嗅探失败:', e);
      }
    };

    // 清空旧白名单
    validParamsRef.current = new Set();
    trySniff();

  }, [currentModel, modelRef]); // currentModel 切换时重新嗅探

  // ============================================================
  // Layer 2~5: PIXI Ticker 主循环
  // 使用轮询等待 appRef 就绪，然后挂载 Ticker（解决初始化时序问题）
  // ============================================================
  useEffect(() => {
    let tickerRemoveFn = null; // 保存已挂载 Ticker 的移除函数
    let pollTimer = null;      // 轮询定时器

    // 内部函数：等待 appRef 就绪后挂载 Ticker
    const mountTicker = () => {
      const app = appRef.current;
      if (!app) {
        // 每 100ms 轮询一次，最多等待 5 秒
        pollTimer = setTimeout(mountTicker, 100);
        return;
      }

    // --- 安全参数写入封装 ---
    // 只有白名单中存在的参数才会真正写入，且捕获所有异常
    const safeSetParam = (coreModel, id, value) => {
      if (!validParamsRef.current.has(id)) return;
      try {
        coreModel.setParameterValueById(id, value);
      } catch (e) {
        // 静默处理，防止一个参数报错影响整帧渲染
      }
    };

    // --- 线性插值工具 ---
    const lerp = (current, target, factor) => current + (target - current) * factor;

    // --- easeOutQuad 缓动（用于口型张开，快开慢关效果） ---
    const easeOutQuad = (t) => t * (2 - t);

    // ============================================================
    // PIXI Ticker 回调：每帧执行
    // deltaTime 是 PIXI 提供的帧时间缩放系数（60fps下约为1）
    // ============================================================
    const tickerCallback = (deltaTime) => {
      const model = modelRef.current;
      if (!model) return;

      const coreModel = model.internalModel?.coreModel;
      if (!coreModel || !coreModel.setParameterValueById) return;

      // ---- 帧时间（归一秒，用于正弦波计算） ----
      // PIXI deltaTime 单位是帧，60fps下1帧=1/60秒
      const dt = deltaTime / 60;

      // ============================================================
      // Layer 2: Lerp 平滑层 - 脸部参数（较快，0.12）
      // ============================================================
      const FACE_LERP  = 0.12;  // 脸部微表情插值系数
      const BODY_LERP  = 0.04;  // 身体姿态插值系数（缓慢柔和）
      const HEAD_LERP  = 0.06;  // 头部姿态插值系数

      const tf = targetFaceRef.current;
      const cf = curFaceRef.current;

      cf.smile     = lerp(cf.smile,     tf.smile,     FACE_LERP);
      cf.browAngle = lerp(cf.browAngle, tf.browAngle,  FACE_LERP);
      cf.eyeOpen   = lerp(cf.eyeOpen,   tf.eyeOpen,   FACE_LERP);
      cf.mouthForm = lerp(cf.mouthForm, tf.mouthForm,  FACE_LERP);
      cf.cheek     = lerp(cf.cheek,     tf.cheek,     FACE_LERP);

      // ============================================================
      // Layer 3: 联动计算层 - 身体轴 + 呼吸
      // ============================================================
      const tb = targetBodyRef.current;
      const cb = curBodyRef.current;

      // 开心时 bodyAngleZ 加入正弦摇摆（慢速摇摆，周期约5秒）
      const isHappyNow = cf.smile > 0.6;
      const time = Date.now() / 1000;
      const swayAmplitude = isHappyNow ? cf.smile * 3.0 : 0.5; // 开心时摇摆幅度增大
      const swaySpeed     = isHappyNow ? 0.8 : 0.3;            // 开心时摇摆稍快
      const targetBodyZ   = Math.sin(time * swaySpeed * Math.PI * 2) * swayAmplitude;

      // 身体 Y/Z 插值（极慢，避免突变带来的惊吓感）
      cb.bodyAngleY = lerp(cb.bodyAngleY, tb.bodyAngleY, BODY_LERP);
      cb.bodyAngleZ = lerp(cb.bodyAngleZ, targetBodyZ,   BODY_LERP);
      cb.bodyAngleX = lerp(cb.bodyAngleX, tb.bodyAngleX, BODY_LERP);

      // 头部姿态
      cb.headAngleX = lerp(cb.headAngleX, tb.headAngleX || 0, HEAD_LERP);
      cb.headAngleY = lerp(cb.headAngleY, tb.headAngleY || 0, HEAD_LERP);

      // --- 呼吸正弦波 ---
      const breath = breathStateRef.current;
      breath.phase += breath.frequency * dt * Math.PI * 2;
      if (breath.phase > Math.PI * 2) breath.phase -= Math.PI * 2;
      const breathValue = (Math.sin(breath.phase) + 1) / 2; // 映射到 0~1

      // ============================================================
      // Layer 2.5: 动作覆写层 (Action Override)
      // ============================================================
      let isActionOverridingMouth = false;
      let overrideMouthOpenY = 0;
      
      const ao = actionOverrideRef.current;
      if (ao) {
        const elapsed = Date.now() - ao.startTime;
        if (elapsed > ao.duration + 1000) {
          // 动作结束一段时间后自动清理
          actionOverrideRef.current = null;
        } else {
          let progress = Math.min(1.0, Math.max(0, elapsed / ao.duration));
          // easeOutCubic 缓动
          progress = 1 - Math.pow(1 - progress, 3);
          
          // 如果超过 duration，开始衰减 (再给 1000ms 衰减)
          if (elapsed > ao.duration) {
            const fadeOut = 1.0 - (elapsed - ao.duration) / 1000.0;
            progress = Math.max(0, fadeOut);
          }

          if (progress > 0) {
            if (ao.action === "惊讶") {
              cf.eyeOpen = lerp(cf.eyeOpen, 1.0, progress);
              cb.headAngleY = lerp(cb.headAngleY, -5, progress);
              isActionOverridingMouth = true;
              overrideMouthOpenY = 0.6 * progress;
            } else if (ao.action === "开心") {
              cf.smile = lerp(cf.smile, 1.0, progress);
              cf.mouthForm = lerp(cf.mouthForm, 0.4, progress);
              cb.bodyAngleZ = lerp(cb.bodyAngleZ, Math.sin(Date.now() / 200) * 5, progress);
            } else if (ao.action === "害羞") {
              cf.cheek = lerp(cf.cheek, 0.7, progress);
              cb.headAngleY = lerp(cb.headAngleY, -3, progress);
            }

            // 处理附带的身体和头部方向参数
            const dir = ao.params.direction || ao.params.head_tilt;
            if (dir === "头左偏" || dir === "left") {
              cb.bodyAngleZ = lerp(cb.bodyAngleZ, 8, progress);
            } else if (dir === "头右偏" || dir === "right") {
              cb.bodyAngleZ = lerp(cb.bodyAngleZ, -8, progress);
            } else if (dir === "头低下") {
              cb.headAngleY = lerp(cb.headAngleY, -10, progress);
            }
          }
        }
      }

      // ============================================================
      // Layer 4: 参数写入层 - 身体 + 呼吸（受 Motion 影响，允许覆盖）
      // 当 Motion 播放时，这些参数控制权会被 Motion 的关键帧接管
      // 但我们仍然持续写入，形成柔和叠加（pixi-live2d-display 通常按最后写入覆盖）
      // ============================================================
      safeSetParam(coreModel, 'ParamBodyAngleX', cb.bodyAngleX);
      safeSetParam(coreModel, 'ParamBodyAngleY', cb.bodyAngleY);
      safeSetParam(coreModel, 'ParamBodyAngleZ', cb.bodyAngleZ);
      safeSetParam(coreModel, 'ParamAngleX',     cb.headAngleX);
      safeSetParam(coreModel, 'ParamAngleY',     cb.headAngleY);
      safeSetParam(coreModel, 'ParamBreath',     breathValue);

      // ============================================================
      // Layer 5: 后期覆写层 (Late-Override)
      // 这些参数在每帧末尾强制写入，不论 Motion 做了什么
      // 优先级：口型同步 > 眨眼 > 情感表情 > cheek
      // ============================================================

      // --- 5.1 情感脸部参数（非口型部分，放在口型前方便被口型覆盖） ---
      // ParamMouthForm 在这里先写情感的目标值，口型同步会在下面再覆盖
      safeSetParam(coreModel, 'ParamBrowLY',    cf.browAngle - 0.5);  // 映射到 Live2D 参数范围
      safeSetParam(coreModel, 'ParamBrowRY',    cf.browAngle - 0.5);
      safeSetParam(coreModel, 'ParamBrowLForm', (cf.smile - 0.5));
      safeSetParam(coreModel, 'ParamBrowRForm', (cf.smile - 0.5));
      safeSetParam(coreModel, 'ParamCheek',     cf.cheek);

      // --- 5.2 自动眨眼（不受情感影响，独立周期） ---
      const blink = blinkStateRef.current;
      blink.timer--;
      if (blink.timer <= 0 && !blink.isBlinking) {
        // 触发眨眼：间隔 3~7 秒（180~420 帧）随机
        blink.isBlinking  = true;
        blink.blinkProgress = 0;
        blink.timer       = Math.floor(180 + Math.random() * 240);
      }

      let eyeOpenValue = cf.eyeOpen; // 默认：情感控制的眼睛开合度

      if (blink.isBlinking) {
        blink.blinkProgress += 0.18; // 眨眼速度（约 5~6 帧完成一次）
        if (blink.blinkProgress < 0.5) {
          // 闭眼阶段
          eyeOpenValue = cf.eyeOpen * (1.0 - blink.blinkProgress * 2);
        } else if (blink.blinkProgress < 1.0) {
          // 睁眼阶段
          eyeOpenValue = cf.eyeOpen * ((blink.blinkProgress - 0.5) * 2);
        } else {
          // 眨眼完成
          blink.isBlinking = false;
        }
      }

      safeSetParam(coreModel, 'ParamEyeLOpen', eyeOpenValue);
      safeSetParam(coreModel, 'ParamEyeROpen', eyeOpenValue);

      // --- 5.3 口型同步（最高优先级，最后写入，覆盖所有其他来源） ---
      const lip = lipValueRef.current;
      const r = lip.rhubarb || 'X';

      let targetOpenY = 0;
      let targetForm = 0;

      // Rhubarb Viseme 到 Live2D 参数映射
      switch (r) {
        case 'A': targetOpenY = 0.0; targetForm = 0.0; break;
        case 'B': targetOpenY = 0.4; targetForm = 1.0; break; // Ee, 扁嘴跑高
        case 'C': targetOpenY = 1.0; targetForm = 0.0; break; // Ah, 大张嘴
        case 'D': targetOpenY = 0.8; targetForm = 0.0; break; // Aa, 中等张嘴
        case 'E': targetOpenY = 0.5; targetForm = -1.0; break; // O/U, 尖瘦嘴
        case 'F': targetOpenY = 0.4; targetForm = -0.5; break; // W/U
        case 'G': targetOpenY = 0.2; targetForm = 0.0; break; // F/V, 微张
        case 'H': targetOpenY = 0.3; targetForm = 0.0; break; // L, 微张
        case 'X': 
        default:  targetOpenY = 0.0; targetForm = 0.0; break; // 闭嘴
      }

      // 如果当前不说话且有动作覆写口型（如惊讶）
      if (r === 'X' && isActionOverridingMouth) {
          targetOpenY = Math.max(targetOpenY, overrideMouthOpenY);
      }

      // 阻尼缓冲平滑处理，防止音素切换时突变跳帧
      const riseRate = 0.35; // 张嘴爆发速度快
      const fallRate = 0.15; // 闭嘴黏滞速度慢（营造真实肌肉感）

      if (targetOpenY > currentOpenYRef.current) {
        currentOpenYRef.current += (targetOpenY - currentOpenYRef.current) * riseRate;
      } else {
        currentOpenYRef.current += (targetOpenY - currentOpenYRef.current) * fallRate;
      }
      currentFormRef.current += (targetForm - currentFormRef.current) * 0.25;

      const mappedOpenY = currentOpenYRef.current;
      const mappedForm  = currentFormRef.current;

      // 主嘴型参数
      safeSetParam(coreModel, 'ParamMouthOpenY', mappedOpenY);
      safeSetParam(coreModel, 'ParamMouthForm',  mappedForm * 0.5);

      // panda_cake 异形兼容：联动下颌和主推口型参数
      if (currentModel === 'panda_cake') {
        safeSetParam(coreModel, 'ParamMouthOpenY4', mappedOpenY * 0.7);
        safeSetParam(coreModel, 'JAW',              mappedOpenY * 0.4);
      }

      // --- 5.4 panda_cake 特有表情参数（持续强制覆写） ---
      if (currentModel === 'panda_cake') {
        // Param159 = blush 红晕效果，由 cheek 值驱动
        safeSetParam(coreModel, 'Param159', cf.cheek);
        
        // 修复“一直黑脸”问题：强行清除表现层参数，或根据当前情感动态映射
        const isAngry = cf.browAngle < 0.15;
        const isCry   = cf.smile < 0.1 && cf.eyeOpen < 0.45;
        const isStar  = cf.smile > 0.9;
        
        safeSetParam(coreModel, 'Param160', isAngry ? 1.0 : 0.0); // 愤怒黑脸阴影
        safeSetParam(coreModel, 'Param161', isCry ? 1.0 : 0.0);   // 流泪
        safeSetParam(coreModel, 'Param170', isStar ? 1.0 : 0.0);  // 爱心眼
        safeSetParam(coreModel, 'Param171', 0.0);                 // 星星眼 (默认关)
        safeSetParam(coreModel, 'Param173', 0.0);                 // 蚊香眼 (默认关)
        safeSetParam(coreModel, 'Param15',  0.0);                 // 戳脸 (默认关)
        safeSetParam(coreModel, 'Param4',   0.0);                 // 冰淇淋 (默认关)

        // 终极杀手：如果之前的特殊表情带有吐舌头（ParamMouthOpenY2），
        // 它会彻底锁死主控制器的 ParamMouthOpenY 嘴型，必须在这里强行清理！
        safeSetParam(coreModel, 'ParamMouthOpenY2', 0.0);         // 吐舌头参数 (强行关闭防卡死)
      }
    };


    // 挂载 Ticker：使用较低优先级 (-25)，确保其在 PIXI 原生更新循环及 Live2D MotionManager 
    // 计算完当帧所有的形变（包括 expression 和 motion）之后执行，从而实现真正的“强势覆写”
    const priority = window.PIXI?.UPDATE_PRIORITY?.LOW ?? -25;
    app.ticker.add(tickerCallback, undefined, priority);
    tickerRemoveFn = tickerCallback;
    console.log(`🎬 [Live2DCtrl] Ticker 已挂载 (Priority: ${priority})`);

    }; // mountTicker 函数结束

    // 启动轮询
    mountTicker();

    // Cleanup：清理轮询定时器和已挂载的 Ticker
    return () => {
      if (pollTimer) clearTimeout(pollTimer);
      if (tickerRemoveFn && appRef.current?.ticker) {
        appRef.current.ticker.remove(tickerRemoveFn);
        console.log('🧹 [Live2DCtrl] Ticker 已移除');
      }
    };

  // appRef 和 modelRef 是 ref，不触发重渲染，currentModel 变化需要重新挂载 Ticker
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appRef, modelRef, currentModel]);
}
