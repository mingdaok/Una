# 人物预设修改说明

三个预设朋友统一配置在 [`presets.yaml`](./presets.yaml) 中。最终提交前，可以直接替换下列内容，无需修改连续性、朋友圈、选择或意向执行代码：

- `display_name`：显示名称
- `aliases`：称呼别名
- `personality`：0 到 1 的人格权重
- `traits`、`interests`：性格标签和兴趣
- `routine_template`：日程模板键
- `speaking_style`、`prompt_identity`：说话风格与角色身份描述
- `social_moments`：朋友圈正文、地点和 UNA 评论素材
- `avatar_key`、`voice_key`：头像和声音资源键
- `enabled`：是否在新、旧用户世界中启用该人物

## 不要修改的稳定字段

请保留三个 `actor_id`：

- `npc_preset_1`
- `npc_preset_2`
- `npc_preset_3`

它们是数据库关系、剧情选择和意向记录使用的稳定主键。`definition_key` 和 `legacy_aliases` 也建议保留；旧 ID 别名用于自动兼容已经存在的开发数据。

每次调整某个人物后，将该人物的 `definition_version` 加一。服务重启并再次加载用户世界时，会把新名称和版本同步到角色档案表；用户未来设置的 `display_name_override` 不会被全局配置覆盖。

`routine_template` 指向同一文件顶部的 `routine_templates`。NPC 自主生活会先把模板活动写入持久日程，再在时间窗口结束后生成独立事件。替换人物时应同步检查日程模板，避免新人物仍在过旧人物的生活。

`interaction_templates` 定义 NPC 之间的共同经历和双方视角。模板必须使用 `{actor_a}`、`{actor_b}` 占位符，不要直接写当前人物姓名，这样替换三个预设人物后互动内容仍然成立。

`relationship_policy` 定义关系层级、紧张阈值、冲突概率和修复条件。互动模板的 `kind` 只能是 `supportive`、`conflict` 或 `repair`；冲突和修复模板应同时配置 `min_tension`，修复模板还应配置 `min_trust`，避免没有关系基础的人物机械和好。

`intention_templates` 定义 NPC 会主动形成的短期打算。状态触发条件、性格权重、行动结果和状态变化都集中配置于此。文案只可使用 `{actor}`、`{interest}`、`{target}`；实际姓名、兴趣与联系人运行时从角色档案和关系表读取。`target_mode: relationship` 仅用于确实需要联系对象的社交意图，其他意图不会凭空写入关系证据。

每个意图模板还通过唯一的 `suggestion_type` 暴露一个受控建议类别。客户端只能提交这些类别；用户的自由说明不会被当成事件模板或执行指令。修改建议类别时需要同步客户端允许值，但不应在服务代码里按小满、知夏或阿岚的姓名分支。

如果暂时不需要某个人物，将 `enabled` 改为 `false`。角色档案会保留以支持历史记录，但不会再进入活跃联系人或 `/api/life/actors` 列表。
