# UNA 本地实时语音通话 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 UNA 中新增一个本地优先、独立于 Live2D 的电话式实时语音入口，支持自动停句、SenseVoice 识别、流式大模型回复、GPT-SoVITS 克隆音色 PCM 播放、用户插话取消以及与文字聊天共享私有历史和记忆。

**Architecture:** 前端通过独立动态入口加载 AudioWorklet、Silero VAD、专用 WebSocket 控制器和 PCM 播放器；后端通过独立 Router、协议解析器、会话状态机和可取消流水线连接常驻 SenseVoice、UNA 大脑、记忆快照和 GPT-SoVITS。文字控制消息使用 JSON，音频使用相邻的“元数据 JSON + 二进制 PCM”帧；`session_id`、`turn_id` 和方向内 `sequence` 共同阻止旧轮次串音。

**Tech Stack:** Python 3.11、FastAPI、asyncio、NumPy、FunASR/SenseVoice、aiohttp、GPT-SoVITS、SQLite、ChromaDB、React 18、Vite 5、Web Audio API、AudioWorklet、`@ricky0123/vad-web@0.0.30`、`onnxruntime-web@1.22.0`、Vitest、pytest。

## Global Constraints

- 第一阶段只验证本机桌面浏览器；不引入 WebRTC、LiveKit、TURN、公网弱网适配、群聊或多人音频。
- UNA 后端、SenseVoice、GPT-SoVITS、SQLite 和 ChromaDB 在本机运行；现有大模型接口可以继续联网调用。
- 实时语音页面不得静态或动态导入 PixiJS、Live2DViewer、`useUnaCore`、动作编译器、Rhubarb 或 Live2D 模型资产。
- 语音页面入口固定为 `/?view=voice`；进入和退出均执行整页导航，保证 Live2D 运行时彻底卸载。
- 沿用现有 Access Token、一次性 WebSocket 票据和用户 ID；新链路不得绕过认证或建立固定本地用户旁路。
- 上行音频固定为 16 kHz、单声道、PCM16 小端序；最短有效语音 250 ms、结束静音 400 ms、前置保留 120 ms、最长发言 30 秒。
- 下行音频为单声道 PCM16；实际采样率由后端 `tts_start` 声明，浏览器不得硬编码。
- GPT-SoVITS 正常路径固定 `streaming_mode=2`、`media_type=raw`，不生成 MP3、不落磁盘、不创建媒体票据、不运行 Rhubarb；实时语音路径不启用 Edge TTS 自动换音色。
- GPT-SoVITS `raw` 响应不携带采样率；在 `config.yaml` 的 `apis.gpt_sovits.output_sample_rate` 集中配置，初始值按当前模型设为 `32000`，人工验收必须确认音高和时长正常。
- VAD 的 ONNX、Worklet、WASM 和 MJS 文件全部本地发布，运行时不得请求 CDN。
- `session_id` 必须由后端为每条已认证连接生成并通过 `call_ready` 下发，客户端不得自选；每个会话只允许一个活动回答轮次，新 `turn_id`、插话、断线和结束通话都必须使旧轮次失效。
- 前端先本地停播再通知后端取消；任何异步回调发送前必须检查当前 `turn_id`。
- 通话与文字聊天共享现有用户资料、历史和向量记忆；深度记忆检索最多阻塞 150 ms，长期固化不阻塞第一声音。
- 不修改 `D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS` 内的代码；本计划只修改 `D:\ai\Una`。
- 保留现有 `/ws/chat`、文字聊天、Live2D、精确嘴型和媒体回放行为，新增测试必须覆盖兼容性。
- 所有任务先写失败测试，再写最小实现；每个任务完成后更新 `docs/功能清单.md` 对应条目并单独提交。
- 不删除或提交真实数据库、Chroma、生成音频、缓存、截图及其他既有运行时脏文件。

---

## 文件结构

### 后端新增文件

- `backend/voice_call_protocol.py`：协议常量、客户端控制消息校验、PCM 元数据和值域限制。
- `backend/voice_call_session.py`：单活动轮次、任务注册、取消、旧轮次判断和原子发送器。
- `backend/voice_call_memory.py`：`CallMemorySnapshot`、150 ms 记忆加载和异步固化。
- `backend/voice_call_tts.py`：GPT-SoVITS raw PCM 客户端、偶数字节对齐、取消和格式信息。
- `backend/voice_call_units.py`：首单元 8–40 字/120 ms 与后续 40–80 字的通话专用封口器。
- `backend/voice_call_service.py`：ASR → 记忆 → LLM → TTS 的单轮可取消编排。
- `backend/voice_call_api.py`：`/ws/voice-call` Router 工厂和连接生命周期。
- `backend/voice_call_metrics.py`：白名单化阶段指标，不记录令牌、票据、全文或音频。
- `backend/tests/test_voice_call_protocol.py`
- `backend/tests/test_voice_call_session.py`
- `backend/tests/test_voice_call_asr.py`
- `backend/tests/test_voice_call_memory.py`
- `backend/tests/test_voice_call_brain.py`
- `backend/tests/test_voice_call_tts.py`
- `backend/tests/test_voice_call_units.py`
- `backend/tests/test_voice_call_service.py`
- `backend/tests/test_voice_call_api.py`
- `backend/tests/test_voice_call_metrics.py`

### 后端修改文件

- `backend/asr_engine.py`：增加直接识别 PCM16 的入口，保留文件识别兼容路径。
- `backend/brain_engine.py`：增加不生成 Live2D 控制行的语音通话流式入口。
- `backend/tts_service.py`：让 GPT-SoVITS 公共 payload 构造器支持显式媒体类型和流模式。
- `backend/main_server.py`：只创建实时语音依赖并 include 新 Router。
- `config.yaml`：增加 `output_sample_rate: 32000`。

### 前端新增文件

- `frontend_react/scripts/sync-vad-assets.mjs`：从锁定依赖复制 VAD/ONNX Runtime 资源。
- `frontend_react/public/voice/pcm-capture.worklet.js`：重采样、前置环形缓冲所需的持续 PCM 帧。
- `frontend_react/src/voice-call/protocol.js`：客户端事件构造、服务端事件校验和协议常量。
- `frontend_react/src/voice-call/pcm.js`：Float32/PCM16 转换和安全拼接。
- `frontend_react/src/voice-call/voiceCapture.js`：共享麦克风流、AudioWorklet 与 `MicVAD` 生命周期。
- `frontend_react/src/voice-call/pcmStreamPlayer.js`：120 ms 预缓冲、严格序号调度和立即停止。
- `frontend_react/src/voice-call/voiceCallSocket.js`：票据连接、JSON/二进制配对和断线处理。
- `frontend_react/src/voice-call/voiceCallController.js`：通话状态机、轮次、插话和资源回收。
- `frontend_react/src/voice-call/useVoiceCall.js`：React 状态适配层。
- `frontend_react/src/pages/VoiceCallPage.jsx`：纯语音通话 UI。
- `frontend_react/src/pages/MainUnaPage.jsx`：从现有 `App.jsx` 移出的 Live2D 主应用。
- `frontend_react/src/components/LoginView.jsx`：主应用与语音入口共享的登录表单。
- 与上述模块同目录的 `__tests__/*.test.js(x)`。

### 前端修改文件

- `frontend_react/src/App.jsx`：只保留认证壳和基于 `?view=voice` 的动态导入。
- `frontend_react/src/auth/session.js`：允许票据错误携带连接用途，不改变后端票据格式。
- `frontend_react/src/__tests__/App.test.jsx`：验证动态入口与认证。
- `frontend_react/src/index.css`：增加语音页所需的少量移动端安全区样式。
- `frontend_react/package.json`、`frontend_react/package-lock.json`：锁定 VAD 依赖和资源同步脚本。
- `.gitignore`：忽略 `frontend_react/public/vad/` 生成目录。

### 文档与发布

- `docs/功能清单.md`：每个任务完成时更新状态。
- `README.md`：增加本地实时语音启动顺序和人工测试命令。
- `backend/static/mobile/**`：最终构建发布产物，仅在全量验收任务中同步。

---

### Task 1: 固定跨端协议和值域

