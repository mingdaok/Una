import { useEffect, useRef, useState } from 'react';
import { Check, Move, RotateCcw, Settings, UserRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { API_HOST } from '../config';
import { useLive2DController } from '../hooks/useLive2DController';
import { resetLive2DModelState } from '../live2d/modelState';
import { readSelectedLive2DModel, writeSelectedLive2DModel } from '../live2d/modelSelection';

export default function Live2DViewer({
  lipValue,
  emotion,
  motionEvent,
  motionGeneration,
  settingsRequest = 0,
  showSettingsButton = true,
  onModelChange,
}) {
  // 接入 Live2D 高级控制层 (情感驱动 + 口型同步 + 参数冲突调度)
  // 注意：appRef 和 modelRef 在下方 useEffect 中创建，传入 Hook 后 Hook 内部会等待它们就绪
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const appRef = useRef(null); // 用于死死抓住 App 实例，方便销毁
  const modelReadyVersionRef = useRef(0);
  const [modelReady, setModelReady] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentModel, setCurrentModel] = useState(readSelectedLive2DModel); // 默认加载粉色熊猫模型
  const [showSettings, setShowSettings] = useState(false); // 控制设置面板显示


  // 位置与缩放状态
  const [modelScale, setModelScale] = useState(() => parseFloat(localStorage.getItem('live2d_scale')) || 0.17);
  const [modelX, setModelX] = useState(() => parseFloat(localStorage.getItem('live2d_x')) || 0.5);
  const [modelY, setModelY] = useState(() => parseFloat(localStorage.getItem('live2d_y')) || 0.55);
  const [isEditing, setIsEditing] = useState(false);

  // 用 ref 保存最新值供 PIXI 回调使用
  const scaleRef = useRef(modelScale);
  const xRef = useRef(modelX);
  const yRef = useRef(modelY);

  useEffect(() => {
    if (settingsRequest > 0) setShowSettings(true);
  }, [settingsRequest]);

  useEffect(() => {
    onModelChange?.(currentModel);
  }, [currentModel, onModelChange]);

  // 同步状态到 ref 和 localStorage，并实时更新实体的变换
  useEffect(() => {
    scaleRef.current = modelScale;
    xRef.current = modelX;
    yRef.current = modelY;
    localStorage.setItem('live2d_scale', modelScale);
    localStorage.setItem('live2d_x', modelX);
    localStorage.setItem('live2d_y', modelY);
    
    if (modelRef.current && isLoaded) {
      modelRef.current.scale.set(modelScale);
      modelRef.current.x = window.innerWidth * modelX;
      modelRef.current.y = window.innerHeight * modelY;
    }
  }, [modelScale, modelX, modelY, isLoaded, currentModel]);

  // 手势控制状态
  const initialPinchDistance = useRef(null);
  const initialScaleRef = useRef(null);
  const isDragging = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });

  const getDistance = (touch1, touch2) => {
    return Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      initialPinchDistance.current = getDistance(e.touches[0], e.touches[1]);
      initialScaleRef.current = modelScale;
      isDragging.current = false;
    } else if (e.touches.length === 1) {
      isDragging.current = true;
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && initialPinchDistance.current) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const newScale = (currentDistance / initialPinchDistance.current) * initialScaleRef.current;
      const clampedScale = Math.max(0.01, Math.min(newScale, 2.0));
      setModelScale(clampedScale);
    } else if (e.touches.length === 1 && isDragging.current) {
      const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
      const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
      
      setModelX(prev => prev + (deltaX / window.innerWidth));
      setModelY(prev => prev + (deltaY / window.innerHeight));
      
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistance.current = null;
    isDragging.current = false;
  };

  // 切换模型函数
  const switchModel = (newModel) => {
    if (newModel === currentModel) return;
    if (writeSelectedLive2DModel(newModel) !== newModel) return;
    setCurrentModel(newModel);
    setIsLoaded(false);
    setShowSettings(false); // 切换后自动关闭面板
  };

  // 1. 挂载时初始化 PIXI App (仅执行一次，避免频繁销毁 WebGL 导致黑屏)
  useEffect(() => {
    if (!canvasRef.current || !window.PIXI) return;
    const PIXI = window.PIXI;

    // 创建应用
    const app = new PIXI.Application({
      view: canvasRef.current,
      resizeTo: window,                         // 自动监听窗口大小调整画布
      transparent: true,
      backgroundAlpha: 0,
      autoStart: true,
      sharedTicker: true,
      resolution: window.devicePixelRatio || 1, // 修复手机端/高分屏模糊问题
      autoDensity: true,                        // 自动调整 CSS 尺寸同步高分辨率
    });
    appRef.current = app;

    // 监听窗口大小改变，实时更新纸片人的相对位置
    const handleResize = () => {
      if (modelRef.current) {
        modelRef.current.x = window.innerWidth * xRef.current;
        modelRef.current.y = window.innerHeight * yRef.current;
      }
    };
    window.addEventListener('resize', handleResize);

    // 组件卸载时安全清理
    return () => {
      window.removeEventListener('resize', handleResize);
      console.log("🧹 Live2D App Unmounting...");
      if (appRef.current) {
        try {
          // 只清理基础资源，不强杀 baseTexture 避免影响整个 Canvas 环境
          appRef.current.destroy(false, { children: true });
        } catch (e) {
          console.warn("清理实例失败 (非致命):", e);
        }
        appRef.current = null;
      }
    };
  }, []); // 空依赖，只在组件创建和销毁时执行一次

  // 2. 监听 currentModel 的变化，动态加载对应模型
  useEffect(() => {
    if (!appRef.current || !window.PIXI) return;
    const PIXI = window.PIXI;
    const baseUrl = import.meta.env.BASE_URL || "./";

    const modelUrl = currentModel === 'hiyori'
      ? `${baseUrl}assets/live2d/hiyori/hiyori_pro_mic.model3.json`
      : `${baseUrl}assets/live2d/panda_cake/panda_cake.model3.json`;
      
    console.log("🦋 Live2D Loading:", modelUrl);
    setIsLoaded(false);
    setModelReady(null);

    let isCancelled = false; // 用于防范竞态条件（比如刚点加载 A 立刻切 B）

    // 加载模型
    PIXI.live2d.Live2DModel.from(modelUrl).then((model) => {
      if (isCancelled || !appRef.current) {
        model.destroy(); // 已经被取消，丢弃加载好的模型
        return;
      }

      // 如果舞台上已经有旧模型，先把它移除并销毁
      if (modelRef.current) {
        appRef.current.stage.removeChild(modelRef.current);
        modelRef.current.destroy();
      }

      // 正式释放可能残留的 Expression，并恢复模型默认参数。
      // 后续聊天动作只允许由 useLive2DController 的参数层接管。
      resetLive2DModelState(model);
      appRef.current.stage.addChild(model);
      modelRef.current = model;

      // 初始位置和缩放参数（从状态中获取）
      model.anchor.set(0.5, 0.5);
      model.x = window.innerWidth * xRef.current;
      model.y = window.innerHeight * yRef.current;
      model.scale.set(scaleRef.current);

      modelReadyVersionRef.current += 1;
      setModelReady({
        model,
        modelName: currentModel,
        version: modelReadyVersionRef.current,
      });
      setIsLoaded(true);
      console.log("✅ Live2D Ready");
    }).catch(e => {
      console.error("❌ Live2D Error:", e);
    });

    return () => {
      isCancelled = true; 
    };
  }, [currentModel]); // currentModel 变化时加载新纸片人

  // ============================================================
  // 接入 Live2D 高级控制层 Hook
  // 这个 Hook 负责 post-update 生命周期：
  //   - 在 Live2D 原生 internalModel.update() 完成后、当前绘制前合成并投影语义参数
  //   - 统一处理情感、身体联动、动作轨道、自动眨眼与呼吸保留层
  //   - 在每帧后处理末尾安全投影口型，保持其最高优先级
  //   - 在模型切换、重复 ready 与卸载时安装或清理后处理，并隔离单帧异常
  // ============================================================
  useLive2DController(appRef, modelRef, currentModel, emotion, lipValue, motionEvent, modelReady, motionGeneration);

  // 口型同步和参数覆写已完全迁移至 useLive2DController，
  // 此处不再有任何 lipValue useEffect 或 Ticker，避免双重驱动冲突。

  return (
    <div className="absolute inset-0 z-10">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 0.5s' }}
      />

      {/* 调整模式遮罩与提示 */}
      {isEditing && (
        <div 
          className="absolute inset-0 z-[60] bg-black/40 touch-none flex flex-col items-center justify-end pb-12 sm:pb-24 pointer-events-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={(e) => {
            const newScale = modelScale - Math.sign(e.deltaY) * 0.01;
            setModelScale(Math.max(0.01, Math.min(newScale, 2.0)));
          }}
          onMouseDown={(e) => {
            isDragging.current = true;
            lastTouchRef.current = { x: e.clientX, y: e.clientY };
          }}
          onMouseMove={(e) => {
            if (isDragging.current) {
              const deltaX = e.clientX - lastTouchRef.current.x;
              const deltaY = e.clientY - lastTouchRef.current.y;
              setModelX(prev => prev + (deltaX / window.innerWidth));
              setModelY(prev => prev + (deltaY / window.innerHeight));
              lastTouchRef.current = { x: e.clientX, y: e.clientY };
            }
          }}
          onMouseUp={() => { isDragging.current = false; }}
          onMouseLeave={() => { isDragging.current = false; }}
        >
          <div className="flex gap-4 mb-4">
            <button 
              onClick={() => { setModelX(0.5); setModelY(0.55); }}
              className="bg-white/10 hover:bg-white/20 text-white/90 px-4 py-2 rounded-xl text-sm transition-all backdrop-blur-md shadow-lg border border-white/5 active:scale-95"
            >
              🔄 恢复默认位置
            </button>
            <button 
              onClick={() => setModelScale(0.17)}
              className="bg-white/10 hover:bg-white/20 text-white/90 px-4 py-2 rounded-xl text-sm transition-all backdrop-blur-md shadow-lg border border-white/5 active:scale-95"
            >
              🔄 恢复默认大小
            </button>
          </div>
          
          <div className="bg-black/50 backdrop-blur-md rounded-2xl px-6 py-3 text-white text-sm mb-4 text-center shadow-lg border border-white/10 pointer-events-none">
            <p className="font-medium tracking-wide">单指拖动位置</p>
            <p className="text-white/60 text-xs mt-1">双指捏合缩放大小 (或使用滑轮/拖拽)</p>
          </div>
          <button 
            onClick={() => setIsEditing(false)}
            className="bg-blue-500/90 hover:bg-blue-500 text-white px-10 py-3.5 rounded-full font-medium tracking-widest transition-all active:scale-95 shadow-xl border border-blue-400/30"
          >
            完成调整
          </button>
        </div>
      )}

      {showSettingsButton && (
        <button
          type="button"
          aria-label="打开角色与显示设置"
          onClick={() => setShowSettings(v => !v)}
          className="absolute top-4 left-16 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-sm text-white/50 hover:text-white hover:bg-black/40 transition-all active:scale-90"
        >
          <Settings size={16} />
        </button>
      )}

      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="absolute inset-0 z-[70] flex items-center justify-center p-4 pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="关闭角色与显示设置"
              className="absolute inset-0 w-full h-full border-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-label="角色与显示"
              initial={{ y: 18, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 18, scale: 0.98 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-[28px] border border-[#decfc5] bg-[#fffaf4]/95 p-5 text-[#50352b] shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">角色与显示</p>
                  <p className="mt-1 text-xs text-[#927266]">调整模型位置、大小或切换角色</p>
                </div>
                <button
                  type="button"
                  aria-label="关闭角色与显示设置"
                  onClick={() => setShowSettings(false)}
                  className="grid h-10 w-10 place-items-center rounded-full text-[#7c584b] hover:bg-[#7c584b]/10"
                >
                  <X size={21} />
                </button>
              </div>

            <button
              onClick={() => {
                setIsEditing(true);
                setShowSettings(false);
              }}
              className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-[#dccbc0] bg-white/60 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-white"
            >
              <Move size={20} className="text-[#a67460]" />
              <span className="flex-1">调整位置与大小</span>
            </button>

            <p className="mb-2 px-1 text-xs font-medium text-[#927266]">切换模型</p>
            <button
              onClick={() => switchModel('hiyori')}
              className={`mb-2 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                currentModel === 'hiyori'
                  ? 'border-[#e9568c]/40 bg-[#e9568c]/10 text-[#50352b]'
                  : 'border-[#dccbc0] bg-white/50 hover:bg-white'
              }`}
            >
              <UserRound size={20} className="text-[#a67460]" />
              <span className="flex-1">Hiyori</span>
              {currentModel === 'hiyori' && <Check size={18} className="text-[#e9568c]" />}
            </button>
            <button
              onClick={() => switchModel('panda_cake')}
              className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                currentModel === 'panda_cake'
                  ? 'border-[#e9568c]/40 bg-[#e9568c]/10 text-[#50352b]'
                  : 'border-[#dccbc0] bg-white/50 hover:bg-white'
              }`}
            >
              <RotateCcw size={20} className="text-[#a67460]" />
              <span className="flex-1">粉色熊猫</span>
              {currentModel === 'panda_cake' && <Check size={18} className="text-[#e9568c]" />}
            </button>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
