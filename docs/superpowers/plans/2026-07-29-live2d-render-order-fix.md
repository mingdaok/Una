# Live2D 动作渲染顺序修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 UNA 的用户动作、AI 动作、情绪、呼吸和口型在 Live2D 原生更新完成后、当前帧绘制前写入，修复真实浏览器中只有自然眨眼、其他动作全部不可见的问题。

**Architecture:** 新建一个只负责包装和恢复 `internalModel.update()` 的小型生命周期模块；控制器不再依赖独立 PIXI Ticker，而是在第三方原生 `update()` 成功返回后采样状态混合器并投影参数。真实顺序测试模拟“原生更新重置参数 → UNA 覆写 → 立即绘制”，确保以后不能退回到绘制后写入。

**Tech Stack:** React 18、Vitest、Testing Library `renderHook`、PIXI.js 5.3.3、pixi-live2d-display 0.4.0、Cubism 4、PowerShell、Vite、FastAPI/Pytest。

## Global Constraints

- 只在 `D:\ai\Una\.worktrees\p1-live2d-motion-v3` 和分支 `codex/p1-live2d-motion-v3` 中实施；未经用户选择不得合并 `main`。
- 严格执行 TDD：每项运行时行为先新增真实失败测试并观察预期 RED，再写最小实现并观察 GREEN。
- 不修改 Live2D 第三方库、动作 v3 协议、用户动作解析器、WebSocket 协议、认证、记忆或语音服务。
- 不扩展“哭泣”等新动作语义；GPT-SoVITS 未启动时继续降级到 Edge TTS。
- 原生 `internalModel.update()` 必须保留原始 `this`、参数、返回值和异常语义。
- UNA 帧异常只能跳过当前 UNA 投影，不得永久停止后续原生帧。
- 模型切换、实例替换和卸载必须恢复旧实例的原始 `update()`；不得形成多层包装。
- 普通动作轨道不得写入口型参数；TTS 口型仍为最终保留层。
- 所有 Markdown 文档使用中文；每完成一个功能后更新 `docs/功能清单.md`。
- 不暂存或提交数据库、ChromaDB、语音、临时 WAV、`__pycache__`、Vitest 缓存或既有旧哈希资源删除。
- Android APK 真机验收继续保持未勾选。

---

## 文件结构

- Create: `frontend_react/src/live2d/postUpdateHook.js`
  - 单一职责：为一个 `internalModel` 实例安装原生更新后的回调，并安全恢复原函数。
- Create: `frontend_react/src/live2d/__tests__/postUpdateHook.test.js`
  - 验证调用顺序、`this`/参数/返回值、异常语义和清理行为。
- Modify: `frontend_react/src/hooks/useLive2DController.js`
  - 删除独立 Ticker 写入，改为在当前模型的原生更新完成后采样并投影。
- Modify: `frontend_react/src/hooks/__tests__/useLive2DController.test.js`
  - 用真实 `_render()` 顺序替代简化 Ticker 测试，并覆盖模型切换和重复 ready。
- Modify: `docs/功能清单.md`
  - 修正“真实 Ticker 已验收”的错误状态，记录 post-update 修复与新的验证结果。
- Modify: `frontend_react/dist/index.html`
- Create or Modify: `frontend_react/dist/assets/index-*.js`
- Modify: `backend/static/mobile/index.html`
- Create or Modify: `backend/static/mobile/assets/index-*.js`
  - 构建并发布包含本次修复的浏览器产物；只暂存当前入口引用的哈希文件。

---

### Task 1: 可恢复的 Live2D 原生更新后挂钩

**Files:**
- Create: `frontend_react/src/live2d/postUpdateHook.js`
- Test: `frontend_react/src/live2d/__tests__/postUpdateHook.test.js`

**Interfaces:**
- Consumes: `internalModel.update(...args)`，其中 `internalModel` 为当前真实 Live2D 内部模型实例。
- Produces: `installPostUpdateHook(internalModel, afterUpdate, options?) => cleanup`
- `afterUpdate`: `(...args) => void`，只在原生 `update()` 成功返回后调用。
- `options.onAfterUpdateError`: `(error) => void`，UNA 后处理异常时调用。
- `cleanup`: `() => void`，幂等；仅当实例仍持有本函数安装的包装时恢复原函数。

