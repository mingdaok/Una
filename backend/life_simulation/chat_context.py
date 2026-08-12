"""把可透露的生活事实筛选成聊天上下文。"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Optional

from .clock import parse_datetime, utc_now
from .continuity import story_stage_label
from .evidence import ContentEvidence, EvidenceSource
from .service import LifeSettlementService
from .store import DEFAULT_AI_ID


DIRECT_LIFE_QUERIES = (
    "你今天",
    "你最近",
    "你刚才",
    "你在干嘛",
    "你在做什么",
    "你去哪",
    "你过得",
    "发生什么",
    "你的生活",
    "你呢",
)

SHARED_DECISION_QUERIES = ("我们说", "商量", "建议", "决定", "记得", "后来呢")
NPC_LIFE_QUERIES = (
    "你的朋友",
    "朋友最近",
    "朋友怎么样",
    "他们最近",
    "她最近",
    "他最近",
    "npc",
)


@dataclass(frozen=True)
class LifeChatContextBundle:
    text: str
    evidence: ContentEvidence


class LifeChatContextService:
    def __init__(self, settlement: LifeSettlementService):
        self.settlement = settlement

    def build_context(
        self,
        owner_user_id: str,
        user_text: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        now: Optional[datetime] = None,
        limit: int = 3,
    ) -> str:
        return self.build_context_bundle(
            owner_user_id, user_text, ai_id, now=now, limit=limit
        ).text

    def build_context_bundle(
        self,
        owner_user_id: str,
        user_text: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        now: Optional[datetime] = None,
        limit: int = 3,
    ) -> "LifeChatContextBundle":
        current = parse_datetime(now or utc_now())
        self.settlement.settle_due(owner_user_id, ai_id, now=current)
        events = self.settlement.store.list_events(
            owner_user_id,
            ai_id,
            limit=30,
            since=(current - timedelta(days=7)).isoformat(),
            min_importance=18,
        )
        direct_query = any(phrase in user_text for phrase in DIRECT_LIFE_QUERIES)
        query_terms = self._terms(user_text)
        scored: list[tuple[float, dict[str, Any]]] = []
        for event in events:
            if event["disclosure_level"] == "private" or event["mentionability"] < 35:
                continue
            overlap = len(query_terms & self._terms(event["summary"]))
            age_hours = max(
                0.0,
                (current - parse_datetime(event["end_at"])).total_seconds() / 3600,
            )
            recency = max(0.0, 30.0 - min(30.0, age_hours / 4))
            score = event["mentionability"] * 0.55 + event["importance"] * 0.20 + recency
            score += overlap * 18
            if direct_query:
                score += 35
            if score >= 68:
                scored.append((score, event))
        scored.sort(key=lambda item: (item[0], item[1]["end_at"]), reverse=True)
        chosen = [event for _, event in scored[: max(1, min(5, limit))]]
        lines = []
        sources: list[EvidenceSource] = []
        for event in chosen:
            local_time = parse_datetime(event["end_at"]).strftime("%m-%d %H:%M")
            lines.append(
                f"- [{local_time}] {event['summary']}（地点：{event['location_id']}）"
            )
            sources.append(EvidenceSource(
                source_id=event["event_id"],
                source_type="una_life_event",
                actor_ids=(ai_id,),
                world_time=event["end_at"],
                disclosure_level=event.get("disclosure_level", "public"),
                status=event.get("status", "completed"),
                summary=event["summary"],
            ))
        npc_lines, npc_sources = self._npc_context_lines(
            owner_user_id,
            user_text,
            current,
            query_terms,
            limit=max(1, min(3, limit)),
        )
        lines.extend(npc_lines)
        sources.extend(npc_sources)
        arcs = self.settlement.store.list_story_arcs(
            owner_user_id,
            ai_id,
            status="active",
            limit=3,
        )
        for arc in arcs:
            if not direct_query and not (query_terms & self._terms(arc["title"])):
                continue
            lines.append(
                f"- [持续中的事] {arc['title']}，{story_stage_label(arc['stage'])}。"
            )
            sources.append(EvidenceSource(
                source_id=arc["story_arc_id"],
                source_type="story_arc",
                actor_ids=tuple([ai_id, *arc.get("participant_ai_ids", [])]),
                world_time=arc.get("last_advanced_at"),
                disclosure_level="familiar",
                status=arc.get("status", "active"),
                summary=arc["title"],
            ))
            break
        intentions = self.settlement.store.list_intentions(
            owner_user_id,
            ai_id,
            statuses=("active", "deferred", "fulfilled", "abandoned", "expired", "applied"),
            limit=5,
            order="recent",
        )
        asks_about_decision = any(
            phrase in user_text for phrase in SHARED_DECISION_QUERIES
        )
        for intention in intentions:
            if not (
                direct_query
                or asks_about_decision
                or (query_terms & self._terms(intention["summary"]))
            ):
                continue
            status = intention["status"]
            if status in {"fulfilled", "applied"}:
                outcome = "UNA 后来已经按自己的判断落实了这件事"
            elif status == "abandoned":
                outcome = "UNA 后来决定不再继续这件事"
            elif status == "expired":
                outcome = "这件事后来没有在合适的时间发生"
            elif status == "deferred":
                outcome = "UNA 决定先放一放，等更合适的时候再想"
            else:
                outcome = "UNA 仍在按自己的节奏考虑"
            lines.append(
                "- [一起商量过] 用户曾给过建议："
                f"{intention['summary']}。{outcome}。这是建议而不是命令；"
                "UNA 保留自己的判断和行动节奏。"
            )
            sources.append(EvidenceSource(
                source_id=intention["intention_id"],
                source_type="una_intention",
                actor_ids=(ai_id,),
                world_time=intention.get("updated_at") or intention.get("created_at"),
                disclosure_level="familiar",
                status=intention["status"],
                summary=intention["summary"],
            ))
            break
        evidence = ContentEvidence(
            sources=tuple(self._deduplicate_sources(sources)),
            generation_reason="chat_life_context",
            generator_version="life-chat-context-v2",
        )
        return LifeChatContextBundle(text="\n".join(lines), evidence=evidence)

    def _npc_context_lines(
        self,
        owner_user_id: str,
        user_text: str,
        current: datetime,
        query_terms: set[str],
        *,
        limit: int,
    ) -> tuple[list[str], list[EvidenceSource]]:
        contacts = self.settlement.characters.list_contacts(owner_user_id)
        mentioned = []
        for contact in contacts:
            names = {
                contact["display_name"],
                *contact.get("aliases", []),
            }
            if any(name and name.lower() in user_text.lower() for name in names):
                mentioned.append(contact)
        generic_query = any(
            phrase in user_text.lower() for phrase in NPC_LIFE_QUERIES
        )
        if not mentioned and not generic_query:
            return [], []

        candidates = mentioned or contacts
        intention_lines = []
        intention_sources: list[EvidenceSource] = []
        for contact in candidates:
            suggestions = self.settlement.store.list_actor_suggestions(
                owner_user_id,
                contact["actor_id"],
                limit=1,
            )
            if suggestions:
                suggestion = suggestions[0]
                if parse_datetime(suggestion["created_at"]) >= current - timedelta(days=7):
                    intention_lines.append(
                        f"- [NPC对建议的回应·{contact['display_name']}] "
                        f"{suggestion['response_text']}（结果：{suggestion['status']}）。"
                        "这是对方自己的决定，不要把用户建议描述成命令，也不要泄露内部评分。"
                    )
                    intention_sources.append(EvidenceSource(
                        source_id=suggestion["suggestion_id"],
                        source_type="npc_suggestion",
                        actor_ids=tuple(
                            item for item in (
                                contact["actor_id"], suggestion.get("target_actor_id")
                            ) if item
                        ),
                        world_time=suggestion.get("updated_at") or suggestion.get("created_at"),
                        disclosure_level="familiar",
                        status=suggestion["status"],
                        summary=suggestion["response_text"],
                    ))
                    if len(intention_lines) >= limit:
                        return intention_lines, intention_sources
            intentions = self.settlement.store.list_actor_intentions(
                owner_user_id,
                contact["actor_id"],
                status="active",
                limit=1,
            )
            if not intentions:
                continue
            intention = intentions[0]
            if parse_datetime(intention["formed_at"]) < current - timedelta(days=3):
                continue
            intention_lines.append(
                f"- [NPC近期打算·{contact['display_name']}] "
                f"{intention['summary']}。这只是对方已经形成、尚未完成的打算；"
                "可以自然提及，但不要说成已经发生的事实，也不要泄露内部评分或动机分析。"
            )
            intention_sources.append(EvidenceSource(
                source_id=intention["intention_instance_id"],
                source_type="npc_intention",
                actor_ids=tuple(
                    item for item in (
                        contact["actor_id"], intention.get("target_actor_id")
                    ) if item
                ),
                world_time=intention.get("formed_at"),
                disclosure_level="familiar",
                status=intention["status"],
                summary=intention["summary"],
            ))
            if len(intention_lines) >= limit:
                return intention_lines, intention_sources
        scored: list[
            tuple[str, float, dict[str, Any], dict[str, Any]]
        ] = []
        since = (current - timedelta(days=7)).isoformat()
        for contact in candidates:
            directional = next(
                (
                    item
                    for item in self.settlement.store.list_relationships(
                        owner_user_id, contact["actor_id"], limit=30
                    )
                    if item["other_ai_id"] == DEFAULT_AI_ID
                ),
                {
                    "familiarity": 0,
                    "affinity": 0,
                    "trust": 0,
                    "tension": 0,
                },
            )
            relationship = self.settlement.relationship_dynamics.describe(
                directional
            )
            minimum_publicability = {
                "distant": 20,
                "familiar": 5,
                "close": 0,
                "trusted": 0,
                "strained": 45,
            }.get(relationship["relationship_tier"], 20)
            events = self.settlement.store.list_actor_events(
                owner_user_id,
                contact["actor_id"],
                since=since,
                min_importance=18,
                limit=30,
            )
            for event in events:
                if (
                    event.get("disclosure_level") == "private"
                    or int(event.get("mentionability", 0)) < 45
                    or int(event.get("publicability", 0))
                    < minimum_publicability
                ):
                    continue
                overlap = len(query_terms & self._terms(event["summary"]))
                age_hours = max(
                    0.0,
                    (
                        current - parse_datetime(event["end_at"])
                    ).total_seconds()
                    / 3600,
                )
                recency = max(0.0, 26.0 - min(26.0, age_hours / 5))
                score = (
                    int(event["mentionability"]) * 0.58
                    + int(event["importance"]) * 0.20
                    + recency
                    + overlap * 18
                    + (38 if contact in mentioned else 20)
                )
                if score >= 68:
                    scored.append(("life", score, event, contact))
            interactions = self.settlement.store.list_interaction_events(
                owner_user_id,
                actor_id=contact["actor_id"],
                since=since,
                min_importance=18,
                limit=30,
            )
            for interaction in interactions:
                perspective = interaction.get("perspective") or {}
                if (
                    perspective.get("disclosure_level") == "private"
                    or int(interaction.get("mentionability", 0)) < 45
                    or int(interaction.get("publicability", 0))
                    < minimum_publicability
                ):
                    continue
                overlap = len(query_terms & self._terms(interaction["summary"]))
                age_hours = max(
                    0.0,
                    (
                        current - parse_datetime(interaction["end_at"])
                    ).total_seconds()
                    / 3600,
                )
                recency = max(0.0, 30.0 - min(30.0, age_hours / 5))
                score = (
                    int(interaction["mentionability"]) * 0.60
                    + int(interaction["importance"]) * 0.22
                    + recency
                    + overlap * 18
                    + (42 if contact in mentioned else 22)
                )
                if score >= 70:
                    scored.append(("interaction", score, interaction, contact))
        scored.sort(
            key=lambda item: (item[1], item[2]["end_at"]), reverse=True
        )

        lines = list(intention_lines)
        sources = list(intention_sources)
        used_events = set()
        for kind, _, event, contact in scored:
            if event["event_id"] in used_events:
                continue
            used_events.add(event["event_id"])
            local_time = parse_datetime(event["end_at"]).strftime("%m-%d %H:%M")
            if kind == "interaction":
                participant_names = [
                    self.settlement.characters.display_name(
                        owner_user_id, item["actor_id"]
                    )
                    for item in event.get("participants", [])
                ]
                lines.append(
                    f"- [共同经历·{'、'.join(participant_names)}·{local_time}] "
                    f"{event['summary']}（地点：{event['location_id']}）。"
                    f"从{contact['display_name']}的视角看："
                    f"{(event.get('perspective') or {}).get('interpretation', '')}。"
                    "这是多方共同事件；不要混淆参与者，也不要公开任何私密想法。"
                )
                sources.append(EvidenceSource(
                    source_id=event["event_id"],
                    source_type="npc_interaction",
                    actor_ids=tuple(item["actor_id"] for item in event.get("participants", [])),
                    world_time=event["end_at"],
                    disclosure_level=(event.get("perspective") or {}).get("disclosure_level", "familiar"),
                    status=event.get("status", "completed"),
                    summary=event["summary"],
                ))
            else:
                lines.append(
                    f"- [NPC近况·{contact['display_name']}·{local_time}] "
                    f"{event['summary']}（地点：{event['location_id']}）。"
                    "这是对方自己的可披露生活记录；UNA 可以自然转述，"
                    "但不要说成自己的亲历，也不要补充记录中没有的细节。"
                )
                sources.append(EvidenceSource(
                    source_id=event["event_id"],
                    source_type="npc_life_event",
                    actor_ids=(contact["actor_id"],),
                    world_time=event["end_at"],
                    disclosure_level=event.get("disclosure_level", "familiar"),
                    status=event.get("status", "completed"),
                    summary=event["summary"],
                ))
            if len(lines) >= limit:
                break
        return lines, sources

    @staticmethod
    def _deduplicate_sources(sources: list[EvidenceSource]) -> list[EvidenceSource]:
        result = []
        seen = set()
        for source in sources:
            key = (source.source_type, source.source_id)
            if key in seen:
                continue
            seen.add(key)
            result.append(source)
        return result

    @staticmethod
    def _terms(text: str) -> set[str]:
        normalized = re.sub(r"[^\w\u4e00-\u9fff]", "", text.lower())
        terms = set(re.findall(r"[a-z0-9_]{2,}|[\u4e00-\u9fff]{2,4}", normalized))
        for size in (2, 3):
            terms.update(
                normalized[index : index + size]
                for index in range(max(0, len(normalized) - size + 1))
            )
        return {term for term in terms if term}
