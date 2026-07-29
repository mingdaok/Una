# 模型专属 Live2D 动作与随机调度实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 让 Hiyori 仅执行真实的抬臂、挥手动作，让 panda_cake 仅执行熊猫手、捧脸动作；将模型能力贯穿前端即时指令、后端 AI 动作协议和前端参数投影，并加入低频、可复现、不会抢占 AI/用户动作的本地随机动作调度器。

**架构：** 在前端以“语义动作通道 + 模型动作档案”描述能力；前端始终是最终能力门禁和 Cubism 参数写入者。后端只接收枚举模型名，以同一份能力白名单限制动态提示词和 `ACTION:` 控制块。控制器继续在原生 Live2D 更新后写入参数：Hiyori 将语义值投影到当前原生姿态附近的安全目标，panda_cake 将语义姿态投影为其现有参数组合；随机调度器只生成低优先级的本地 v3 轨道。

**技术栈：** React 18、Vite、PixiJS 5.3.3、pixi-live2d-display、Vitest、Python、FastAPI、pytest。

## 全局约束

- 只在分支 `codex/p2-model-action-profiles` 的工作树中实现，未经用户明确要求不得合并或直接修改 `main`。
- 不调用 `model.motion()` 或 `model.expression()`；聊天动作全部经现有 v3 语义轨道和原生更新后的参数写入完成。
- 不新增或写入嘴部、呼吸参数；TTS 嘴型始终拥有最终优先级。
- Hiyori 只支持抬左/右/双手和左/右挥手；panda_cake 只支持熊猫手/抱熊猫与捧脸/戳脸。跨模型语义动作必须明确丢弃，不能偷偷替换为别的动作。
- 选择 `panda_cake` 时，“举手/挥手”不生成本地动作；选择 Hiyori 时，“抱熊猫/捧脸”不生成本地动作。文字和语音回复仍按原流程进行。
- 未知、缺失或未就绪模型一律只允许通用通道；所有缺参、隐藏部件、重复 ready、切换模型和卸载均安全降级为不动作。
- 每完成一个实现任务，都更新 `docs/功能清单.md` 中对应状态与人工验证方式。

---

### 任务 1：建立前端模型能力协议与动作档案

**文件：**

- 新建：`frontend_react/src/live2d/modelActionProfiles.js`
- 修改：`frontend_react/src/live2d/motionProtocol.js`
- 修改：`frontend_react/src/live2d/__tests__/motionProtocol.test.js`
- 新建：`frontend_react/src/live2d/__tests__/modelActionProfiles.test.js`

- [ ] **步骤 1：先写失败测试，固定模型白名单和通道范围。**

  测试 `normalizeLive2DModel()`：只接受 `hiyori`、`panda_cake`，未知值返回 `null`；测试 `channelsForModel()`：未知模型仅返回通用通道；测试 Hiyori 允许 `left_arm_raise`、`right_arm_raise`、`left_hand_wave`、`right_hand_wave`，panda_cake 不允许这些通道；测试 panda_cake 允许 `panda_hug`、`hands_to_face`，Hiyori 不允许这些通道。

  补充 `normalizeMotionEvent()` 的边界测试：抬臂值只能为 `0..1`，挥手和熊猫动作仍为 `-1..1`；不属于当前模型的轨道在模型过滤后消失，通用轨道保留。

- [ ] **步骤 2：运行前端协议测试，确认它先失败。**

  运行：`D:\ai\Node\npx.cmd vitest run src/live2d/__tests__/motionProtocol.test.js src/live2d/__tests__/modelActionProfiles.test.js --reporter=dot`

  预期：新测试因档案模块和模型范围校验尚不存在而失败。

