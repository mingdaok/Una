"""Development-only deterministic controls for manual life-world acceptance."""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from .clock import parse_datetime
from .service import LifeSettlementService


SCENARIO_HOURS = {
    "baseline": 0,
    "one_day": 24,
    "three_days": 72,
    "one_week": 168,
}


class LifeAcceptanceService:
    def __init__(self, settlement: LifeSettlementService):
        self.settlement = settlement
        self.store = settlement.store

    def status(self, owner_user_id: str) -> dict[str, Any]:
        control = self.store.get_acceptance_control(owner_user_id)
        if control is None:
            return {"active": False, "seed": None, "virtual_now": None, "started_at": None}
        return {
            "active": True,
            "seed": control["seed"],
            "virtual_now": control["virtual_now"],
            "started_at": control["started_at"],
        }

    def reset(
        self,
        owner_user_id: str,
        *,
        seed: str,
        scenario: str = "baseline",
        start_at: Optional[datetime] = None,
    ) -> dict[str, Any]:
        normalized_seed = seed.strip()
        if not normalized_seed or len(normalized_seed) > 64:
            raise ValueError("场景种子长度必须为 1–64 个字符")
        if scenario not in SCENARIO_HOURS:
            raise ValueError("未知的验收场景")
        baseline = parse_datetime(start_at or self._baseline_for_seed(normalized_seed))
        self.store.reset_acceptance_world(owner_user_id)
        self.store.save_acceptance_control(
            owner_user_id,
            seed=normalized_seed,
            virtual_now=baseline,
            started_at=baseline,
        )
        self.settlement.ensure_world(owner_user_id, now=baseline)
        hours = SCENARIO_HOURS[scenario]
        report = None
        if hours:
            report = self.advance(owner_user_id, hours=hours)["settlement"]
        return {**self.status(owner_user_id), "scenario": scenario, "settlement": report}

    def advance(self, owner_user_id: str, *, hours: int) -> dict[str, Any]:
        if hours < 1 or hours > 168:
            raise ValueError("每次推进时间必须在 1–168 小时之间")
        control = self.store.get_acceptance_control(owner_user_id)
        if control is None:
            raise ValueError("请先重置并启动一个验收场景")
        target = parse_datetime(control["virtual_now"]) + timedelta(hours=hours)
        report = self.settlement.settle_due(owner_user_id, now=target).as_dict()
        self.store.save_acceptance_control(
            owner_user_id,
            seed=control["seed"],
            virtual_now=target,
            started_at=parse_datetime(control["started_at"]),
        )
        return {**self.status(owner_user_id), "advanced_hours": hours, "settlement": report}

    def release(self, owner_user_id: str) -> dict[str, Any]:
        self.store.clear_acceptance_control(owner_user_id)
        return self.status(owner_user_id)

    @staticmethod
    def _baseline_for_seed(seed: str) -> datetime:
        digest = hashlib.sha256(seed.encode("utf-8")).digest()
        day_offset = int.from_bytes(digest[:2], "big") % 120
        hour = (digest[2] % 4) * 6
        return datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(
            days=day_offset, hours=hour
        )


__all__ = ["LifeAcceptanceService", "SCENARIO_HOURS"]
