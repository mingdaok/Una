"""QQ lifecycle, durable scheduling, audience boundaries and delivery."""

import asyncio
from .async_db import database_call
import json
import logging
import re
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime
from zoneinfo import ZoneInfo
from .adapter import OneBotAdapter, SendFailed, SendUnknown, normalize
from .store import dump
from .audit_store import deadline
from .lease import WorkerLease
from .social_runtime import SocialRuntime

log = logging.getLogger(__name__)
HELP = "我是 UNA。请在网页的 QQ 连接中生成绑定码，私聊发送 /una bind <code>，再回网页确认。命令：/una help、/una status、/una reset。"


class QQService:
    def __init__(self, config, store, conversation, database, media=None):
        self.config, self.store, self.conversation, self.database = (
            config,
            store,
            conversation,
            database,
        )
        self.adapter = OneBotAdapter(config)
        self.media = media
        self.tasks = []
        self.active = {}
        self.stopping = False
        self.started = False
        self.rates = defaultdict(deque)
        self.last_maintenance = 0
        self.lease = WorkerLease(store.path)
        self.metrics = defaultdict(int)
        self.profile_locks = defaultdict(asyncio.Lock)
        self.social = SocialRuntime(self)

    def rate(self, key, limit=6):
        now = time.time()
        queue = self.rates[key]
        while queue and queue[0] < now - 60:
            queue.popleft()
        if len(queue) >= limit:
            return False
        queue.append(now)
        return True

    async def receive(self, data):
        await database_call(self.receive_sync, data)

    def receive_sync(self, data):
        if data.get("post_type") == "notice":
            group = str(data.get("group_id", ""))
            if (
                data.get("notice_type") == "group_ban"
                and group in self.config.groups
                and str(data.get("user_id", "")) in (self.config.bot_id, "0")
            ):
                self.store.group(group)
                try:
                    duration = max(0, min(86400 * 30, int(data.get("duration", 0))))
                except (ValueError, TypeError):
                    return
                self.store.execute(
                    "UPDATE qq_groups SET muted_until=?,version=version+1 WHERE bot=? AND group_id=?",
                    (
                        time.time() + duration if duration else 0,
                        self.config.bot_id,
                        group,
                    ),
                )
            self.social.recall(data)
            return
        event = normalize(data, self.config.bot_id, self.store.known_reply)
        if not event or not event["text"]:
            return
        ttl = 300 if event["direct"] else 60
        if event["event_time"] + ttl <= time.time():
            self.metrics["expired"] += 1
            return
        self.metrics["received"] += 1
        if self.store.seen(event):
            self.metrics["duplicate"] += 1
            return
        binding = None
        if event["scope"] == "group":
            if event["target"] not in self.config.groups:
                return
            group = self.store.group(event["target"])
            if not group["enabled"]:
                return
            if re.search(
                r"别(?:再)?插话|不要(?:再)?插话|停止(?:回复|发言)|闭嘴", event["text"]
            ):
                self.store.execute(
                    "UPDATE qq_groups SET quiet_until=? WHERE bot=? AND group_id=?",
                    (time.time() + 60, self.config.bot_id, event["target"]),
                )
            version = group["version"]
        else:
            if event["sender"] not in self.config.users:
                return
            binding = self.store.binding(external=event["sender"])
            if binding and not self.account_active(binding["user_id"]):
                return
            version = binding["version"] if binding else 0
            if event["text"].startswith("/una bind "):
                # Claim synchronously; discard the secret before any durable event/log.
                if not self.rate("bind:" + event["sender"]):
                    return
                accepted = self.store.claim_code(
                    event["text"][10:].strip(), event["sender"]
                )
                event["text"] = "[绑定请求]"
                event["system_reply"] = (
                    "已收到，请回 UNA 网页确认绑定。"
                    if accepted
                    else "绑定码无效、已使用或已过期。"
                )
            elif event["text"] == "/una reset" and binding:
                self.store.reset("private", event["target"])
                event["system_reply"] = "已开始新的 QQ 会话，长期记忆和网页历史未删除。"
            elif event["text"] == "/una status":
                event["system_reply"] = (
                    "已绑定。设置请在 UNA 网页中调整。"
                    if binding
                    else "尚未绑定。" + HELP
                )
            elif event["text"] == "/una help" or not binding:
                event["system_reply"] = HELP
        if event["scope"] == "group" and event["text"].startswith("/una "):
            event["system_reply"] = "账号绑定与个人设置请私聊我，并在 UNA 网页确认。"
            event["direct"] = True
        if event["direct"] and not self.rate("user:" + event["sender"]):
            self.metrics["rate_limited"] += 1
            if not self.rate("limit_hint:" + event["sender"], 1):
                return
            event["system_reply"] = "消息有点快，请稍等一分钟再试。"
        result = self.store.ingest(event, binding, version, self.config.queue_limit)
        if result != "duplicate":
            self.social.queue_collection(event)
        self.metrics[result] += 1
        if (
            result == "rejected"
            and event["direct"]
            and self.rate("busy:" + event["sender"], 1)
        ):
            dedupe = dump(
                [
                    self.config.bot_id,
                    event["scope"],
                    event["target"],
                    event["sender"],
                    event["message_id"],
                ]
            )
            rejected = self.store.rows(
                "SELECT * FROM qq_inbox WHERE dedupe=?", (dedupe,)
            )[0]
            self.store.execute(
                "UPDATE qq_inbox SET status='processing' WHERE id=?", (rejected["id"],)
            )
            self.store.complete(rejected, "我现在有点忙，请稍后再发一次。", {})

    def account_active(self, user):
        account = self.database.get_app_user_by_id(user)
        return bool(account and account.get("is_active", True))

    def valid(self, row):
        conv = self.store.rows(
            "SELECT * FROM qq_conversations WHERE id=?", (row["conversation"],)
        )
        if (
            not conv
            or conv[0]["bot"] != self.config.bot_id
            or conv[0]["generation"] != row["generation"]
        ):
            return False
        scope = conv[0]["scope"]
        target = conv[0]["target"]
        if scope == "group":
            if target not in self.config.groups:
                return False
            group = self.store.group(target)
            return bool(
                group["enabled"]
                and group["muted_until"] <= time.time()
                and group["version"] == row["version"]
            )
        if target not in self.config.users:
            return False
        binding = self.store.binding(external=target)
        if not row["binding_id"]:
            return row["version"] == 0 and not binding
        return bool(
            binding
            and binding["id"] == row["binding_id"]
            and binding["version"] == row["version"]
            and self.account_active(binding["user_id"])
        )

    async def start(self):
        if not self.config.enabled or self.config.error:
            return
        self.lease.acquire()
        try:
            await database_call(self.store.initialize)
            await database_call(self.store.recover)
        except BaseException:
            self.lease.release()
            raise
        self.started = True
        self.tasks = [
            asyncio.create_task(self.run()),
            asyncio.create_task(self.deliver()),
            asyncio.create_task(self.postprocess()),
            asyncio.create_task(self.social.worker("history")),
            asyncio.create_task(self.social.worker("describe")),
            asyncio.create_task(self.social.worker("index")),
            asyncio.create_task(self.notification_loop()),
            asyncio.create_task(self.social.worker("tts")),
        ]

    async def close(self):
        self.stopping = True
        for task in self.tasks + list(self.active.values()):
            task.cancel()
        await asyncio.gather(*self.tasks, *self.active.values(), return_exceptions=True)
        await self.adapter.close()
        if self.started:
            await database_call(self.store.recover)
            self.lease.release()
            self.started = False

    async def run(self):
        while not self.stopping:
            try:
                for key, task in list(self.active.items()):
                    if task.done():
                        try:
                            task.result()
                        except asyncio.CancelledError:
                            pass
                        except Exception:
                            log.exception("QQ worker failed")
                        del self.active[key]
                if time.time() - self.last_maintenance > 60:
                    await database_call(self.store.cleanup)
                    await database_call(self.social.library.cleanup)
                    if self.media:
                        self.media.cleanup()
                    self.last_maintenance = time.time()

                    self.rates = defaultdict(
                        deque,
                        {
                            k: v
                            for k, v in self.rates.items()
                            if v and v[-1] > time.time() - 60
                        },
                    )
                pending = await database_call(
                    self.store.rows,
                    "SELECT * FROM qq_inbox WHERE status='pending' ORDER BY CASE WHEN json_extract(payload,'$.direct')=1 THEN 0 ELSE 1 END,created LIMIT 100",
                )
                for row in pending:
                    if len(self.active) >= self.config.concurrency:
                        break
                    if deadline(row) <= time.time():
                        await database_call(
                            self.store.execute,
                            "UPDATE qq_inbox SET status='expired' WHERE id=?",
                            (row["id"],),
                        )
                        continue
                    conv = row["conversation"]
                    if conv in self.active:
                        continue
                    event = json.loads(row["payload"])
                    if event["scope"] == "group" and not event["direct"]:
                        if not (await database_call(self.store.window_ready, conv)):
                            continue
                        row = await database_call(self.store.freeze_window, conv)
                        if not row:
                            continue
                        if row["created"] < time.time() - 60:
                            (
                                await database_call(
                                    self.store.execute,
                                    "UPDATE qq_inbox SET status='skipped' WHERE id=?",
                                    (row["id"],),
                                )
                            )
                            continue
                    if await database_call(
                        self.store.execute,
                        "UPDATE qq_inbox SET status='processing',attempts=attempts+1 WHERE id=? AND status='pending'",
                        (row["id"],),
                    ):
                        self.active[conv] = asyncio.create_task(self.process(row))
            except Exception:
                log.exception("QQ scheduler failed")
            await asyncio.sleep(0.25)

    def can_join(self, target):
        group = self.store.group(target)
        if max(group["muted_until"], group["quiet_until"]) > time.time():
            return False
        if self.store.test_mode(target, self.config.test_reply_percent)[0]:
            return True  # Test probability replaces autonomous cooldown; reserve still enforces total quotas.
        group = self.store.group(target)
        rows = self.store.rows(
            "SELECT created FROM qq_outbox WHERE scope='group' AND target=? AND autonomous=1 AND kind='text' AND status IN ('pending','preparing','sending','delivered','unknown') AND created>?",
            (target, time.time() - 3600),
        )
        return len(rows) < min(6, group["hourly"]) and (
            not rows
            or max(r["created"] for r in rows)
            < time.time() - max(180, group["cooldown"])
        )

    async def process(self, row):
        await self.social.generate(row)

    def commit_send(self, row):
        # The short write transaction serializes permission changes against the
        # submission boundary. It performs no network/model work and no await.
        with self.store.db() as db:
            if not self.valid(row) or not self.store.submission_current(row):
                return False
            if (
                row["notification"]
                and not 8 <= datetime.now(ZoneInfo("Asia/Shanghai")).hour < 22
            ):
                return False
            if row.get("asset_id") and not self.social.library.usable(
                row["asset_id"],
                row["target"] if row["scope"] == "group" else "public",
                row["asset_version"],
            ):
                return False
            return bool(
                db.execute(
                    "UPDATE qq_outbox SET status='sending',submitted_at=? WHERE id=? AND status='preparing'",
                    (time.time(), row["id"]),
                ).rowcount
            )

    async def deliver(self):
        while not self.stopping:
            try:
                if self.adapter.socket:
                    rows = await database_call(
                        self.store.rows,
                        "SELECT * FROM qq_outbox WHERE status='pending' ORDER BY created,rowid LIMIT 20",
                    )
                    for row in rows:
                        if (
                            row["notification"]
                            and not 8
                            <= datetime.now(ZoneInfo("Asia/Shanghai")).hour
                            < 22
                        ):
                            (
                                await database_call(
                                    self.store.execute,
                                    "UPDATE qq_outbox SET status='expired' WHERE id=?",
                                    (row["id"],),
                                )
                            )
                            continue
                        if not self.valid(row) or row["expires"] < time.time():
                            (
                                await database_call(
                                    self.store.execute,
                                    "UPDATE qq_outbox SET status='cancelled' WHERE id=?",
                                    (row["id"],),
                                )
                            )
                            continue
                        if row["inbox_id"]:
                            if not await self.social.fresh(row):
                                (
                                    await database_call(
                                        self.store.execute,
                                        "UPDATE qq_outbox SET status='cancelled' WHERE id=?",
                                        (row["id"],),
                                    )
                                )
                                continue
                        if not self.valid(row) or row["expires"] < time.time():
                            (
                                await database_call(
                                    self.store.execute,
                                    "UPDATE qq_outbox SET status='cancelled' WHERE id=?",
                                    (row["id"],),
                                )
                            )
                            continue
                        if row.get("asset_id") and not self.social.library.usable(
                            row["asset_id"],
                            row["target"] if row["scope"] == "group" else "public",
                            row["asset_version"],
                        ):
                            (
                                await database_call(
                                    self.store.execute,
                                    "UPDATE qq_outbox SET status='cancelled',error='asset_unavailable' WHERE id=?",
                                    (row["id"],),
                                )
                            )
                            continue
                        if row.get("depends_on"):
                            parent = await database_call(
                                self.store.rows,
                                "SELECT status FROM qq_outbox WHERE id=?",
                                (row["depends_on"],),
                            )
                            if not parent or parent[0]["status"] in (
                                "failed",
                                "unknown",
                                "cancelled",
                                "expired",
                            ):
                                (
                                    await database_call(
                                        self.store.execute,
                                        "UPDATE qq_outbox SET status='cancelled' WHERE id=?",
                                        (row["id"],),
                                    )
                                )
                                continue
                            if parent[0]["status"] != "delivered":
                                continue
                        # If a text part is uncertain/failed, never send its later parts or audio.
                        if row["inbox_id"] and (
                            await database_call(
                                self.store.rows,
                                "SELECT 1 FROM qq_outbox WHERE inbox_id=? AND kind='text' AND status IN ('failed','unknown','cancelled','expired')",
                                (row["inbox_id"],),
                            )
                        ):
                            (
                                await database_call(
                                    self.store.execute,
                                    "UPDATE qq_outbox SET status='cancelled' WHERE id=?",
                                    (row["id"],),
                                )
                            )
                            continue
                        if not self.rate("send:global", 30):
                            break
                        if not (
                            await database_call(
                                self.store.execute,
                                "UPDATE qq_outbox SET status='preparing',attempts=attempts+1 WHERE id=? AND status='pending'",
                                (row["id"],),
                            )
                        ):
                            continue
                        try:
                            key = "group_id" if row["scope"] == "group" else "user_id"
                            result = await self.adapter.action(
                                "send_group_msg"
                                if row["scope"] == "group"
                                else "send_private_msg",
                                {
                                    key: int(row["target"]),
                                    "message": json.loads(row["payload"]),
                                },
                                before_send=lambda: self.commit_send(row),
                            )
                            platform_id = result.get("message_id")
                            if platform_id is None:
                                raise SendUnknown("missing_message_id")
                            (
                                await database_call(
                                    self.store.delivered, row, platform_id
                                )
                            )
                            self.metrics["delivered"] += 1
                        except SendUnknown:
                            (
                                await database_call(
                                    self.store.execute,
                                    "UPDATE qq_outbox SET status='unknown',error='ack_missing' WHERE id=?",
                                    (row["id"],),
                                )
                            )
                        except SendFailed as error:
                            retry = (
                                str(error)
                                in (
                                    "offline_before_send",
                                    "lock_timeout_before_send",
                                    "prepare_failed",
                                )
                                and row["attempts"] < 3
                            )
                            (
                                await database_call(
                                    self.store.execute,
                                    "UPDATE qq_outbox SET status=?,error=? WHERE id=?",
                                    (
                                        "pending"
                                        if retry
                                        else "cancelled"
                                        if str(error) == "cancelled_before_send"
                                        else "failed",
                                        str(error),
                                        row["id"],
                                    ),
                                )
                            )
                        await asyncio.sleep(0.2)
                    (
                        await database_call(
                            self.store.reconcile_quotas,
                        )
                    )
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("QQ delivery failed")
            await asyncio.sleep(0.5)

    async def postprocess(self):
        while not self.stopping:
            try:
                exports = await database_call(
                    self.store.rows,
                    "SELECT o.* FROM qq_outbox o JOIN qq_messages m ON m.inbox_id=o.inbox_id JOIN qq_bindings b ON b.id=o.binding_id JOIN qq_conversations c ON c.id=o.conversation WHERE b.active=1 AND b.version=o.version AND c.generation=o.generation AND json_extract(b.prefs,'$.share_history')=1 AND o.scope='private' AND o.binding_id IS NOT NULL AND o.status='delivered' AND m.role='assistant' AND m.delivered=1 AND NOT EXISTS(SELECT 1 FROM qq_history_exports e WHERE e.inbox_id=o.inbox_id) GROUP BY o.inbox_id ORDER BY min(o.created) LIMIT 20",
                )
                for exported in exports:
                    if self.valid(exported):
                        binding = await database_call(
                            self.store.binding, external=exported["target"]
                        )
                        if binding["prefs"].get("share_history"):
                            (
                                await database_call(
                                    self.store.export_history,
                                    exported["inbox_id"],
                                    binding["user_id"],
                                )
                            )
                jobs = await database_call(
                    self.store.rows,
                    "SELECT j.*,i.conversation,i.generation FROM qq_jobs j JOIN qq_inbox i ON i.id=j.inbox_id WHERE j.status='pending' AND EXISTS(SELECT 1 FROM qq_messages m WHERE m.inbox_id=j.inbox_id AND role='assistant' AND delivered=1) LIMIT 10",
                )
                for row in jobs:
                    if not self.valid(row):
                        (
                            await database_call(
                                self.store.execute,
                                "UPDATE qq_jobs SET status='cancelled' WHERE id=?",
                                (row["id"],),
                            )
                        )
                        continue
                    binding = (
                        await database_call(
                            self.store.rows,
                            "SELECT * FROM qq_bindings WHERE id=?",
                            (row["binding_id"],),
                        )
                    )[0]
                    user = binding["user_id"]
                    payload = json.loads(row["payload"])
                    (
                        await database_call(
                            self.store.execute,
                            "UPDATE qq_jobs SET status='processing',attempts=attempts+1 WHERE id=?",
                            (row["id"],),
                        )
                    )
                    try:
                        async with self.profile_locks[user]:
                            if row["kind"] == "profile":
                                profile = await asyncio.wait_for(
                                    self.conversation.profile_text(
                                        user, payload["user_text"]
                                    ),
                                    45,
                                )
                                if self.valid(row):
                                    (
                                        await database_call(
                                            self.store.commit_profile,
                                            row,
                                            user,
                                            profile,
                                        )
                                    )
                            elif self.valid(row):
                                # Store stable ID makes retries of this effect idempotent.
                                await asyncio.to_thread(
                                    self.conversation.memory.remember,
                                    user,
                                    payload["user_text"],
                                    payload["reply"],
                                    payload["emotion"],
                                    "qq_" + row["inbox_id"],
                                )
                        (
                            await database_call(
                                self.store.execute,
                                "UPDATE qq_jobs SET status='done' WHERE id=? AND status='processing'",
                                (row["id"],),
                            )
                        )
                    except Exception:
                        status = (
                            "pending"
                            if row["kind"] == "memory" and row["attempts"] < 2
                            else "failed"
                        )
                        (
                            await database_call(
                                self.store.execute,
                                "UPDATE qq_jobs SET status=? WHERE id=?",
                                (status, row["id"]),
                            )
                        )
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("QQ postprocessing failed")
            await asyncio.sleep(1)

    async def notification_loop(self):
        while not self.stopping:
            try:
                await self.notifications()
            except asyncio.CancelledError:
                raise
            except Exception:
                self.metrics["notification_failed"] += 1
            await asyncio.sleep(60)

    async def notifications(self):
        now = time.time()
        local = datetime.fromtimestamp(now, ZoneInfo("Asia/Shanghai"))
        if not 8 <= local.hour < 22 or not self.adapter.socket:
            return
        midnight = local.replace(hour=0, minute=0, second=0, microsecond=0).timestamp()
        day = local.strftime("%Y-%m-%d")
        for raw in await database_call(
            self.store.rows,
            "SELECT external_id FROM qq_bindings WHERE bot=? AND active=1",
            (self.config.bot_id,),
        ):
            binding = await database_call(
                self.store.binding, external=raw["external_id"]
            )
            prefs = binding["prefs"]
            if (
                not prefs["proactive"]
                or binding["external_id"] not in self.config.users
                or not self.account_active(binding["user_id"])
            ):
                continue
            candidates = []
            if prefs["share_life"] and prefs["diary"]:
                diaries = self.database.get_diaries(binding["user_id"], 1) or []
                if diaries:
                    diary = diaries[0]
                    stamp = str(diary.get("date", diary.get("created_at", "")))
                    if day in stamp:
                        candidates.append(
                            (
                                "diary",
                                str(diary.get("id", stamp)),
                                "今天的日记已经整理好了，有空时可以回 UNA 看看。",
                                {},
                            )
                        )
            if (
                prefs["share_life"]
                and prefs["life"]
                and self.conversation.life_context
                and self.conversation.safety
            ):
                try:
                    bundle = await asyncio.wait_for(
                        asyncio.to_thread(
                            self.conversation.life_context.build_context_bundle,
                            binding["user_id"],
                            "你今天的生活",
                        ),
                        1,
                    )
                    evidence = self.conversation.safety.prepare_evidence(
                        bundle.evidence
                    )
                    for source in evidence.sources:
                        if (
                            source.source_type != "una_life_event"
                            or source.status != "completed"
                            or not source.summary
                        ):
                            continue
                        stamp = source.world_time or ""
                        try:
                            age = (
                                now
                                - datetime.fromisoformat(
                                    stamp.replace("Z", "+00:00")
                                ).timestamp()
                            )
                        except (ValueError, TypeError):
                            continue
                        if not 0 <= age <= 86400:
                            continue
                        text = "想和你分享一件小事：" + source.summary[:400]
                        validation = self.conversation.safety.validate(
                            binding["user_id"],
                            text,
                            evidence,
                            author_id="ai_una",
                            channel="chat",
                        )
                        if validation.safe:
                            candidates.append(
                                (
                                    "life",
                                    source.source_id,
                                    text,
                                    validation.evidence.as_dict(),
                                )
                            )
                            break
                except Exception:
                    self.metrics["notification_source_failed"] += 1
            if (
                prefs["greeting"]
                and binding["last_input"]
                and now - binding["last_input"] >= 8 * 3600
            ):
                candidates.append(
                    (
                        "greeting",
                        day,
                        "路过和你打声招呼。希望你今天还不错，想聊的时候我在。",
                        {},
                    )
                )
            conv = await database_call(
                self.store.conversation, "private", binding["external_id"]
            )
            for kind, source, text, evidence in candidates:
                # Recheck consent and last-input after asynchronous source lookup.
                current = await database_call(
                    self.store.binding, external=binding["external_id"]
                )
                if not current or current["version"] != binding["version"]:
                    break
                if kind == "greeting" and now - current["last_input"] < 8 * 3600:
                    continue
                dedupe = f"notify:{binding['id']}:{kind}:{source}"
                with self.store.db() as db:
                    count = db.execute(
                        "SELECT count(*) FROM qq_outbox WHERE binding_id=? AND notification IS NOT NULL AND created>=? AND status IN ('pending','preparing','sending','delivered','unknown')",
                        (binding["id"], midnight),
                    ).fetchone()[0]
                    if count >= 2:
                        break
                    if db.execute(
                        "SELECT 1 FROM qq_outbox WHERE dedupe=?", (dedupe,)
                    ).fetchone():
                        continue
                    ident = uuid.uuid4().hex
                    db.execute(
                        """INSERT INTO qq_outbox(id,conversation,generation,binding_id,version,scope,target,payload,kind,created,expires,dedupe,notification)
                        VALUES(?,?,?,?,?,'private',?,?,'text',?,?,?,?)""",
                        (
                            ident,
                            conv["id"],
                            conv["generation"],
                            binding["id"],
                            binding["version"],
                            binding["external_id"],
                            dump([{"type": "text", "data": {"text": text}}]),
                            now,
                            now + 300,
                            dedupe,
                            kind,
                        ),
                    )
                    db.execute(
                        "INSERT INTO qq_messages(id,conversation,generation,role,sender,content,created,evidence) VALUES(?,?,?,'assistant',?,?,?,?)",
                        (
                            ident,
                            conv["id"],
                            conv["generation"],
                            self.config.bot_id,
                            text,
                            now,
                            dump(evidence),
                        ),
                    )
                break

    def status(self, admin=False):
        state = dict(
            enabled=self.config.enabled,
            error=self.config.error,
            connected=self.adapter.socket is not None,
            last_heartbeat=self.adapter.last_heartbeat,
            is_admin=admin,
            test_reply_percent=self.config.test_reply_percent,
        )
        if admin and self.store.initialized:
            state["metrics"] = dict(self.metrics)
            state["groups"] = [
                {**self.store.group(g), "behavior": self.store.behavior(g)}
                for g in self.config.groups
            ]
            state["failures"] = self.store.rows(
                "SELECT id,kind,status,error,created FROM qq_outbox WHERE status IN ('failed','unknown') ORDER BY created DESC LIMIT 30"
            )
            state["queue"] = self.store.rows(
                "SELECT status,count(*) AS count FROM qq_inbox GROUP BY status"
            )
        return state
