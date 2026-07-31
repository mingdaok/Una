# UNA 克隆语音精确口型同步与连续播放实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 在保留 Rhubarb 精确音素口型的前提下，让 GPT-SoVITS 第一语音单元更快开始、后续句段有序预生成并连续播放，同时提供足以定位剩余延迟的全链路阶段耗时。

**架构：** 后端先把 AI 流式文字交给纯文字聚合器，再由每会话单一有序语音会话串行调用 GPT-SoVITS；短单元不再二次切分，并缩短内部静音。前端使用独立的有序音频队列提前加载下一单元，播放器用同一个 `AudioContext` 起点驱动声音和 Rhubarb 时间轴；回复 ID 和连接代次共同阻止旧任务重播。

**技术栈：** Python 3.11、FastAPI、asyncio、aiohttp、GPT-SoVITS API v2、FFmpeg、Rhubarb、pytest、React 18、Web Audio API、Vitest、Vite、PowerShell。

## 全局约束

- 只在 `D:\ai\Una\.worktrees\p0-tts-latency` 的 `codex/p0-tts-latency` 分支实施，未经用户明确要求不得合并到本地 `main`。
- 保留完整音频后再执行 Rhubarb；本阶段不启用无法同时提供精确音素时间轴的真流式字节播放。
- 第一语音单元在首个可朗读短句到达时立即封口；后续目标长度为 40～60 个中文字符，默认聚合窗口为 200 毫秒，单元硬上限为 80 个中文字符。
- 80 字以内的 GPT-SoVITS 请求使用 `text_split_method: cut0`；绕过聚合器的超长文本使用 `cut5`；`fragment_interval` 固定为 `0.05`；`streaming_mode` 保持 `false`。
- 同一用户同一时刻只允许一条活跃语音回复；同一回复严格按连续索引生成和投递。全局 GPT-SoVITS 并发数固定为 1，避免本机显存争用。
- `audio_stream_end` 只在所有语音作业成功、失败或取消并进入终态后发送；LLM 文字结束不能提前代表语音结束。
- 音频与 Rhubarb 时间轴共用同一个 `AudioContext.currentTime` 播放起点；结束、中断、失败和切换回复时嘴部必须复位。
- 日志只记录 `reply_id`、`chunk_index`、阶段名、状态和毫秒耗时，不记录访问令牌、媒体 ticket 或完整音频 URL。
- GPT-SoVITS 运行环境必须显示 `device: cuda`、`is_half: true`、`torch.cuda.is_available(): true`；环境不满足时不得把性能验收判为通过。
- 每完成一个实现任务，都更新 `docs/功能清单.md`，明确“已实现、已自动验证、待人工验证”的边界。

---

## 文件结构与职责

### 新建文件

- `backend/speech_metrics.py`：定义安全的语音追踪标识和阶段耗时日志，不接触 URL 或令牌。
- `backend/speech_units.py`：定义 `SpeechUnit` 和纯文字聚合器，不调用网络或 WebSocket。
- `backend/speech_stream.py`：定义单回复有序语音会话与按用户取消/替换的协调器。
- `backend/speech_delivery.py`：把有序语音会话适配为 start/chunk/end WebSocket 事件，供普通聊天和视觉回复共同使用。
- `backend/tests/test_tts_service.py`：锁定 GPT-SoVITS 请求参数、回退规则和阶段日志。
- `backend/tests/test_speech_units.py`：锁定第一短句、200 毫秒窗口、长度边界和封口规则。
- `backend/tests/test_speech_stream.py`：锁定串行生成、索引顺序、失败继续、取消和结束条件。
- `backend/tests/test_speech_delivery.py`：通过真实异步回调锁定 reply ID、结束等待、中断和视觉复用行为。
- `frontend_react/src/audio/audioStreamQueue.js`：管理 `received/loading/ready/playing/done/failed` 状态、有序消费和断粮统计。
- `frontend_react/src/audio/syncedAudioPlayer.js`：只负责 AudioBuffer 播放与 Rhubarb 时间轴使用同一时钟。
- `frontend_react/src/audio/__tests__/audioStreamQueue.test.js`：测试乱序到达、预加载、失败跳过、旧回复隔离和断粮耗时。
- `frontend_react/src/audio/__tests__/syncedAudioPlayer.test.js`：测试共同播放起点、音素采样和嘴部复位。

### 修改文件

