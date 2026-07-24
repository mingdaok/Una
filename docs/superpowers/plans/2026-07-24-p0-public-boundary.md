# UNA P0 公网边界实施计划

> **面向执行代理：** 必须使用 `superpowers:subagent-driven-development` 或 `superpowers:executing-plans`，按任务逐项执行并记录测试结果。

**目标：** 使 P0 的账号边界、私有 UNA 朋友圈和 Live2D 动作链路可安全地作为公网 APK 后端基础运行。

**架构：** 后端只从 Access Token 取得当前用户；社交、语音和日记请求不得再以 URL 或 JSON 中的用户 ID 决定身份。用户上传的图片和生成音频均登记归属，并仅通过鉴权媒体接口读取。React 统一通过 `authFetch` 发起受保护请求，构建产物由一个受控脚本同步到后端静态前端目录。

**技术栈：** FastAPI、SQLite、PyJWT、React 18、Vite、pytest、Vitest。

## 全局约束

- 保持 FastAPI、React/Vite、SQLite、ChromaDB、HBuilder APK 与现有 Live2D/音频链路。
- 任何实际生效的用户身份只能来自 `CurrentUser`，不能来自客户端传参。
- 测试始终使用临时 SQLite 和 ChromaDB，绝不写入 `backend/una_memory.db`。
- 公网环境由 `UNA_CORS_ORIGINS` 显式配置允许来源；不可使用任意来源 CORS。
- P0 仅支持用户与其专属 UNA，删除/关闭真人好友公开能力。

---

### 任务 1：封闭遗留社交身份入口

**文件：**
- 修改：`backend/social_api.py`
- 测试：`backend/tests/test_social_api_isolation.py`

**产出：** 所有社交路由均需认证；好友接口只返回当前用户与 `ai_una` 的本地联系人，表情包、资料和聊天由当前用户决定归属；跨用户查询返回 403/404。

- [ ] 先为伪造 `user_id` 的好友读取和跨用户资料读取写失败测试。
- [ ] 运行单测，确认旧接口可泄露或未认证。
- [ ] 移除客户端可控制身份的参数，以 `current_user["id"]` 替代。
- [ ] 运行社交隔离测试并提交独立变更。

### 任务 2：登记并鉴权私有媒体

**文件：**
- 修改：`backend/database.py`、`backend/main_server.py`、`backend/social_api.py`
- 新建：`backend/media_service.py`
- 测试：`backend/tests/test_private_media.py`

**产出：** 音频、朋友圈上传图片、头像和封面有 owner 记录；`/api/media/{id}` 仅向所属用户流式返回文件；通用 `/static` 与 `/voice` 不再直接托管用户文件。

- [ ] 先写 A 可读取自己媒体、B 和匿名均不可读取的失败测试。
- [ ] 运行测试确认当前静态路径没有归属校验。
- [ ] 实现媒体表、媒体登记和鉴权响应；替换 API 返回的私有 URL。
- [ ] 运行媒体测试与既有数据隔离测试并提交独立变更。

### 任务 3：前端令牌覆盖与发布配置

**文件：**
- 修改：`frontend_react/src/auth/session.js`、`frontend_react/src/config.js`
- 修改：`frontend_react/src/hooks/useAudioRecorder.js`、`frontend_react/src/components/WallGallery.jsx`
- 修改：`frontend_react/src/components/social/*.jsx`
- 新建：`scripts/publish_frontend.ps1`、`.env.example`

**产出：** 所有 API 请求经 `authFetch`；请求体、查询参数不发送用户身份；没有硬编码公网 IP；构建后可显式同步至 `backend/static/mobile`。

- [ ] 先添加会检查 Authorization 标头与无用户 ID 请求体的前端单测。
- [ ] 运行测试，确认旧实现失败。
- [ ] 使用认证请求封装替换调用，并将联系人固定为专属 UNA。
- [ ] 执行 Vitest 与 `npm.cmd run build`，再提交独立变更。

### 任务 4：部署边界与动作事件验收

**文件：**
- 修改：`backend/settings.py`、`backend/main_server.py`
- 修改：`docs/DEPLOYMENT.md`
- 测试：`backend/tests/test_brain_engine.py`、`frontend_react/src/hooks/__tests__/useUnaCore.test.js`

**产出：** CORS 仅使用配置允许来源；部署文档说明 HTTPS/WSS、单 worker、密钥、CORS、数据卷与前端发布命令；动作事件保持“后端解析 → WebSocket → 前端覆盖层”的单一链路。

- [ ] 先为 CORS 配置与动作事件顺序写失败测试。
- [ ] 实现配置读取、受限 CORS 及中文部署说明。
- [ ] 运行完整 pytest、Vitest 和 Vite 构建。
- [ ] 审核 `git diff --check`，再按用户授权提交。
