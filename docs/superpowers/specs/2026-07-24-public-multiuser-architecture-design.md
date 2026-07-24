# UNA 公网多用户架构设计

## 目标

将 UNA 从“由客户端传入用户 ID 的本地应用”演进为面向 APK 用户的公网服务。每位已注册用户无论通过什么网络、使用什么设备访问同一后端，都只能看到自己的对话、记忆、日记、私有 UNA 朋友圈、音频和图片。

## 范围

首个公网版本支持用户名与密码注册、登录。它不支持真人好友、跨用户朋友圈、密码找回、邮箱验证和第三方登录。每位用户的朋友圈只包含该用户及其专属 UNA。

## 全局约束

- 保持 FastAPI、React/Vite、SQLite、ChromaDB、HBuilder APK 打包和现有 Live2D/音频链路。
- 所有受保护的 HTTP 和 WebSocket 请求身份均由服务端验证；客户端不得决定实际生效的用户 ID。
- 现有 `default`、`mobile_user` 等本地历史数据必须能迁移到第一个正式注册账户。
- 公网部署通过反向代理提供 HTTPS 与 WSS；在 SQLite 和内存连接票据仍被使用时，仅运行一个 Uvicorn worker。
- 测试必须使用临时 SQLite 和临时 ChromaDB 路径，绝不能修改 `backend/una_memory.db`。

## 认证与会话模型

### 账户记录

使用不可变 UUID 作为内部用户 ID。保存大小写不敏感且唯一的用户名、Argon2id 密码哈希、`is_active` 和时间戳。现有 SHA-256 密码数据不用于新的认证体系；已有本地数据通过管理员明确选择的映射迁移。

新增刷新会话表，仅保存随机刷新令牌的哈希、用户 ID、过期时间、创建时间、撤销时间和可选设备名称。刷新令牌轮换时，撤销已使用记录并创建替代记录。

### 令牌

- Access Token：签名 JWT，有效期 15 分钟，携带用户 UUID 和 `access` 类型。
- Refresh Token：随机不透明字符串，有效期 30 天，只用于刷新或登出接口，服务端仅保存其哈希。
- WebSocket Ticket：一次性随机字符串，有效期 60 秒，绑定已认证用户，并在成功建立 WebSocket 后立即消费。

APK 将短期 Access Token 保存在内存，将 Refresh Token 经由平台安全存储适配层保存。长期凭据不得明文放在浏览器 `localStorage` 中。

### API 契约

- `POST /api/auth/register`：验证用户名和密码，创建账户并返回 Access/Refresh Token 对。
- `POST /api/auth/login`：验证账号密码并返回 Token 对。
- `POST /api/auth/refresh`：轮换有效 Refresh Token 并返回新的 Token 对。
- `POST /api/auth/logout`：撤销当前 Refresh Token。
- `GET /api/auth/me`：返回当前已认证账户资料。
- `POST /api/auth/ws-ticket`：要求有效 Access Token，返回一次性 WebSocket Ticket。

HTTP 请求使用 `Authorization: Bearer <access token>`。WebSocket 连接只在查询参数中使用短期一次性 Ticket，不把 Access Token 或 Refresh Token 放进 URL。

注册和登录需要按 IP 与用户名限制频率。响应不得暴露“用户名不存在”还是“密码错误”。

## 授权与数据隔离

新增 `CurrentUser` FastAPI 依赖，用于验证 Access Token 并返回数据库用户。每个受保护路由只能通过该依赖获取实际用户 ID。

移除或忽略客户端提交的 `user_id`、`owner_user_id`、`author_id` 以及由客户端控制的 AI 作者类型；这些字段均由服务端基于 `CurrentUser` 推导。

所有 SQLite 读写均按用户 UUID 过滤；ChromaDB collection 名称由 UUID 派生。定时日记和 UNA 自动发圈任务遍历有效注册用户，但每次操作始终处于该用户自己的数据范围中。

朋友圈默认私有：帖子使用 `owner_user_id = CurrentUser.id`。用户只能创建自己的动态，读取自己的动态以及其专属 UNA 在相同 owner 下生成的动态。好友和跨用户资料查询接口不向 APK 公开。

## 私有媒体

公开静态托管仅保留 React 构建产物、Live2D 模型、背景图等非用户资源。用户音频、日记图片和社交上传图片均通过受保护的媒体 API 提供。

