from datetime import datetime, timedelta, timezone

from life_simulation.models import LifeWindow
from life_simulation.npc_life import NpcLifeEngine
from life_simulation.outcome_resolver import OutcomeResolver
from life_simulation.plan_manager import PlanManager
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


START = datetime(2026, 8, 15, 0, 0, tzinfo=timezone.utc)


def make_world(tmp_path):
    store = LifeStore(str(tmp_path / "phase2.sqlite3"))
    service = LifeSettlementService(store)
    service.ensure_world("user-a", now=START)
    return store, service


def test_phase2_schema_and_daily_planning_create_goals_commitments_and_plans(tmp_path):
    store, service = make_world(tmp_path)
    actor_id = "npc_preset_2"

    goals = store.list_actor_goals("user-a", actor_id)
    commitments = store.list_actor_commitments("user-a", actor_id)
    plans = store.list_actor_plans("user-a", actor_id)

    assert goals
    assert goals[0]["status"] == "active"
    assert goals[0]["progress"] == 0
    assert any(item["commitment_type"] == "sleep" for item in commitments)
    assert any(item["plan_type"] == "anchor" for item in plans)
    assert any(item["plan_type"] == "flexible" for item in plans)
    assert all(item["status"] == "planned" for item in plans)


def test_user_suggestion_becomes_npc_owned_goal_not_direct_state_command(tmp_path, monkeypatch):
    store, service = make_world(tmp_path)
    actor_id = "npc_preset_2"
    before = store.get_actor_state("user-a", actor_id)
    monkeypatch.setattr(service.npc_suggestions, "_seed", lambda *parts: 8)

    suggestion = service.submit_actor_suggestion(
        "user-a", actor_id, suggestion_type="project",
        request_id="phase2-project", message="要不要整理一组照片？", now=START,
    )

    goals = store.list_actor_goals("user-a", actor_id)
    after = store.get_actor_state("user-a", actor_id)
    linked = next(goal for goal in goals if goal["origin_ref_id"] == suggestion["suggestion_id"])
    assert linked["origin"] == "user_suggestion"
    assert linked["status"] in {"candidate", "active"}
    assert after["current_activity"] == before["current_activity"]


def test_flexible_plan_replans_for_low_energy_and_hides_private_reason(tmp_path):
    store, service = make_world(tmp_path)
    actor_id = "npc_preset_1"
    plan = next(
        item for item in store.list_actor_plans("user-a", actor_id)
        if item["plan_type"] == "flexible"
    )
    manager = PlanManager(store, service.characters)

    change = manager.describe_change(
        original_action="explore",
        actual_action="rest",
        state={"energy": 18, "stress": 62},
    )
    updated = store.update_actor_plan_outcome(
        "user-a", plan["plan_id"], status="cancelled",
        actual_action={"action_type": "rest", "location_id": "home"},
        change=change, now=START,
    )

    assert updated["reason_code"] == "energy_low"
    assert updated["public_reason"]
    assert updated["private_reason"]
    assert "private_reason" not in manager.client_plan(updated)


def test_outcome_resolver_can_fail_or_interrupt_and_progresses_goal_deterministically():
    resolver = OutcomeResolver(engine_version="npc-agency-v2-phase2")
    window = LifeWindow(
        key="afternoon", label="下午", start_at=START,
        end_at=START + timedelta(hours=3),
    )
    plan = {
        "candidate_id": "candidate-goal",
        "action_type": "focus_project",
        "goal_id": "goal-1",
        "duration_minutes": 120,
    }
    low = resolver.resolve(
        "user-a", "npc_preset_2", plan,
        {"energy": 16, "focus": 18, "stress": 78, "state_version": 3}, window,
    )
    replay = resolver.resolve(
        "user-a", "npc_preset_2", plan,
        {"energy": 16, "focus": 18, "stress": 78, "state_version": 3}, window,
    )
    healthy = resolver.resolve(
        "user-a", "npc_preset_2", plan,
        {"energy": 72, "focus": 78, "stress": 22, "state_version": 3}, window,
    )

    assert low == replay
    assert low.status in {"failed", "interrupted"}
    assert low.goal_progress_delta == 0
    assert healthy.status == "completed"
    assert healthy.goal_progress_delta > 0


def test_recovery_actions_are_not_randomly_failed_by_low_wellbeing():
    resolver = OutcomeResolver(engine_version="npc-agency-v2-phase2")
    window = LifeWindow(
        key="night", label="夜间", start_at=START,
        end_at=START + timedelta(hours=3),
    )

    for action_type in ("sleep", "rest", "meal", "reflection"):
        outcome = resolver.resolve(
            "user-a", "npc_preset_1",
            {"candidate_id": f"candidate-{action_type}", "action_type": action_type},
            {"energy": 8, "focus": 12, "stress": 94, "state_version": 3},
            window,
        )
        assert outcome.status == "completed"
        assert outcome.reason_code == "recovery_action_completed"


def test_failed_action_only_applies_a_fraction_of_its_positive_effect():
    engine = NpcLifeEngine()
    window = LifeWindow(
        key="afternoon", label="下午", start_at=START,
        end_at=START + timedelta(hours=1),
    )
    state = {
        "energy": 60, "hunger": 20, "stress": 20, "social_need": 20,
        "solitude_need": 20, "boredom": 70, "focus": 60,
        "confidence": 50, "comfort": 70,
    }
    schedule = {
        "schedule_id": "schedule-effect", "window_key": "afternoon",
        "plan": {
            "activity_id": "project:test", "event_type": "focus_project",
            "action_type": "focus_project", "location_id": "home",
            "summary": "推进一个项目。", "routine_template": "test",
            "importance": 40, "mentionability": 40, "publicability": 20,
            "state_delta": {"confidence": 20, "boredom": -20},
        },
    }

    completed, _ = engine.simulate(
        {"display_name": "测试人物"}, state, schedule, window,
        state_effect_scale=1.0,
    )
    failed, _ = engine.simulate(
        {"display_name": "测试人物"}, state, schedule, window,
        state_effect_scale=0.2,
    )

    assert completed["confidence"] == 70
    assert failed["confidence"] == 54
    assert failed["boredom"] > completed["boredom"]


def test_flexible_time_choice_is_not_reported_as_a_cancelled_plan_change():
    change = PlanManager.describe_change(
        original_action="rest", actual_action="explore",
        state={"energy": 70, "stress": 20}, plan_type="flexible",
    )

    assert change["reason_code"] == "flexible_choice"
    assert change["append_to_summary"] is False
