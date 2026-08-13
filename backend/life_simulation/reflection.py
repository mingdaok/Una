"""Daily/weekly reflection and deterministic memory consolidation."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from .clock import parse_datetime
from .goal_lifecycle import GoalLifecycleService
from .store import LifeStore


@dataclass
class ReflectionReport:
    created: int = 0
    memories_created: int = 0
    memories_consolidated: int = 0
    memories_decayed: int = 0
    relationships_decayed: int = 0
    goal_transitions: int = 0
    reflections: list[dict[str, Any]] = field(default_factory=list)


class MemoryConsolidator:
    def __init__(self, store: LifeStore):
        self.store = store

    def consolidate(
        self, owner_user_id: str, actor_id: str, *, events: list[dict[str, Any]],
        period_start: datetime, now: datetime,
    ) -> tuple[list[dict[str, Any]], int]:
        changes: list[dict[str, Any]] = []
        consolidated_count = 0
        memories = self.store.list_actor_memories(
            owner_user_id, actor_id, state="active", limit=200
        )
        memories = [
            item for item in memories
            if parse_datetime(item["learned_at"]) <= now
        ]
        groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
        for memory in memories:
            if memory.get("memory_kind") != "episodic":
                continue
            metadata = memory.get("metadata") or {}
            key = (
                str(memory.get("source_kind") or "event"),
                str(metadata.get("other_actor_id") or metadata.get("action_type") or "self"),
            )
            groups.setdefault(key, []).append(memory)
        for (source_kind, subject), items in groups.items():
            if len(items) < 2:
                continue
            memory_kind = "relationship" if subject not in {"self", "None"} else "semantic"
            memory_id = self._id(
                owner_user_id, actor_id, memory_kind, source_kind, subject,
                period_start.date().isoformat(),
            )
            content = (
                "多次交流逐渐形成了对这段关系的稳定认识。"
                if memory_kind == "relationship" else
                "最近几次相似经历逐渐形成了一条可以复用的经验。"
            )
            self.store.upsert_consolidated_memory(
                owner_user_id,
                actor_id,
                memory={
                    "memory_id": memory_id,
                    "memory_kind": memory_kind,
                    "content": content,
                    "source_kind": "reflection",
                    "confidence": min(92, 58 + len(items) * 7),
                    "salience": min(90, 50 + len(items) * 8),
                    "disclosure_level": "private",
                    "metadata": {
                        "other_actor_id": subject if memory_kind == "relationship" else None,
                        "source_memory_ids": [item["memory_id"] for item in items],
                        "source_kind": source_kind,
                    },
                },
                now=now,
            )
            count = self.store.mark_memories_consolidated(
                owner_user_id,
                actor_id,
                [item["memory_id"] for item in items],
                consolidated_memory_id=memory_id,
                now=now,
            )
            consolidated_count += count
            changes.append({
                "operation": "consolidated",
                "memory_id": memory_id,
                "memory_kind": memory_kind,
                "source_count": len(items),
            })

        event_groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
        for event in events:
            event_groups.setdefault(
                (event.get("event_type", "life"), event.get("location_id", "multiple")),
                [],
            ).append(event)
        for (action_type, location_id), items in event_groups.items():
            if len(items) < 3:
                continue
            memory_id = self._id(
                owner_user_id, actor_id, "self", action_type, location_id,
                period_start.date().isoformat(),
            )
            self.store.upsert_consolidated_memory(
                owner_user_id,
                actor_id,
                memory={
                    "memory_id": memory_id,
                    "memory_kind": "self",
                    "content": "反复实践后，对自己处理这类行动的节奏更了解了。",
                    "source_kind": "reflection",
                    "confidence": min(90, 55 + len(items) * 6),
                    "salience": min(86, 48 + len(items) * 6),
                    "metadata": {
                        "action_type": action_type,
                        "location_id": location_id,
                        "source_event_ids": [item["event_id"] for item in items],
                    },
                },
                now=now,
            )
            changes.append({
                "operation": "created", "memory_id": memory_id,
                "memory_kind": "self", "source_count": len(items),
            })
        return changes, consolidated_count

    @staticmethod
    def _id(*parts: Any) -> str:
        return hashlib.sha256(
            ":".join(str(part) for part in parts).encode("utf-8")
        ).hexdigest()[:32]


class ReflectionService:
    def __init__(self, store: LifeStore, important_advisor: Any = None):
        self.store = store
        self.memories = MemoryConsolidator(store)
        self.goals = GoalLifecycleService(store, important_advisor)

    def reflect_due(
        self, owner_user_id: str, actors: list[dict[str, Any]], *, now: datetime
    ) -> ReflectionReport:
        report = ReflectionReport()
        for actor in actors:
            self._reflect_actor(owner_user_id, actor, now=now, report=report)
        return report

    def _reflect_actor(
        self, owner: str, actor: dict[str, Any], *, now: datetime,
        report: ReflectionReport,
    ) -> None:
        day_end = now.replace(hour=0, minute=0, second=0, microsecond=0)
        introduced = parse_datetime(actor.get("introduced_at") or day_end)
        if day_end <= introduced:
            return
        existing_daily = self.store.list_actor_reflections(
            owner, actor["actor_id"], period_type="daily", limit=200
        )
        last_end = max(
            (parse_datetime(item["period_end"]) for item in existing_daily),
            default=introduced,
        )
        day_start = max(
            last_end.replace(hour=0, minute=0, second=0, microsecond=0),
            introduced.replace(hour=0, minute=0, second=0, microsecond=0),
        )
        while day_start < day_end:
            self._reflect_period(
                owner, actor, day_start=day_start,
                day_end=day_start + timedelta(days=1), now=now, report=report,
            )
            day_start += timedelta(days=1)

    def _reflect_period(
        self, owner: str, actor: dict[str, Any], *, day_start: datetime,
        day_end: datetime, now: datetime, report: ReflectionReport,
    ) -> None:
        events = self.store.list_actor_events(
            owner, actor["actor_id"], since=day_start.isoformat(),
            before=day_end.isoformat(), limit=100,
        )
        goal_report = self.goals.review_actor(owner, actor, now=day_end)
        memory_changes, consolidated = self.memories.consolidate(
            owner, actor["actor_id"], events=events,
            period_start=day_start, now=day_end,
        )
        reflection, created = self.store.ensure_actor_reflection(
            owner,
            actor["actor_id"],
            reflection={
                "period_type": "daily",
                "period_start": day_start.isoformat(),
                "period_end": day_end.isoformat(),
                "summary": self._summary(events, goal_report.transitions),
                "source_event_ids": [item["event_id"] for item in events],
                "goal_changes": goal_report.transitions,
                "memory_changes": memory_changes,
                "metadata": {"event_count": len(events)},
            },
            now=now,
        )
        if not created:
            return
        report.created += 1
        report.reflections.append(reflection)
        report.goal_transitions += len(goal_report.transitions)
        report.memories_created += len(memory_changes)
        report.memories_consolidated += consolidated
        report.memories_decayed += self.store.decay_memories(
            owner, actor["actor_id"], before=day_end - timedelta(days=30), now=day_end
        )
        report.relationships_decayed += self.store.decay_relationships(
            owner, actor["actor_id"], before=day_end - timedelta(days=30), now=day_end
        )
        if day_end.weekday() == 0:
            self._weekly(owner, actor, day_end=day_end, now=now, report=report)

    def _weekly(
        self, owner: str, actor: dict[str, Any], *, day_end: datetime,
        now: datetime, report: ReflectionReport,
    ) -> None:
        start = day_end - timedelta(days=7)
        daily = [
            item for item in self.store.list_actor_reflections(
                owner, actor["actor_id"], period_type="daily", limit=14
            ) if parse_datetime(item["period_start"]) >= start
        ]
        reflection, created = self.store.ensure_actor_reflection(
            owner,
            actor["actor_id"],
            reflection={
                "period_type": "weekly", "period_start": start.isoformat(),
                "period_end": day_end.isoformat(),
                "summary": f"这一周留下了 {len(daily)} 次日级复盘，生活线索仍然连续。",
                "source_event_ids": [
                    event_id for item in daily for event_id in item["source_event_ids"]
                ][:100],
                "goal_changes": [], "memory_changes": [],
                "metadata": {"daily_reflection_count": len(daily)},
            },
            now=now,
        )
        if created:
            report.created += 1
            report.reflections.append(reflection)

    @staticmethod
    def _summary(events: list[dict[str, Any]], transitions: list[dict[str, Any]]) -> str:
        if not events and not transitions:
            return "这一天没有需要单独展开的事件，状态和生活节奏保持平稳。"
        failed = sum(item.get("status") in {"failed", "interrupted"} for item in events)
        return (
            f"复盘了 {len(events)} 段生活记录"
            f"，其中 {failed} 段没有完全按预期结束"
            f"；同时处理了 {len(transitions)} 次目标状态调整。"
        )


__all__ = ["MemoryConsolidator", "ReflectionReport", "ReflectionService"]
