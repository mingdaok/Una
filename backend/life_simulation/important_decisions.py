"""Budgeted, strictly validated LLM advice for consequential NPC choices."""

from __future__ import annotations

import json
import os
import time
import hashlib
from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Protocol, Sequence

from .clock import parse_datetime
from .models import LifeWindow
from .store import LifeStore
from .utility import ScoredCandidate


IMPORTANT_DECISION_SCHEMA = {
    "name": "npc_important_decision",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "selected_candidate_id", "motivation", "public_reason",
            "private_reason", "confidence",
        ],
        "properties": {
            "selected_candidate_id": {"type": "string", "minLength": 1},
            "motivation": {"type": "string", "minLength": 1, "maxLength": 80},
            "public_reason": {"type": "string", "minLength": 1, "maxLength": 160},
            "private_reason": {"type": "string", "minLength": 1, "maxLength": 160},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        },
    },
}


@dataclass(frozen=True)
class LlmProviderResponse:
    payload: dict[str, Any]
    model: str
    latency_ms: int
    input_tokens: int = 0
    output_tokens: int = 0


class DecisionProvider(Protocol):
    def decide(self, request: dict[str, Any]) -> LlmProviderResponse: ...


@dataclass(frozen=True)
class ImportantDecisionResult:
    selected_candidate_id: str
    triggered: bool
    used_llm: bool
    model: str | None = None
    fallback_reason: str | None = None
    motivation: str | None = None
    public_reason: str | None = None
    private_reason: str | None = None
    confidence: float | None = None


class OpenAiDecisionProvider:
    def __init__(self, *, api_key: str, base_url: str | None, model: str, timeout: float):
        from openai import OpenAI

        self.client = OpenAI(api_key=api_key, base_url=base_url or None, timeout=timeout)
        self.model = model

    def decide(self, request: dict[str, Any]) -> LlmProviderResponse:
        started = time.perf_counter()
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "你只为一个重要 NPC 决策提供建议。只能选择候选列表中的 "
                        "candidate_id，不得创造人物、地点、事件或结果。输出必须符合 JSON Schema。"
                    ),
                },
                {"role": "user", "content": json.dumps(request, ensure_ascii=False)},
            ],
            response_format={"type": "json_schema", "json_schema": IMPORTANT_DECISION_SCHEMA},
            temperature=0.25,
        )
        content = response.choices[0].message.content or "{}"
        usage = getattr(response, "usage", None)
        return LlmProviderResponse(
            payload=json.loads(content), model=self.model,
            latency_ms=round((time.perf_counter() - started) * 1000),
            input_tokens=int(getattr(usage, "prompt_tokens", 0) or 0),
            output_tokens=int(getattr(usage, "completion_tokens", 0) or 0),
        )