- `backend/tts_service.py`：抽出请求构造，加入 `cut0/cut5`、`fragment_interval=0.05` 和阶段计时。
- `backend/main_server.py`：用语音会话替代每句无序 `create_task`，贯通 `reply_id`，修正结束与中断语义。
- `backend/tests/test_main_server_delivery_boundaries.py`：锁定主链路只通过有序会话投递、结束前等待和 vision 复用。
- `frontend_react/src/hooks/useUnaCore.js`：接入有序队列和同步播放器，删除 URL 日志，保留回放接口。
- `frontend_react/src/hooks/__tests__/useUnaCore.test.js`：锁定 WebSocket 回复 ID、旧连接隔离、播放器生命周期和消息气泡行为。
- `docs/功能清单.md`：每项任务完成后同步真实进度。
- `frontend_react/dist/**`、`backend/static/mobile/**`：只由构建与发布脚本生成，不手工修改压缩产物。

---

### 任务 1：固定 GPT-SoVITS 请求策略与安全阶段计时

**文件：**

- 新建：`backend/speech_metrics.py`
- 新建：`backend/tests/test_tts_service.py`
- 修改：`backend/tts_service.py`
- 修改：`docs/功能清单.md`

**接口：**

- 产出：`SpeechTrace(reply_id: str, chunk_index: int)`。
- 产出：`log_speech_stage(trace, stage, duration_ms, status="ok") -> None`。
- 产出：`build_gsv_payload(clean_text: str, emotion="neutral") -> dict`。
- 保持：`generate_audio_gsv(text, emotion="neutral", *, trace=None) -> tuple[str | None, list]`，旧的两参数调用继续有效。

- [ ] **步骤 1：先写请求参数和安全日志失败测试。**

  在 `backend/tests/test_tts_service.py` 写入至少以下断言：

  ```python
  from speech_metrics import SpeechTrace, log_speech_stage
  from tts_service import build_gsv_payload


  def test_short_tts_unit_avoids_second_split_and_long_silence():
      payload = build_gsv_payload("这是一个短语音单元。", "neutral")
      assert payload["streaming_mode"] is False
      assert payload["text_split_method"] == "cut0"
      assert payload["fragment_interval"] == 0.05


  def test_oversized_direct_call_falls_back_to_punctuation_split():
      payload = build_gsv_payload("很长。" * 41, "neutral")
      assert len(payload["text"]) > 80
      assert payload["text_split_method"] == "cut5"


  def test_stage_log_contains_no_media_url_or_ticket(capsys):
      trace = SpeechTrace(reply_id="reply-1", chunk_index=2)
      log_speech_stage(trace, "gpt_http", 123.45, status="ok")
      output = capsys.readouterr().out
      assert "reply-1" in output
      assert "chunk=2" in output
      assert "123.45" in output
      assert "ticket=" not in output
      assert "/api/media/" not in output
  ```

  再用 monkeypatch 替换 `aiohttp.ClientSession`、`_run_rhubarb` 和 `_convert_wav_to_mp3`，验证 `generate_audio_gsv("测试语音", "neutral", trace=trace)` 分别记录 `gpt_http`、`write_file`、`rhubarb`、`transcode`，且返回接口仍是 `(audio_url, visemes)`。

- [ ] **步骤 2：运行定向测试，确认先失败。**

  ```powershell
  Set-Location D:\ai\Una\.worktrees\p0-tts-latency
  & 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend\tests\test_tts_service.py -q
  ```

  预期：因 `speech_metrics.py` 和 `build_gsv_payload()` 尚不存在而失败。

- [ ] **步骤 3：实现最小请求构造与固定字段计时器。**

  `backend/speech_metrics.py` 只接受固定字段：

  ```python
  from dataclasses import dataclass


  @dataclass(frozen=True)
  class SpeechTrace:
      reply_id: str
      chunk_index: int


  def log_speech_stage(
      trace: SpeechTrace | None,
      stage: str,
      duration_ms: float,
      *,
      status: str = "ok",
  ) -> None:
      if trace is None:
          return
      safe_stage = stage if stage in {
          "aggregate_wait", "queue_wait", "gpt_http", "write_file",
          "rhubarb", "transcode", "ws_delivery",
      } else "unknown"
      safe_status = status if status in {"ok", "failed", "cancelled"} else "failed"
      print(
          f"⏱️ [Speech] reply={trace.reply_id} chunk={trace.chunk_index} "
          f"stage={safe_stage} status={safe_status} duration_ms={duration_ms:.2f}"
      )
  ```

  `build_gsv_payload()` 复用现有速度、采样和参考音频配置，只改变以下字段：

  ```python
  payload["streaming_mode"] = False
  payload["text_split_method"] = "cut0" if len(clean_text) <= 80 else "cut5"
  payload["fragment_interval"] = 0.05
  ```

  使用 `time.perf_counter()` 包围 HTTP、文件写入、Rhubarb 和转码。不要把响应 URL、保护后的媒体 URL或 ticket 传给日志函数。

