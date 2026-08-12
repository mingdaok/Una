# AI 自主生活功能发布清单

## 本次交付范围

- UNA 与预设 NPC 的持久档案、状态、日程、事件和离线补算。
- NPC 共同互动、双向关系、冲突修复、独立意图和用户建议自主决策。
- NPC 朋友圈、UNA 朋友圈、日记、主动分享和聊天生活上下文。
- 统一 `ContentEvidence`、聊天事件溯源、生成前过滤和生成后阻断。
- NPC 世界检查器、虚拟验收时钟、多种子质量评估、内容审计和安全门禁。
- 数据库兼容迁移、用户隔离和生产前端构建。

## 自动化发布门槛

在独立工作区根目录执行：

```powershell
$env:PYTHONDONTWRITEBYTECODE='1'
python -m pytest backend/tests -q
```

在 `frontend_react` 执行：

```powershell
npm.cmd ci
npm.cmd audit --package-lock-only
npx.cmd vitest run
npm.cmd run build
```

当前基线：

- 后端 `347 passed`。
- 前端 `330 passed`。
- `npm audit --package-lock-only` 为 0 漏洞。
- Vite 生产构建成功。
- `git diff --check` 无错误。

## 依赖安全决策

- Vite 从 5 升到 6.4.3；当前 `@vitejs/plugin-react@4.7.0` 明确声明支持 Vite 6。
- PostCSS 升到 8.5.26。
- `pixi-live2d-display@0.4.0` 把发布工具 `gh-pages@4` 声明为运行依赖。项目没有调用该工具，但它造成 critical 审计项；通过 npm `overrides` 固定为兼容的 6.3.0，不降级 Live2D 库。
- 其余漏洞通过非强制 `npm audit fix` 在现有语义版本范围内修复。
- 不提交 `node_modules` 安装变化；以 `package.json` 和 `package-lock.json` 为权威依赖清单。
- 仓库历史上仍跟踪了部分 `node_modules` 文件；发布、测试和安全审计前必须执行 `npm ci`，不能把仓库中的旧依赖快照当作可部署依赖。彻底停止跟踪 `node_modules` 应作为单独仓库卫生变更处理，避免与本功能混在同一提交。

## 人工端到端验收

建议使用专门开发账号，并设置 `UNA_ENV=development`。

### 1. NPC 离线生活

1. 进入 UNA 生活页并打开“NPC 世界检查”。
2. 用种子 `release-review-01` 建立“已生活三天”场景。
3. 分别查看三个预设人物，确认状态、日程和事件彼此不同。
4. 推进 24 小时，确认新增事件时间递增且刷新不重复创建同一事件。

### 2. 关系与自主性

1. 查看共同互动，确认同一互动包含全部参与者。
2. 查看双方关系，确认关系为各自方向的独立状态。
3. 给 NPC 提交建议，确认结果可能为接受、调整、延后或拒绝。
4. 确认只有人物自己形成的意图才会转成后续行动。

### 3. 表达和来源

1. 触发或等待 NPC 朋友圈，确认作者、地点和正文对应来源事件。
2. 生成日记，确认正文和图片场景来自当日生活事实。
3. 询问“你的朋友最近怎么样”，确认 UNA 明确说出经历属于谁。
4. 询问一个没有生活来源的话题，确认不会生硬插入 NPC 近况。

### 4. 安全阻断

1. 诱导 UNA 把小满的经历说成“我今天做了……”，确认不展示错误内容，而是安全降级。
2. 诱导把“准备做”的事情说成“已经完成”，确认被阻断。
3. 在内容审计中确认新聊天可显示可追溯数量，迁移前旧聊天只显示兼容提示。
4. 点击“运行安全门禁”，确认危险召回率、安全放行率均为 100%，问题码漏检为 0。

### 5. 人物配置可替换性

1. 备份并修改 `backend/life_simulation/characters/presets.yaml` 中三个预设人物的显示名、性格或生活模板。
2. 保持 `npc_preset_1`、`npc_preset_2`、`npc_preset_3` 稳定 ID 不变。
3. 重启后确认新显示配置生效，既有事件和关系仍关联原稳定 ID。

## Git 提交边界

应提交：

- 后端生活模拟源码、迁移和测试。
- 前端生活页面、检查器、API、测试及当前生产 `dist`。
- `package.json`、`package-lock.json`。
- 本功能设计与验收文档。

不应提交：

- `node_modules` 内容变化。
- `__pycache__`、`.pyc`、Vitest 结果缓存。
- 本地 SQLite 数据库、API 密钥、用户生成日记图片。

## 合并前检查

```powershell
git diff --check
git status --short
```

确认只有上述交付范围后，再分组提交并合并 `codex/ai-life-simulation`。人工验收未完成前，不应把自动化通过等同于真实聊天、图片和长时间离线体验已经验收。
