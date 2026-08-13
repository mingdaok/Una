"""生活世界的幂等补算编排。"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Optional

from .clock import completed_windows, get_timezone, parse_datetime, utc_now
from .character_registry import CharacterRegistry
from .continuity import LifeContinuityDirector
from .engine import LifeSimulationEngine
from .intention_executor import IntentionExecutor
from .models import LifeEventDraft, LifeWindow, SettlementReport, SimulationResult
from .npc_life import NpcLifeService
from .npc_interactions import NpcInteractionService
from .npc_intentions import NpcIntentionService
from .npc_suggestions import NpcSuggestionService
from .reflection import ReflectionService
from .store import DEFAULT_AI_ID, LifeStore


MAX_DETAILED_OFFLINE_DAYS = 7
MAX_WINDOWS_PER_RUN = 56
MAX_STALE_RETRIES = 3


class LifeSettlementService:
    def __init__(
        self,
        store: LifeStore,
        engine: Optional[LifeSimulationEngine] = None,
        continuity: Optional[LifeContinuityDirector] = None,
        intention_executor: Optional[IntentionExecutor] = None,
        character_registry: Optional[CharacterRegistry] = None,
        npc_life: Optional[NpcLifeService] = None,
        npc_interactions: Optional[NpcInteractionService] = None,
        npc_intentions: Optional[NpcIntentionService] = None,
        npc_suggestions: Optional[NpcSuggestionService] = None,
    ):
        self.store = store
        self.engine = engine or LifeSimulationEngine()
        self.characters = character_registry or CharacterRegistry(store)
        self.continuity = continuity or LifeContinuityDirector(self.characters)
        self.intention_executor = intention_executor or IntentionExecutor(
            store, self.characters
        )
        self.npc_life = npc_life or NpcLifeService(store, self.characters)
        self.npc_interactions = npc_interactions or NpcInteractionService(
            store, self.characters,
            important_advisor=self.npc_life.important_decisions,
        )
        self.relationship_dynamics = self.npc_interactions.dynamics
        self.npc_intentions = npc_intentions or NpcIntentionService(
            store, self.characters
        )
        self.npc_suggestions = npc_suggestions or NpcSuggestionService(
            store, self.characters, self.npc_intentions,
            important_advisor=self.npc_life.important_decisions,
        )
        self.reflections = ReflectionService(
            store, self.npc_life.important_decisions
        )

    def _current_time(
        self, owner_user_id: str, supplied: Optional[datetime] = None
    ) -> datetime:
        if supplied is not None:
            return parse_datetime(supplied)
        control = self.store.get_acceptance_control(owner_user_id)
        if control is not None:
            return parse_datetime(control["virtual_now"])
        return utc_now()

    def ensure_world(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        now: Optional[datetime] = None,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        current = self._current_time(owner_user_id, now)
        result = self.store.ensure_world(
            owner_user_id, ai_id, current, self.engine.version
        )
        self.characters.ensure_world(owner_user_id, now=current)
        self.npc_life.ensure_world(
            owner_user_id,
            result[0]["timezone"],
            now=current,
        )
        return result

    def get_status(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        now: Optional[datetime] = None,
        settle: bool = True,
    ) -> dict[str, Any]:
        current = self._current_time(owner_user_id, now)
        report = self.settle_due(owner_user_id, ai_id, now=current) if settle else None
        profile, state = self.ensure_world(owner_user_id, ai_id, now=current)
        return {
            "profile": profile,
            "state": state,
            "settlement": report.as_dict() if report else None,
        }

    def update_settings(
        self,
        owner_user_id: str,
        changes: dict[str, Any],
        ai_id: str = DEFAULT_AI_ID,
        *,
        now: Optional[datetime] = None,
    ) -> dict[str, Any]:
        current = self._current_time(owner_user_id, now)
        self.ensure_world(owner_user_id, ai_id, now=current)
        if "timezone" in changes:
            get_timezone(str(changes["timezone"]))
        if changes.get("activity_level") not in (None, "quiet", "natural", "dramatic"):
            raise ValueError("activity_level 只能是 quiet、natural 或 dramatic")
        if changes.get("major_plot_level") not in (None, "off", "ask", "allow"):
            raise ValueError("major_plot_level 只能是 off、ask 或 allow")
        if changes.get("proactive_frequency") not in (
            None,
            "occasional",
            "natural",
            "frequent",
        ):
            raise ValueError("proactive_frequency 只能是 occasional、natural 或 frequent")
        return self.store.update_settings(owner_user_id, ai_id, changes, current)

    def settle_due(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        now: Optional[datetime] = None,
        max_windows: int = MAX_WINDOWS_PER_RUN,
    ) -> SettlementReport:
        current = self._current_time(owner_user_id, now)
        profile, state = self.ensure_world(owner_user_id, ai_id, now=current)
        report = SettlementReport(owner_user_id=owner_user_id, ai_id=ai_id)
        if not profile["simulation_enabled"]:
            report.last_settled_at = state["last_settled_at"]
            return report

        state = self._compress_old_history(owner_user_id, ai_id, profile, state, current, report)
        windows, capped = completed_windows(
            state["last_settled_at"],
            current,
            profile["timezone"],
            max_windows=max_windows,
        )
        report.capped = capped
        for canonical_window in windows:
            applied = False
            for _ in range(MAX_STALE_RETRIES):
                profile = self.store.get_profile(owner_user_id, ai_id)
                state = self.store.get_state(owner_user_id, ai_id)
                if profile is None or state is None:
                    raise KeyError("生活世界在结算过程中消失")
                if not profile["simulation_enabled"]:
                    report.last_settled_at = state["last_settled_at"]
                    return report
                last_settled = parse_datetime(state["last_settled_at"])
                if last_settled >= canonical_window.end_at:
                    report.skipped_windows += 1
                    applied = True
                    break
                effective_window = LifeWindow(
                    key=canonical_window.key,
                    label=canonical_window.label,
                    start_at=max(canonical_window.start_at, last_settled),
                    end_at=canonical_window.end_at,
                )
                result = self.engine.simulate(
                    owner_user_id, ai_id, profile, state, effective_window
                )
                intention = self.intention_executor.plan(
                    owner_user_id, ai_id, state, effective_window
                )
                result = self.intention_executor.apply(
                    intention, result, effective_window
                )
                result = self.continuity.enrich(
                    owner_user_id,
                    ai_id,
                    profile,
                    effective_window,
                    result,
                    self.store,
                )
                status, event = self.store.apply_window(
                    owner_user_id,
                    ai_id,
                    effective_window,
                    result,
                    int(state["state_version"]),
                    self.engine.version,
                    current,
                )
                if status == "stale":
                    report.stale_retries += 1
                    continue
                if status == "already":
                    report.skipped_windows += 1
                else:
                    report.settled_windows += 1
                    if event:
                        report.created_events += 1
                        report.events.append(event)
                applied = True
                break
            if not applied:
                raise RuntimeError("生活状态连续发生版本冲突，已停止本次补算")

        final_state = self.store.get_state(owner_user_id, ai_id)
        report.last_settled_at = final_state["last_settled_at"] if final_state else None
        invitation_preparation = self.npc_interactions.prepare_due(
            owner_user_id,
            profile["timezone"],
            now=current,
        ).as_dict()
        report.npc_settlement = self.npc_life.settle_due(
            owner_user_id,
            profile["timezone"],
            now=current,
            max_windows=max_windows,
        ).as_dict()
        interaction_settlement = self.npc_interactions.materialize_due(
            owner_user_id,
            profile["timezone"],
            now=current,
            lead_ai_id=ai_id,
        ).as_dict()
        report.interaction_settlement = {
            key: int(invitation_preparation.get(key, 0)) + int(value)
            for key, value in interaction_settlement.items()
        }
        report.suggestion_settlement = self.npc_suggestions.reconsider_due(
            owner_user_id,
            profile["timezone"],
            now=current,
        ).as_dict()
        report.intention_settlement = self.npc_intentions.materialize_due(
            owner_user_id,
            profile["timezone"],
            now=current,
        ).as_dict()
        reflection_report = self.reflections.reflect_due(
            owner_user_id,
            self.characters.list_contacts(owner_user_id),
            now=current,
        )
        report.reflection_settlement = {
            "created": reflection_report.created,
            "memories_created": reflection_report.memories_created,
            "memories_consolidated": reflection_report.memories_consolidated,
            "memories_decayed": reflection_report.memories_decayed,
            "relationships_decayed": reflection_report.relationships_decayed,
            "goal_transitions": reflection_report.goal_transitions,
        }
        return report

    def get_actor_life(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        now: Optional[datetime] = None,
        settle: bool = True,
    ) -> Optional[dict[str, Any]]:
        current = self._current_time(owner_user_id, now)
        profile, _ = self.ensure_world(owner_user_id, now=current)
        canonical_id = self.characters.canonical_actor_id(actor_id)
        actor = self.characters.get_actor(owner_user_id, canonical_id)
        if (
            actor is None
            or actor.get("actor_role") != "friend"
            or actor.get("status") != "active"
        ):
            return None
        if settle and profile["simulation_enabled"]:
            self.npc_life.settle_due(
                owner_user_id, profile["timezone"], now=current
            )
            self.npc_interactions.materialize_due(
                owner_user_id,
                profile["timezone"],
                now=current,
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
        state = self.store.get_actor_state(owner_user_id, canonical_id)
        schedules = self.store.list_actor_schedules(
            owner_user_id,
            canonical_id,
            after=current.isoformat(),
            before=(current + timedelta(hours=24)).isoformat(),
        )
        intentions = self.store.list_actor_intentions(
            owner_user_id, canonical_id, limit=10
        )
        return {
            "actor": actor,
            "state": state,
            "schedule": schedules,
            "intentions": intentions,
        }

    def list_actor_events(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        now: Optional[datetime] = None,
        settle: bool = True,
        **filters: Any,
    ) -> Optional[list[dict[str, Any]]]:
        life = self.get_actor_life(
            owner_user_id, actor_id, now=now, settle=settle
        )
        if life is None:
            return None
        canonical_id = life["actor"]["actor_id"]
        return self.store.list_actor_events(
            owner_user_id, canonical_id, **filters
        )

    def list_actor_decisions(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        now: Optional[datetime] = None,
        settle: bool = True,
        **filters: Any,
    ) -> Optional[list[dict[str, Any]]]:
        life = self.get_actor_life(
            owner_user_id, actor_id, now=now, settle=settle
        )
        if life is None:
            return None
        return self.store.list_actor_decisions(
            owner_user_id, life["actor"]["actor_id"], **filters
        )

    def inspect_actor_planning(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        now: Optional[datetime] = None,
    ) -> Optional[dict[str, Any]]:
        current = self._current_time(owner_user_id, now)
        life = self.get_actor_life(owner_user_id, actor_id, now=current, settle=True)
        if life is None:
            return None
        canonical_id = life["actor"]["actor_id"]
        return {
            "goals": self.store.list_actor_goals(owner_user_id, canonical_id, limit=50),
            "commitments": self.store.list_actor_commitments(
                owner_user_id, canonical_id,
                after=(current - timedelta(days=1)).isoformat(),
                before=(current + timedelta(days=7)).isoformat(), limit=100,
            ),
            "plans": self.store.list_actor_plans(
                owner_user_id, canonical_id,
                after=(current - timedelta(days=7)).isoformat(),
                before=(current + timedelta(days=2)).isoformat(), limit=100,
            ),
            "invitations": self.store.list_interaction_invitations(
                owner_user_id, actor_id=canonical_id, limit=100,
            ),
            "environment": {
                "weather": self.npc_life.environment.weather_for(
                    owner_user_id, current
                ),
                "opportunities": self.store.list_world_opportunities(
                    owner_user_id,
                    after=(current - timedelta(days=1)).isoformat(),
                    before=(current + timedelta(days=2)).isoformat(),
                    limit=100,
                ),
            },
            "decision_context": {
                "relationships": self.store.list_relationships(
                    owner_user_id, canonical_id
                ),
                "memory_signals": self.store.list_actor_memories(
                    owner_user_id, canonical_id, limit=50
                ),
            },
            "reflections": self.store.list_actor_reflections(
                owner_user_id, canonical_id, limit=30
            ),
            "goal_transitions": self.store.list_goal_transitions(
                owner_user_id, canonical_id, limit=50
            ),
            "llm_calls": self.store.list_decision_llm_calls(
                owner_user_id, canonical_id, limit=50,
            ),
        }

    def list_actor_interactions(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        now: Optional[datetime] = None,
        settle: bool = True,
        **filters: Any,
    ) -> Optional[list[dict[str, Any]]]:
        life = self.get_actor_life(
            owner_user_id, actor_id, now=now, settle=settle
        )
        if life is None:
            return None
        return self.store.list_interaction_events(
            owner_user_id,
            actor_id=life["actor"]["actor_id"],
            **filters,
        )

    def list_actor_relationships(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        limit: int = 20,
        now: Optional[datetime] = None,
    ) -> Optional[list[dict[str, Any]]]:
        life = self.get_actor_life(
            owner_user_id, actor_id, now=now, settle=True
        )
        if life is None:
            return None
        return [
            self.relationship_dynamics.describe(item)
            for item in self.store.list_relationships(
            owner_user_id,
            life["actor"]["actor_id"],
            limit=limit,
            )
        ]

    def list_actor_intentions(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        status: Optional[str] = None,
        limit: int = 30,
        now: Optional[datetime] = None,
    ) -> Optional[list[dict[str, Any]]]:
        life = self.get_actor_life(
            owner_user_id, actor_id, now=now, settle=True
        )
        if life is None:
            return None
        return self.store.list_actor_intentions(
            owner_user_id,
            life["actor"]["actor_id"],
            status=status,
            limit=limit,
        )

    def submit_actor_suggestion(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        suggestion_type: str,
        request_id: str,
        message: str = "",
        target_actor_id: Optional[str] = None,
        now: Optional[datetime] = None,
    ) -> dict[str, Any]:
        current = self._current_time(owner_user_id, now)
        profile, _ = self.ensure_world(owner_user_id, now=current)
        suggestion = self.npc_suggestions.submit(
            owner_user_id,
            actor_id,
            suggestion_type=suggestion_type,
            request_id=request_id,
            message=message,
            target_actor_id=target_actor_id,
            timezone_name=profile["timezone"],
            now=current,
        )
        self.npc_life.plan_manager.adopt_suggestion(
            owner_user_id,
            self.characters.canonical_actor_id(actor_id),
            suggestion,
            now=current,
        )
        return suggestion

    def list_actor_suggestions(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        status: Optional[str] = None,
        limit: int = 30,
        now: Optional[datetime] = None,
    ) -> Optional[list[dict[str, Any]]]:
        life = self.get_actor_life(
            owner_user_id, actor_id, now=now, settle=False
        )
        if life is None:
            return None
        return self.store.list_actor_suggestions(
            owner_user_id,
            life["actor"]["actor_id"],
            status=status,
            limit=limit,
        )

    def list_events(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        **filters: Any,
    ) -> list[dict[str, Any]]:
        self.ensure_world(owner_user_id, ai_id)
        return self.store.list_events(owner_user_id, ai_id, **filters)

    def list_story_arcs(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        status: Optional[str] = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        self.ensure_world(owner_user_id, ai_id)
        if status not in (None, "active", "completed", "paused"):
            raise ValueError("故事线状态无效")
        return self.store.list_story_arcs(
            owner_user_id,
            ai_id,
            status=status,
            limit=limit,
        )

    def list_relationships(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        self.ensure_world(owner_user_id, ai_id)
        return [
            self.relationship_dynamics.describe(item)
            for item in self.store.list_relationships(
                owner_user_id, ai_id, limit=limit
            )
        ]

    def offline_summary(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        since: Optional[str | datetime] = None,
        now: Optional[datetime] = None,
    ) -> dict[str, Any]:
        current = self._current_time(owner_user_id, now)
        report = self.settle_due(owner_user_id, ai_id, now=current)
        start = parse_datetime(since) if since else current - timedelta(hours=24)
        events = self.store.list_events(
            owner_user_id,
            ai_id,
            limit=50,
            since=start.isoformat(),
        )
        important = [event for event in events if event["importance"] >= 45]
        return {
            "since": start.isoformat(),
            "until": current.isoformat(),
            "event_count": len(events),
            "important_count": len(important),
            "headline": important[0]["summary"] if important else (events[0]["summary"] if events else "这段时间生活很平静。"),
            "events": events,
            "settlement": report.as_dict(),
        }

    def _compress_old_history(
        self,
        owner_user_id: str,
        ai_id: str,
        profile: dict[str, Any],
        state: dict[str, Any],
        current: datetime,
        report: SettlementReport,
    ) -> dict[str, Any]:
        cutoff = current - timedelta(days=MAX_DETAILED_OFFLINE_DAYS)
        last_settled = parse_datetime(state["last_settled_at"])
        if last_settled >= cutoff:
            return state
        timezone = get_timezone(profile["timezone"])
        start_local = last_settled.astimezone(timezone)
        cutoff_local = cutoff.astimezone(timezone)
        window = LifeWindow(
            key="catchup_summary",
            label="长期离线摘要",
            start_at=start_local,
            end_at=cutoff_local,
        )
        summary = LifeEventDraft(
            event_type="period_summary",
            status="completed",
            start_at=start_local,
            end_at=cutoff_local,
            location_id="multiple",
            summary="这段时间按自己的节奏生活，处理日常、休息，也断续推进了手头的事情。",
            facts={
                "compressed": True,
                "covered_days": max(1, (cutoff_local.date() - start_local.date()).days),
                "simulator_version": self.engine.version,
            },
            importance=35,
            mentionability=45,
            publicability=8,
            interpretation="这段时间没有单独展开每个普通片段，但生活保持了连续。",
            private_thought="有些日子相似，却不等于什么都没有发生。",
            disclosure_level="familiar",
        )
        next_state = dict(state)
        next_state.update(
            {
                "current_location": "home",
                "current_activity": "resting",
                "energy": 70,
                "hunger": 24,
                "stress": 28,
            }
        )
        status, event = self.store.apply_window(
            owner_user_id,
            ai_id,
            window,
            SimulationResult(event=summary, state=next_state),
            int(state["state_version"]),
            self.engine.version,
            current,
        )
        if status == "applied":
            report.settled_windows += 1
            if event:
                report.created_events += 1
                report.events.append(event)
        elif status == "stale":
            report.stale_retries += 1
        refreshed = self.store.get_state(owner_user_id, ai_id)
        if refreshed is None:
            raise KeyError("生活状态不存在")
        return refreshed
