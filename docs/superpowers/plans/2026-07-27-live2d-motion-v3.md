# P1 AI 自由驱动 Live2D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现用户明确动作指令的即时执行、AI 连续动作关键帧、运行时模型能力映射和统一 `Live2DStateMixer`，同时保持文字、TTS 口型和 ticker 稳定。

**Architecture:** 前端通过 `ImmediateGestureParser` 和参数化曲线生成本地 `MotionPlanV3`，后端通过现有 `ACTION:` 控制行生成并校验 AI `live2d_motion_v3`。所有动作进入单一状态混合器，按通道仲裁用户指令、AI、微反应、待机、眨眼和口型，再由模型能力映射转换为真实 Cubism 参数。

**Tech Stack:** Python 3.9/3.11、FastAPI、pytest、React 18、Vitest、PixiJS、pixi-live2d-display 0.4.0、Live2D Cubism 4、Vite。

## Global Constraints

- 全部工作只允许发生在 `codex/p1-live2d-motion-v3` 分支和 `D:\ai\Una\.worktrees\p1-live2d-motion-v3`；未经用户明确要求不得合并 `main`。
- 所有 Markdown 文档使用中文；每完成一个任务都同步更新 `docs/功能清单.md`，只勾选已经通过对应检查的内容。
- 严格执行 TDD：先写失败测试并确认失败原因正确，再写最小实现。
- AI 和即时动作只使用归一化语义通道，不接受模型原始 `ParamXXX`。
- `mouth_open`、`mouth_form`、`JAW` 和模型物理参数不得由动作协议控制。
- `live2d_action_v2` 和旧 `chat_action` 保留为兼容兜底。
- 单条轨道、能力映射或参数写入失败不得终止 Live2D ticker。
- 用户明确动作指令必须在消息发送后 1～2 个渲染帧内开始，不新增 AI 请求。
- 每个动作最多 8 条轨道，每条轨道最多 12 个关键帧，值域为 `-1～1`。
- Android APK 只能在真实设备验证；未获得用户实机确认前，功能清单保持未验收。

---

## File Structure

### 新建

- `backend/live2d_motion.py`：v3 协议校验、权威字段生成、限频和事件构造。
- `backend/tests/test_live2d_motion.py`：后端 v3 协议与导演测试。
- `frontend_react/src/live2d/motionProtocol.js`：前端 v3 校验、缓动和关键帧采样。
- `frontend_react/src/live2d/gestureParser.js`：即时中文动作指令解析。
- `frontend_react/src/live2d/gestureGenerator.js`：参数化动作曲线生成。
- `frontend_react/src/live2d/modelCapabilities.js`：Cubism 参数能力读取、语义映射和限幅。
- `frontend_react/src/live2d/stateMixer.js`：活动动作生命周期和逐通道混合。
- `frontend_react/src/live2d/__tests__/motionProtocol.test.js`
- `frontend_react/src/live2d/__tests__/gestureParser.test.js`
- `frontend_react/src/live2d/__tests__/gestureGenerator.test.js`
- `frontend_react/src/live2d/__tests__/modelCapabilities.test.js`
- `frontend_react/src/live2d/__tests__/stateMixer.test.js`

### 修改

- `backend/brain_engine.py`：把 AI `ACTION:` 示例和规则升级为 v3 轨道。
- `backend/main_server.py`：把 v3 候选交给 `MotionDirectorV3`，v2 继续走原导演。
- `backend/tests/test_brain_action_stream.py`
- `backend/tests/test_brain_prompt_contract.py`
- `backend/tests/test_main_server_delivery_boundaries.py`
- `frontend_react/src/live2d/actionComposer.js`：仅保留 v2 到 v3 的兼容转换。
- `frontend_react/src/live2d/__tests__/actionComposer.test.js`
- `frontend_react/src/hooks/useUnaCore.js`：即时指令入口、v3 WebSocket 去重与过期过滤。
- `frontend_react/src/hooks/__tests__/useUnaCore.test.js`
- `frontend_react/src/hooks/useLive2DController.js`：接入能力表和单一状态混合器。
- `frontend_react/src/hooks/__tests__/useLive2DController.test.js`
- `frontend_react/src/components/Live2DViewer.jsx`
- `frontend_react/src/components/__tests__/Live2DViewer.test.jsx`
- `frontend_react/src/App.jsx`
- `docs/功能清单.md`
- `backend/static/mobile/index.html`
- `backend/static/mobile/assets/index-*.js`

---

### Task 1: 后端 `live2d_motion_v3` 协议与导演

**Files:**
- Create: `backend/live2d_motion.py`
- Create: `backend/tests/test_live2d_motion.py`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Produces: `parse_motion_plan(payload: object) -> dict | None`
- Produces: `is_motion_v3_candidate(payload: object) -> bool`
- Produces: `MotionDirectorV3.decide(user_id: str, payload: object) -> dict | None`
- Event fields: `type`、`motion_id`、`source`、`created_at_ms`、`expires_at_ms`、`duration_ms`、`variation_seed`、`blend`、`tracks`

- [ ] **Step 1: Write the failing protocol tests**

