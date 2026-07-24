# Una 系统更新方案 (SDD+TDD)

> 文档日期：2026-07-21  
> 分支：`main`  
> 遵守原则：规范驱动开发 (SDD) + 测试驱动开发 (TDD)

---

## 一、大模型动作导演模式与零延迟姿态引擎

### 目标
彻底抛弃固定动画文件，让 LLM 在生成文本时**先输出动作标签**，后端截流标签通过 WebSocket 直推前端，前端通过参数插值实时驱动 Live2D，实现"情绪先于声音"。

### 1.1 [MODIFY] `backend/brain_engine.py` — Prompt 改造 + 动作标签截流

**现状**：`chat_stream` 方法的 system_prompt 首行格式为：
```
EMOTION: [happy/sad/...] | MOOD: [-5~5]
```
当前代码在匹配到 EMOTION/MOOD 后，会剔除控制文本，然后直接进入句段分发。Motion 动作触发由 `main_server.py` 的 `process_and_push_response` 收到 `meta` 事件后调用 `emotion_mapper.get_motion_file()` 发送 `final_reply` 类型消息——这与流式推送节奏不完全同步。

**要改**：

1. **Prompt 格式升级**：LLM 在每句话（sentence）之前，必须输出一个动作标签行，格式改为：
   ```
   [动作:惊讶, 头左偏] 哇！你来了！
   ```
   即每句 = **动作标签 + 正文**。system_prompt 调整为：
   - 第一行仍然是 `EMOTION: [emotion] | MOOD: [score]`（全局情绪）
   - 后续每句话前面加 `[动作:xxx, yyy]`（可选，无则默认）
   - 支持的动作维度：`惊讶/开心/难过/害羞/思考/生气/困惑/期待`
   - 支持的头部/身体方向：`头左偏/头右偏/头低下/头抬起/身体左倾/身体右倾/身体前倾`

2. **流式截流逻辑增强**：在 `chat_stream` 中新增正则：
   ```python
   action_pattern = re.compile(r'\[动作:([^\]]+)\]')
   ```
   - 每当 buffer 中匹配到 `[动作:...]`，提取动作描述，**不发给 TTS**
   - 立刻 `yield {"type": "chat_action", "action": "surprised", "head_tilt": "left"}` 
   - 前端通过 WebSocket 收到 `chat_action` 事件后立即触发 Live2D 微表情
   - 动作标签之后的正文字符才进入句段截流逻辑

3. **WebSocket 事件新增类型** `chat_action`：
   ```json
   {"type": "chat_action", "action": "surprised", "params": {"head_tilt": "left"}}
   ```

**TDD 验证**：
- 单元测试：输入含 `[动作:惊讶, 头左偏] 哇！` 的 buffer，断言 yield 出 `chat_action` 且 text 不含标签
- 集成测试：发送一条消息，断言 WebSocket 先收到 `chat_action`，再收到 `text_stream_chunk`

---

### 1.2 [MODIFY] `frontend_react/src/components/Live2DViewer.jsx` — 参数动态映射

**现状**：Live2D 通过 `emotion` props 触发预设 Motion/Expression，是离散式、全量切换。

**要改**：**Parametric Mixer（参数混合器）**：
1. 在 `useLive2DController.js` 中新增一个**临时动作注入通道** `actionOverrideRef`：
   ```js
   const actionOverrideRef = useRef(null);
   // { targetParams: { ParamAngleY: 0.3, ... }, duration: 800, startTime: 0 }
   ```