**Files:**
- Create: `backend/voice_call_protocol.py`
- Create: `backend/tests/test_voice_call_protocol.py`
- Create: `frontend_react/src/voice-call/protocol.js`
- Create: `frontend_react/src/voice-call/__tests__/protocol.test.js`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Produces: `PcmFormat(sample_rate: int, channels: int, sample_width: int)`。
- Produces: `BinaryFrameHeader(session_id: str, direction: Literal["input", "output"], turn_id: int, sequence: int, byte_length: int)`。
- Produces: `parse_client_event(raw: str) -> dict[str, object]`。
- Produces: JS `makeClientEvent(type, fields)`、`parseServerEvent(raw)`、`validateBinaryHeader(value)`。
- Constants: `INPUT_SAMPLE_RATE=16000`、`MAX_INPUT_BYTES=960000`、`MAX_PCM_CHUNK_BYTES=65536`、`MAX_SEQUENCE=4095`。

- [ ] **Step 1: 写后端失败测试，覆盖合法事件、未知字段和值域**

```python
def test_binary_header_rejects_odd_or_oversized_pcm():
    with pytest.raises(ProtocolError, match="偶数字节"):
        BinaryFrameHeader(session_id="s1", direction="input", turn_id=1, sequence=0, byte_length=3)
    with pytest.raises(ProtocolError, match="65536"):
        BinaryFrameHeader(session_id="s1", direction="input", turn_id=1, sequence=0, byte_length=65538)


def test_speech_start_requires_positive_monotonic_turn_id():
    event = parse_client_event('{"type":"user_speech_start","session_id":"s1","turn_id":7}')
    assert event == {"type": "user_speech_start", "session_id": "s1", "turn_id": 7}
    with pytest.raises(ProtocolError, match="turn_id"):
        parse_client_event('{"type":"user_speech_start","session_id":"s1","turn_id":0}')
```

- [ ] **Step 2: 运行后端测试并确认失败**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_protocol.py -q`

Expected: FAIL，提示 `voice_call_protocol` 不存在。

- [ ] **Step 3: 实现后端协议对象和严格解析**

```python
@dataclass(frozen=True)
class BinaryFrameHeader:
    session_id: str
    direction: Literal["input", "output"]
    turn_id: int
    sequence: int
    byte_length: int

    def __post_init__(self) -> None:
        if not self.session_id.strip():
            raise ProtocolError("session_id 不能为空")
        if self.turn_id <= 0:
            raise ProtocolError("turn_id 必须为正整数")
        if not 0 <= self.sequence <= MAX_SEQUENCE:
            raise ProtocolError("sequence 超出范围")
        if self.byte_length <= 0 or self.byte_length > MAX_PCM_CHUNK_BYTES:
            raise ProtocolError(f"byte_length 必须在 1..{MAX_PCM_CHUNK_BYTES}")
        if self.byte_length % 2:
            raise ProtocolError("PCM16 必须为偶数字节")
```

`parse_client_event` 只接受 `call_start`、`user_speech_start`、`input_audio_chunk`、`user_speech_end`、`interrupt`、`call_end` 和 `pong`。`call_start` 不携带 `session_id`；其余会话事件必须带非空 session_id。解析器对缺失字段、非法 `turn_id`、非法 `sequence` 和超过 64 KiB 的帧头抛出 `ProtocolError`；当前 session_id 是否匹配、sequence 是否恰好递增由 Task 7 的会话服务结合状态检查。控制消息最大 8 KiB。

- [ ] **Step 4: 写前端失败测试并实现同一组约束**

```javascript
it('拒绝旧轮次和奇数字节 PCM 头', () => {
  expect(() => validateBinaryHeader({
    session_id: 's1', direction: 'output', turn_id: 0, sequence: 1, byte_length: 320,
  })).toThrow(/turn_id/);
  expect(() => validateBinaryHeader({
    session_id: 's1', direction: 'output', turn_id: 1, sequence: 1, byte_length: 319,
  })).toThrow(/偶数字节/);
});
```

Run: `& "D:\ai\Node\npx.cmd" vitest run src/voice-call/__tests__/protocol.test.js`

Expected before implementation: FAIL；after implementation: PASS。

- [ ] **Step 5: 运行两端定向测试、更新功能清单并提交**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_protocol.py -q`

Run: `& "D:\ai\Node\npx.cmd" vitest run src/voice-call/__tests__/protocol.test.js`，workdir `frontend_react`。

```powershell
git add -- backend/voice_call_protocol.py backend/tests/test_voice_call_protocol.py frontend_react/src/voice-call/protocol.js frontend_react/src/voice-call/__tests__/protocol.test.js docs/功能清单.md
git commit -m "feat: define realtime voice protocol"
```

### Task 2: 实现单活动轮次和原子发送

**Files:**
- Create: `backend/voice_call_session.py`
- Create: `backend/tests/test_voice_call_session.py`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Consumes: Task 1 `BinaryFrameHeader`。
- Produces: `TurnHandle(turn_id: int, cancel_event: asyncio.Event)`。
- Produces: `VoiceCallSession(user_id, session_id, sender)`，并提供 `start_turn(turn_id) -> TurnHandle`、`track(task)`、`cancel_turn(turn_id, reason) -> bool`、`is_current(turn_id) -> bool`、`close()`。
- Produces: `VoiceCallSender.send_json(payload)`、`send_pcm(header, payload)`；元数据和 bytes 在同一锁内相邻发送。

- [ ] **Step 1: 写取消和旧回调隔离失败测试**

```python
@pytest.mark.asyncio
async def test_new_turn_cancels_old_tasks_and_rejects_late_callbacks():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())
    old = await session.start_turn(1)
    blocker = asyncio.create_task(asyncio.Event().wait())
    session.track(blocker)
    new = await session.start_turn(2)
    await asyncio.sleep(0)
    assert old.cancel_event.is_set()
    assert blocker.cancelled()
    assert session.is_current(1) is False
    assert session.is_current(new.turn_id) is True
```

另写测试证明：重复/倒退 `turn_id` 被拒绝；关闭会话等待任务终态；取消不存在的旧轮次不会取消当前轮次；`send_pcm` 的 JSON 与 bytes 在两个并发发送者之间不会交错。

- [ ] **Step 2: 运行测试确认失败**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_session.py -q`

Expected: FAIL，提示模块不存在。

- [ ] **Step 3: 实现锁外取消，避免在状态锁中等待任务**

```python
async def start_turn(self, turn_id: int) -> TurnHandle:
    async with self._lock:
        if turn_id <= self._last_turn_id:
            raise ProtocolError("turn_id 必须严格递增")
        old_tasks = tuple(self._tasks)
        old_handle = self._current
        self._tasks.clear()
        self._last_turn_id = turn_id
        new_handle = TurnHandle(turn_id, asyncio.Event())
        self._current = new_handle
    if old_handle is not None:
        old_handle.cancel_event.set()
    for task in old_tasks:
        task.cancel()
    await asyncio.gather(*old_tasks, return_exceptions=True)
    return new_handle
```

`VoiceCallSender.send_pcm` 先核对 `len(payload) == header.byte_length`，再在 `_send_lock` 内依次 `send_json` 和 `send_bytes`。任何发送异常原样抛出，让 API 层统一关闭连接。

- [ ] **Step 4: 运行测试、更新功能清单并提交**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_session.py -q`

Expected: PASS。

```powershell
git add -- backend/voice_call_session.py backend/tests/test_voice_call_session.py docs/功能清单.md
git commit -m "feat: isolate realtime voice turns"
```

### Task 3: 让 SenseVoice 直接识别 PCM16

**Files:**
- Modify: `backend/asr_engine.py`
- Create: `backend/tests/test_voice_call_asr.py`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Produces: `SenseVoiceASR.recognize_pcm16(pcm: bytes, sample_rate: int = 16000) -> tuple[str, str]`。
- 保留: `SenseVoiceASR.recognize(audio_file_path)` 行为不变。

- [ ] **Step 1: 写失败测试，证明 PCM 不落盘、不启动 FFmpeg**

```python
def test_recognize_pcm16_passes_normalized_float_array_to_model(monkeypatch):
    engine = SenseVoiceASR.__new__(SenseVoiceASR)
    engine.model = FakeModel([{"text": "<|zh|><|HAPPY|><|speech|>你好"}])
    engine._inference_lock = threading.Lock()
    pcm = np.array([-32768, 0, 32767], dtype="<i2").tobytes()
    text, emotion = engine.recognize_pcm16(pcm)
    received = engine.model.inputs[0]
    assert received.dtype == np.float32
    assert received.tolist() == pytest.approx([-1.0, 0.0, 32767 / 32768])
    assert (text, emotion) == ("你好", "happy")
```

同时覆盖奇数字节、空音频、非 16 kHz、超过 960000 字节和模型未加载，确保均返回明确异常或空识别，不触碰文件系统。