- [ ] **步骤 3：实现最小模型档案 API。**

  在 `modelActionProfiles.js` 导出如下稳定接口：

  ```js
  export const LIVE2D_MODELS = Object.freeze(['hiyori', 'panda_cake'])
  export const COMMON_SEMANTIC_CHANNELS = Object.freeze([...])
  export function normalizeLive2DModel(value) { /* model id | null */ }
  export function channelsForModel(modelName) { /* Set<string> */ }
  export function isChannelAllowedForModel(channel, modelName) { /* boolean */ }
  export function isSemanticValueValid(channel, value) { /* boolean */ }
  export function filterMotionTracksForModel(tracks, modelName) { /* tracks */ }
  export function getModelActionProfile(modelName) { /* immutable profile | null */ }
  ```

  档案包含已发现的真实参数意图，但不直接在本任务写入模型：Hiyori 的 `PartArmA`、`ParamArmLA`、`ParamArmRA`、`ParamHandL`、`ParamHandR`；panda_cake 的 `Param3`、`Param5`、`Param6` 及可选物理细节 `Param150..152`、`Param153..158`。为 Hiyori 记录抬臂目标值 `0`（原始常用静止值约为 `-10`），为 panda_cake 记录开关目标值 `1` 与默认恢复策略。

  将 `motionProtocol.js` 改为从档案取得全部已知通道和按通道的数值校验，保持无模型参数的旧调用只校验“所有已知通道”，以避免破坏现有通用协议。

- [ ] **步骤 4：重新运行测试并提交。**

  运行与步骤 2 相同的 Vitest 命令；预期全部通过。

  ```powershell
  git add -- frontend_react/src/live2d/modelActionProfiles.js frontend_react/src/live2d/motionProtocol.js frontend_react/src/live2d/__tests__/motionProtocol.test.js frontend_react/src/live2d/__tests__/modelActionProfiles.test.js
  git commit -m "feat: define model-specific Live2D action profiles"
  ```

### 任务 2：让后端按当前模型约束 AI 动作控制块

**文件：**

- 修改：`backend/live2d_motion.py`
- 修改：`backend/chat_control.py`
- 修改：`backend/tests/test_live2d_motion.py`
- 修改：`backend/tests/test_chat_control.py`

- [ ] **步骤 1：先补充后端失败测试。**

  覆盖以下情形：`hiyori` 的抬臂轨道可通过且 `1.1` 被拒绝；`panda_cake` 的 `panda_hug` 可通过；panda_cake 收到 `left_arm_raise` 时轨道被过滤；未知/缺失模型只保留通用轨道；`ControlPrefixDemux(live2d_model='panda_cake')` 剥离文本但不给出 Hiyori 专属轨道。

- [ ] **步骤 2：运行后端定向测试，确认先失败。**

  运行：`D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe -m pytest backend\tests\test_live2d_motion.py backend\tests\test_chat_control.py -q`

  预期：新模型参数、通道范围和模型过滤测试失败。

- [ ] **步骤 3：实现模型感知的解析与二次过滤。**

  在 `backend/live2d_motion.py` 定义与前端一致的常量和纯函数：

  ```python
  def normalize_live2d_model(value: object) -> str | None: ...
  def allowed_channels_for_model(model_name: str | None) -> frozenset[str]: ...
  def parse_motion_plan(payload: object, *, model_name: str | None = None) -> dict | None: ...
  def filter_motion_plan_for_model(plan: dict, model_name: str | None) -> dict | None: ...
  ```

  `parse_motion_plan` 保留现有长度、轨道数、关键帧数和时间边界，新增按模型通道白名单及抬臂 `0..1` 校验。`filter_motion_plan_for_model` 作为解析后的第二道防线；若过滤后没有轨道，返回 `None`。

  将 `ControlPrefixDemux` 构造函数扩展为可选 `live2d_model`，解析 `ACTION:` 时把模型名传入校验。兼容旧构造方式：未传模型时只接受通用动作。

- [ ] **步骤 4：重新运行定向测试并提交。**

  再运行步骤 2 的 pytest 命令；预期通过。

  ```powershell
  git add -- backend/live2d_motion.py backend/chat_control.py backend/tests/test_live2d_motion.py backend/tests/test_chat_control.py
  git commit -m "feat: validate Live2D actions by model capability"
  ```

### 任务 3：贯通 WebSocket 模型名、动态提示词和后端投递

**文件：**