- [ ] **Step 1: 写调用顺序和返回值失败测试**

在 `postUpdateHook.test.js` 中添加：

```js
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
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```powershell
Set-Location 'D:\ai\Una\.worktrees\p1-live2d-motion-v3\frontend_react'
& 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/postUpdateHook.test.js --reporter=dot
```

Expected: FAIL，模块 `../postUpdateHook` 不存在。

- [ ] **Step 3: 写异常和清理失败测试**

继续添加：

```js
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
```

- [ ] **Step 4: 写最小实现**

创建 `postUpdateHook.js`：

```js
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
        onAfterUpdateError(error);
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
```

- [ ] **Step 5: 运行定向测试并确认 GREEN**

Run:

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/postUpdateHook.test.js --reporter=dot
```

Expected: 4 项测试全部 PASS。

- [ ] **Step 6: 自检并提交**

Run:

```powershell
git diff --check
git add -- frontend_react/src/live2d/postUpdateHook.js frontend_react/src/live2d/__tests__/postUpdateHook.test.js
git diff --cached --check
git commit -m "test: add recoverable Live2D post-update hook"
```

Expected: 提交只包含新挂钩模块和对应测试。

---

### Task 2: 控制器改为原生更新后、绘制前写入

**Files:**
- Modify: `frontend_react/src/hooks/useLive2DController.js`
- Modify: `frontend_react/src/hooks/__tests__/useLive2DController.test.js`

**Interfaces:**
- Consumes: Task 1 的 `installPostUpdateHook(internalModel, afterUpdate, options)`。
- Consumes: 现有 `modelReady = { model, modelName, version }`、`buildModelCapabilityMap()`、`Live2DStateMixer`、`motionEvent`。
- Produces: `useLive2DController(...)` 对外签名保持不变；内部不再注册 `appRef.current.ticker`。
- Produces: 原生 `internalModel.update(deltaMs, elapsedMs)` 返回后立即执行 `applyControllerFrame(deltaMs)`。

- [ ] **Step 1: 把测试模型改为可观察真实参数值**

在 `useLive2DController.test.js` 中扩展 `createCoreModel()`：

```js
function createCoreModel(ids = IDS) {
  const values = new Map(ids.map((id, index) => [
    id,
    ids[index].includes('Eye') ? 1 : 0,
  ]));
  return {
    _parameterIds: ids,
    getParameterCount: () => ids.length,
    getParameterMinimumValue: index => ids[index].includes('Open') ? 0 : -30,
    getParameterMaximumValue: index => ids[index].includes('Open') ? 1 : 30,
    getParameterDefaultValue: index => ids[index].includes('Eye') ? 1 : 0,
    getParameterValueById: id => values.get(id),
    setParameterValueById: vi.fn((id, value) => values.set(id, value)),
  };
}

function createModel(coreModel = createCoreModel()) {
  const internalModel = {
    coreModel,
    update: vi.fn(() => {
      coreModel.setParameterValueById('ParamAngleX', 0);
      coreModel.setParameterValueById('ParamAngleY', 0);
    }),
  };
  return { internalModel };
}

function renderFrame(model, deltaMs = 1000 / 60, elapsedMs = Date.now()) {
  const result = model.internalModel.update(deltaMs, elapsedMs);
  return {
    result,
    angleX: model.internalModel.coreModel.getParameterValueById('ParamAngleX'),
    angleY: model.internalModel.coreModel.getParameterValueById('ParamAngleY'),
  };
}
```

并将 `beforeEach` 中的模型创建改为：

```js
modelRef = { current: createModel() };
```

- [ ] **Step 2: 写真实渲染顺序失败测试**

添加：

```js
it('原生更新重置参数后仍在当前绘制前写入可见摇头值', () => {
  const view = renderController({
    motionEvent: motion({
      id: 'visible-after-native-update',
      source: 'user_command',
      channel: 'head_yaw',
      value: 0.8,
    }),
  });

  const frame = renderFrame(modelRef.current);

  expect(modelRef.current.internalModel.update).toHaveBeenCalledOnce();
  expect(frame.angleX).toBeGreaterThan(0);
  view.unmount();
});
```

