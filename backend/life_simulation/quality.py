"""Isolated multi-seed quality evaluation for development tuning."""

from __future__ import annotations

import hashlib
import os
import tempfile
from collections import Counter
from typing import Any, Iterable

from .acceptance import LifeAcceptanceService
from .service import LifeSettlementService
from .store import LifeStore


SUGGESTION_TYPES = ("rest", "walk", "project")


class LifeQualityEvaluator:
    def evaluate(self, seeds: Iterable[str], *, days: int) -> dict[str, Any]:
        normalized = [str(seed).strip() for seed in seeds]
        if not normalized or len(normalized) > 20:
            raise ValueError("评估种子数量必须为 1–20 个")
        if any(not seed or len(seed) > 64 for seed in normalized):
            raise ValueError("每个评估种子长度必须为 1–64 个字符")
        if len(set(normalized)) != len(normalized):
            raise ValueError("评估种子不能重复")
        if days < 1 or days > 7:
            raise ValueError("评估天数必须为 1–7 天")

        with tempfile.TemporaryDirectory(prefix="una-life-quality-") as directory:
            store = LifeStore(os.path.join(directory, "quality.sqlite3"))
            settlement = LifeSettlementService(store)
            acceptance = LifeAcceptanceService(settlement)
            runs = [
                self._run_seed(settlement, acceptance, seed, days)
                for seed in normalized
            ]
        return self._aggregate(runs, days)

    def _run_seed(
        self,
        settlement: LifeSettlementService,
        acceptance: LifeAcceptanceService,
        seed: str,
        days: int,
    ) -> dict[str, Any]:
        digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()[:12]
        owner = f"quality-{digest}"
        acceptance.reset(owner, seed=seed, scenario="baseline")
        actors = settlement.characters.list_contacts(owner)
        for actor_index, actor in enumerate(actors):
            settlement.submit_actor_suggestion(
                owner,
                actor["actor_id"],
                suggestion_type=SUGGESTION_TYPES[actor_index % len(SUGGESTION_TYPES)],
                request_id=f"quality:{seed}:{actor['actor_id']}",
                message="批量质量评估的标准化建议",
            )
        acceptance.advance(owner, hours=days * 24)

        events: list[dict[str, Any]] = []
        intentions: list[dict[str, Any]] = []
        suggestions: list[dict[str, Any]] = []
        relationship_tiers: Counter[str] = Counter()
        for actor in actors:
            actor_id = actor["actor_id"]
            events.extend(settlement.store.list_actor_events(owner, actor_id, limit=100))
            intentions.extend(settlement.store.list_actor_intentions(owner, actor_id, limit=100))
            suggestions.extend(settlement.store.list_actor_suggestions(owner, actor_id, limit=100))
            for relationship in settlement.store.list_relationships(owner, actor_id, limit=20):
                tier = settlement.relationship_dynamics.describe(relationship)["relationship_tier"]
                relationship_tiers[tier] += 1

        interactions = settlement.store.list_interaction_events(owner, limit=100)
        suggestion_outcomes = Counter(item["status"] for item in suggestions)
        return {
            "seed": seed,
            "actor_count": len(actors),
            "actor_events": len(events),
            "unique_summaries": len({item["summary"] for item in events}),
            "event_types": Counter(item["event_type"] for item in events),
            "interactions": len(interactions),
            "conflicts": sum(item["event_type"] == "relationship_friction" for item in interactions),
            "repairs": sum(item["event_type"] == "relationship_repair" for item in interactions),
            "intentions": len(intentions),
            "completed_intentions": sum(item["status"] == "completed" for item in intentions),
            "suggestion_outcomes": suggestion_outcomes,
            "relationship_tiers": relationship_tiers,
        }

    @staticmethod
    def _aggregate(runs: list[dict[str, Any]], days: int) -> dict[str, Any]:
        seed_count = len(runs)
        event_count = sum(run["actor_events"] for run in runs)
        unique_summary_count = sum(run["unique_summaries"] for run in runs)
        interaction_count = sum(run["interactions"] for run in runs)
        conflict_count = sum(run["conflicts"] for run in runs)
        repair_count = sum(run["repairs"] for run in runs)
        intention_count = sum(run["intentions"] for run in runs)
        completed_intentions = sum(run["completed_intentions"] for run in runs)
        event_types: Counter[str] = Counter()
        suggestion_outcomes: Counter[str] = Counter()
        relationship_tiers: Counter[str] = Counter()
        for run in runs:
            event_types.update(run["event_types"])
            suggestion_outcomes.update(run["suggestion_outcomes"])
            relationship_tiers.update(run["relationship_tiers"])

        actor_days = max(1, sum(run["actor_count"] for run in runs) * days)
        repetition_rate = 0.0 if event_count == 0 else 1 - unique_summary_count / event_count
        interaction_rate = interaction_count / max(1, seed_count * days)
        intention_completion_rate = (
            0.0 if intention_count == 0 else completed_intentions / intention_count
        )
        warnings = []
        if event_count / actor_days < 2:
            warnings.append("NPC 每日事件偏少，生活可能显得稀疏。")
        if repetition_rate > 0.75:
            warnings.append("事件摘要重复率较高，建议增加日程或自主行动变体。")
        if interaction_rate < 0.15:
            warnings.append("NPC 共同互动偏少，关系演进可能不够可见。")
        if intention_count and intention_completion_rate < 0.30:
            warnings.append("意图完成率偏低，建议检查行动延迟和截止窗口。")

        return {
            "seed_count": seed_count,
            "days_per_seed": days,
            "metrics": {
                "actor_event_count": event_count,
                "events_per_actor_day": round(event_count / actor_days, 3),
                "unique_summary_count": unique_summary_count,
                "summary_repetition_rate": round(repetition_rate, 3),
                "event_type_distribution": dict(event_types.most_common()),
                "interaction_count": interaction_count,
                "interactions_per_seed_day": round(interaction_rate, 3),
                "conflict_count": conflict_count,
                "repair_count": repair_count,
                "repair_conflict_ratio": round(repair_count / max(1, conflict_count), 3),
                "intention_count": intention_count,
                "completed_intention_count": completed_intentions,
                "intention_completion_rate": round(intention_completion_rate, 3),
                "suggestion_outcomes": dict(suggestion_outcomes),
                "relationship_tiers": dict(relationship_tiers),
            },
            "runs": [
                {
                    "seed": run["seed"],
                    "actor_events": run["actor_events"],
                    "unique_summaries": run["unique_summaries"],
                    "interactions": run["interactions"],
                    "conflicts": run["conflicts"],
                    "repairs": run["repairs"],
                    "intentions": run["intentions"],
                    "completed_intentions": run["completed_intentions"],
                    "suggestion_outcomes": dict(run["suggestion_outcomes"]),
                }
                for run in runs
            ],
            "warnings": warnings,
        }


__all__ = ["LifeQualityEvaluator"]
