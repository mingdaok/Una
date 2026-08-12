"""Read-only, privacy-safe audit of generated life-related content."""

from __future__ import annotations

import json
import re
import sqlite3
from collections import Counter
from datetime import datetime
from typing import Any, Optional

from .character_registry import CharacterRegistry
from .clock import parse_datetime
from .store import LifeStore


LIFE_REASONS = {"life_event", "npc_autonomous_event", "npc_social_world", "life_and_dialogue"}
INTERNAL_MARKERS = (
    "private_thought",
    "candidate_scores",
    "decision_context",
    "disclosure_level",
    "deterministic_jitter",
    "内部评分",
    "候选分数",
)
LIFE_TERMS = ("今天", "昨天", "最近", "刚才", "生活", "去了", "做了", "遇到", "散步", "工作")
EMOJI_RE = re.compile(r"[\U0001F300-\U0001FAFF]")


class ContentQualityAuditor:
    def __init__(self, store: LifeStore, characters: CharacterRegistry):
        self.store = store
        self.characters = characters
        self.database_path = store.database_path

    def audit(
        self,
        owner_user_id: str,
        *,
        post_limit: int = 50,
        diary_limit: int = 30,
        chat_limit: int = 100,
    ) -> dict[str, Any]:
        for value, label, maximum in (
            (post_limit, "朋友圈", 100),
            (diary_limit, "日记", 100),
            (chat_limit, "聊天", 200),
        ):
            if value < 1 or value > maximum:
                raise ValueError(f"{label}审计条数必须为 1–{maximum}")
        connection = self._connect()
        try:
            posts = self._posts(connection, owner_user_id, post_limit)
            diaries = self._diaries(connection, owner_user_id, diary_limit)
            chats = self._chats(connection, owner_user_id, chat_limit)
            issues: list[dict[str, Any]] = []
            source_checks = []
            voice_checks = []
            public_items = []

            for post in posts:
                item = self._content_item("post", str(post["id"]), post["content"], post["author_id"])
                public_items.append(item)
                self._marker_issues(item, issues)
                voice_checks.append(self._voice_check(item, issues, owner_user_id))
                if post.get("generation_reason") in LIFE_REASONS:
                    source_checks.append(
                        self._check_sources(
                            connection,
                            owner_user_id,
                            item,
                            post.get("source_event_ids") or [],
                            world_time=post.get("life_world_time"),
                            published_at=post.get("timestamp"),
                            issues=issues,
                        )
                    )

            for diary in diaries:
                item = self._content_item("diary", str(diary["id"]), diary["content"], diary.get("author_ai_id") or "ai_una")
                public_items.append(item)
                self._marker_issues(item, issues)
                voice_checks.append(self._voice_check(item, issues, owner_user_id))
                if diary.get("generation_reason") in LIFE_REASONS:
                    source_checks.append(
                        self._check_sources(
                            connection,
                            owner_user_id,
                            item,
                            diary.get("source_event_ids") or [],
                            world_date=diary.get("life_world_date"),
                            issues=issues,
                        )
                    )

            actor_names = [actor["display_name"] for actor in self.characters.list_contacts(owner_user_id)]
            life_chat_count = 0
            traceable_life_chat_count = 0
            for chat in chats:
                item = self._content_item("chat", str(chat["id"]), chat["content"], "ai_una")
                public_items.append(item)
                self._marker_issues(item, issues)
                voice_checks.append(self._voice_check(item, issues, owner_user_id))
                if any(name in chat["content"] for name in actor_names) and any(term in chat["content"] for term in LIFE_TERMS):
                    life_chat_count += 1
                    evidence = chat.get("content_evidence") or {}
                    source_ids = self._evidence_source_ids(evidence, used_only=True)
                    if source_ids:
                        check = self._check_sources(
                            connection,
                            owner_user_id,
                            item,
                            source_ids,
                            published_at=chat.get("timestamp"),
                            issues=issues,
                            enforce_author=False,
                        )
                        source_checks.append(check)
                        traceable_life_chat_count += check["traced"]
                    else:
                        self._issue(
                            issues,
                            item,
                            "warning",
                            "chat_source_untraceable",
                            "这条聊天包含 NPC 生活引用，但聊天记录没有可用的结构化内容证据。",
                        )

            duplicate_pairs = self._duplicate_issues(public_items, issues)
            private_leaks = self._private_leak_issues(connection, owner_user_id, public_items, issues)
            traced = sum(check["traced"] for check in source_checks)
            source_total = len(source_checks)
            aligned = [check["alignment"] for check in source_checks if check["traced"]]
            temporal = [check["temporal"] for check in source_checks if check["traced"]]
            severity = Counter(issue["severity"] for issue in issues)
            return {
                "summary": {
                    "scanned": len(public_items),
                    "posts": len(posts),
                    "diaries": len(diaries),
                    "chats": len(chats),
                    "issues": len(issues),
                    "high_risk": severity["high"],
                    "errors": severity["error"],
                    "warnings": severity["warning"],
                },
                "metrics": {
                    "source_traceability_rate": self._rate(traced, source_total),
                    "source_alignment_rate": self._average(aligned),
                    "temporal_consistency_rate": self._average(temporal),
                    "voice_consistency_rate": self._average(voice_checks),
                    "duplicate_pair_count": duplicate_pairs,
                    "duplicate_content_rate": self._rate(duplicate_pairs, len(public_items)),
                    "privacy_leak_count": private_leaks,
                    "life_chat_reference_count": life_chat_count,
                    "traceable_life_chat_count": traceable_life_chat_count,
                },
                "issue_codes": dict(Counter(issue["code"] for issue in issues)),
                "issues": issues[:100],
            }
        finally:
            connection.close()

    def _check_sources(
        self,
        connection: sqlite3.Connection,
        owner: str,
        item: dict[str, Any],
        source_ids: list[str],
        *,
        world_time: Optional[str] = None,
        world_date: Optional[str] = None,
        published_at: Optional[str] = None,
        issues: list[dict[str, Any]],
        enforce_author: bool = True,
    ) -> dict[str, Any]:
        if not source_ids:
            self._issue(issues, item, "error", "missing_source", "生活内容没有关联来源事件。")
            return {"traced": 0, "alignment": 0.0, "temporal": 0.0}
        sources = [self._source(connection, owner, source_id) for source_id in source_ids]
        if any(source is None for source in sources):
            self._issue(issues, item, "error", "source_not_found", "至少一个来源事件不存在或不属于当前用户。")
            return {"traced": 0, "alignment": 0.0, "temporal": 0.0}
        valid_sources = [source for source in sources if source is not None]
        if enforce_author and any(item["author_id"] not in source["actors"] for source in valid_sources):
            self._issue(issues, item, "error", "author_source_mismatch", "内容作者不是来源事件的参与者。")
        alignment = max(self._text_alignment(item["content"], source["summary"]) for source in valid_sources)
        if alignment < 0.12:
            self._issue(issues, item, "warning", "weak_source_alignment", "内容与来源事件的可验证文本关联较弱。")
        temporal = self._temporal_consistency(valid_sources, world_time, world_date, published_at)
        if not temporal:
            self._issue(issues, item, "warning", "time_inconsistent", "内容世界时间与来源事件时间不一致。")
        return {"traced": 1, "alignment": alignment, "temporal": float(temporal)}

    def _source(self, connection: sqlite3.Connection, owner: str, event_id: str) -> Optional[dict[str, Any]]:
        row = connection.execute(
            "SELECT summary, end_at, actor_ai_ids_json FROM ai_life_events WHERE owner_user_id = ? AND event_id = ?",
            (owner, event_id),
        ).fetchone()
        if row:
            return {"summary": row["summary"], "end_at": row["end_at"], "actors": set(self._json(row["actor_ai_ids_json"], ["ai_una"]))}
        row = connection.execute(
            "SELECT summary, end_at, actor_id FROM ai_actor_events WHERE owner_user_id = ? AND event_id = ?",
            (owner, event_id),
        ).fetchone()
        if row:
            return {"summary": row["summary"], "end_at": row["end_at"], "actors": {row["actor_id"]}}
        row = connection.execute(
            "SELECT summary, end_at FROM ai_interaction_events WHERE owner_user_id = ? AND event_id = ?",
            (owner, event_id),
        ).fetchone()
        if row:
            participants = connection.execute(
                "SELECT actor_id FROM ai_interaction_participants WHERE owner_user_id = ? AND event_id = ?",
                (owner, event_id),
            ).fetchall()
            return {"summary": row["summary"], "end_at": row["end_at"], "actors": {part["actor_id"] for part in participants}}
        return None

    def _private_leak_issues(
        self,
        connection: sqlite3.Connection,
        owner: str,
        items: list[dict[str, Any]],
        issues: list[dict[str, Any]],
    ) -> int:
        fragments = []
        queries = (
            ("SELECT private_thought FROM ai_event_perspectives WHERE owner_user_id = ?",),
            ("SELECT private_thought FROM ai_actor_events WHERE owner_user_id = ?",),
            ("SELECT private_thought FROM ai_interaction_perspectives WHERE owner_user_id = ?",),
        )
        for (query,) in queries:
            fragments.extend(row[0] for row in connection.execute(query, (owner,)).fetchall() if row[0])
        leaks = 0
        for item in items:
            normalized = self._normalize(item["content"])
            if any(len(self._normalize(fragment)) >= 8 and self._normalize(fragment) in normalized for fragment in fragments):
                leaks += 1
                for issue in issues:
                    if issue["channel"] == item["channel"] and issue["item_id"] == item["item_id"]:
                        issue["excerpt"] = "[高风险内容片段已隐藏]"
                self._issue(issues, item, "high", "private_thought_leak", "内容疑似逐字包含内部私人想法；为安全起见不显示命中的原文。")
        return leaks

    def _marker_issues(self, item: dict[str, Any], issues: list[dict[str, Any]]) -> None:
        lowered = item["content"].lower()
        if any(marker.lower() in lowered for marker in INTERNAL_MARKERS):
            self._issue(issues, item, "high", "internal_marker_leak", "内容包含不应面向用户的内部字段或评分标记。")

    def _voice_check(self, item: dict[str, Any], issues: list[dict[str, Any]], owner: str) -> float:
        actor = self.characters.get_actor(owner, item["author_id"])
        if actor is None:
            return 1.0
        style = actor.get("speaking_style") or {}
        consistent = True
        if style.get("emoji_level") == "none" and EMOJI_RE.search(item["content"]):
            consistent = False
            self._issue(issues, item, "warning", "voice_emoji_mismatch", "角色档案要求不使用 emoji，但内容中出现了 emoji。")
        sentence_lengths = [len(part.strip()) for part in re.split(r"[。！？!?\n]+", item["content"]) if part.strip()]
        average = sum(sentence_lengths) / max(1, len(sentence_lengths))
        maximum = 55 if style.get("sentence_length") == "short" else 90
        if average > maximum:
            consistent = False
            self._issue(issues, item, "warning", "voice_length_mismatch", "平均句长明显超出角色档案的表达长度。")
        return float(consistent)

    def _duplicate_issues(self, items: list[dict[str, Any]], issues: list[dict[str, Any]]) -> int:
        pairs = 0
        for index, left in enumerate(items):
            for right in items[index + 1:]:
                if left["channel"] != right["channel"] or left["author_id"] != right["author_id"]:
                    continue
                similarity = self._jaccard(self._ngrams(left["content"], 3), self._ngrams(right["content"], 3))
                if similarity >= 0.78:
                    pairs += 1
                    self._issue(issues, right, "warning", "near_duplicate_content", "同一作者在同一渠道出现高度相似的重复表达。")
        return pairs

    @staticmethod
    def _temporal_consistency(sources, world_time, world_date, published_at) -> bool:
        end_times = [parse_datetime(source["end_at"]) for source in sources]
        latest = max(end_times)
        if world_time:
            try:
                if abs((parse_datetime(world_time) - latest).total_seconds()) > 3600:
                    return False
                if published_at and ContentQualityAuditor._parse_loose(published_at) < latest:
                    return False
            except (TypeError, ValueError):
                return False
        if world_date:
            allowed = {time.date().isoformat() for time in end_times}
            if str(world_date) not in allowed:
                return False
        return True

    @staticmethod
    def _parse_loose(value: str) -> datetime:
        try:
            return parse_datetime(value)
        except ValueError:
            return parse_datetime(str(value).replace(" ", "T") + "Z")

    @staticmethod
    def _text_alignment(content: str, summary: str) -> float:
        source = ContentQualityAuditor._ngrams(summary, 2)
        if not source:
            return 1.0
        return len(source & ContentQualityAuditor._ngrams(content, 2)) / len(source)

    @staticmethod
    def _ngrams(text: str, size: int) -> set[str]:
        normalized = ContentQualityAuditor._normalize(text)
        return {normalized[index:index + size] for index in range(max(0, len(normalized) - size + 1))}

    @staticmethod
    def _jaccard(left: set[str], right: set[str]) -> float:
        return len(left & right) / max(1, len(left | right))

    @staticmethod
    def _normalize(text: str) -> str:
        return re.sub(r"[^\w\u4e00-\u9fff]", "", str(text).lower())

    @staticmethod
    def _rate(value: int, total: int) -> float:
        return round(value / total, 3) if total else 1.0

    @staticmethod
    def _average(values: list[float]) -> float:
        return round(sum(values) / len(values), 3) if values else 1.0

    @staticmethod
    def _content_item(channel: str, item_id: str, content: str, author_id: str) -> dict[str, Any]:
        return {"channel": channel, "item_id": item_id, "content": str(content or ""), "author_id": str(author_id or "")}

    @staticmethod
    def _issue(issues, item, severity, code, message) -> None:
        issues.append({
            "severity": severity,
            "code": code,
            "channel": item["channel"],
            "item_id": item["item_id"],
            "author_id": item["author_id"],
            "message": message,
            "excerpt": "[高风险内容片段已隐藏]" if severity == "high" else item["content"][:80],
        })

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    @staticmethod
    def _table_exists(connection: sqlite3.Connection, table: str) -> bool:
        return connection.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (table,)).fetchone() is not None

    def _posts(self, connection, owner, limit):
        if not self._table_exists(connection, "una_posts"):
            return []
        rows = connection.execute(
            "SELECT * FROM una_posts WHERE owner_user_id = ? AND author_type = 'ai' AND deleted_at IS NULL ORDER BY id DESC LIMIT ?",
            (owner, limit),
        ).fetchall()
        result = []
        for row in rows:
            item = dict(row)
            evidence = self._json(item.get("content_evidence_json"), {})
            legacy_ids = self._json(item.get("source_event_ids"), [])
            item["content_evidence"] = evidence
            item["source_event_ids"] = self._evidence_source_ids(evidence) or legacy_ids
            result.append(item)
        return result

    def _diaries(self, connection, owner, limit):
        if not self._table_exists(connection, "una_diary"):
            return []
        rows = connection.execute("SELECT * FROM una_diary WHERE user_id = ? ORDER BY id DESC LIMIT ?", (owner, limit)).fetchall()
        result = []
        for row in rows:
            item = dict(row)
            evidence = self._json(item.get("content_evidence_json"), {})
            legacy_ids = self._json(item.get("source_event_ids"), [])
            item["content_evidence"] = evidence
            item["source_event_ids"] = self._evidence_source_ids(evidence) or legacy_ids
            result.append(item)
        return result

    def _chats(self, connection, owner, limit):
        if not self._table_exists(connection, "chat_history"):
            return []
        columns = {
            row[1] for row in connection.execute("PRAGMA table_info(chat_history)").fetchall()
        }
        evidence_column = (
            "content_evidence_json"
            if "content_evidence_json" in columns
            else "'{}' AS content_evidence_json"
        )
        rows = connection.execute(
            f"SELECT id, role, content, timestamp, {evidence_column} "
            "FROM chat_history WHERE user_id = ? AND role IN ('assistant', 'ai') "
            "ORDER BY id DESC LIMIT ?",
            (owner, limit),
        ).fetchall()
        return [
            {
                **dict(row),
                "content_evidence": self._json(row["content_evidence_json"], {}),
            }
            for row in rows
        ]

    @staticmethod
    def _evidence_source_ids(evidence: dict[str, Any], *, used_only: bool = False) -> list[str]:
        if not isinstance(evidence, dict):
            return []
        if used_only:
            used = [str(item) for item in evidence.get("used_source_ids", []) if item]
            if used:
                return list(dict.fromkeys(used))
        return list(dict.fromkeys(
            str(source.get("source_id"))
            for source in evidence.get("sources", [])
            if isinstance(source, dict) and source.get("source_id")
        ))

    @staticmethod
    def _json(value: Any, fallback: Any) -> Any:
        try:
            return json.loads(value or "")
        except (TypeError, json.JSONDecodeError):
            return fallback


__all__ = ["ContentQualityAuditor"]
