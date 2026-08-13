"""Deterministic completion, interruption, and failure outcomes for NPC actions."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Any

from .models import LifeWindow


@dataclass(frozen=True)
class ActionOutcome:
    status: str
    reason_code: str
    goal_progress_delta: float
    state_effect_scale: float
    summary_note: str


class OutcomeResolver:
    def __init__(self, *, engine_version: str):
        self.engine_version = engine_version

    def resolve(
        self, owner_user_id: str, actor_id: str, plan: dict[str, Any],
        state: dict[str, Any], window: LifeWindow,
        recent_events: tuple[dict[str, Any], ...] = (),
    ) -> ActionOutcome:
        action_type = str(plan.get("action_type") or plan.get("event_type") or "")
        energy = int(state.get("energy", 70))
        focus = int(state.get("focus", 55))
        stress = int(state.get("stress", 25))
        recovery_actions = {"sleep", "rest", "meal", "reflection"}
        focus_actions = {"focus_project", "focused_work", "personal_project"}
        challenge_actions = {
            *focus_actions, "repair_project", "cooking_practice", "research",
            "explore", "city_exploration", "social_cycling",
        }
        if action_type in recovery_actions:
            status = "completed"
            reason = "recovery_action_completed"
        elif action_type == "social_invitation":
            status = "completed"
            reason = "accepted_commitment_completed"
        elif energy <= 18 or stress >= 85:
            status = "interrupted"
            reason = "wellbeing_limit"
        elif action_type in focus_actions and focus <= 22:
            status = "failed"
            reason = "focus_insufficient"
        elif action_type not in challenge_actions or self._recent_setback(recent_events):
            status = "completed"
            reason = "completed_as_selected"
        else:
            digest = hashlib.sha256(
                (
                    f"{owner_user_id}:{actor_id}:{window.start_at.isoformat()}:"
                    f"{state.get('state_version', 0)}:{plan.get('candidate_id')}:"
                    f"{self.engine_version}"
                ).encode("utf-8")
            ).digest()
            roll = int.from_bytes(digest[:2], "big") % 100
            failure_threshold = max(2, min(8, 3 + stress // 25 - energy // 35))
            if roll < failure_threshold:
                status, reason = "failed", "controlled_attempt_failed"
            else:
                status, reason = "completed", "completed_as_selected"
        progress = 0.0
        if status == "completed" and plan.get("goal_id"):
            duration = max(20, int(plan.get("duration_minutes", 60)))
            progress = round(min(0.18, 0.025 + duration / 1200 + focus / 2000), 3)
        effect_scale = {"completed": 1.0, "interrupted": 0.45, "failed": 0.2}[status]
        return ActionOutcome(
            status=status, reason_code=reason, goal_progress_delta=progress,
            state_effect_scale=effect_scale,
            summary_note=self._summary_note(action_type, status, reason),
        )

    @staticmethod
    def _recent_setback(recent_events: tuple[dict[str, Any], ...]) -> bool:
        return any(
            event.get("status") in {"failed", "interrupted"}
            for event in recent_events[:4]
        )

    @staticmethod
    def _summary_note(action_type: str, status: str, reason: str) -> str:
        if status == "completed":
            return ""
        if status == "interrupted":
            if action_type in {"explore", "city_exploration", "social_cycling"}:
                return "体力有些跟不上，便提前结束了这次外出。"
            if action_type in {"connect", "social_invitation"}:
                return "当时的状态不太适合继续交流，便先礼貌收了尾。"
            return "状态渐渐跟不上，便把这件事停在了合适的位置。"
        if reason == "focus_insufficient" or action_type in {
            "focus_project", "focused_work", "personal_project",
        }:
            return "推进时遇到卡点，这次只留下了待整理的草稿。"
        if action_type in {"explore", "city_exploration"}:
            return "这趟没有找到预期的新线索，不过记下了下次可以换的方向。"
        return "实际进展不多，便把未完成的部分留到之后再处理。"


__all__ = ["ActionOutcome", "OutcomeResolver"]