- [ ] **Step 3: 运行单项测试并确认 RED**

Run:

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/hooks/__tests__/useLive2DController.test.js -t "原生更新重置参数后仍在当前绘制前写入可见摇头值" --reporter=dot
```

Expected: FAIL，`frame.angleX` 为 `0`；这证明旧独立 Ticker 写入不会出现在真实绘制值中。

- [ ] **Step 4: 提取控制器单帧投影函数**

在 `useLive2DController.js` 导入：

```js
import { installPostUpdateHook } from '../live2d/postUpdateHook';
```

在 Hook 内增加：

```js
const applyControllerFrameRef = useRef(() => {});
```

把旧 Ticker 中的 `writeProjected()` 与帧计算移动到每次渲染都会更新的 ref 回调中：

```js
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

  writeProjected(coreModel, capabilityMap.project(semanticFrame));
  writeProjected(coreModel, capabilityMap.projectBreath(breath));
  writeProjected(coreModel, capabilityMap.projectLipSync(lipSync));
};
```

`writeProjected` 提升为模块内纯辅助函数：

```js
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
```

- [ ] **Step 5: 在 modelReady 生命周期安装 post-update 挂钩**

将能力表 effect 改为：

```js
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
  };
}, [
  currentModel,
  modelReady?.version,
  modelReady?.model,
  modelReady?.modelName,
  modelRef,
]);
```

删除整个独立 `app.ticker` effect、`pollTimer`、`mountTicker()`、`ticker.add(..., -25)` 和 `ticker.remove()` 路径。Hook 对外参数暂时保留 `appRef`，避免本次修复扩大到调用接口重构。

- [ ] **Step 6: 运行真实顺序测试并确认 GREEN**

Run:

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/hooks/__tests__/useLive2DController.test.js -t "原生更新重置参数后仍在当前绘制前写入可见摇头值" --reporter=dot
```

Expected: PASS；`frame.angleX` 大于 `0`。

- [ ] **Step 7: 把既有测试迁移到真实更新路径**

在测试文件中删除 `tickerCallback` 捕获和 `appRef.current.ticker.add/remove` 断言。保留一个最小 `appRef = { current: null }` 以维持 Hook 接口。

将既有每个：

```js
tickerCallback(1);
```

替换为：

```js
renderFrame(modelRef.current);
```

模型替换全部使用：

```js
const replacementModel = createModel(replacementCoreModel);
```

把“动作结束后回归基础层，并在卸载时移除唯一 Ticker”改为：

```js
it('动作结束后回归基础层，并在卸载时恢复原生 update', () => {
  const originalUpdate = modelRef.current.internalModel.update;
  const view = renderController({
    motionEvent: motion({ id: 'return-center', channel: 'head_pitch' }),
  });
  const wrappedUpdate = modelRef.current.internalModel.update;

  expect(wrappedUpdate).not.toBe(originalUpdate);
  expect(renderFrame(modelRef.current).angleY).toBeGreaterThan(0);
  vi.advanceTimersByTime(801);
  expect(renderFrame(modelRef.current).angleY).toBe(0);

  view.unmount();
  expect(modelRef.current.internalModel.update).toBe(originalUpdate);
});
```

- [ ] **Step 8: 增加切换和重复 ready 生命周期测试**

添加：

```js
it('同实例 ready 更新不会叠加包装，切换后旧实例恢复原生 update', () => {
  const oldModel = modelRef.current;
  const oldOriginalUpdate = oldModel.internalModel.update;
  const view = renderController({
    readyToken: {
      model: oldModel,
      modelName: 'panda_cake',
      version: 1,
    },
  });

  view.rerender({
    model: 'panda_cake',
    lip: { rhubarb: 'X' },
    event: null,
    ready: {
      model: oldModel,
      modelName: 'panda_cake',
      version: 2,
    },
  });
  oldModel.internalModel.update(16.67, 1000);
  expect(oldOriginalUpdate).toHaveBeenCalledOnce();

  const newModel = createModel();
  modelRef.current = newModel;
  view.rerender({
    model: 'hiyori',
    lip: { rhubarb: 'X' },
    event: null,
    ready: {
      model: newModel,
      modelName: 'hiyori',
      version: 3,
    },
  });

  expect(oldModel.internalModel.update).toBe(oldOriginalUpdate);
  view.unmount();
});
```