```python
def valid_motion(**changes):
    motion = {
        "duration_ms": 1800,
        "variation_seed": 7,
        "blend": {"in_ms": 100, "out_ms": 180},
        "tracks": [{
            "channel": "head_pitch",
            "mode": "override",
            "keyframes": [
                {"t": 0.0, "value": 0.0, "easing": "ease_in_out"},
                {"t": 0.5, "value": -0.6, "easing": "ease_in_out"},
                {"t": 1.0, "value": 0.0, "easing": "ease_in_out"},
            ],
        }],
    }
    motion.update(changes)
    return motion


def test_parse_motion_plan_keeps_only_safe_semantic_tracks():
    motion = valid_motion(tracks=[
        valid_motion()["tracks"][0],
        {
            "channel": "mouth_open",
            "mode": "override",
            "keyframes": [{"t": 0.0, "value": 0.0}, {"t": 1.0, "value": 1.0}],
        },
    ])
    parsed = parse_motion_plan(motion)
    assert [track["channel"] for track in parsed["tracks"]] == ["head_pitch"]


def test_parse_motion_plan_rejects_non_finite_and_out_of_order_frames():
    assert parse_motion_plan(valid_motion(tracks=[{
        "channel": "head_pitch",
        "mode": "override",
        "keyframes": [{"t": 0.8, "value": 0.0}, {"t": 0.2, "value": 0.4}],
    }])) is None
    assert parse_motion_plan(valid_motion(tracks=[{
        "channel": "head_pitch",
        "mode": "override",
        "keyframes": [{"t": 0.0, "value": float("nan")}, {"t": 1.0, "value": 0.0}],
    }])) is None
```

- [ ] **Step 2: Run the tests and confirm RED**

Run:

```powershell
& 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend/tests/test_live2d_motion.py -q
```

Expected: collection fails with `ModuleNotFoundError: No module named 'live2d_motion'`.

- [ ] **Step 3: Implement strict normalization**

Use exact allow-lists:

```python
ALLOWED_CHANNELS = frozenset({
    "head_yaw", "head_pitch", "head_roll",
    "body_yaw", "body_pitch", "body_roll",
    "gaze_x", "gaze_y", "eye_open", "eye_smile",
    "brow_y", "brow_form", "cheek",
})
ALLOWED_MODES = frozenset({"override", "additive"})
ALLOWED_EASINGS = frozenset({"linear", "ease_in", "ease_out", "ease_in_out"})
MAX_TRACKS = 8
MAX_KEYFRAMES = 12


def _finite_number(value):
    number = float(value)
    if not math.isfinite(number):
        raise ValueError("non-finite")
    return number
```

`parse_motion_plan` must:

1. require a dictionary and a non-empty `tracks` list;
2. clamp AI duration to 400～4000 milliseconds;
3. clamp blend values to 0～500 milliseconds;
4. drop an invalid or forbidden track without affecting valid siblings;
5. require 2～12 strictly time-ordered keyframes per track;
6. reject a whole payload when no safe track remains;
7. return a newly constructed dictionary and never mutate the input.

- [ ] **Step 4: Add authoritative event and cooldown tests**

```python
def test_director_overwrites_ai_authority_fields_and_rate_limits_per_user():
    now = [1785124800.0]
    director = MotionDirectorV3(
        clock=lambda: now[0],
        id_factory=lambda: "motion-1",
    )
    event = director.decide("u-1", {
        **valid_motion(),
        "type": "forged",
        "source": "user_command",
        "motion_id": "forged-id",
        "created_at_ms": 1,
    })
    assert event["type"] == "live2d_motion_v3"
    assert event["source"] == "ai_reply"
    assert event["motion_id"] == "motion-1"
    assert event["created_at_ms"] == 1785124800000
    assert event["expires_at_ms"] == 1785124810000
    assert director.decide("u-1", valid_motion()) is None
    assert director.decide("u-2", valid_motion()) is not None
```

Use a 3-second per-user cooldown. `expires_at_ms` is always `created_at_ms + 10000`.

- [ ] **Step 5: Run backend v3 tests and confirm GREEN**

Run:

```powershell
& 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend/tests/test_live2d_motion.py -q
```

Expected: all tests in `test_live2d_motion.py` pass.

- [ ] **Step 6: Update checklist and commit**

Mark only “后端 v3 协议校验与导演” complete in `docs/功能清单.md`.

```powershell
git add -- backend/live2d_motion.py backend/tests/test_live2d_motion.py docs/功能清单.md
git commit -m "feat: validate Live2D motion v3 events"
```

---

### Task 2: AI v3 提示词、流式解析与 WebSocket 路由

**Files:**
- Modify: `backend/brain_engine.py:230-253`
- Modify: `backend/main_server.py:90-95,178-187,381-391`
- Modify: `backend/tests/test_brain_action_stream.py`
- Modify: `backend/tests/test_brain_prompt_contract.py`
- Modify: `backend/tests/test_main_server_delivery_boundaries.py`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Consumes: `MotionDirectorV3.decide(user_id, payload)`
- Consumes: existing `ActionDirector.decide(user_id, payload)` for v2 fallback
- Produces: `ACTION:` v3 candidate remains `{"type": "live2d_action_candidate", "plan": payload}`
- Produces: WebSocket `live2d_motion_v3`

- [ ] **Step 1: Write failing AI stream and prompt contract tests**

Add a stream case whose second control line is:

```python
action_line = (
    'ACTION: {"duration_ms":1200,"variation_seed":8,'
    '"blend":{"in_ms":100,"out_ms":160},'
    '"tracks":[{"channel":"head_pitch","mode":"override",'
    '"keyframes":[{"t":0,"value":0},{"t":0.5,"value":-0.4},'
    '{"t":1,"value":0}]}]}\n'
)
```

Assert:

```python
candidates = [event for event in events if event["type"] == "live2d_action_candidate"]
assert candidates[0]["plan"]["tracks"][0]["channel"] == "head_pitch"
assert "ACTION:" not in reply_text
```