2. 当 WebSocket 收到 `chat_action` → App.jsx 传递 `actionOverride` props 到 Live2DViewer → useLive2DController
3. Ticker 中新增 Layer 2.5：在 Lerp 平滑层之后、参数写入层之前，叠加 actionOverride 的目标参数，使用 easeOutCubic 缓动在 800ms 内完成，超时后自动清除
4. 支持的参数映射（动作标签 → Live2D 参数）：
   | 动作标签 | Live2D 参数变化 |
   |---------|----------------|
   | 惊讶 | ParamEyeLOpen=1.0, ParamEyeROpen=1.0, ParamMouthOpenY=0.6, ParamAngleY=-5 |
   | 头左偏 | ParamAngleZ=+8 |
   | 头右偏 | ParamAngleZ=-8 |
   | 头低下 | ParamAngleY=-10 |
   | 害羞 | ParamCheek=0.7, ParamAngleY=-3 |
   | 开心 | ParamAngleZ=Math.sin 摇摆 + ParamMouthForm=0.4 |

**关键**：此注入不影响 Layer 5 的口型同步覆写——嘴型仍由 TTS 音素驱动。动作只操纵身体轴 + 眼睛 + 红晕。

**TDD 验证**：
- 模拟 `chat_action` 事件，断言 800ms 内模型参数发生预期变化
- 验证口型同步（ParamMouthOpenY）不被动作覆盖

---

### 1.3 [MODIFY] `frontend_react/src/hooks/useUnaCore.js` + `App.jsx` — chat_action 事件对接

**现状**：WebSocket onmessage 处理 `text_stream_chunk`、`audio_stream_chunk`、`final_reply` 等类型，但未处理动作事件。

**要改**：
1. `useUnaCore.js` 的 ws.onmessage 中新增 `chat_action` case，触发回调
2. App.jsx 中新增 `actionOverride` state，传递给 Live2DViewer
3. 同时将 `emotion` 改为从 `chat_action` 或 `meta` 事件的 `emotion` 字段获取（而非仅靠 `messages` 的最新 AI 消息反查）

---

## 二、纯代码驱动的被动陪伴与动态环境

### 目标
挂机时无需 LLM，纯前端代码驱动 Live2D 展现生活节奏。根据本地时间自动调节界面光影。

### 2.1 [MODIFY] `frontend_react/src/components/Live2DViewer.jsx` — 待机状态机

**现状**：无待机逻辑。用户不说话，Una 就静止（仅有呼吸+眨眼）。

**要改**：

1. **新增 `useIdleState` hook**（写入 Live2DViewer.jsx 或独立文件）：
   ```js
   // 状态机：ACTIVE → IDLE_1 (3min无言) → IDLE_2 (8min无言) → IDLE_3 (15min无言)
   const IDLE_STAGES = {
     ACTIVE:   { threshold: 0,     label: '活跃' },
     IDLE_1:   { threshold: 180,   label: '东张西望',    duration: Infinity },
     IDLE_2:   { threshold: 480,   label: '打瞌睡',      duration: Infinity },
     IDLE_3:   { threshold: 900,   label: '听歌',        duration: Infinity },
   };
   ```

2. **各阶段行为（纯 Math.sin 驱动）**：
   - **IDLE_1 (东张西望)**：`ParamEyeBallX += sin(time * 0.7) * 0.02`，眼球左右慢移；`ParamAngleZ += sin(time * 0.3) * 2`，身体轻晃
   - **IDLE_2 (打瞌睡)**：`ParamEyeLOpen` 周期性从 0.75 降到 0.2 再弹回（频率 ~0.15Hz，模拟钓鱼）；`ParamAngleY` 缓慢加大低头角度；偶尔触发一个"惊醒"动作
   - **IDLE_3 (听歌)**：`ParamAngleZ` 以 0.8Hz 正弦摇摆（幅度 ~5°）；`ParamAngleY` 轻点头（0.5Hz）；如果是 panda_cake，触发 Param170（爱心眼）间歇闪烁

3. **退出待机**：用户发送任意消息 → WebSocket 收到 → 重置 idle timer → 状态机回到 ACTIVE

4. **与 chat_action 共存**：待机参数写入 Layer 2.5（在情感 Lerp 之后、动作 Override 之前），优先级：口型 > 动作注入 > 待机行为 > 情感基础