class ImportantDecisionAdvisor:
    def __init__(
        self, store: LifeStore, *, provider: DecisionProvider | None,
        enabled: bool, daily_budget: int = 3, score_gap_threshold: int = 8,
    ):
        self.store = store
        self.provider = provider
        self.enabled = bool(enabled and provider is not None)
        self.daily_budget = max(0, min(12, int(daily_budget)))
        self.score_gap_threshold = max(1, min(30, int(score_gap_threshold)))

    @classmethod
    def from_environment(cls, store: LifeStore) -> "ImportantDecisionAdvisor":
        enabled = os.getenv("UNA_NPC_DECISION_LLM_ENABLED", "false").lower() in {
            "1", "true", "yes", "on",
        }
        api_key = os.getenv("UNA_NPC_DECISION_LLM_API_KEY", "").strip()
        provider = None
        if enabled and api_key:
            provider = OpenAiDecisionProvider(
                api_key=api_key,
                base_url=os.getenv("UNA_NPC_DECISION_LLM_BASE_URL", "").strip() or None,
                model=os.getenv("UNA_NPC_DECISION_LLM_MODEL", "gpt-4.1-mini").strip(),
                timeout=float(os.getenv("UNA_NPC_DECISION_LLM_TIMEOUT_SECONDS", "8")),
            )
        return cls(
            store, provider=provider, enabled=enabled,
            daily_budget=int(os.getenv("UNA_NPC_DECISION_LLM_DAILY_BUDGET", "3")),
            score_gap_threshold=int(
                os.getenv("UNA_NPC_DECISION_LLM_SCORE_GAP", "8")
            ),
        )

    def consider(
        self, owner_user_id: str, actor: dict[str, Any], state: dict[str, Any],
        window: LifeWindow, candidates: Sequence[ScoredCandidate], *,
        rule_selected_id: str, has_hard_commitment: bool,
        offline_batch: bool = False,
    ) -> ImportantDecisionResult:
        base = ImportantDecisionResult(rule_selected_id, False, False)
        if not self.enabled or has_hard_commitment or offline_batch:
            return base
        trigger = self._trigger_reason(candidates)
        if trigger is None:
            return base
        local_start = window.start_at.replace(hour=0, minute=0, second=0, microsecond=0)
        call_id = self._call_id(
            owner_user_id, actor["actor_id"], window, state
        )
        if not self.store.reserve_decision_llm_call(
            owner_user_id,
            actor["actor_id"],
            call={
                "call_id": call_id,
                "decision_at": window.start_at.isoformat(),
                "state_version": int(state.get("state_version", 0)),
                "trigger_reason": trigger,
            },
            day_start=local_start.isoformat(),
            day_end=(local_start + timedelta(days=1)).isoformat(),
            daily_budget=self.daily_budget,
            now=window.start_at,
        ):
            return ImportantDecisionResult(
                rule_selected_id, True, False,
                fallback_reason="daily_budget_exhausted",
            )
        request = self._request(actor, state, window, candidates, trigger)
        try:
            response = self.provider.decide(request)  # type: ignore[union-attr]
        except Exception as error:
            fallback = (
                "provider_timeout"
                if isinstance(error, TimeoutError) or "timeout" in type(error).__name__.lower()
                else "provider_error"
            )
            self._record(
                owner_user_id, actor, state, window, trigger, status="failed",
                fallback_reason=fallback, call_id=call_id,
            )
            return ImportantDecisionResult(
                rule_selected_id, True, False, fallback_reason=fallback
            )
        fallback = self._validate(response.payload, candidates)
        if fallback:
            self._record(
                owner_user_id, actor, state, window, trigger, status="invalid",
                response=response, fallback_reason=fallback,
                call_id=call_id,
            )
            return ImportantDecisionResult(
                rule_selected_id, True, False, model=response.model,
                fallback_reason=fallback,
            )
        payload = response.payload
        self._record(
            owner_user_id, actor, state, window, trigger, status="accepted",
            response=response,
            selected_candidate_id=payload["selected_candidate_id"],
            call_id=call_id,
        )
        return ImportantDecisionResult(
            payload["selected_candidate_id"], True, True, model=response.model,
            motivation=payload["motivation"], public_reason=payload["public_reason"],
            private_reason=payload["private_reason"],
            confidence=float(payload["confidence"]),
        )

    def _trigger_reason(self, candidates: Sequence[ScoredCandidate]) -> str | None:
        if len(candidates) < 2:
            return None
        ordered = sorted(candidates, key=lambda item: item.score, reverse=True)
        if ordered[0].score - ordered[1].score > self.score_gap_threshold:
            return None
        sources = {item.candidate.source for item in ordered[:3]}
        if "invitation" in sources or any(
            item.candidate.metadata.get("invitation_id") for item in ordered[:3]
        ):
            return "important_invitation"
        if any(
            item.candidate.metadata.get("relationship_repair")
            or int(item.candidate.metadata.get("relationship_tension", 0)) >= 38
            for item in ordered[:3]
        ):
            return "persistent_relationship_conflict"
        if any(
            item.candidate.metadata.get("goal_transition") in {
                "paused", "abandoned", "failed"
            } for item in ordered[:3]
        ):
            return "goal_lifecycle_change"
        if any(
            item.candidate.metadata.get("suggestion_impact") == "important"
            for item in ordered[:3]
        ):
            return "important_user_suggestion"
        if sources & {"goal", "relationship", "memory", "environment"}:
            return "close_consequential_candidates"
        return None

    @staticmethod
    def _request(
        actor: dict[str, Any], state: dict[str, Any], window: LifeWindow,
        candidates: Sequence[ScoredCandidate], trigger: str,
    ) -> dict[str, Any]:
        return {
            "actor": {
                "actor_id": actor["actor_id"],
                "traits": list(actor.get("traits", ()))[:8],
                "decision_style": dict(actor.get("decision_style") or {}),
            },
            "state": {
                key: state.get(key)
                for key in (
                    "energy", "stress", "social_need", "boredom", "focus",
                    "confidence", "current_location",
                )
            },
            "window": {
                "key": window.key, "start_at": window.start_at.isoformat(),
                "end_at": window.end_at.isoformat(),
            },
            "trigger_reason": trigger,
            "candidates": [
                {
                    "candidate_id": item.candidate.candidate_id,
                    "action_type": item.candidate.action_type,
                    "location_id": item.candidate.location_id,
                    "summary": item.candidate.summary,
                    "source": item.candidate.source,
                    "score": item.score,
                    "components": dict(item.components),
                }
                for item in candidates
            ],
        }

    @staticmethod
    def _validate(
        payload: Any, candidates: Sequence[ScoredCandidate]
    ) -> str | None:
        required = {
            "selected_candidate_id", "motivation", "public_reason",
            "private_reason", "confidence",
        }
        if not isinstance(payload, dict) or set(payload) != required:
            return "invalid_schema"
        candidate_ids = {item.candidate.candidate_id for item in candidates}
        if payload["selected_candidate_id"] not in candidate_ids:
            return "illegal_candidate"
        for key in ("motivation", "public_reason", "private_reason"):
            if not isinstance(payload[key], str) or not payload[key].strip():
                return "invalid_schema"
        confidence = payload["confidence"]
        if isinstance(confidence, bool) or not isinstance(confidence, (int, float)):
            return "invalid_schema"
        if not 0 <= float(confidence) <= 1:
            return "invalid_schema"
        return None

    def _record(
        self, owner: str, actor: dict[str, Any], state: dict[str, Any],
        window: LifeWindow, trigger: str, *, status: str,
        response: LlmProviderResponse | None = None,
        selected_candidate_id: str | None = None,
        fallback_reason: str | None = None,
        call_id: str | None = None,
    ) -> None:
        resolved_call_id = call_id or self._call_id(
            owner, actor["actor_id"], window, state
        )
        self.store.finalize_decision_llm_call(
            owner, actor["actor_id"],
            call_id=resolved_call_id,
            changes={
                "status": status, "trigger_reason": trigger,
                "selected_candidate_id": selected_candidate_id,
                "model": response.model if response else None,
                "latency_ms": response.latency_ms if response else None,
                "input_tokens": response.input_tokens if response else 0,
                "output_tokens": response.output_tokens if response else 0,
                "fallback_reason": fallback_reason,
            },
            now=window.start_at,
        )

    @staticmethod
    def _call_id(
        owner: str, actor_id: str, window: LifeWindow, state: dict[str, Any]
    ) -> str:
        raw = (
            f"{owner}:{actor_id}:{window.start_at.isoformat()}:"
            f"{state.get('state_version', 0)}"
        )
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


__all__ = [
    "IMPORTANT_DECISION_SCHEMA", "ImportantDecisionAdvisor",
    "ImportantDecisionResult", "LlmProviderResponse", "OpenAiDecisionProvider",
]