- [ ] **步骤 4：运行测试、更新清单并提交。**

  运行步骤 2 的 pytest；预期全部通过。把功能清单中的请求参数和阶段日志标为“代码已实现、定向测试通过”，其余仍保持未完成。

  ```powershell
  git add -- backend/speech_metrics.py backend/tts_service.py backend/tests/test_tts_service.py docs/功能清单.md
  git commit -m "perf: reduce GPT-SoVITS chunk silence"
  ```

### 任务 2：实现可独立测试的语音文字聚合器

**文件：**

- 新建：`backend/speech_units.py`
- 新建：`backend/tests/test_speech_units.py`
- 修改：`docs/功能清单.md`

**接口：**

- 产出：`SpeechUnit(index, text, emotion, created_at_ms, aggregate_wait_ms)`。
- 产出：`SpeechUnitAggregator.add(text, emotion, now_ms) -> list[SpeechUnit]`。
- 产出：`SpeechUnitAggregator.flush_due(now_ms) -> list[SpeechUnit]`。
- 产出：`SpeechUnitAggregator.close(now_ms) -> list[SpeechUnit]`。
- 依赖：任务 1 的 `SpeechTrace` 由后续会话按 `SpeechUnit.index` 创建，本任务不记录日志。

- [ ] **步骤 1：先写聚合边界失败测试。**

  `backend/tests/test_speech_units.py` 覆盖：

  ```python
  def test_first_readable_chunk_is_emitted_immediately():
      aggregator = SpeechUnitAggregator()
      units = aggregator.add("你好呀！", "happy", now_ms=1000)
      assert [(unit.index, unit.text) for unit in units] == [(0, "你好呀！")]


  def test_later_chunks_merge_until_debounce_expires():
      aggregator = SpeechUnitAggregator()
      aggregator.add("首句。", "neutral", now_ms=0)
      assert aggregator.add("第二句。", "neutral", now_ms=50) == []
      assert aggregator.add("第三句。", "neutral", now_ms=120) == []
      assert aggregator.flush_due(now_ms=319) == []
      units = aggregator.flush_due(now_ms=320)
      assert [unit.text for unit in units] == ["第二句。第三句。"]


  def test_hard_limit_splits_without_losing_or_reordering_text():
      aggregator = SpeechUnitAggregator(hard_max_chars=80)
      aggregator.add("首句。", "neutral", now_ms=0)
      source = "甲" * 50 + "乙" * 50
      units = aggregator.add(source, "neutral", now_ms=1)
      units += aggregator.close(now_ms=2)
      assert "".join(unit.text for unit in units) == source
      assert all(len(unit.text) <= 80 for unit in units)
      assert [unit.index for unit in units] == [1, 2]
  ```

  另测：空白/纯控制文本不产生单元、达到 40～60 字目标可立即封口、`close()` 会排空不足目标的尾段、不同 emotion 不被错误合并为同一单元。

- [ ] **步骤 2：运行测试确认先失败。**

  ```powershell
  & 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend\tests\test_speech_units.py -q
  ```

- [ ] **步骤 3：实现纯聚合状态机。**

  使用不可变数据对象和明确常量：

  ```python
  @dataclass(frozen=True)
  class SpeechUnit:
      index: int
      text: str
      emotion: str
      created_at_ms: float
      aggregate_wait_ms: float


  class SpeechUnitAggregator:
      def __init__(
          self,
          *,
          target_min_chars: int = 40,
          target_max_chars: int = 60,
          hard_max_chars: int = 80,
          debounce_ms: float = 200.0,
      ):
          self.target_min_chars = target_min_chars
          self.target_max_chars = target_max_chars
          self.hard_max_chars = hard_max_chars
          self.debounce_ms = debounce_ms
  ```

  在同一类中实现精确签名 `add(self, text: str, emotion: str, now_ms: float) -> list[SpeechUnit]`、`flush_due(self, now_ms: float) -> list[SpeechUnit]`、`close(self, now_ms: float) -> list[SpeechUnit]`。第一段只要非空就立即生成索引 0。之后先按硬上限安全切分，再按 emotion、目标长度和 200 毫秒截止点封口。每个输入字符必须恰好进入一个单元；不要在聚合器中调用 TTS、睡眠或 WebSocket。