- [ ] **Step 2: 运行测试确认失败**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_asr.py -q`

Expected: FAIL，提示 `recognize_pcm16` 不存在。

- [ ] **Step 3: 提取结果清洗并实现 PCM 入口**

```python
def recognize_pcm16(self, pcm: bytes, sample_rate: int = 16000):
    if sample_rate != 16000:
        raise ValueError("实时语音只接受 16 kHz PCM")
    if not self.model:
        return "", "neutral"
    if not pcm:
        return "", "neutral"
    if len(pcm) % 2 or len(pcm) > 960000:
        raise ValueError("PCM16 字节长度非法")
    waveform = np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768.0
    with self._inference_lock:
        result = self.model.generate(
            input=waveform, cache={}, language="auto", use_itn=True,
            batch_size_s=60, merge_vad=True, merge_length_s=15,
        )
    return self._parse_result(result)
```

在 `__init__` 创建 `threading.Lock()`；把现有标签和情感清洗移入 `_parse_result`，让文件入口与 PCM 入口共用同一规则。

- [ ] **Step 4: 运行新旧 ASR 相关测试、更新清单并提交**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_asr.py -q`

Expected: PASS。

```powershell
git add -- backend/asr_engine.py backend/tests/test_voice_call_asr.py docs/功能清单.md
git commit -m "feat: recognize realtime pcm without ffmpeg"
```

### Task 4: 建立有时间预算的通话记忆快照

**Files:**
- Create: `backend/voice_call_memory.py`
- Create: `backend/tests/test_voice_call_memory.py`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Produces: `CallMemorySnapshot(user_id, profile, recent_history, long_term_memory)`。
- Produces: `VoiceCallMemory.load(user_id) -> CallMemorySnapshot`。
- Produces: `VoiceCallMemory.append_user(snapshot, user_text) -> CallMemorySnapshot` 与 `append_ai(snapshot, ai_text) -> CallMemorySnapshot`。
- Produces: `VoiceCallMemory.persist_user_text(snapshot, user_text) -> None`，最终识别完成后立即写入用户历史。
- Produces: `VoiceCallMemory.persist_ai_completion(snapshot, user_text, ai_text, emotion, mood_score) -> None`，只写完整 AI 回复并异步固化完整对话对。

- [ ] **Step 1: 写失败测试，覆盖 150 ms 超时、用户隔离和统一落库**

```python
@pytest.mark.asyncio
async def test_slow_vector_recall_does_not_block_snapshot():
    storage = FakeDatabase(profile="喜欢猫", history=[{"role": "user", "content": "早安"}])
    memory = BlockingMemoryService()
    service = VoiceCallMemory(storage, memory, recall_timeout_ms=10)
    snapshot = await service.load("u1")
    assert snapshot.user_id == "u1"
    assert snapshot.profile == "喜欢猫"
    assert snapshot.long_term_memory == ""
    assert memory.queries == [("u1", "早安")]
```

另写测试确认最近历史最多 20 条；查询和写入始终携带同一个 `user_id`；最终 ASR 文本立即写入一条 user 历史；被取消的空 AI 回复不写 ai 历史且不调用 `remember`；完整 AI 回复写入 SQLite 后再异步写 Chroma。

- [ ] **Step 2: 运行测试确认失败**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_memory.py -q`

Expected: FAIL，提示模块不存在。

- [ ] **Step 3: 实现不可变快照和限时 recall**

```python
async def load(self, user_id: str) -> CallMemorySnapshot:
    profile, history = await asyncio.gather(
        asyncio.to_thread(self.database.get_user_profile, user_id),
        asyncio.to_thread(self.database.get_recent_history, user_id, 20),
    )
    query = "\n".join(item.get("content", "") for item in history[-4:]).strip() or "日常陪伴"
    try:
        long_term = await asyncio.wait_for(
            asyncio.to_thread(self.memory_service.recall, user_id, query),
            timeout=self.recall_timeout_ms / 1000,
        )
    except asyncio.TimeoutError:
        long_term = ""
    return CallMemorySnapshot(user_id, profile or "", tuple(history), long_term or "")
```

`persist_user_text` 用 `asyncio.to_thread(database.add_message, user_id, "user", user_text, 0, None)` 立即保存最终转写。`persist_ai_completion` 写入 ai 历史；只有 `ai_text.strip()` 非空时才安排 `memory_service.remember`。由会话持有该后台任务，关闭时给 2 秒完成窗口，超时后取消。

- [ ] **Step 4: 运行测试、更新清单并提交**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_memory.py -q`

Expected: PASS。

```powershell
git add -- backend/voice_call_memory.py backend/tests/test_voice_call_memory.py docs/功能清单.md
git commit -m "feat: add bounded voice memory snapshot"
```

### Task 5: 增加纯语音大模型流，不生成 Live2D 控制块

**Files:**
- Modify: `backend/brain_engine.py`
- Create: `backend/tests/test_voice_call_brain.py`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Consumes: Task 4 `CallMemorySnapshot` 字段。
- Produces: `UnaBrain.chat_voice_stream(user_id, user_text, *, profile, recent_history, long_term_memory, recent_negative_count=0)`。
- Emits: `{"type":"meta","emotion":str,"mood_score":int}` 与 `{"type":"sentence","text":str}`；永不产生动作事件。

- [ ] **Step 1: 写失败测试，验证提示词和输出净化**

```python
@pytest.mark.asyncio
async def test_voice_stream_uses_plain_text_prompt_and_drops_control_lines(fake_brain):
    fake_brain.client.stream_text = (
        'EMOTION: happy | MOOD: 2\nACTION: {"tracks":[]}\n你好呀！我们慢慢聊。'
    )
    events = [event async for event in fake_brain.chat_voice_stream(
        "u1", "你好", profile="喜欢猫", recent_history=(), long_term_memory="",
    )]
    body = "".join(event["text"] for event in events if event["type"] == "sentence")
    prompt = fake_brain.client.last_messages[0]["content"]
    assert "只输出自然语言正文" in prompt
    assert "ACTION:" not in body
    assert "EMOTION:" not in body
    assert body == "你好呀！我们慢慢聊。"
```

再覆盖危机关键词、网络异常固定回复、第一强标点快速封口、无标点尾句和现有 `chat_stream` 仍生成 Live2D 控制提示。

- [ ] **Step 2: 运行测试确认失败**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_brain.py backend/tests/test_brain_engine.py backend/tests/test_brain_action_stream.py -q`

Expected: 新测试 FAIL，既有测试 PASS。

- [ ] **Step 3: 实现独立纯正文提示和共用句界切分**

```python
voice_prompt = (
    "你叫 Una，一个温暖、专业、有边界感的心理支持 AI。\n"
    f"【用户画像】：{profile}\n【长期记忆】：{long_term_memory}\n"
    f"【近期对话】：{history_text}\n"
    "只输出适合直接朗读的自然语言正文。禁止输出 ACTION、EMOTION、JSON、Markdown、舞台说明和动作参数。"
    "第一句尽量在 8 至 24 个汉字内自然结束，完整回复约 80 至 150 字。"
)
```

将现有标点缓冲提取为类内 `_yield_sentence_text(response, strip_controls: bool)`；现有 `chat_stream(user_id, user_text, long_term_memory="", recent_negative_count=0, live2d_model=None)` 调用该 helper 时传 `strip_controls=False`，新 `chat_voice_stream(user_id, user_text, *, profile: str, recent_history: Sequence[Mapping[str, str]], long_term_memory: str, recent_negative_count: int = 0)` 调用时传 `strip_controls=True`。后者丢弃所有控制行后再调用 `sanitize_reply_text`，且不得再次访问数据库，全部上下文从快照参数传入。

- [ ] **Step 4: 运行脑引擎回归、更新清单并提交**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_brain.py backend/tests/test_brain_engine.py backend/tests/test_brain_action_stream.py backend/tests/test_brain_prompt_contract.py -q`

Expected: PASS。

```powershell
git add -- backend/brain_engine.py backend/tests/test_voice_call_brain.py docs/功能清单.md
git commit -m "feat: stream plain replies for voice calls"
```

### Task 6: 实现 GPT-SoVITS raw PCM 流客户端

**Files:**
- Modify: `backend/tts_service.py`
- Create: `backend/voice_call_tts.py`
- Create: `backend/tests/test_voice_call_tts.py`
- Modify: `backend/tests/test_tts_service.py`
- Modify: `config.yaml`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Produces: `build_gsv_payload(text, emotion, *, media_type="wav", streaming_mode=False)`，默认行为与旧调用一致。
- Consumes: Task 1 `PcmFormat`，实例值为 `sample_rate=配置值, channels=1, sample_width=2`。
- Produces: `GptSovitsPcmClient.stream(text, emotion, cancel_event) -> AsyncIterator[bytes]`。

