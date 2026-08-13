"""Explainable utility scoring for NPC action candidates."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Any, Iterable, Sequence

from .candidates import ActionCandidate


@dataclass(frozen=True)
class ScoredCandidate:
    candidate: ActionCandidate
    score: int
    components: dict[str, int]


class UtilityScorer:
    def score_all(
        self,
        candidates: Iterable[ActionCandidate],
        *,
        actor: dict[str, Any],
        state: dict[str, Any],
        recent_events: Sequence[dict[str, Any]],
    ) -> tuple[ScoredCandidate, ...]:
        return tuple(
            self.score(
                candidate,
                actor=actor,
                state=state,
                recent_events=recent_events,
            )
            for candidate in candidates
        )

    def score(
        self,
        candidate: ActionCandidate,
        *,
        actor: dict[str, Any],
        state: dict[str, Any],
        recent_events: Sequence[dict[str, Any]],
    ) -> ScoredCandidate:
        style = actor.get("decision_style") or {}
        categories = set(candidate.categories)
        components = {
            "personality_fit": self._personality_fit(categories, style),
            "need_satisfaction": self._need_fit(categories, candidate, state),
            "goal_progress": (
                min(45, round(int(candidate.metadata.get("goal_priority", 0)) * 0.55))
                if candidate.source == "goal" else 0
            ),
            "relationship_motivation": self._relationship_fit(candidate),
            "commitment_value": (
                70 if candidate.source == "commitment" and candidate.metadata.get("flexibility") == "hard"
                else 50 if candidate.source == "commitment" else 0
            ),
            "environment_fit": max(
                -25,
                min(
                    25,
                    int(candidate.metadata.get("environment_bonus", 0))
                    + int(candidate.metadata.get("weather_fit", 0))
                    + round((float(candidate.metadata.get("location_comfort", 0.6)) - 0.6) * 12),
                ),
            ),
            "memory_relevance": self._memory_fit(candidate),
            "habit_strength": (
                round(float(style.get("routine_preference", 0.5)) * 30)
                if candidate.source == "routine"
                else 0
            ),
            "mood_bias": self._mood_bias(categories, state),
            "energy_cost": -min(30, max(0, int(candidate.base_cost.get("energy", 0)))),
            "time_cost": -min(18, candidate.duration_minutes // 15),
            "travel_cost": -min(
                30, max(0, int(candidate.metadata.get("travel_minutes", 0))) // 2
            ),
            "risk_cost": self._risk_cost(categories, style),
            "repetition_penalty": self._repetition_penalty(candidate, recent_events),
            "plan_conflict_penalty": 0,
            "bounded_noise": self._bounded_noise(candidate.candidate_id),
        }
        return ScoredCandidate(
            candidate=candidate,
            score=sum(components.values()),
            components=components,
        )

    @staticmethod
    def _personality_fit(categories: set[str], style: dict[str, Any]) -> int:
        score = 0
        if categories & {"novelty", "exploration"}:
            score += round((float(style.get("novelty_seeking", 0.5)) - 0.5) * 40)
        if "social" in categories:
            score += round((float(style.get("social_initiative", 0.5)) - 0.5) * 36)
        if "productive" in categories:
            score += round((float(style.get("persistence", 0.5)) - 0.5) * 30)
        if "quiet" in categories:
            score += round((1 - float(style.get("spontaneity", 0.5))) * 8)
        return max(-30, min(30, score))

    @staticmethod
    def _need_fit(
        categories: set[str], candidate: ActionCandidate, state: dict[str, Any]
    ) -> int:
        values = []
        if categories & {"recovery", "quiet"}:
            values.append(max(0, (50 - int(state.get("energy", 70))) * 2))
            values.append(max(0, int(state.get("stress", 25)) - 45))
        if "meal" in categories:
            values.append(max(0, int(state.get("hunger", 25)) - 40) * 2)
        if "social" in categories:
            values.append(max(0, int(state.get("social_need", 25)) - 40) * 2)
        if categories & {"novelty", "exploration"}:
            values.append(max(0, int(state.get("boredom", 25)) - 35))
        for metric, effect in candidate.base_effect.items():
            current = int(state.get(metric, 50))
            if effect < 0 and current >= 50:
                values.append(min(20, abs(effect)))
            if effect > 0 and current <= 45:
                values.append(min(20, effect))
        return min(60, sum(values))

    @staticmethod
    def _mood_bias(categories: set[str], state: dict[str, Any]) -> int:
        if int(state.get("stress", 25)) >= 70 and "social" in categories:
            return -12
        if int(state.get("energy", 70)) <= 30 and "recovery" in categories:
            return 12
        return 0

    @staticmethod
    def _relationship_fit(candidate: ActionCandidate) -> int:
        if candidate.source != "relationship":
            return 0
        affinity = int(candidate.metadata.get("relationship_affinity", 0))
        trust = int(candidate.metadata.get("relationship_trust", 0))
        familiarity = int(candidate.metadata.get("relationship_familiarity", 0))
        tension = int(candidate.metadata.get("relationship_tension", 0))
        if candidate.metadata.get("relationship_repair"):
            value = 12 + trust // 4 + min(12, tension // 3)
        else:
            value = affinity // 4 + trust // 5 + familiarity // 8 - tension // 4
        return max(-40, min(40, value))

    @staticmethod
    def _memory_fit(candidate: ActionCandidate) -> int:
        if candidate.source != "memory":
            return 0
        confidence = int(candidate.metadata.get("memory_confidence", 0))
        kind_bonus = {
            "relationship": 7, "episodic": 5, "user": 4,
            "semantic": 3, "self": 2,
        }.get(str(candidate.metadata.get("memory_kind") or ""), 0)
        return max(-25, min(25, confidence // 6 + kind_bonus))

    @staticmethod
    def _risk_cost(categories: set[str], style: dict[str, Any]) -> int:
        if not categories & {"novelty", "outdoor", "exploration"}:
            return 0
        tolerance = float(style.get("risk_tolerance", 0.5))
        return -round((1 - tolerance) * 10)

    @staticmethod
    def _repetition_penalty(
        candidate: ActionCandidate, recent_events: Sequence[dict[str, Any]]
    ) -> int:
        matches = 0
        for event in recent_events[:8]:
            if (
                event.get("event_type") == candidate.action_type
                and event.get("location_id") == candidate.location_id
            ):
                matches += 1
        return -min(45, matches * 15)

    @staticmethod
    def _bounded_noise(candidate_id: str) -> int:
        digest = hashlib.sha256(candidate_id.encode("utf-8")).digest()
        return int.from_bytes(digest[:2], "big") % 25 - 12


__all__ = ["ScoredCandidate", "UtilityScorer"]