- [ ] **步骤 4：运行测试、更新清单并提交。**

  ```powershell
  & 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend\tests\test_speech_units.py -q
  git add -- backend/speech_units.py backend/tests/test_speech_units.py docs/功能清单.md
  git commit -m "feat: aggregate streaming text into speech units"
  ```

### 任务 3：实现单回复有序语音会话与按用户取消

**文件：**

- 新建：`backend/speech_stream.py`
- 新建：`backend/tests/test_speech_stream.py`
- 修改：`docs/功能清单.md`

**接口：**

- 消费：任务 2 的 `SpeechUnitAggregator` 和 `SpeechUnit`。
- 消费：任务 1 的 `SpeechTrace`、`log_speech_stage()`。
- 产出：`SpeechStreamSummary(reply_id, total, succeeded, failed, cancelled)`。
- 产出：`SpeechStreamSession.add_text(text, emotion) -> None`、`close() -> SpeechStreamSummary`、`cancel() -> None`。
- 产出：`SpeechStreamCoordinator.begin(user_id, reply_id, render_unit) -> SpeechStreamSession`、`cancel(user_id) -> None`、`is_current(user_id, reply_id) -> bool`。

- [ ] **步骤 1：先写并发、顺序和取消失败测试。**

  使用 `asyncio.run()`、受控 `render_unit` 和很短的测试防抖值覆盖：

  ```python
  def test_session_renders_units_strictly_in_index_order():
      seen = []

      async def render(unit, trace):
          seen.append(("start", unit.index))
          await asyncio.sleep(0)
          seen.append(("end", unit.index))
          return True

      async def scenario():
          coordinator = SpeechStreamCoordinator(max_parallel_synthesis=1)
          session = await coordinator.begin("user-1", "reply-1", render)
          await session.add_text("第一句。", "neutral")
          await session.add_text("第二句。" * 10, "neutral")
          summary = await session.close()
          assert summary.failed == 0

      asyncio.run(scenario())
      assert seen == sorted(seen, key=lambda item: (item[1], item[0] != "start"))
  ```

  另外测试：

  - 第二单元失败返回 `False` 后第三单元继续，汇总为 `succeeded=2, failed=1`。
  - `close()` 在 render 尚未完成时不会返回。
  - `begin()` 同一用户的新 reply 会取消旧 reply，旧 reply 后续不再投递。
  - 不同用户共享 `asyncio.Semaphore(1)`，不会同时进入 render。
  - 200 毫秒定时封口能在没有下一段文字到达时把 pending 单元送入队列。
  - `cancel()` 会取消防抖任务和 worker，汇总状态为 cancelled，不遗留未等待的 task。

- [ ] **步骤 2：运行测试确认先失败。**

  ```powershell
  & 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend\tests\test_speech_stream.py -q
  ```

- [ ] **步骤 3：实现有序 worker 和协调器。**

  先实现以下稳定数据类型和回调类型：

  ```python
  @dataclass(frozen=True)
  class SpeechStreamSummary:
      reply_id: str
      total: int
      succeeded: int
      failed: int
      cancelled: bool


  RenderUnit = Callable[[SpeechUnit, SpeechTrace], Awaitable[bool]]

  ```

  `SpeechStreamCoordinator` 必须实现精确签名：`__init__(self, *, max_parallel_synthesis: int = 1)`、`begin(self, user_id: str, reply_id: str, render_unit: RenderUnit) -> SpeechStreamSession`、`cancel(self, user_id: str) -> None`、`is_current(self, user_id: str, reply_id: str) -> bool`。每个 session 只创建一个 `asyncio.Queue` worker。聚合器产生的单元按索引入队；worker 在全局 semaphore 内调用 `render_unit`，记录 `queue_wait`，捕获单元级异常后继续。`close()` 先取消防抖计时、排空聚合器、写入 sentinel，再等待 `queue.join()` 和 worker 结束。取消后的旧 session 不能调用新回复的回调。

- [ ] **步骤 4：运行测试、更新清单并提交。**

  ```powershell
  & 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend\tests\test_speech_units.py backend\tests\test_speech_stream.py -q
  git add -- backend/speech_stream.py backend/tests/test_speech_stream.py docs/功能清单.md
  git commit -m "feat: serialize speech generation per reply"
  ```