Update prompt contract assertions:

```python
assert '"channel":"head_pitch"' in source
assert "mouth_open" in source
assert "禁止" in source
assert "ParamAngleX" not in source
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run:

```powershell
& 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend/tests/test_brain_action_stream.py backend/tests/test_brain_prompt_contract.py -q
```

Expected: prompt contract fails because the current prompt still describes v2 intents.

- [ ] **Step 3: Replace only the ACTION payload contract**

Keep P0’s first-line `EMOTION` and second-line `ACTION` framing. Replace the v2 example with a compact v3 example and explicitly state:

```text
ACTION 只能为 null 或 v3 JSON。
只允许 head_yaw/head_pitch/head_roll/body_yaw/body_pitch/body_roll/
gaze_x/gaze_y/eye_open/eye_smile/brow_y/brow_form/cheek。
每条轨道输出 2～6 个关键帧；禁止嘴部、ParamXXX、舞台说明和代码围栏。
普通聊天优先 null；需要动作时使用小幅轨迹，明确情绪才使用明显幅度。
```

Do not add another control prefix.

- [ ] **Step 4: Route v3 and v2 plans separately**

At module initialization:

```python
action_director = ActionDirector()
motion_director = MotionDirectorV3()
```

Inside `process_and_push_response`:

```python
plan = item.get("plan")
if is_motion_v3_candidate(plan):
    event = motion_director.decide(user_id, plan)
else:
    event = action_director.decide(user_id, plan)
if event is not None:
    await ws_manager.broadcast_to_user(user_id, event)
```

Add a delivery-boundary test that stubs both directors and verifies a payload containing `tracks` calls only v3.

- [ ] **Step 5: Run backend action pipeline tests**

Run:

```powershell
& 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend/tests/test_live2d_motion.py backend/tests/test_live2d_action.py backend/tests/test_brain_action_stream.py backend/tests/test_brain_prompt_contract.py backend/tests/test_main_server_delivery_boundaries.py -q
```

Expected: all selected tests pass; reply text contains no control JSON.

- [ ] **Step 6: Update checklist and commit**

```powershell
git add -- backend/brain_engine.py backend/main_server.py backend/tests/test_brain_action_stream.py backend/tests/test_brain_prompt_contract.py backend/tests/test_main_server_delivery_boundaries.py docs/功能清单.md
git commit -m "feat: stream AI Live2D motion v3"
```

---

### Task 3: 前端 v3 协议校验与关键帧编译器

**Files:**
- Create: `frontend_react/src/live2d/motionProtocol.js`
- Create: `frontend_react/src/live2d/__tests__/motionProtocol.test.js`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Produces: `normalizeMotionEvent(event, { nowMs } = {}) -> MotionPlanV3 | null`
- Produces: `compileMotionPlan(plan) -> CompiledMotion | null`
- `CompiledMotion.sample(progress) -> Record<SemanticChannel, number>`
- `CompiledMotion` fields: `motionId`、`source`、`durationMs`、`blendInMs`、`blendOutMs`、`expiresAtMs`、`sample`
- Produces constants: `SEMANTIC_CHANNELS` and `RESERVED_MOTION_CHANNELS`

- [ ] **Step 1: Write failing normalization tests**

```javascript
it('拒绝过期事件、嘴部轨道和非有限值，但保留安全兄弟轨道', () => {
  const normalized = normalizeMotionEvent({
    type: 'live2d_motion_v3',
    motion_id: 'm-1',
    source: 'ai_reply',
    created_at_ms: 1000,
    expires_at_ms: 9000,
    duration_ms: 1200,
    blend: { in_ms: 100, out_ms: 180 },
    tracks: [
      track('head_pitch', [[0, 0], [0.5, -0.5], [1, 0]]),
      track('mouth_open', [[0, 0], [1, 1]]),
    ],
  }, { nowMs: 2000 });

  expect(normalized.tracks.map(item => item.channel)).toEqual(['head_pitch']);
  expect(normalizeMotionEvent({ ...normalized, expires_at_ms: 1500 }, { nowMs: 2000 }))
    .toBeNull();
});
```

Add cases for unordered time, more than 8 tracks, more than 12 frames, unknown easing and `NaN`.

- [ ] **Step 2: Run the new test and confirm RED**

Run:

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/motionProtocol.test.js
```

Expected: import fails because `motionProtocol.js` does not exist.

- [ ] **Step 3: Implement normalization and easing**

Use:

```javascript
const EASING = {
  linear: t => t,
  ease_in: t => t * t,
  ease_out: t => 1 - ((1 - t) ** 2),
  ease_in_out: t => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2),
};
```

`normalizeMotionEvent` must build a fresh sanitized object and reject an expired network event. Local `user_command` events use the same validator.

- [ ] **Step 4: Write failing interpolation tests**

```javascript
it('按关键帧 easing 插值并保持结果在 -1 到 1', () => {
  const compiled = compileMotionPlan(validPlan({
    tracks: [track('head_pitch', [[0, 0], [0.5, -0.8], [1, 0]])],
  }));
  expect(compiled.sample(0).head_pitch).toBe(0);
  expect(compiled.sample(0.5).head_pitch).toBeCloseTo(-0.8);
  expect(compiled.sample(1).head_pitch).toBe(0);
});
```

- [ ] **Step 5: Implement binary-safe track sampling**

For each track:

1. clamp progress to `0～1`;
2. return first or last value outside keyframe segments;
3. find the surrounding keyframe pair;
4. apply the destination keyframe’s easing;
5. linearly interpolate and clamp to `-1～1`;
6. isolate a broken track so other tracks still sample.

- [ ] **Step 6: Run tests, update checklist and commit**

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/motionProtocol.test.js
git add -- frontend_react/src/live2d/motionProtocol.js frontend_react/src/live2d/__tests__/motionProtocol.test.js docs/功能清单.md
git commit -m "feat: compile Live2D motion keyframes"
```

---

### Task 4: 即时中文动作解析与参数化曲线

**Files:**
- Create: `frontend_react/src/live2d/gestureParser.js`
- Create: `frontend_react/src/live2d/gestureGenerator.js`
- Create: `frontend_react/src/live2d/__tests__/gestureParser.test.js`
- Create: `frontend_react/src/live2d/__tests__/gestureGenerator.test.js`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Produces: `parseImmediateGesture(text: string) -> GestureCommand | null`
- `GestureCommand.groups`: sequential groups; each group contains parallel gesture atoms
- Produces: `createImmediateMotion(command, { nowMs, idFactory, seed } = {}) -> MotionPlanV3`
- Produces: `createListeningMotion({ nowMs, idFactory, seed } = {}) -> MotionPlanV3`

- [ ] **Step 1: Write failing parser tests**

```javascript
expect(parseImmediateGesture('上下点头三次')).toMatchObject({
  groups: [{ gestures: [{ kind: 'nod', count: 3 }] }],
});
expect(parseImmediateGesture('慢慢摇头两次并眨眼')).toMatchObject({
  groups: [{
    gestures: [
      { kind: 'shake', count: 2, speed: 'slow' },
      { kind: 'blink', count: 1 },
    ],
  }],
});
expect(parseImmediateGesture('先点头两次，再摇头')).toMatchObject({
  groups: [
    { gestures: [{ kind: 'nod', count: 2 }] },
    { gestures: [{ kind: 'shake', count: 1 }] },
  ],
});
expect(parseImmediateGesture('不要点头')).toBeNull();
expect(parseImmediateGesture('我不是让你摇头')).toBeNull();
```

- [ ] **Step 2: Run parser tests and confirm RED**

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/gestureParser.test.js
```

Expected: module import fails.

- [ ] **Step 3: Implement high-confidence grammar**

Use explicit gesture atoms:

```javascript
const GESTURES = [
  ['nod', /(?:上下)?点头/],
  ['shake', /摇头/],
  ['look_up', /抬头|向上看/],
  ['look_down', /低头|向下看/],
  ['look_left', /向左看|看左边/],
  ['look_right', /向右看|看右边/],
  ['tilt_left', /向左歪头|头往左歪/],
  ['tilt_right', /向右歪头|头往右歪/],
  ['lean_forward', /身体前倾|靠近(?:我)?/],
  ['lean_back', /身体后退|往后退/],
  ['lean_left', /身体向左倾/],
  ['lean_right', /身体向右倾/],
  ['blink', /眨眼/],
  ['close_eyes', /闭眼|闭上眼睛/],
];
```

Apply negation before keyword extraction. Parse Chinese numerals and Arabic numbers, clamp count to 1～5, split `先…再…` into sequential groups, and split `并/同时/和` only when both sides contain known gestures.

- [ ] **Step 4: Write failing curve-generation tests**

```javascript
it('点头三次生成三次负向峰值并准确回中', () => {
  const motion = createImmediateMotion(
    parseImmediateGesture('轻轻点头三次'),
    { nowMs: 1000, idFactory: () => 'local-1', seed: 9 },
  );
  const track = motion.tracks.find(item => item.channel === 'head_pitch');
  expect(track.keyframes.filter(frame => frame.value < -0.1)).toHaveLength(3);
  expect(track.keyframes.at(-1)).toMatchObject({ t: 1, value: 0 });
  expect(motion.source).toBe('user_command');
});
```

Also assert slow motions have longer `duration_ms`, parallel actions share a time range, sequential groups do not overlap, and generated values stay within `-1～1`.

- [ ] **Step 5: Add a bounded performance test**

```javascript
it('常用即时指令解析和生成保持同步轻量', () => {
  const startedAt = performance.now();
  for (let index = 0; index < 1000; index += 1) {
    createImmediateMotion(parseImmediateGesture('轻轻点头三次'), {
      nowMs: 1000 + index,
      idFactory: () => `local-${index}`,
      seed: index,
    });
  }
  expect(performance.now() - startedAt).toBeLessThan(500);
});
```

This checks an average below 0.5ms while leaving enough headroom for Windows CI variance; the design target remains below 5ms for one normal message.

- [ ] **Step 6: Implement parametric generation**

Map gestures to channels:

```javascript
const GESTURE_CHANNELS = {
  nod: ['head_pitch', -1],
  shake: ['head_yaw', 1],
  look_up: ['head_pitch', 1],
  look_down: ['head_pitch', -1],
  look_left: ['head_yaw', -1],
  look_right: ['head_yaw', 1],
  tilt_left: ['head_roll', -1],
  tilt_right: ['head_roll', 1],
  lean_forward: ['body_pitch', 1],
  lean_back: ['body_pitch', -1],
  lean_left: ['body_roll', -1],
  lean_right: ['body_roll', 1],
  blink: ['eye_open', -1],
  close_eyes: ['eye_open', -1],
};
```

Use deterministic seeded jitter capped at ±8% for amplitude and ±6% for phase. Jitter must never change gesture count or direction. End every non-hold track at zero.