**TDD 验证**：
- 模拟 4 分钟无言，断言进入 IDLE_2（打瞌睡），眼参数降到 < 0.4
- 发送消息后断言状态机回到 ACTIVE，眼参数恢复正常

---

### 2.2 [MODIFY] `frontend_react/src/App.jsx` — 环境光影滤镜

**现状**：背景图固定，无时间感知。

**要改**：

1. **新增 `useAmbientLight` hook**：
   ```js
   function useAmbientLight() {
     const [overlay, setOverlay] = useState({ r: 255, g: 220, b: 180, alpha: 0.15 });
     
     useEffect(() => {
       const update = () => {
         const h = new Date().getHours();
         // 清晨 5-7: 暖黄
         // 上午 7-10: 柔和白
         // 正午 10-16: 亮白
         // 傍晚 16-19: 橙红
         // 夜晚 19-22: 暗蓝紫
         // 深夜 22-5: 深蓝冷色
         if (h >= 5 && h < 7)  setOverlay({ r: 255, g: 200, b: 100, alpha: 0.20 });
         else if (h >= 7 && h < 10) setOverlay({ r: 255, g: 235, b: 200, alpha: 0.10 });
         else if (h >= 10 && h < 16) setOverlay({ r: 255, g: 250, b: 240, alpha: 0.05 });
         else if (h >= 16 && h < 19) setOverlay({ r: 255, g: 160, b: 80, alpha: 0.25 });
         else if (h >= 19 && h < 22) setOverlay({ r: 80, g: 100, b: 180, alpha: 0.30 });
         else setOverlay({ r: 30, g: 40, b: 100, alpha: 0.40 });
       };
       update();
       const timer = setInterval(update, 60000); // 每分钟检查
       return () => clearInterval(timer);
     }, []);
     
     return overlay;
   }
   ```

2. **渲染**：在 App.jsx 的客厅场景中，Live2DViewer 之下叠加一个全屏 div：
   ```jsx
   <div style={{
     position: 'fixed', inset: 0, zIndex: 5, pointerEvents: 'none',
     backgroundColor: `rgba(${overlay.r},${overlay.g},${overlay.b},${overlay.alpha})`,
     mixBlendMode: 'multiply',
     transition: 'background-color 30s ease-in-out'
   }} />
   ```
   使用 CSS `mix-blend-mode: multiply` 实现自然的光影混合。

3. **光影渐变**：使用 30s CSS transition 平滑切换，避免突变。

**TDD 验证**：
- 模拟不同时间，断言 overlay 颜色和透明度正确
- 视觉回归：截图对比清晨/正午/深夜

---

## 三、专属信箱与手写字体（"欲言又止"的情感系统）

### 目标
Una 可以主动写信给用户，支持手写字体渲染和"划掉"涂黑特效，制造欲言又止的情感氛围。

### 3.1 [NEW] `frontend_react/src/components/LetterBox.jsx` — 信箱 UI

**要改**：全新组件，包含：
1. **信封入口**：在客厅场景（App.jsx）中新增一个小信箱图标（📬），点击后进入信件列表
2. **信件列表**：展示所有来自 Una 的信件，未读的显示红色封蜡动画
3. **信件阅读页**：信封撕开动画 → 信纸展开 → 内容渲染
4. **手写字体**：通过 `@font-face` 引入拟真中文字体（如 "ZCOOL XiaoWei" 或自备手写体 .ttf），在 `index.html` 中声明：
   ```css
   @font-face {
     font-family: 'HandWrite';
     src: url('/assets/fonts/handwrite.otf') format('opentype');
   }
   ```
5. **纸张纹理背景**：CSS 渐变模拟泛黄信纸：
   ```css
   .letter-paper {
     background: linear-gradient(135deg, #f5f0e8 0%, #ede4d3 50%, #f0e8d8 100%);
     box-shadow: inset 0 0 30px rgba(139, 119, 90, 0.15);
     font-family: 'HandWrite', 'KaiTi', serif;
   }
   ```