- [ ] **Step 1: 扩展 payload 测试，先保持旧默认不变**

```python
def test_realtime_payload_requests_raw_mode_two_without_changing_default():
    normal = build_gsv_payload("你好")
    realtime = build_gsv_payload("你好", media_type="raw", streaming_mode=2)
    assert (normal["media_type"], normal["streaming_mode"]) == ("wav", False)
    assert (realtime["media_type"], realtime["streaming_mode"]) == ("raw", 2)
    assert realtime["text_split_method"] == "cut0"
    assert realtime["fragment_interval"] == pytest.approx(0.05)
```

- [ ] **Step 2: 写流式失败测试，覆盖奇数字节拼接、取消和错误响应**

```python
@pytest.mark.asyncio
async def test_pcm_stream_reassembles_even_samples_without_disk_write(fake_http):
    fake_http.chunks = [b"\x01", b"\x02\x03", b"\x04"]
    client = GptSovitsPcmClient(fake_http.session_factory, sample_rate=32000)
    chunks = [chunk async for chunk in client.stream("你好", "neutral", asyncio.Event())]
    assert b"".join(chunks) == b"\x01\x02\x03\x04"
    assert all(len(chunk) % 2 == 0 for chunk in chunks)
    assert fake_http.payload["media_type"] == "raw"
    assert fake_http.payload["streaming_mode"] == 2
    assert fake_http.files_written == []
```

另写测试：HTTP 非 200 抛 `GptSovitsUnavailable`；取消事件后关闭 response 且不再 yield；末尾单字节抛格式错误；配置采样率不在 8000..96000 时拒绝启动；实时路径不调用 `_fallback_edge`。

- [ ] **Step 3: 运行测试确认失败**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_tts.py backend/tests/test_tts_service.py -q`

Expected: 新测试 FAIL，旧测试保持 PASS。

- [ ] **Step 4: 实现可取消 raw 流和偶数字节边界**

```python
carry = b""
iterator = response.content.iter_chunked(16384).__aiter__()
while True:
    next_chunk = asyncio.create_task(anext(iterator))
    cancelled = asyncio.create_task(cancel_event.wait())
    done, _ = await asyncio.wait(
        {next_chunk, cancelled}, return_when=asyncio.FIRST_COMPLETED,
    )
    if cancelled in done and cancelled.result():
        next_chunk.cancel()
        await asyncio.gather(next_chunk, return_exceptions=True)
        response.close()
        raise asyncio.CancelledError
    cancelled.cancel()
    await asyncio.gather(cancelled, return_exceptions=True)
    try:
        incoming = next_chunk.result()
    except StopAsyncIteration:
        break
    combined = carry + incoming
    even_length = len(combined) - (len(combined) % 2)
    if even_length:
        yield combined[:even_length]
    carry = combined[even_length:]
if carry:
    raise PcmStreamFormatError("GPT-SoVITS 返回了不完整 PCM16 采样")
```

客户端复用一个 `aiohttp.ClientSession`，连接超时 3 秒、总合成超时 120 秒，并使用共享 `asyncio.Semaphore(1)` 避免本地 GPU 同时推理。`GptSovitsPcmClient.close()` 必须关闭共享 session，供应用 lifespan 调用。`config.yaml` 增加：

```yaml
  gpt_sovits:
    output_sample_rate: 32000
```

- [ ] **Step 5: 运行定向测试、更新清单并提交**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_tts.py backend/tests/test_tts_service.py -q`

Expected: PASS。

```powershell
git add -- backend/tts_service.py backend/voice_call_tts.py backend/tests/test_voice_call_tts.py backend/tests/test_tts_service.py config.yaml docs/功能清单.md
git commit -m "feat: stream cloned voice as raw pcm"
```

### Task 7: 编排单轮 ASR、LLM、TTS 和记忆

**Files:**
- Create: `backend/voice_call_units.py`
- Create: `backend/voice_call_service.py`
- Create: `backend/tests/test_voice_call_units.py`
- Create: `backend/tests/test_voice_call_service.py`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Consumes: Tasks 1–6 的协议、会话、ASR、记忆、脑引擎和 PCM 客户端。
- Produces: `VoiceSpeechUnitPlanner.add_sentence(text, emotion, now_ms) -> list[SpeechUnit]`、`flush_due(now_ms)`、`close(now_ms)`。
- Produces: `VoiceCallService.open_session(user_id, sender) -> VoiceCallSession`。
- Produces: `handle_speech_start(session, turn_id)`、`handle_audio(session, header, pcm)`、`handle_speech_end(session, turn_id)`、`interrupt(session, turn_id)`。

- [ ] **Step 1: 写端到端内存假对象失败测试**

```python
@pytest.mark.asyncio
async def test_completed_turn_emits_ordered_transcript_text_and_pcm():
    sender = RecordingSender()
    service = make_service(
        asr_result=("今天有点累", "sad"),
        brain_events=[
            {"type": "meta", "emotion": "gentle", "mood_score": -1},
            {"type": "sentence", "text": "那就先靠一会儿。"},
            {"type": "sentence", "text": "我在这里陪你。"},
        ],
        tts_chunks=[b"\x00\x01", b"\x02\x03"],
    )
    session = await service.open_session("u1", sender)
    await service.handle_speech_start(session, 1)
    await service.handle_audio(
        session, input_header(session.session_id, turn_id=1, sequence=0, byte_length=4),
        b"\x00\x00\x00\x00",
    )
    await service.handle_speech_end(session, 1)
    await session.wait_until_idle()
    event_types = sender.types()
    assert event_types.index("transcript_final") < event_types.index("assistant_text_delta")
    assert event_types.index("tts_start") < event_types.index("output_audio_chunk")
    assert event_types.index("output_audio_chunk") < event_types.index("tts_end")
    assert sender.audio_sequences() == [0, 1]
    assert service.memory.saved_users == [("u1", "今天有点累")]
    assert service.memory.saved_ai == [("u1", "那就先靠一会儿。我在这里陪你。")]
```

再覆盖：输入总量超过 960000 字节；缺序号；ASR 空结果；LLM 失败；GSV 失败；插话取消；旧 TTS 字节迟到；连接关闭；同用户两个通话会话互不复用 `session_id`。

为 `VoiceSpeechUnitPlanner` 单独写表驱动测试：3 字首句不会立即输出；补入下一句后达到 8 字立即输出；120 ms 到期会排空短首句；40 字首单元和 80 字后续单元均在安全标点或硬边界切分；`close` 不丢尾句；单元 index 从 0 连续递增。

```python
def test_short_first_sentence_waits_for_more_text_or_120_ms():
    planner = VoiceSpeechUnitPlanner(first_min_chars=8, first_wait_ms=120)
    assert planner.add_sentence("哎呀！", "happy", now_ms=0) == []
    assert planner.flush_due(now_ms=119) == []
    units = planner.flush_due(now_ms=120)
    assert [(unit.index, unit.text) for unit in units] == [(0, "哎呀！")]


def test_next_sentence_completes_short_first_unit_without_waiting():
    planner = VoiceSpeechUnitPlanner(first_min_chars=8, first_wait_ms=120)
    planner.add_sentence("嗯。", "gentle", now_ms=0)
    units = planner.add_sentence("我在这里陪你。", "gentle", now_ms=20)
    assert [(unit.index, unit.text) for unit in units] == [(0, "嗯。我在这里陪你。")]
```

- [ ] **Step 2: 运行测试确认失败**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_units.py backend/tests/test_voice_call_service.py -q`

Expected: FAIL，提示模块不存在。

- [ ] **Step 3: 实现输入缓冲和一次性最终识别**

`open_session` 使用 `uuid.uuid4().hex` 生成后端 session_id，不接受客户端传入值。`handle_audio` 必须检查当前轮次、`direction == "input"`、序号恰好等于 `next_input_sequence`、声明长度等于 bytes 长度，以及累计上限；`handle_speech_end` 将缓冲冻结后立即启动被 session 跟踪的 `_run_turn` 任务。

```python
text, detected_emotion = await asyncio.to_thread(
    self.asr.recognize_pcm16, frozen_pcm, INPUT_SAMPLE_RATE,
)
if not session.is_current(turn_id):
    return
if not text.strip():
    await sender.send_json(call_error(turn_id, "ASR_EMPTY", "没有听清，请再说一次"))
    return