- 修改：`backend/brain_engine.py`
- 修改：`backend/main_server.py`
- 修改：`backend/tests/test_brain_prompt_contract.py`
- 修改：`backend/tests/test_brain_action_stream.py`
- 修改：`backend/tests/test_main_server_delivery_boundaries.py`

- [ ] **步骤 1：先写失败测试。**

  断言 `chat_stream(..., live2d_model='hiyori')` 的系统提示只列通用通道与 Hiyori 四个手臂通道，不出现 `panda_hug`；panda_cake 提示只出现通用通道和两个熊猫通道；未知模型提示只出现通用通道。

  对 WebSocket 文本包添加测试：`live2d_model` 被规范化后传入 `process_and_push_response()`、`brain.chat_stream()`、`ControlPrefixDemux` 和 `MotionDirectorV3.decide()`；伪造跨模型 `ACTION:` 在投递前不会成为 `live2d_motion_v3` 消息。

- [ ] **步骤 2：运行相关测试，确认先失败。**

  运行：`D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe -m pytest backend\tests\test_brain_prompt_contract.py backend\tests\test_brain_action_stream.py backend\tests\test_main_server_delivery_boundaries.py -q`

- [ ] **步骤 3：最小改动地传递模型上下文。**

  扩展 `BrainEngine.chat_stream()`：

  ```python
  async def chat_stream(self, user_id, user_text, long_term_memory="", recent_negative_count=0, live2d_model=None): ...
  ```

  使用 `allowed_channels_for_model()` 生成动态 ACTION 格式说明，仍保留“控制块不可出现在可见文本”的约束。将 `ControlPrefixDemux(live2d_model=...)` 用于流式控制块拆解。

  在 `main_server.py` 中从客户端文本负载读取 `live2d_model`，用 `normalize_live2d_model()` 规范化后传给 `process_and_push_response()`；该函数再传给 brain、delivery demux 与 motion director。旧客户端未传字段时完全可用，但只能得到通用动作。

- [ ] **步骤 4：运行测试并提交。**

  重新运行步骤 2 的 pytest 命令；预期通过。

  ```powershell
  git add -- backend/brain_engine.py backend/main_server.py backend/tests/test_brain_prompt_contract.py backend/tests/test_brain_action_stream.py backend/tests/test_main_server_delivery_boundaries.py
  git commit -m "feat: scope AI Live2D actions to selected model"
  ```

### 任务 4：实现前端模型选择与即时文字指令门禁

**文件：**

- 新建：`frontend_react/src/live2d/modelSelection.js`
- 修改：`frontend_react/src/components/Live2DViewer.jsx`
- 修改：`frontend_react/src/hooks/useUnaCore.js`
- 修改：`frontend_react/src/live2d/gestureParser.js`
- 修改：`frontend_react/src/live2d/gestureGenerator.js`
- 修改：`frontend_react/src/live2d/__tests__/gestureParser.test.js`
- 修改：`frontend_react/src/live2d/__tests__/gestureGenerator.test.js`
- 修改：`frontend_react/src/hooks/__tests__/useUnaCore.test.js`
- 修改：`frontend_react/src/components/__tests__/Live2DViewer.test.jsx`

- [ ] **步骤 1：先写失败测试。**

  增加中文命令解析断言：`举左手`、`举右手`、`举起双手`、`左手挥一挥`、`右手挥手`、`抱熊猫`、`熊猫手`、`捧脸`、`双手捧脸`、`戳脸`。验证否定表达（如“不要举手”）不触发。

  `createImmediateMotion(command, { modelName })` 的测试应证明：Hiyori 手臂命令生成 v3 专属通道，panda_cake 的手臂命令返回 `null`；panda 姿态只在 panda_cake 下生成；生成结果无嘴部通道。

  `useUnaCore` 测试应验证 WebSocket `text` 包包含 `live2d_model`，显式但不兼容的命令不会用“倾听动作”替代。`Live2DViewer` 切换模型须同步写入统一的本地选择存储。

