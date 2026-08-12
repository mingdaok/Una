"""Translate due intentions into bounded life events without letting them command the world."""

from __future__ import annotations

from datetime import datetime
from typing import Optional, TYPE_CHECKING

from .clock import parse_datetime
from .models import IntentionDirective, LifeEventDraft, LifeWindow, SimulationResult
from .store import DEFAULT_AI_ID, LifeStore

if TYPE_CHECKING:
    from .character_registry import CharacterRegistry


class IntentionExecutor:
    """Select at most one due intention for a simulation window."""

    def __init__(
        self, store: LifeStore, characters: Optional["CharacterRegistry"] = None
    ):
        self.store = store
        self.characters = characters

    def plan(
        self,
        owner_user_id: str,
        ai_id: str,
        state: dict,
        window: LifeWindow,
    ) -> Optional[IntentionDirective]:
        self.store.expire_due_intentions(
            owner_user_id, ai_id, now=parse_datetime(window.end_at)
        )
        intentions = self.store.list_intentions(
            owner_user_id,
            ai_id,
            statuses=("active", "deferred"),
            limit=20,
        )
        for intention in intentions:
            earliest_at = intention.get("earliest_at")
            if earliest_at and parse_datetime(earliest_at) > window.end_at:
                continue
            directive = self._directive_for(
                owner_user_id, ai_id, state, window, intention
            )
            if directive is not None:
                return directive
        return None

    def apply(
        self,
        directive: Optional[IntentionDirective],
        result: SimulationResult,
        window: LifeWindow,
    ) -> SimulationResult:
        if directive is None:
            return result

        next_state = dict(result.state)
        next_state["current_location"] = directive.location_id
        next_state["current_activity"] = directive.event_type
        if directive.event_type == "friend_chat":
            next_state["energy"] = self._bounded(next_state.get("energy", 70) - 8)
            next_state["stress"] = self._bounded(next_state.get("stress", 25) - 8)
            next_state["social_need"] = self._bounded(
                next_state.get("social_need", 25) - 28
            )
        else:
            next_state["stress"] = self._bounded(next_state.get("stress", 25) - 5)
            next_state["solitude_need"] = self._bounded(
                next_state.get("solitude_need", 20) - 16
            )
        next_state["active_goals"] = [
            goal
            for goal in next_state.get("active_goals", [])
            if not (
                isinstance(goal, dict)
                and goal.get("intention_id") == directive.intention_id
            )
        ]
        participants = (
            [directive.participant_ai_id] if directive.participant_ai_id else []
        )
        facts = {
            "window": window.key,
            "window_label": window.label,
            "life_intention_id": directive.intention_id,
            "intention_outcome": directive.outcome,
            "intention_resolution_reason": directive.resolution_reason,
            **directive.facts,
        }
        if directive.participant_ai_id:
            facts["requested_participant_ai_id"] = directive.participant_ai_id
            facts["requested_participant_display_name"] = (
                directive.participant_display_name or "朋友"
            )
        event = LifeEventDraft(
            event_type=directive.event_type,
            status="completed",
            start_at=window.start_at,
            end_at=window.end_at,
            location_id=directive.location_id,
            summary=directive.event_summary,
            facts=facts,
            importance=directive.importance,
            mentionability=directive.mentionability,
            publicability=directive.publicability,
            follow_up_required=True,
            participant_ids=participants,
            interpretation=directive.interpretation,
            private_thought="这是我听过建议后，按照自己的节奏作出的决定。",
            disclosure_level="familiar",
        )
        return SimulationResult(event=event, state=next_state)

    def _directive_for(
        self,
        owner_user_id: str,
        ai_id: str,
        state: dict,
        window: LifeWindow,
        intention: dict,
    ) -> Optional[IntentionDirective]:
        effect = intention.get("effect", {})
        conditions = intention.get("conditions", {})
        allowed_windows = conditions.get("windows")
        if allowed_windows and window.key not in allowed_windows:
            return None

        relationship_id = effect.get("relationship")
        if relationship_id and int(effect.get("openness", 0)) > 0:
            if window.key != "evening":
                return None
            if self.characters is not None:
                relationship_id = self.characters.canonical_actor_id(relationship_id)
                name = self.characters.display_name(owner_user_id, relationship_id)
            else:
                name = effect.get("relationship_display_name") or "朋友"
            if int(state.get("energy", 70)) <= 18 or int(state.get("stress", 25)) >= 85:
                return IntentionDirective(
                    intention_id=intention["intention_id"],
                    intention_type=intention["intention_type"],
                    summary=intention["summary"],
                    outcome="abandoned",
                    resolution_reason="wellbeing_overrode_plan",
                    event_type="reflection",
                    location_id="home",
                    event_summary=f"原本想回应{name}的邀请，最后还是决定先照顾好自己。",
                    interpretation="她认真考虑过这份建议，但当下的精力让她选择放弃这次安排。",
                    importance=46,
                    mentionability=68,
                    publicability=6,
                )
            return IntentionDirective(
                intention_id=intention["intention_id"],
                intention_type=intention["intention_type"],
                summary=intention["summary"],
                outcome="fulfilled",
                resolution_reason="invitation_answered_when_ready",
                event_type="friend_chat",
                location_id="old_town",
                event_summary=f"和{name}一起去了旧城区的新展，回来后又聊了很久。",
                interpretation="她没有把建议当成命令，而是在自己也愿意的时候回应了这个约定。",
                importance=62,
                mentionability=82,
                publicability=36,
                participant_ai_id=relationship_id,
                participant_display_name=name,
            )

        if int(effect.get("social_openness", 0)) > 0:
            if window.key != "evening":
                return None
            relationship = self._preferred_relationship(owner_user_id, ai_id)
            name = relationship.get("display_name", "朋友") if relationship else "朋友"
            participant_id = relationship.get("other_ai_id") if relationship else None
            return IntentionDirective(
                intention_id=intention["intention_id"],
                intention_type=intention["intention_type"],
                summary=intention["summary"],
                outcome="fulfilled",
                resolution_reason="work_shared_when_ready",
                event_type="friend_chat",
                location_id="studio",
                event_summary=f"把完成的作品给{name}看了看，也认真听了对方的感受。",
                interpretation="她最终选择分享，不是为了得到评价，而是觉得这份完成值得和信任的人一起看见。",
                importance=64,
                mentionability=84,
                publicability=28,
                participant_ai_id=participant_id,
                participant_display_name=name,
                facts={"shared_completed_work": True},
            )

        if int(effect.get("solitude_preference", 0)) > 0:
            if window.key != "late_night":
                return None
            return IntentionDirective(
                intention_id=intention["intention_id"],
                intention_type=intention["intention_type"],
                summary=intention["summary"],
                outcome="fulfilled",
                resolution_reason="personal_pace_honored",
                event_type="reflection",
                location_id="home",
                event_summary="睡前认真想了想，决定先给自己留一点时间，不急着回应外界的期待。",
                interpretation="慢一点不是回避，而是让决定真正符合她自己的节奏。",
                importance=44,
                mentionability=66,
                publicability=8,
            )

        if int(effect.get("autonomy", 0)) > 0:
            if window.key != "late_night":
                return None
            return IntentionDirective(
                intention_id=intention["intention_id"],
                intention_type=intention["intention_type"],
                summary=intention["summary"],
                outcome="fulfilled",
                resolution_reason="independent_decision_preserved",
                event_type="reflection",
                location_id="home",
                event_summary="安静想过之后，她把别人的意见放在心里，也留下了属于自己的答案。",
                interpretation="被尊重让她更愿意认真面对这件事，而不是仓促给出结果。",
                importance=42,
                mentionability=62,
                publicability=6,
            )
        return None

    def _preferred_relationship(
        self, owner_user_id: str, ai_id: str
    ) -> Optional[dict]:
        relationships = self.store.list_relationships(owner_user_id, ai_id, limit=10)
        if not relationships:
            return None
        relationship = dict(relationships[0])
        if self.characters is not None:
            relationship["other_ai_id"] = self.characters.canonical_actor_id(
                relationship["other_ai_id"]
            )
            relationship["display_name"] = self.characters.display_name(
                owner_user_id, relationship["other_ai_id"]
            )
        return relationship

    @staticmethod
    def _bounded(value: int) -> int:
        return max(0, min(100, int(value)))


__all__ = ["IntentionExecutor"]