await sender.send_json(transcript_final(turn_id, text, detected_emotion))
snapshot = self.memory.append_user(snapshot, text)
await self.memory.persist_user_text(snapshot, text)
```

- [ ] **Step 4: 实现面向播放储备的语音单元调度**

首个可朗读单元满足以下确定规则：累计达到 8 个汉字且遇到强标点立即封口；若第一句少于 8 字，则最多等待下一句或 120 ms；硬上限 40 字。后续单元目标 40–60 字、硬上限 80 字、结束时立即排空。

LLM 生产者持续读取 token、发送 `assistant_text_delta` 并把封口单元写入 `asyncio.Queue`；独立 TTS 消费者按单元索引顺序读取队列。两者运行在被 session 跟踪的 `_run_turn` 内部 `asyncio.TaskGroup` 中，任一失败时 TaskGroup 自动取消另一方。每个单元的 GSV 流结束后，消费者立刻启动下一单元，不等待前端播放完成，使前端能在播放第一单元时积累后续 PCM。

当 planner 留有不足 8 字的首句时，生产者创建唯一的 120 ms `flush_due` 任务；新句到达时先取消并等待旧 timer 终态，再重新判断是否需要 timer。LLM 结束时取消 timer、调用 `close`、把剩余单元入队，最后放入一个 `None` 作为 TTS 消费结束哨兵。

```python
speech_queue: asyncio.Queue[SpeechUnit | None] = asyncio.Queue()
async with asyncio.TaskGroup() as group:
    producer = group.create_task(
        self._produce_reply(session, turn_id, snapshot, speech_queue)
    )
    group.create_task(self._stream_speech(session, turn_id, speech_queue))
full_reply, emotion, mood_score = producer.result()
```

每轮只发送一次 `tts_start`；所有输出 PCM 使用轮次内连续 `sequence`。`assistant_text_end` 在 LLM 正文结束后发送，`tts_end` 仅在全部 GSV 单元结束或进入失败终态后发送。

- [ ] **Step 5: 实现插话屏障和完成轮次落库**

```python
async def interrupt(self, session, turn_id: int) -> None:
    cancelled = await session.cancel_turn(turn_id, "barge_in")
    if cancelled:
        await session.sender.send_json({
            "type": "turn_cancelled", "session_id": session.session_id,
            "turn_id": turn_id, "reason": "barge_in",
        })
```

最终转写发送后立即调用 `persist_user_text`，因此用户插话时已说完的问题仍保留在历史中。只有 LLM 正常结束且当前轮次仍有效时才调用 `persist_ai_completion`；取消轮次不保存不完整 AI 文本，也不把它写入长期事实。

- [ ] **Step 6: 运行测试、更新清单并提交**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_units.py backend/tests/test_voice_call_service.py -q`

Expected: PASS。

```powershell
git add -- backend/voice_call_units.py backend/voice_call_service.py backend/tests/test_voice_call_units.py backend/tests/test_voice_call_service.py docs/功能清单.md
git commit -m "feat: orchestrate realtime voice turns"
```

### Task 8: 暴露独立认证 WebSocket Router

**Files:**
- Create: `backend/voice_call_api.py`
- Create: `backend/tests/test_voice_call_api.py`
- Modify: `backend/main_server.py`
- Modify: `backend/tests/test_main_server_delivery_boundaries.py`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Produces: `create_voice_call_router(auth_service, voice_call_service) -> APIRouter`。
- Route: `/ws/voice-call?ticket=<一次性票据>`。
- `main_server.py` 只负责构造 `GptSovitsPcmClient`、`VoiceCallMemory`、`VoiceCallService` 并 include Router。

- [ ] **Step 1: 写 Router 失败测试**

```python
def test_ticket_is_consumed_once_and_pcm_pair_is_forwarded():
    app = FastAPI()
    runtime = FakeVoiceCallService()
    app.include_router(create_voice_call_router(FakeAuth({"once": "u1"}), runtime))
    with TestClient(app) as client:
        with client.websocket_connect("/ws/voice-call?ticket=once") as ws:
            ws.send_json({"type": "call_start"})
            ready = ws.receive_json()
            assert ready["type"] == "call_ready"
            assert ready["session_id"] == runtime.sessions[0].session_id
            ws.send_json(input_audio_header(
                session_id=ready["session_id"], turn_id=1, sequence=0, byte_length=4,
            ))
            ws.send_bytes(b"\x00\x00\x00\x00")
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("/ws/voice-call?ticket=once"):
                pass
```

另写测试覆盖：无效票据关闭码 1008；JSON 后未收到 bytes；bytes 无元数据；长度不匹配；`call_end` 返回 `call_ended`；断开时 session.close；应用 lifespan 关闭 `VoiceCallService` 和 GPT-SoVITS HTTP session；`main_server.py` 不把通话 socket 加入现有 `ws_manager`，因此不会触发欢迎语或 Live2D 广播。

- [ ] **Step 2: 运行测试确认失败**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_api.py backend/tests/test_main_server_delivery_boundaries.py -q`

Expected: 新测试 FAIL，既有边界测试 PASS。

- [ ] **Step 3: 实现 Router 工厂和严格接收循环**

接收循环维护一个 `pending_binary_header`。收到 `input_audio_chunk` 时若已有未消费 header 则协议错误；下一条必须为 bytes。收到其他 JSON 前若仍有 header，当前轮次报错并关闭 1003。服务端在认证后生成不可预测的 `session_id`；收到无 session_id 的 `call_start` 后通过 `call_ready` 下发。此后才接受发言事件，并拒绝 session_id 不匹配的消息；`call_end` 先关闭会话资源，再返回 `call_ended`。

```python
user_id = auth_service.consume_ws_ticket(ticket)
if not user_id:
    await websocket.close(code=1008)
    return
await websocket.accept()
sender = VoiceCallSender(websocket.send_json, websocket.send_bytes)
session = await voice_call_service.open_session(user_id, sender)
```

在 `main_server.py` 的核心引擎初始化后 include：

```python
voice_call_service = VoiceCallService(
    asr=asr,
    brain=brain,
    memory=VoiceCallMemory(database, memory_service, recall_timeout_ms=150),
    tts=GptSovitsPcmClient.from_config(config),
)
app.include_router(create_voice_call_router(auth_service, voice_call_service))
```

在现有 `lifespan` 的 `finally` 分支调用 `await voice_call_service.close()`；该方法先关闭全部通话 session，再关闭 `GptSovitsPcmClient`。不得注册第二个相互覆盖的 FastAPI lifespan。

- [ ] **Step 4: 运行路由及认证回归、更新清单并提交**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_api.py backend/tests/test_auth_api.py backend/tests/test_auth_service.py backend/tests/test_main_server_delivery_boundaries.py -q`

Expected: PASS。

```powershell
git add -- backend/voice_call_api.py backend/tests/test_voice_call_api.py backend/main_server.py backend/tests/test_main_server_delivery_boundaries.py docs/功能清单.md
git commit -m "feat: expose authenticated voice call socket"
```

### Task 9: 锁定本地 VAD 资源并实现持续 PCM 采集

**Files:**
- Modify: `frontend_react/package.json`
- Modify: `frontend_react/package-lock.json`
- Modify: `.gitignore`
- Create: `frontend_react/scripts/sync-vad-assets.mjs`
- Create: `frontend_react/public/voice/pcm-capture.worklet.js`
- Create: `frontend_react/src/voice-call/pcm.js`
- Create: `frontend_react/src/voice-call/voiceCapture.js`
- Create: `frontend_react/src/voice-call/__tests__/pcm.test.js`
- Create: `frontend_react/src/voice-call/__tests__/voiceCapture.test.js`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Produces: `float32ToPcm16(samples) -> ArrayBuffer`、`concatPcm(chunks) -> ArrayBuffer`。
- Produces: `createVoiceCapture({ onSpeechStart, onPcm, onSpeechEnd, onMisfire, onError })`，返回 `start()`、`pause()`、`destroy()`。
- Emits: 16 kHz PCM16；`onSpeechStart` 后先发 120 ms pre-roll，再发实时帧。

- [ ] **Step 1: 安装精确依赖并验证许可证字段**

Run: `& "D:\ai\Node\npm.cmd" install --save-exact @ricky0123/vad-web@0.0.30 onnxruntime-web@1.22.0`，workdir `frontend_react`。

Run: `& "D:\ai\Node\npm.cmd" view @ricky0123/vad-web@0.0.30 license; & "D:\ai\Node\npm.cmd" view onnxruntime-web@1.22.0 license`。