- [ ] **Step 7: Run tests, update checklist and commit**

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/gestureParser.test.js src/live2d/__tests__/gestureGenerator.test.js
git add -- frontend_react/src/live2d/gestureParser.js frontend_react/src/live2d/gestureGenerator.js frontend_react/src/live2d/__tests__/gestureParser.test.js frontend_react/src/live2d/__tests__/gestureGenerator.test.js docs/功能清单.md
git commit -m "feat: generate immediate Live2D gestures"
```

---

### Task 5: 运行时模型能力映射

**Files:**
- Create: `frontend_react/src/live2d/modelCapabilities.js`
- Create: `frontend_react/src/live2d/__tests__/modelCapabilities.test.js`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Produces: `buildModelCapabilityMap(coreModel, { modelName } = {}) -> ModelCapabilityMap`
- Produces: `ModelCapabilityMap.hasChannel(channel) -> boolean`
- Produces: `ModelCapabilityMap.project(frame) -> Array<{ id, value }>`
- Produces: `ModelCapabilityMap.projectLipSync({ mouth_open, mouth_form }) -> Array<{ id, value }>`
- Produces: `ModelCapabilityMap.projectBreath(value) -> Array<{ id, value }>`
- Produces: `ModelCapabilityMap.parameterIds: Set<string>`

- [ ] **Step 1: Write failing Cubism API-shape tests**

```javascript
it('不调用不存在的 getParameterId，并读取真实范围和默认值', () => {
  const coreModel = {
    _parameterIds: ['ParamAngleY', 'ParamEyeLOpen', 'ParamEyeROpen'],
    getParameterCount: () => 3,
    getParameterMinimumValue: vi.fn(index => [-30, 0, 0][index]),
    getParameterMaximumValue: vi.fn(index => [30, 1, 1][index]),
    getParameterDefaultValue: vi.fn(index => [0, 1, 1][index]),
  };
  const map = buildModelCapabilityMap(coreModel, { modelName: 'hiyori' });
  expect(map.hasChannel('head_pitch')).toBe(true);
  expect(map.project({ head_pitch: -0.5 })).toContainEqual({
    id: 'ParamAngleY',
    value: -15,
  });
});
```

Add cases for `coreModel._model.parameters.ids`, missing private fields, one range getter throwing, panda cheek fallback to `Param159`, and eye channels mapping to both eyes.

- [ ] **Step 2: Run the test and confirm RED**

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/modelCapabilities.test.js
```

- [ ] **Step 3: Implement guarded ID extraction**

Use only:

```javascript
function readParameterIds(coreModel) {
  if (Array.isArray(coreModel?._parameterIds)) return [...coreModel._parameterIds];
  const internalIds = coreModel?._model?.parameters?.ids;
  if (Array.isArray(internalIds)) return [...internalIds];
  return [];
}
```

Do not call `getParameterId`. If IDs cannot be read, use a model-specific fallback list containing only the semantic bindings required by P1.

- [ ] **Step 4: Implement normalized projection**

For each normalized value:

```javascript
const projected = normalized >= 0
  ? defaultValue + normalized * (maximumValue - defaultValue)
  : defaultValue + (-normalized) * (minimumValue - defaultValue);
```

Reject non-finite inputs and clamp the final value to `[minimumValue, maximumValue]`. Mouth and physics IDs are never part of external semantic bindings; internal lip and breath projection use dedicated reserved methods.

- [ ] **Step 5: Run tests, update checklist and commit**

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/modelCapabilities.test.js
git add -- frontend_react/src/live2d/modelCapabilities.js frontend_react/src/live2d/__tests__/modelCapabilities.test.js docs/功能清单.md
git commit -m "feat: map Live2D model capabilities"
```

---

### Task 6: 单一 `Live2DStateMixer`

**Files:**
- Create: `frontend_react/src/live2d/stateMixer.js`
- Create: `frontend_react/src/live2d/__tests__/stateMixer.test.js`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Produces: `createLive2DStateMixer({ clock } = {}) -> Live2DStateMixer`
- Produces: `mixer.enqueue(compiledMotion, receivedAtMs?) -> boolean`
- Produces: `mixer.sample({ nowMs, idle, emotion, blink, lipSync }) -> semantic frame`
- Produces: `mixer.reset()`
- Consumes: `CompiledMotion` from `compileMotionPlan`

- [ ] **Step 1: Write failing channel-priority tests**

```javascript
it('用户点头占用 head_pitch，但 AI 仍控制 gaze_x', () => {
  const mixer = createLive2DStateMixer({ clock: () => 1000 });
  mixer.enqueue(compiled('ai-1', 'ai_reply', {
    head_pitch: 0.6,
    gaze_x: 0.4,
  }), 1000);
  mixer.enqueue(compiled('user-1', 'user_command', {
    head_pitch: -0.5,
  }), 1000);

  const frame = mixer.sample({
    nowMs: 1500,
    idle: { head_pitch: 0.1 },
    emotion: {},
    blink: {},
    lipSync: { mouth_open: 0.8, mouth_form: -0.2 },
  });
  expect(frame.head_pitch).toBeCloseTo(-0.5);
  expect(frame.gaze_x).toBeCloseTo(0.4);
  expect(frame.mouth_open).toBe(0.8);
});
```

Add tests for same-ID rejection, same-source replacement, different-channel concurrency, fade-out returning to AI, additive clamping, expired cleanup and reset.

- [ ] **Step 2: Run the mixer test and confirm RED**

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/stateMixer.test.js
```

