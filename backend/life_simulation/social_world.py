"""把已经发生的朋友来往物化为租户隔离的社交世界痕迹。"""

from __future__ import annotations

import hashlib
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from .clock import get_timezone, parse_datetime, utc_now
from .character_registry import CharacterRegistry, SocialMomentDefinition
from .content_safety import ContentSafetyService
from .evidence import evidence_from_event
from .npc_life import NpcLifeService
from .npc_interactions import NpcInteractionService
from .npc_intentions import NpcIntentionService
from .npc_suggestions import NpcSuggestionService
from .store import DEFAULT_AI_ID, LifeStore


MAX_SOCIAL_EVENTS_PER_RUN = 3
DEFAULT_LOOKBACK_HOURS = 48
NPC_PUBLICABILITY_THRESHOLD = 50


@dataclass
class SocialWorldReport:
    scanned_events: int = 0
    matched_events: int = 0
    posts_created: int = 0
    likes_created: int = 0
    comments_created: int = 0
    skipped: int = 0

    def as_dict(self) -> dict[str, int]:
        return asdict(self)


class LifeSocialWorldService:
    """从客观生活事件生成可重放、可去重的朋友圈内容。"""

    def __init__(
        self,
        store: LifeStore,
        social_gateway: Any,
        characters: Optional[CharacterRegistry] = None,
        npc_life: Optional[NpcLifeService] = None,
        npc_interactions: Optional[NpcInteractionService] = None,
        npc_intentions: Optional[NpcIntentionService] = None,
        npc_suggestions: Optional[NpcSuggestionService] = None,
        content_safety: Optional[ContentSafetyService] = None,
    ):
        self.store = store
        self.social = social_gateway
        self.characters = characters or CharacterRegistry(store)
        self.npc_life = npc_life or NpcLifeService(store, self.characters)
        self.npc_interactions = npc_interactions or NpcInteractionService(
            store, self.characters
        )
        self.npc_intentions = npc_intentions or NpcIntentionService(
            store, self.characters
        )
        self.npc_suggestions = npc_suggestions or NpcSuggestionService(
            store, self.characters, self.npc_intentions
        )
        self.content_safety = content_safety or ContentSafetyService(
            store, self.characters
        )

    def materialize_due(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        now: Optional[datetime] = None,
        lookback_hours: int = DEFAULT_LOOKBACK_HOURS,
    ) -> SocialWorldReport:
        current = parse_datetime(now or utc_now())
        profile = self.store.get_profile(owner_user_id, ai_id)
        report = SocialWorldReport()
        if not profile or not profile.get("simulation_enabled"):
            return report
        if not profile.get("social_posts_enabled"):
            return report
        self.characters.ensure_world(owner_user_id, now=current)
        self.npc_life.settle_due(
            owner_user_id,
            profile["timezone"],
            now=current,
        )
        self.npc_interactions.materialize_due(
            owner_user_id,
            profile["timezone"],
            now=current,
            lead_ai_id=ai_id,
        )
        self.npc_suggestions.reconsider_due(
            owner_user_id,
            profile["timezone"],
            now=current,
        )
        self.npc_intentions.materialize_due(
            owner_user_id,
            profile["timezone"],
            now=current,
        )

        since = current - timedelta(hours=max(1, min(168, int(lookback_hours))))
        lead_events = self.store.list_events(
            owner_user_id,
            ai_id,
            limit=100,
            since=since.isoformat(),
        )
        contacts = self.characters.list_contacts(owner_user_id)
        npc_events: list[tuple[dict[str, Any], dict[str, Any]]] = []
        for contact in contacts:
            events = self.store.list_actor_events(
                owner_user_id,
                contact["actor_id"],
                since=since.isoformat(),
                min_importance=0,
                limit=100,
            )
            npc_events.extend((event, contact) for event in events)
        npc_events.sort(key=lambda item: item[0]["end_at"], reverse=True)
        report.scanned_events = len(lead_events) + len(npc_events)

        for event, contact in npc_events:
            if int(event.get("publicability", 0)) < NPC_PUBLICABILITY_THRESHOLD:
                continue
            if parse_datetime(event["end_at"]) > current:
                report.skipped += 1
                continue
            report.matched_events += 1
            self._materialize_actor_event(
                owner_user_id, ai_id, event, contact, report
            )
            if report.posts_created >= MAX_SOCIAL_EVENTS_PER_RUN:
                return report

        for event in lead_events:
            if event.get("event_type") != "friend_chat":
                continue
            event_at = parse_datetime(event["end_at"])
            if event_at > current:
                report.skipped += 1
                continue
            contact = self._event_contact(owner_user_id, event)
            if contact is None:
                report.skipped += 1
                continue
            report.matched_events += 1
            self._materialize_event(owner_user_id, ai_id, profile, event, contact, report)
            if report.posts_created >= MAX_SOCIAL_EVENTS_PER_RUN:
                break
        return report

    def _materialize_actor_event(
        self,
        owner_user_id: str,
        ai_id: str,
        event: dict[str, Any],
        contact: dict[str, Any],
        report: SocialWorldReport,
    ) -> None:
        post_key = f"npc-event-post:{owner_user_id}:{event['event_id']}"
        post = self.social.get_post_by_idempotency_key(owner_user_id, post_key)
        timestamp = self._social_timestamp(parse_datetime(event["end_at"]))
        if post is None:
            evidence = evidence_from_event(
                event,
                source_type="npc_life_event",
                actor_ids=(contact["actor_id"],),
                generation_reason="npc_autonomous_event",
                generator_version="npc-social-world-v2",
            )
            validation = self.content_safety.validate(
                owner_user_id,
                event["summary"],
                evidence,
                author_id=contact["actor_id"],
                channel="post",
            )
            post = self.social.create_post(
                owner_user_id=owner_user_id,
                author_id=contact["actor_id"],
                author_name=contact["display_name"],
                author_type="npc",
                author_avatar="",
                content=validation.text,
                location=event["location_id"],
                post_type="text",
                visibility="friends_only",
                source_event_ids=[event["event_id"]],
                life_world_time=event["end_at"],
                generation_reason="npc_autonomous_event",
                idempotency_key=post_key,
                content_evidence=validation.evidence.as_dict(),
                timestamp=timestamp,
            )
            if post is None:
                post = self.social.get_post_by_idempotency_key(
                    owner_user_id, post_key
                )
            else:
                report.posts_created += 1
        if post is None:
            report.skipped += 1
            return
        lead_name = self.characters.display_name(owner_user_id, ai_id)
        if self.social.ensure_like(
            post["id"], ai_id, lead_name, timestamp=timestamp
        ):
            report.likes_created += 1

    def _materialize_event(
        self,
        owner_user_id: str,
        ai_id: str,
        profile: dict[str, Any],
        event: dict[str, Any],
        contact: dict[str, Any],
        report: SocialWorldReport,
    ) -> None:
        event_at = parse_datetime(event["end_at"])
        local_date = event_at.astimezone(get_timezone(profile["timezone"])).date().isoformat()
        post_key = f"npc-post:{owner_user_id}:{contact['actor_id']}:{local_date}"
        post = self.social.get_post_by_idempotency_key(owner_user_id, post_key)
        moment = self._choose_moment(owner_user_id, contact, local_date)
        timestamp = self._social_timestamp(event_at)
        if post is None:
            evidence = evidence_from_event(
                event,
                source_type="una_life_event",
                actor_ids=(ai_id, *event.get("participant_ids", [])),
                generation_reason="npc_social_world",
                generator_version="npc-social-world-v2",
            )
            validation = self.content_safety.validate(
                owner_user_id,
                moment.content,
                evidence,
                author_id=contact["actor_id"],
                channel="post",
            )
            post = self.social.create_post(
                owner_user_id=owner_user_id,
                author_id=contact["actor_id"],
                author_name=contact["display_name"],
                author_type="npc",
                author_avatar="",
                content=validation.text,
                location=moment.location,
                post_type="text",
                visibility="friends_only",
                source_event_ids=[event["event_id"]],
                life_world_time=event["end_at"],
                generation_reason="npc_social_world",
                idempotency_key=post_key,
                content_evidence=validation.evidence.as_dict(),
                timestamp=timestamp,
            )
            if post is None:
                post = self.social.get_post_by_idempotency_key(owner_user_id, post_key)
            else:
                report.posts_created += 1
        if post is None:
            report.skipped += 1
            return

        lead_name = self.characters.display_name(owner_user_id, ai_id)
        if self.social.ensure_like(post["id"], ai_id, lead_name, timestamp=timestamp):
            report.likes_created += 1

        comment_key = f"npc-comment:{owner_user_id}:{ai_id}:{post['id']}"
        existing_comment = self.social.get_comment_by_idempotency_key(post["id"], comment_key)
        if existing_comment is None:
            comment = self.social.add_comment(
                post_id=post["id"],
                user_id=ai_id,
                user_name=lead_name,
                content=moment.lead_comment,
                generation_reason="npc_social_world",
                source_event_id=event["event_id"],
                idempotency_key=comment_key,
                timestamp=timestamp,
            )
            if comment is not None:
                report.comments_created += 1

    def _event_contact(
        self, owner_user_id: str, event: dict[str, Any]
    ) -> Optional[dict[str, Any]]:
        for participant_id in event.get("participant_ids", []):
            contact = self.characters.get_actor(owner_user_id, participant_id)
            if contact is not None and contact.get("actor_role") == "friend":
                return contact
        return None

    @staticmethod
    def _choose_moment(
        owner_user_id: str,
        contact: dict[str, Any],
        local_date: str,
    ) -> SocialMomentDefinition:
        moments = contact.get("social_moments", [])
        if not moments:
            raise ValueError(f"角色 {contact['actor_id']} 没有社交素材")
        raw = f"{owner_user_id}:{contact['actor_id']}:{local_date}:social-moment".encode("utf-8")
        index = int.from_bytes(hashlib.sha256(raw).digest()[:2], "big") % len(moments)
        return moments[index]

    @staticmethod
    def _social_timestamp(value: datetime) -> str:
        """SQLite 的社交层沿用无时区 UTC 字符串，兼容现有前端相对时间解析。"""
        current = parse_datetime(value).astimezone(timezone.utc)
        return current.strftime("%Y-%m-%d %H:%M:%S")
