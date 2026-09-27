"""Durable group observation, media jobs, and interaction quotas."""

import json
import time
import uuid
from .social_types import Behavior, MediaClarification, relevance


class SocialStore:
    def migrate_social(self):
        statements = [
            "CREATE TABLE IF NOT EXISTS qq_group_behavior(bot TEXT,group_id TEXT,payload TEXT NOT NULL,PRIMARY KEY(bot,group_id))",
            "CREATE TABLE IF NOT EXISTS qq_group_windows(conversation TEXT PRIMARY KEY,generation INTEGER,first_at REAL,last_at REAL,last_eval REAL DEFAULT 0)",
            "CREATE TABLE IF NOT EXISTS qq_group_decisions(id TEXT PRIMARY KEY,conversation TEXT,generation INTEGER,created REAL,reason TEXT,target TEXT,elapsed REAL DEFAULT 0)",
            "CREATE TABLE IF NOT EXISTS qq_media_assets(id TEXT PRIMARY KEY,sha256 TEXT NOT NULL,scope TEXT NOT NULL,storage_key TEXT NOT NULL,format TEXT,size INTEGER,description TEXT DEFAULT '',ocr TEXT DEFAULT '',status TEXT,version INTEGER DEFAULT 1,created REAL,updated REAL,vector TEXT,UNIQUE(sha256,scope))",
            "CREATE TABLE IF NOT EXISTS qq_media_jobs(id TEXT PRIMARY KEY,dedupe TEXT UNIQUE,kind TEXT,conversation TEXT,generation INTEGER,binding_id TEXT,version INTEGER,payload TEXT,status TEXT DEFAULT 'pending',created REAL,expires REAL,attempts INTEGER DEFAULT 0,error TEXT)",
            "CREATE TABLE IF NOT EXISTS qq_reply_plans(id TEXT PRIMARY KEY,conversation TEXT,generation INTEGER,payload TEXT,created REAL,expires REAL,rechecked INTEGER DEFAULT 0)",
            "CREATE TABLE IF NOT EXISTS qq_quota_reservations(id TEXT PRIMARY KEY,target TEXT,sender TEXT,autonomous INTEGER,image INTEGER,voice INTEGER,created REAL,status TEXT DEFAULT 'reserved')",
            "CREATE INDEX IF NOT EXISTS qq_assets_scope ON qq_media_assets(scope,status)",
            "CREATE INDEX IF NOT EXISTS qq_media_jobs_pending ON qq_media_jobs(status,kind,created)",
        ]
        with self.db() as db:
            for statement in statements:
                db.execute(statement)
            columns = {r[1] for r in db.execute("PRAGMA table_info(qq_outbox)")}
            for name, definition in (
                ("asset_id", "TEXT"),
                ("asset_version", "INTEGER"),
                ("depends_on", "TEXT"),
            ):
                if name not in columns:
                    db.execute(f"ALTER TABLE qq_outbox ADD COLUMN {name} {definition}")
            db.execute("INSERT OR IGNORE INTO qq_schema VALUES(3)")

    def behavior(self, group):
        rows = self.rows(
            "SELECT payload FROM qq_group_behavior WHERE bot=? AND group_id=?",
            (self.bot_id, group),
        )
        return Behavior.model_validate(
            json.loads(rows[0]["payload"]) if rows else {}
        ).model_dump()

    def set_behavior(self, group, values):
        merged = Behavior.model_validate(
            {**self.behavior(group), **values}
        ).model_dump()
        self.group(group)
        with self.db() as db:
            db.execute(
                "INSERT INTO qq_group_behavior VALUES(?,?,?) ON CONFLICT(bot,group_id) DO UPDATE SET payload=excluded.payload",
                (self.bot_id, group, json.dumps(merged)),
            )
            db.execute(
                "UPDATE qq_groups SET version=version+1 WHERE bot=? AND group_id=?",
                (self.bot_id, group),
            )
        return merged

    def observe(self, conversation, generation, now):
        self.execute(
            "INSERT INTO qq_group_windows(conversation,generation,first_at,last_at) VALUES(?,?,?,?) "
            "ON CONFLICT(conversation) DO UPDATE SET first_at=CASE WHEN first_at=0 OR generation!=excluded.generation THEN excluded.first_at ELSE first_at END,last_at=excluded.last_at,generation=excluded.generation",
            (conversation, generation, now, now),
        )

    def window_ready(self, conversation, now=None):
        now = now or time.time()
        rows = self.rows(
            "SELECT * FROM qq_group_windows WHERE conversation=?", (conversation,)
        )
        return bool(
            rows
            and rows[0]["first_at"]
            and now - rows[0]["last_eval"] >= 15
            and (now - rows[0]["last_at"] >= 3 or now - rows[0]["first_at"] >= 8)
        )

    def freeze_window(self, conversation):
        with self.db() as db:
            rows = db.execute(
                "SELECT * FROM qq_inbox WHERE conversation=? AND status='pending' AND json_extract(payload,'$.direct')=0 ORDER BY created DESC",
                (conversation,),
            ).fetchall()
            if not rows:
                return None
            latest = dict(rows[0])
            db.execute(
                "UPDATE qq_inbox SET status='skipped' WHERE conversation=? AND status='pending' AND json_extract(payload,'$.direct')=0 AND id!=?",
                (conversation, latest["id"]),
            )
            db.execute(
                "UPDATE qq_group_windows SET first_at=0,last_eval=? WHERE conversation=?",
                (time.time(), conversation),
            )
            return latest

    def decision_log(
        self, row, reason, target=None, elapsed=0, *, stage=None, error_code=None
    ):
        self.execute(
            "INSERT OR REPLACE INTO qq_group_decisions(id,conversation,generation,created,reason,target,elapsed,stage,error_code,trigger_kind) VALUES(?,?,?,?,?,?,?,?,?,?)",
            (
                row["id"],
                row["conversation"],
                row["generation"],
                time.time(),
                reason,
                target,
                elapsed,
                stage,
                error_code,
                "direct" if json.loads(row["payload"]).get("direct") else "autonomous",
            ),
        )

    def media_job(self, kind, payload, *, dedupe, row=None, expires=None, db=None):
        row = row or {}
        ident, now = uuid.uuid4().hex, time.time()
        args = (
            ident,
            dedupe,
            kind,
            row.get("conversation"),
            row.get("generation", 0),
            row.get("binding_id"),
            row.get("version", 0),
            json.dumps(payload, ensure_ascii=False),
            now,
            expires or now + 300,
        )
        sql = "INSERT OR IGNORE INTO qq_media_jobs(id,dedupe,kind,conversation,generation,binding_id,version,payload,created,expires) VALUES(?,?,?,?,?,?,?,?,?,?)"

        def enqueue(connection):
            if kind in ("index", "describe"):
                existing = connection.execute(
                    "SELECT id FROM qq_media_jobs WHERE kind=? AND status IN ('pending','processing') AND json_extract(payload,'$.asset_id')=?",
                    (kind, payload.get("asset_id")),
                ).fetchone()
                if existing:
                    return existing["id"]
            if kind != "tts":
                from .media import MediaError

                count = connection.execute(
                    "SELECT count(*) FROM qq_media_jobs WHERE kind!='tts' AND status IN ('pending','processing')"
                ).fetchone()[0]
                hourly = connection.execute(
                    "SELECT count(*) FROM qq_media_jobs WHERE kind!='tts' AND created>?",
                    (now - 3600,),
                ).fetchone()[0]
                if count >= 100 or hourly >= 200:
                    raise MediaError("后台任务额度已满，请稍后重试")
            connection.execute(sql, args)
            return connection.execute(
                "SELECT id FROM qq_media_jobs WHERE dedupe=?", (dedupe,)
            ).fetchone()[0]

        if db is not None:
            return enqueue(db)
        with self.db() as connection:
            return enqueue(connection)

    def related_history(self, conv, generation, query, before, limit=10):
        rows = self.history(conv, generation, before, True, limit=1000)
        return sorted(
            (r for r in rows if relevance(query, r["content"]) > 0.05),
            key=lambda r: relevance(query, r["content"]),
            reverse=True,
        )[:limit]

    def media_event(self, row, event, message_id):
        """Resolve the planner's target from this group's live stored metadata."""
        records = self.rows(
            "SELECT sender,content,metadata,created,sequence FROM qq_messages WHERE conversation=? AND generation=? AND platform_id=? AND delivered=1 AND role='user' AND created>=? AND created<=?",
            (row["conversation"], row["generation"], message_id,
             time.time() - 86400, row["created"]),
        )
        if not records:
            raise MediaClarification("那条消息已经不在当前上下文里了，重新发一下吧。")
        original = records[0]
        metadata = json.loads(original["metadata"])
        return {
            **event, **metadata, "sender": original["sender"],
            "text": original["content"], "message_id": message_id,
            "event_time": original["created"], "segments": metadata.get("segments") or [],
            "_media_sequence": original["sequence"],
        }

    def resolve_media(self, row, event, *, requested=False, images_only=False):
        if event["scope"] != "group":
            return event
        import re

        def segments(metadata):
            return [s for s in (metadata.get("segments") or [])
                    if not images_only or s["type"] == "image"]

        if event["segments"]:
            return {**event, "segments": segments(event), "media_source": {
                "message_id": event["message_id"], "sender": event["sender"],
            }}
        if not event.get("reply_id") and not requested and not re.search(
            r"图|照片|表情|这张|这个|看见|看到|看看|说话|说两句|你说呢|语音|听听",
            event["text"], re.I,
        ):
            return event
        before = min(row["created"], event.get("event_time", row["created"]))
        records = self.rows(
            "SELECT m.platform_id,m.sender,m.content,m.metadata,m.created,m.sequence FROM qq_messages m WHERE conversation=? AND generation=? AND delivered=1 AND role='user' AND created>=? AND created<=? ORDER BY created DESC,sequence DESC,rowid DESC LIMIT 1000",
            (
                row["conversation"],
                row["generation"],
                time.time() - 86400,
                before,
            ),
        )
        current_sequence = event.get("_media_sequence") or next(
            (r["sequence"] for r in records if r["platform_id"] == event["message_id"]), 0
        )
        if current_sequence:
            # QQ timestamps often have only second precision. Never associate an
            # older selected question with an image that arrived later that second.
            records = [r for r in records if r["sequence"] <= current_sequence]
        index = {r["platform_id"]: r for r in records}

        def referenced(message_id):
            seen = set()
            for _ in range(4):
                if not message_id or message_id in seen or message_id not in index:
                    return None
                seen.add(message_id)
                record = index[message_id]
                metadata = json.loads(record["metadata"])
                if segments(metadata):
                    return record, segments(metadata)
                message_id = metadata.get("reply_id")
            return None

        def associate(candidate):
            if not candidate:
                return event
            record, media = candidate
            return {**event, "segments": media, "media_source": {
                "message_id": record["platform_id"], "sender": record["sender"],
            }}

        if event.get("reply_id"):
            # An explicit reference never falls back to somebody else's recent image.
            return associate(referenced(event["reply_id"]))
        recent = [r for r in records if r["sender"] == event["sender"]
                  and r["platform_id"] != event["message_id"] and r["created"] >= before - 120]
        if recent:
            # "说话" can continue the sender's latest image question, even if that
            # question quoted another member. Do not search unrelated old questions.
            latest = recent[0]
            latest_meta = json.loads(latest["metadata"])
            if latest_meta.get("reply_id"):
                return associate(referenced(latest["platform_id"]))
            if (not requested and re.fullmatch(r"(?:说话|说两句|你说呢)[！!？?。\s]*", event["text"])
                    and not segments(latest_meta)
                    and not re.search(r"图|照片|表情|这张|这个|看看", latest["content"])):
                return event
        candidates = []
        for record in recent:
            media = segments(json.loads(record["metadata"]))
            if media:
                candidates.append((record, media))
        if len(candidates) > 1:
            raise MediaClarification("你指的是哪张图？引用那条图片消息再问我吧。")
        return associate(candidates[0] if candidates else None)

    def reserve(self, row, event, plan, *, test_mode=False):
        now, target = time.time(), event["scope"] + ":" + event["target"]
        auto = event["scope"] == "group" and not event["direct"]
        group = self.group(event["target"]) if event["scope"] == "group" else None
        with self.db() as db:
            existing = db.execute(
                "SELECT status FROM qq_quota_reservations WHERE id=?", (row["id"],)
            ).fetchone()
            if existing and existing["status"] != "released":
                return True
            if existing:
                db.execute("DELETE FROM qq_quota_reservations WHERE id=?", (row["id"],))
            recent = [
                dict(r)
                for r in db.execute(
                    "SELECT * FROM qq_quota_reservations WHERE status!='released' AND created>?",
                    (now - 3600,),
                )
            ]
            local = [r for r in recent if r["target"] == target]
            if (
                sum(r["created"] > now - 60 for r in recent) >= 30
                or sum(r["created"] > now - 60 for r in local) >= 10
            ):
                return False
            if (
                sum(
                    r["sender"] == event["sender"] and r["created"] > now - 60
                    for r in recent
                )
                >= 6
            ):
                return False
            autonomous = [r for r in local if r["autonomous"]]
            if (
                auto
                and not test_mode
                and (
                    len(autonomous) >= group["hourly"]
                    or any(r["created"] > now - group["cooldown"] for r in autonomous)
                )
            ):
                return False
            images = [r for r in local if r["image"]]
            if plan.sticker_id and (
                len(images) >= 10 or any(r["created"] > now - 60 for r in images)
            ):
                plan.sticker_id = None
            voices = [r for r in local if r["voice"] and r["autonomous"]]
            if (
                auto
                and plan.voice
                and (len(voices) >= 2 or any(r["created"] > now - 600 for r in voices))
            ):
                plan.voice = False
            db.execute(
                "INSERT INTO qq_quota_reservations(id,target,sender,autonomous,image,voice,created) VALUES(?,?,?,?,?,?,?)",
                (
                    row["id"],
                    target,
                    event["sender"],
                    int(auto),
                    int(bool(plan.sticker_id)),
                    int(plan.voice),
                    now,
                ),
            )
        return True

    def reconcile_quotas(self):
        with self.db() as db:
            db.execute(
                "UPDATE qq_quota_reservations SET status='consumed' WHERE EXISTS(SELECT 1 FROM qq_outbox o WHERE o.inbox_id=qq_quota_reservations.id AND o.status IN ('delivered','unknown','sending'))"
            )
            db.execute(
                "UPDATE qq_quota_reservations SET status='released' WHERE status='reserved' AND NOT EXISTS(SELECT 1 FROM qq_outbox o WHERE o.inbox_id=qq_quota_reservations.id AND o.status IN ('pending','preparing','sending','delivered','unknown')) AND NOT EXISTS(SELECT 1 FROM qq_inbox i WHERE i.id=qq_quota_reservations.id AND i.status='processing')"
            )

    def clear_group(self, group):
        conv = self.conversation("group", group)
        with self.db() as db:
            db.execute(
                "UPDATE qq_conversations SET generation=generation+1 WHERE id=?",
                (conv["id"],),
            )
            for table in ("qq_inbox", "qq_outbox", "qq_media_jobs"):
                db.execute(
                    f"UPDATE {table} SET status=CASE WHEN status IN ('pending','processing','preparing') THEN 'cancelled' ELSE status END,payload='{{}}' WHERE conversation=? AND status!='sending'",
                    (conv["id"],),
                )
            for table in (
                "qq_messages",
                "qq_group_windows",
                "qq_group_decisions",
                "qq_reply_plans",
            ):
                db.execute(f"DELETE FROM {table} WHERE conversation=?", (conv["id"],))

    def cleanup_social(self):
        now = time.time()
        with self.db() as db:
            db.execute(
                "UPDATE qq_media_jobs SET status='expired',payload='{}' WHERE status='pending' AND expires<?",
                (now,),
            )
            db.execute(
                "UPDATE qq_media_jobs SET payload='{}' WHERE status NOT IN ('pending','processing') AND created<?",
                (now - 86400,),
            )
            for table in ("qq_reply_plans", "qq_group_decisions"):
                db.execute(f"DELETE FROM {table} WHERE created<?", (now - 86400,))
            db.execute(
                "DELETE FROM qq_quota_reservations WHERE created<?", (now - 86400,)
            )
            db.execute(
                "DELETE FROM qq_media_jobs WHERE created<? AND status NOT IN ('pending','processing')",
                (now - 7 * 86400,),
            )
            db.execute(
                "UPDATE qq_outbox SET payload='[]' WHERE scope='group' AND status NOT IN ('pending','sending') AND created<?",
                (now - 86400,),
            )
            db.execute(
                "UPDATE qq_inbox SET payload='{}',status='expired' WHERE created<? AND conversation IN (SELECT id FROM qq_conversations WHERE scope='group')",
                (now - 86400,),
            )
            db.execute(
                "UPDATE qq_inbox SET payload='{}',status='expired' WHERE conversation IN (SELECT id FROM qq_conversations WHERE scope='group') AND NOT EXISTS(SELECT 1 FROM qq_messages m WHERE m.inbox_id=qq_inbox.id AND m.role='user')"
            )
            db.execute(
                "UPDATE qq_outbox SET payload='[]',status=CASE WHEN status='pending' THEN 'cancelled' ELSE status END WHERE scope='group' AND status!='sending' AND inbox_id IN (SELECT id FROM qq_inbox WHERE status='expired')"
            )
            db.execute(
                "DELETE FROM qq_reply_plans WHERE id IN (SELECT id FROM qq_inbox WHERE status='expired')"
            )
        self.reconcile_quotas()