- [ ] **步骤 2：运行这些测试，确认先失败。**

  运行：`D:\ai\Node\npx.cmd vitest run src/live2d/__tests__/gestureParser.test.js src/live2d/__tests__/gestureGenerator.test.js src/hooks/__tests__/useUnaCore.test.js src/components/__tests__/Live2DViewer.test.jsx --reporter=dot`

- [ ] **步骤 3：实现模型选择和用户动作优先级。**

  `modelSelection.js` 提供：

  ```js
  export function readSelectedLive2DModel() { /* hiyori | panda_cake | null */ }
  export function writeSelectedLive2DModel(modelName) { /* normalized value */ }
  ```

  `Live2DViewer` 用这两个函数取代散落的 `localStorage` 访问，并在成功切换时同步写入。`useUnaCore.sendMessage()` 在每条文字消息发送前读取当前模型名并一同发到 WebSocket。

  扩展 parser 的命令枚举和 generator 的动作模板；generator 先按模型档案过滤后才生成轨道。`sendMessage()` 的判定顺序必须为：检测到显式动作命令但该模型不支持时 `setMotionEvent(null)`；没有显式动作命令时才保留既有 listening 微反应。所有显式动作源标为 `user_command`，使其天然高于 AI 和随机轨道。

- [ ] **步骤 4：运行测试并提交。**

  重新运行步骤 2 的 Vitest 命令；预期通过。

  ```powershell
  git add -- frontend_react/src/live2d/modelSelection.js frontend_react/src/components/Live2DViewer.jsx frontend_react/src/hooks/useUnaCore.js frontend_react/src/live2d/gestureParser.js frontend_react/src/live2d/gestureGenerator.js frontend_react/src/live2d/__tests__/gestureParser.test.js frontend_react/src/live2d/__tests__/gestureGenerator.test.js frontend_react/src/hooks/__tests__/useUnaCore.test.js frontend_react/src/components/__tests__/Live2DViewer.test.jsx
  git commit -m "feat: gate immediate Live2D commands by selected model"
  ```

### 任务 5：将专属语义通道安全投影为真实 Cubism 参数

**文件：**

- 新建：`frontend_react/src/live2d/modelActionProjection.js`
- 修改：`frontend_react/src/live2d/modelCapabilities.js`
- 修改：`frontend_react/src/live2d/stateMixer.js`
- 修改：`frontend_react/src/hooks/useLive2DController.js`
- 新建：`frontend_react/src/live2d/__tests__/modelActionProjection.test.js`
- 修改：`frontend_react/src/live2d/__tests__/modelCapabilities.test.js`
- 修改：`frontend_react/src/live2d/__tests__/stateMixer.test.js`
- 修改：`frontend_react/src/hooks/__tests__/useLive2DController.test.js`

- [ ] **步骤 1：先写参数投影和生命周期失败测试。**

  使用模拟 Cubism 参数/部件可见性测试以下行为：

  - Hiyori 在 `PartArmA` 可见时，`left_arm_raise: 0` 不写参数，`1` 向当前原生 `ParamArmLA` 值平滑靠近档案目标 `0`；手部摆动仅在相应抬臂活动时写 `ParamHandL/R`。
  - `PartArmA` 不可见、任一关键参数缺失或范围非法时，相关 Hiyori 轨道被忽略，通用轨道仍应用。
  - panda_cake 的 `panda_hug` 写入 `Param3=1` 与 `Param6=1`，可选 `Param150..152` 缺失仅跳过细节；`hands_to_face` 写入 `Param5=1` 与 `Param6=1`，可选 `Param153..158` 同理。
  - 两个 panda 姿态互斥，新姿态开始时旧姿态平滑回各参数默认值；动作结束也恢复默认值。
  - 控制器在原生 `internalModel.update()` 之后、draw 之前写入；切换模型、重复 ready、卸载与事件 generation 变化都会清空专属轨道；不会覆盖 lip-sync 写入。

- [ ] **步骤 2：运行定向测试，确认先失败。**

  运行：`D:\ai\Node\npx.cmd vitest run src/live2d/__tests__/modelActionProjection.test.js src/live2d/__tests__/modelCapabilities.test.js src/live2d/__tests__/stateMixer.test.js src/hooks/__tests__/useLive2DController.test.js --reporter=dot`

