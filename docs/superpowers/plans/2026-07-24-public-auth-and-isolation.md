# UNA 公网认证与私有数据边界实施计划

> **面向执行代理：** 必须使用 `superpowers:executing-plans` 按任务执行；步骤使用复选框追踪。

**目标：** 让 UNA 支持用户名密码注册登录，并确保聊天、记忆、日记和私有 UNA 朋友圈只能由所属用户读取或写入。

**架构：** 新增独立认证服务负责账户、JWT、可撤销刷新会话和一次性 WebSocket Ticket。FastAPI 通过 `CurrentUser` 依赖注入唯一可信的用户 ID；现有业务路由删除客户端提交的有效用户 ID。前端通过会话模块统一附加 Access Token，并在重连前换取 WebSocket Ticket。

**技术栈：** FastAPI、Pydantic、SQLite、PyJWT、Argon2id（`pwdlib[argon2]`）、React 18、Vite、Vitest、pytest。

## 全局约束

- 保持 FastAPI、React/Vite、SQLite、ChromaDB、HBuilder APK 打包和现有 Live2D/音频链路。
- 所有受保护身份均由服务端验证，客户端不能传入实际生效的用户 ID。
- 保留现有历史数据；本期只提供迁移基础设施，不自动删除旧数据。
- 所有测试使用临时 SQLite 和临时 ChromaDB，绝不写入 `backend/una_memory.db`。
- 公网生产环境使用 HTTPS/WSS；SQLite 模式下只运行一个 Uvicorn worker。

---

## 文件边界

| 文件 | 职责 |
| --- | --- |
| `backend/settings.py` | 从环境变量读取数据库、JWT、允许来源与 Token 生命周期。 |
| `backend/database.py` | 可配置数据库路径、schema migration、用户与会话持久化。 |
| `backend/auth_service.py` | 用户名与密码校验、密码哈希、JWT、Refresh Token、WS Ticket。 |
| `backend/auth_api.py` | 认证路由和 `CurrentUser` FastAPI 依赖。 |
| `backend/main_server.py` | 挂载认证路由，以认证用户替换业务路由传入的用户 ID。 |
| `backend/social_api.py` | 从认证依赖取得 owner/author，屏蔽跨用户 API。 |
| `frontend_react/src/auth/session.js` | Token 内存状态、刷新、认证 fetch、WS Ticket。 |
| `frontend_react/src/App.jsx` | 注册/登录界面与认证态。 |
| `frontend_react/src/hooks/useUnaCore.js` | 使用认证 fetch、带 Ticket 建立 WS、文本关联 ID 去重。 |
| `frontend_react/src/config.js` | 从 `VITE_API_BASE_URL` 派生 HTTP/WS 地址。 |

## 任务 1：测试隔离与可配置存储

**文件：**
- 新建：`backend/settings.py`
- 修改：`backend/database.py:1-60`
- 修改：`backend/memory/vector_db.py:1-15`
- 新建：`backend/tests/conftest.py`
- 测试：`backend/tests/test_storage_isolation.py`

**接口：**
- 产出 `settings.database_path: str` 和 `settings.chroma_path: str`。
- 产出 `database.reset_connection_for_tests()`，仅测试使用。

- [ ] **步骤 1：写失败测试**

```python
def test_database_path_uses_test_environment(monkeypatch, tmp_path):
    monkeypatch.setenv("UNA_DB_PATH", str(tmp_path / "test.sqlite3"))
    import importlib, database
    importlib.reload(database)
    database.init_db()
    assert database.DB_PATH == str(tmp_path / "test.sqlite3")
    assert (tmp_path / "test.sqlite3").exists()
```

- [ ] **步骤 2：确认测试失败**

运行：`pytest backend/tests/test_storage_isolation.py::test_database_path_uses_test_environment -v`

预期：失败，原因是 `database.DB_PATH` 固定为 `backend/una_memory.db`。

- [ ] **步骤 3：写最小实现**

```python
# backend/settings.py
from dataclasses import dataclass
import os

@dataclass(frozen=True)
class Settings:
    database_path: str = os.getenv("UNA_DB_PATH", "")
    chroma_path: str = os.getenv("UNA_CHROMA_PATH", "")

settings = Settings()

# backend/database.py
DB_PATH = settings.database_path or os.path.join(CURRENT_DIR, "una_memory.db")
```

`conftest.py` 必须在导入业务模块前设置 `UNA_DB_PATH`、`UNA_CHROMA_PATH` 到 pytest `tmp_path`，并调用 `database.init_db()`。

- [ ] **步骤 4：确认通过**

运行：`pytest backend/tests/test_storage_isolation.py -v`

预期：全部通过，且 `backend/una_memory.db` 的修改时间未变化。

- [ ] **步骤 5：提交**