- [ ] **Step 3: Implement source priority and blending**

Use:

```javascript
const SOURCE_PRIORITY = {
  legacy_fallback: 15,
  local_micro_reaction: 20,
  ai_reply: 30,
  user_command: 40,
};
```

For each channel:

1. start from `idle`, then `emotion`;
2. apply active additive tracks in ascending priority;
3. select the highest-priority active override track;
4. apply automatic blink as a negative-only eye modifier;
5. force `mouth_open` and `mouth_form` from `lipSync`;
6. clamp semantic output to `-1～1`.

Blend weight:

```javascript
const inWeight = elapsed < blendInMs ? elapsed / blendInMs : 1;
const remaining = durationMs - elapsed;
const outWeight = remaining < blendOutMs ? remaining / blendOutMs : 1;
const weight = Math.max(0, Math.min(1, inWeight, outWeight));
```

- [ ] **Step 4: Add failure-isolation test**

Insert one compiled motion whose `sample()` throws and another healthy motion on a different channel. Assert the broken motion is removed, the healthy channel is returned, and the next call still succeeds.

- [ ] **Step 5: Run tests, update checklist and commit**

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/stateMixer.test.js
git add -- frontend_react/src/live2d/stateMixer.js frontend_react/src/live2d/__tests__/stateMixer.test.js docs/功能清单.md
git commit -m "feat: mix Live2D control layers"
```

---

### Task 7: 把 v2 意图动作转换为 v3 兼容计划

**Files:**
- Modify: `frontend_react/src/live2d/actionComposer.js`
- Modify: `frontend_react/src/live2d/__tests__/actionComposer.test.js`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Produces: `compileLegacyAction(event, currentModel, { nowMs, idFactory } = {}) -> CompiledMotion | null`
- Consumes: `normalizeMotionEvent` and `compileMotionPlan`
- Existing export `compileAction` remains as an alias during P1 to avoid breaking external imports.

- [ ] **Step 1: Rewrite tests around semantic output**

```javascript
it('把 v2 意图转换成 legacy_fallback 语义轨道且不包含嘴部', () => {
  const compiled = compileLegacyAction(shyHappyEvent, 'panda_cake', {
    nowMs: 1000,
    idFactory: () => 'legacy-1',
  });
  const frame = compiled.sample(0.5);
  expect(compiled.source).toBe('legacy_fallback');
  expect(frame).toHaveProperty('head_pitch');
  expect(frame).not.toHaveProperty('mouth_open');
  expect(frame).not.toHaveProperty('mouth_form');
});
```

Retain tests for deterministic seed, unknown model/intent rejection and 800ms safe duration.

- [ ] **Step 2: Run the action composer test and confirm RED**

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/actionComposer.test.js
```

- [ ] **Step 3: Replace physical frame names with semantic tracks**

Map:

```javascript
const LEGACY_TO_SEMANTIC = {
  headAngleX: 'head_yaw',
  headAngleY: 'head_pitch',
  bodyAngleZ: 'body_roll',
  eyeOpen: 'eye_open',
  cheek: 'cheek',
  smile: 'eye_smile',
  browAngle: 'brow_y',
};
```

Convert each selected v2 profile to a two- or three-keyframe v3 motion and pass it through the shared compiler. Keep the eight existing profiles only as compatibility fallback.

Use `source: "local_micro_reaction"` when the incoming event type is `local_micro_reaction`; use `source: "legacy_fallback"` for `live2d_action_v2`.

- [ ] **Step 4: Run tests, update checklist and commit**

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/actionComposer.test.js src/live2d/__tests__/motionProtocol.test.js
git add -- frontend_react/src/live2d/actionComposer.js frontend_react/src/live2d/__tests__/actionComposer.test.js docs/功能清单.md
git commit -m "refactor: adapt legacy Live2D actions to v3"
```

---

### Task 8: 用户发送入口和 WebSocket v3 去重

**Files:**
- Modify: `frontend_react/src/hooks/useUnaCore.js:5-20,123-135,294-310,492-498`
- Modify: `frontend_react/src/hooks/__tests__/useUnaCore.test.js`
- Modify: `frontend_react/src/App.jsx:38-45,124-130,185-190`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Consumes: `parseImmediateGesture`
- Consumes: `createImmediateMotion` and `createListeningMotion`
- Consumes: `normalizeMotionEvent`
- Produces: `motionEvent` in the `useUnaCore` return object
- Compatibility: temporarily also return `actionOverride: motionEvent`

- [ ] **Step 1: Add failing immediate-send tests**

After establishing the fake WebSocket:

```javascript
act(() => result.current.sendMessage('上下点头三次'));
expect(result.current.motionEvent).toMatchObject({
  type: 'live2d_motion_v3',
  source: 'user_command',
});
expect(result.current.motionEvent.tracks[0].channel).toBe('head_pitch');
expect(mockWebSocket.send).toHaveBeenCalledOnce();
```

Also assert:

- `sendMessage('不要点头')` produces `local_micro_reaction`, not a nod;
- the local motion is set before examining the WebSocket send call order;
- an unsupported sentence still gets the listening micro-reaction.

- [ ] **Step 2: Add failing WebSocket v3 tests**

```javascript
act(() => mockWebSocket.onmessage({
  data: JSON.stringify(validServerMotion({ motion_id: 'server-1' })),
}));
expect(result.current.motionEvent.motion_id).toBe('server-1');