6. **划掉涂黑特效**：前端解析特定标记 `~~被划掉的内容~~`：
   - 正则匹配 `~~(.*?)~~` 
   - 渲染时不显示原文字，而是显示一个**黑色墨迹涂块**（用 Canvas 生成随机墨迹形状的 SVG/CSS）
   - 涂黑块的宽度 = 原文字宽度 * 1.1
   - 附加一个"墨迹渗透纸张"的 CSS box-shadow
   - 鼠标 hover 时，用 tooltip 显示被划掉的内容（"忍不住想知道她写了什么"）

   实现伪代码：
   ```jsx
   function LetterContent({ text }) {
     const parts = text.split(/(~~.*?~~)/g);
     return parts.map((part, i) => {
       if (part.startsWith('~~') && part.endsWith('~~')) {
         const hidden = part.slice(2, -2);
         return (
           <span key={i} className="scribbled-out" title={hidden}>
             <svg width={hidden.length * 18} height="24" className="ink-blot">
               {/* 随机墨迹形状 */}
               <path d={generateInkPath(hidden.length)} fill="#1a1a1a" opacity="0.85" />
             </svg>
           </span>
         );
       }
       return <span key={i}>{part}</span>;
     });
   }
   ```

**TDD 验证**：
- 渲染含 `~~不能说~~` 的文本，断言出现涂黑块且不显示原文
- hover 涂黑块，断言 tooltip 显示"不能说"

---

### 3.2 [NEW] `backend/letter_service.py` — 书信服务

**要改**：全新后端模块。