- [ ] **步骤 3：实现独立的专属参数投影器。**

  `modelActionProjection.js` 导出纯函数：

  ```js
  export function projectModelSpecificActions({
    coreModel, modelName, semanticFrame, capabilityMap, partOpacityById,
  }) {
    // { writes: Array<{ id, value }>, claimedChannels: Set<string> }
  }
  ```

  该函数只能读取当前原生参数、模型范围、默认值和部件透明度，返回有限值写入列表，不能直接触碰 Pixi 对象。Hiyori 使用“原生当前值 → 安全目标”的插值，因此不会用绝对值抢掉模型自带呼吸或姿势；摆手的相位由 `variation_seed` 和单调时间计算。panda 姿态通过 `Param3/5/6` 的目标/恢复曲线实现，物理参数只作幅度很小的附加细节。

  在 `modelCapabilities.js` 把现有通用映射保持原样，仅暴露投影器所需的真实参数范围、默认值和存在性。`stateMixer` 增加只读查询（例如 `hasActiveSource(source)`、`hasActiveChannel(channel)`），不改变原有优先级。

  在 `useLive2DController` 的既有 post-update hook 内，先执行通用通道映射，再执行专属投影，再执行既有 TTS 嘴型最终写入；所有 write 均应检查 `Number.isFinite`、参数存在和范围钳制。不得新增独立 ticker。

- [ ] **步骤 4：运行测试、执行浏览器校准并提交。**

  先重新运行步骤 2 的 Vitest 命令。随后在开发环境逐项人工观察：Hiyori 左/右/双手抬起、左右挥手；panda_cake 熊猫手与捧脸/戳脸；动作结束后默认表情恢复；切换模型和收到 AI 回复时不会卡住、不会停止眨眼、不会影响说话嘴型。若真实模型参数方向与档案相反，只调整 `modelActionProfiles.js` 中的目标值/符号，不修改协议语义。

  ```powershell
  git add -- frontend_react/src/live2d/modelActionProjection.js frontend_react/src/live2d/modelCapabilities.js frontend_react/src/live2d/stateMixer.js frontend_react/src/hooks/useLive2DController.js frontend_react/src/live2d/__tests__/modelActionProjection.test.js frontend_react/src/live2d/__tests__/modelCapabilities.test.js frontend_react/src/live2d/__tests__/stateMixer.test.js frontend_react/src/hooks/__tests__/useLive2DController.test.js
  git commit -m "feat: project model-specific Live2D action parameters"
  ```

### 任务 6：实现低频、可复现的本地随机动作调度器

**文件：**

- 新建：`frontend_react/src/live2d/modelActionScheduler.js`
- 修改：`frontend_react/src/hooks/useLive2DController.js`
- 新建：`frontend_react/src/live2d/__tests__/modelActionScheduler.test.js`
- 修改：`frontend_react/src/hooks/__tests__/useLive2DController.test.js`

- [ ] **步骤 1：先写失败测试。**

  以固定 `sessionSeed` 和可控单调时间测试同一输入得到同一动作序列；测试通用候选遵守 3–6 秒冷却、专属候选遵守 15–25 秒冷却、最近三次相同动作家族不会重复。

  测试优先级门禁：`user_command` 或 `ai_reply` 正在活跃时 `schedule()` 返回 `null`；模型未知返回 `null`；panda_cake 绝不产生手臂候选，Hiyori 绝不产生熊猫候选；输出轨道不会包含口型通道。

- [ ] **步骤 2：运行调度器测试，确认先失败。**

  运行：`D:\ai\Node\npx.cmd vitest run src/live2d/__tests__/modelActionScheduler.test.js src/hooks/__tests__/useLive2DController.test.js --reporter=dot`

