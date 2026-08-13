"""Candidate aggregation for state-driven NPC action selection."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field, replace
from typing import Any, Iterable, Sequence

from .action_catalog import ActionAtomDefinition, ActionCatalog
from .character_registry import RoutineActivityDefinition
from .clock import parse_datetime
from .models import LifeWindow
from .locations import location_name


@dataclass(frozen=True)
class ActionCandidate:
    candidate_id: str
    action_type: str
    activity_id: str
    location_id: str
    summary: str
    source: str
    duration_minutes: int
    categories: tuple[str, ...] = ()
    subject: str = ""
    base_cost: dict[str, int] = field(default_factory=dict)
    base_effect: dict[str, int] = field(default_factory=dict)
    requirements: dict[str, int] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


class CandidateGenerator:
    def __init__(self, catalog: ActionCatalog):
        self.catalog = catalog

    def generate(
        self,
        actor: dict[str, Any],
        state: dict[str, Any],
        window: LifeWindow,
        *,
        routine_activities: Sequence[RoutineActivityDefinition],
        recent_events: Sequence[dict[str, Any]],
        goals: Sequence[dict[str, Any]] = (),
        commitments: Sequence[dict[str, Any]] = (),
        opportunities: Sequence[dict[str, Any]] = (),
        relationships: Sequence[dict[str, Any]] = (),
        memories: Sequence[dict[str, Any]] = (),
    ) -> tuple[ActionCandidate, ...]:
        del recent_events  # repetition is evaluated by UtilityScorer
        candidates = [
            self._from_routine(actor, window, activity)
            for activity in routine_activities
        ]
        for atom in self.catalog.for_window(window.key):
            source = self._need_source(atom, state)
            if source:
                candidates.append(self._from_atom(actor, window, atom, source))
        goal_atom = self.catalog.get("focus_project")
        if goal_atom and window.key in goal_atom.window_keys:
            for goal in goals[:3]:
                if goal.get("status") != "active":
                    continue
                base = self._from_atom(actor, window, goal_atom, "goal")
                candidates.append(
                    replace(
                        base,
                        candidate_id=self._id(
                            actor["actor_id"], window, "goal", goal["goal_id"]
                        ),
                        activity_id=f"goal:{goal['goal_id']}",
                        subject=goal["title"],
                        summary=f"继续推进“{goal['title']}”，完成了一段可以保留下来的进度。",
                        metadata={
                            **base.metadata,
                            "goal_id": goal["goal_id"],
                            "goal_priority": int(goal.get("priority", 50)),
                            "goal_progress": float(goal.get("progress", 0)),
                            # NPC 自主建立的长期兴趣可以成为朋友圈素材；用户建议
                            # 默认保持熟人级披露，避免把私下建议自动公开。
                            "publicability": (
                                52 if goal.get("origin") == "self_generated" else 20
                            ),
                        },
                    )
                )
        for commitment in commitments:
            if commitment.get("status") != "accepted":
                continue
            if commitment.get("starts_at") != window.start_at.isoformat():
                continue
            candidates.append(
                ActionCandidate(
                    candidate_id=self._id(
                        actor["actor_id"], window, "commitment", commitment["commitment_id"]
                    ),
                    action_type=commitment.get("commitment_type", "commitment"),
                    activity_id=f"commitment:{commitment['commitment_id']}",
                    location_id=commitment.get("location_id", "home"),
                    summary=commitment["title"], source="commitment",
                    duration_minutes=max(1, int((parse_datetime(commitment["ends_at"]) - parse_datetime(commitment["starts_at"])).total_seconds() // 60)),
                    categories=("commitment",), metadata={
                        "commitment_id": commitment["commitment_id"],
                        "flexibility": commitment.get("flexibility", "soft"),
                        "travel_included": commitment.get("flexibility") == "hard",
                    },
                )
            )
        for opportunity in opportunities:
            atom = self.catalog.get(opportunity.get("action_type", "explore"))
            if atom is None:
                continue
            base = self._from_atom(actor, window, atom, "environment")
            candidates.append(
                replace(
                    base,
                    candidate_id=self._id(
                        actor["actor_id"], window, "opportunity",
                        opportunity["opportunity_id"],
                    ),
                    activity_id=f"opportunity:{opportunity['opportunity_id']}",
                    location_id=opportunity["location_id"],
                    summary=opportunity["title"],
                    source="environment",
                    categories=tuple(dict.fromkeys((*base.categories, *opportunity.get("tags", ())))),
                    metadata={
                        **base.metadata,
                        **opportunity.get("metadata", {}),
                        "opportunity_id": opportunity["opportunity_id"],
                        "opportunity_type": opportunity["opportunity_type"],
                        "publicability": 55,
                        "mentionability": 65,
                    },
                )
            )
        connect_atom = self.catalog.get("connect")
        if connect_atom and window.key in connect_atom.window_keys:
            relationship_by_actor = {
                item.get("other_ai_id"): item
                for item in relationships
                if item.get("other_ai_id")
            }
            for relationship in relationships[:3]:
                target_id = relationship.get("other_ai_id")
                if not target_id:
                    continue
                display_name = relationship.get("display_name") or target_id
                base = self._from_atom(actor, window, connect_atom, "relationship")
                tension = int(relationship.get("tension", 0))
                repair = tension >= 24 and int(relationship.get("trust", 0)) >= 18
                candidates.append(replace(
                    base,
                    candidate_id=self._id(
                        actor["actor_id"], window, "relationship", target_id,
                        "repair" if repair else "connect",
                    ),
                    activity_id=f"relationship:{target_id}",
                    location_id="online",
                    subject=str(display_name),
                    summary=(
                        f"想起和{display_name}之间还有些话没说清，于是发去一条克制的消息。"
                        if repair else
                        f"想到{display_name}最近的近况，便发去一条不催回复的消息。"
                    ),
                    metadata={
                        **base.metadata,
                        "target_actor_id": target_id,
                        "relationship_familiarity": int(relationship.get("familiarity", 0)),
                        "relationship_affinity": int(relationship.get("affinity", 0)),
                        "relationship_trust": int(relationship.get("trust", 0)),
                        "relationship_tension": tension,
                        "relationship_repair": repair,
                        "last_interaction_at": relationship.get("last_interaction_at"),
                        "publicability": 12,
                    },
                ))
            for memory in memories[:3]:
                metadata = memory.get("metadata") or {}
                target_id = metadata.get("other_actor_id")
                if not target_id and memory.get("source_kind") == "npc_interaction":
                    target_id = next(iter(relationship_by_actor), None)
                relationship = relationship_by_actor.get(target_id) or {}
                display_name = relationship.get("display_name") or "一位熟悉的人"
                base = self._from_atom(actor, window, connect_atom, "memory")
                candidates.append(replace(
                    base,
                    candidate_id=self._id(
                        actor["actor_id"], window, "memory", memory["memory_id"]
                    ),
                    activity_id=f"memory:{memory['memory_id']}",
                    location_id="online",
                    subject=f"memory:{memory['memory_id']}",
                    summary=f"一段和{display_name}有关的旧交流重新浮现，于是认真整理了该怎样回应。",
                    metadata={
                        **base.metadata,
                        "memory_id": memory["memory_id"],
                        "memory_kind": memory.get("memory_kind"),
                        "memory_source_kind": memory.get("source_kind"),
                        "memory_confidence": int(memory.get("confidence", 0)),
                        "memory_learned_at": memory.get("learned_at"),
                        "target_actor_id": target_id,
                        "publicability": 8,
                    },
                ))
        deduplicated: dict[tuple[str, str, str], ActionCandidate] = {}
        for candidate in candidates:
            key = (
                candidate.action_type,
                candidate.location_id,
                candidate.subject,
            )
            existing = deduplicated.get(key)
            if existing is None or (
                existing.source != "routine" and candidate.source == "routine"
            ):
                deduplicated[key] = candidate
        return tuple(deduplicated.values())

    def _from_routine(
        self,
        actor: dict[str, Any],
        window: LifeWindow,
        activity: RoutineActivityDefinition,
    ) -> ActionCandidate:
        atom = self.catalog.get(activity.event_type)
        duration = self._duration(
            actor["actor_id"], window, activity.activity_id,
            atom.duration_minutes if atom else (30, 120),
        )
        duration = min(
            duration,
            max(1, int((window.end_at - window.start_at).total_seconds() // 60)),
        )
        return ActionCandidate(
            candidate_id=self._id(
                actor["actor_id"], window, activity.event_type,
                activity.location_id, activity.activity_id,
            ),
            action_type=activity.event_type,
            activity_id=activity.activity_id,
            location_id=activity.location_id,
            summary=activity.summary,
            source="routine",
            duration_minutes=duration,
            categories=atom.categories if atom else ("routine",),
            base_cost=dict(atom.base_cost) if atom else {},
            base_effect=(
                dict(atom.base_effect) if atom else dict(activity.state_delta)
            ),
            requirements=dict(atom.requirements) if atom else {},
            metadata={
                "interpretation": activity.interpretation,
                "private_thought": activity.private_thought,
                "importance": activity.importance,
                "mentionability": activity.mentionability,
                "publicability": activity.publicability,
                "routine_state_delta": dict(activity.state_delta),
                # A configured routine is itself an explicit declaration that the
                # actor can perform this activity at its declared location. Generic
                # atom locations still constrain need/state-generated candidates.
                "allowed_locations": [activity.location_id],
                "required_resources": list(atom.required_resources) if atom else [],
                "risk_level": atom.risk_level if atom else "ordinary",
            },
        )

    def _from_atom(
        self,
        actor: dict[str, Any],
        window: LifeWindow,
        atom: ActionAtomDefinition,
        source: str,
    ) -> ActionCandidate:
        interests = tuple(actor.get("interests") or ("自己的兴趣",))
        subject = self._pick(interests, actor["actor_id"], window, atom.action_type, "subject")
        location = self._pick(
            atom.allowed_locations, actor["actor_id"], window, atom.action_type, "location"
        )
        template = self._pick(
            atom.summary_templates, actor["actor_id"], window, atom.action_type, "summary"
        )
        summary = template.format(
            actor=actor.get("display_name", actor["actor_id"]),
            interest=subject,
            location=location_name(location),
        )
        activity_id = f"{atom.action_type}:{location}:{subject}"
        return ActionCandidate(
            candidate_id=self._id(
                actor["actor_id"], window, atom.action_type, location, subject
            ),
            action_type=atom.action_type,
            activity_id=activity_id,
            location_id=location,
            summary=summary,
            source=source,
            duration_minutes=self._duration(
                actor["actor_id"], window, atom.action_type, atom.duration_minutes
            ),
            categories=atom.categories,
            subject=subject,
            base_cost=dict(atom.base_cost),
            base_effect=dict(atom.base_effect),
            requirements=dict(atom.requirements),
            metadata={
                "importance": 32,
                "mentionability": 42,
                "publicability": 20,
                "allowed_locations": list(atom.allowed_locations),
                "required_resources": list(atom.required_resources),
                "risk_level": atom.risk_level,
            },
        )

    @staticmethod
    def _need_source(atom: ActionAtomDefinition, state: dict[str, Any]) -> str | None:
        categories = set(atom.categories)
        action_type = atom.action_type
        if action_type == "sleep" and state.get("energy", 70) <= 32:
            return "need"
        if categories & {"recovery", "quiet"} and (
            state.get("energy", 70) <= 45 or state.get("stress", 25) >= 55
        ):
            return "need"
        if "meal" in categories and state.get("hunger", 25) >= 52:
            return "need"
        if "social" in categories and state.get("social_need", 25) >= 55:
            return "need"
        if categories & {"novelty", "exploration"} and state.get("boredom", 25) >= 55:
            return "need"
        if "productive" in categories and state.get("focus", 50) >= 62:
            return "state"
        return None

    @staticmethod
    def _digest(*parts: Any) -> bytes:
        raw = ":".join(str(part) for part in parts).encode("utf-8")
        return hashlib.sha256(raw).digest()

    @classmethod
    def _pick(cls, values: Iterable[str], *parts: Any) -> str:
        options = tuple(values)
        if not options:
            raise ValueError("候选参数选项不能为空")
        index = int.from_bytes(cls._digest(*parts)[:8], "big") % len(options)
        return options[index]

    @classmethod
    def _duration(
        cls, actor_id: str, window: LifeWindow, key: str, bounds: tuple[int, int]
    ) -> int:
        minimum, maximum = bounds
        span = maximum - minimum
        if span <= 0:
            return minimum
        value = int.from_bytes(
            cls._digest(actor_id, window.start_at.isoformat(), key, "duration")[:8],
            "big",
        )
        return minimum + value % (span + 1)

    @classmethod
    def _id(cls, actor_id: str, window: LifeWindow, *parts: Any) -> str:
        return "candidate_" + cls._digest(
            actor_id, window.start_at.isoformat(), *parts
        ).hex()[:20]


__all__ = ["ActionCandidate", "CandidateGenerator"]