### 任务 4：把聊天、视觉回复和中断接入有序语音会话

**文件：**

- 新建：`backend/speech_delivery.py`
- 新建：`backend/tests/test_speech_delivery.py`
- 修改：`backend/main_server.py`
- 修改：`backend/tests/test_main_server_delivery_boundaries.py`
- 修改：`docs/功能清单.md`

**接口：**

- 消费：任务 3 的 `SpeechStreamCoordinator`。
- 产出：`SpeechReplyDelivery.start()`、`add_text()`、`finish()` 和 `cancel()`，通过注入的 broadcast/render 回调提供可执行行为测试边界。
- 修改：`ConnectionManager.send_ai_reply_chunk(reply_text, emotion, user_id, chunk_index, reply_id=None, trace=None) -> bool`。
- WebSocket：`audio_stream_start/chunk/end` 均携带 `reply_id`；chunk 使用语音单元索引。

- [ ] **步骤 1：先写真实异步行为失败测试。**

  在 `backend/tests/test_speech_delivery.py` 使用真实 `SpeechStreamCoordinator`、受控 render event 和内存 broadcast 列表，验证：

  - `audio_stream_start`、每个 `audio_stream_chunk` 和 `audio_stream_end` 使用同一 `reply_id`。
  - render 回调被 `asyncio.Event` 阻塞时，`finish()` 不发送 `audio_stream_end`；释放 event 并让全部单元终态后才发送 end。
  - 第二个 reply `start()` 会取消同一用户的旧 reply，旧 reply 的延迟 render 完成后也不会向 broadcast 追加 chunk/end。
  - `cancel()` 后不再发送旧 reply 的 chunk/end。
  - 单个 render 返回 `False` 时仍发送 end，并在 `failed_chunks` 中准确报告失败数量。

  在 `backend/tests/test_main_server_delivery_boundaries.py` 只保留现有可执行边界测试，并新增对公开行为的测试：`ConnectionManager.send_ai_reply_chunk()` 把 `trace` 传给注入的 `generate_audio_file()`，成功返回 `True`、失败返回 `False`；普通聊天与 vision 分别通过同一个 `SpeechReplyDelivery` 构造入口执行。不要读取源码文本或用 AST 锁定内部调用结构。

- [ ] **步骤 2：运行定向测试确认先失败。**

  ```powershell
  & 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend\tests\test_speech_delivery.py backend\tests\test_main_server_delivery_boundaries.py backend\tests\test_speech_stream.py -q
  ```

- [ ] **步骤 3：最小改造 `main_server.py`。**

  在 `speech_delivery.py` 实现 `SpeechReplyDelivery`，构造参数只接收 coordinator、user ID、reply ID、broadcast 回调和 render 回调；`start()` 发送 start，`add_text()` 交给 session，`finish()` 先等待 `session.close()` 再发送 end，`cancel()` 使旧回调失效。普通聊天和 vision 都通过该类，不复制调度逻辑。

  在 `main_server.py` 创建全局协调器：

  ```python
  speech_stream_coordinator = SpeechStreamCoordinator(
      max_parallel_synthesis=1,
  )
  ```

  每轮聊天生成不可猜测且不含用户信息的 `reply_id = uuid.uuid4().hex`，发送：

  ```python
  await ws_manager.broadcast_to_user(
      user_id, {"type": "audio_stream_start", "reply_id": reply_id}
  )
  ```

  定义当前回复的 render 回调，并创建 delivery：

  ```python
  async def render_speech_unit(unit, trace):
      return await ws_manager.send_ai_reply_chunk(
          unit.text,
          unit.emotion,
          user_id,
          unit.index,
          reply_id=reply_id,
          trace=trace,
      )

  speech_delivery = SpeechReplyDelivery(
      coordinator=speech_stream_coordinator,
      user_id=user_id,
      reply_id=reply_id,
      broadcast=ws_manager.broadcast_to_user,
      render_unit=render_speech_unit,
  )
  await speech_delivery.start()
  ```

  `publish_text_chunk()` 继续立即上屏和累计完整正文，但改为 `await speech_delivery.add_text(text_chunk, current_emotion)`，不再直接创建未跟踪的逐句 TTS task。LLM 结束后：

  ```python
  summary = await speech_delivery.finish(full_text=full_reply_text)
  ```

  新文字回复开始时 `begin()` 自动取消旧 reply；显式 interrupt 立即取消。视觉回复复用同一 begin/add/close 流程。`send_ai_reply_chunk()` 只记录 reply/chunk 和阶段耗时，不打印 ticket URL。

