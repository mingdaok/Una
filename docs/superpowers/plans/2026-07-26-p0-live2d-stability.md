# Live2D P0 稳定性修复实施计划

> **供智能开发代理使用：** 必须使用 `superpowers:executing-plans` 按任务执行；所有生产代码必须先有可复现问题的失败测试。

**目标：** 彻底阻止 `EMOTION`、`ACTION`、旧版 `[动作:...]` 等控制文本进入字幕、语音和数据库，并移除预设 Motion/Expression 与自由参数控制器之间的竞争，使模型回复后能够稳定归位。

**架构：** 后端新增独立的流式控制前缀解复用器，负责从任意分片中循环消费多个控制帧；WebSocket、TTS、数据库之前再经过纯文本清洗边界。前端只保留 `useLive2DController` 作为聊天动作参数写入入口，模型加载时使用 ExpressionManager 的正式复位 API，并把所有模型参数恢复到其默认值。

**技术栈：** Python 3.11、pytest、FastAPI/WebSocket、React 18、Vitest、PixiJS、pixi-live2d-display 0.4.0、SQLite。

## 全局约束

- 不增加第三方依赖。
- 不修改或提交真实数据库、Chroma 数据、语音、图片、缓存和 `node_modules`。
- 所有 Markdown 文档使用中文。
- 控制协议只生成 `EMOTION` 和 `ACTION`；旧版 `[动作:...]` 仅作为异常输入清理，不再触发动作。
- 字幕、TTS、数据库和记忆服务只能收到清洗后的自然语言。
- 聊天过程中禁止直接调用 `model.motion()`、`model.expression()`。
- 历史数据迁移必须先创建 SQLite 备份，并在单个事务内更新。

---

### 任务 1：流式控制前缀解复用器与文本清洗器

**文件：**

- 新建：`backend/chat_control.py`
- 新建：`backend/tests/test_chat_control.py`

**接口：**

- `ControlPrefixDemux.feed(text: str, final: bool = False) -> tuple[list[dict], str]`
- `ControlPrefixDemux.finish() -> tuple[list[dict], str]`
- `sanitize_reply_text(text: str) -> str`

**行为：**

- 支持 `EMOTION: ... | MOOD: ...` 和 `ACTION: JSON|null` 被任意字符位置拆分。
- 循环消费多个前缀，包括重复控制行、旧版 `[动作:...]`、前置中英文舞台括号和控制代码围栏。
- 只推送第一个合法 `live2d_action_candidate`，未知或非法 Action 被丢弃。
- 一旦确定正文开始，后续正文按原样返回。
- 流结束时，残缺控制帧直接丢弃，不得变成正文。

- [x] **步骤 1：写失败测试**

```python
def test_mixed_legacy_and_semantic_controls_never_enter_body():
    demux = ControlPrefixDemux()
    events, body = demux.feed(
        'EMOTION: thinking | MOOD: 3\n'
        '[动作:期待] ACTION: {"intent":"curious_question","intensity":0.4,'
        '"expression":"subtle","timing":"after_sentence","duration_ms":1000,'
        '"variation_seed":5}（光晕轻晃）啊呀！'
    )
    assert body == "啊呀！"
    assert [event["type"] for event in events] == ["meta", "live2d_action_candidate"]
```

同时覆盖逐字符分片、`ACTION: null`、平衡但非法 JSON、残缺 JSON、重复控制帧和截图原文的最终清洗。

- [x] **步骤 2：确认测试因模块尚不存在而失败**

运行：

```powershell
& 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend/tests/test_chat_control.py -q
```

预期：`ModuleNotFoundError: No module named 'chat_control'`。

- [x] **步骤 3：实现最小状态机**

状态机只维护控制区缓冲、是否进入正文、是否已经发出 meta 和 action。每次识别完整控制帧后继续循环，不使用“动作行已解析”单一布尔值提前解锁正文。

- [x] **步骤 4：确认测试通过**

运行同一步骤 2，预期全部通过。

### 任务 2：接入 BrainEngine 与四个最终文本边界

**文件：**

- 修改：`backend/brain_engine.py`
- 修改：`backend/main_server.py`
- 修改：`backend/tests/test_brain_action_stream.py`

**接口：**

- `UnaBrain.chat_stream()` 使用 `ControlPrefixDemux`，只产生 `meta`、`live2d_action_candidate` 和清洗后的 `sentence`。
- `process_and_push_response()` 在广播字幕、启动 TTS、保存数据库、发送流结束与写入记忆前使用 `sanitize_reply_text()`。

- [x] **步骤 1：增加混合协议集成失败测试**

模拟 LLM 分片输出：

```text
EMOTION: thinking | MOOD: 3
[动作:期待] ACTION: {"intent":"curious_question","intensity":0.4,"expression":"subtle","timing":"after_sentence","duration_ms":1000,"variation_seed":5}（光晕轻晃）啊呀！让我猜猜。
```

断言只有一个语义动作事件，所有 sentence 拼接结果为 `啊呀！让我猜猜。`，不存在 `ACTION:`、`[动作:` 或舞台说明。

- [x] **步骤 2：运行测试并确认当前实现泄漏**

```powershell
& 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend/tests/test_brain_action_stream.py -q
```

预期：新增用例的正文包含 `ACTION:`。

- [x] **步骤 3：替换旧解析状态机并清理提示词**

提示词完整示例改为：