Expected: 两者均输出 `MIT`；`package.json` 与 lockfile 使用精确版本。

- [ ] **Step 2: 写 PCM 转换和采集生命周期失败测试**

```javascript
it('把 Float32 饱和转换为小端 PCM16', () => {
  const view = new DataView(float32ToPcm16(new Float32Array([-2, -1, 0, 1, 2])));
  expect(Array.from({ length: 5 }, (_, i) => view.getInt16(i * 2, true)))
    .toEqual([-32768, -32768, 0, 32767, 32767]);
});

it('speech start 先输出 120ms pre-roll 且 destroy 关闭唯一麦克风轨道', async () => {
  const fixture = makeCaptureFixture({ sampleRate: 48000 });
  const capture = createVoiceCapture(fixture.callbacks, fixture.dependencies);
  await capture.start();
  fixture.worklet.emitFrames(48000 * 0.2);
  fixture.vad.emitSpeechStart();
  expect(fixture.callbacks.onPcm.mock.calls[0][0].byteLength).toBe(16000 * 0.12 * 2);
  await capture.destroy();
  expect(fixture.track.stop).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3: 实现本地资源同步，不允许 CDN 默认值**

`sync-vad-assets.mjs` 清空并重建 `public/vad`，只复制：两个 Silero ONNX、`vad.worklet.bundle.min.js`、ONNX Runtime 的 `*.wasm` 与 `*.mjs`。`package.json` 增加：

```json
{
  "scripts": {
    "sync:vad": "node scripts/sync-vad-assets.mjs",
    "predev": "npm run sync:vad",
    "prebuild": "npm run sync:vad",
    "dev": "vite",
    "build": "vite build"
  }
}
```

`.gitignore` 增加 `frontend_react/public/vad/`。`MicVAD.new` 必须显式传入基于 `import.meta.env.BASE_URL` 计算的 `baseAssetPath` 和 `onnxWASMBasePath`。

- [ ] **Step 4: 实现 Worklet 重采样、环形 pre-roll 与共享 MediaStream**

Worklet 用输入 `sampleRate / 16000` 比率做分段加权平均降采样，避免直接抽样造成明显混叠；累计到 320 个 16 kHz 样本后 postMessage 一个可转移 Float32Array。主线程始终保存最后 1920 个 16 kHz 样本；VAD `onSpeechStart` 时把环形缓冲转换为 PCM16，然后进入实时转发。`MicVAD` 通过 `getStream: async () => mediaStream` 复用同一个麦克风流。发言达到 30 秒时 capture 主动触发 `onSpeechEnd` 并暂停当前 VAD 段，防止累计数据超过后端上限。

```javascript
const vad = await MicVAD.new({
  model: 'v5',
  redemptionMs: 400,
  minSpeechMs: 250,
  preSpeechPadMs: 120,
  baseAssetPath: assetBase,
  onnxWASMBasePath: assetBase,
  getStream: async () => mediaStream,
  onSpeechStart,
  onSpeechEnd: () => onSpeechEnd(),
  onVADMisfire,
});
```

麦克风约束固定 `channelCount: 1`、`echoCancellation: true`、`noiseSuppression: true`、`autoGainControl: true`。`destroy` 顺序为 pause VAD、销毁 VAD、断开节点、关闭 AudioContext、停止 MediaStreamTrack。

- [ ] **Step 5: 运行资源和采集测试、更新清单并提交**

Run: `& "D:\ai\Node\npm.cmd" run sync:vad`，workdir `frontend_react`。

Run: `& "D:\ai\Node\npx.cmd" vitest run src/voice-call/__tests__/pcm.test.js src/voice-call/__tests__/voiceCapture.test.js`。

Expected: PASS；`public/vad` 包含 ONNX、Worklet、WASM、MJS，测试记录的 URL 均为本地路径。

```powershell
git add -- .gitignore frontend_react/package.json frontend_react/package-lock.json frontend_react/scripts/sync-vad-assets.mjs frontend_react/public/voice/pcm-capture.worklet.js frontend_react/src/voice-call/pcm.js frontend_react/src/voice-call/voiceCapture.js frontend_react/src/voice-call/__tests__/pcm.test.js frontend_react/src/voice-call/__tests__/voiceCapture.test.js docs/功能清单.md
git commit -m "feat: capture local vad pcm streams"
```

### Task 10: 实现连续 PCM 播放器

**Files:**
- Create: `frontend_react/src/voice-call/pcmStreamPlayer.js`
- Create: `frontend_react/src/voice-call/__tests__/pcmStreamPlayer.test.js`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Produces: `createPcmStreamPlayer({ createAudioContext, now, reportMetric })`。
- Methods: `start(turnId, format)`、`enqueue(turnId, sequence, pcm)`、`seal(turnId)`、`interrupt(turnId)`、`destroy()`、`snapshot()`。

- [ ] **Step 1: 写失败测试，覆盖预缓冲、乱序、旧轮次和立即停止**

```javascript
it('累计 120ms 后按 sequence 连续调度', async () => {
  const audio = installFakeAudioContext({ sampleRate: 32000 });
  const player = createPcmStreamPlayer(audio.dependencies);
  player.start(7, { sample_rate: 32000, channels: 1, sample_width: 2 });
  player.enqueue(7, 1, pcmForMs(60, 32000));
  player.enqueue(7, 0, pcmForMs(60, 32000));
  await player.whenScheduled();
  expect(audio.starts.map(call => call.sequence)).toEqual([0, 1]);
  expect(audio.starts[1].at).toBeCloseTo(audio.starts[0].at + 0.06, 3);
});

