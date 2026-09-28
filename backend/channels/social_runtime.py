"""Background media work and group context orchestration; never bypasses Outbox."""

import asyncio
from .async_db import database_call
import json
import re
import random
import time
from .adapter import normalize
from .audit_store import deadline
from .media import MediaError
from .stickers import StickerLibrary
from .social_types import MediaClarification, ReplyPlan


class SocialRuntime:
    def __init__(self, service):
        self.service, self.store = service, service.store
        from pathlib import Path

        root = service.config.media_dir or str(
            Path(self.store.path).parent / "qq-media"
        )
        memory = getattr(service.conversation, "memory", None)
        embed = getattr(getattr(memory, "storage", None), "emb_fn", None)
        self.library = StickerLibrary(self.store, root, embed=embed)

    def context(self, row, event):
        if event["scope"] != "group":
            return self.store.history(
                row["conversation"], row["generation"], row["created"], False
            )
        settings = self.store.behavior(event["target"])
        recent = self.store.history(
            row["conversation"],
            row["generation"],
            row["created"],
            True,
            limit=settings["context_count"],
        )
        older = self.store.related_history(
            row["conversation"], row["generation"], event["text"], row["created"]
        )
        unique = {r["platform_id"] or r["inbox_id"]: r for r in older + recent}
        return sorted(unique.values(), key=lambda r: r["created"])

    async def generate(self, row):
        service = self.service
        if deadline(row) <= time.time() or not service.valid(row):
            (
                await database_call(
                    self.store.execute,
                    "UPDATE qq_inbox SET status='cancelled' WHERE id=?",
                    (row["id"],),
                )
            )
            return
        event = json.loads(row["payload"])
        group = event["scope"] == "group"
        settings = (
            (await database_call(self.store.behavior, event["target"])) if group else {}
        )
        binding = (
            None
            if group
            else (await database_call(self.store.binding, external=event["target"]))
        )
        row = dict(row)
        row["watermark"] = await database_call(
            self.store.watermark, row["conversation"], row["generation"]
        )
        test_percent, test_until = (
            (
                await database_call(
                    self.store.test_mode,
                    event["target"],
                    service.config.test_reply_percent,
                )
            )
            if group
            else (0, None)
        )
        row["test_percent"], row["test_until"] = (
            (test_percent if not event["direct"] else 0),
            test_until if test_percent and not event["direct"] else None,
        )
        history = [
            h
            for h in await database_call(self.context, row, event)
            if h.get("inbox_id") != row["id"]
        ]
        row["context_dependencies"] = (
            [h["platform_id"] for h in history if h.get("platform_id")] if group else []
        )
        visible_message_ids = {event["message_id"]} | {
            h.get("platform_id") for h in history
        }
        current = (
            (
                await database_call(
                    self.store.group_message,
                    row["conversation"],
                    row["generation"],
                    event["target"],
                    event["sender"],
                    event["text"][:2000],
                    event,
                    message_id=event["message_id"],
                )
            )
            if group
            else None
        )
        evidence, jobs, candidates, sticker, request_voice = {}, [], [], None, False
        started = time.time()
        stage, failed, preferred_mode = "decision", False, "text"
        needs_media = False
        try:
            if "system_reply" in event:
                plan = ReplyPlan(text=event["system_reply"])
            else:
                query, target = event["text"], event["message_id"]
                if group and not event["direct"]:
                    if re.search(
                        r"别(?:再)?插话|不要(?:再)?插话|停止(?:回复|发言)|闭嘴",
                        event["text"],
                    ):
                        (
                            await database_call(
                                self.store.decision_log,
                                row,
                                "not_relevant",
                                stage="stop_requested",
                            )
                        )
                        (
                            await database_call(
                                self.store.execute,
                                "UPDATE qq_inbox SET status='skipped' WHERE id=?",
                                (row["id"],),
                            )
                        )
                        return
                    if not settings["autonomous"] or not service.can_join(
                        event["target"]
                    ):
                        (
                            await database_call(
                                self.store.decision_log, row, "too_recent"
                            )
                        )
                        (
                            await database_call(
                                self.store.execute,
                                "UPDATE qq_inbox SET status='skipped' WHERE id=?",
                                (row["id"],),
                            )
                        )
                        return
                    records = [h["identity"] for h in history] + [current]
                    if test_percent:
                        join = random.randrange(100) < test_percent
                        (
                            await database_call(
                                self.store.decision_log,
                                row,
                                "natural_banter" if join else "not_relevant",
                                target,
                            )
                        )
                    elif hasattr(service.conversation, "decide"):
                        decision = await asyncio.wait_for(
                            service.conversation.decide(records), 8
                        )
                        join = decision.decision == "reply"
                        reason, target = (
                            decision.reason_code,
                            decision.target_message_id,
                        )
                        query = decision.sticker_query or query
                        preferred_mode = decision.preferred_mode
                        needs_media = decision.needs_media
                        row["context_dependencies"] = decision.context_message_ids
                        if decision.context_message_ids:
                            history = [
                                h
                                for h in history
                                if h.get("platform_id")
                                in set(decision.context_message_ids) | {target}
                            ]
                        (
                            await database_call(
                                self.store.decision_log,
                                row,
                                reason,
                                target,
                                time.time() - started,
                            )
                        )
                    else:  # Compatibility with embedded conversational providers.
                        join = await asyncio.wait_for(
                            service.conversation.should_join(records), 8
                        )
                        (
                            await database_call(
                                self.store.decision_log,
                                row,
                                "natural_banter" if join else "not_relevant",
                                target,
                            )
                        )
                    if not join:
                        (
                            await database_call(
                                self.store.execute,
                                "UPDATE qq_inbox SET status='skipped' WHERE id=?",
                                (row["id"],),
                            )
                        )
                        return
                    if target != event["message_id"]:
                        selected = next(
                            (
                                h
                                for h in history
                                if h.get("platform_id") == target
                                and h["role"] == "user"
                            ),
                            None,
                        )
                        if not selected:
                            (
                                await database_call(
                                    self.store.execute,
                                    "UPDATE qq_inbox SET status='skipped' WHERE id=?",
                                    (row["id"],),
                                )
                            )
                            return
                        history = [h for h in history if h is not selected] + [
                            {
                                "role": "user",
                                "sender": event["sender"],
                                "content": event["text"],
                                "identity": current,
                            }
                        ]
                        current = dict(selected["identity"])
                stage = "retrieval"
                if not group or settings["stickers"]:
                    candidates = await self.library.candidates(
                        event["target"] if group else "public",
                        query,
                        row["conversation"],
                    )
                target_event = (
                    await database_call(self.store.media_event, row, event, target)
                    if group else event
                )
                prepared_event = target_event
                images, user_text = (
                    [],
                    current["content"]
                    if group and not event["direct"]
                    else event["text"],
                )
                if group or event["direct"]:
                    stage = "media_input"
                    prepared_event = await database_call(
                        self.store.resolve_media, row, target_event,
                        requested=needs_media,
                        images_only=group and not event["direct"],
                    )
                    if group:
                        dependencies = {target, *row["context_dependencies"]}
                        if prepared_event.get("media_source"):
                            dependencies.add(prepared_event["media_source"]["message_id"])
                        row["context_dependencies"] = list(dependencies)
                    if prepared_event["segments"]:
                        if not service.media:
                            raise MediaError("媒体服务尚未配置")
                        prepared = await asyncio.wait_for(service.media.process(prepared_event),
                            min(120, max(0.01, deadline(row) - time.time())))
                        user_text, images = prepared["text"], prepared["images"]
                        (
                            await database_call(
                                self.store.execute,
                                "UPDATE qq_messages SET content=? WHERE conversation=? AND generation=? AND platform_id=? AND role='user' AND delivered=1",
                                (user_text, row["conversation"], row["generation"], target),
                            )
                        )
                request_voice = voice_requested(event["text"]) or (
                    event["direct"]
                    and voice_followup_requested(event, history, row["created"])
                )
                if group:
                    current["content"] = user_text[:2000]
                    current["media_status"] = "images_attached" if images else "not_provided"
                    if prepared_event.get("media_source"):
                        current["media_source"] = prepared_event["media_source"]
                    from .identity import serialize

                    user_text = serialize(current)
                stage = "generation"
                if hasattr(service.conversation, "reply_plan") and getattr(
                    getattr(service.conversation, "brain", None), "client", None
                ):
                    plan, _, evidence = await asyncio.wait_for(
                        service.conversation.reply_plan(
                            user_text,
                            history,
                            binding,
                            group,
                            images=images,
                            options={
                                "candidates": candidates,
                                "target_message_id": target,
                                "voice_requested": request_voice,
                                "preferred_mode": preferred_mode,
                                "allow_autonomous_voice": settings.get(
                                    "autonomous_voice", False
                                ),
                            },
                        ),
                        service.config.llm_timeout,
                    )
                else:
                    text, emotion, evidence = await asyncio.wait_for(
                        service.conversation.reply(
                            user_text,
                            history,
                            binding,
                            group,
                            **({"images": images} if images else {}),
                        ),
                        service.config.llm_timeout,
                    )
                    plan = ReplyPlan(
                        text=text[:1500],
                        emotion=emotion
                        if emotion
                        in (
                            "neutral",
                            "happy",
                            "sad",
                            "angry",
                            "shy",
                            "thinking",
                            "playful",
                        )
                        else "neutral",
                    )
                plan.reply_to_message_id = (
                    target if target in visible_message_ids else event["message_id"]
                )
                if plan.sticker_id not in {c["id"] for c in candidates}:
                    plan.sticker_id = None
                if group:
                    plan.voice = settings["voice"] and (
                        (event["direct"] and request_voice)
                        or (
                            not event["direct"]
                            and settings["autonomous_voice"]
                            and plan.voice
                        )
                    )
                elif binding:
                    prefs = binding["prefs"]
                    plan.voice = prefs["voice_mode"] == "always" or (
                        prefs["voice_mode"] == "follow"
                        and (event["has_voice"] or request_voice)
                    )
                plan.voice = bool(plan.voice and speakable(plan.text))
                if evidence.get("validation_status") == "blocked":
                    plan.sticker_id, plan.voice = None, False
        except MediaClarification as error:
            plan = ReplyPlan(text=str(error), reply_to_message_id=target)
        except asyncio.CancelledError:
            raise
        except Exception as error:
            failed = True
            service.metrics["generation_failed"] += 1
            (
                await database_call(
                    self.store.decision_log,
                    row,
                    "generation_failed",
                    elapsed=time.time() - started,
                    stage=stage,
                    error_code=safe_error_code(error),
                )
            )
            if group and not event["direct"]:
                (
                    await database_call(
                        self.store.execute,
                        "UPDATE qq_inbox SET status='failed',error='generation_failed' WHERE id=?",
                        (row["id"],),
                    )
                )
                return
            plan = ReplyPlan(
                text=str(error)
                if isinstance(error, MediaError)
                else "我暂时没能处理好这条消息，请稍后再试。"
            )
        if deadline(row) <= time.time() or not service.valid(row):
            (
                await database_call(
                    self.store.execute,
                    "UPDATE qq_inbox SET status='cancelled' WHERE id=?",
                    (row["id"],),
                )
            )
            return
        from chat_control import sanitize_reply_text

        plan.text = sanitize_reply_text(plan.text)[
            : 500 if group and not event["direct"] else 1500
        ]
        if not (
            await database_call(
                self.store.reserve, row, event, plan, test_mode=bool(test_percent)
            )
        ):
            (
                await database_call(
                    self.store.execute,
                    "UPDATE qq_inbox SET status='skipped',error='quota' WHERE id=?",
                    (row["id"],),
                )
            )
            (await database_call(self.store.decision_log, row, "quota"))
            return
        if plan.sticker_id:
            sticker = self.library.usable(
                plan.sticker_id, event["target"] if group else "public"
            )
        if not sticker:
            plan.sticker_id = None
        if not plan.text and not sticker:
            plan.text = "这次没找到合适的表情，我先用文字陪你聊。"
        if binding and evidence.get("validation_status") != "blocked" and plan.text:
            payload = dict(
                user_text=event["text"], reply=plan.text, emotion=plan.emotion
            )
            if binding["prefs"]["share_memory"]:
                jobs.append(("memory", payload))
            if binding["prefs"]["share_profile"]:
                jobs.append(("profile", payload))
        (
            await database_call(
                self.store.complete,
                row,
                plan.text,
                evidence,
                jobs=jobs,
                plan=plan,
                sticker=sticker,
                tts=plan.voice,
            )
        )
        if group and event["direct"] and not failed:
            (
                await database_call(
                    self.store.decision_log,
                    row,
                    "direct_question",
                    plan.reply_to_message_id or event["message_id"],
                    time.time() - started,
                )
            )

    def queue_collection(self, event):
        if (
            event["scope"] != "group"
            or not self.store.behavior(event["target"])["collect"]
        ):
            return
        image = next(
            (
                s
                for s in event["segments"]
                if s["type"] == "image" and s["data"].get("url")
            ),
            None,
        )
        if not image:
            return
        from datetime import datetime
        from zoneinfo import ZoneInfo

        now = time.time()
        midnight = (
            datetime.fromtimestamp(now, ZoneInfo("Asia/Shanghai"))
            .replace(hour=0, minute=0, second=0, microsecond=0)
            .timestamp()
        )
        conv = self.store.conversation("group", event["target"])
        with self.store.db() as db:
            queued = db.execute(
                "SELECT count(*) FROM qq_media_jobs WHERE status IN ('pending','processing')"
            ).fetchone()[0]
            all_jobs = db.execute(
                "SELECT conversation,created FROM qq_media_jobs WHERE kind='collect' AND created>=?",
                (midnight,),
            ).fetchall()
            local = [r for r in all_jobs if r["conversation"] == conv["id"]]
            if (
                queued >= 100
                or len(all_jobs) >= 100
                or len(local) >= 20
                or any(r["created"] > now - 30 for r in local)
            ):
                return
            self.store.media_job(
                "collect",
                {"url": image["data"]["url"], "scope": event["target"]},
                dedupe=f"collect:{conv['id']}:{conv['generation']}:{event['message_id']}",
                row={
                    "conversation": conv["id"],
                    "generation": conv["generation"],
                    "version": self.store_version(event["target"], db),
                },
                db=db,
            )

    def store_version(self, group, db):
        return db.execute(
            "SELECT version FROM qq_groups WHERE bot=? AND group_id=?",
            (self.store.bot_id, group),
        ).fetchone()[0]

    async def fresh(self, outgoing):
        plans = await database_call(
            self.store.rows,
            "SELECT * FROM qq_reply_plans WHERE id=?",
            (outgoing["inbox_id"],),
        )
        if plans and outgoing["scope"] == "group":
            target = json.loads(plans[0]["payload"]).get("reply_to_message_id")
            if target and not (
                await database_call(
                    self.store.rows,
                    "SELECT 1 FROM qq_messages WHERE conversation=? AND generation=? AND platform_id=? AND delivered=1",
                    (outgoing["conversation"], outgoing["generation"], target),
                )
            ):
                return False
        if not outgoing["autonomous"]:
            return True
        trigger = await database_call(
            self.store.rows,
            "SELECT * FROM qq_inbox WHERE id=?",
            (outgoing["inbox_id"],),
        )
        if not trigger:
            return False
        watermark = await database_call(
            self.store.watermark, outgoing["conversation"], outgoing["generation"]
        )
        if plans and watermark <= plans[0]["watermark"]:
            return True
        if not plans or plans[0]["rechecked"]:
            return False
        (
            await database_call(
                self.store.execute,
                "UPDATE qq_reply_plans SET rechecked=2 WHERE id=?",
                (outgoing["inbox_id"],),
            )
        )
        newer = await database_call(
            self.store.rows,
            "SELECT sender,content,platform_id FROM qq_messages WHERE conversation=? AND generation=? AND role='user' AND sequence>? AND delivered=1 ORDER BY sequence DESC LIMIT 60",
            (outgoing["conversation"], outgoing["generation"], plans[0]["watermark"]),
        )
        target = json.loads(plans[0]["payload"]).get("reply_to_message_id")
        selected = await database_call(
            self.store.rows,
            "SELECT content FROM qq_messages WHERE conversation=? AND generation=? AND platform_id=? AND delivered=1",
            (outgoing["conversation"], outgoing["generation"], target),
        )
        try:
            keep = bool(selected) and await asyncio.wait_for(
                self.service.conversation.topic_current(
                    selected[0]["content"], list(reversed(newer))
                ),
                5,
            )
        except Exception:
            keep = False
        keep = keep and watermark == (
            await database_call(
                self.store.watermark, outgoing["conversation"], outgoing["generation"]
            )
        )
        (
            await database_call(
                self.store.execute,
                "UPDATE qq_reply_plans SET rechecked=?,watermark=? WHERE id=?",
                (1 if keep else 2, watermark, outgoing["inbox_id"]),
            )
        )
        if not keep:
            (
                await database_call(
                    self.store.decision_log, trigger[0], "topic_stale", stage="delivery"
                )
            )
        return keep

    async def worker(self, lane):
        while not self.service.stopping:
            try:
                await self.work_once(lane)
            except asyncio.CancelledError:
                raise
            except Exception:
                self.service.metrics["media_worker_failed"] += 1
            await asyncio.sleep(0.5)

    async def work_once(self, lane="media"):
        clause = {
            "tts": "kind='tts'",
            "history": "kind='history'",
            "describe": "kind IN ('collect','describe')",
            "index": "kind='index'",
        }.get(lane, "kind!='tts'")
        rows = await database_call(
            self.store.rows,
            f"SELECT * FROM qq_media_jobs WHERE status='pending' AND ready_at<=? AND {clause} ORDER BY ready_at,created LIMIT 1",
            (time.time(),),
        )
        if not rows:
            return
        row = rows[0]
        if row["expires"] < time.time() or (
            row["conversation"] and not self.service.valid(row)
        ):
            (
                await database_call(
                    self.store.execute,
                    "UPDATE qq_media_jobs SET status='cancelled',payload='{}' WHERE id=?",
                    (row["id"],),
                )
            )
            return
        if not (
            await database_call(
                self.store.execute,
                "UPDATE qq_media_jobs SET status='processing',stage=kind,attempts=attempts+1 WHERE id=? AND status='pending'",
                (row["id"],),
            )
        ):
            return
        try:
            payload = json.loads(row["payload"])
            if row["kind"] == "tts":
                await self.tts(row, payload)
            elif row["kind"] == "history":
                await self.history(row, payload)
            elif row["kind"] == "collect":
                if not self.service.media:
                    raise MediaError("媒体服务未配置")
                data = await self.service.media.download(
                    payload["url"], 5 * 1024 * 1024
                )
                if not self.service.valid(row):
                    raise MediaError("设置已变更")
                asset = await database_call(
                    self.library.add, data, payload["scope"], collected=True
                )
                if asset["status"] == "review" and not asset["description"]:
                    await self.describe(row, asset)
            elif row["kind"] == "describe":
                asset = self.library.get(payload["asset_id"])
                if (
                    asset["scope"] != "public"
                    and asset["scope"] not in self.service.config.groups
                ):
                    raise MediaError("素材来源群已撤销授权")
                if (
                    asset["version"] != payload["asset_version"]
                    or asset["status"] == "rejected"
                ):
                    raise MediaError("素材已变更")
                await self.describe(row, asset)
            elif row["kind"] == "index":
                asset = self.library.get(payload["asset_id"])
                if asset["status"] == "rejected" or (
                    asset["scope"] != "public"
                    and asset["scope"] not in self.service.config.groups
                ):
                    raise MediaError("素材已撤销授权")
                indexed = await self.library.index(payload["asset_id"])
                (
                    await database_call(
                        self.store.execute,
                        "UPDATE qq_media_jobs SET result=? WHERE id=?",
                        ("semantic" if indexed else "lexical", row["id"]),
                    )
                )
                if not indexed and self.library.embed and row["attempts"] < 2:
                    (
                        await database_call(
                            self.store.execute,
                            "UPDATE qq_media_jobs SET status='pending',ready_at=?,error='embedding_unavailable' WHERE id=?",
                            (time.time() + 60, row["id"]),
                        )
                    )
                    return
            (
                await database_call(
                    self.store.execute,
                    "UPDATE qq_media_jobs SET status='done',error=NULL WHERE id=? AND status='processing'",
                    (row["id"],),
                )
            )
        except asyncio.CancelledError:
            raise
        except Exception as error:
            # Never persist exception strings from HTTP clients (may contain credentials/URLs).
            code = str(error) if isinstance(error, MediaError) else type(error).__name__
            (
                await database_call(
                    self.store.execute,
                    "UPDATE qq_media_jobs SET status='failed',error=? WHERE id=?",
                    (code[:120], row["id"]),
                )
            )

    async def describe(self, job, asset):
        previews = await asyncio.to_thread(self.library.previews, asset)
        result = await asyncio.wait_for(
            self.service.conversation.describe_sticker(previews), 30
        )
        if job["conversation"] and not self.service.valid(job):
            raise MediaError("设置已变更")
        current = self.library.get(asset["id"])
        if current["version"] != asset["version"]:
            raise MediaError("素材已变更")
        accepted = (
            result.is_sticker
            and not result.private_content
            and result.confidence >= 0.9
        )
        auto = (
            asset["scope"] != "public"
            and (await database_call(self.store.behavior, asset["scope"]))[
                "auto_accept"
            ]
        )
        state = "ready" if accepted and auto else "review"
        if result.private_content or not result.is_sticker:
            self.library.remove(asset["id"])
            return
        (
            await database_call(
                self.store.execute,
                "UPDATE qq_media_assets SET description=?,ocr=?,status=?,updated=? WHERE id=? AND version=?",
                (
                    result.description,
                    result.ocr,
                    state,
                    time.time(),
                    asset["id"],
                    asset["version"],
                ),
            )
        )
        await self.library.index(asset["id"])

    async def tts(self, job, payload):
        inbox = await database_call(
            self.store.rows, "SELECT * FROM qq_inbox WHERE id=?", (payload["inbox_id"],)
        )
        text_parts = await database_call(
            self.store.rows,
            "SELECT status FROM qq_outbox WHERE inbox_id=? AND kind='text'",
            (payload["inbox_id"],),
        )
        if not inbox or any(
            p["status"] in ("failed", "unknown", "cancelled", "expired")
            for p in text_parts
        ):
            raise MediaError("文字未成功发送，语音已取消")
        if not text_parts or any(p["status"] != "delivered" for p in text_parts):
            (
                await database_call(
                    self.store.execute,
                    "UPDATE qq_media_jobs SET status='pending',ready_at=?,attempts=attempts-1 WHERE id=?",
                    (
                        time.time() + 1,
                        job["id"],
                    ),
                )
            )
            return
        if not self.service.media:
            raise MediaError("语音服务未配置")
        inference = asyncio.create_task(
            self.service.media.synthesize(payload["text"], payload["emotion"])
        )
        try:
            done, _ = await asyncio.wait({inference}, timeout=45)
            if not done:
                # Keep this single lane occupied until the underlying operation settles.
                # Cancelling an HTTP request does not stop remote inference.
                try:
                    await inference
                except Exception:
                    pass
                raise MediaError("语音合成超过 45 秒，已保留文字")
            audio = inference.result()
        except asyncio.CancelledError:
            inference.cancel()
            await asyncio.gather(inference, return_exceptions=True)
            raise
        if not audio:
            raise MediaError("语音合成失败，文字已发送")
        # Validate actual audio duration, not just its filename or existence.
        from urllib.parse import urlparse, unquote
        from urllib.request import url2pathname

        path = url2pathname(unquote(urlparse(audio).path))
        probe = json.loads(
            await self.service.media.command(
                "ffprobe",
                "-protocol_whitelist",
                "file,pipe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "json",
                path,
            )
        )
        if not 0 < float(probe["format"]["duration"]) <= 20:
            raise MediaError("合成语音超过 20 秒，已保留文字")
        if self.service.valid(job) and time.time() < job["expires"]:

            def enqueue_audio():
                with self.store.db() as db:
                    if not self.service.valid(job) or time.time() >= job["expires"]:
                        raise MediaError("语音任务已失效")
                    self.store._out(
                        db,
                        inbox[0],
                        json.loads(inbox[0]["payload"]),
                        [{"type": "record", "data": {"file": audio}}],
                        "audio",
                        payload["inbox_id"] + ":audio",
                        time.time(),
                    )
                    first = db.execute(
                        "SELECT id FROM qq_outbox WHERE inbox_id=? AND kind='text' ORDER BY rowid LIMIT 1",
                        (payload["inbox_id"],),
                    ).fetchone()
                    db.execute(
                        "UPDATE qq_outbox SET depends_on=? WHERE dedupe=?",
                        (first["id"], payload["inbox_id"] + ":audio"),
                    )

            await asyncio.to_thread(enqueue_audio)
        else:
            raise MediaError("语音任务已过期或设置已变更")

    async def history(self, job, payload):
        group = payload["group_id"]
        result = await self.service.adapter.action(
            "get_group_msg_history", {"group_id": int(group), "count": 100}
        )
        messages = result.get("messages")
        if not isinstance(messages, list):
            raise MediaError("协议端未返回可读取的群记录")
        if not self.service.valid(job):
            raise MediaError("群设置已变更")
        imported = 0
        for item in messages[:100]:
            if not isinstance(item, dict) or str(item.get("group_id", group)) != group:
                continue
            try:
                stamp = float(item.get("time", 0))
            except (ValueError, TypeError):
                continue
            if not time.time() - 86400 <= stamp <= time.time() + 30:
                continue
            # Use the same normalizer; imported own-bot messages are marked assistant below.
            event = normalize(
                {
                    **item,
                    "post_type": "message",
                    "message_type": "group",
                    "group_id": group,
                },
                "__backfill__",
                lambda *a: False,
            )
            if not event:
                continue
            event.update(source="backfill", original_time=stamp, direct=False)
            if (
                await database_call(
                    self.store.ingest,
                    event,
                    None,
                    job["version"],
                    self.service.config.queue_limit,
                )
            ) != "duplicate":
                imported += 1
                if event["sender"] == self.service.config.bot_id:
                    (
                        await database_call(
                            self.store.execute,
                            "UPDATE qq_messages SET role='assistant' WHERE conversation=? AND platform_id=?",
                            (job["conversation"], event["message_id"]),
                        )
                    )
        (
            await database_call(
                self.store.execute,
                "UPDATE qq_media_jobs SET payload=? WHERE id=?",
                (
                    json.dumps(
                        {
                            "group_id": group,
                            "received": len(messages[:100]),
                            "imported": imported,
                            "complete": False,
                        }
                    ),
                    job["id"],
                ),
            )
        )

    def recall(self, data):
        group, mid = str(data.get("group_id", "")), str(data.get("message_id", ""))
        if (
            data.get("notice_type") != "group_recall"
            or group not in self.service.config.groups
        ):
            return
        conv = self.store.conversation("group", group)
        self.store.recall_platform(conv["id"], conv["generation"], mid)
        with self.store.db() as db:
            db.execute(
                "UPDATE qq_messages SET content='[消息已撤回]',metadata='{}',delivered=0 WHERE conversation=? AND generation=? AND platform_id=?",
                (conv["id"], conv["generation"], mid),
            )
            db.execute(
                "UPDATE qq_inbox SET status='cancelled',payload='{}' WHERE conversation=? AND json_extract(payload,'$.message_id')=?",
                (conv["id"], mid),
            )
            for row in db.execute(
                "SELECT id,payload FROM qq_reply_plans WHERE conversation=?",
                (conv["id"],),
            ).fetchall():
                if json.loads(row["payload"]).get("reply_to_message_id") == mid:
                    db.execute(
                        "UPDATE qq_outbox SET status='cancelled' WHERE inbox_id=? AND status='pending'",
                        (row["id"],),
                    )
                    db.execute(
                        "UPDATE qq_media_jobs SET status='cancelled' WHERE dedupe=?",
                        (row["id"] + ":tts",),
                    )