```bash
git add backend/settings.py backend/database.py backend/memory/vector_db.py backend/tests/conftest.py backend/tests/test_storage_isolation.py
git commit -m "test: isolate UNA persistence for tests"
```

## 任务 2：账户、会话与认证服务

**文件：**
- 修改：`requirements.txt`
- 修改：`backend/database.py:10-350`
- 新建：`backend/auth_service.py`
- 测试：`backend/tests/test_auth_service.py`

**接口：**
- `AuthService.register(username: str, password: str) -> dict`
- `AuthService.authenticate(username: str, password: str) -> dict | None`
- `AuthService.issue_session(user_id: str) -> dict`
- `AuthService.rotate_refresh(refresh_token: str) -> dict | None`
- `AuthService.verify_access(token: str) -> dict | None`

- [ ] **步骤 1：写失败测试**

```python
def test_register_hashes_password_and_returns_uuid(auth_service):
    account = auth_service.register("UnaUser", "correct-horse-battery")
    assert account["id"]
    assert account["username"] == "unauser"
    assert "correct-horse-battery" not in database.get_password_hash(account["id"])

def test_refresh_token_can_only_be_used_once(auth_service):
    account = auth_service.register("alice", "correct-horse-battery")
    session = auth_service.issue_session(account["id"])
    assert auth_service.rotate_refresh(session["refresh_token"])
    assert auth_service.rotate_refresh(session["refresh_token"]) is None
```

- [ ] **步骤 2：确认测试失败**

运行：`pytest backend/tests/test_auth_service.py -v`

预期：失败，原因是 `AuthService` 与会话表不存在。

- [ ] **步骤 3：写最小实现**

```python
# 用户表关键字段
CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

# auth_service.py 的签发结果
return {
    "access_token": self._encode_access(user_id),
    "refresh_token": secrets.token_urlsafe(48),
    "token_type": "bearer",
}
```

密码使用 `PasswordHash.recommended()`；刷新令牌仅以 SHA-256 哈希写入 `auth_refresh_sessions`，轮换时在单个事务内标记旧记录 `revoked_at`。

- [ ] **步骤 4：确认通过**

运行：`pytest backend/tests/test_auth_service.py -v`

预期：全部通过。

- [ ] **步骤 5：提交**

```bash
git add requirements.txt backend/database.py backend/auth_service.py backend/tests/test_auth_service.py
git commit -m "feat: add UNA account sessions"
```

## 任务 3：认证 API 与一次性 WebSocket Ticket

**文件：**
- 新建：`backend/auth_api.py`
- 修改：`backend/main_server.py:15-180,401-505`
- 测试：`backend/tests/test_auth_api.py`

**接口：**
- `get_current_user(request) -> dict` 从 Bearer Token 返回账户。
- `POST /api/auth/ws-ticket` 返回 `{"ticket": str, "expires_in": 60}`。
- `consume_ws_ticket(ticket: str) -> str | None` 只能成功一次。

- [ ] **步骤 1：写失败测试**

```python
def test_protected_history_rejects_missing_token(client):
    assert client.get("/history").status_code == 401

def test_websocket_ticket_can_only_connect_once(client, auth_headers):
    ticket = client.post("/api/auth/ws-ticket", headers=auth_headers).json()["ticket"]
    assert consume_ws_ticket(ticket)
    assert consume_ws_ticket(ticket) is None
```

- [ ] **步骤 2：确认测试失败**

运行：`pytest backend/tests/test_auth_api.py -v`

预期：失败，原因是路由未要求认证，且 Ticket 实现不存在。

- [ ] **步骤 3：写最小实现**

```python
router = APIRouter(prefix="/api/auth")

@router.post("/ws-ticket")
async def create_ws_ticket(current_user=Depends(get_current_user)):
    return auth_service.create_ws_ticket(current_user["id"])

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket, ticket: str):
    user_id = auth_service.consume_ws_ticket(ticket)
    if not user_id:
        await websocket.close(code=1008)
        return
    await ws_manager.connect(websocket, user_id)
```

将认证路由挂载到 FastAPI；`/history`、日记、记忆、生成日记、视觉、语音输入和社交路由全部增加 `CurrentUser` 依赖。

- [ ] **步骤 4：确认通过**

运行：`pytest backend/tests/test_auth_api.py -v`

预期：缺失或伪造 Token 返回 401；Ticket 只能消费一次。

- [ ] **步骤 5：提交**

```bash
git add backend/auth_api.py backend/main_server.py backend/tests/test_auth_api.py
git commit -m "feat: protect UNA APIs and websocket"
```

## 任务 4：业务数据以认证用户为唯一边界

**文件：**
- 修改：`backend/main_server.py:297-657`
- 修改：`backend/social_api.py:218-819`
- 修改：`backend/social_db.py:138-769`
- 测试：`backend/tests/test_user_isolation_api.py`