- [ ] **步骤 4：运行后端相关回归、更新清单并提交。**

  ```powershell
  & 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend\tests\test_tts_service.py backend\tests\test_speech_units.py backend\tests\test_speech_stream.py backend\tests\test_speech_delivery.py backend\tests\test_main_server_delivery_boundaries.py -q
  git add -- backend/speech_delivery.py backend/main_server.py backend/tests/test_speech_delivery.py backend/tests/test_main_server_delivery_boundaries.py docs/功能清单.md
  git commit -m "feat: deliver speech through ordered sessions"
  ```

### 任务 5：实现前端可预加载、可跳错的有序音频队列

**文件：**

- 新建：`frontend_react/src/audio/audioStreamQueue.js`
- 新建：`frontend_react/src/audio/__tests__/audioStreamQueue.test.js`
- 修改：`docs/功能清单.md`

**接口：**

- 产出：`createAudioStreamQueue({ prepareChunk, playChunk, now, reportMetric })`。
- 产出对象：`start(replyId)`、`enqueue(replyId, chunk)`、`seal(replyId)`、`stop()`、`snapshot()`、`whenIdle()`。
- `prepareChunk(chunk) -> Promise<preparedChunk>`；`playChunk(preparedChunk) -> Promise<void>`。

- [ ] **步骤 1：先写队列状态和顺序失败测试。**

  使用 deferred promise 验证：

  ```js
  it('plays out-of-order arrivals only after each expected index is ready', async () => {
    const played = []
    const queue = createAudioStreamQueue({
      prepareChunk: async chunk => chunk,
      playChunk: async chunk => { played.push(chunk.index) },
      now: () => 100,
      reportMetric: vi.fn(),
    })
    queue.start('reply-1')
    await queue.enqueue('reply-1', { index: 1 })
    await queue.enqueue('reply-1', { index: 0 })
    await queue.whenIdle()
    expect(played).toEqual([0, 1])
  })
  ```

  另测：

  - `enqueue()` 后立即启动 preload，不等待前一单元结束。
  - 当前播放结束而下一索引还在 loading 时开始断粮计时；ready 后报告 `queue_starvation` 毫秒值。
  - prepare 或 play 失败把该索引标记 `failed` 并继续下一索引。
  - `start("reply-2")` 后，reply-1 的延迟 promise 完成也不能播放。
  - 重复 chunk 不重复预加载或播放。
  - `seal()` 不会提前丢弃仍在 loading/playing 的单元。
  - `stop()` 使全部旧回调失效，状态回到空闲。

- [ ] **步骤 2：运行测试确认先失败。**

  ```powershell
  Set-Location D:\ai\Una\.worktrees\p0-tts-latency\frontend_react
  & 'D:\ai\Node\npx.cmd' vitest run src/audio/__tests__/audioStreamQueue.test.js --reporter=dot
  ```

- [ ] **步骤 3：实现独立队列状态机。**

  内部使用 `Map<number, ChunkRecord>`，记录：

  ```js
  {
    status: 'received' | 'loading' | 'ready' | 'playing' | 'done' | 'failed',
    receivedAtMs,
    readyAtMs,
    prepared,
  }
  ```

  `pump()` 只消费 `expectedIndex`。若该索引还未到达或未 ready，保留 starvation 起点；ready 后立即播放并上报等待时间。使用递增 generation 隔离旧 reply 的 prepare/play 回调。日志/metric 参数只包含 `replyId`、`chunkIndex`、`stage`、`durationMs`、`status`，不能包含 chunk URL。

- [ ] **步骤 4：运行测试、更新清单并提交。**

  ```powershell
  & 'D:\ai\Node\npx.cmd' vitest run src/audio/__tests__/audioStreamQueue.test.js --reporter=dot
  git add -- frontend_react/src/audio/audioStreamQueue.js frontend_react/src/audio/__tests__/audioStreamQueue.test.js docs/功能清单.md
  git commit -m "feat: queue prepared speech chunks in order"
  ```

### 任务 6：接入同一音频时钟的精确口型播放器

**文件：**

- 新建：`frontend_react/src/audio/syncedAudioPlayer.js`
- 新建：`frontend_react/src/audio/__tests__/syncedAudioPlayer.test.js`
- 修改：`frontend_react/src/hooks/useUnaCore.js`
- 修改：`frontend_react/src/hooks/__tests__/useUnaCore.test.js`
- 修改：`docs/功能清单.md`

