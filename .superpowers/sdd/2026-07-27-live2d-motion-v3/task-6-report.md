# Task 6：`Live2DStateMixer` 实施记录

## 范围

实现单一状态混合器，统一处理待机、情绪、即时动作、AI 动作、微反应、眨眼与 TTS 口型；本任务不接入 `useLive2DController`，该接入由后续任务完成。

## 计划澄清

原 `CompiledMotion` 只提供 `sample()` 的数值快照，未暴露每个通道的 `additive` / `override` 模式，混合器无法正确处理真实 v3 叠加轨道。经协调后，在 `motionProtocol.js` 增加最小兼容扩展：

- `trackModes`：冻结的 `{ [channel]: 'additive' | 'override' }` 快照；
- 整个 `CompiledMotion` 也冻结，外部不能以替换属性的方式影响编译后的模式；
- 旧调用缺少 `trackModes` 时，混合器仍按 `motion.mode` 或默认 `override` 运行。

## TDD 记录

### RED

1. 新建 `stateMixer.test.js` 后运行：

   ```powershell
   & 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/stateMixer.test.js
   ```

   结果：预期失败，`../stateMixer` 不存在。

2. 为 `trackModes` 补充协议层测试后运行：

   ```powershell
   & 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/motionProtocol.test.js
   ```

   结果：预期失败，`compiled.trackModes` 为 `undefined`。

### GREEN

实现 `stateMixer.js` 与冻结的 `trackModes` 后运行：

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/stateMixer.test.js src/live2d/__tests__/motionProtocol.test.js
```

结果：17 项通过。

覆盖内容：来源优先级、同来源平滑替换、不同通道并发、淡出回退、叠加限幅、过期清理、去重与重置、眨眼负向修饰、TTS 口型保护、采样异常隔离，以及冻结模式快照。

## 完整验证

```powershell
& 'D:\ai\Node\npx.cmd' vitest run
& 'D:\ai\Node\npm.cmd' run build
```

结果：Vitest 10 个测试文件、71 项测试全部通过；Vite 生产构建成功。构建仅输出已有的非模块脚本与 Browserslist 数据过期警告，未产生构建错误。

## 审查修复轮次 1/5

### RED

为审查意见增加四类回归：无显式 blend 的同来源同通道接替、按动作生命周期清理的去重 TTL 与容量上限、带抛错 getter 的采样帧、缺少 `trackModes` 的旧编译结果。运行：

```powershell
& 'D:\ai\Node\npx.cmd' vitest run src/live2d/__tests__/stateMixer.test.js
```

结果：13 项中 3 项按预期失败，分别暴露默认接替瞬跳、过期 ID 被永久拒绝、采样帧 getter 异常中断整帧；容量上限和旧 `trackModes` 兼容用例由已有行为通过。

### GREEN

- 选择 `140ms` 作为统一默认接替时长，位于设计规定的 `100～180ms` 范围内。仅当同来源、同通道的新覆盖轨道没有显式淡入时启用；显式淡入仍按请求参数执行。
- 去重缓存改为 `Map<motionId, expiresAtMs>`：优先使用事件有效期，否则使用 `startAtMs + durationMs`；每次入队和采样都清理到期项，超过 256 条时淘汰最早项。
- 对动作采样结果的逐通道属性读取增加异常隔离。读取失败的单一动作立即移除，健康动作仍在当前帧和下一帧正常输出。
- 保持旧 `CompiledMotion` 缺少 `trackModes` 时默认 `override` 的兼容规则。

再次运行同一命令结果：13/13 通过。

修复后的完整验证：Vitest 10 个测试文件、76 项测试全部通过；Vite 生产构建成功。构建仅保留已有的非模块脚本与 Browserslist 数据过期提示。

## 残余风险

- 模块尚未接入 `useLive2DController` 的真实 ticker，因此尚未进行浏览器或 Android 真机验收。
- 旧版编译结果若没有逐通道模式，会按兼容规则作为 `override` 处理；v3 新编译结果使用准确的 `trackModes`。