def voice_requested(text):
    text = re.sub(r"\s+", "", text)
    if re.search(r"不要.*语音|不用.*语音|别.*语音|关闭.*语音|语音设置|语音功能|怎么.*语音", text):
        return False
    return bool(
        re.search(r"语音回复|用语音[说读回]|读给我听|念给我听|发(?:送)?(?:一|1)?[个段条]?语音", text)
    )


def voice_followup_requested(event, history, created):
    """Continue only a short request chain by this sender in the supplied conversation.

    The explicit request must remain within 120 seconds; follow-ups never renew it.
    A different topic or cancellation by this sender ends the chain.
    """
    def followup(text):
        text = re.sub(r"[\s，,。.!！?？~～]", "", text)
        return bool(re.fullmatch(
            r"(?:求你了?|拜托了?)(?:就一次)?|就一次(?:嘛|吧)?|"
            r"(?:再)?发(?:送)?(?:一|1)?[条个段](?:吧|嘛|呀|啊)?|"
            r"(?:快|快点|赶紧)发(?:吧|嘛|呀|啊)?", text
        ))

    if not followup(event["text"]):
        return False
    previous = sorted(
        (h for h in history if h.get("role") == "user"
         and str(h.get("sender")) == str(event["sender"])
         and 0 <= created - h.get("created", 0) <= 120),
        key=lambda h: h["created"], reverse=True,
    )
    for message in previous:
        if voice_requested(message["content"]):
            return True
        if not followup(message["content"]):
            return False
    return False


def speakable(text):
    return bool(
        text
        and len(text) <= 120
        and not re.search(r"```|https?://|MOOD\s*:|ACTION\s*:|EMOTION\s*:", text, re.I)
    )


def safe_error_code(error):
    code = type(error).__name__
    status = getattr(error, "status_code", None)
    if isinstance(status, int) and 100 <= status <= 599:
        code += f":HTTP{status}"
    if type(error).__name__ == "ValidationError":
        fields = []
        for item in error.errors(include_input=False, include_url=False)[:5]:
            fields.extend(
                str(x)
                for x in item.get("loc", ())
                if re.fullmatch(r"[A-Za-z_][A-Za-z_0-9]{0,30}", str(x))
            )
        if fields:
            code += ":" + ",".join(fields)
    return code[:120]
