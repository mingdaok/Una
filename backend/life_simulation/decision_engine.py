"""Reproducible bounded-random selection and decision audit payloads."""

from __future__ import annotations

import hashlib
import math
import random
from dataclasses import dataclass
from typing import Any, Sequence

from .models import LifeWindow
from .utility import ScoredCandidate
from .important_decisions import ImportantDecisionAdvisor


@dataclass(frozen=True)
class DecisionResult:
    selected: ScoredCandidate
    candidate_scores: tuple[dict[str, Any], ...]
    rejected_candidates: tuple[dict[str, Any], ...]
    random_seed_hash: str
    temperature: float
    used_llm: bool
    llm_model: str | None
    fallback_reason: str | None
    llm_motivation: str | None
    llm_public_reason: str | None
    llm_private_reason: str | None
    llm_confidence: float | None
    engine_version: str

    def as_audit(self) -> dict[str, Any]:
        return {
            "selected_candidate_id": self.selected.candidate.candidate_id,
            "candidate_scores": [dict(item) for item in self.candidate_scores],
            "reason_codes": [
                key
                for key, value in self.selected.components.items()
                if value != 0
            ],
            "random_seed_hash": self.random_seed_hash,
            "temperature": self.temperature,
            "used_llm": self.used_llm,
            "llm_model": self.llm_model,
            "fallback_reason": self.fallback_reason,
            "llm_motivation": self.llm_motivation,
            "llm_public_reason": self.llm_public_reason,
            "llm_private_reason": self.llm_private_reason,
            "llm_confidence": self.llm_confidence,
            "engine_version": self.engine_version,
        }


class DecisionEngine:
    def __init__(
        self, *, engine_version: str,
        important_advisor: ImportantDecisionAdvisor | None = None,
    ):
        self.engine_version = engine_version
        self.important_advisor = important_advisor

    def select(
        self,
        owner_user_id: str,
        actor: dict[str, Any],
        state: dict[str, Any],
        window: LifeWindow,
        candidates: Sequence[ScoredCandidate],
        *,
        has_hard_commitment: bool,
        rejected_candidates: Sequence[dict[str, Any]] = (),
        fallback_reason: str | None = None,
        allow_important_llm: bool = True,
        offline_batch: bool = False,
    ) -> DecisionResult:
        if not candidates:
            raise ValueError("没有通过约束的候选行动")
        seed_material = ":".join(
            (
                owner_user_id,
                actor["actor_id"],
                window.start_at.isoformat(),
                str(state.get("state_version", 0)),
                self.engine_version,
            )
        )
        digest = hashlib.sha256(seed_material.encode("utf-8")).digest()
        seed_hash = digest.hex()[:16]
        rng = random.Random(int.from_bytes(digest[:8], "big"))
        temperature = self._temperature(actor, state, has_hard_commitment)
        maximum = max(candidate.score for candidate in candidates)
        weights = [
            math.exp((candidate.score - maximum) / temperature)
            for candidate in candidates
        ]
        total = sum(weights)
        probabilities = [weight / total for weight in weights]
        hard_commitments = [
            candidate for candidate in candidates
            if candidate.candidate.source == "commitment"
            and candidate.candidate.metadata.get("flexibility") == "hard"
        ]
        if hard_commitments:
            selected = max(hard_commitments, key=lambda candidate: candidate.score)
            probabilities = [
                1.0 if candidate is selected else 0.0 for candidate in candidates
            ]
        else:
            threshold = rng.random()
            cumulative = 0.0
            selected = candidates[-1]
            for candidate, probability in zip(candidates, probabilities):
                cumulative += probability
                if threshold <= cumulative:
                    selected = candidate
                    break
        advice = None
        if self.important_advisor and allow_important_llm and not hard_commitments:
            advice = self.important_advisor.consider(
                owner_user_id, actor, state, window, candidates,
                rule_selected_id=selected.candidate.candidate_id,
                has_hard_commitment=has_hard_commitment,
                offline_batch=offline_batch,
            )
            selected = next(
                (
                    item for item in candidates
                    if item.candidate.candidate_id == advice.selected_candidate_id
                ),
                selected,
            )
        audit_rows = tuple(
            {
                "candidate_id": candidate.candidate.candidate_id,
                "action_type": candidate.candidate.action_type,
                "location_id": candidate.candidate.location_id,
                "summary": candidate.candidate.summary,
                "source": candidate.candidate.source,
                "score": candidate.score,
                "probability": probability,
                "components": dict(candidate.components),
                "selected": candidate is selected,
            }
            for candidate, probability in zip(candidates, probabilities)
        )
        return DecisionResult(
            selected=selected,
            candidate_scores=audit_rows,
            rejected_candidates=tuple(dict(item) for item in rejected_candidates),
            random_seed_hash=seed_hash,
            temperature=temperature,
            used_llm=bool(advice and advice.used_llm),
            llm_model=advice.model if advice else None,
            fallback_reason=(
                advice.fallback_reason or fallback_reason
                if advice else fallback_reason
            ),
            llm_motivation=advice.motivation if advice else None,
            llm_public_reason=advice.public_reason if advice else None,
            llm_private_reason=advice.private_reason if advice else None,
            llm_confidence=advice.confidence if advice else None,
            engine_version=self.engine_version,
        )

    @staticmethod
    def _temperature(
        actor: dict[str, Any],
        state: dict[str, Any],
        has_hard_commitment: bool,
    ) -> float:
        style = actor.get("decision_style") or {}
        value = (
            12
            + float(style.get("spontaneity", 0.5)) * 18
            + int(state.get("boredom", 25)) * 0.10
            + int(state.get("stress", 25)) * 0.04
        )
        if has_hard_commitment:
            value *= 0.4
        return round(max(5.0, min(45.0, value)), 3)


__all__ = ["DecisionEngine", "DecisionResult"]
