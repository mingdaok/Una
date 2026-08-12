# 统一 ContentEvidence 内容证据包 v1

## 目标

朋友圈、日记和聊天使用同一套来源契约，业务层不再分别维护互不兼容的 `source_event_ids` 语义。证据包只保存来源身份和校验结果，不保存事件摘要或私密想法，事实正文仍由生活世界权威表管理。

## 数据契约

```json
{
  "version": 1,
  "generation_reason": "chat_life_context",
  "generator_version": "life-chat-context-v2",
  "sources": [
    {
      "source_id": "event-id",
      "source_type": "npc_life_event",
      "actor_ids": ["npc_preset_1"],
      "world_time": "2026-08-10T08:30:00+08:00",
      "disclosure_level": "familiar",
      "status": "completed"
    }
  ],
  "source_event_ids": ["event-id"],
  "source_actor_ids": ["npc_preset_1"],
  "used_source_ids": ["event-id"],
  "validation_status": "passed",
  "validation_codes": []
}
```

### 字段约束

- `version`：证据结构版本；未知高版本应按不可完全理解处理，不能静默改写。
- `sources`：进入生成前安全上下文的来源集合。
- `source_id + source_type`：来源稳定身份；显示名称不能作为主键。
- `actor_ids`：事实所属或参与人物，用于归属校验。
- `world_time`、`status`：用于时间连续性和“未完成说成已完成”校验。
- `disclosure_level`：生成前过滤依据，不代表客户端有权直接读取来源详情。
- `used_source_ids`：生成后判断为实际影响最终文本的来源。
- `validation_status`：`pending`、`passed` 或 `blocked`。
- `validation_codes`：稳定机器码，供审计和测试使用。
- `source_event_ids`、`source_actor_ids`：便于现有查询消费的派生字段，不是第二份权威数据。

`EvidenceSource.summary` 只存在于进程内，用于生成和校验；默认序列化明确排除该字段，避免把可披露摘要复制到三个内容表，更不会保存 `private_thought`。

## 存储与迁移

以下表新增 `content_evidence_json TEXT NOT NULL DEFAULT '{}'`：

- `chat_history`
- `una_posts`
- `una_diary`

生活模拟迁移版本 11 会对已存在的内容表补列；各内容模块自身初始化也会补列，允许不同启动顺序。旧的朋友圈/日记 `source_event_ids` 字段暂时保留，作为旧版本兼容索引；新代码优先读证据包，缺失时退回旧字段。

所有证据随内容在同一次写入中落库，且继续使用内容表原有的用户归属字段隔离租户。

证据 JSON 不是权威事实本身。生成后校验会按 `source_type + source_id + owner_user_id` 回查生活世界表，并比较人物、状态、披露级别和世界时间。来源不存在、类型未知、元数据被篡改或权威披露级别为私密时一律阻断。

## 渠道接入

- 聊天：上下文选择时建立证据，流式校验后随 AI 消息保存。
- UNA 朋友圈：从被选生活事件建立证据，发布前校验。
- NPC 朋友圈：从 NPC 独立事件或共同事件建立证据，发布前校验。
- 日记：从当日 UNA 事件集合建立证据，正文校验后保存。

## 演进规则

1. 新来源类型必须先定义归属、状态和权威查询方式，再进入证据包。
2. 新生成渠道必须复用 `ContentEvidence`，不能再创建渠道专属来源 JSON。
3. 更改字段语义时递增 `version`，迁移只补结构，不伪造历史使用来源。
4. 内容删除不自动删除生活事件；生活事件是世界事实账本，内容只是表达结果。
