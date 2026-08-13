"""Deterministic target-side decisions for NPC social invitations."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class InvitationDecision:
    status: str
    reason_code: str
    public_reason: str
    private_reason: str
    score: int


class InvitationDecisionEngine:
    def __init__(self, *, version: str):
        self.version = version

    def decide(
        self,
        owner_user_id: str,
        invitation: dict[str, Any],
        *,
        target_state: dict[str, Any],
        relationship: dict[str, Any] | None,
        has_conflict: bool,
    ) -> InvitationDecision:
        relation = relationship or {}
        energy = int(target_state.get("energy", 70))
        stress = int(target_state.get("stress", 25))
        social_need = int(target_state.get("social_need", 40))
        if has_conflict:
            return InvitationDecision(
                "rejected", "time_conflict", "那段时间已经有安排了。",
                "不想为了临时邀请打乱已经答应的事情。", -100,
            )
        if energy <= 24 or stress >= 76:
            return InvitationDecision(
                "postponed", "wellbeing_low", "今天状态不太够，想改天再约。",
                "现在没有余力认真陪伴对方。", 20,
            )
        score = (
            35
            + int(relation.get("affinity", 0)) // 3
            + int(relation.get("trust", 0)) // 4
            - int(relation.get("tension", 0)) // 2
            + social_need // 4
            + energy // 8
            - stress // 7
            + self._jitter(owner_user_id, invitation)
        )
        if score >= 54:
            return InvitationDecision(
                "accepted", "relationship_and_state_fit", "时间合适，也想见见对方。",
                "这次邀请让自己感到被惦记。", score,
            )
        if score >= 34:
            return InvitationDecision(
                "postponed", "preference_uncertain", "这次先不定，过几天再看看。",
                "还没有确定自己是否真的想去。", score,
            )
        return InvitationDecision(
            "rejected", "motivation_low", "这次就先不去了。",
            "当下更想保留自己的时间。", score,
        )

    def _jitter(self, owner_user_id: str, invitation: dict[str, Any]) -> int:
        raw = ":".join(
            (
                owner_user_id,
                str(invitation["invitation_id"]),
                str(invitation["target_actor_id"]),
                str(invitation["starts_at"]),
                self.version,
            )
        ).encode("utf-8")
        return int.from_bytes(hashlib.sha256(raw).digest()[:2], "big") % 25 - 12


__all__ = ["InvitationDecision", "InvitationDecisionEngine"]
