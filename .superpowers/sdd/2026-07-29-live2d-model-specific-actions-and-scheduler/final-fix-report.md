# P2 最终自动问题修复报告

## 范围

本轮只处理最终审查 I1、I2、I3；真实桌面模型与 Android APK 人工验收仍按功能清单保留为未完成项。

## 修复结果

1. **生产发布产物**
   - 从当前 P2 源码执行 Vite 生产构建，未手工编辑压缩 bundle。
   - 通过现有 `scripts/publish_frontend.ps1` 将构建结果同步到 `backend/static/mobile`。
   - `frontend_react/dist/index.html` 与 `backend/static/mobile/index.html` 均引用：
     - `assets/index-DWDv-qYU.js`
     - `assets/index-CrppLWLv.css`
   - 两端入口及当前 JS/CSS 资产 SHA-256 逐一一致。

2. **panda 协议与投影一致**
   - `panda_hug`、`hands_to_face` 明确定义为姿态激活度 `0..1`。
   - 前端协议、后端解析/二次过滤与 AI 提示词同步使用同一值域。
   - 负值不再被协议接受后于投影层静默忽略。

3. **随机调度器**
   - `reset()` 使用当前单调时钟和会话种子初始化首个普通/专属截止点。
   - ready、重复 ready、模型切换和 generation reset 后的首帧均不会立即触发。
   - 专属候选在 15–25 秒到期后使用固定 20% 的种子化概率门；未命中也推进下一截止点，避免逐帧重试。
   - 固定 seed、模型、generation、时钟和输入可重放同一事件序列。

## TDD 与验证

- 新回归测试先在旧实现上出现预期失败：
  - 前端：6 项失败，覆盖 panda 负值、reset 首帧、专属概率门与控制器首个冷却。
  - 后端：2 项失败，覆盖 panda 负值和提示词值域。
- 定向修复后：
  - 前端：4 个测试文件，51 项通过。
  - 后端：2 个测试文件，18 项通过。
- 全量验证：
  - 前端：15 个测试文件，171 项通过。
  - 后端：74 项通过。
  - `npm.cmd run build`：通过。
  - 发布入口、文件存在性与 SHA-256 对齐检查：通过。
  - `git diff --check`：提交前最终执行并记录。

## 保留阻塞项

- 真实桌面浏览器模型参数方向、可见性与恢复效果尚需人工验收。
- HBuilderX Android APK 真机验收尚未完成。