- [ ] **Step 9: 运行控制器定向测试**

Run:

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/postUpdateHook.test.js src/hooks/__tests__/useLive2DController.test.js --reporter=dot
```

Expected: 两个测试文件全部 PASS；无未处理异常。

- [ ] **Step 10: 运行前端全量测试**

Run:

```powershell
& 'D:\ai\Node\npx.cmd' vitest run --reporter=dot
```

Expected: 所有前端测试 PASS，失败数为 0。

- [ ] **Step 11: 自检并提交**

Run:

```powershell
git diff --check
git add -- frontend_react/src/hooks/useLive2DController.js frontend_react/src/hooks/__tests__/useLive2DController.test.js
git diff --cached --check
git commit -m "fix: apply Live2D motion before draw"
```

Expected: 提交只包含控制器和控制器测试；Task 1 的文件已在前一提交中。

---

### Task 3: 全量验证、浏览器验收与中文功能清单

**Files:**
- Modify: `docs/功能清单.md`
- Modify: `frontend_react/dist/index.html`
- Create or Modify: `frontend_react/dist/assets/index-*.js`
- Modify: `backend/static/mobile/index.html`
- Create or Modify: `backend/static/mobile/assets/index-*.js`

**Interfaces:**
- Consumes: Task 2 完成的 post-update 控制器。
- Produces: 后端 `/` 可直接加载的最新浏览器产物。
- Produces: 与实际测试证据一致的中文功能状态；Android 真机项仍未勾选。

- [ ] **Step 1: 运行后端全量回归**

Run:

```powershell
Set-Location 'D:\ai\Una\.worktrees\p1-live2d-motion-v3'
& 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend\tests -q
```

Expected: 58 项测试全部 PASS。

- [ ] **Step 2: 运行前端全量回归和生产构建**

Run:

```powershell
Set-Location 'D:\ai\Una\.worktrees\p1-live2d-motion-v3\frontend_react'
& 'D:\ai\Node\npx.cmd' vitest run --reporter=dot
& 'D:\ai\Node\npm.cmd' run build
```

Expected: 全部 Vitest PASS；Vite 构建 exit code 0。允许既有的非模块 Live2D 脚本和 Browserslist 数据提示，不允许构建错误。

- [ ] **Step 3: 用 PowerShell 发布当前构建**

Run:

```powershell
Set-Location 'D:\ai\Una\.worktrees\p1-live2d-motion-v3'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\scripts\publish_frontend.ps1'
if ($LASTEXITCODE -ne 0) {
  throw "publish_frontend.ps1 failed with exit code $LASTEXITCODE"
}
```

Expected: 输出 `Frontend published to ...\backend\static\mobile`。

- [ ] **Step 4: 验证入口引用和 SHA-256**

Run:

```powershell
$html = Get-Content -LiteralPath 'frontend_react\dist\index.html' -Raw
$refs = [regex]::Matches(
  $html,
  '(?:src|href)="(?:\./)?(?<path>assets/index-[^"]+\.(?:js|css))"'
)
if ($refs.Count -ne 2) {
  throw "Expected 2 current JS/CSS references, got $($refs.Count)"
}
foreach ($match in $refs) {
  $relative = $match.Groups['path'].Value.Replace('/', '\')
  $distFile = Join-Path 'frontend_react\dist' $relative
  $backendFile = Join-Path 'backend\static\mobile' $relative
  if (-not (Test-Path -LiteralPath $backendFile)) {
    throw "Missing published asset: $backendFile"
  }
  $distHash = (Get-FileHash -LiteralPath $distFile -Algorithm SHA256).Hash
  $backendHash = (Get-FileHash -LiteralPath $backendFile -Algorithm SHA256).Hash
  if ($distHash -ne $backendHash) {
    throw "Hash mismatch: $relative"
  }
}
```

Expected: 无异常；当前 HTML 引用的 JS/CSS 均存在且前后端哈希一致。

- [ ] **Step 5: 更新中文功能清单**

在 `docs/功能清单.md` 的 P1 动作部分：

- 把“单一 `Live2DStateMixer` 已接入真实渲染 Ticker”改为“已接入 Live2D 原生 `internalModel.update()` 后处理阶段”；
- 明确记录旧 `-25` Ticker 位于 PIXI 绘制之后，动作被下一帧原生更新覆盖；
- 记录真实顺序回归测试已经覆盖“原生重置 → UNA 覆写 → 绘制”；
- 记录本次实际前端测试数量、后端 58 项、生产构建和发布哈希结果；
- 将此前“桌面动作均可见”的旧人工验收描述标记为已被 2026-07-29 用户复测推翻；
- Android APK 真机验收继续保持 `[ ]`。

- [ ] **Step 6: 启动后端并执行桌面人工验收**

Run:

```powershell
Set-Location 'D:\ai\Una\.worktrees\p1-live2d-motion-v3'
& 'D:\ai\python 3.11\python.exe' .\backend\main_server.py
```

浏览器访问 `http://127.0.0.1:8000/`，使用隔离工作树测试账号执行：

1. “请轻轻点头两次”——必须有两次可见点头；
2. “请慢慢左右摇头两次并眨眼”——必须同时出现摇头和眨眼；
3. “请不要点头，也不要摇头”——不得触发被否定动作；
4. 普通陪伴对话——保持自然微反应；
5. 语音播放——口型必须继续工作；
6. panda_cake 切换 Hiyori——新模型继续执行动作；
7. 刷新页面——旧动作不得重播；
8. 后台停留 5 秒返回——模型继续更新；
9. F12 控制台——不得出现持续的 post-update 异常。

Expected: 1～9 全部通过；若任一失败，保留分支不合并并记录控制台、PowerShell 日志和复现句子。

- [ ] **Step 7: 精确暂存当前构建引用，排除旧资产删除**

Run:

```powershell
$distHtml = Get-Content -LiteralPath 'frontend_react\dist\index.html' -Raw
$currentRefs = [regex]::Matches(
  $distHtml,
  '(?:src|href)="(?:\./)?(?<path>assets/index-[^"]+\.(?:js|css))"'
)
$publishPaths = @(
  'docs/功能清单.md',
  'frontend_react/dist/index.html',
  'backend/static/mobile/index.html'
)
foreach ($match in $currentRefs) {
  $relative = $match.Groups['path'].Value
  $publishPaths += "frontend_react/dist/$relative"
  $publishPaths += "backend/static/mobile/$relative"
}
git add -- @publishPaths
git diff --cached --check
git diff --cached --name-status
```

Expected: 暂存区只包含功能清单、两个当前入口和入口实际引用的 JS/CSS；不得包含旧哈希资源删除、数据库、语音、缓存或临时文件。

- [ ] **Step 8: 提交发布和验收记录**

Run:

```powershell
git commit -m "build: publish Live2D render-order fix"
```

Expected: 创建聚焦的发布提交；`main` 不变。

- [ ] **Step 9: 最终差异和分支状态检查**

Run:

```powershell
git diff --check main..HEAD
git log --oneline -5
git rev-parse main
git rev-parse HEAD
git status --short --branch
```

Expected:

- `git diff --check main..HEAD` exit code 0；
- `HEAD` 位于 `codex/p1-live2d-motion-v3`；
- `main` 引用没有移动；
- 未提交项仅为已知数据库、语音、缓存、临时文件和未暂存的旧构建资产状态。

---

## 计划完成判定

以下条件全部满足才可声明修复完成：

- Task 1 的 post-update 生命周期模块通过独立测试；
- Task 2 的真实渲染顺序测试先 RED 后 GREEN；
- 控制器不再注册 `-25` 参数写入 Ticker；
- 原生更新、UNA 投影和绘制顺序被测试锁定；
- 模型切换、重复 ready、卸载和异常恢复通过测试；
- 前后端全量测试通过；
- 生产构建、PowerShell 发布和 SHA-256 检查通过；
- 真实桌面浏览器中的点头、摇头与眨眼并行动作可见；
- 中文功能清单与用户复测事实一致；
- Android 真机项未被错误勾选；
- 未合并 `main`。
