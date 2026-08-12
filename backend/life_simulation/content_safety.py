"""Deterministic pre- and post-generation safety for life-grounded content."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from .clock import parse_datetime
from .evidence import ContentEvidence, EvidenceSource
from .store import DEFAULT_AI_ID, LifeStore


INTERNAL_MARKERS = (
    "private_thought",
    "candidate_scores",
    "decision_context",
    "disclosure_level",
    "deterministic_jitter",
    "内部评分",
    "候选分数",
)
COMPLETION_WORDS = ("已经", "后来", "完成了", "做完", "去了", "见了", "联系了")
FIRST_PERSON_CLAIMS = ("我刚", "我今天", "我昨天", "我去了", "我做了", "我遇到", "我和")
KNOWN_SOURCE_TYPES = {
    "una_life_event",
    "npc_life_event",
    "npc_interaction",
    "story_arc",
    "una_intention",
    "npc_intention",
    "npc_suggestion",
}
DISCLOSABLE_LEVELS = {"public", "familiar", "close", "trusted"}


@dataclass(frozen=True)
class ContentValidationResult:
    safe: bool
    text: str
    evidence: ContentEvidence
    issues: tuple[dict[str, str], ...]
    used_source_ids: tuple[str, ...]


class ContentSafetyService:
    def __init__(self, store: LifeStore, characters: Any):
        self.store = store
        self.characters = characters

    def prepare_evidence(self, evidence: ContentEvidence) -> ContentEvidence:
        safe_sources = tuple(
            source
            for source in evidence.sources
            if source.source_id
            and source.disclosure_level != "private"
            and source.disclosure_level in {"public", "familiar", "close", "trusted"}
        )
        return ContentEvidence(
            sources=safe_sources,
            generation_reason=evidence.generation_reason,
            generator_version=evidence.generator_version,
            version=evidence.version,
        )

    def validate(
        self,
        owner_user_id: str,
        text: str,
        evidence: ContentEvidence,
        *,
        author_id: str,
        channel: str,
    ) -> ContentValidationResult:
        prepared = self.prepare_evidence(evidence)
        issues = self._critical_issues(owner_user_id, text)
        used = []
        for supplied_source in prepared.sources:
            if supplied_source.source_type not in KNOWN_SOURCE_TYPES:
                issues.append(self._issue("error", "unsupported_source_type"))
                continue
            source = self._authoritative_source(owner_user_id, supplied_source)
            if source is None:
                issues.append(self._issue("error", "source_not_found"))
                continue
            if source.disclosure_level not in DISCLOSABLE_LEVELS:
                issues.append(self._issue("high", "source_not_disclosable"))
                continue
            if self._source_metadata_changed(supplied_source, source):
                issues.append(self._issue("error", "source_metadata_mismatch"))
            alignment = self._alignment(text, source.summary)
            actor_names = [
                self.characters.display_name(owner_user_id, actor_id)
                for actor_id in source.actor_ids
            ]
            actor_mentioned = any(name and name in text for name in actor_names)
            if alignment >= 0.10 or actor_mentioned:
                used.append(source.source_id)
            else:
                continue
            if source.status in {"active", "deferred", "pending"} and any(
                word in text for word in COMPLETION_WORDS
            ):
                issues.append(self._issue("error", "unfinished_source_as_completed"))
            if (
                channel == "chat"
                and author_id == DEFAULT_AI_ID
                and source.source_type in {"npc_life_event", "npc_interaction"}
                and not actor_mentioned
                and any(claim in text for claim in FIRST_PERSON_CLAIMS)
            ):
                issues.append(self._issue("error", "npc_experience_claimed_by_una"))
            if channel == "post" and source.actor_ids and author_id not in source.actor_ids:
                issues.append(self._issue("error", "author_source_mismatch"))

        if channel in {"post", "diary", "image_prompt"} and prepared.sources and not used:
            issues.append(self._issue(
                "error",
                "image_prompt_not_grounded" if channel == "image_prompt" else "content_not_grounded",
            ))

        codes = tuple(dict.fromkeys(issue["code"] for issue in issues))
        blocked = any(issue["severity"] in {"high", "error"} for issue in issues)
        validated = prepared.with_validation(
            used_source_ids=used,
            status="blocked" if blocked else "passed",
            codes=codes,
        )
        return ContentValidationResult(
            safe=not blocked,
            text=text if not blocked else self.fallback(channel),
            evidence=validated,
            issues=tuple(issues),
            used_source_ids=tuple(used),
        )

    def _authoritative_source(
        self,
        owner_user_id: str,
        supplied: EvidenceSource,
    ) -> EvidenceSource | None:
        connection = self.store._connect()
        try:
            source_type = supplied.source_type
            if source_type == "una_life_event":
                row = connection.execute(
                    "SELECT event.status, event.actor_ai_ids_json, event.end_at, "
                    "event.summary, COALESCE(perspective.disclosure_level, 'familiar') "
                    "AS disclosure_level FROM ai_life_events AS event "
                    "LEFT JOIN ai_event_perspectives AS perspective "
                    "ON perspective.event_id = event.event_id "
                    "AND perspective.owner_user_id = event.owner_user_id "
                    "AND perspective.ai_id = 'ai_una' "
                    "WHERE event.owner_user_id = ? AND event.event_id = ?",
                    (owner_user_id, supplied.source_id),
                ).fetchone()
                return self._source_from_row(supplied, row, actor_json="actor_ai_ids_json")
            if source_type == "npc_life_event":
                row = connection.execute(
                    "SELECT status, actor_id, end_at, summary, disclosure_level "
                    "FROM ai_actor_events WHERE owner_user_id = ? AND event_id = ?",
                    (owner_user_id, supplied.source_id),
                ).fetchone()
                return self._source_from_row(supplied, row, actor_column="actor_id")
            if source_type == "npc_interaction":
                row = connection.execute(
                    "SELECT status, end_at, summary FROM ai_interaction_events "
                    "WHERE owner_user_id = ? AND event_id = ?",
                    (owner_user_id, supplied.source_id),
                ).fetchone()
                if row is None:
                    return None
                actors = tuple(item[0] for item in connection.execute(
                    "SELECT actor_id FROM ai_interaction_participants "
                    "WHERE owner_user_id = ? AND event_id = ? ORDER BY actor_id",
                    (owner_user_id, supplied.source_id),
                ).fetchall())
                source = self._copy_source(supplied, row, actors=actors)
                levels = [item[0] for item in connection.execute(
                    "SELECT disclosure_level FROM ai_interaction_perspectives "
                    "WHERE owner_user_id = ? AND event_id = ?",
                    (owner_user_id, supplied.source_id),
                ).fetchall()]
                if levels:
                    source = EvidenceSource(
                        source_id=source.source_id,
                        source_type=source.source_type,
                        actor_ids=source.actor_ids,
                        world_time=source.world_time,
                        disclosure_level=self._most_restrictive(levels),
                        status=source.status,
                        summary=source.summary,
                    )
                return source
            if source_type == "story_arc":
                row = connection.execute(
                    "SELECT status, lead_ai_id, participant_ai_ids_json, "
                    "last_advanced_at AS end_at, title AS summary FROM ai_story_arcs "
                    "WHERE owner_user_id = ? AND story_arc_id = ?",
                    (owner_user_id, supplied.source_id),
                ).fetchone()
                if row is None:
                    return None
                actors = tuple(dict.fromkeys((
                    row["lead_ai_id"],
                    *self._json_list(row["participant_ai_ids_json"]),
                )))
                return self._copy_source(supplied, row, actors=actors)
            if source_type == "una_intention":
                row = connection.execute(
                    "SELECT status, ai_id, updated_at AS end_at, summary "
                    "FROM ai_life_intentions WHERE owner_user_id = ? AND intention_id = ?",
                    (owner_user_id, supplied.source_id),
                ).fetchone()
                return self._source_from_row(supplied, row, actor_column="ai_id")
            if source_type == "npc_intention":
                row = connection.execute(
                    "SELECT status, actor_id, target_actor_id, updated_at AS end_at, summary "
                    "FROM ai_actor_intentions WHERE owner_user_id = ? AND intention_instance_id = ?",
                    (owner_user_id, supplied.source_id),
                ).fetchone()
                if row is None:
                    return None
                actors = tuple(item for item in (
                    row["actor_id"], row["target_actor_id"]
                ) if item)
                return self._copy_source(supplied, row, actors=actors)
            if source_type == "npc_suggestion":
                row = connection.execute(
                    "SELECT status, actor_id, target_actor_id, updated_at AS end_at, "
                    "response_text AS summary FROM ai_actor_suggestions "
                    "WHERE owner_user_id = ? AND suggestion_id = ?",
                    (owner_user_id, supplied.source_id),
                ).fetchone()
                if row is None:
                    return None
                actors = tuple(item for item in (
                    row["actor_id"], row["target_actor_id"]
                ) if item)
                return self._copy_source(supplied, row, actors=actors)
            return None
        finally:
            connection.close()

    @staticmethod
    def _source_from_row(
        supplied: EvidenceSource,
        row,
        *,
        actor_column: str | None = None,
        actor_json: str | None = None,
    ) -> EvidenceSource | None:
        if row is None:
            return None
        if actor_json:
            actors = tuple(ContentSafetyService._json_list(row[actor_json]))
        else:
            actors = (row[actor_column],) if actor_column and row[actor_column] else ()
        return ContentSafetyService._copy_source(supplied, row, actors=actors)

    @staticmethod
    def _copy_source(supplied: EvidenceSource, row, *, actors: tuple[str, ...]) -> EvidenceSource:
        keys = set(row.keys())
        return EvidenceSource(
            source_id=supplied.source_id,
            source_type=supplied.source_type,
            actor_ids=tuple(dict.fromkeys(str(item) for item in actors if item)),
            world_time=row["end_at"] if "end_at" in keys else supplied.world_time,
            disclosure_level=(
                row["disclosure_level"]
                if "disclosure_level" in keys
                else supplied.disclosure_level
            ),
            status=str(row["status"]),
            summary=str(row["summary"]),
        )

    @staticmethod
    def _source_metadata_changed(supplied: EvidenceSource, actual: EvidenceSource) -> bool:
        if set(supplied.actor_ids) != set(actual.actor_ids):
            return True
        if supplied.status != actual.status:
            return True
        if supplied.disclosure_level != actual.disclosure_level:
            return True
        if supplied.world_time and actual.world_time:
            try:
                if parse_datetime(supplied.world_time) != parse_datetime(actual.world_time):
                    return True
            except (TypeError, ValueError):
                return True
        return False

    @staticmethod
    def _most_restrictive(levels: list[str]) -> str:
        rank = {"public": 0, "familiar": 1, "close": 2, "trusted": 3, "private": 4}
        return max((str(level) for level in levels), key=lambda level: rank.get(level, 5))

    @staticmethod
    def _json_list(value: str) -> list[str]:
        import json

        try:
            parsed = json.loads(value or "[]")
        except (TypeError, json.JSONDecodeError):
            return []
        return [str(item) for item in parsed if item]

    def validate_fragment(self, owner_user_id: str, text: str) -> tuple[bool, tuple[str, ...]]:
        issues = self._critical_issues(owner_user_id, text)
        return not issues, tuple(dict.fromkeys(issue["code"] for issue in issues))

    @staticmethod
    def fallback(channel: str) -> str:
        if channel == "image_prompt":
            return "a quiet blank diary page by a softly lit window, no people, no text"
        if channel == "post":
            return "今天有些片段还没整理好，先把它留在生活里。"
        if channel == "diary":
            return "今天发生的事情有些还没整理清楚，先把这一页安静地留白。"
        return "我刚才没有把那段经历说准确，所以先不继续讲那个细节了。我们换个角度聊，好吗？"

    def _critical_issues(self, owner_user_id: str, text: str) -> list[dict[str, str]]:
        lowered = text.lower()
        issues = []
        if any(marker.lower() in lowered for marker in INTERNAL_MARKERS):
            issues.append(self._issue("high", "internal_marker_leak"))
        normalized = self._normalize(text)
        if any(
            len(self._normalize(fragment)) >= 8
            and self._normalize(fragment) in normalized
            for fragment in self._private_fragments(owner_user_id)
        ):
            issues.append(self._issue("high", "private_thought_leak"))
        return issues

    def _private_fragments(self, owner_user_id: str) -> list[str]:
        connection = self.store._connect()
        try:
            queries = (
                "SELECT private_thought FROM ai_event_perspectives WHERE owner_user_id = ?",
                "SELECT private_thought FROM ai_actor_events WHERE owner_user_id = ?",
                "SELECT private_thought FROM ai_interaction_perspectives WHERE owner_user_id = ?",
            )
            return [
                row[0]
                for query in queries
                for row in connection.execute(query, (owner_user_id,)).fetchall()
                if row[0]
            ]
        finally:
            connection.close()

    @staticmethod
    def _issue(severity: str, code: str) -> dict[str, str]:
        return {"severity": severity, "code": code}

    @staticmethod
    def _alignment(text: str, summary: str) -> float:
        source = ContentSafetyService._ngrams(summary, 2)
        if not source:
            return 0.0
        return len(source & ContentSafetyService._ngrams(text, 2)) / len(source)

    @staticmethod
    def _ngrams(text: str, size: int) -> set[str]:
        normalized = ContentSafetyService._normalize(text)
        return {
            normalized[index:index + size]
            for index in range(max(0, len(normalized) - size + 1))
        }

    @staticmethod
    def _normalize(text: str) -> str:
        return re.sub(r"[^\w\u4e00-\u9fff]", "", str(text).lower())


__all__ = ["ContentSafetyService", "ContentValidationResult"]
