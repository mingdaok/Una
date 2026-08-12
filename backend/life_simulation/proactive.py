"""Reconnect delivery, feedback, and diagnostics for UNA's life updates."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from .clock import get_timezone, parse_datetime, utc_now
from .store import DEFAULT_AI_ID, LifeStore


CLAIM_TIMEOUT = timedelta(minutes=10)
MIN_MENTIONABILITY = 70
MIN_IMPORTANCE = 40
EXCLUDED_EVENT_TYPES = {"sleep", "period_summary"}


@dataclass(frozen=True)
class ProactivePolicy:
    minimum_absence: timedelta
    cooldown: timedelta
    max_daily: int


FREQUENCY_POLICIES = {
    "occasional": ProactivePolicy(timedelta(hours=6), timedelta(hours=24), 1),
    "natural": ProactivePolicy(timedelta(hours=2), timedelta(hours=8), 1),
    "frequent": ProactivePolicy(timedelta(hours=1), timedelta(hours=3), 3),
}


@dataclass(frozen=True)
class ProactiveLifeShare:
    delivery_id: str
    source_event_id: str
    topic: str
    text: str
    emotion: str = "happy"


class LifeProactiveService:
    """Selects, learns from, and audits reconnect life shares."""

    def __init__(self, store: LifeStore):
        self.store = store

    def claim_for_reconnect(
        self,
        owner_user_id: str,
        last_interaction_at: str | datetime | None,
        ai_id: str = DEFAULT_AI_ID,
        *,
        now: Optional[datetime] = None,
    ) -> Optional[ProactiveLifeShare]:
        if not last_interaction_at:
            return None
        current = self._utc(now or utc_now())
        absent_since = self._utc(last_interaction_at)
        profile = self.store.get_profile(owner_user_id, ai_id)
        if not profile or not profile["proactive_messages_enabled"]:
            return None
        policy = self._policy(profile)
        if current - absent_since < policy.minimum_absence:
            return None

        candidates = self._ranked_candidates(
            owner_user_id, ai_id, absent_since=absent_since
        )
        if not candidates:
            return None

        local_now = current.astimezone(get_timezone(profile["timezone"]))
        day_start = local_now.replace(
            hour=0, minute=0, second=0, microsecond=0
        ).astimezone(timezone.utc)
        for event in candidates:
            topic = self._topic_for(event)
            text = self._compose(event)
            claim = self.store.claim_proactive_delivery(
                owner_user_id,
                ai_id,
                event["event_id"],
                text,
                topic=topic,
                now=current,
                cooldown_since=current - policy.cooldown,
                day_start=day_start,
                stale_claim_before=current - CLAIM_TIMEOUT,
                max_daily=policy.max_daily,
            )
            if claim:
                return ProactiveLifeShare(
                    delivery_id=claim["delivery_id"],
                    source_event_id=event["event_id"],
                    topic=topic,
                    text=text,
                    emotion=self._emotion_for(event),
                )
        return None

    def complete(
        self,
        owner_user_id: str,
        share: ProactiveLifeShare,
        *,
        now: Optional[datetime] = None,
    ) -> bool:
        return self.store.complete_proactive_delivery(
            owner_user_id, share.delivery_id, now=self._utc(now or utc_now())
        )

    def release(
        self,
        owner_user_id: str,
        share: ProactiveLifeShare,
        *,
        error: str = "delivery_failed",
    ) -> bool:
        return self.store.fail_proactive_delivery(
            owner_user_id, share.delivery_id, error=error
        )

    def record_feedback(
        self,
        owner_user_id: str,
        delivery_id: str,
        reaction: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        now: Optional[datetime] = None,
    ) -> Optional[dict]:
        return self.store.record_proactive_feedback(
            owner_user_id,
            ai_id,
            delivery_id,
            reaction,
            now=self._utc(now or utc_now()),
        )

    def inspect_status(
        self,
        owner_user_id: str,
        last_interaction_at: str | datetime | None,
        ai_id: str = DEFAULT_AI_ID,
        *,
        now: Optional[datetime] = None,
    ) -> dict:
        current = self._utc(now or utc_now())
        profile = self.store.get_profile(owner_user_id, ai_id)
        if not profile:
            return {"blocked_reason": "world_missing"}
        policy = self._policy(profile)
        deliveries = self.store.list_proactive_deliveries(owner_user_id, ai_id, limit=10)
        preferences = self.store.list_topic_preferences(owner_user_id, ai_id)
        local_now = current.astimezone(get_timezone(profile["timezone"]))
        day_start = local_now.replace(
            hour=0, minute=0, second=0, microsecond=0
        ).astimezone(timezone.utc)
        delivered_today = [
            item
            for item in deliveries
            if item["status"] == "delivered"
            and item["delivered_at"]
            and self._utc(item["delivered_at"]) >= day_start
        ]
        delivered = [item for item in deliveries if item["status"] == "delivered"]
        last_delivered = delivered[0] if delivered else None
        next_eligible_at = None
        if last_delivered and last_delivered["delivered_at"]:
            next_time = self._utc(last_delivered["delivered_at"]) + policy.cooldown
            if next_time > current:
                next_eligible_at = next_time.isoformat()

        absent_since = self._utc(last_interaction_at) if last_interaction_at else None
        candidates = self._ranked_candidates(
            owner_user_id, ai_id, absent_since=absent_since
        ) if absent_since else []
        in_flight = any(item["status"] == "claimed" for item in deliveries)
        if not profile["proactive_messages_enabled"]:
            blocked_reason = "disabled"
        elif not absent_since:
            blocked_reason = "no_chat_history"
        elif current - absent_since < policy.minimum_absence:
            blocked_reason = "absence_too_short"
        elif in_flight:
            blocked_reason = "in_flight"
        elif len(delivered_today) >= policy.max_daily:
            blocked_reason = "daily_limit"
        elif next_eligible_at:
            blocked_reason = "cooldown"
        elif not candidates:
            blocked_reason = "no_candidate"
        else:
            blocked_reason = "ready"
        candidate = candidates[0] if candidates else None
        return {
            "enabled": profile["proactive_messages_enabled"],
            "frequency": profile["proactive_frequency"],
            "blocked_reason": blocked_reason,
            "minimum_absence_hours": policy.minimum_absence.total_seconds() / 3600,
            "cooldown_hours": policy.cooldown.total_seconds() / 3600,
            "daily_limit": policy.max_daily,
            "delivered_today": len(delivered_today),
            "next_eligible_at": next_eligible_at,
            "next_candidate": {
                "event_id": candidate["event_id"],
                "summary": candidate["summary"],
                "topic": self._topic_for(candidate),
            } if candidate else None,
            "preferences": preferences,
            "recent_deliveries": deliveries,
        }

    def _ranked_candidates(
        self,
        owner_user_id: str,
        ai_id: str,
        *,
        absent_since: datetime,
    ) -> list[dict]:
        preferences = {
            item["topic"]: item["score"]
            for item in self.store.list_topic_preferences(owner_user_id, ai_id)
        }
        candidates = [
            event
            for event in self.store.list_events(
                owner_user_id,
                ai_id,
                limit=50,
                since=absent_since.isoformat(),
                min_importance=MIN_IMPORTANCE,
            )
            if event["mentionability"] >= MIN_MENTIONABILITY
            and event["disclosure_level"] != "private"
            and event["event_type"] not in EXCLUDED_EVENT_TYPES
        ]
        return sorted(
            candidates,
            key=lambda event: (
                event["mentionability"]
                + event["importance"] * 0.35
                + preferences.get(self._topic_for(event), 0) * 8,
                event["end_at"],
            ),
            reverse=True,
        )

    @staticmethod
    def _policy(profile: dict) -> ProactivePolicy:
        return FREQUENCY_POLICIES.get(
            profile.get("proactive_frequency", "natural"),
            FREQUENCY_POLICIES["natural"],
        )

    @staticmethod
    def _topic_for(event: dict) -> str:
        event_type = event["event_type"]
        if event.get("story_arc_id") or event_type in {
            "creative_practice", "focused_work"
        }:
            return "creative"
        if event_type == "friend_chat":
            return "social"
        if event_type in {"evening_walk", "walk", "outing"}:
            return "outdoors"
        if event_type in {"reading", "reflection"}:
            return "quiet_time"
        return "daily_life"

    @staticmethod
    def _compose(event: dict) -> str:
        summary = str(event["summary"]).strip().rstrip("。！？!? ")
        if event.get("facts", {}).get("arc_stage") == "completed":
            return f"你回来啦。我刚刚{summary}，很想第一个告诉你。"
        if event["event_type"] == "friend_chat":
            return f"你回来啦。你不在的时候，我{summary}。刚才还想到可以和你聊聊。"
        return f"你回来啦。你不在的时候，我{summary}。刚才忽然很想告诉你。"

    @staticmethod
    def _emotion_for(event: dict) -> str:
        if event.get("facts", {}).get("arc_stage") == "completed":
            return "excited"
        if event["event_type"] in {"friend_chat", "evening_walk", "creative_practice"}:
            return "happy"
        return "gentle"

    @staticmethod
    def _utc(value: str | datetime) -> datetime:
        return parse_datetime(value).astimezone(timezone.utc)
