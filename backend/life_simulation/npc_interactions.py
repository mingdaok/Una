"""NPC 关系与互动 v1：共同事件、多方视角和双向关系变化。"""

from __future__ import annotations

import hashlib
from dataclasses import asdict, dataclass
from datetime import datetime, time, timedelta
from typing import Any, Optional

from .character_registry import CharacterRegistry, InteractionTemplateDefinition
from .clock import calendar_windows, get_timezone, parse_datetime, utc_now
from .invitation_engine import InvitationDecisionEngine
from .important_decisions import ImportantDecisionAdvisor
from .candidates import ActionCandidate
from .utility import ScoredCandidate
from .models import LifeWindow
from .models import RelationshipChange
from .relationship_dynamics import RelationshipDynamics
from .store import DEFAULT_AI_ID, LifeStore


INTERACTION_LOOKBACK_DAYS = 7


@dataclass
class InteractionSettlementReport:
    scanned_days: int = 0
    npc_events_created: int = 0
    lead_events_bridged: int = 0
    skipped: int = 0
    conflicts_created: int = 0
    repairs_created: int = 0
    invitations_created: int = 0
    invitations_accepted: int = 0
    invitations_postponed: int = 0
    invitations_rejected: int = 0

    def as_dict(self) -> dict[str, int]:
        return asdict(self)


