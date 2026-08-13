"""Deterministic, evidence-backed reviews for long-running NPC goals."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from .clock import parse_datetime
from .store import LifeStore
from .important_decisions import ImportantDecisionAdvisor
from .candidates import ActionCandidate
from .models import LifeWindow
from .utility import ScoredCandidate


@dataclass
class GoalReviewReport:
    reviewed: int = 0
    transitions: list[dict[str, Any]] = field(default_factory=list)


class GoalLifecycleService:
    def __init__(
        self, store: LifeStore,
        important_advisor: ImportantDecisionAdvisor | None = None,
    ):
        self.store = store
        self.important_advisor = important_advisor or ImportantDecisionAdvisor.from_environment(store)

    def review_actor(
        self, owner_user_id: str, actor: dict[str, Any], *, now: datetime
    ) -> GoalReviewReport:
        report = GoalReviewReport()
        persistence = float((actor.get("decision_style") or {}).get("persistence", 0.6))
        goals = self.store.list_actor_goals(owner_user_id, actor["actor_id"], limit=100)
        for goal in goals:
            if parse_datetime(goal["next_review_at"]) > now:
                continue
            next_status, reason, public_reason = self._decision(
                goal, persistence=persistence, now=now
            )
            next_status, reason, public_reason = self._advise_transition(
                owner_user_id, actor, goal, next_status=next_status,
                reason_code=reason, public_reason=public_reason, now=now,
            )
            events = self.store.list_actor_events(
                owner_user_id,
                actor["actor_id"],
                since=(now - timedelta(days=30)).isoformat(),
                limit=100,
            )
            evidence = [
                item["event_id"] for item in events
                if item.get("facts", {}).get("goal_id") == goal["goal_id"]
            ][:20]
            report.reviewed += 1
            if next_status == goal["status"]:
                self.store.transition_actor_goal(
                    owner_user_id,
                    actor["actor_id"],
                    goal_id=goal["goal_id"],
                    next_status=goal["status"],
                    reason_code="reviewed_without_transition",
                    public_reason="复查后仍按当前节奏继续。",
                    evidence_event_ids=evidence,
                    next_review_at=now + timedelta(days=3),
                    now=now,
                )
                continue
            updated = self.store.transition_actor_goal(
                owner_user_id,
                actor["actor_id"],
                goal_id=goal["goal_id"],
                next_status=next_status,
                reason_code=reason,
                public_reason=public_reason,
                evidence_event_ids=evidence,
                next_review_at=now + timedelta(days=self._review_delay(next_status)),
                now=now,
            )
            if updated:
                report.transitions.append({
                    "goal_id": goal["goal_id"],
                    "previous_status": goal["status"],
                    "next_status": next_status,
                    "reason_code": reason,
                    "public_reason": public_reason,
                    "evidence_event_ids": evidence,
                })
        return report

    def _advise_transition(
        self, owner: str, actor: dict[str, Any], goal: dict[str, Any], *,
        next_status: str, reason_code: str, public_reason: str, now: datetime,
    ) -> tuple[str, str, str]:
        if next_status not in {"paused", "abandoned", "failed"}:
            return next_status, reason_code, public_reason
        alternatives = tuple(dict.fromkeys((next_status, "paused", "active")))
        candidates = tuple(
            ScoredCandidate(
                candidate=ActionCandidate(
                    candidate_id=f"goal:{goal['goal_id']}:{status}",
                    action_type="review_goal", activity_id=f"goal-review:{status}",
                    location_id="internal", summary={
                        "active": "调整做法后继续推进目标。",
                        "paused": "暂停目标，留待下次复查。",
                        "abandoned": "放弃这个长期目标。",
                        "failed": "承认目标这次没有完成。",
                    }[status],
                    source="goal", duration_minutes=1,
                    metadata={
                        "goal_id": goal["goal_id"],
                        "goal_transition": status,
                    },
                ),
                score=(50 if status == next_status else 46),
                components={"goal_progress": 30 if status == "active" else 20},
            ) for status in alternatives
        )
        state = self.store.get_actor_state(owner, actor["actor_id"]) or {}
        advice = self.important_advisor.consider(
            owner, actor, state,
            LifeWindow("goal_review", "目标复查", now, now + timedelta(minutes=1)),
            candidates,
            rule_selected_id=f"goal:{goal['goal_id']}:{next_status}",
            has_hard_commitment=False,
        )
        if not advice.used_llm:
            return next_status, reason_code, public_reason
        selected = advice.selected_candidate_id.rsplit(":", 1)[-1]
        return selected, "important_decision_llm", advice.public_reason or public_reason

    @staticmethod
    def _decision(
        goal: dict[str, Any], *, persistence: float, now: datetime
    ) -> tuple[str, str, str]:
        status = goal["status"]
        progress = float(goal.get("progress", 0))
        deadline = goal.get("deadline")
        age = now - parse_datetime(goal["created_at"])
        if progress >= 1:
            return "completed", "progress_complete", "这件事已经完成，可以好好收尾了。"
        if deadline and parse_datetime(deadline) < now:
            return "failed", "deadline_missed", "截止时间已经过去，这次目标没有按期完成。"
        if status == "candidate":
            if persistence >= 0.45:
                return "active", "candidate_adopted", "认真想过以后，决定把它变成正式目标。"
            return "abandoned", "candidate_not_adopted", "想过以后，决定暂时不把它变成目标。"
        if status == "active" and age >= timedelta(days=14) and progress < 0.05:
            if persistence >= 0.60:
                return "paused", "stalled_for_14_days", "这件事停滞了一阵，先暂停并重新整理方向。"
            return "abandoned", "interest_remained_low", "持续一段时间没有投入，决定不再勉强继续。"
        if status == "paused":
            if persistence >= 0.58:
                return "active", "motivation_recovered", "休整后又找到一点动力，决定恢复推进。"
            return "abandoned", "pause_became_abandonment", "暂停后仍没有恢复兴趣，决定正式放下。"
        if status == "failed":
            if persistence >= 0.72 and progress > 0:
                return "active", "retry_after_failure", "复盘失败后仍想再试一次，重新调整了做法。"
            return "abandoned", "failure_closed", "复盘后决定接受这次失败，不再继续消耗自己。"
        return status, "reviewed_without_transition", "复查后仍按当前节奏继续。"

    @staticmethod
    def _review_delay(status: str) -> int:
        return 7 if status in {"paused", "failed"} else 3


__all__ = ["GoalLifecycleService", "GoalReviewReport"]
