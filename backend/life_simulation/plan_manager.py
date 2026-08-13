"""Persistent goals, commitments, and plan-change records for NPC agency v2."""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta
from typing import Any, Iterable

from .clock import parse_datetime
from .store import LifeStore


ANCHOR_WINDOWS = {"night", "late_night"}


class PlanManager:
    def __init__(self, store: LifeStore, characters: Any):
        self.store = store
        self.characters = characters

    def ensure_actor_goal(
        self, owner_user_id: str, actor: dict[str, Any], *, now: datetime
    ) -> dict[str, Any]:
        interest = (actor.get("interests") or ["自己的兴趣"])[0]
        origin_ref = f"starter:{actor['actor_id']}:{interest}"
        goal_id = self._id(owner_user_id, actor["actor_id"], origin_ref, "goal")
        return self.store.ensure_actor_goal(
            owner_user_id,
            actor["actor_id"],
            goal={
                "goal_id": goal_id,
                "goal_type": "creative",
                "title": f"持续推进与{interest}有关的小项目",
                "priority": 58,
                "progress": 0,
                "status": "active",
                "origin": "self_generated",
                "origin_ref_id": origin_ref,
                "next_review_at": (now + timedelta(days=3)).isoformat(),
                "abandon_conditions": ["low_interest_for_14_days"],
                "metadata": {"interest": interest},
            },
            now=now,
        )

    def adopt_suggestion(
        self,
        owner_user_id: str,
        actor_id: str,
        suggestion: dict[str, Any],
        *,
        now: datetime,
    ) -> dict[str, Any] | None:
        if suggestion.get("status") not in {"accepted", "adjusted"}:
            return None
        title = suggestion.get("message") or suggestion.get("response_text") or "考虑用户的建议"
        goal_id = self._id(owner_user_id, actor_id, suggestion["suggestion_id"], "goal")
        return self.store.ensure_actor_goal(
            owner_user_id,
            actor_id,
            goal={
                "goal_id": goal_id,
                "goal_type": self._suggestion_goal_type(suggestion["suggestion_type"]),
                "title": title[:160],
                "priority": 56 if suggestion["status"] == "accepted" else 48,
                "progress": 0,
                "status": "active" if suggestion["status"] == "accepted" else "candidate",
                "origin": "user_suggestion",
                "origin_ref_id": suggestion["suggestion_id"],
                "next_review_at": (now + timedelta(days=2)).isoformat(),
                "abandon_conditions": ["low_interest_for_14_days"],
                "metadata": {
                    "suggestion_type": suggestion["suggestion_type"],
                    "linked_intention_id": suggestion.get("linked_intention_id"),
                },
            },
            now=now,
        )

    def materialize_schedule_plans(
        self,
        owner_user_id: str,
        actor: dict[str, Any],
        schedules: Iterable[dict[str, Any]],
        *,
        now: datetime,
    ) -> list[dict[str, Any]]:
        active_goals = self.store.list_actor_goals(
            owner_user_id, actor["actor_id"], status="active", limit=10
        )
        primary_goal = active_goals[0] if active_goals else None
        plans = []
        for schedule in schedules:
            plan_type = "anchor" if schedule["window_key"] in ANCHOR_WINDOWS else "flexible"
            commitment = None
            if plan_type == "anchor":
                commitment = self._ensure_anchor_commitment(
                    owner_user_id, actor, schedule, now=now
                )
            original = {
                "activity_id": schedule["activity_id"],
                "action_type": schedule["event_type"],
                "location_id": schedule["location_id"],
                "summary": schedule["summary"],
            }
            plan_id = self._id(owner_user_id, actor["actor_id"], schedule["starts_at"], plan_type)
            plans.append(
                self.store.ensure_actor_plan(
                    owner_user_id,
                    actor["actor_id"],
                    plan={
                        "plan_id": plan_id,
                        "schedule_id": schedule["schedule_id"],
                        "commitment_id": commitment["commitment_id"] if commitment else None,
                        "goal_id": primary_goal["goal_id"] if primary_goal and plan_type == "flexible" else None,
                        "plan_type": plan_type,
                        "starts_at": schedule["starts_at"],
                        "ends_at": schedule["ends_at"],
                        "original_action": original,
                    },
                    now=now,
                )
            )
        return plans

    def plan_for_schedule(
        self, owner_user_id: str, actor_id: str, schedule_id: str
    ) -> dict[str, Any] | None:
        return next(
            (
                plan for plan in self.store.list_actor_plans(owner_user_id, actor_id, limit=200)
                if plan.get("schedule_id") == schedule_id
            ),
            None,
        )

    @staticmethod
    def describe_change(
        *, original_action: str, actual_action: str, state: dict[str, Any],
        plan_type: str | None = None,
    ) -> dict[str, Any]:
        if plan_type == "flexible":
            return {
                "reason_code": "flexible_choice",
                "public_reason": "在弹性时间里根据当时状态选择了这项活动。",
                "private_reason": "弹性时段本来就没有锁定具体活动。",
                "confidence": 0.98,
                "append_to_summary": False,
            }
        if original_action == actual_action:
            return {
                "reason_code": "as_planned",
                "public_reason": "按原来的安排完成了这段时间。",
                "private_reason": "当时没有更强的理由改变计划。",
                "confidence": 0.95,
                "append_to_summary": False,
            }
        if int(state.get("energy", 70)) <= 30:
            return {
                "reason_code": "energy_low",
                "public_reason": "精神不太够，所以临时把安排放轻了一些。",
                "private_reason": "不想为了完成计划勉强消耗自己。",
                "confidence": 0.88,
                "append_to_summary": True,
            }
        if int(state.get("stress", 25)) >= 65:
            return {
                "reason_code": "stress_high",
                "public_reason": "状态有些紧绷，临时换成了更容易承受的安排。",
                "private_reason": "当时不想继续面对需要高度投入的事情。",
                "confidence": 0.82,
                "append_to_summary": True,
            }
        return {
            "reason_code": "preference_changed",
            "public_reason": "临时更想做另一件事，于是调整了原来的安排。",
            "private_reason": "这次更愿意顺着当下真实的兴趣走。",
            "confidence": 0.72,
            "append_to_summary": True,
        }

    @staticmethod
    def client_plan(plan: dict[str, Any]) -> dict[str, Any]:
        safe = {
            key: plan.get(key)
            for key in (
                "plan_id", "actor_id", "schedule_id", "commitment_id", "goal_id",
                "plan_type", "starts_at", "ends_at", "status", "original_action",
                "actual_action", "reason_code", "public_reason", "confidence",
            )
        }
        return safe

    def _ensure_anchor_commitment(
        self, owner_user_id: str, actor: dict[str, Any], schedule: dict[str, Any],
        *, now: datetime,
    ) -> dict[str, Any]:
        commitment_id = self._id(
            owner_user_id, actor["actor_id"], schedule["starts_at"], "sleep"
        )
        return self.store.ensure_actor_commitment(
            owner_user_id,
            actor["actor_id"],
            commitment={
                "commitment_id": commitment_id,
                "commitment_type": "sleep",
                "title": "基础睡眠窗口",
                "starts_at": schedule["starts_at"],
                "ends_at": schedule["ends_at"],
                "location_id": "home",
                "flexibility": "hard",
                "status": "accepted",
                "metadata": {"schedule_id": schedule["schedule_id"]},
            },
            now=now,
        )

    @staticmethod
    def _suggestion_goal_type(suggestion_type: str) -> str:
        return {
            "rest": "habit", "walk": "habit", "connect": "relationship",
            "project": "creative", "explore": "exploration",
        }.get(suggestion_type, "personal")

    @staticmethod
    def _id(*parts: Any) -> str:
        return hashlib.sha256(":".join(str(part) for part in parts).encode("utf-8")).hexdigest()[:32]


__all__ = ["PlanManager"]