- [ ] **步骤 3：实现只生成本地 v3 事件的调度器。**

  实现接口：

  ```js
  export class ModelActionScheduler {
    constructor({ sessionSeed, now = performance.now })
    reset({ modelName, generation })
    schedule({ modelName, emotion, nowMs, mixer })
  }
  ```

  调度器不读写 Live2D 参数：只根据模型、当前 emotion/VAD 线索、`variation_seed`、最近历史和冷却返回 `source: 'local_random'` 的 v3 motion 或 `null`。通用动作是轻微视线、头部、身体变化；Hiyori 仅在积极问候/开心/强调时低概率加入抬臂/挥手；panda_cake 仅在安抚、陪伴、害羞、惊喜、夸奖等情绪时低概率加入熊猫手/捧脸。所有概率固定在档案或 scheduler 常量中且可由种子复现。

  在控制器同一个 post-update 帧入口采样调度器；用 mixer 的只读查询确认用户和 AI 没有占用，再把返回事件入队。切换模型、重复 ready、卸载、WebSocket generation 变化时调用 `reset()`；绝不新建独立渲染 ticker。

- [ ] **步骤 4：运行测试并提交。**

  重新运行步骤 2 的 Vitest 命令；预期通过。

  ```powershell
  git add -- frontend_react/src/live2d/modelActionScheduler.js frontend_react/src/hooks/useLive2DController.js frontend_react/src/live2d/__tests__/modelActionScheduler.test.js frontend_react/src/hooks/__tests__/useLive2DController.test.js
  git commit -m "feat: schedule safe model-specific idle actions"
  ```

### 任务 7：全量验证、发布产物和功能清单收尾

**文件：**

- 修改：`docs/功能清单.md`
- 如构建产物由仓库追踪：按现有发布脚本更新相应前端产物；不手工编辑压缩 bundle。

- [ ] **步骤 1：完成自动化验证。**

  ```powershell
  Set-Location D:\ai\Una\.worktrees\p2-model-action-profiles\frontend_react
  D:\ai\Node\npx.cmd vitest run --reporter=dot
  D:\ai\Node\npm.cmd run build

  Set-Location D:\ai\Una\.worktrees\p2-model-action-profiles
  D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe -m pytest backend\tests -q
  git diff --check
  ```

  预期：Vitest、前端构建、后端 pytest 和 diff 空白检查全部成功。

- [ ] **步骤 2：执行人工验收矩阵。**

  在浏览器分别选择两个模型并逐项检查：

  1. Hiyori：输入“举左手”“举右手”“举起双手”“左手挥一挥”“右手挥手”，动作可见且回复结束后自然恢复。
  2. panda_cake：输入“抱熊猫”“熊猫手”“捧脸”“戳脸”，对应部件/姿态可见且互斥、可恢复。
  3. 跨模型：panda_cake 输入“举手”、Hiyori 输入“抱熊猫”时没有伪造动作，但文字、语音、眨眼和自然待机正常。
  4. AI：两模型各发送正常聊天和积极聊天，检查 ACTION 文本不显示在气泡中，专属动作只属于当前模型。
  5. 稳定性：连续发送消息、播放 TTS、切换模型、等待随机动作；角色不冻结，眨眼/待机继续，嘴型与语音同步。
  6. 随机性：一次普通会话中不高频重复；固定测试种子下单测动作序列固定。

- [ ] **步骤 3：更新中文功能清单并提交收尾文档。**

  将 P2 条目从“设计已确认”改为“已实现/已自动验证/待用户浏览器复核”，明确 Hiyori 和 panda_cake 的不同可用动作、跨模型不执行规则、随机调度边界和 APK 尚未验证。

  ```powershell
  git add -- docs/功能清单.md
  git commit -m "docs: record model-specific Live2D action verification"
  ```

## 完成前复核

- [ ] `git status --short` 仅包含预期的、已提交的改动；不混入用户既有改动。
- [ ] `git log --oneline main..HEAD` 中的提交均只涉及本 P2 范围。
- [ ] 使用 `superpowers:verification-before-completion` 复核真实命令输出后，才能报告“完成”。
- [ ] 使用 `superpowers:requesting-code-review` 做一次实现审查；修复确认的问题后再让用户选择是否合并回本地 `main`。