```text
EMOTION: happy | MOOD: 3
ACTION: {"intent":"shy_happy","intensity":0.45,"expression":"subtle","timing":"reply_start","duration_ms":900,"variation_seed":1}
哇！你来了。
```

删除旧 `[动作:...]` 指令、示例、同义词和 `chat_action` 生成路径。句段输出前和流结束时都调用文本清洗器。

- [x] **步骤 4：在发送与持久化边界增加第二层清洗**

```python
text_chunk = sanitize_reply_text(item.get("text", ""))
if not text_chunk:
    continue
```

完整回复在数据库、`audio_stream_end` 和记忆服务之前再次清洗，避免未来解析器回归污染外部边界。

- [x] **步骤 5：运行后端测试**

```powershell
& 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend/tests/test_chat_control.py backend/tests/test_brain_action_stream.py backend/tests/test_brain_engine.py -q
```

预期：全部通过。

### 任务 3：移除预设动作竞争并正确复位模型

**文件：**

- 新建：`frontend_react/src/live2d/modelState.js`
- 新建：`frontend_react/src/live2d/__tests__/modelState.test.js`
- 新建：`frontend_react/src/components/__tests__/Live2DViewer.test.jsx`
- 修改：`frontend_react/src/components/Live2DViewer.jsx`

**接口：**

- `resetLive2DModelState(model) -> boolean`
- 调用 `model.internalModel.motionManager.expressionManager.resetExpression()`。
- 遍历 CoreModel 参数，使用 `getParameterDefaultValue(index)` 恢复默认值。

- [x] **步骤 1：写复位失败测试**

断言：

- ExpressionManager 的 `resetExpression()` 被调用一次。
- 所有 CoreModel 参数都写回各自默认值。
- `model.expression()` 和 `model.motion()` 从不被调用。

- [x] **步骤 2：写组件失败测试**

加载假的 Live2D 模型后改变 `emotion`，断言模型加载时执行正式复位，但情绪变化不调用预设 Motion/Expression。

- [x] **步骤 3：运行测试并确认失败**

```powershell
& '.\frontend_react\node_modules\.bin\vitest.cmd' run frontend_react/src/live2d/__tests__/modelState.test.js frontend_react/src/components/__tests__/Live2DViewer.test.jsx --root frontend_react
```

预期：复位模块不存在，现有组件会调用预设动作。

- [x] **步骤 4：实现复位并删除预设映射**

删除 `HIYORI_MOTION_MAP`、`PANDA_EXPR_MAP`、`triggerMotion`、定时器和对应 emotion effect。模型加载完成、加入舞台前调用 `resetLive2DModelState(model)`。

- [x] **步骤 5：运行前端受影响测试**

```powershell
& '.\frontend_react\node_modules\.bin\vitest.cmd' run frontend_react/src/live2d/__tests__/modelState.test.js frontend_react/src/components/__tests__/Live2DViewer.test.jsx frontend_react/src/hooks/__tests__/useLive2DController.test.js --root frontend_react
```

预期：全部通过。

### 任务 4：历史控制文本迁移

**文件：**

- 新建：`scripts/clean_chat_control_prefixes.py`
- 新建：`backend/tests/test_chat_control_migration.py`

**接口：**

- `clean_database(db_path, apply=False, backup_path=None) -> dict`
- 返回扫描数量、命中数量、修改数量与备份路径。

- [x] **步骤 1：写临时 SQLite 失败测试**

插入正常 AI 消息、截图式泄漏消息和用户消息。预览模式不得修改；应用模式只清理 AI 消息并保留自然语言正文。

- [x] **步骤 2：确认测试失败**

运行：

```powershell
& 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend/tests/test_chat_control_migration.py -q
```

- [x] **步骤 3：实现备份和事务迁移**

使用 SQLite backup API 创建备份；仅更新 `role='ai'` 且清洗后内容发生变化的行。应用模式必须显式传入 `--apply`。

- [x] **步骤 4：运行测试并对真实数据库先预览、再备份应用**

```powershell
& 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' scripts/clean_chat_control_prefixes.py
& 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' scripts/clean_chat_control_prefixes.py --apply
```

应用前记录命中数，应用后再次预览必须为 0；备份文件保留。

### 任务 5：功能清单、完整验证与集成

**文件：**

- 修改：`docs/功能清单.md`
- 构建产物：`frontend_react/dist/**`
- 同步产物：`backend/static/mobile/**`

- [x] **步骤 1：更新功能清单**

把 P0 的协议统一、流式解复用、最终出口清洗、预设动作移除、正式 Expression 复位、参数默认值归位、历史迁移和自动化测试逐项标记。

- [x] **步骤 2：运行后端完整回归**

```powershell
& 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend/tests -q
```

- [x] **步骤 3：运行前端完整测试**

```powershell
& '.\frontend_react\node_modules\.bin\vitest.cmd' run --root frontend_react
```

- [x] **步骤 4：生产构建并确认静态入口引用新产物**

```powershell
npm.cmd run build
```

工作目录：`frontend_react`。构建成功后按项目现有发布方式同步到 `backend/static/mobile`，确认其 `index.html` 引用的新哈希资源存在。

- [x] **步骤 5：检查差异与功能覆盖**

确认没有运行时数据、缓存、依赖或真实数据库进入提交；对照本计划逐项确认完成状态。

- [ ] **步骤 6：提交、合并回本地 main 并再次验证**

提交信息：

```text
fix: stabilize Live2D control protocol
```

合并后重新运行后端相关测试、前端测试和构建检查。
