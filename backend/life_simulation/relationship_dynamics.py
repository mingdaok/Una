"""Relationship tiers and deterministic interaction policy."""

from __future__ import annotations

import hashlib
from typing import Any, Optional

from .character_registry import CharacterRegistry, InteractionTemplateDefinition
from .clock import parse_datetime
from .store import LifeStore


class RelationshipDynamics:
    def __init__(self, store: LifeStore, characters: CharacterRegistry):
        self.store = store
        self.characters = characters
        self.policy = characters.catalog.relationship_policy

    def describe(self, relationship: dict[str, Any]) -> dict[str, Any]:
        closeness = self.closeness(relationship)
        strained_at = int(self.policy.get("tension_strained_threshold", 45))
        if int(relationship.get("tension", 0)) >= strained_at:
            tier = "strained"
            disclosure = "familiar"
        else:
            selected = self.policy["tiers"][0]
            for candidate in self.policy["tiers"]:
                if closeness >= int(candidate["min_closeness"]):
                    selected = candidate
            tier = str(selected["key"])
            disclosure = str(selected.get("disclosure_level", "public"))
        return {
            **relationship,
            "closeness_score": closeness,
            "relationship_tier": tier,
            "disclosure_level": disclosure,
        }

    @staticmethod
    def closeness(relationship: dict[str, Any]) -> int:
        value = (
            int(relationship.get("familiarity", 0)) * 0.25
            + int(relationship.get("affinity", 0)) * 0.35
            + int(relationship.get("trust", 0)) * 0.40
            - int(relationship.get("tension", 0)) * 0.30
        )
        return max(0, min(100, int(round(value))))

    def aggregate(
        self, owner_user_id: str, actor_a: str, actor_b: str
    ) -> dict[str, int]:
        first = self._direction(owner_user_id, actor_a, actor_b)
        second = self._direction(owner_user_id, actor_b, actor_a)
        return {
            key: int(round((int(first.get(key, 0)) + int(second.get(key, 0))) / 2))
            for key in (
                "familiarity", "affinity", "trust", "tension", "obligation"
            )
        }

    def pair_priority(
        self, owner_user_id: str, actor_a: str, actor_b: str, ordinal: int
    ) -> int:
        relation = self.aggregate(owner_user_id, actor_a, actor_b)
        closeness = self.closeness(relation)
        jitter = self._seed(owner_user_id, actor_a, actor_b, ordinal, "pair") % 21
        recency_penalty = self._recent_pair_penalty(
            owner_user_id, actor_a, actor_b, ordinal
        )
        return int(
            20
            + closeness * 0.8
            + min(40, relation["tension"]) * 0.2
            + jitter
            - recency_penalty
        )

    def interaction_kind(
        self, owner_user_id: str, actor_a: str, actor_b: str, ordinal: int
    ) -> str:
        relation = self.aggregate(owner_user_id, actor_a, actor_b)
        last_kind = self._last_interaction_kind(owner_user_id, actor_a, actor_b)
        if (
            last_kind == "conflict"
            and relation["tension"]
            >= int(self.policy.get("repair_trigger_tension", 24))
            and relation["trust"] >= int(self.policy.get("repair_min_trust", 18))
        ):
            return "repair"
        if relation["tension"] >= int(
            self.policy.get("conflict_trigger_tension", 38)
        ):
            roll = self._seed(
                owner_user_id, actor_a, actor_b, ordinal, "conflict"
            ) % 100
            if roll < int(self.policy.get("conflict_probability_percent", 32)):
                return "conflict"
        return "supportive"

    def eligible_templates(
        self,
        owner_user_id: str,
        actor_a: str,
        actor_b: str,
        kind: str,
    ) -> tuple[InteractionTemplateDefinition, ...]:
        relation = self.aggregate(owner_user_id, actor_a, actor_b)
        return tuple(
            item
            for item in self.characters.catalog.interaction_templates
            if item.interaction_kind == kind
            and relation["tension"] >= item.min_tension
            and relation["trust"] >= item.min_trust
        )

    def _direction(
        self, owner_user_id: str, actor_id: str, other_id: str
    ) -> dict[str, Any]:
        return next(
            (
                item
                for item in self.store.list_relationships(
                    owner_user_id, actor_id, limit=50
                )
                if item["other_ai_id"] == other_id
            ),
            {},
        )

    def _last_interaction_kind(
        self, owner_user_id: str, actor_a: str, actor_b: str
    ) -> Optional[str]:
        events = self.store.list_interaction_events(
            owner_user_id, actor_id=actor_a, limit=30
        )
        template_by_id = {
            item.interaction_id: item
            for item in self.characters.catalog.interaction_templates
        }
        for event in events:
            participants = {item["actor_id"] for item in event.get("participants", [])}
            if actor_b not in participants:
                continue
            template_id = event.get("facts", {}).get("interaction_template")
            template = template_by_id.get(template_id)
            return template.interaction_kind if template else None
        return None

    def _recent_pair_penalty(
        self, owner_user_id: str, actor_a: str, actor_b: str, ordinal: int
    ) -> int:
        events = self.store.list_interaction_events(
            owner_user_id, actor_id=actor_a, limit=30
        )
        for event in events:
            if event.get("facts", {}).get("source_kind") != "npc_schedule_overlap":
                continue
            participants = {item["actor_id"] for item in event.get("participants", [])}
            if actor_b not in participants:
                continue
            days_ago = max(0, ordinal - parse_datetime(event["end_at"]).date().toordinal())
            if days_ago == 0:
                continue
            if days_ago <= 3:
                return 70
            if days_ago <= 6:
                return 35
            return 0
        return 0

    @staticmethod
    def _seed(*parts: Any) -> int:
        raw = ":".join(str(part) for part in parts).encode("utf-8")
        return int.from_bytes(hashlib.sha256(raw).digest()[:8], "big")


__all__ = ["RelationshipDynamics"]