每条媒体记录包含 owner UUID、媒体类型、文件路径和创建时间。媒体端点在流式返回文件前验证 `CurrentUser.id`。聊天历史和日记接口返回经过认证的媒体 URL，而不再暴露原始 `/static/voice/...` 路径。

音频维护任务仅删除超过保留期且未被聊天记录引用的媒体；无论成功或失败，都必须清理临时 WAV 和 Rhubarb JSON 文件。日记图片在有用户可见的保留策略前不自动删除。

## 对话与实时协议

### 文本去重

每条客户端文字消息携带 UUID `client_message_id`。客户端先显示带该 ID 的乐观消息；服务端在 `user_sync` 事件中回显同一 ID；客户端将乐观消息更新为已确认，而不是追加第二条消息。由服务端 ASR 产生的文本没有客户端 ID，应正常追加。

### 图片回复

`POST /api/vision_chat` 接收图片后只立即返回“已接收”确认。最终文本、动作、音频片段、音素时间轴和结束事件只通过该用户 WebSocket 推送。前端立即渲染用户图片，但绝不依据 HTTP 响应再创建第二条 AI 回复。

### WebSocket 时序

1. APK 先经认证 HTTPS 获取一次性 WebSocket Ticket。
2. APK 使用 Ticket 建立连接；服务端在接受 WebSocket 前消费 Ticket。
3. 所有传入用户事件均绑定 Ticket 所属用户。
4. 流式输出继续使用现有 `text_stream_chunk`、`audio_stream_chunk`、`chat_action` 和 `audio_stream_end` 协议，并在需要处增加关联 ID。
5. 客户端断线后先申请新 Ticket，再重新建立连接。

## 情绪干预

`mood_score` 定义为 LLM 对用户当前情绪的估计，并随对应 AI 回复存储。连续低落判断读取最近 AI 回复分数，而非当前固定为 `0` 的用户消息记录。

当最近五个有效分数中至少三个 `<= -2` 时，进入温和干预。危机关键词处理独立于评分，且始终拥有更高优先级。情绪趋势图使用同一组 AI 分数。

## 前端与部署配置

用构建时配置替代硬编码 IP：

- APK 构建中，`VITE_API_BASE_URL` 为公网 HTTPS 地址。
- 浏览器开发环境未配置该变量时使用 Vite 代理。
- WebSocket 地址由 API 地址推导，并自动将 `https` 转为 `wss`。

服务端密钥和服务地址由环境变量及本地私有配置注入；仓库只提交脱敏示例配置。CORS 采用公网 Web 域名和预期 APK/WebView Origin 的允许列表；令牌验证才是实际安全边界。

使用 Caddy 或 Nginx 为 FastAPI 提供 TLS 终止和 WSS 反向代理。SQLite、ChromaDB、私有媒体和生成的日记图片均持久化在服务器挂载卷上。首版只运行一个 Uvicorn worker。

## 数据迁移

使用 SQLite 显式 schema migration 注册表。迁移应可重复执行，并在 SQLite 能支持的范围内使用事务。

第一次管理员登录时，可选择需要合并的历史用户 ID。迁移将聊天、画像、日记、社交数据和 Chroma collection 的归属更新为新 UUID，并保留原始消息时间戳与媒体引用。在验证记录数量一致前，不删除原始数据。

## 测试与验收标准

- 注册拒绝重复用户名和弱密码；登录能签发有效会话。
- 用户 A 的令牌不能读取、发帖、上传、获取媒体或以用户 B 身份建立 WebSocket。
- 两位用户的聊天历史、Chroma 召回、日记、情绪图和 UNA 朋友圈互相隔离。
- 发送一条文字消息，在服务端回显后仅渲染一条用户消息。
- 发送一张图片，只生成一条由 WebSocket 交付的 AI 回复。
- 最近五个 AI 情绪分中有三个低分时触发温和干预；用户记录中的零分不影响该判断。
- 所有后端测试均使用临时 SQLite 和临时 ChromaDB 路径。
- 用户通过不同网络中的手机和电脑登录同一账户时，可看到完全相同的服务端数据。

## 本版本非目标

- 真人之间的好友、搜索、聊天和共享朋友圈。
- 邮箱验证、密码找回、手机号验证和第三方登录。
- 多 worker 的 SQLite 横向扩展。
- 自动删除日记图片或面向用户的媒体保留设置。
