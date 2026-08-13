"""Hard constraints for NPC action candidates."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable

from .candidates import ActionCandidate
from .models import LifeWindow


@dataclass(frozen=True)
class RejectedCandidate:
    candidate: ActionCandidate
    reason_code: str
    detail: str


class ConstraintEvaluator:
    def filter(
        self,
        candidates: Iterable[ActionCandidate],
        *,
        state: dict[str, Any],
        window: LifeWindow,
        actor: dict[str, Any] | None = None,
        context: dict[str, Any] | None = None,
    ) -> tuple[tuple[ActionCandidate, ...], tuple[RejectedCandidate, ...]]:
        accepted = []
        rejected = []
        available_minutes = max(
            1, int((window.end_at - window.start_at).total_seconds() // 60)
        )
        for candidate in candidates:
            reason = self._reason(
                candidate, state, available_minutes,
                actor=actor or {}, context=context or {},
            )
            if reason is None:
                accepted.append(candidate)
            else:
                rejected.append(reason)
        return tuple(accepted), tuple(rejected)

    @staticmethod
    def _reason(
        candidate: ActionCandidate,
        state: dict[str, Any],
        available_minutes: int,
        *, actor: dict[str, Any], context: dict[str, Any],
    ) -> RejectedCandidate | None:
        allowed_locations = candidate.metadata.get("allowed_locations") or ()
        if allowed_locations and candidate.location_id not in allowed_locations:
            return RejectedCandidate(
                candidate, "persona_location_forbidden",
                "行动地点不在这个人物允许的行动边界内",
            )
        forbidden = set(actor.get("forbidden_actions") or ())
        forbidden.update(context.get("forbidden_actions") or ())
        if candidate.action_type in forbidden:
            return RejectedCandidate(
                candidate, "persona_action_forbidden", "人物设定禁止这项行动"
            )
        required_resources = set(candidate.metadata.get("required_resources") or ())
        available_resources = set(context.get("available_resources") or ())
        missing = sorted(required_resources - available_resources)
        if missing:
            return RejectedCandidate(
                candidate, "missing_resource", f"缺少行动资源: {', '.join(missing)}"
            )
        target_id = candidate.metadata.get("target_actor_id")
        unavailable = set(context.get("unavailable_participant_ids") or ())
        if target_id and target_id in unavailable:
            return RejectedCandidate(
                candidate, "participant_unavailable", "目标人物当前不可参与"
            )
        if candidate.metadata.get("participant_willing") is False:
            return RejectedCandidate(
                candidate, "participant_declined", "目标人物没有接受这项行动"
            )
        if (
            context.get("actor_busy_uninterruptible")
            and candidate.source != "commitment"
        ):
            return RejectedCandidate(
                candidate, "actor_busy_uninterruptible", "人物正在执行不可中断行动"
            )
        if (
            candidate.metadata.get("risk_level") == "major"
            and context.get("major_plot_level", "ask") != "allow"
        ):
            return RejectedCandidate(
                candidate, "major_plot_not_allowed", "用户未允许重大负面剧情"
            )
        if candidate.metadata.get("location_open") is False:
            return RejectedCandidate(
                candidate, "location_closed", "行动开始时地点尚未开放"
            )
        if candidate.metadata.get("weather_blocked") is True:
            return RejectedCandidate(
                candidate, "weather_blocked", "当前天气不适合这项户外行动"
            )
        travel_minutes = (
            0 if candidate.metadata.get("travel_included")
            else max(0, int(candidate.metadata.get("travel_minutes", 0)))
        )
        if candidate.duration_minutes + travel_minutes > available_minutes:
            return RejectedCandidate(
                candidate, "insufficient_travel_time", "时间块不足以覆盖通勤和行动"
            )
        if candidate.duration_minutes > available_minutes:
            return RejectedCandidate(
                candidate, "insufficient_time", "行动时长超过当前时间块"
            )
        for requirement, threshold in candidate.requirements.items():
            if not requirement.startswith("min_"):
                continue
            metric = requirement[4:]
            if int(state.get(metric, 0)) >= int(threshold):
                continue
            reason = (
                "energy_below_minimum"
                if metric == "energy"
                else f"{metric}_below_minimum"
            )
            return RejectedCandidate(
                candidate,
                reason,
                f"{metric}={state.get(metric, 0)} 低于最低要求 {threshold}",
            )
        return None


__all__ = ["ConstraintEvaluator", "RejectedCandidate"]