it('插话同步 stop 所有 source 并拒绝迟到分片', () => {
  const fixture = runningPlayer(3);
  fixture.player.interrupt(3);
  expect(fixture.sources.every(source => source.stop.mock.calls.length === 1)).toBe(true);
  expect(fixture.player.enqueue(3, 9, new ArrayBuffer(320))).toEqual({ accepted: false, reason: 'stale' });
});
```

另写测试覆盖重复序号、缺失序号 seal、总音频不足 120 ms 时 seal 仍立即播放、非法格式、奇数字节、AudioContext suspend/resume、断粮指标和 destroy 关闭 context。

- [ ] **Step 2: 运行测试确认失败**

Run: `& "D:\ai\Node\npx.cmd" vitest run src/voice-call/__tests__/pcmStreamPlayer.test.js`，workdir `frontend_react`。

Expected: FAIL，提示模块不存在。

- [ ] **Step 3: 实现单时间轴调度**

PCM16 转 Float32 后创建单声道 AudioBuffer。首次累计至少 `sample_rate * 0.12` 个采样才设置 `nextStartAt = currentTime + 0.03`；后续使用 `max(nextStartAt, currentTime + 0.01)`，每个 buffer 的 duration 累加到 `nextStartAt`。所有 source 存入当前轮次集合，`interrupt` 同步 stop 并清空待调度数据。

```javascript
const startAt = Math.max(state.nextStartAt, context.currentTime + 0.01);
source.start(startAt);
state.nextStartAt = startAt + audioBuffer.duration;
state.sources.add(source);
```

不得复用现有 Rhubarb `syncedAudioPlayer`，也不得更新任何嘴型状态。

- [ ] **Step 4: 运行测试、更新清单并提交**

Run: `& "D:\ai\Node\npx.cmd" vitest run src/voice-call/__tests__/pcmStreamPlayer.test.js`。

Expected: PASS。

```powershell
git add -- frontend_react/src/voice-call/pcmStreamPlayer.js frontend_react/src/voice-call/__tests__/pcmStreamPlayer.test.js docs/功能清单.md
git commit -m "feat: schedule continuous realtime pcm"
```

### Task 11: 实现通话 Socket、状态机和插话

**Files:**
- Create: `frontend_react/src/voice-call/voiceCallSocket.js`
- Create: `frontend_react/src/voice-call/voiceCallController.js`
- Create: `frontend_react/src/voice-call/__tests__/voiceCallSocket.test.js`
- Create: `frontend_react/src/voice-call/__tests__/voiceCallController.test.js`
- Modify: `frontend_react/src/auth/session.js`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Consumes: Tasks 1、9、10 的协议、capture 和 player。
- Produces: `createVoiceCallSocket({ createTicket, WebSocketImpl, onControl, onPcm, onClose })`。
- Produces: `createVoiceCallController(dependencies)`；methods `start()`、`end()`、`toggleMute()`、`subscribe(listener)`、`snapshot()`。
- States: `connecting | listening | recognizing | thinking | speaking | interrupted | error | ended`。

- [ ] **Step 1: 写 JSON/二进制配对失败测试**

```javascript
it('只把与 output_audio_chunk 元数据相邻且等长的 bytes 交给播放器', async () => {
  const fixture = socketFixture();
  const socket = createVoiceCallSocket(fixture.dependencies);
  await socket.connect();
  fixture.ws.message(JSON.stringify({
    type: 'output_audio_chunk', session_id: 's1', turn_id: 2,
    direction: 'output', sequence: 0, byte_length: 4,
  }));
  fixture.ws.message(new Uint8Array([0, 1, 2, 3]).buffer);
  expect(fixture.onPcm).toHaveBeenCalledWith(
    expect.objectContaining({ turn_id: 2, sequence: 0 }), expect.any(ArrayBuffer),
  );
});
```

覆盖 bytes 无 header、长度不匹配、两个 header 连续、非法 JSON、`binaryType='arraybuffer'`、一次性票据仅在连接时请求一次、关闭后不自动恢复旧轮次。

- [ ] **Step 2: 写插话失败测试**

```javascript
it('speaking 状态检测到用户语音时先停播再发送 interrupt 和新 turn', async () => {
  const fixture = controllerFixture({ initialState: 'speaking', activeTurnId: 4 });
  fixture.capture.emitSpeechStart();
  expect(fixture.order).toEqual([
    'player.interrupt:4',
    'socket.interrupt:4',
    'socket.user_speech_start:5',
  ]);
  expect(fixture.controller.snapshot().state).toBe('listening');
});
```

另覆盖正常监听开始、400 ms 后结束、pre-roll 为 sequence 0、每帧递增、静音不上传、ASR/LLM/TTS 状态转换、旧轮次事件丢弃、页面后台暂停、结束通话完整清理。

- [ ] **Step 3: 运行测试确认失败**

Run: `& "D:\ai\Node\npx.cmd" vitest run src/voice-call/__tests__/voiceCallSocket.test.js src/voice-call/__tests__/voiceCallController.test.js`，workdir `frontend_react`。

Expected: FAIL，提示模块不存在。

- [ ] **Step 4: 实现连接与唯一状态机**

`createWebSocketTicket` 增加可选错误标签：`createWebSocketTicket(label = '聊天')`，请求和返回格式不变；通话调用 `createWebSocketTicket('语音通话')`。Socket URL 由 `${getWebSocketBase()}/ws/voice-call?ticket=${encodeURIComponent(ticket)}` 构造。

控制器连接成功后先发送不含 session_id 的 `call_start`，收到 `call_ready` 后保存服务端 session_id 并启动 capture。`onSpeechStart` 同步调用 player.interrupt；为新发言递增 `turnId`；先发送 `user_speech_start`，再发送每个 `input_audio_chunk` header 和 bytes；`onSpeechEnd` 发送 `user_speech_end` 并进入 `recognizing`。

```javascript
function acceptTurnEvent(event) {
  return Number.isSafeInteger(event.turn_id)
    && event.turn_id === state.activeTurnId
    && state.status !== 'ended';
}
```

`visibilitychange` 进入 hidden 时暂停 capture 并立即取消当前轮次；返回 visible 后状态为 `interrupted`，只在用户点击“继续”时恢复 AudioContext 和 VAD。

- [ ] **Step 5: 运行测试、更新清单并提交**

Run: `& "D:\ai\Node\npx.cmd" vitest run src/voice-call/__tests__/voiceCallSocket.test.js src/voice-call/__tests__/voiceCallController.test.js`。

Expected: PASS。

```powershell
git add -- frontend_react/src/voice-call/voiceCallSocket.js frontend_react/src/voice-call/voiceCallController.js frontend_react/src/voice-call/__tests__/voiceCallSocket.test.js frontend_react/src/voice-call/__tests__/voiceCallController.test.js frontend_react/src/auth/session.js docs/功能清单.md
git commit -m "feat: add interruptible voice call controller"
```

### Task 12: 建立不加载 Live2D 的独立语音页面

**Files:**
- Create: `frontend_react/src/voice-call/useVoiceCall.js`
- Create: `frontend_react/src/pages/VoiceCallPage.jsx`
- Create: `frontend_react/src/pages/MainUnaPage.jsx`
- Create: `frontend_react/src/components/LoginView.jsx`
- Create: `frontend_react/src/pages/__tests__/VoiceCallPage.test.jsx`
- Modify: `frontend_react/src/App.jsx`
- Modify: `frontend_react/src/__tests__/App.test.jsx`
- Modify: `frontend_react/src/index.css`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Consumes: Task 11 controller。
- Produces: `useVoiceCall(authenticated)` 返回 `status`、`userTranscript`、`assistantText`、`error`、`muted`、`startCall`、`endCall`、`continueCall`、`toggleMute`。
- Route selection: `new URLSearchParams(window.location.search).get('view') === 'voice'`。

- [ ] **Step 1: 写动态入口失败测试**

```javascript
it('voice 查询参数只加载语音页，不加载主应用模块', async () => {
  window.history.replaceState({}, '', '/?view=voice');
  render(<App />);
  expect(await screen.findByRole('button', { name: '开始通话' })).toBeInTheDocument();
  expect(mainUnaModuleLoaded).toBe(false);
});
```

增加源码边界测试：递归读取 `VoiceCallPage.jsx`、`useVoiceCall.js` 和 `src/voice-call/*.js`，断言不存在 `pixi`、`Live2D`、`useUnaCore`、`rhubarb`、`gestureGenerator`。现有 Live2D props 测试迁移到 `MainUnaPage.test.jsx`，行为保持不变。

- [ ] **Step 2: 写页面交互失败测试**

```javascript
it('展示通话状态、双方转写并结束后返回入口', async () => {
  useVoiceCall.mockReturnValue({
    status: 'speaking', userTranscript: '今天有点累', assistantText: '我陪你歇一会儿。',
    error: '', muted: false, startCall, endCall, continueCall, toggleMute,
  });
  render(<VoiceCallPage authenticated />);
  expect(screen.getByText('UNA 正在说话')).toBeInTheDocument();
  expect(screen.getByText('今天有点累')).toBeInTheDocument();
  expect(screen.getByText('我陪你歇一会儿。')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '结束通话' }));
  expect(endCall).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3: 拆分认证壳和主应用**

`App.jsx` 顶层不得 import `MainUnaPage` 或 `VoiceCallPage`，只允许：

```javascript
const MainUnaPage = lazy(() => import('./pages/MainUnaPage'));
const VoiceCallPage = lazy(() => import('./pages/VoiceCallPage'));
const voiceMode = new URLSearchParams(window.location.search).get('view') === 'voice';
return <Suspense fallback={<LoadingScreen />}>
  {voiceMode ? <VoiceCallPage authenticated /> : <MainUnaPage authenticated />}
</Suspense>;
```

登录状态和刷新令牌保留在 App 认证壳；原 `App.jsx` 登录后的 JSX 原样移动到 `MainUnaPage.jsx`。主界面增加普通链接 `<a href="./?view=voice">语音通话</a>`；语音页返回使用 `<a href="./">返回 UNA</a>`，两者都整页导航。

- [ ] **Step 4: 实现简洁通话 UI 和无障碍状态**

页面只显示 UNA 名称、连接/倾听/识别/思考/说话状态、最近用户转写、当前 UNA 回复、麦克风静音、继续和挂断按钮。状态变化放入 `aria-live="polite"`；错误使用 `role="alert"`；按钮触控尺寸至少 44px；使用 `env(safe-area-inset-*)`。

- [ ] **Step 5: 运行页面和原应用回归、更新清单并提交**

Run: `& "D:\ai\Node\npx.cmd" vitest run src/pages/__tests__/VoiceCallPage.test.jsx src/__tests__/App.test.jsx src/components/__tests__/Live2DViewer.test.jsx`，workdir `frontend_react`。

Expected: PASS。

```powershell
git add -- frontend_react/src/voice-call/useVoiceCall.js frontend_react/src/pages/VoiceCallPage.jsx frontend_react/src/pages/MainUnaPage.jsx frontend_react/src/components/LoginView.jsx frontend_react/src/pages/__tests__/VoiceCallPage.test.jsx frontend_react/src/App.jsx frontend_react/src/__tests__/App.test.jsx frontend_react/src/index.css docs/功能清单.md
git commit -m "feat: add live2d-free voice call page"
```

### Task 13: 加入隐私安全的性能指标

**Files:**
- Create: `backend/voice_call_metrics.py`
- Create: `backend/tests/test_voice_call_metrics.py`
- Modify: `backend/voice_call_service.py`
- Modify: `frontend_react/src/voice-call/voiceCallController.js`
- Create: `frontend_react/src/voice-call/voiceCallMetrics.js`
- Create: `frontend_react/src/voice-call/__tests__/voiceCallMetrics.test.js`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Backend stages: `pcm_received`、`asr`、`memory_snapshot`、`llm_first_text`、`tts_first_byte`、`ws_delivery`、`cancel`。
- Frontend stages: `vad_endpoint`、`first_audio`、`buffer_depth`、`starvation`、`barge_in_stop`。
- Safe fields: `session_id` 的前 8 位、`turn_id`、`sequence`、`stage`、`status`、`duration_ms`、`byte_count`；不得包含文本、URL、ticket、Authorization 或 PCM。

- [ ] **Step 1: 写敏感字段净化失败测试**

```python
def test_metric_drops_tokens_text_urls_and_audio(capsys):
    log_voice_metric({
        "session_id": "1234567890", "turn_id": 2, "stage": "asr", "duration_ms": 12.5,
        "ticket": "secret", "Authorization": "Bearer secret", "text": "私人内容",
        "pcm": b"secret", "url": "/ws/voice-call?ticket=secret",
    })
    output = capsys.readouterr().out
    assert "12345678" in output
    assert "secret" not in output
    assert "私人内容" not in output
```

前端使用同一攻击对象测试 getter 抛错、循环对象和额外字段，指标失败不得中断播放或插话。

- [ ] **Step 2: 运行测试确认失败**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_metrics.py -q`

Run: `& "D:\ai\Node\npx.cmd" vitest run src/voice-call/__tests__/voiceCallMetrics.test.js`，workdir `frontend_react`。

Expected: FAIL，提示模块不存在。

- [ ] **Step 3: 实现白名单指标并接入阶段边界**

```python
SAFE_FIELDS = frozenset({
    "session_id", "turn_id", "sequence", "stage", "status", "duration_ms", "byte_count",
})
SAFE_STAGES = frozenset({
    "pcm_received", "asr", "memory_snapshot", "llm_first_text",
    "tts_first_byte", "ws_delivery", "cancel",
})
```

服务端以 `time.perf_counter()` 计时，浏览器以 `performance.now()` 计时。指标只写控制台；本地第一版不增加遥测服务器。

- [ ] **Step 4: 运行测试、更新清单并提交**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests/test_voice_call_metrics.py backend/tests/test_voice_call_service.py -q`

Run: `& "D:\ai\Node\npx.cmd" vitest run src/voice-call/__tests__/voiceCallMetrics.test.js src/voice-call/__tests__/voiceCallController.test.js`。

Expected: PASS。

```powershell
git add -- backend/voice_call_metrics.py backend/tests/test_voice_call_metrics.py backend/voice_call_service.py frontend_react/src/voice-call/voiceCallController.js frontend_react/src/voice-call/voiceCallMetrics.js frontend_react/src/voice-call/__tests__/voiceCallMetrics.test.js docs/功能清单.md
git commit -m "feat: measure realtime voice latency safely"
```

### Task 14: 完成全量回归、构建发布和本地人工验收

**Files:**
- Modify: `README.md`
- Modify: `docs/功能清单.md`
- Modify: `backend/static/mobile/**`（由构建和发布脚本生成）

**Interfaces:**
- Consumes: Tasks 1–13 全部接口。
- Produces: 可从 `http://127.0.0.1:8000/?view=voice` 使用的本地实时语音功能。

- [ ] **Step 1: 运行后端全量测试**

Run: `& "d:\ai\python 3.11\python.exe" -m pytest backend/tests -q`

Expected: 全部 PASS；测试数据只写 `conftest.py` 创建的临时目录。

- [ ] **Step 2: 运行前端全量测试**

Run: `& "D:\ai\Node\npx.cmd" vitest run`，workdir `frontend_react`。

Expected: 全部 PASS；没有未处理 Promise rejection 和 AudioContext 泄漏警告。

- [ ] **Step 3: 构建并验证语音入口拆包和本地资源**

Run: `& "D:\ai\Node\npm.cmd" run build`，workdir `frontend_react`。

Expected: PASS；`dist/vad` 含 ONNX、WASM、MJS 和 Worklet；构建产物包含独立 voice chunk 与 Live2D/Pixi chunk。

Run: `rg -n "pixi|Live2D|gestureGenerator|rhubarb" frontend_react/dist/assets/*voice*`

Expected: 无匹配；若 Vite hash 名不含 voice，则先从 `dist/index.html` 和动态 import 映射定位语音 chunk，再执行同一检查。

- [ ] **Step 4: 发布到 FastAPI 静态目录并校验哈希**

Run: `& '.\scripts\publish_frontend.ps1'`，workdir `D:\ai\Una`。

Run: `Get-FileHash frontend_react/dist/index.html, backend/static/mobile/index.html -Algorithm SHA256`

Expected: 两个 SHA-256 相同；`backend/static/mobile/vad` 资源齐全。

- [ ] **Step 5: 更新 README 的本地启动顺序**

README 写明三个独立终端：

```powershell
cd 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS'
& '.\gptsovits_env\Scripts\python.exe' api_v2.py

cd 'D:\ai\Una'
& 'd:\ai\python 3.11\python.exe' backend/main_server.py

cd 'D:\ai\Una\frontend_react'
& 'D:\ai\Node\npm.cmd' run dev
```

说明开发入口为 `http://127.0.0.1:5173/?view=voice`，发布入口为 `http://127.0.0.1:8000/?view=voice`；当前 GPT-SoVITS 必须确认 CUDA=True，`output_sample_rate` 与模型一致。

- [ ] **Step 6: 执行桌面人工功能验收**

按顺序完成并记录结果：

1. 直接打开 `/?view=voice`，Network 不出现 Live2D 模型、PixiJS 或 Rhubarb 请求。
2. 连续说 20 句，全部自动停句并显示最终转写，无需按住说话。
3. UNA 使用当前克隆音色开始回复，音高、语速和时长正常。
4. UNA 说话时插话 10 次，旧声音在 150 ms 内停止，后续无旧文字和旧音频。
5. 快速连续两轮，检查 `turn_id` 严格递增、音频 sequence 连续且无串音。
6. 通话结束后切回文字页，历史中存在双方完整轮次；换另一个账号不可读取。
7. 拔掉 GPT-SoVITS 或关闭 9880，页面显示当前轮次错误并恢复监听，不切换 Edge 音色。
8. 浏览器后台停留 5 秒后返回，旧音频不突发播放，点击继续后才恢复。
9. 连续通话 30 分钟，任务管理器和浏览器中麦克风、AudioContext、WebSocket 和内存无持续增长。

- [ ] **Step 7: 汇总性能指标并判断门槛**

在模型预热且无其他 GSV 排队时，采集至少 20 轮：

- 停句到第一声音中位数 ≤ 1.5 秒，P95 ≤ 2.5 秒。
- 插话到本地停声 ≤ 150 ms；后端取消 ≤ 300 ms。
- 播放开始后非语义断粮 ≤ 150 ms。
- 任何日志不含完整 ticket、Authorization、用户全文或 PCM。

未达到时先依据 `asr`、`llm_first_text`、`tts_first_byte`、`first_audio` 和 `starvation` 分段指标定位，不通过盲目缩短 VAD 静音阈值掩盖。

- [ ] **Step 8: 更新功能清单、检查差异并提交最终发布**

Run: `git diff --check`

Expected: 无错误。

```powershell
git add -- README.md docs/功能清单.md backend/static/mobile
git commit -m "docs: verify local realtime voice calls"
```

最终提交前运行 `git status --short`，确认没有把 `backend/una_memory.db`、`backend/data/chroma_db`、`backend/static/voice`、`__pycache__`、Vitest 缓存或人工截图加入暂存区。

---

## 实施完成定义

- Tasks 1–14 全部勾选并各自具有测试证据和提交。
- 后端、前端全量测试与生产构建通过。
- `/?view=voice` 不加载 Live2D/Pixi/Rhubarb，且原主页面功能回归通过。
- 真实 SenseVoice、联网大模型和当前 CUDA GPT-SoVITS 完成至少 20 轮对话与 10 次插话。
- 历史和记忆共享、账号隔离、结束资源释放通过人工验证。
- 性能指标达到第 14 任务门槛；未达标的阶段有日志证据和单独修复任务。