class NpcInteractionService:
    def __init__(
        self,
        store: LifeStore,
        characters: CharacterRegistry,
        dynamics: Optional[RelationshipDynamics] = None,
        important_advisor: Optional[ImportantDecisionAdvisor] = None,
    ):
        self.store = store
        self.characters = characters
        self.dynamics = dynamics or RelationshipDynamics(store, characters)
        self.invitation_decisions = InvitationDecisionEngine(
            version="npc-bidirectional-social-v2"
        )
        self.important_advisor = important_advisor or ImportantDecisionAdvisor.from_environment(store)

    def prepare_due(
        self, owner_user_id: str, timezone_name: str, *,
        now: Optional[datetime] = None,
        lookback_days: int = INTERACTION_LOOKBACK_DAYS,
    ) -> InteractionSettlementReport:
        current = parse_datetime(now or utc_now())
        report = InteractionSettlementReport()
        self.characters.ensure_world(owner_user_id, now=current)
        contacts = self.characters.list_contacts(owner_user_id)
        if len(contacts) < 2:
            return report
        since = current - timedelta(days=max(1, min(14, lookback_days)))
        self._prepare_npc_days(
            owner_user_id, contacts, timezone_name, since, current, report
        )
        return report

    def materialize_due(
        self,
        owner_user_id: str,
        timezone_name: str,
        *,
        now: Optional[datetime] = None,
        lead_ai_id: str = DEFAULT_AI_ID,
        lookback_days: int = INTERACTION_LOOKBACK_DAYS,
    ) -> InteractionSettlementReport:
        current = parse_datetime(now or utc_now())
        report = InteractionSettlementReport()
        self.characters.ensure_world(owner_user_id, now=current)
        contacts = self.characters.list_contacts(owner_user_id)
        if not contacts:
            return report
        since = current - timedelta(days=max(1, min(14, lookback_days)))
        self._bridge_lead_events(
            owner_user_id,
            lead_ai_id,
            contacts,
            since,
            current,
            report,
        )
        if len(contacts) >= 2:
            self._materialize_npc_days(
                owner_user_id,
                contacts,
                timezone_name,
                since,
                current,
                report,
            )
        return report

    def _bridge_lead_events(
        self,
        owner_user_id: str,
        lead_ai_id: str,
        contacts: list[dict[str, Any]],
        since: datetime,
        current: datetime,
        report: InteractionSettlementReport,
    ) -> None:
        contact_by_id = {item["actor_id"]: item for item in contacts}
        events = self.store.list_events(
            owner_user_id,
            lead_ai_id,
            since=since.isoformat(),
            limit=100,
        )
        lead_name = self.characters.display_name(owner_user_id, lead_ai_id)
        for source in reversed(events):
            if source.get("event_type") != "friend_chat":
                continue
            contact = None
            for participant_id in source.get("participant_ids", []):
                canonical = self.characters.canonical_actor_id(participant_id)
                if canonical in contact_by_id:
                    contact = contact_by_id[canonical]
                    break
            if contact is None:
                report.skipped += 1
                continue
            event_key = f"interaction-from-life:{owner_user_id}:{source['event_id']}"
            event_id = self._stable_id(event_key)
            _, created = self.store.create_interaction_event(
                owner_user_id,
                event={
                    "event_id": event_id,
                    "event_type": "lead_npc_conversation",
                    "status": "completed",
                    "start_at": source["start_at"],
                    "end_at": source["end_at"],
                    "location_id": source["location_id"],
                    "summary": source["summary"],
                    "facts": {
                        "source_kind": "lead_life_event",
                        "source_event_id": source["event_id"],
                    },
                    "importance": source["importance"],
                    "mentionability": source["mentionability"],
                    "publicability": source["publicability"],
                    "idempotency_key": event_key,
                },
                participants=[
                    {"actor_id": lead_ai_id, "participant_role": "initiator"},
                    {
                        "actor_id": contact["actor_id"],
                        "participant_role": "participant",
                    },
                ],
                perspectives={
                    lead_ai_id: {
                        "interpretation": source.get("interpretation", ""),
                        "private_thought": source.get("private_thought", ""),
                        "disclosure_level": source.get(
                            "disclosure_level", "familiar"
                        ),
                    },
                    contact["actor_id"]: {
                        "interpretation": "这次交流让彼此的近况重新接上了。",
                        "private_thought": "有人认真听自己说完，是件让人放松的事。",
                        "emotion_delta": {"social_need": -12},
                        "disclosure_level": "familiar",
                    },
                },
                relationship_changes=[
                    (
                        contact["actor_id"],
                        RelationshipChange(
                            other_ai_id=lead_ai_id,
                            display_name=lead_name,
                            familiarity_delta=3,
                            affinity_delta=2,
                            trust_delta=1,
                            tension_delta=-1,
                            private_summary=(
                                f"和{lead_name}的交流比之前更自然了一点。"
                            ),
                        ),
                    )
                ],
                now=current,
            )
            if created:
                report.lead_events_bridged += 1

    def _materialize_npc_days(
        self,
        owner_user_id: str,
        contacts: list[dict[str, Any]],
        timezone_name: str,
        since: datetime,
        current: datetime,
        report: InteractionSettlementReport,
    ) -> None:
        del timezone_name, since
        contacts_by_id = {item["actor_id"]: item for item in contacts}
        for invitation in reversed(
            self.store.list_interaction_invitations(
                owner_user_id, status="accepted", limit=200
            )
        ):
            if parse_datetime(invitation["ends_at"]) > current:
                continue
            if any(
                event.get("facts", {}).get("invitation_id")
                == invitation["invitation_id"]
                for event in self.store.list_interaction_events(
                    owner_user_id, since=invitation["starts_at"],
                    before=invitation["ends_at"], limit=20,
                )
            ):
                report.skipped += 1
                continue
            actor_a = contacts_by_id.get(invitation["initiator_actor_id"])
            actor_b = contacts_by_id.get(invitation["target_actor_id"])
            if not actor_a or not actor_b:
                report.skipped += 1
                continue
            actor_events = {}
            for actor in (actor_a, actor_b):
                matches = [
                    event for event in self.store.list_actor_events(
                        owner_user_id, actor["actor_id"],
                        since=invitation["starts_at"],
                        before=(
                            parse_datetime(invitation["ends_at"])
                            + timedelta(seconds=1)
                        ).isoformat(),
                        limit=20,
                    )
                    if event["location_id"] == invitation["location_id"]
                    and event["status"] == "completed"
                    and event["event_type"] == "social_invitation"
                ]
                if not matches:
                    actor_events = {}
                    break
                actor_events[actor["actor_id"]] = matches[0]["schedule_id"]
            if len(actor_events) != 2:
                report.skipped += 1
                continue
            template = next(
                item for item in self.characters.catalog.interaction_templates
                if item.interaction_id == invitation["interaction_template"]
            )
            evening = type("InvitationWindow", (), {
                "start_at": parse_datetime(invitation["starts_at"]),
                "end_at": parse_datetime(invitation["ends_at"]),
            })()
            created = self._create_npc_interaction(
                owner_user_id, actor_a, actor_b, template, evening,
                actor_events, current, invitation_id=invitation["invitation_id"],
            )
            if created:
                report.npc_events_created += 1
                if template.interaction_kind == "conflict":
                    report.conflicts_created += 1
                elif template.interaction_kind == "repair":
                    report.repairs_created += 1

    def _prepare_npc_days(
        self, owner_user_id: str, contacts: list[dict[str, Any]],
        timezone_name: str, since: datetime, current: datetime,
        report: InteractionSettlementReport,
    ) -> None:
        timezone = get_timezone(timezone_name)
        day = since.astimezone(timezone).date()
        final_day = current.astimezone(timezone).date()
        while day <= final_day:
            report.scanned_days += 1
            day_start = datetime.combine(day, time.min, tzinfo=timezone)
            evening = next(
                (window for window in calendar_windows(
                    day_start, day_start + timedelta(days=1), timezone_name
                ) if window.key == "evening"), None,
            )
            if (
                evening is None or evening.end_at > current
                or not self._is_interaction_day(owner_user_id, day.toordinal())
            ):
                day += timedelta(days=1)
                continue
            actor_a, actor_b = self._pair_for_day(
                owner_user_id, contacts, day.toordinal()
            )
            template = self._template_for_day(
                owner_user_id, actor_a, actor_b, day.toordinal()
            )
            key = (
                f"npc-invitation:{owner_user_id}:{day.isoformat()}:"
                f"{actor_a['actor_id']}:{actor_b['actor_id']}:{template.interaction_id}"
            )
            invitation = {
                "invitation_id": self._stable_id(key),
                "idempotency_key": key,
                "initiator_actor_id": actor_a["actor_id"],
                "target_actor_id": actor_b["actor_id"],
                "interaction_template": template.interaction_id,
                "starts_at": evening.start_at.isoformat(),
                "ends_at": evening.end_at.isoformat(),
                "location_id": template.location_id,
                "title": template.summary_template.format(
                    actor_a=actor_a["display_name"], actor_b=actor_b["display_name"]
                ),
            }
            if self.store.actor_has_commitment_conflict(
                owner_user_id, actor_a["actor_id"],
                starts_at=invitation["starts_at"], ends_at=invitation["ends_at"],
                location_id=invitation["location_id"],
            ):
                report.skipped += 1
                day += timedelta(days=1)
                continue
            relationship = next(
                (item for item in self.store.list_relationships(
                    owner_user_id, actor_b["actor_id"], limit=50
                ) if item["other_ai_id"] == actor_a["actor_id"]), None,
            )
            decision = self.invitation_decisions.decide(
                owner_user_id, invitation,
                target_state=self.store.get_actor_state(
                    owner_user_id, actor_b["actor_id"]
                ) or {},
                relationship=relationship,
                has_conflict=self.store.actor_has_commitment_conflict(
                    owner_user_id, actor_b["actor_id"],
                    starts_at=invitation["starts_at"], ends_at=invitation["ends_at"],
                    location_id=invitation["location_id"],
                ),
            )
            decision = self._advise_invitation(
                owner_user_id, actor_b, invitation,
                target_state=self.store.get_actor_state(
                    owner_user_id, actor_b["actor_id"]
                ) or {},
                rule_decision=decision,
            )
            _, created = self.store.record_interaction_invitation(
                owner_user_id, invitation=invitation,
                decision=asdict(decision), now=current,
            )
            if created:
                report.invitations_created += 1
                setattr(
                    report, f"invitations_{decision.status}",
                    getattr(report, f"invitations_{decision.status}") + 1,
                )
            day += timedelta(days=1)

    def _advise_invitation(
        self, owner: str, actor: dict[str, Any], invitation: dict[str, Any], *,
        target_state: dict[str, Any], rule_decision: Any,
    ) -> Any:
        status_scores = {
            "accepted": int(rule_decision.score),
            "postponed": int(rule_decision.score) - 2,
            "rejected": int(rule_decision.score) - 4,
        }
        candidates = tuple(
            ScoredCandidate(
                candidate=ActionCandidate(
                    candidate_id=f"invitation:{invitation['invitation_id']}:{status}",
                    action_type=f"invitation_{status}",
                    activity_id=f"invitation:{status}",
                    location_id=invitation["location_id"],
                    summary={
                        "accepted": "接受这次重要邀请。",
                        "postponed": "推迟这次重要邀请。",
                        "rejected": "拒绝这次重要邀请。",
                    }[status],
                    source="invitation", duration_minutes=1,
                    metadata={"invitation_id": invitation["invitation_id"]},
                ),
                score=score,
                components={"relationship_motivation": score},
            )
            for status, score in status_scores.items()
        )
        rule_id = f"invitation:{invitation['invitation_id']}:{rule_decision.status}"
        advice = self.important_advisor.consider(
            owner, actor, target_state,
            LifeWindow(
                "invitation", "重要邀请",
                parse_datetime(invitation["starts_at"]),
                parse_datetime(invitation["starts_at"]) + timedelta(minutes=1),
            ),
            candidates, rule_selected_id=rule_id, has_hard_commitment=False,
        )
        if not advice.used_llm:
            return rule_decision
        from .invitation_engine import InvitationDecision
        selected = advice.selected_candidate_id.rsplit(":", 1)[-1]
        return InvitationDecision(
            selected, "important_decision_llm",
            advice.public_reason or rule_decision.public_reason,
            advice.private_reason or rule_decision.private_reason,
            int(rule_decision.score),
        )

    def _create_npc_interaction(
        self,
        owner_user_id: str,
        actor_a: dict[str, Any],
        actor_b: dict[str, Any],
        template: InteractionTemplateDefinition,
        evening: Any,
        schedules: dict[str, str],
        current: datetime,
        invitation_id: str | None = None,
    ) -> bool:
        event_key = (
            f"npc-interaction:{owner_user_id}:{evening.start_at.date().isoformat()}:"
            f"{actor_a['actor_id']}:{actor_b['actor_id']}:{template.interaction_id}"
        )
        event_start = evening.start_at + timedelta(hours=2)
        event_end = event_start + timedelta(minutes=45)
        summary = template.summary_template.format(
            actor_a=actor_a["display_name"], actor_b=actor_b["display_name"]
        )
        delta = template.relationship_delta

        def relationship_change(target: dict[str, Any]) -> RelationshipChange:
            return RelationshipChange(
                other_ai_id=target["actor_id"],
                display_name=target["display_name"],
                familiarity_delta=int(delta.get("familiarity", 0)),
                affinity_delta=int(delta.get("affinity", 0)),
                trust_delta=int(delta.get("trust", 0)),
                tension_delta=int(delta.get("tension", 0)),
                obligation_delta=int(delta.get("obligation", 0)),
                private_summary=(
                    f"和{target['display_name']}最近有了一次新的共同经历。"
                ),
            )

        _, created = self.store.create_interaction_event(
            owner_user_id,
            event={
                "event_id": self._stable_id(event_key),
                "event_type": template.event_type,
                "status": "completed",
                "start_at": event_start,
                "end_at": event_end,
                "location_id": template.location_id,
                "summary": summary,
                "facts": {
                    "source_kind": "npc_schedule_overlap",
                    "interaction_template": template.interaction_id,
                    "interaction_kind": template.interaction_kind,
                    "source_schedule_ids": list(schedules.values()),
                    "invitation_id": invitation_id,
                },
                "importance": template.importance,
                "mentionability": template.mentionability,
                "publicability": template.publicability,
                "idempotency_key": event_key,
            },
            participants=[
                {"actor_id": actor_a["actor_id"], "participant_role": "initiator"},
                {
                    "actor_id": actor_b["actor_id"],
                    "participant_role": "participant",
                },
            ],
            perspectives={
                actor_a["actor_id"]: {
                    "interpretation": template.actor_a_interpretation,
                    "private_thought": template.actor_a_private_thought,
                    "emotion_delta": self._emotion_delta(template.interaction_kind),
                    "disclosure_level": "familiar",
                },
                actor_b["actor_id"]: {
                    "interpretation": template.actor_b_interpretation,
                    "private_thought": template.actor_b_private_thought,
                    "emotion_delta": self._emotion_delta(template.interaction_kind),
                    "disclosure_level": "familiar",
                },
            },
            relationship_changes=[
                (actor_a["actor_id"], relationship_change(actor_b)),
                (actor_b["actor_id"], relationship_change(actor_a)),
            ],
            now=current,
        )
        return created

    def _completed_evening_schedules(
        self,
        owner_user_id: str,
        actors: tuple[dict[str, Any], dict[str, Any]],
        evening: Any,
    ) -> Optional[dict[str, str]]:
        result = {}
        for actor in actors:
            schedules = self.store.list_actor_schedules(
                owner_user_id,
                actor["actor_id"],
                after=evening.start_at.isoformat(),
                before=evening.end_at.isoformat(),
                status="completed",
                limit=10,
            )
            schedule = next(
                (item for item in schedules if item["window_key"] == "evening"),
                None,
            )
            if schedule is None:
                return None
            result[actor["actor_id"]] = schedule["schedule_id"]
        return result

    def _has_npc_interaction_for_window(
        self, owner_user_id: str, evening: Any
    ) -> bool:
        events = self.store.list_interaction_events(
            owner_user_id,
            since=evening.start_at.isoformat(),
            before=evening.end_at.isoformat(),
            limit=20,
        )
        return any(
            event.get("facts", {}).get("source_kind") == "npc_schedule_overlap"
            for event in events
        )

    def _template_for_day(
        self,
        owner_user_id: str,
        actor_a: dict[str, Any],
        actor_b: dict[str, Any],
        ordinal: int,
    ) -> InteractionTemplateDefinition:
        kind = self.dynamics.interaction_kind(
            owner_user_id, actor_a["actor_id"], actor_b["actor_id"], ordinal
        )
        templates = self.dynamics.eligible_templates(
            owner_user_id, actor_a["actor_id"], actor_b["actor_id"], kind
        )
        if not templates:
            templates = self.dynamics.eligible_templates(
                owner_user_id,
                actor_a["actor_id"],
                actor_b["actor_id"],
                "supportive",
            )
        index = self._seed(owner_user_id, ordinal, kind, "template") % len(templates)
        return templates[index]

    def _pair_for_day(
        self,
        owner_user_id: str,
        contacts: list[dict[str, Any]],
        ordinal: int,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        ordered = sorted(contacts, key=lambda item: item["actor_id"])
        pairs = [
            (ordered[left], ordered[right])
            for left in range(len(ordered))
            for right in range(left + 1, len(ordered))
        ]
        return max(
            pairs,
            key=lambda pair: (
                self.dynamics.pair_priority(
                    owner_user_id,
                    pair[0]["actor_id"],
                    pair[1]["actor_id"],
                    ordinal,
                ),
                pair[0]["actor_id"],
                pair[1]["actor_id"],
            ),
        )

    @staticmethod
    def _emotion_delta(kind: str) -> dict[str, int]:
        if kind == "conflict":
            return {"social_need": 8, "stress": 16}
        if kind == "repair":
            return {"social_need": -10, "stress": -12}
        return {"social_need": -16, "stress": -4}

    def _is_interaction_day(self, owner_user_id: str, ordinal: int) -> bool:
        offset = self._seed(owner_user_id, "cadence") % 3
        return (ordinal + offset) % 3 == 0

    @staticmethod
    def _seed(*parts: Any) -> int:
        raw = ":".join(str(part) for part in parts).encode("utf-8")
        return int.from_bytes(hashlib.sha256(raw).digest()[:8], "big")

    @staticmethod
    def _stable_id(value: str) -> str:
        return hashlib.sha256(value.encode("utf-8")).hexdigest()[:32]


__all__ = ["InteractionSettlementReport", "NpcInteractionService"]
