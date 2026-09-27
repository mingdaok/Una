"""Single-worker durable QQ inbox/outbox. All state transitions use SQLite transactions."""

import hashlib
import asyncio
import json
import secrets
import sqlite3
import time
import uuid
from pathlib import Path
from contextlib import contextmanager, closing
from .social_store import SocialStore
from .audit_store import AuditStore, deadline

DEFAULTS = dict(
    share_profile=False,
    share_memory=False,
    share_history=False,
    share_life=False,
    voice_mode="follow",
    proactive=False,
    greeting=True,
    diary=True,
    life=True,
)


def dump(value):
    return json.dumps(value, ensure_ascii=False)


class ChannelStore(SocialStore, AuditStore):
    def __init__(self, path, bot_id, *, deferred=False):
        self.path, self.bot_id = str(path), bot_id
        self.initialized = False
        if not deferred:
            self.initialize()

    def initialize(self):
        if self.initialized:
            return
        path = self.path
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        # SQLite backup API includes WAL contents. Never migrate an existing instance without a backup.
        source = Path(path).resolve()
        if source.is_file() and source.stat().st_size:
            with closing(
                sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)
            ) as old:
                exists = old.execute(
                    "SELECT 1 FROM sqlite_master WHERE name='qq_schema'"
                ).fetchone()
                version = (
                    old.execute("SELECT max(version) FROM qq_schema").fetchone()[0]
                    if exists
                    else 0
                )
                if (version or 0) < 4:
                    backup = source.with_name(
                        source.name + f".pre-qq-v4-{time.time_ns()}.bak"
                    )
                    with closing(sqlite3.connect(backup)) as target:
                        old.backup(target)
        with closing(sqlite3.connect(self.path)) as setup:
            setup.execute("PRAGMA journal_mode=WAL")
        with self.db() as db:
            db.executescript("""
            CREATE TABLE IF NOT EXISTS qq_schema(version INTEGER PRIMARY KEY);
            CREATE TABLE IF NOT EXISTS qq_bindings(
              id TEXT PRIMARY KEY, bot TEXT NOT NULL, external_id TEXT NOT NULL,
              user_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
              active INTEGER NOT NULL DEFAULT 1, prefs TEXT NOT NULL,
              last_input REAL NOT NULL DEFAULT 0,
              UNIQUE(bot,external_id), UNIQUE(bot,user_id));
            CREATE TABLE IF NOT EXISTS qq_codes(
              id TEXT PRIMARY KEY, bot TEXT NOT NULL, user_id TEXT NOT NULL,
              digest TEXT UNIQUE NOT NULL, expires REAL NOT NULL, external_id TEXT,
              used INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS qq_groups(
              bot TEXT NOT NULL, group_id TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0,
              cooldown INTEGER NOT NULL DEFAULT 180, hourly INTEGER NOT NULL DEFAULT 6,
              version INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(bot,group_id));
            CREATE TABLE IF NOT EXISTS qq_conversations(
              id TEXT PRIMARY KEY, bot TEXT NOT NULL, scope TEXT NOT NULL, target TEXT NOT NULL,
              generation INTEGER NOT NULL DEFAULT 0, UNIQUE(bot,scope,target));
            CREATE TABLE IF NOT EXISTS qq_inbox(
              id TEXT PRIMARY KEY, dedupe TEXT UNIQUE NOT NULL, conversation TEXT NOT NULL,
              generation INTEGER NOT NULL, payload TEXT NOT NULL, binding_id TEXT,
              version INTEGER NOT NULL, created REAL NOT NULL, status TEXT NOT NULL,
              attempts INTEGER NOT NULL DEFAULT 0, error TEXT);
            CREATE TABLE IF NOT EXISTS qq_messages(
              id TEXT PRIMARY KEY, conversation TEXT NOT NULL, generation INTEGER NOT NULL,
              inbox_id TEXT, role TEXT NOT NULL, sender TEXT NOT NULL, content TEXT NOT NULL,
              created REAL NOT NULL, delivered INTEGER NOT NULL DEFAULT 0,
              platform_id TEXT, evidence TEXT NOT NULL DEFAULT '{}');
            CREATE TABLE IF NOT EXISTS qq_outbox(
              id TEXT PRIMARY KEY, inbox_id TEXT, conversation TEXT NOT NULL,
              generation INTEGER NOT NULL, binding_id TEXT, version INTEGER NOT NULL,
              scope TEXT NOT NULL, target TEXT NOT NULL, payload TEXT NOT NULL,
              kind TEXT NOT NULL, autonomous INTEGER NOT NULL DEFAULT 0,
              created REAL NOT NULL, expires REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
              attempts INTEGER NOT NULL DEFAULT 0, platform_id TEXT, error TEXT,
              dedupe TEXT UNIQUE, notification TEXT);
            CREATE TABLE IF NOT EXISTS qq_jobs(
              id TEXT PRIMARY KEY, inbox_id TEXT NOT NULL, binding_id TEXT NOT NULL,
              version INTEGER NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
              UNIQUE(inbox_id,kind));
            CREATE TABLE IF NOT EXISTS qq_history_exports(inbox_id TEXT PRIMARY KEY);
            INSERT OR IGNORE INTO qq_schema VALUES(1);
            CREATE INDEX IF NOT EXISTS qq_inbox_pending ON qq_inbox(status,created);
            CREATE INDEX IF NOT EXISTS qq_history ON qq_messages(conversation,created);
            CREATE INDEX IF NOT EXISTS qq_outbox_pending ON qq_outbox(status,created);
            """)

            # v2: protocol identity snapshots, preserving existing rows.
            db.execute("BEGIN IMMEDIATE")
            columns = {r[1] for r in db.execute("PRAGMA table_info(qq_messages)")}
            if "metadata" not in columns:
                db.execute(
                    "ALTER TABLE qq_messages ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}'"
                )
            db.execute("INSERT OR IGNORE INTO qq_schema VALUES(2)")
        self.migrate_social()
        self.migrate_audit()
        self.initialized = True

    def export_history(self, inbox_id, user):
        with self.db() as db:
            permission = db.execute(
                "SELECT b.prefs FROM qq_inbox i JOIN qq_bindings b ON b.id=i.binding_id JOIN qq_conversations c ON c.id=i.conversation WHERE i.id=? AND b.user_id=? AND b.active=1 AND b.version=i.version AND c.generation=i.generation AND c.scope='private'",
                (inbox_id, user),
            ).fetchone()
            if not permission or not json.loads(permission["prefs"]).get(
                "share_history"
            ):
                return
            if not db.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='chat_history'"
            ).fetchone():
                return
            if db.execute(
                "SELECT 1 FROM qq_history_exports WHERE inbox_id=?", (inbox_id,)
            ).fetchone():
                return
            rows = db.execute(
                "SELECT * FROM qq_messages WHERE inbox_id=? AND delivered=1 ORDER BY created",
                (inbox_id,),
            ).fetchall()
            if not any(r["role"] == "assistant" for r in rows):
                return
            for row in rows:
                db.execute(
                    "INSERT INTO chat_history(user_id,role,content,mood_score,audio_path,content_evidence_json,source_channel,source_message_id) VALUES(?,?,?,0,NULL,?,'qq',?)",
                    (
                        user,
                        "ai" if row["role"] == "assistant" else "user",
                        row["content"],
                        row["evidence"],
                        row["id"],
                    ),
                )
            db.execute("INSERT INTO qq_history_exports VALUES(?)", (inbox_id,))

    @contextmanager
    def db(self, *, write=True):
        try:
            asyncio.get_running_loop()
            timeout = 0.05  # Final submission guard must never freeze heartbeats.
        except RuntimeError:
            timeout = 10
        db = sqlite3.connect(self.path, timeout=timeout)
        db.row_factory = sqlite3.Row
        db.execute(f"PRAGMA busy_timeout={int(timeout*1000)}")
        try:
            db.execute("BEGIN IMMEDIATE" if write else "BEGIN")
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    def rows(self, sql, args=()):
        with self.db(write=False) as db:
            return [dict(r) for r in db.execute(sql, args)]

    def execute(self, sql, args=()):
        with self.db() as db:
            return db.execute(sql, args).rowcount

    def binding(self, *, user=None, external=None):
        field, value = (
            ("user_id", user) if user is not None else ("external_id", external)
        )
        rows = self.rows(
            f"SELECT * FROM qq_bindings WHERE bot=? AND {field}=? AND active=1",
            (self.bot_id, value),
        )
        if not rows:
            return None
        row = rows[0]
        row["prefs"] = {**DEFAULTS, **json.loads(row["prefs"])}
        return row

    def code(self, user):
        token, ident = secrets.token_urlsafe(16), uuid.uuid4().hex
        with self.db() as db:
            db.execute(
                "DELETE FROM qq_codes WHERE bot=? AND (user_id=? OR expires<?)",
                (self.bot_id, user, time.time()),
            )
            db.execute(
                "INSERT INTO qq_codes(id,bot,user_id,digest,expires) VALUES(?,?,?,?,?)",
                (
                    ident,
                    self.bot_id,
                    user,
                    hashlib.sha256(token.encode()).hexdigest(),
                    time.time() + 300,
                ),
            )
        return dict(id=ident, code=token, expires_in=300)

    def claim_code(self, token, external):
        return (
            self.execute(
                "UPDATE qq_codes SET external_id=?, used=1 WHERE bot=? AND digest=? AND used=0 AND expires>?",
                (
                    external,
                    self.bot_id,
                    hashlib.sha256(token.encode()).hexdigest(),
                    time.time(),
                ),
            )
            == 1
        )

    def confirm(self, user, code_id):
        with self.db() as db:
            code = db.execute(
                "SELECT * FROM qq_codes WHERE id=? AND bot=? AND user_id=? AND used=1 AND expires>?",
                (code_id, self.bot_id, user, time.time()),
            ).fetchone()
            if not code:
                raise ValueError("绑定请求无效或已过期")
            existing = db.execute(
                "SELECT * FROM qq_bindings WHERE bot=? AND (external_id=? OR user_id=?)",
                (self.bot_id, code["external_id"], user),
            ).fetchall()
            if any(r["active"] for r in existing):
                raise ValueError("账号已绑定，请先解除旧绑定")
            for r in existing:
                db.execute("DELETE FROM qq_bindings WHERE id=?", (r["id"],))
            db.execute(
                "INSERT INTO qq_bindings(id,bot,external_id,user_id,prefs) VALUES(?,?,?,?,?)",
                (
                    uuid.uuid4().hex,
                    self.bot_id,
                    code["external_id"],
                    user,
                    dump(DEFAULTS),
                ),
            )
            db.execute(
                "UPDATE qq_conversations SET generation=generation+1 WHERE bot=? AND scope='private' AND target=?",
                (self.bot_id, code["external_id"]),
            )
            db.execute("DELETE FROM qq_codes WHERE id=?", (code_id,))

    def preferences(self, user, prefs=None):
        binding = self.binding(user=user)
        if not binding:
            raise ValueError("尚未绑定 QQ")
        with self.db() as db:
            if prefs is None:
                db.execute(
                    "UPDATE qq_bindings SET active=0,version=version+1 WHERE id=?",
                    (binding["id"],),
                )
            else:
                merged = {**binding["prefs"], **prefs}
                db.execute(
                    "UPDATE qq_bindings SET prefs=?,version=version+1 WHERE id=?",
                    (dump(merged), binding["id"]),
                )
            for table in ("qq_inbox", "qq_outbox", "qq_jobs", "qq_media_jobs"):
                db.execute(
                    f"UPDATE {table} SET status='cancelled' WHERE binding_id=? AND status IN ('pending','processing','preparing')",
                    (binding["id"],),
                )
        return self.binding(user=user)

    def group(self, target):
        existing = self.rows(
            "SELECT * FROM qq_groups WHERE bot=? AND group_id=?", (self.bot_id, target)
        )
        if existing:
            return existing[0]
        self.execute(
            "INSERT OR IGNORE INTO qq_groups(bot,group_id) VALUES(?,?)",
            (self.bot_id, target),
        )
        return self.rows(
            "SELECT * FROM qq_groups WHERE bot=? AND group_id=?", (self.bot_id, target)
        )[0]

    def set_group(self, target, enabled, cooldown, hourly):
        self.group(target)
        self.execute(
            "UPDATE qq_groups SET enabled=?,cooldown=?,hourly=?,version=version+1 WHERE bot=? AND group_id=?",
            (int(enabled), cooldown, hourly, self.bot_id, target),
        )

    def conversation(self, scope, target):
        with self.db() as db:
            db.execute(
                "INSERT OR IGNORE INTO qq_conversations(id,bot,scope,target) VALUES(?,?,?,?)",
                (uuid.uuid4().hex, self.bot_id, scope, target),
            )
            return dict(
                db.execute(
                    "SELECT * FROM qq_conversations WHERE bot=? AND scope=? AND target=?",
                    (self.bot_id, scope, target),
                ).fetchone()
            )

    def seen(self, event):
        key = dump(
            [
                self.bot_id,
                event["scope"],
                event["target"],
                event["sender"],
                event["message_id"],
            ]
        )
        return bool(self.rows("SELECT 1 FROM qq_inbox WHERE dedupe=?", (key,)))

    def ingest(self, event, binding, version, queue_limit):
        conv = self.conversation(event["scope"], event["target"])
        dedupe = dump(
            [
                self.bot_id,
                event["scope"],
                event["target"],
                event["sender"],
                event["message_id"],
            ]
        )
        ident, now = uuid.uuid4().hex, time.time()
        stamp = event.get("event_time", event.get("original_time", now))
        ttl = 60 if event["scope"] == "group" and not event["direct"] else 300
        expires = min(stamp, now) + ttl
        with self.db() as db:
            if db.execute(
                "SELECT 1 FROM qq_platform_messages WHERE conversation=? AND generation=? AND platform_id=?",
                (conv["id"], conv["generation"], event["message_id"]),
            ).fetchone():
                return "duplicate"
            if db.execute(
                "SELECT 1 FROM qq_inbox WHERE dedupe=?", (dedupe,)
            ).fetchone():
                return "duplicate"
            count = db.execute(
                "SELECT count(*) FROM qq_inbox WHERE status IN ('pending','processing')"
            ).fetchone()[0]
            status = "pending" if count < queue_limit else "rejected"
            local = db.execute(
                "SELECT count(*) FROM qq_inbox WHERE conversation=? AND status IN ('pending','processing')",
                (conv["id"],),
            ).fetchone()[0]
            if local >= 5 and event["direct"]:
                status = "rejected"
            if event.get("source") == "backfill":
                status = "skipped"
            elif expires <= now or stamp > now + 30:
                status = "expired"
            db.execute(
                "INSERT INTO qq_inbox(id,dedupe,conversation,generation,payload,binding_id,version,created,status) VALUES(?,?,?,?,?,?,?,?,?)",
                (
                    ident,
                    dedupe,
                    conv["id"],
                    conv["generation"],
                    dump(event),
                    binding["id"] if binding else None,
                    version,
                    now,
                    status,
                ),
            )
            db.execute(
                "UPDATE qq_inbox SET event_time=?,received_at=?,time_source=?,expires=? WHERE id=?",
                (stamp, now, event.get("time_source", "received"), expires, ident),
            )
            if binding and status != "expired":
                db.execute(
                    "UPDATE qq_bindings SET last_input=? WHERE id=?",
                    (now, binding["id"]),
                )
                db.execute(
                    "UPDATE qq_outbox SET status='cancelled' WHERE binding_id=? AND notification='greeting' AND status IN ('pending','preparing')",
                    (binding["id"],),
                )
            db.execute(
                "INSERT INTO qq_messages(id,conversation,generation,inbox_id,role,sender,content,created,delivered,platform_id) VALUES(?,?,?,?,?,?,?,?,1,?)",
                (
                    uuid.uuid4().hex,
                    conv["id"],
                    conv["generation"],
                    ident,
                    "user",
                    event["sender"],
                    event["text"],
                    stamp,
                    event["message_id"],
                ),
            )
            if event.get("source") != "backfill":
                db.execute(
                    "UPDATE qq_conversations SET message_seq=message_seq+1 WHERE id=?",
                    (conv["id"],),
                )
                db.execute(
                    "UPDATE qq_messages SET sequence=(SELECT message_seq FROM qq_conversations WHERE id=?) WHERE inbox_id=?",
                    (conv["id"], ident),
                )
            db.execute(
                "UPDATE qq_messages SET metadata=? WHERE inbox_id=? AND role='user'",
                (
                    dump(
                        {
                            k: event.get(k)
                            for k in (
                                "sender_name",
                                "mentions",
                                "reply_id",
                                "segments",
                                "source",
                            )
                        }
                    ),
                    ident,
                ),
            )
            db.execute(
                "INSERT OR IGNORE INTO qq_platform_messages(conversation,generation,platform_id,message_id) SELECT conversation,generation,platform_id,id FROM qq_messages WHERE inbox_id=?",
                (ident,),
            )
        if event["scope"] == "group" and not event["direct"] and status == "pending":
            self.observe(conv["id"], conv["generation"], now)
        return status

    def reset(self, scope, target):
        conv = self.conversation(scope, target)
        self.execute(
            "UPDATE qq_conversations SET generation=generation+1 WHERE id=?",
            (conv["id"],),
        )

    def history(self, conv, generation, before=None, group=False, limit=None):
        query = "SELECT role,sender,content,platform_id,inbox_id,metadata,created FROM qq_messages WHERE conversation=? AND generation=? AND delivered=1 AND created>=?"
        args = [conv, generation, time.time() - 86400 if group else 0]
        if before is not None:
            query += " AND created<?"
            args.append(before)
        rows = self.rows(
            query + " ORDER BY created DESC LIMIT ?",
            (*args, limit or (60 if group else 20)),
        )
        rows = list(reversed(rows))
        if group:
            target = self.rows(
                "SELECT target FROM qq_conversations WHERE id=?", (conv,)
            )[0]["target"]
            references = self._group_reference_index(conv, generation)
            part_ids = {}
            for part in self.rows(
                "SELECT inbox_id,platform_id FROM qq_outbox WHERE conversation=? AND generation=? AND status='delivered' AND recalled=0 ORDER BY created,rowid",
                (conv, generation),
            ):
                part_ids.setdefault(part["inbox_id"], []).append(part["platform_id"])
            for row in rows:
                meta = json.loads(row.pop("metadata"))
                row["identity"] = self.group_message(
                    conv,
                    generation,
                    target,
                    row["sender"],
                    row["content"],
                    meta,
                    role=row["role"],
                    message_id=row["platform_id"],
                    inbox_id=row["inbox_id"],
                    references=references,
                    part_ids=part_ids.get(row["inbox_id"], []),
                )
        return rows

    def _group_reference_index(self, conv, generation):
        rows = self.rows(
            "SELECT * FROM qq_messages WHERE conversation=? AND generation=? AND delivered=1 AND created>=? ORDER BY created DESC LIMIT 1000",
            (conv, generation, time.time() - 86400),
        )
        index = {r["platform_id"]: r for r in rows if r["platform_id"] is not None}
        assistants = {
            r["inbox_id"]: r for r in rows if r["role"] == "assistant" and r["inbox_id"]
        }
        for out in self.rows(
            "SELECT inbox_id,platform_id,payload,kind FROM qq_outbox WHERE conversation=? AND generation=? AND kind IN ('text','image','audio') AND status='delivered' AND recalled=0 AND created>=?",
            (conv, generation, time.time() - 86400),
        ):
            if out["inbox_id"] in assistants and out["platform_id"] is not None:
                part_content = "".join(
                    seg["data"].get("text", "")
                    for seg in json.loads(out["payload"])
                    if seg["type"] == "text"
                )
                index[out["platform_id"]] = {
                    **assistants[out["inbox_id"]],
                    "content": part_content
                    or ("[图片]" if out["kind"] == "image" else "[语音]"),
                }
        return index

    def group_message(
        self,
        conv,
        generation,
        group,
        sender,
        content,
        meta,
        *,
        role="user",
        message_id=None,
        inbox_id=None,
        references=None,
        part_ids=None,
    ):
        from .identity import group_record

        reply = None
        reply_id = meta.get("reply_id")
        if reply_id:
            # Resolve only inside this group's retained context, never remote/private history.
            if references is None:
                references = self._group_reference_index(conv, generation)
            match = references.get(reply_id)
            reply = {"message_id": reply_id, "status": "unknown"}
            if match:
                original = group_record(
                    group,
                    match["sender"],
                    match["content"],
                    name=json.loads(match["metadata"]).get("sender_name") or "",
                    role=match["role"],
                    message_id=reply_id,
                )
                reply = {"status": "resolved", **original}
        record = group_record(
            group,
            sender,
            content,
            name=meta.get("sender_name") or "",
            role=role,
            message_id=message_id,
            mentions=meta.get("mentions") or (),
            reply=reply,
        )
        record["media_types"] = list(dict.fromkeys(
            segment["type"] for segment in (meta.get("segments") or [])
            if segment.get("type") in ("image", "record")
        ))
        if role == "assistant" and inbox_id:
            record["response_to_message_id"] = meta.get("response_to_message_id") or meta.get("reply_id")
            record["message_ids"] = (
                part_ids
                if part_ids is not None
                else [
                    r["platform_id"]
                    for r in self.rows(
                        "SELECT platform_id FROM qq_outbox WHERE inbox_id=? AND kind='text' AND status='delivered' AND recalled=0 ORDER BY created,id",
                        (inbox_id,),
                    )
                ]
            )
        return record

    def known_reply(self, group, message_id):
        return bool(
            self.rows(
                "SELECT 1 FROM qq_outbox WHERE scope='group' AND target=? AND platform_id=? AND status='delivered' AND recalled=0 AND conversation IN (SELECT id FROM qq_conversations c WHERE c.bot=? AND c.generation=qq_outbox.generation) LIMIT 1",
                (group, message_id, self.bot_id),
            )
        )

    def complete(
        self,
        job,
        text,
        evidence,
        audio=None,
        jobs=(),
        *,
        plan=None,
        sticker=None,
        tts=False,
    ):
        event = json.loads(job["payload"])
        text = text[:1500]
        now = time.time()
        with self.db() as db:
            current = db.execute(
                "SELECT status FROM qq_inbox WHERE id=?", (job["id"],)
            ).fetchone()
            if not current or current["status"] != "processing" or deadline(job) <= now:
                return
            if plan:
                db.execute(
                    "INSERT OR IGNORE INTO qq_reply_plans(id,conversation,generation,payload,created,expires) VALUES(?,?,?,?,?,?)",
                    (
                        job["id"],
                        job["conversation"],
                        job["generation"],
                        plan.model_dump_json(),
                        now,
                        deadline(job),
                    ),
                )
            if plan:
                dependencies = []
                if event["scope"] == "group":
                    dependencies = [
                        plan.reply_to_message_id or event["message_id"]
                    ] + job.get("context_dependencies", [])
                    if (
                        event.get("reply_id")
                        and db.execute(
                            "SELECT 1 FROM qq_platform_messages WHERE conversation=? AND generation=? AND platform_id=? AND recalled=0",
                            (job["conversation"], job["generation"], event["reply_id"]),
                        ).fetchone()
                    ):
                        dependencies.append(event["reply_id"])
                    dependencies = list(dict.fromkeys(dependencies))
                db.execute(
                    "UPDATE qq_reply_plans SET watermark=?,dependencies=?,test_percent=?,test_until=? WHERE id=?",
                    (
                        job.get(
                            "watermark",
                            self.watermark(job["conversation"], job["generation"]),
                        ),
                        dump(dependencies),
                        job.get("test_percent", 0),
                        job.get("test_until"),
                        job["id"],
                    ),
                )
            db.execute(
                "INSERT INTO qq_messages(id,conversation,generation,inbox_id,role,sender,content,created,evidence) VALUES(?,?,?,?,?,?,?,?,?)",
                (
                    uuid.uuid4().hex,
                    job["conversation"],
                    job["generation"],
                    job["id"],
                    "assistant",
                    self.bot_id,
                    text,
                    now,
                    dump(evidence),
                ),
            )
            reply_target = (
                plan.reply_to_message_id
                if plan and plan.reply_to_message_id
                else event["message_id"]
            )
            quote_reply = bool(event["scope"] == "group" and plan and plan.reply_style == "quote")
            db.execute(
                "UPDATE qq_messages SET metadata=? WHERE inbox_id=? AND role='assistant'",
                (dump({"sender_name": "UNA", "reply_id": reply_target if quote_reply else None,
                       "response_to_message_id": reply_target}), job["id"]),
            )
            parts = [text[i : i + 500] for i in range(0, min(len(text), 1500), 500)]
            for index, part in enumerate(parts):
                segments = [{"type": "text", "data": {"text": part}}]
                if quote_reply and index == 0:
                    segments.insert(0, {"type": "reply", "data": {"id": reply_target}})
                self._out(
                    db, job, event, segments, "text", f"{job['id']}:text:{index}", now
                )
            first = db.execute(
                "SELECT id FROM qq_outbox WHERE inbox_id=? AND kind='text' ORDER BY rowid LIMIT 1",
                (job["id"],),
            ).fetchone()
            if sticker:
                image = [{"type": "image", "data": {"file": sticker["uri"]}}]
                if not text and quote_reply:
                    image.insert(0, {"type": "reply", "data": {"id": reply_target}})
                self._out(db, job, event, image, "image", job["id"] + ":image", now)
                db.execute(
                    "UPDATE qq_outbox SET asset_id=?,asset_version=?,depends_on=? WHERE dedupe=?",
                    (
                        sticker["id"],
                        sticker["version"],
                        first["id"] if first else None,
                        job["id"] + ":image",
                    ),
                )
                if not text:
                    db.execute(
                        "UPDATE qq_messages SET content=? WHERE inbox_id=? AND role='assistant'",
                        ("[表情：" + sticker["description"][:200] + "]", job["id"]),
                    )
            if tts:
                self.media_job(
                    "tts",
                    {
                        "inbox_id": job["id"],
                        "text": text,
                        "emotion": plan.emotion if plan else "neutral",
                    },
                    dedupe=job["id"] + ":tts",
                    row=job,
                    expires=deadline(job),
                    db=db,
                )
            if audio:
                self._out(
                    db,
                    job,
                    event,
                    [{"type": "record", "data": {"file": audio}}],
                    "audio",
                    f"{job['id']}:audio",
                    now,
                )
            for kind, payload in jobs:
                db.execute(
                    "INSERT OR IGNORE INTO qq_jobs(id,inbox_id,binding_id,version,kind,payload) VALUES(?,?,?,?,?,?)",
                    (
                        uuid.uuid4().hex,
                        job["id"],
                        job["binding_id"],
                        job["version"],
                        kind,
                        dump(payload),
                    ),
                )
            db.execute("UPDATE qq_inbox SET status='done' WHERE id=?", (job["id"],))

    def _out(self, db, job, event, segments, kind, dedupe, now):
        autonomous = event["scope"] == "group" and not event["direct"]
        db.execute(
            """INSERT OR IGNORE INTO qq_outbox(id,inbox_id,conversation,generation,binding_id,version,scope,target,payload,kind,autonomous,created,expires,dedupe)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                uuid.uuid4().hex,
                job["id"],
                job["conversation"],
                job["generation"],
                job["binding_id"],
                job["version"],
                event["scope"],
                event["target"],
                dump(segments),
                kind,
                int(autonomous),
                now,
                deadline(job),
                dedupe,
            ),
        )

    def commit_profile(self, job, user, profile):
        with self.db() as db:
            binding = db.execute(
                "SELECT active,version FROM qq_bindings WHERE id=?",
                (job["binding_id"],),
            ).fetchone()
            if (
                not binding
                or not binding["active"]
                or binding["version"] != job["version"]
            ):
                db.execute(
                    "UPDATE qq_jobs SET status='cancelled' WHERE id=?", (job["id"],)
                )
                return
            db.execute(
                "INSERT INTO user_profile(user_id,profile_data) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET profile_data=excluded.profile_data,last_updated=CURRENT_TIMESTAMP",
                (user, profile),
            )
            db.execute("UPDATE qq_jobs SET status='done' WHERE id=?", (job["id"],))

    def delivered(self, row, platform_id):
        with self.db() as db:
            db.execute(
                "UPDATE qq_outbox SET status='delivered',platform_id=?,recalled=coalesce((SELECT recalled FROM qq_platform_messages WHERE conversation=? AND generation=? AND platform_id=?),0) WHERE id=?",
                (
                    str(platform_id),
                    row["conversation"],
                    row["generation"],
                    str(platform_id),
                    row["id"],
                ),
            )
            if row["notification"]:
                db.execute(
                    "UPDATE qq_messages SET delivered=1 WHERE id=?", (row["id"],)
                )
            if row["inbox_id"]:
                message = db.execute(
                    "SELECT id FROM qq_messages WHERE inbox_id=? AND role='assistant'",
                    (row["inbox_id"],),
                ).fetchone()
                if message:
                    db.execute(
                        "INSERT INTO qq_platform_messages(conversation,generation,platform_id,message_id,outbox_id) VALUES(?,?,?,?,?) ON CONFLICT(conversation,generation,platform_id) DO UPDATE SET message_id=excluded.message_id,outbox_id=excluded.outbox_id",
                        (
                            row["conversation"],
                            row["generation"],
                            str(platform_id),
                            message["id"],
                            row["id"],
                        ),
                    )
                if row["scope"] == "group":
                    self.rebuild_delivered(db, row["inbox_id"])
                    return
                pending = db.execute(
                    "SELECT 1 FROM qq_outbox WHERE inbox_id=? AND kind='text' AND status!='delivered'",
                    (row["inbox_id"],),
                ).fetchone()
                if not pending and row["kind"] in ("text", "image"):
                    db.execute(
                        "UPDATE qq_messages SET delivered=1 WHERE inbox_id=? AND role='assistant'",
                        (row["inbox_id"],),
                    )

    def recover(self):
        # A previous sending operation may already have reached QQ: never replay it.
        self.execute(
            "UPDATE qq_outbox SET status='unknown',error='process_restarted' WHERE status='sending'"
        )
        self.execute(
            "UPDATE qq_inbox SET status=CASE WHEN attempts<3 THEN 'pending' ELSE 'failed' END WHERE status='processing'"
        )
        # Side effects may have happened. Stable vector IDs are safe to replay; profile jobs are at-most-once.
        self.execute(
            "UPDATE qq_jobs SET status=CASE WHEN kind='memory' THEN 'pending' ELSE 'unknown' END WHERE status='processing'"
        )
        self.execute(
            "UPDATE qq_media_jobs SET status=CASE WHEN attempts<3 THEN 'pending' ELSE 'failed' END WHERE status='processing'"
        )
        self.execute("UPDATE qq_outbox SET status='pending' WHERE status='preparing'")
        self.execute(
            "UPDATE qq_inbox SET status='expired' WHERE status IN ('pending','processing') AND expires<=?",
            (time.time(),),
        )
        self.reconcile_quotas()

    def cleanup(self):
        now = time.time()
        with self.db() as db:
            db.execute("DELETE FROM qq_codes WHERE expires<?", (now,))
            db.execute(
                "DELETE FROM qq_messages WHERE conversation IN (SELECT id FROM qq_conversations WHERE scope='group') AND (created<? OR id NOT IN (SELECT m.id FROM qq_messages m WHERE m.conversation=qq_messages.conversation ORDER BY m.created DESC LIMIT 1000))",
                (now - 86400,),
            )
            db.execute(
                "UPDATE qq_outbox SET status='expired' WHERE status='pending' AND expires<?",
                (now,),
            )
            db.execute(
                "UPDATE qq_inbox SET payload='{}' WHERE status NOT IN ('pending','processing') AND created<?",
                (now - 86400,),
            )
            db.execute(
                "DELETE FROM qq_inbox WHERE status NOT IN ('pending','processing') AND created<?",
                (now - 7 * 86400,),
            )
            db.execute(
                "DELETE FROM qq_outbox WHERE status NOT IN ('pending','sending') AND created<?",
                (now - 30 * 86400,),
            )
        self.cleanup_social()