**接口：**
- 业务函数仍接收服务端 `user_id`，但路由不接受请求体或查询参数的用户 ID。
- `get_feed(owner_user_id: str, page: int, page_size: int)` 必须以 owner 过滤。

- [ ] **步骤 1：写失败测试**

```python
def test_user_cannot_read_another_users_history(client, user_a_headers, user_b_headers):
    client.post("/chat", headers=user_a_headers, json={"text": "only A"})
    history_b = client.get("/history", headers=user_b_headers).json()
    assert all(item["content"] != "only A" for item in history_b)

def test_social_post_owner_comes_from_token(client, user_a_headers, user_b_headers):
    client.post("/api/social/post", headers=user_a_headers, json={"content": "A post"})
    assert client.get("/api/social/feed", headers=user_b_headers).json()["total"] == 0
```

- [ ] **步骤 2：确认测试失败**

运行：`pytest backend/tests/test_user_isolation_api.py -v`

预期：失败，原因是请求目前可指定 `user_id` 或 `owner_user_id`。

- [ ] **步骤 3：写最小实现**

```python
@app.get("/history")
async def get_history(current_user=Depends(get_current_user)):
    return database.get_recent_history(current_user["id"], 50)

class CreatePostBody(BaseModel):
    content: str = ""
    image_urls: list[str] = []
    location: str = ""

@router.post("/post")
async def create_post(body: CreatePostBody, current_user=Depends(get_current_user)):
    return social_db.create_post(
        owner_user_id=current_user["id"], author_id=current_user["id"],
        content=body.content, images=body.image_urls, author_type="user"
    )
```

删除 APK 路由的好友、关系和跨用户资料入口；保留数据库函数但不公开。所有定时任务遍历 `database.get_active_user_ids()`。

- [ ] **步骤 4：确认通过**

运行：`pytest backend/tests/test_user_isolation_api.py backend/tests/test_social_db.py -v`

预期：用户 A 与 B 的聊天和私有 UNA 朋友圈完全隔离。

- [ ] **步骤 5：提交**

```bash
git add backend/main_server.py backend/social_api.py backend/social_db.py backend/tests/test_user_isolation_api.py
git commit -m "feat: enforce private UNA user boundaries"
```

## 任务 5：APK 会话、登录页与 WebSocket 重连

**文件：**
- 新建：`frontend_react/src/auth/session.js`
- 修改：`frontend_react/src/config.js`
- 修改：`frontend_react/src/App.jsx:15-150`
- 修改：`frontend_react/src/hooks/useUnaCore.js:1-280`
- 测试：`frontend_react/src/auth/__tests__/session.test.js`
- 测试：`frontend_react/src/hooks/__tests__/useUnaCore.test.js`

**接口：**
- `authFetch(path, options)` 自动附带 Access Token，并在 401 时只刷新一次。
- `login(username, password)`、`register(username, password)`、`logout()`、`getWsTicket()`。
- `useUnaCore()` 不再接收客户端用户 ID。

- [ ] **步骤 1：写失败测试**

```javascript
it('retries one protected request after refreshing the access token', async () => {
  fetch.mockResolvedValueOnce(new Response('', { status: 401 }))
       .mockResolvedValueOnce(jsonResponse({ access_token: 'new-access' }))
       .mockResolvedValueOnce(jsonResponse({ ok: true }));
  await authFetch('/history');
  expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer new-access');
});

it('opens a websocket with a one-time ticket instead of user id', async () => {
  mockTicket('one-time-ticket');
  renderHook(() => useUnaCore());
  await waitFor(() => expect(WebSocket).toHaveBeenCalledWith(expect.stringContaining('ticket=one-time-ticket')));
});
```

- [ ] **步骤 2：确认测试失败**

运行：`cd frontend_react && npx vitest run src/auth/__tests__/session.test.js src/hooks/__tests__/useUnaCore.test.js`

预期：失败，原因是会话模块不存在，WS 地址仍包含用户 ID。

- [ ] **步骤 3：写最小实现**

```javascript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const WS_BASE_URL = API_BASE_URL.replace(/^https/, 'wss').replace(/^http/, 'ws');

export async function getWsTicket() {
  const response = await authFetch('/api/auth/ws-ticket', { method: 'POST' });
  return (await response.json()).ticket;
}
```

将现有伪登录表单替换为登录/注册切换表单。登录成功后读取 `/api/auth/me` 显示昵称；登出清理会话。`useUnaCore` 在每次连接或重连前请求新 Ticket，并使用 `new WebSocket(`${WS_BASE_URL}/ws/chat?ticket=${encodeURIComponent(ticket)}`)`。

- [ ] **步骤 4：确认通过**

运行：`cd frontend_react && npx vitest run src/auth/__tests__/session.test.js src/hooks/__tests__/useUnaCore.test.js`

