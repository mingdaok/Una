"""NPC 自主生活 v1：独立状态、持久日程与幂等事件结算。"""

from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Optional

from .character_registry import CharacterRegistry, RoutineActivityDefinition
from .candidates import CandidateGenerator
from .clock import calendar_windows, completed_windows, parse_datetime, utc_now
from .constraints import ConstraintEvaluator
from .decision_engine import DecisionEngine
from .important_decisions import ImportantDecisionAdvisor
from .models import LifeWindow
from .outcome_resolver import OutcomeResolver
from .plan_manager import PlanManager
from .store import LifeStore
from .utility import UtilityScorer
from .world_environment import WorldEnvironment


NPC_V1_SIMULATOR_VERSION = "npc-rules-v1"
NPC_SIMULATOR_VERSION = "npc-agency-v2"
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
    version = NPC_V1_SIMULATOR_VERSION

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
            "boredom": 22 + (seed // 53) % 22,
            "focus": 48 + (seed // 71) % 25,
            "confidence": 42 + (seed // 89) % 24,
            "comfort": 64 + (seed // 107) % 20,
            "mood": {"label": "平静", "intensity": 32},
            "active_goals": [],
        }

    def plan(
        self,
        owner_user_id: str,
        actor: dict[str, Any],
        window: LifeWindow,
        *,
        state: Optional[dict[str, Any]] = None,
        recent_events: tuple[dict[str, Any], ...] = (),
        goals: tuple[dict[str, Any], ...] = (),
        commitments: tuple[dict[str, Any], ...] = (),
        relationships: tuple[dict[str, Any], ...] = (),
        memories: tuple[dict[str, Any], ...] = (),
        environment_context: Optional[dict[str, Any]] = None,
        allow_important_llm: bool = False,
        offline_batch: bool = False,
        constraint_context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        del (
            state, recent_events, goals, commitments, relationships, memories,
            environment_context,
            allow_important_llm, offline_batch, constraint_context,
        )
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
        *,
        state_effect_scale: float = 1.0,
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
        next_state["boredom"] = int(
            next_state.get("boredom", 28) + duration_hours * 1.8
        )
        next_state["focus"] = int(
            next_state.get("focus", 55) - duration_hours * 0.8
        )
        next_state["confidence"] = int(next_state.get("confidence", 50))
        next_state["comfort"] = int(next_state.get("comfort", 70))
        for key, delta in plan.get("state_delta", {}).items():
            if key in {
                "energy",
                "hunger",
                "stress",
                "social_need",
                "solitude_need",
                "boredom",
                "focus",
                "confidence",
                "comfort",
            }:
                scaled_delta = int(round(int(delta) * state_effect_scale))
                next_state[key] = int(next_state.get(key, 0)) + scaled_delta
        for key in (
            "energy", "hunger", "stress", "social_need", "solitude_need",
            "boredom", "focus", "confidence", "comfort",
        ):
            next_state[key] = max(0, min(100, int(next_state.get(key, 0))))
        next_state["current_location"] = plan["location_id"]
        next_state["current_activity"] = plan["event_type"]
        next_state["mood"] = self._mood(next_state)

        plan_version = plan.get("simulator_version", NPC_V1_SIMULATOR_VERSION)
        event_key = f"npc-schedule:{schedule['schedule_id']}:{plan_version}"
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
                "simulator_version": plan_version,
                "action_type": plan.get("action_type", plan["event_type"]),
                "candidate_id": plan.get("candidate_id"),
                "candidate_source": plan.get("candidate_source"),
                "opportunity_id": plan.get("opportunity_id"),
                "opportunity_type": plan.get("opportunity_type"),
                "weather_condition": plan.get("weather_condition"),
                "travel_minutes": plan.get("travel_minutes"),
                "target_actor_id": plan.get("target_actor_id"),
                "memory_id": plan.get("memory_id"),
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
    version = NPC_SIMULATOR_VERSION

    def __init__(
        self, characters: CharacterRegistry,
        environment: WorldEnvironment | None = None,
        important_advisor: ImportantDecisionAdvisor | None = None,
    ):
        self.characters = characters
        self.generator = CandidateGenerator(characters.catalog.action_atoms)
        self.constraints = ConstraintEvaluator()
        self.scorer = UtilityScorer()
        self.decisions = DecisionEngine(
            engine_version=self.version, important_advisor=important_advisor
        )
        self.environment = environment

    def plan(
        self,
        owner_user_id: str,
        actor: dict[str, Any],
        window: LifeWindow,
        *,
        state: Optional[dict[str, Any]] = None,
        recent_events: tuple[dict[str, Any], ...] = (),
        goals: tuple[dict[str, Any], ...] = (),
        commitments: tuple[dict[str, Any], ...] = (),
        relationships: tuple[dict[str, Any], ...] = (),
        memories: tuple[dict[str, Any], ...] = (),
        environment_context: Optional[dict[str, Any]] = None,
        allow_important_llm: bool = False,
        offline_batch: bool = False,
        constraint_context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        decision_state = dict(state or self.initial_state(owner_user_id, actor))
        decision_state.setdefault("state_version", 0)
        try:
            candidates = self.generator.generate(
                actor,
                decision_state,
                window,
                routine_activities=self._activities(actor["actor_id"], window.key),
                recent_events=recent_events,
                goals=goals,
                commitments=commitments,
                opportunities=tuple((environment_context or {}).get("opportunities", ())),
                relationships=relationships,
                memories=memories,
            )
            if self.environment and environment_context:
                candidates = self.environment.enrich_candidates(
                    candidates, environment_context
                )
            accepted, rejected = self.constraints.filter(
                candidates, state=decision_state, window=window,
                actor=actor,
                context={
                    "available_resources": actor.get("available_resources", ()),
                    "forbidden_actions": actor.get("forbidden_actions", ()),
                    **(constraint_context or {}),
                },
            )
            scored = self.scorer.score_all(
                accepted,
                actor=actor,
                state=decision_state,
                recent_events=recent_events,
            )
            rejected_audit = tuple(
                {
                    "candidate_id": item.candidate.candidate_id,
                    "action_type": item.candidate.action_type,
                    "location_id": item.candidate.location_id,
                    "reason_code": item.reason_code,
                    "detail": item.detail,
                }
                for item in rejected
            )
            result = self.decisions.select(
                owner_user_id,
                actor,
                decision_state,
                window,
                scored,
                has_hard_commitment=any(
                    item.candidate.source == "commitment"
                    and item.candidate.metadata.get("flexibility") == "hard"
                    for item in scored
                ),
                rejected_candidates=rejected_audit,
                allow_important_llm=allow_important_llm,
                offline_batch=offline_batch,
            )
            selected = result.selected.candidate
            metadata = selected.metadata
            state_delta = dict(metadata.get("routine_state_delta") or selected.base_effect)
            if "routine_state_delta" not in metadata:
                for metric, cost in selected.base_cost.items():
                    state_delta[metric] = int(state_delta.get(metric, 0)) - int(cost)
            audit = result.as_audit()
            audit.update(
                {
                    "decision_id": hashlib.sha256(
                        (
                            f"{owner_user_id}:{actor['actor_id']}:"
                            f"{window.start_at.isoformat()}:"
                            f"{decision_state['state_version']}:{self.version}"
                        ).encode("utf-8")
                    ).hexdigest()[:32],
                    "decision_at": window.start_at.isoformat(),
                    "state_version": int(decision_state["state_version"]),
                    "rejected_candidates": list(result.rejected_candidates),
                }
            )
            return {
                "activity_id": selected.activity_id,
                "action_type": selected.action_type,
                "candidate_id": selected.candidate_id,
                "candidate_source": selected.source,
                "event_type": selected.action_type,
                "location_id": selected.location_id,
                "summary": selected.summary,
                "interpretation": metadata.get("interpretation", ""),
                "private_thought": metadata.get("private_thought", ""),
                "importance": int(metadata.get("importance", 32)),
                "mentionability": int(metadata.get("mentionability", 42)),
                "publicability": int(metadata.get("publicability", 20)),
                "state_delta": state_delta,
                "goal_id": metadata.get("goal_id"),
                "commitment_id": metadata.get("commitment_id"),
                "target_actor_id": metadata.get("target_actor_id"),
                "memory_id": metadata.get("memory_id"),
                "opportunity_id": metadata.get("opportunity_id"),
                "opportunity_type": metadata.get("opportunity_type"),
                "weather_condition": metadata.get("weather_condition"),
                "travel_minutes": int(metadata.get("travel_minutes", 0)),
                "llm_motivation": audit.get("llm_motivation"),
                "llm_public_reason": audit.get("llm_public_reason"),
                "llm_private_reason": audit.get("llm_private_reason"),
                "llm_confidence": audit.get("llm_confidence"),
                "duration_minutes": selected.duration_minutes,
                "routine_template": actor["routine_template"],
                "definition_version": actor.get("definition_version", 1),
                "simulator_version": self.version,
                "decision": audit,
            }
        except Exception as error:
            fallback = super().plan(owner_user_id, actor, window)
            fallback_candidate_id = "candidate_fallback_" + hashlib.sha256(
                (
                    f"{actor['actor_id']}:{window.start_at.isoformat()}:"
                    f"{fallback['activity_id']}"
                ).encode("utf-8")
            ).hexdigest()[:16]
            seed_hash = hashlib.sha256(
                (
                    f"{owner_user_id}:{actor['actor_id']}:"
                    f"{window.start_at.isoformat()}:"
                    f"{decision_state['state_version']}:{self.version}"
                ).encode("utf-8")
            ).hexdigest()[:16]
            fallback_reason = type(error).__name__
            fallback.update(
                {
                    "candidate_id": fallback_candidate_id,
                    "action_type": fallback["event_type"],
                    "simulator_version": self.version,
                    "fallback_simulator_version": NPC_V1_SIMULATOR_VERSION,
                    "fallback_reason": fallback_reason,
                    "decision": {
                        "decision_id": hashlib.sha256(
                            (
                                f"{owner_user_id}:{actor['actor_id']}:"
                                f"{window.start_at.isoformat()}:"
                                f"{decision_state['state_version']}:{self.version}"
                            ).encode("utf-8")
                        ).hexdigest()[:32],
                        "decision_at": window.start_at.isoformat(),
                        "state_version": int(decision_state["state_version"]),
                        "selected_candidate_id": fallback_candidate_id,
                        "candidate_scores": [
                            {
                                "candidate_id": fallback_candidate_id,
                                "action_type": fallback["event_type"],
                                "location_id": fallback["location_id"],
                                "summary": fallback["summary"],
                                "source": "v1_fallback",
                                "score": 0,
                                "probability": 1.0,
                                "components": {},
                                "selected": True,
                            }
                        ],
                        "rejected_candidates": [],
                        "reason_codes": ["v1_fallback"],
                        "random_seed_hash": seed_hash,
                        "temperature": 1.0,
                        "used_llm": False,
                        "llm_model": None,
                        "fallback_reason": fallback_reason,
                        "engine_version": self.version,
                    },
                }
            )
            return fallback

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
        self.environment = WorldEnvironment(store)
        self.important_decisions = ImportantDecisionAdvisor.from_environment(store)
        self.engine = engine or CatalogNpcLifeEngine(
            characters, self.environment, self.important_decisions
        )
        self.plan_manager = PlanManager(store, characters)
        self.outcomes = OutcomeResolver(engine_version="npc-agency-v2-phase2")

    def ensure_world(
        self,
        owner_user_id: str,
        timezone_name: str,
        *,
        now: Optional[datetime] = None,
    ) -> list[dict[str, Any]]:
        current = parse_datetime(now or utc_now())
        self.environment.materialize_opportunities(
            owner_user_id, current, current + timedelta(hours=24), now=current
        )
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
            self.plan_manager.ensure_actor_goal(owner_user_id, actor, now=current)
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
        self.environment.materialize_opportunities(
            owner_user_id, start, end, now=now
        )
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
        state = self.store.get_actor_state(owner_user_id, actor["actor_id"])
        recent_events = tuple(
            self.store.list_actor_events(owner_user_id, actor["actor_id"], limit=8)
        )
        goals = tuple(self.store.list_actor_goals(owner_user_id, actor["actor_id"], status="active"))
        relationships = tuple(
            self.store.list_relationships(owner_user_id, actor["actor_id"], limit=20)
        )
        memories = tuple(
            self.store.list_actor_memories(
                owner_user_id, actor["actor_id"], limit=12,
                context=self._memory_context(state, recent_events, relationships),
            )
        )
        schedules = []
        for window in calendar_windows(start, end, timezone_name):
            key = (window.start_at.isoformat(), window.key)
            if key in existing_by_window:
                schedules.append(existing_by_window[key])
                continue
            plan = self.engine.plan(
                owner_user_id,
                actor,
                window,
                state=state,
                recent_events=recent_events,
                goals=goals,
                commitments=(),
                relationships=relationships,
                memories=memories,
                environment_context=self.environment.context_for(
                    owner_user_id, window, state or {}
                ),
                constraint_context=self._constraint_context(owner_user_id),
            )
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
        self.plan_manager.materialize_schedule_plans(
            owner_user_id, actor, schedules, now=now
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
        self.environment.materialize_opportunities(
            owner_user_id, canonical_window.start_at, canonical_window.end_at,
            now=current,
        )
        state_for_plan = self.store.get_actor_state(owner_user_id, actor_id)
        recent_events = tuple(
            self.store.list_actor_events(owner_user_id, actor_id, limit=8)
        )
        goals = tuple(self.store.list_actor_goals(owner_user_id, actor_id, status="active"))
        relationships = tuple(
            self.store.list_relationships(owner_user_id, actor_id, limit=20)
        )
        memories = tuple(
            self.store.list_actor_memories(
                owner_user_id, actor_id, limit=12,
                context=self._memory_context(
                    state_for_plan, recent_events, relationships
                ),
            )
        )
        plan = self.engine.plan(
            owner_user_id,
            actor,
            canonical_window,
            state=state_for_plan,
            recent_events=recent_events,
            goals=goals,
            commitments=(),
            relationships=relationships,
            memories=memories,
            environment_context=self.environment.context_for(
                owner_user_id, canonical_window, state_for_plan or {}
            ),
            constraint_context=self._constraint_context(owner_user_id),
        )
        schedule = self.store.ensure_actor_schedule(
            owner_user_id,
            actor_id,
            schedule_id=schedule_id,
            window=canonical_window,
            plan=plan,
            now=current,
        )
        self.plan_manager.materialize_schedule_plans(
            owner_user_id, actor, (schedule,), now=current
        )
        actor_plan = self.plan_manager.plan_for_schedule(
            owner_user_id, actor_id, schedule["schedule_id"]
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
            actual_plan = schedule["plan"]
            if (
                actor_plan
                and actor_plan["plan_type"] == "flexible"
                and schedule.get("decision_engine_version") == NPC_SIMULATOR_VERSION
            ):
                actual_plan = self.engine.plan(
                    owner_user_id,
                    actor,
                    window,
                    state=state,
                    recent_events=tuple(
                        self.store.list_actor_events(owner_user_id, actor_id, limit=8)
                    ),
                    goals=tuple(
                        self.store.list_actor_goals(owner_user_id, actor_id, status="active")
                    ),
                    commitments=tuple(
                        self.store.list_actor_commitments(
                            owner_user_id, actor_id,
                            after=window.start_at.isoformat(), before=window.end_at.isoformat(),
                        )
                    ),
                    relationships=tuple(
                        self.store.list_relationships(
                            owner_user_id, actor_id, limit=20
                        )
                    ),
                    memories=tuple(
                        self.store.list_actor_memories(
                            owner_user_id, actor_id, limit=12,
                            context=self._memory_context(
                                state,
                                tuple(self.store.list_actor_events(
                                    owner_user_id, actor_id, limit=8
                                )),
                                tuple(self.store.list_relationships(
                                    owner_user_id, actor_id, limit=20
                                )),
                            ),
                            activate_at=window.start_at,
                        )
                    ),
                    environment_context=self.environment.context_for(
                        owner_user_id, window, state
                    ),
                    allow_important_llm=True,
                    offline_batch=(current - window.end_at) > timedelta(days=1),
                    constraint_context=self._constraint_context(
                        owner_user_id,
                        actor_busy_uninterruptible=any(
                            item.get("status") == "accepted"
                            and item.get("flexibility") == "hard"
                            for item in self.store.list_actor_commitments(
                                owner_user_id, actor_id,
                                after=window.start_at.isoformat(),
                                before=window.end_at.isoformat(),
                            )
                        ),
                    ),
                )
            if actor_plan and actor_plan.get("goal_id") and not actual_plan.get("goal_id"):
                actual_plan = {**actual_plan, "goal_id": actor_plan["goal_id"]}
            recent_events = tuple(
                self.store.list_actor_events(owner_user_id, actor_id, limit=8)
            )
            outcome = self.outcomes.resolve(
                owner_user_id, actor_id, actual_plan, state, window,
                recent_events=recent_events,
            )
            effective_schedule = {**schedule, "plan": actual_plan}
            next_state, event = self.engine.simulate(
                actor, state, effective_schedule, window,
                state_effect_scale=outcome.state_effect_scale,
            )
            event["status"] = outcome.status
            event["facts"]["outcome_reason_code"] = outcome.reason_code
            event["facts"]["state_effect_scale"] = outcome.state_effect_scale
            event["facts"]["goal_id"] = actual_plan.get("goal_id")
            if outcome.summary_note:
                event["summary"] = f"{event['summary']} {outcome.summary_note}"
            original_action = (
                actor_plan.get("original_action", {}).get("action_type")
                if actor_plan else actual_plan.get("action_type")
            )
            change = self.plan_manager.describe_change(
                original_action=original_action or actual_plan.get("action_type", ""),
                actual_action=actual_plan.get("action_type", ""),
                state=state,
                plan_type=actor_plan.get("plan_type") if actor_plan else None,
            )
            if actual_plan.get("llm_public_reason"):
                change = {
                    "reason_code": "important_decision_llm",
                    "public_reason": actual_plan["llm_public_reason"],
                    "private_reason": actual_plan.get("llm_private_reason", ""),
                    "confidence": float(actual_plan.get("llm_confidence") or 0),
                }
            event["facts"]["plan_change_reason_code"] = change["reason_code"]
            event["facts"]["plan_change_public_reason"] = change["public_reason"]
            event["facts"]["decision_source"] = (
                "llm_advice" if actual_plan.get("llm_public_reason") else "rules"
            )
            event["facts"]["llm_motivation"] = actual_plan.get("llm_motivation")
            event["facts"]["llm_confidence"] = actual_plan.get("llm_confidence")
            if change.get("append_to_summary", True) and change["reason_code"] != "as_planned":
                event["summary"] = f"{event['summary']} {change['public_reason']}"
            plan_outcome = None
            if actor_plan:
                plan_status = outcome.status
                if (
                    outcome.status == "completed"
                    and change["reason_code"] not in {"as_planned", "flexible_choice"}
                ):
                    plan_status = "cancelled"
                plan_outcome = {
                    "plan_id": actor_plan["plan_id"],
                    "status": plan_status,
                    "actual_action": {
                        "candidate_id": actual_plan.get("candidate_id"),
                        "action_type": actual_plan.get("action_type", actual_plan.get("event_type")),
                        "location_id": actual_plan.get("location_id"),
                        "summary": event["summary"],
                    },
                    "change": change,
                }
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
                decision=actual_plan.get("decision"),
                actor_plan_outcome=plan_outcome,
                goal_progress={
                    "goal_id": actual_plan.get("goal_id"),
                    "delta": outcome.goal_progress_delta,
                } if actual_plan.get("goal_id") else None,
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

    def _constraint_context(
        self, owner_user_id: str, *, actor_busy_uninterruptible: bool = False,
    ) -> dict[str, Any]:
        profile = self.store.get_profile(owner_user_id)
        return {
            "major_plot_level": (
                profile.get("major_plot_level", "ask") if profile else "ask"
            ),
            "actor_busy_uninterruptible": actor_busy_uninterruptible,
        }

    @staticmethod
    def _memory_context(
        state: Optional[dict[str, Any]],
        recent_events: tuple[dict[str, Any], ...],
        relationships: tuple[dict[str, Any], ...],
    ) -> dict[str, Any]:
        state = state or {}
        return {
            "location_id": state.get("current_location"),
            "participant_ids": [
                item.get("facts", {}).get("target_actor_id")
                for item in recent_events
                if item.get("facts", {}).get("target_actor_id")
            ],
            "action_types": [
                item.get("event_type") for item in recent_events
                if item.get("event_type")
            ],
        }

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
