from datetime import datetime, timedelta, timezone

from life_simulation.candidates import ActionCandidate
from life_simulation.constraints import ConstraintEvaluator
from life_simulation.models import LifeWindow
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore
from life_simulation.world_environment import WorldEnvironment


START = datetime(2026, 8, 17, 0, 0, tzinfo=timezone.utc)


def test_location_hours_travel_and_weather_are_deterministic(tmp_path):
    store = LifeStore(str(tmp_path / "environment.sqlite3"))
    world = WorldEnvironment(store)
    morning = datetime(2026, 8, 17, 8, 0, tzinfo=timezone(timedelta(hours=8)))

    assert world.is_location_open("old_bookstore", morning) is False
    assert world.is_location_open(
        "old_bookstore", morning + timedelta(hours=2)
    ) is True
    assert world.travel_minutes("home", "old_bookstore") == 25
    assert world.weather_for("user-a", morning) == world.weather_for("user-a", morning)


def test_environment_hard_constraints_reject_closed_distant_and_storm_actions():
    evaluator = ConstraintEvaluator()
    window = LifeWindow(
        key="morning", label="上午", start_at=START,
        end_at=START + timedelta(minutes=45),
    )
    candidates = (
        ActionCandidate(
            "closed", "browse", "closed", "old_bookstore", "逛书店", "environment",
            20, metadata={"location_open": False, "travel_minutes": 10},
        ),
        ActionCandidate(
            "distant", "explore", "distant", "old_town", "去远处", "environment",
            35, metadata={"location_open": True, "travel_minutes": 20},
        ),
        ActionCandidate(
            "storm", "walk", "storm", "riverside", "沿河散步", "environment",
            20, categories=("outdoor",),
            metadata={"location_open": True, "travel_minutes": 5, "weather_blocked": True},
        ),
    )

    accepted, rejected = evaluator.filter(candidates, state={}, window=window)

    assert accepted == ()
    assert {item.reason_code for item in rejected} == {
        "location_closed", "insufficient_travel_time", "weather_blocked"
    }


def test_daily_world_opportunities_are_persistent_replayable_and_cooled_down(tmp_path):
    store = LifeStore(str(tmp_path / "opportunities.sqlite3"))
    world = WorldEnvironment(store)
    end = START + timedelta(days=14)

    first = world.materialize_opportunities("user-a", START, end, now=end)
    replay = world.materialize_opportunities("user-a", START, end, now=end)

    assert first
    assert [item["opportunity_id"] for item in replay] == [
        item["opportunity_id"] for item in first
    ]
    surprises = [item for item in first if item["opportunity_type"] == "unexpected"]
    cooldown_keys = [item["cooldown_key"] for item in surprises]
    assert len(cooldown_keys) == len(set(cooldown_keys))


def test_environment_candidates_affect_but_do_not_dominate_week_simulation(tmp_path):
    store = LifeStore(str(tmp_path / "environment-week.sqlite3"))
    service = LifeSettlementService(store)
    service.ensure_world("user-a", now=START)
    service.settle_due("user-a", now=START + timedelta(days=7))

    decisions = store.list_actor_decisions("user-a", "npc_preset_2", limit=100)
    selected_sources = [
        score.get("source") for decision in decisions
        for score in decision["candidate_scores"] if score.get("selected")
    ]
    all_sources = {
        score.get("source") for decision in decisions
        for score in decision["candidate_scores"]
    }
    assert "environment" in all_sources
    assert selected_sources.count("environment") < len(selected_sources) * 0.5