预期：全部通过。

- [ ] **步骤 5：提交**

```bash
git add frontend_react/src/auth/session.js frontend_react/src/config.js frontend_react/src/App.jsx frontend_react/src/hooks/useUnaCore.js frontend_react/src/auth/__tests__/session.test.js frontend_react/src/hooks/__tests__/useUnaCore.test.js
git commit -m "feat: add UNA APK account session"
```

## 任务 6：去重、图片单一回复与情绪分数修正

**文件：**
- 修改：`backend/main_server.py:297-657`
- 修改：`backend/database.py:90-175`
- 修改：`frontend_react/src/App.jsx:55-100`
- 修改：`frontend_react/src/hooks/useUnaCore.js:100-250`
- 测试：`backend/tests/test_realtime_contract.py`
- 测试：`frontend_react/src/hooks/__tests__/useUnaCore.test.js`

**接口：**
- 文本事件增加可选 `client_message_id`。
- `/api/vision_chat` 返回 `{"status": "accepted"}`；AI 输出只由 WS 发送。
- `database.get_recent_mood_scores()` 查询 AI 回复评分。

- [ ] **步骤 1：写失败测试**

```python
def test_recent_mood_scores_only_reads_ai_assessments(temp_db):
    database.add_message("u1", "user", "sad", mood_score=0)
    database.add_message("u1", "ai", "reply", mood_score=-3)
    assert database.get_recent_mood_scores("u1", 5) == [-3]

def test_vision_api_acknowledges_without_returning_ai_text(client, auth_headers):
    response = client.post("/api/vision_chat", headers=auth_headers, json={"image": "ZmFrZQ=="})
    assert response.json() == {"status": "accepted"}
```

- [ ] **步骤 2：确认测试失败**

运行：`pytest backend/tests/test_realtime_contract.py -v`

预期：失败，原因是当前视觉接口返回 `reply`，情绪查询读取用户行。

- [ ] **步骤 3：写最小实现**

```python
def get_recent_mood_scores(user_id, limit=5):
    cursor.execute(
        "SELECT mood_score FROM chat_history WHERE user_id=? AND role='ai' ORDER BY id DESC LIMIT ?",
        (user_id, limit),
    )

await ws_manager.broadcast_to_user(user_id, {
    "type": "user_sync", "text": clean_text,
    "client_message_id": client_message_id,
})
return {"status": "accepted"}
```

前端将同 ID 的乐观消息标记为确认而不追加；视觉 HTTP 调用仅处理成功或失败状态，AI 气泡只监听 WebSocket `text_stream_chunk`。

- [ ] **步骤 4：确认通过**

运行：`pytest backend/tests/test_realtime_contract.py -v`，然后运行任务 5 的 Vitest 命令。

预期：全部通过，且同一 `client_message_id` 只对应一条消息。

- [ ] **步骤 5：提交**

```bash
git add backend/main_server.py backend/database.py frontend_react/src/App.jsx frontend_react/src/hooks/useUnaCore.js backend/tests/test_realtime_contract.py frontend_react/src/hooks/__tests__/useUnaCore.test.js
git commit -m "fix: unify UNA realtime responses"
```

## 任务 7：全量验证与交付准备

**文件：**
- 修改：`.gitignore`
- 新建：`config.example.yaml`
- 修改：`README.md`
- 测试：现有全部后端与前端测试。

- [ ] **步骤 1：写失败检查**

```bash
git check-ignore backend/una_memory.db backend/data/chroma_db/ frontend_react/dist/ backend/static/voice/
```

预期：至少一个路径尚未被忽略。

- [ ] **步骤 2：确认失败**

运行上述命令；记录未忽略的运行时路径。

- [ ] **步骤 3：写最小实现**

在 `.gitignore` 增加运行数据库、向量库、音频、临时音频和前端构建产物；在 `config.example.yaml` 给出不含密钥的配置；在 README 增加公网环境变量、单 worker、HTTPS/WSS 和 APK 构建说明。

- [ ] **步骤 4：全量验证**

运行：`pytest backend/tests -v`

运行：`cd frontend_react && npx vitest run && npm run build`

预期：所有测试通过，Vite 构建成功，且 `git diff --check` 无输出。

- [ ] **步骤 5：提交**

```bash
git add .gitignore config.example.yaml README.md
git commit -m "docs: prepare UNA public deployment"
```

## 本计划不包含的后续子项目

1. 受保护媒体数据表、鉴权下载端点和音频保留任务。
2. 历史 `default` / `mobile_user` 数据向第一个 UUID 账户的交互式迁移工具。
3. 密码找回、邮箱验证、真人社交关系和多 worker 扩展。

这些项目依赖本计划的认证与 owner 边界，需在本计划验收后单独编写规格和实施计划。
