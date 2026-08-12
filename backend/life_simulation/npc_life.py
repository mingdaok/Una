"""NPC 自主生活 v1：独立状态、持久日程与幂等事件结算。"""

from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Optional

from .character_registry import CharacterRegistry, RoutineActivityDefinition
from .clock import calendar_windows, completed_windows, parse_datetime, utc_now
from .models import LifeWindow
from .store import LifeStore


NPC_SIMULATOR_VERSION = "npc-rules-v1"
NPC_MAX_DETAILED_DAYS = 7
NPC_MAX_WINDOWS_PER_RUN = 56
NPC_MAX_STALE_RETRIES = 3


@dataclass
class NpcSettlementReport:
    owner_user_id: str
    settled_windows: int = 0
    created_events: int = 0
    skipped_windows: int = 0
    stale_retries: int = 0
    capped_actors: list[str] = field(default_factory=list)
    actor_reports: dict[str, dict[str, Any]] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "owner_user_id": self.owner_user_id,
            "settled_windows": self.settled_windows,
            "created_events": self.created_events,
            "skipped_windows": self.skipped_windows,
            "stale_retries": self.stale_retries,
            "capped_actors": list(self.capped_actors),
            "actor_reports": dict(self.actor_reports),
        }


class NpcLifeEngine:
    version = NPC_SIMULATOR_VERSION

    def initial_state(self, owner_user_id: str, actor: dict[str, Any]) -> dict[str, Any]:
        seed = self._seed(owner_user_id, actor["actor_id"], "initial")
        personality = actor.get("personality", {})
        return {
            "current_location": "home",
            "current_activity": "resting",
            "energy": 62 + seed % 19,
            "hunger": 18 + (seed // 19) % 17,
            "stress": 18 + (seed // 37) % 19,
            "social_need": max(
                15, min(55, int(42 - float(personality.get("warmth", 0.6)) * 20))
            ),
            "solitude_need": max(
                12,
                min(60, int(16 + float(personality.get("independence", 0.6)) * 30)),
            ),
            "mood": {"label": "平静", "intensity": 32},
            "active_goals": [],
        }

    def plan(
        self,
        owner_user_id: str,
        actor: dict[str, Any],
        window: LifeWindow,
    ) -> dict[str, Any]:
        candidates = self._activities(actor["actor_id"], window.key)
        if not candidates:
            raise ValueError(
                f"NPC {actor['actor_id']} 的日程模板缺少窗口 {window.key}"
            )
        seed = self._seed(
            owner_user_id,
            actor["actor_id"],
            window.start_at.isoformat(),
            str(actor.get("definition_version", 1)),
            self.version,
        )
        activity = candidates[random.Random(seed).randrange(len(candidates))]
        return {
            "activity_id": activity.activity_id,
            "event_type": activity.event_type,
            "location_id": activity.location_id,
            "summary": activity.summary,
            "interpretation": activity.interpretation,
            "private_thought": activity.private_thought,
            "importance": activity.importance,
            "mentionability": activity.mentionability,
            "publicability": activity.publicability,
            "state_delta": dict(activity.state_delta),
            "routine_template": actor["routine_template"],
            "definition_version": actor.get("definition_version", 1),
            "simulator_version": self.version,
        }

    def simulate(
        self,
        actor: dict[str, Any],
        state: dict[str, Any],
        schedule: dict[str, Any],
        window: LifeWindow,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        plan = schedule["plan"]
        next_state = dict(state)
        duration_hours = max(
            0.25, (window.end_at - window.start_at).total_seconds() / 3600
        )
        next_state["energy"] = int(next_state.get("energy", 70) - duration_hours * 2)
        next_state["hunger"] = int(next_state.get("hunger", 24) + duration_hours * 4)
        next_state["stress"] = int(next_state.get("stress", 24) + duration_hours)
        next_state["social_need"] = int(
            next_state.get("social_need", 28) + duration_hours * 1.3
        )
        next_state["solitude_need"] = int(
            next_state.get("solitude_need", 22) + duration_hours * 0.6
        )
        for key, delta in plan.get("state_delta", {}).items():
            if key in {
                "energy",
                "hunger",
                "stress",
                "social_need",
                "solitude_need",
            }:
                next_state[key] = int(next_state.get(key, 0)) + int(delta)
        for key in ("energy", "hunger", "stress", "social_need", "solitude_need"):
            next_state[key] = max(0, min(100, int(next_state.get(key, 0))))
        next_state["current_location"] = plan["location_id"]
        next_state["current_activity"] = plan["event_type"]
        next_state["mood"] = self._mood(next_state)

        event_key = f"npc-schedule:{schedule['schedule_id']}:{self.version}"
        event_id = hashlib.sha256(event_key.encode("utf-8")).hexdigest()[:32]
        event = {
            "event_id": event_id,
            "event_type": plan["event_type"],
            "status": "completed",
            "location_id": plan["location_id"],
            "summary": plan["summary"],
            "facts": {
                "activity_id": plan["activity_id"],
                "window": schedule["window_key"],
                "routine_template": plan["routine_template"],
                "simulator_version": self.version,
            },
            "importance": plan["importance"],
            "mentionability": plan["mentionability"],
            "publicability": plan["publicability"],
            "interpretation": plan.get("interpretation", ""),
            "private_thought": plan.get("private_thought", ""),
            "disclosure_level": (
                "public" if int(plan["publicability"]) >= 50 else "familiar"
            ),
            "idempotency_key": event_key,
            "actor_display_name": actor["display_name"],
        }
        return next_state, event

    def _activities(
        self, actor_id: str, window_key: str
    ) -> tuple[RoutineActivityDefinition, ...]:
        raise NotImplementedError

    @staticmethod
    def _mood(state: dict[str, Any]) -> dict[str, Any]:
        if int(state["energy"]) <= 25:
            return {"label": "疲惫", "intensity": 68}
        if int(state["stress"]) >= 68:
            return {"label": "紧绷", "intensity": 64}
        if int(state["social_need"]) >= 72:
            return {"label": "想找人聊聊", "intensity": 58}
        return {"label": "平静", "intensity": 36}

    @staticmethod
    def _seed(*parts: Any) -> int:
        raw = ":".join(str(part) for part in parts).encode("utf-8")
        return int.from_bytes(hashlib.sha256(raw).digest()[:8], "big")


class CatalogNpcLifeEngine(NpcLifeEngine):
    def __init__(self, characters: CharacterRegistry):
        self.characters = characters

    def _activities(
        self, actor_id: str, window_key: str
    ) -> tuple[RoutineActivityDefinition, ...]:
        return self.characters.catalog.activities_for(actor_id, window_key)


class NpcLifeService:
    def __init__(
        self,
        store: LifeStore,
        characters: CharacterRegistry,
        engine: Optional[NpcLifeEngine] = None,
    ):
        self.store = store
        self.characters = characters
        self.engine = engine or CatalogNpcLifeEngine(characters)

    def ensure_world(
        self,
        owner_user_id: str,
        timezone_name: str,
        *,
        now: Optional[datetime] = None,
    ) -> list[dict[str, Any]]:
        current = parse_datetime(now or utc_now())
        self.characters.ensure_world(owner_user_id, now=current)
        actors = self._active_actors(owner_user_id)
        for actor in actors:
            self.store.ensure_actor_state(
                owner_user_id,
                actor["actor_id"],
                initial_state=self.engine.initial_state(owner_user_id, actor),
                now=current,
                simulator_version=self.engine.version,
            )
            self.materialize_schedule(
                owner_user_id,
                actor,
                timezone_name,
                start=current,
                end=current + timedelta(hours=24),
                now=current,
            )
        return actors

    def materialize_schedule(
        self,
        owner_user_id: str,
        actor: dict[str, Any],
        timezone_name: str,
        *,
        start: datetime,
        end: datetime,
        now: datetime,
    ) -> list[dict[str, Any]]:
        existing = self.store.list_actor_schedules(
            owner_user_id,
            actor["actor_id"],
            after=start.isoformat(),
            before=end.isoformat(),
            limit=200,
        )
        existing_by_window = {
            (item["starts_at"], item["window_key"]): item for item in existing
        }
        schedules = []
        for window in calendar_windows(start, end, timezone_name):
            key = (window.start_at.isoformat(), window.key)
            if key in existing_by_window:
                schedules.append(existing_by_window[key])
                continue
            plan = self.engine.plan(owner_user_id, actor, window)
            schedule_id = self._schedule_id(owner_user_id, actor["actor_id"], window)
            schedules.append(
                self.store.ensure_actor_schedule(
                    owner_user_id,
                    actor["actor_id"],
                    schedule_id=schedule_id,
                    window=window,
                    plan=plan,
                    now=now,
                )
            )
        return schedules

    def settle_due(
        self,
        owner_user_id: str,
        timezone_name: str,
        *,
        now: Optional[datetime] = None,
        max_windows: int = NPC_MAX_WINDOWS_PER_RUN,
    ) -> NpcSettlementReport:
        current = parse_datetime(now or utc_now())
        actors = self.ensure_world(owner_user_id, timezone_name, now=current)
        report = NpcSettlementReport(owner_user_id=owner_user_id)
        for actor in actors:
            actor_id = actor["actor_id"]
            actor_counts = {
                "settled_windows": 0,
                "created_events": 0,
                "last_settled_at": None,
            }
            state = self.store.get_actor_state(owner_user_id, actor_id)
            if state is None:
                raise KeyError(f"NPC 状态不存在: {actor_id}")
            state = self._compress_old_history(
                owner_user_id, actor, state, current, report
            )
            windows, capped = completed_windows(
                state["last_settled_at"],
                current,
                timezone_name,
                max_windows=max_windows,
            )
            if capped:
                report.capped_actors.append(actor_id)
            for canonical_window in windows:
                if self._settle_window(
                    owner_user_id,
                    actor,
                    canonical_window,
                    current,
                    report,
                ):
                    actor_counts["settled_windows"] += 1
                    actor_counts["created_events"] += 1
            final_state = self.store.get_actor_state(owner_user_id, actor_id)
            actor_counts["last_settled_at"] = (
                final_state["last_settled_at"] if final_state else None
            )
            report.actor_reports[actor_id] = actor_counts
            self.materialize_schedule(
                owner_user_id,
                actor,
                timezone_name,
                start=current,
                end=current + timedelta(hours=24),
                now=current,
            )
        return report

    def _settle_window(
        self,
        owner_user_id: str,
        actor: dict[str, Any],
        canonical_window: LifeWindow,
        current: datetime,
        report: NpcSettlementReport,
    ) -> bool:
        actor_id = actor["actor_id"]
        schedule_id = self._schedule_id(owner_user_id, actor_id, canonical_window)
        plan = self.engine.plan(owner_user_id, actor, canonical_window)
        schedule = self.store.ensure_actor_schedule(
            owner_user_id,
            actor_id,
            schedule_id=schedule_id,
            window=canonical_window,
            plan=plan,
            now=current,
        )
        for _ in range(NPC_MAX_STALE_RETRIES):
            state = self.store.get_actor_state(owner_user_id, actor_id)
            if state is None:
                raise KeyError(f"NPC 状态不存在: {actor_id}")
            last_settled = parse_datetime(state["last_settled_at"])
            if last_settled >= canonical_window.end_at:
                report.skipped_windows += 1
                return False
            window = LifeWindow(
                key=canonical_window.key,
                label=canonical_window.label,
                start_at=max(canonical_window.start_at, last_settled),
                end_at=canonical_window.end_at,
            )
            next_state, event = self.engine.simulate(actor, state, schedule, window)
            status, persisted = self.store.apply_actor_window(
                owner_user_id,
                actor_id,
                window,
                schedule_id=schedule["schedule_id"],
                next_state=next_state,
                event=event,
                expected_state_version=int(state["state_version"]),
                simulator_version=self.engine.version,
                now=current,
            )
            if status == "stale":
                report.stale_retries += 1
                continue
            if status == "already":
                report.skipped_windows += 1
                return False
            report.settled_windows += 1
            if persisted:
                report.created_events += 1
                return True
            return False
        raise RuntimeError(f"NPC {actor_id} 状态连续发生版本冲突")

    def _compress_old_history(
        self,
        owner_user_id: str,
        actor: dict[str, Any],
        state: dict[str, Any],
        current: datetime,
        report: NpcSettlementReport,
    ) -> dict[str, Any]:
        cutoff = current - timedelta(days=NPC_MAX_DETAILED_DAYS)
        last_settled = parse_datetime(state["last_settled_at"])
        if last_settled >= cutoff:
            return state
        window = LifeWindow(
            key="catchup_summary",
            label="长期离线摘要",
            start_at=last_settled,
            end_at=cutoff,
        )
        next_state = dict(state)
        next_state.update(
            {
                "current_location": "home",
                "current_activity": "resting",
                "energy": 68,
                "hunger": 26,
                "stress": 27,
                "social_need": 30,
                "solitude_need": 24,
                "mood": {"label": "平静", "intensity": 34},
            }
        )
        event_key = (
            f"npc-summary:{owner_user_id}:{actor['actor_id']}:"
            f"{last_settled.isoformat()}:{cutoff.isoformat()}:{self.engine.version}"
        )
        event = {
            "event_type": "period_summary",
            "status": "completed",
            "location_id": "multiple",
            "summary": "这段时间按自己的节奏生活，处理日常，也继续了各自关心的事情。",
            "facts": {
                "compressed": True,
                "covered_days": max(1, (cutoff.date() - last_settled.date()).days),
                "simulator_version": self.engine.version,
            },
            "importance": 30,
            "mentionability": 35,
            "publicability": 5,
            "interpretation": "普通日子被压缩保存，但角色状态仍然连续。",
            "private_thought": "有些进展不明显，却一直在发生。",
            "disclosure_level": "familiar",
            "idempotency_key": event_key,
        }
        status, persisted = self.store.apply_actor_window(
            owner_user_id,
            actor["actor_id"],
            window,
            schedule_id=None,
            next_state=next_state,
            event=event,
            expected_state_version=int(state["state_version"]),
            simulator_version=self.engine.version,
            now=current,
        )
        if status == "applied":
            report.settled_windows += 1
            if persisted:
                report.created_events += 1
        elif status == "stale":
            report.stale_retries += 1
        refreshed = self.store.get_actor_state(owner_user_id, actor["actor_id"])
        if refreshed is None:
            raise KeyError(f"NPC 状态不存在: {actor['actor_id']}")
        return refreshed

    def _active_actors(self, owner_user_id: str) -> list[dict[str, Any]]:
        profiles = self.store.list_actor_profiles(
            owner_user_id, actor_role="friend", status="active"
        )
        actors = [
            self.characters.get_actor(owner_user_id, profile["actor_id"])
            for profile in profiles
        ]
        return [actor for actor in actors if actor is not None]

    @staticmethod
    def _schedule_id(
        owner_user_id: str, actor_id: str, window: LifeWindow
    ) -> str:
        raw = (
            f"{owner_user_id}:{actor_id}:{window.key}:"
            f"{window.start_at.isoformat()}:{window.end_at.isoformat()}"
        )
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


__all__ = [
    "CatalogNpcLifeEngine",
    "NpcLifeEngine",
    "NpcLifeService",
    "NpcSettlementReport",
]