1. **数据模型**（在 `una_memory.db` 新增表 `una_letters`）：
   ```sql
   CREATE TABLE IF NOT EXISTS una_letters (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id TEXT NOT NULL,
     title TEXT,
     content TEXT NOT NULL,     -- 含 ~~划掉标记~~ 的原文
     affection_level REAL DEFAULT 0.5, -- 写信时好感度
     is_read INTEGER DEFAULT 0,
     trigger_reason TEXT,       -- 'scheduled' / 'affection_high' / 'event'
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Prompt 设计**（`LetterService.generate_letter`）：
   ```
   你是 Una，正在给用户写一封私人信件。
   当前好感度：{affection}
   信件要求：
   1. 像少女写秘密信件一样，语气温暖、略带羞涩
   2. 如果情绪激动或想掩饰什么，故意写半个词然后用 ~~划掉~~ 标记
      - 例如："我其实~~有一点~~很想你"
   3. 字数 80-150 字
   4. 返回 JSON: {"title": "...", "content": "...", "mood": "..."}
   ```

3. **触发条件**：
   - **定时触发**：每 3 天一次（APScheduler，随机时间 14:00-18:00 之间），仅当好感度 > 0.6
   - **好感度触发**：当 `affection_level` 跨过 0.7 阈值时，立刻生成一封
   - **事件触发**：用户生日、特殊节日

4. **好感度计算**：基于对话频率、情绪分均值、互动天数等，在 `brain_engine.py` 或独立函数中计算

5. **API 端点**：
   - `GET /api/letters?user_id=xxx` — 获取用户的所有信件
   - `GET /api/letters/{letter_id}` — 获取单封信件（标记已读）
   - `POST /api/letters/generate` — 手动触发生成（调试用）

**TDD 验证**：
- 调用 generate_letter，断言返回的 content 包含 `~~` 标记
- 写入数据库后，GET /api/letters 返回正确列表

---

## 四、AI 独立生活生态与隔离朋友圈

### 目标
每个用户的 Una 朋友圈完全隔离；用户离线时 Una 自主与虚拟 NPC 互动。

### 4.1 [MODIFY] `backend/social_api.py` + `backend/social_db.py` — 多租户隔离

**现状**：`una_posts` 表无 user_id 隔离字段，所有用户共享同一个朋友圈 Feed。`get_feed` 无过滤，`social_db` 无租户概念。

**要改**：

1. **数据库层**：`una_posts` 表新增 `owner_user_id TEXT` 字段（代表"属于哪个用户的 Una"）
   ```sql
   ALTER TABLE una_posts ADD COLUMN owner_user_id TEXT DEFAULT '';
   ```

2. **所有读操作绑定 user_id**：
   - `get_feed(page, page_size, user_id)` → SQL 加 `WHERE owner_user_id = ?`
   - `create_post` 自动填入 `owner_user_id = author_id`（当 author_type='user'）
   - AI 发帖时，`owner_user_id` = 目标用户 ID

3. **API 层**：所有 GET 接口强制要求 `user_id` query param：
   ```
   GET /api/social/feed?user_id=mingdao&page=1
   ```

4. **前端的 SocialFeed 调用**已在 App.jsx 中传递 `currentUserId`，只需确保 API 调用带上。

5. **好友系统**也需隔离：`friends` 表新增 `owner_user_id`，或改成 (owner_user_id, user_id, friend_id) 的复合约束。

**TDD 验证**：
- 用户 A 发帖 → 用户 B 的 Feed 中不出现 A 的帖子
- AI 为用户 A 发帖 → 用户 B 的 Feed 中不出现

---

### 4.2 [MODIFY] `backend/main_server.py` — 后台代理社交引擎

**现状**：已有 `scheduled_social_post_job`（AI 发朋友圈）。但缺乏 NPC 互动。

**要改**：

1. **新增虚拟 NPC 池**（在 `social_db.py` 或配置文件中）：
   ```python
   VIRTUAL_NPCS = [
     {"id": "npc_xiaomei", "name": "小美", "personality": "开朗", "avatar": "..."},
     {"id": "npc_dashu",  "name": "大树", "personality": "文艺", "avatar": "..."},
     {"id": "npc_laowang", "name": "老王", "personality": "幽默", "avatar": "..."},
     {"id": "npc_lingling", "name": "玲玲", "personality": "温柔", "avatar": "..."},
     {"id": "npc_akai", "name": "阿凯", "personality": "热血", "avatar": "..."},
   ]
   ```
   这些 NPC 在数据库中以 `author_type='npc'` 存在，每个 NPC 有自己的朋友圈动态池。

2. **新增 `scheduled_npc_interaction_job`**：
   - 每 1-2 小时触发（随机间隔）
   - 对每个在线/离线用户：
     a. Una 随机选择一个 NPC 的朋友圈帖子
     b. 生成评论或点赞（用模板 + 少量随机化）
     c. 写入 `una_comments` 和 `una_post_likes`
   - 用户下次打开朋友圈时，看到 Una 在别人帖子下的互动痕迹

3. **NPC 内容池**：预置 20+ 条 NPC 朋友圈（鸡汤、美食、风景、碎碎念等），每天随机选发，供 Una 互动

4. **调度器注册**：
   ```python
   scheduler.add_job(
     scheduled_npc_interaction_job,
     CronTrigger(minute="0,30", timezone="Asia/Shanghai"),  # 每30分钟
     id="npc_interaction",
   )
   ```

**TDD 验证**：
- 用户离线 2 小时后登录，Feed 中可见 Una 的互动记录（时间戳在过去 2 小时内）
- NPC 内容不重复

---

## 五、实时伴随视觉与全双工 AI 电话（进阶）

### 目标
摄像头静默感知环境变化触发主动语音；全双工对讲替代按键说话。

### 5.1 [MODIFY] `frontend_react/src/hooks/useVision.js` — 静默抽帧

**现状**：只有手动触发 `takePhoto` / `pickImage`。

**要改**：

1. **新增 `startSilentCapture` / `stopSilentCapture` 函数**：
   ```js
   // 每 60 秒静默捕获一帧，不打扰用户
   function startSilentCapture(onFrameCallback) {
     // 使用隐藏的 <video> + canvas 抽帧
     // 仅当用户已授权摄像头且在陪伴模式（idle）下工作
   }
   ```

2. **轻量分析**：发送到后端的 `/api/vision_chat` 但使用精简 prompt（"一句话描述环境变化"），不生成完整对话回复，仅触发条件判断：
   - 光照突变 → "天都黑了呢，要开灯吗？"
   - 检测到人脸微笑 → 不做声（不打扰）
   - 检测到多人 → "有朋友来了吗？"
   - 环境安静超过阈值 → 不触发

3. **隐私**：静默抽帧仅在客户端完成压缩和 hash 比对（感知哈希），只有**变化帧**才上传。不上传则不消耗 token。

4. **开关**：在设置面板中可关闭"环境感知"。

**TDD 验证**：
- 模拟 2 分钟静默，断言至少调用了 1 次抽帧
- 模拟相同帧（hash 不变），断言不触发上传

---

### 5.2 [NEW] `frontend_react/src/components/PhoneCall.jsx` — 全双工 AI 电话

**现状**：按住说话松手识别（`onMouseDown → startRecording, onMouseUp → stopRecording + ASR`）。

**要改**：全新组件，模拟真实电话。

1. **引入 VAD 库**：使用 `@ricky0123/vad-web`（ONNX 运行时，浏览器端实时 VAD），在 `package.json` 中添加依赖

2. **全双工流程**：
   ```
   用户点击"打电话" → 接通盲音（0.8s）→ Una 接听 → 开始全双工
   
   通话中：
   - 用户说话 → VAD 检测 voice start → 后台实时 ASR（流式分段发送）
   - 用户停 > 0.8s → VAD 检测 voice end → 触发 LLM 回复
   - Una 回复时 → WebSocket 正常流式推送 text + audio
   - 用户可以在 Una 说话时插话 → VAD 检测到 voice → interrupt
   ```

3. **UI**：
   - 电话接听界面：Una 头像 + 通话波形动画 + 挂断按钮
   - 接通盲音：播放 0.8s 的"嘟嘟"音频
   - 真实底噪：在通话期间播放低保真环境底噪（咖啡馆/夜晚），用 Web Audio API 的 NoiseGenerator
   - 通话计时器

4. **与现有 WebSocket 复用**：PhoneCall 使用同一个 WS 连接，新增 `type: "phone_start"` / `"phone_end"` 事件

5. **入口**：在 App.jsx 客厅场景新增电话图标按钮（📞），位于输入栏旁边

**TDD 验证**：
- VAD 检测到语音 → 断言回调触发
- 插话时断言 interrupt 发送成功
- 挂断后断言 WebSocket 发送 `phone_end`

---

## 实施优先级

| 优先级 | 模块 | 理由 |
|-------|------|------|
| P0 | 一 (动作导演) | 核心体验突破，改动相对小 |
| P0 | 四 (多租户隔离) | 数据安全，不隔离无法上线 |
| P1 | 二 (待机+光影) | 纯前端，无后端风险 |
| P1 | 三 (信箱) | 新增功能，不影响现有流程 |
| P2 | 五 (视觉+电话) | 依赖外部库，复杂度高 |

---

## 风险与注意事项

1. **Live2D 参数冲突**：动作注入、待机行为、情感驱动、口型同步四层同时写入，必须在 Ticker 中严格分层，确保口型 > 动作 > 待机 > 情感。
2. **SQLite 并发**：新增 NPC 互动定时任务可能在用户请求时同时写库，需确保 WAL 模式已开启。
3. **手写字体体积**：中文字体文件通常 3-8MB，建议使用子集化工具（font-spider）剪裁只保留常用 3000 字。
4. **VAD 跨浏览器兼容**：`@ricky0123/vad-web` 依赖 WebAssembly + AudioWorklet，需测试移动端 Safari 兼容性。

---

## 下一步

请逐条确认以上方案，我会根据反馈调整后进入 TDD 开发阶段。