const first = result.current.motionEvent;
act(() => mockWebSocket.onmessage({
  data: JSON.stringify(validServerMotion({ motion_id: 'server-1' })),
}));
expect(result.current.motionEvent).toBe(first);
```

Add an expired event and assert it is ignored. Use a bounded `Map<motionId, expiresAtMs>` and prune expired entries before the 100-entry capacity fallback.

- [ ] **Step 3: Run hook tests and confirm RED**

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/hooks/__tests__/useUnaCore.test.js
```

- [ ] **Step 4: Implement local-first send flow**

Inside `sendMessage`, before `websocket.send`:

```javascript
const nowMs = Date.now();
const command = parseImmediateGesture(text);
const localMotion = command
  ? createImmediateMotion(command, { nowMs })
  : createListeningMotion({ nowMs });
setMotionEvent(localMotion);
```

Handle `live2d_motion_v3` before reply messages. Normalize, reject expired/malformed events, then deduplicate by `motion_id`.

- [ ] **Step 5: Pass `motionEvent` through App**

Use:

```jsx
<Live2DViewer
  lipValue={lipValue}
  emotion={[...messages].reverse().find(message => message.isAI)?.emotion}
  motionEvent={motionEvent}
/>
```

Do not add another UI control.

- [ ] **Step 6: Run tests, update checklist and commit**

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/hooks/__tests__/useUnaCore.test.js
git add -- frontend_react/src/hooks/useUnaCore.js frontend_react/src/hooks/__tests__/useUnaCore.test.js frontend_react/src/App.jsx docs/功能清单.md
git commit -m "feat: dispatch immediate Live2D commands"
```

---

### Task 9: 将控制器收敛到能力表和单一状态混合器

**Files:**
- Modify: `frontend_react/src/hooks/useLive2DController.js:1-596`
- Modify: `frontend_react/src/hooks/__tests__/useLive2DController.test.js`
- Modify: `frontend_react/src/components/Live2DViewer.jsx:7,194-205`
- Modify: `frontend_react/src/components/__tests__/Live2DViewer.test.jsx`
- Modify: `docs/功能清单.md`

**Interfaces:**
- Consumes: `motionEvent`
- Consumes: `buildModelCapabilityMap`
- Consumes: `createLive2DStateMixer`
- Consumes: `compileMotionPlan` and `compileLegacyAction`
- Writes: only parameter IDs returned by `ModelCapabilityMap.project()` plus reserved breath/lip mappings

- [ ] **Step 1: Replace the fake CoreModel with its real API shape**

In hook tests, provide:

```javascript
const ids = [
  'ParamAngleX', 'ParamAngleY', 'ParamAngleZ',
  'ParamBodyAngleX', 'ParamBodyAngleY', 'ParamBodyAngleZ',
  'ParamEyeLOpen', 'ParamEyeROpen',
  'ParamEyeBallX', 'ParamEyeBallY',
  'ParamMouthOpenY', 'ParamMouthForm', 'ParamBreath',
];
const coreModel = {
  _parameterIds: ids,
  getParameterCount: () => ids.length,
  getParameterMinimumValue: index => ids[index].includes('Open') ? 0 : -30,
  getParameterMaximumValue: index => ids[index].includes('Open') ? 1 : 30,
  getParameterDefaultValue: index => ids[index].includes('Eye') ? 1 : 0,
  setParameterValueById: vi.fn(),
};
```

Do not add `getParameterId`.

- [ ] **Step 2: Write failing integration tests**

Cover:

1. v3 `head_pitch` writes `ParamAngleY`;
2. user command and AI action on different channels both write;
3. a motion cannot write mouth parameters;
4. TTS still writes `ParamMouthOpenY` and `ParamMouthForm`;
5. model switch resets mixer and rebuilds capability map;
6. one sampled track throwing does not stop the next ticker frame;
7. all written values are finite and within fake model ranges.

Example:

```javascript
expect(coreModel.setParameterValueById)
  .toHaveBeenCalledWith('ParamAngleY', expect.any(Number));
expect(coreModel.setParameterValueById.mock.calls
  .filter(([id]) => id === 'ParamMouthOpenY').at(-1)[1]).toBeGreaterThan(0);
```

- [ ] **Step 3: Run focused tests and confirm RED**

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/hooks/__tests__/useLive2DController.test.js
```

- [ ] **Step 4: Replace parameter sniffing**

Delete the `getParameterId` probe and hardcoded “read any ID” detection. When the model becomes available:

```javascript
capabilityMapRef.current = buildModelCapabilityMap(coreModel, {
  modelName: currentModel,
});
mixerRef.current.reset();
```

Clear the retry timer on effect cleanup.

- [ ] **Step 5: Route every new event into the mixer**

```javascript
if (motionEvent?.type === 'live2d_motion_v3') {
  const normalized = normalizeMotionEvent(motionEvent, { nowMs: Date.now() });
  const compiled = normalized && compileMotionPlan(normalized);
  if (compiled) mixerRef.current.enqueue(compiled, Date.now());
} else if (
  motionEvent?.type === 'live2d_action_v2'
  || motionEvent?.type === 'local_micro_reaction'
) {
  const compiled = compileLegacyAction(motionEvent, currentModel);
  if (compiled) mixerRef.current.enqueue(compiled, Date.now());
}
```

Keep old `chat_action` execution in an isolated compatibility adapter; it must not be able to override the mouth.

- [ ] **Step 6: Build normalized base layers per frame**

The ticker prepares:

```javascript
const semanticFrame = mixerRef.current.sample({
  nowMs: Date.now(),
  idle: {
    head_yaw: normalizedHeadYaw,
    head_pitch: normalizedHeadPitch,
    body_yaw: normalizedBodyYaw,
    body_pitch: normalizedBodyPitch,
    body_roll: normalizedBodyRoll,
  },
  emotion: {
    eye_open: normalizedEyeOpen,
    eye_smile: normalizedEyeSmile,
    brow_y: normalizedBrowY,
    brow_form: normalizedBrowForm,
    cheek: normalizedCheek,
  },
  blink: { eye_open: normalizedBlinkModifier },
  lipSync: {
    mouth_open: mappedOpenY,
    mouth_form: mappedForm,
  },
});
```

Project semantic channels once, then call `projectBreath()` and `projectLipSync()` for internal reserved layers. Validate every output with `Number.isFinite` before `setParameterValueById`. Remove `isActionOverridingMouth` and every action-origin mouth write.

- [ ] **Step 7: Update `Live2DViewer` prop and regression test**

Rename the prop from `actionOverride` to `motionEvent` and pass it to the controller. Keep the existing assertion that model load and emotion changes never call `model.motion()` or `model.expression()`.

- [ ] **Step 8: Run all frontend tests**

```powershell
& 'D:\ai\Node\npx.cmd' vitest run
```

Expected: all old and new frontend tests pass; Vitest exits successfully.

- [ ] **Step 9: Update checklist and commit**

```powershell
git add -- frontend_react/src/hooks/useLive2DController.js frontend_react/src/hooks/__tests__/useLive2DController.test.js frontend_react/src/components/Live2DViewer.jsx frontend_react/src/components/__tests__/Live2DViewer.test.jsx docs/功能清单.md
git commit -m "feat: unify Live2D runtime state mixing"
```

---

### Task 10: 完整回归、生产构建、发布和人工验收准备

**Files:**
- Modify: `docs/功能清单.md`
- Modify: `backend/static/mobile/index.html`
- Create or Modify: `backend/static/mobile/assets/index-*.js`
- Build output: `frontend_react/dist/**`

**Interfaces:**
- Consumes: all P1 modules
- Produces: browser/HBuilderX-compatible production assets

- [ ] **Step 1: Run complete backend tests**

```powershell
& 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend/tests -q
```

Expected: existing 49 tests plus new P1 tests all pass.

- [ ] **Step 2: Run complete frontend tests**

```powershell
Set-Location frontend_react
& 'D:\ai\Node\npx.cmd' vitest run
Set-Location ..
```

Expected: existing 12 tests plus new P1 tests all pass.

- [ ] **Step 3: Build frontend**

```powershell
Set-Location frontend_react
& 'D:\ai\Node\npm.cmd' run build
Set-Location ..
```

Expected: Vite exits with code 0 and `frontend_react/dist/index.html` references an existing hashed JS asset.

- [ ] **Step 4: Publish production assets**

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\publish_frontend.ps1
```

Verify the published entry and referenced files:

```powershell
$html = Get-Content -LiteralPath 'backend/static/mobile/index.html' -Raw -Encoding UTF8
$asset = [regex]::Match($html, 'assets/[^"]+\.js').Value
if (-not $asset) { throw 'Published index has no JS asset' }
if (-not (Test-Path -LiteralPath (Join-Path 'backend/static/mobile' $asset))) {
  throw "Missing published asset: $asset"
}
```

- [ ] **Step 5: Run static safety searches**

```powershell
rg -n "getParameterId\(" frontend_react/src
rg -n "mouth_open|mouth_form|ParamMouthOpenY|ParamMouthForm|JAW" backend/live2d_motion.py frontend_react/src/live2d/gestureGenerator.js
```

Expected:

- no runtime call to nonexistent `getParameterId`;
- backend allow-list and gesture generator contain no mouth control;
- mouth names may appear only in explicit rejection assertions or reserved lip code.

- [ ] **Step 6: Perform browser acceptance**

Start the backend using the project’s working Python environment, open the built frontend, and execute:

1. 10 ordinary text conversations;
2. “上下点头三次”;
3. “慢慢摇头两次并眨眼”;
4. “不要点头”;
5. switch between panda_cake and Hiyori;
6. reconnect WebSocket and verify an old `motion_id` is not replayed;
7. background and restore the browser tab.

Record each observed result in `docs/功能清单.md`. Do not mark a scenario passed without observing it.

- [ ] **Step 7: Leave Android acceptance pending**

Keep the HBuilderX Android APK checkbox unchecked and state that it requires user device confirmation.

- [ ] **Step 8: Run final diff and regression checks**

```powershell
git diff --check
git status --short
& 'D:\ai\GPT文件\GPT-SoVITS\GPT-SoVITS\runtime\python.exe' -m pytest backend/tests -q
Set-Location frontend_react
& 'D:\ai\Node\npx.cmd' vitest run
& 'D:\ai\Node\npm.cmd' run build
Set-Location ..
```

- [ ] **Step 9: Update checklist and commit build**

Mark only automated checks and actually observed browser checks complete.

```powershell
git add -- frontend_react/dist backend/static/mobile docs/功能清单.md
git commit -m "build: publish P1 Live2D motion runtime"
```

- [ ] **Step 10: Request code review before completion**

Invoke `superpowers:requesting-code-review`. Address confirmed findings, rerun all affected tests, then use `superpowers:verification-before-completion` before making any completion claim.

Do not merge to `main`. Report the feature branch, commits, automated evidence, browser evidence and remaining Android device acceptance to the user.
