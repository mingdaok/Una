# UNA 公网部署（P0）

1. 在服务器上设置 `UNA_ENV=production`、至少 32 字符的 `UNA_JWT_SECRET`、数据卷路径 `UNA_DB_PATH` 与 `UNA_CHROMA_PATH`。
2. 设置 `UNA_CORS_ORIGINS=https://你的前端域名`；不要使用 `*`。HBuilder APK 构建时在 `frontend_react/.env.production` 设置相同后端的 `VITE_API_BASE_URL=https://api.example.com`。
3. 在 `frontend_react` 执行 `npm.cmd run build`，然后在仓库根目录执行 `powershell -ExecutionPolicy Bypass -File scripts/publish_frontend.ps1`。
4. 用 Caddy 或 Nginx 为 FastAPI 提供 HTTPS 与 WSS 反向代理。SQLite、Chroma、`backend/static/voice` 与 `backend/static/social_images` 必须挂载持久卷。
5. SQLite 版本只能运行一个 Uvicorn worker。Access Token 为 15 分钟，刷新令牌为 30 天；不要把 `UNA_JWT_SECRET`、数据库或私有媒体目录提交到仓库。

电脑和手机只要登录同一账号并访问同一公网后端，数据即来自同一份服务器数据库；不同账号始终互相隔离。
