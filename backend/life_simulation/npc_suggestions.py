"""User suggestions evaluated through NPC agency instead of direct commands."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Optional

from .character_registry import CharacterRegistry, IntentionTemplateDefinition
from .clock import parse_datetime, utc_now
from .npc_intentions import NpcIntentionService
from .store import DEFAULT_AI_ID, LifeStore


SUGGESTION_RULES_VERSION = "npc-suggestion-rules-v1"


@dataclass
class NpcSuggestionSettlementReport:
    reconsidered: int = 0
    converted: int = 0
    declined: int = 0
    skipped: int = 0
    suggestions: list[dict[str, Any]] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "reconsidered": self.reconsidered,
            "converted": self.converted,
            "declined": self.declined,
            "skipped": self.skipped,
            "suggestions": list(self.suggestions),
        }


class NpcSuggestionService:
    def __init__(
        self,
        store: LifeStore,
        characters: CharacterRegistry,
        intentions: NpcIntentionService,
    ):
        self.store = store
        self.characters = characters
        self.intentions = intentions

    def submit(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        suggestion_type: str,
        request_id: str,
        message: str = "",
        target_actor_id: Optional[str] = None,
        timezone_name: str = "Asia/Shanghai",
        now: Optional[datetime] = None,
    ) -> dict[str, Any]:
        current = parse_datetime(now or utc_now())
        canonical_id = self.characters.canonical_actor_id(actor_id)
        actor = self.characters.get_actor(owner_user_id, canonical_id)
        if not actor or actor.get("actor_role") != "friend" or actor.get("status") != "active":
            raise KeyError("NPC 不存在或未启用")
        template = self._template(suggestion_type)
        target_id = self._validate_target(
            owner_user_id, canonical_id, template, target_actor_id
        )
        stable_key = (
            f"npc-suggestion:{owner_user_id}:{canonical_id}:{request_id}:"
            f"{SUGGESTION_RULES_VERSION}"
        )
        suggestion_id = hashlib.sha256(stable_key.encode("utf-8")).hexdigest()[:32]
        active = self.store.list_actor_intentions(
            owner_user_id, canonical_id, status="active", limit=1
        )
        if active:
            outcome = "deferred"
            reason = "existing_plan_has_priority"
            response = "我听见了，不过手上已经有一个打算。我想先按自己的节奏完成，再回来考虑这件事。"
            evaluation = {"active_intention_id": active[0]["intention_instance_id"]}
        else:
            outcome, reason, response, evaluation = self._evaluate(
                owner_user_id, actor, template, current
            )
        suggestion, created = self.store.create_actor_suggestion(
            owner_user_id,
            canonical_id,
            suggestion={
                "suggestion_id": suggestion_id,
                "suggestion_type": suggestion_type,
                "message": message.strip()[:500],
                "target_actor_id": target_id,
                "status": outcome,
                "decision_reason_code": reason,
                "response_text": response,
                "evaluation": {
                    **evaluation,
                    "rules_version": SUGGESTION_RULES_VERSION,
                },
                "reevaluate_after": (
                    (current + timedelta(hours=24)).isoformat()
                    if outcome == "deferred"
                    else None
                ),
                "idempotency_key": stable_key,
            },
            now=current,
        )
        if not created or outcome not in {"accepted", "adjusted"}:
            return suggestion
        intention, intention_created = self.intentions.form_from_suggestion(
            owner_user_id,
            actor,
            template,
            suggestion_id,
            target_actor_id=target_id,
            adjusted=outcome == "adjusted",
            timezone_name=timezone_name,
            now=current,
        )
        if not intention_created:
            return self.store.link_actor_suggestion(
                owner_user_id,
                suggestion_id,
                status="deferred",
                reason_code="concurrent_plan_has_priority",
                response_text="我会先完成已经形成的计划，再回来考虑你的建议。",
                linked_intention_id=None,
                now=current,
            )
        return self.store.link_actor_suggestion(
            owner_user_id,
            suggestion_id,
            status=outcome,
            reason_code=reason,
            response_text=response,
            linked_intention_id=intention["intention_instance_id"],
            now=current,
        )

    def reconsider_due(
        self,
        owner_user_id: str,
        timezone_name: str,
        *,
        now: Optional[datetime] = None,
    ) -> NpcSuggestionSettlementReport:
        current = parse_datetime(now or utc_now())
        report = NpcSuggestionSettlementReport()
        profiles = self.store.list_actor_profiles(
            owner_user_id, actor_role="friend", status="active"
        )
        for profile in profiles:
            actor_id = profile["actor_id"]
            deferred = self.store.list_actor_suggestions(
                owner_user_id, actor_id, status="deferred", limit=20
            )
            for suggestion in reversed(deferred):
                due = suggestion.get("reevaluate_after")
                if not due or parse_datetime(due) > current:
                    continue
                if self.store.list_actor_intentions(
                    owner_user_id, actor_id, status="active", limit=1
                ):
                    report.skipped += 1
                    continue
                actor = self.characters.get_actor(owner_user_id, actor_id)
                if actor is None:
                    report.skipped += 1
                    continue
                template = self._template(suggestion["suggestion_type"])
                outcome, reason, response, _ = self._evaluate(
                    owner_user_id, actor, template, current
                )
                report.reconsidered += 1
                if outcome in {"accepted", "adjusted"}:
                    intention, created = self.intentions.form_from_suggestion(
                        owner_user_id,
                        actor,
                        template,
                        suggestion["suggestion_id"],
                        target_actor_id=suggestion.get("target_actor_id"),
                        adjusted=outcome == "adjusted",
                        timezone_name=timezone_name,
                        now=current,
                    )
                    if not created:
                        report.skipped += 1
                        continue
                    report.converted += 1
                    linked_id = intention["intention_instance_id"]
                else:
                    report.declined += 1
                    linked_id = None
                updated = self.store.link_actor_suggestion(
                    owner_user_id,
                    suggestion["suggestion_id"],
                    status=outcome,
                    reason_code=reason,
                    response_text=response,
                    linked_intention_id=linked_id,
                    now=current,
                )
                if updated:
                    report.suggestions.append(updated)
        return report

    def _evaluate(
        self,
        owner_user_id: str,
        actor: dict[str, Any],
        template: IntentionTemplateDefinition,
        current: datetime,
    ) -> tuple[str, str, str, dict[str, Any]]:
        state = self.store.get_actor_state(owner_user_id, actor["actor_id"])
        if state is None:
            raise KeyError("NPC 状态不存在")
        metric = int(state[template.state_metric])
        aligned = (
            metric >= template.threshold
            if template.state_direction == "high"
            else metric <= template.threshold
        )
        personality = float(
            actor.get("personality", {}).get(template.personality_key, 0.5)
        )
        relationship = next(
            (
                item
                for item in self.store.list_relationships(
                    owner_user_id, actor["actor_id"], limit=20
                )
                if item["other_ai_id"] == DEFAULT_AI_ID
            ),
            None,
        )
        relation_score = 0
        if relationship:
            relation_score = min(
                25,
                int(relationship["familiarity"]) // 4
                + int(relationship["affinity"]) // 5
                + int(relationship["trust"]) // 4,
            )
        autonomy_cost = int(
            float(actor.get("personality", {}).get("independence", 0.6)) * 20
        )
        jitter = self._seed(
            owner_user_id, actor["actor_id"], template.intention_id,
            current.date().isoformat(), SUGGESTION_RULES_VERSION,
        ) % 9
        score = int(
            34 + personality * 25 + (20 if aligned else -12)
            + relation_score - autonomy_cost + jitter
        )
        evaluation = {
            "score": score,
            "state_metric": template.state_metric,
            "state_value": metric,
            "state_aligned": aligned,
            "personality_key": template.personality_key,
            "personality_value": personality,
            "relationship_score": relation_score,
            "autonomy_cost": autonomy_cost,
            "deterministic_jitter": jitter,
        }
        if score >= 58:
            return (
                "accepted", "suggestion_matches_current_needs",
                "这个建议和我现在的状态挺合拍，我愿意把它变成自己的计划。",
                evaluation,
            )
        if score >= 40:
            return (
                "adjusted", "suggestion_adopted_with_personal_pace",
                "方向我愿意试试，不过会换成更适合我的节奏和做法。",
                evaluation,
            )
        return (
            "declined", "suggestion_conflicts_with_current_needs",
            "谢谢你想到我，但这件事现在不太适合我，我想保留自己的安排。",
            evaluation,
        )

    def _template(self, suggestion_type: str) -> IntentionTemplateDefinition:
        matches = [
            item
            for item in self.characters.catalog.intention_templates
            if item.suggestion_type == suggestion_type
        ]
        if len(matches) != 1:
            raise ValueError("不支持的建议类型")
        return matches[0]

    def _validate_target(
        self,
        owner_user_id: str,
        actor_id: str,
        template: IntentionTemplateDefinition,
        target_actor_id: Optional[str],
    ) -> Optional[str]:
        if template.target_mode != "relationship":
            if target_actor_id:
                raise ValueError("该建议类型不接受目标人物")
            return None
        target_id = self.characters.canonical_actor_id(
            target_actor_id or DEFAULT_AI_ID
        )
        if target_id == actor_id:
            raise ValueError("不能建议人物联系自己")
        target = self.characters.get_actor(owner_user_id, target_id)
        if target is None or target.get("status") != "active":
            raise ValueError("建议的目标人物不存在或未启用")
        return target_id

    @staticmethod
    def _seed(*parts: Any) -> int:
        raw = ":".join(str(part) for part in parts).encode("utf-8")
        return int.from_bytes(hashlib.sha256(raw).digest()[:8], "big")


__all__ = ["NpcSuggestionService", "NpcSuggestionSettlementReport"]