**接口：**

- 产出：`createAudioBufferLoader({ audioContext, fetchImpl })`，同 URL 并发请求复用同一 promise。
- 产出：`startSyncedPlayback({ audioContext, audioBuffer, visemes, onViseme, onEnded, onError, requestFrame, cancelFrame }) -> PlaybackHandle`。
- 消费：任务 5 的 `createAudioStreamQueue()`。
- 保持：hook 对外仍暴露 `playAudio()` 和 `replayChunks()`。

- [ ] **步骤 1：先写同步播放器失败测试。**

  用可控 fake AudioContext 和 RAF 验证：

  ```js
  it('samples Rhubarb from the exact AudioContext start time', () => {
    const context = fakeAudioContext({ currentTime: 10 })
    const onViseme = vi.fn()
    const handle = startSyncedPlayback({
      audioContext: context,
      audioBuffer: {},
      visemes: [{ start: 0.10, end: 0.20, value: 'A' }],
      onViseme,
      onEnded: vi.fn(),
      onError: vi.fn(),
      requestFrame: callback => fakeFrames.push(callback),
      cancelFrame: vi.fn(),
    })
    expect(context.source.start).toHaveBeenCalledWith(handle.startAt)
    context.currentTime = handle.startAt + 0.15
    fakeFrames.shift()()
    expect(onViseme).toHaveBeenLastCalledWith('A')
  })
  ```

  另测：播放开始前不采样正时间、音频结束设置 `X`、stop 设置 `X` 且取消 RAF、同一结束回调只执行一次、无 viseme 时安全保持 `X`。

  在 `useUnaCore.test.js` 增加 WebSocket 集成测试：

  - start/chunk/end 的 `reply_id` 一致时进入队列。
  - 新 reply start 清理旧 reply，旧连接代次的 chunk 不进入新队列。
  - 收到 chunk 后先 prepare，前一段播放时下一段已加载。
  - prepare/play 失败继续下一段，消息气泡仍保留完整文字。
  - interrupt、卸载和重连会停止播放器并复位嘴部。

- [ ] **步骤 2：运行定向前端测试确认先失败。**

  ```powershell
  & 'D:\ai\Node\npx.cmd' vitest run src/audio/__tests__/audioStreamQueue.test.js src/audio/__tests__/syncedAudioPlayer.test.js src/hooks/__tests__/useUnaCore.test.js --reporter=dot
  ```

- [ ] **步骤 3：实现播放器并替换 hook 内部队列。**

  `startSyncedPlayback()` 使用同一计划起点：

  ```js
  const startAt = audioContext.currentTime + 0.01
  source.start(startAt)

  function tick() {
    const elapsed = Math.max(0, audioContext.currentTime - startAt)
    const cue = visemes.find(item => elapsed >= item.start && elapsed <= item.end)
    onViseme(cue?.value ?? 'X')
    frameId = requestFrame(tick)
  }
  ```

  实际实现要避免每帧从头扫描全部 cue：保留当前 cue 索引并单调推进。音频结束、stop 和异常共用一次性 cleanup，停止 source、取消 RAF、调用 `onViseme('X')`。

  `useUnaCore` 中：

  - `audio_stream_start` 调用 `queue.start(reply_id)`。
  - `audio_stream_chunk` 校验 reply ID 和非负整数索引后调用 `queue.enqueue()`。
  - `audio_stream_end` 调用 `queue.seal(reply_id)`，只负责封口和关闭消息追加状态。
  - prepare 使用共享 AudioBuffer loader；play 使用 `startSyncedPlayback()` 并返回在 ended 时 resolve、error 时 reject 的 promise。
  - public `playAudio()` 和 `replayChunks()` 复用同一 loader/player，不再保留第二套嘴型时钟。
  - 所有 preload/play 日志改为安全 metric，不输出完整 URL 或 ticket。

- [ ] **步骤 4：运行前端测试、更新清单并提交。**

  ```powershell
  & 'D:\ai\Node\npx.cmd' vitest run src/audio/__tests__/audioStreamQueue.test.js src/audio/__tests__/syncedAudioPlayer.test.js src/hooks/__tests__/useUnaCore.test.js --reporter=dot
  git add -- frontend_react/src/audio/audioStreamQueue.js frontend_react/src/audio/syncedAudioPlayer.js frontend_react/src/audio/__tests__/audioStreamQueue.test.js frontend_react/src/audio/__tests__/syncedAudioPlayer.test.js frontend_react/src/hooks/useUnaCore.js frontend_react/src/hooks/__tests__/useUnaCore.test.js docs/功能清单.md
  git commit -m "feat: synchronize queued speech and Live2D lips"
  ```

