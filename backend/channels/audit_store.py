"""Schema v4 and delivery identity invariants shared by the QQ workers."""

import json
import time


def deadline(row):
    if row.get("expires") is not None:
        return row["expires"]
    event = json.loads(row.get("payload") or "{}")
    return row["created"] + (
        60 if event.get("scope") == "group" and not event.get("direct") else 300
    )


class AuditStore:
    def migrate_audit(self):
        with self.db() as db:
            migrating = (
                db.execute("SELECT coalesce(max(version),0) FROM qq_schema").fetchone()[
                    0
                ]
                < 4
            )
            changes = {
                "qq_groups": {
                    "muted_until": "REAL NOT NULL DEFAULT 0",
                    "quiet_until": "REAL NOT NULL DEFAULT 0",
                },
                "qq_inbox": {
                    "event_time": "REAL",
                    "received_at": "REAL",
                    "time_source": "TEXT DEFAULT 'legacy_unknown'",
                    "expires": "REAL",
                },
                "qq_conversations": {"message_seq": "INTEGER NOT NULL DEFAULT 0"},
                "qq_messages": {
                    "recalled": "INTEGER NOT NULL DEFAULT 0",
                    "sequence": "INTEGER NOT NULL DEFAULT 0",
                },
                "qq_outbox": {
                    "recalled": "INTEGER NOT NULL DEFAULT 0",
                    "submitted_at": "REAL",
                },
                "qq_reply_plans": {
                    "watermark": "INTEGER NOT NULL DEFAULT 0",
                    "dependencies": "TEXT NOT NULL DEFAULT '[]'",
                    "test_percent": "INTEGER NOT NULL DEFAULT 0",
                    "test_until": "REAL",
                },
                "qq_media_jobs": {
                    "ready_at": "REAL NOT NULL DEFAULT 0",
                    "stage": "TEXT",
                    "result": "TEXT",
                },
                "qq_group_decisions": {
                    "stage": "TEXT",
                    "error_code": "TEXT",
                    "trigger_kind": "TEXT",
                },
                "qq_media_assets": {"index_status": "TEXT NOT NULL DEFAULT 'pending'"},
            }
            for table, fields in changes.items():
                columns = {r[1] for r in db.execute(f"PRAGMA table_info({table})")}
                for name, definition in fields.items():
                    if name not in columns:
                        db.execute(
                            f"ALTER TABLE {table} ADD COLUMN {name} {definition}"
                        )
            if migrating:
                db.execute("UPDATE qq_messages SET sequence=rowid WHERE role='user'")
                db.execute(
                    "UPDATE qq_conversations SET message_seq=coalesce((SELECT max(sequence) FROM qq_messages WHERE conversation=qq_conversations.id),0)"
                )
            db.execute(
                "UPDATE qq_inbox SET received_at=created,expires=created+CASE WHEN json_extract(payload,'$.scope')='group' AND json_extract(payload,'$.direct')=0 THEN 60 ELSE 300 END WHERE expires IS NULL"
            )
            db.execute(
                "UPDATE qq_outbox SET expires=min(expires,(SELECT i.expires FROM qq_inbox i WHERE i.id=qq_outbox.inbox_id)) WHERE status IN ('pending','preparing') AND inbox_id IN (SELECT id FROM qq_inbox)"
            )
            db.execute(
                "UPDATE qq_reply_plans SET expires=min(expires,(SELECT i.expires FROM qq_inbox i WHERE i.id=qq_reply_plans.id)) WHERE id IN (SELECT id FROM qq_inbox)"
            )
            db.execute(
                "CREATE TABLE IF NOT EXISTS qq_platform_messages(conversation TEXT,generation INTEGER,platform_id TEXT,message_id TEXT,outbox_id TEXT,recalled INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(conversation,generation,platform_id))"
            )
            db.execute(
                "INSERT OR IGNORE INTO qq_platform_messages SELECT conversation,generation,platform_id,id,NULL,recalled FROM qq_messages WHERE platform_id IS NOT NULL"
            )
            db.execute(
                "INSERT OR REPLACE INTO qq_platform_messages SELECT o.conversation,o.generation,o.platform_id,m.id,o.id,o.recalled FROM qq_outbox o JOIN qq_messages m ON m.inbox_id=o.inbox_id AND m.role='assistant' WHERE o.platform_id IS NOT NULL AND o.status='delivered'"
            )
            # Merge only exact protocol identities, never equal text.
            db.execute(
                "DELETE FROM qq_messages WHERE platform_id IS NOT NULL AND EXISTS(SELECT 1 FROM qq_platform_messages p WHERE p.conversation=qq_messages.conversation AND p.generation=qq_messages.generation AND p.platform_id=qq_messages.platform_id AND p.message_id!=qq_messages.id AND p.outbox_id IS NOT NULL)"
            )
            db.execute(
                "CREATE INDEX IF NOT EXISTS qq_platform_message_owner ON qq_platform_messages(message_id)"
            )
            db.execute("INSERT OR IGNORE INTO qq_schema VALUES(4)")

    def watermark(self, conversation, generation):
        rows = self.rows(
            "SELECT message_seq AS value FROM qq_conversations WHERE id=? AND generation=?",
            (conversation, generation),
        )
        return rows[0]["value"] if rows else 0

    def submission_current(self, row):
        """Synchronous final guard: no model calls between this check and submission."""
        if (
            row["scope"] == "group"
            and row["autonomous"]
            and self.group(row["target"])["quiet_until"] > time.time()
        ):
            return False
        if row["expires"] <= time.time():
            return False
        plans = self.rows(
            "SELECT * FROM qq_reply_plans WHERE id=?", (row.get("inbox_id"),)
        )
        if not plans:
            return True
        plan = plans[0]
        if plan["test_until"] and plan["test_until"] <= time.time():
            return False
        for mid in json.loads(plan["dependencies"]):
            if not self.rows(
                "SELECT 1 FROM qq_platform_messages p JOIN qq_messages m ON m.id=p.message_id WHERE p.conversation=? AND p.generation=? AND p.platform_id=? AND p.recalled=0 AND m.delivered=1",
                (row["conversation"], row["generation"], mid),
            ):
                return False
        return (
            not row["autonomous"]
            or self.watermark(row["conversation"], row["generation"])
            <= plan["watermark"]
        )

    def rebuild_delivered(self, db, inbox_id):
        parts = db.execute(
            "SELECT * FROM qq_outbox WHERE inbox_id=? AND status='delivered' AND recalled=0 ORDER BY created,rowid",
            (inbox_id,),
        ).fetchall()
        visible = []
        for part in parts:
            if part["kind"] == "text":
                visible.extend(
                    s["data"]["text"]
                    for s in json.loads(part["payload"])
                    if s["type"] == "text"
                )
            elif part["kind"] == "image":
                asset = db.execute(
                    "SELECT description FROM qq_media_assets WHERE id=?",
                    (part["asset_id"],),
                ).fetchone()
                visible.append(
                    "[表情：" + (asset["description"][:200] if asset else "图片") + "]"
                )
        db.execute(
            "UPDATE qq_messages SET content=?,delivered=?,recalled=? WHERE inbox_id=? AND role='assistant'",
            (
                "".join(visible) or "[消息已撤回]",
                int(bool(visible)),
                int(not visible),
                inbox_id,
            ),
        )

    def recall_platform(self, conversation, generation, mid):
        with self.db() as db:
            db.execute(
                "INSERT OR IGNORE INTO qq_platform_messages(conversation,generation,platform_id,recalled) VALUES(?,?,?,1)",
                (conversation, generation, mid),
            )
            mappings = db.execute(
                "SELECT * FROM qq_platform_messages WHERE conversation=? AND generation=? AND platform_id=?",
                (conversation, generation, mid),
            ).fetchall()
            db.execute(
                "UPDATE qq_platform_messages SET recalled=1 WHERE conversation=? AND generation=? AND platform_id=?",
                (conversation, generation, mid),
            )
            for mapping in mappings:
                if mapping["outbox_id"]:
                    out = db.execute(
                        "SELECT inbox_id FROM qq_outbox WHERE id=?",
                        (mapping["outbox_id"],),
                    ).fetchone()
                    db.execute(
                        "UPDATE qq_outbox SET recalled=1 WHERE id=?",
                        (mapping["outbox_id"],),
                    )
                    if out:
                        self.rebuild_delivered(db, out["inbox_id"])
                else:
                    db.execute(
                        "UPDATE qq_messages SET content='[消息已撤回]',metadata='{}',delivered=0,recalled=1 WHERE id=?",
                        (mapping["message_id"],),
                    )
            for plan in db.execute(
                "SELECT id,dependencies FROM qq_reply_plans WHERE conversation=? AND generation=?",
                (conversation, generation),
            ).fetchall():
                if mid in json.loads(plan["dependencies"]):
                    db.execute(
                        "UPDATE qq_outbox SET status='cancelled' WHERE inbox_id=? AND status IN ('pending','preparing')",
                        (plan["id"],),
                    )
                    db.execute(
                        "UPDATE qq_media_jobs SET status='cancelled' WHERE dedupe=? AND status IN ('pending','processing')",
                        (plan["id"] + ":tts",),
                    )

    def test_mode(self, group, legacy=0):
        settings = self.behavior(group)
        percent = settings["test_percent"]
        until = settings["test_until"]
        if percent is None:
            return legacy, None
        return (percent, until) if until and until > time.time() else (0, until)
