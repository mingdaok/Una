"""NPC 短期意图与自主决策 v1。"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Optional

from .character_registry import (
    CharacterRegistry,
    IntentionTemplateDefinition,
)
from .clock import get_timezone, parse_datetime, utc_now
from .store import LifeStore


NPC_INTENTION_VERSION = "npc-intention-rules-v1"
INTENTION_DELAY_HOURS = 6
INTENTION_DEADLINE_HOURS = 30


@dataclass
class NpcIntentionSettlementReport:
    formed: int = 0
    completed: int = 0
    skipped: int = 0
    decisions: list[dict[str, Any]] = field(default_factory=list)
    events: list[dict[str, Any]] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "formed": self.formed,
            "completed": self.completed,
            "skipped": self.skipped,
            "decisions": list(self.decisions),
            "events": list(self.events),
        }


class NpcIntentionService:
    def __init__(self, store: LifeStore, characters: CharacterRegistry):
        self.store = store
        self.characters = characters

    def materialize_due(
        self,
        owner_user_id: str,
        timezone_name: str,
        *,
        now: Optional[datetime] = None,
    ) -> NpcIntentionSettlementReport:
        current = parse_datetime(now or utc_now())
        report = NpcIntentionSettlementReport()
        actors = self.store.list_actor_profiles(
            owner_user_id, actor_role="friend", status="active"
        )
        for profile in actors:
            actor = self.characters.get_actor(owner_user_id, profile["actor_id"])
            state = self.store.get_actor_state(owner_user_id, profile["actor_id"])
            if actor is None or state is None:
                report.skipped += 1
                continue
            active = self.store.list_actor_intentions(
                owner_user_id, actor["actor_id"], status="active", limit=1
            )
            if active:
                intention = active[0]
                if parse_datetime(intention["earliest_at"]) <= current:
                    event, created = self._complete(
                        owner_user_id, actor, intention, current
                    )
                    if created:
                        report.completed += 1
                        report.events.append(event)
                    else:
                        report.skipped += 1
                else:
                    report.skipped += 1
                continue
            candidate = self._choose(
                owner_user_id, actor, state, timezone_name, current
            )
            if candidate is None:
                report.skipped += 1
                continue
            intention, created = self.store.create_actor_intention(
                owner_user_id,
                actor["actor_id"],
                intention=candidate,
                now=current,
            )
            if created:
                report.formed += 1
                report.decisions.append(intention)
            else:
                report.skipped += 1
        return report

    def form_from_suggestion(
        self,
        owner_user_id: str,
        actor: dict[str, Any],
        template: IntentionTemplateDefinition,
        suggestion_id: str,
        *,
        target_actor_id: Optional[str],
        adjusted: bool,
        timezone_name: str,
        now: datetime,
    ) -> tuple[dict[str, Any], bool]:
        local_date = now.astimezone(get_timezone(timezone_name)).date().isoformat()
        interest = self._interest(owner_user_id, actor, local_date)
        target_name = (
            self.characters.display_name(owner_user_id, target_actor_id)
            if target_actor_id
            else "朋友"
        )
        values = {
            "actor": actor["display_name"],
            "interest": interest,
            "target": target_name,
        }
        state = self.store.get_actor_state(owner_user_id, actor["actor_id"])
        if state is None:
            raise KeyError("NPC 状态不存在")
        decision_key = f"npc-suggestion-intention:{suggestion_id}:{NPC_INTENTION_VERSION}"
        intention_instance_id = hashlib.sha256(
            decision_key.encode("utf-8")
        ).hexdigest()[:32]
        delay = 12 if adjusted else INTENTION_DELAY_HOURS
        intention = {
            "intention_instance_id": intention_instance_id,
            "template_id": template.intention_id,
            "driver": template.driver,
            "summary": template.summary_template.format(**values),
            "motivation": "听取建议后，按自己的判断形成了一个短期打算。",
            "target_actor_id": target_actor_id,
            "score": 50,
            "source_state_version": int(state["state_version"]),
            "decision_context": {
                "source_kind": "user_suggestion",
                "source_suggestion_id": suggestion_id,
                "adjusted": adjusted,
                "simulator_version": NPC_INTENTION_VERSION,
            },
            "action": self._action(template, values, target_name),
            "formed_at": now.isoformat(),
            "earliest_at": (now + timedelta(hours=delay)).isoformat(),
            "deadline_at": (now + timedelta(hours=72)).isoformat(),
            "decision_key": decision_key,
        }
        return self.store.create_actor_intention(
            owner_user_id,
            actor["actor_id"],
            intention=intention,
            now=now,
        )

    def _choose(
        self,
        owner_user_id: str,
        actor: dict[str, Any],
        state: dict[str, Any],
        timezone_name: str,
        current: datetime,
    ) -> Optional[dict[str, Any]]:
        local_date = current.astimezone(get_timezone(timezone_name)).date().isoformat()
        interest = self._interest(owner_user_id, actor, local_date)
        target = self._relationship_target(owner_user_id, actor["actor_id"])
        recent_events = self.store.list_actor_events(
            owner_user_id, actor["actor_id"], limit=8
        )
        history = self.store.list_actor_intentions(
            owner_user_id, actor["actor_id"], limit=3
        )
        recent_template_ids = {item["template_id"] for item in history}
        candidates = []
        for template in self.characters.catalog.intention_templates:
            if template.target_mode == "relationship" and target is None:
                continue
            metric_value = int(state.get(template.state_metric, 0))
            eligible = (
                metric_value >= template.threshold
                if template.state_direction == "high"
                else metric_value <= template.threshold
            )
            if not eligible:
                continue
            need_signal = (
                metric_value
                if template.state_direction == "high"
                else 100 - metric_value
            )
            personality_value = float(
                actor.get("personality", {}).get(template.personality_key, 0.5)
            )
            relationship_boost = 0
            if target and template.target_mode == "relationship":
                relationship_boost = int(target.get("relationship_score", 0) * 0.08)
            continuity_boost = self._continuity_boost(template, recent_events)
            repetition_penalty = 18 if template.intention_id in recent_template_ids else 0
            jitter = self._seed(
                owner_user_id,
                actor["actor_id"],
                local_date,
                template.intention_id,
                NPC_INTENTION_VERSION,
            ) % 11
            score = int(
                template.base_score
                + need_signal * template.need_weight
                + personality_value * template.personality_weight
                + relationship_boost
                + continuity_boost
                + jitter
                - repetition_penalty
            )
            candidates.append(
                (
                    score,
                    template,
                    {
                        "metric": template.state_metric,
                        "metric_value": metric_value,
                        "need_signal": need_signal,
                        "personality_key": template.personality_key,
                        "personality_value": personality_value,
                        "relationship_boost": relationship_boost,
                        "continuity_boost": continuity_boost,
                        "repetition_penalty": repetition_penalty,
                        "deterministic_jitter": jitter,
                        "recent_event_ids": [
                            event["event_id"] for event in recent_events[:3]
                        ],
                    },
                )
            )
        if not candidates:
            return None
        score, template, context = max(
            candidates, key=lambda item: (item[0], item[1].intention_id)
        )
        selected_target = target if template.target_mode == "relationship" else None
        target_name = selected_target["display_name"] if selected_target else "朋友"
        values = {
            "actor": actor["display_name"],
            "interest": interest,
            "target": target_name,
        }
        decision_key = (
            f"npc-intention:{owner_user_id}:{actor['actor_id']}:"
            f"{local_date}:{NPC_INTENTION_VERSION}"
        )
        intention_instance_id = hashlib.sha256(
            decision_key.encode("utf-8")
        ).hexdigest()[:32]
        earliest = current + timedelta(hours=INTENTION_DELAY_HOURS)
        deadline = current + timedelta(hours=INTENTION_DEADLINE_HOURS)
        return {
            "intention_instance_id": intention_instance_id,
            "template_id": template.intention_id,
            "driver": template.driver,
            "summary": template.summary_template.format(**values),
            "motivation": template.motivation_template.format(**values),
            "target_actor_id": (
                selected_target["actor_id"] if selected_target else None
            ),
            "score": score,
            "source_state_version": int(state["state_version"]),
            "decision_context": {
                **context,
                "candidate_scores": {
                    item_template.intention_id: item_score
                    for item_score, item_template, _ in candidates
                },
                "simulator_version": NPC_INTENTION_VERSION,
            },
            "action": self._action(template, values, target_name),
            "formed_at": current.isoformat(),
            "earliest_at": earliest.isoformat(),
            "deadline_at": deadline.isoformat(),
            "decision_key": decision_key,
        }

    def _complete(
        self,
        owner_user_id: str,
        actor: dict[str, Any],
        intention: dict[str, Any],
        current: datetime,
    ) -> tuple[Optional[dict[str, Any]], bool]:
        action = intention["action"]
        event_key = f"npc-intention-action:{intention['intention_instance_id']}"
        event_id = hashlib.sha256(event_key.encode("utf-8")).hexdigest()[:32]
        start_at = max(
            parse_datetime(intention["earliest_at"]), current - timedelta(hours=1)
        )
        event = {
            "event_id": event_id,
            "event_type": action["event_type"],
            "start_at": start_at.isoformat(),
            "end_at": current.isoformat(),
            "location_id": action["location_id"],
            "summary": action["summary"],
            "facts": {
                "source_kind": "npc_intention",
                "intention_instance_id": intention["intention_instance_id"],
                "template_id": intention["template_id"],
                "driver": intention["driver"],
                "simulator_version": NPC_INTENTION_VERSION,
            },
            "importance": action["importance"],
            "mentionability": action["mentionability"],
            "publicability": action["publicability"],
            "interpretation": action["interpretation"],
            "disclosure_level": (
                "public" if int(action["publicability"]) >= 50 else "familiar"
            ),
            "state_delta": action.get("state_delta", {}),
            "relationship_delta": action.get("relationship_delta", {}),
            "target_display_name": action.get("target_display_name", ""),
            "idempotency_key": event_key,
        }
        return self.store.complete_actor_intention(
            owner_user_id,
            actor["actor_id"],
            intention["intention_instance_id"],
            event=event,
            now=current,
        )

    @staticmethod
    def _action(
        template: IntentionTemplateDefinition,
        values: dict[str, str],
        target_name: str,
    ) -> dict[str, Any]:
        return {
            "event_type": template.event_type,
            "location_id": template.location_id,
            "summary": template.event_summary_template.format(**values),
            "interpretation": template.interpretation_template.format(**values),
            "importance": template.importance,
            "mentionability": template.mentionability,
            "publicability": template.publicability,
            "state_delta": dict(template.state_delta),
            "relationship_delta": dict(template.relationship_delta),
            "target_display_name": target_name,
        }

    def _relationship_target(
        self, owner_user_id: str, actor_id: str
    ) -> Optional[dict[str, Any]]:
        relationships = self.store.list_relationships(
            owner_user_id, actor_id, limit=20
        )
        candidates = []
        for relationship in relationships:
            other_id = self.characters.canonical_actor_id(
                relationship["other_ai_id"]
            )
            if other_id == actor_id:
                continue
            score = (
                int(relationship["familiarity"])
                + int(relationship["affinity"]) * 2
                + int(relationship["trust"]) * 2
                - int(relationship["tension"])
            )
            candidates.append(
                {
                    "actor_id": other_id,
                    "display_name": self.characters.display_name(
                        owner_user_id, other_id
                    ),
                    "relationship_score": score,
                }
            )
        if not candidates:
            contacts = [
                item
                for item in self.characters.list_contacts(owner_user_id)
                if item["actor_id"] != actor_id
            ]
            if not contacts:
                return None
            contact = min(contacts, key=lambda item: item["actor_id"])
            return {
                "actor_id": contact["actor_id"],
                "display_name": contact["display_name"],
                "relationship_score": 0,
            }
        return max(
            candidates,
            key=lambda item: (item["relationship_score"], item["actor_id"]),
        )

    def _interest(
        self, owner_user_id: str, actor: dict[str, Any], local_date: str
    ) -> str:
        interests = actor.get("interests") or ["最近在意的事情"]
        index = self._seed(
            owner_user_id, actor["actor_id"], local_date, "interest"
        ) % len(interests)
        return str(interests[index])

    @staticmethod
    def _continuity_boost(
        template: IntentionTemplateDefinition,
        recent_events: list[dict[str, Any]],
    ) -> int:
        driver_terms = {
            "recovery": {"work", "project", "cycling", "research", "repair"},
            "regulation": {"work", "focused", "repair", "errand"},
            "connection": {"social", "chat", "group", "meal"},
            "growth": {"project", "creative", "research", "practice", "repair"},
            "exploration": {"walk", "city", "photo", "visit", "cycling"},
        }
        terms = driver_terms.get(template.driver, set())
        matches = sum(
            1
            for event in recent_events
            if any(term in str(event.get("event_type", "")) for term in terms)
        )
        return min(12, matches * 4)

    @staticmethod
    def _seed(*parts: Any) -> int:
        raw = ":".join(str(part) for part in parts).encode("utf-8")
        return int.from_bytes(hashlib.sha256(raw).digest()[:8], "big")


__all__ = ["NpcIntentionService", "NpcIntentionSettlementReport"]