### 任务 7：全量验证、性能人工验收、发布产物与清单收尾

**文件：**

- 修改：`docs/功能清单.md`
- 生成：`frontend_react/dist/**`
- 生成并发布：`backend/static/mobile/**`

- [ ] **步骤 1：运行全部自动化回归和生产构建。**

  ```powershell
  Set-Location D:\ai\Una\.worktrees\p0-tts-latency
  & 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend\tests -q

  Set-Location D:\ai\Una\.worktrees\p0-tts-latency\frontend_react
  & 'D:\ai\Node\npx.cmd' vitest run --reporter=dot
  & 'D:\ai\Node\npm.cmd' run build

  Set-Location D:\ai\Una\.worktrees\p0-tts-latency
  powershell -ExecutionPolicy Bypass -File .\scripts\publish_frontend.ps1
  git -c core.fsmonitor=false diff --check
  ```

  预期：后端 pytest、前端 Vitest、Vite 构建、发布脚本和 diff 检查均以退出码 0 完成。不得手工编辑任何压缩 bundle。

- [ ] **步骤 2：确认 GPT-SoVITS CUDA 环境后执行桌面人工测试。**

  启动 GPT-SoVITS，终端必须出现：

  ```text
  device: cuda
  is_half: true
  torch.cuda.is_available(): true
  ```

  再从本工作树启动 UNA 后端和前端。发送一段能够让 AI 回复至少 4 个语音单元的内容，连续测试 10 轮，核查：

  1. 从第一语音单元封口到可播放的目标耗时不超过 2.5 秒。
  2. 每轮相邻语音单元间隔中位数不超过 150 毫秒、P95 不超过 300 毫秒。
  3. 声音不重叠、不乱序、不重复，句间不再出现约 0.4 秒固定静音。
  4. 嘴型按实际音节变化；中断、播放结束、失败后嘴巴回到闭合。
  5. 日志能分别看到 aggregate、queue、GPT、Rhubarb、转码、投递和前端 starvation 耗时。
  6. 日志中搜索 `ticket=`、`/api/media/`、`Authorization`，语音阶段日志不得命中敏感 URL 或令牌。
  7. 停止 GPT-SoVITS 后再测试一次 Edge TTS 降级，音频仍按序播放，失败单元不会卡住后续队列。

- [ ] **步骤 3：检查发布产物一致性并更新功能清单。**

  核对 `frontend_react/dist/index.html` 与 `backend/static/mobile/index.html` 引用同一哈希资源；对入口 JS/CSS 分别执行 `Get-FileHash -Algorithm SHA256`，前后端对应文件必须一致。

  在 `docs/功能清单.md` 中逐项记录：

  - 已实现并自动验证的请求参数、聚合器、调度器、结束语义、前端队列和同步播放器。
  - 桌面人工性能指标的真实结果，不满足目标时保留为 `[ ]` 并写明实际数字。
  - HBuilderX Android APK 继续保持 `[ ]`，桌面结果不得代替真机验收。

- [ ] **步骤 4：提交构建、发布和验收记录。**

  ```powershell
  git add -- frontend_react/dist backend/static/mobile docs/功能清单.md
  git commit -m "build: publish continuous speech playback"
  ```

## 完成前复核

- [ ] `git status --short` 没有未说明的代码、运行数据、数据库、语音文件或缓存改动。
- [ ] `git log --oneline 1b200a6..HEAD` 中只包含本 P0 的小步提交。
- [ ] 后端全量 pytest、前端全量 Vitest、Vite 构建、发布脚本和 `git diff --check` 均有本轮新鲜的退出码 0 证据。
- [ ] 精确核对设计文档的 16 个章节：请求参数、聚合、串行调度、取消、结束语义、Rhubarb、同一 AudioContext、预加载、失败降级、日志和验收均有对应实现与测试。
- [ ] 使用 `superpowers:requesting-code-review` 完成一次独立实现审查；确认的问题修复后重新运行相关验证。
- [ ] 使用 `superpowers:verification-before-completion` 核验命令输出后，才能报告“P0 已完成”。
- [ ] 未经用户明确要求，不合并到本地 `main`。
