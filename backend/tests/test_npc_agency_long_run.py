from collections import Counter
from datetime import datetime, timedelta, timezone

from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


def test_thirty_day_simulation_is_diverse_audited_and_llm_free(tmp_path):
    start = datetime(2026, 8, 1, 0, 0, tzinfo=timezone.utc)
    store = LifeStore(str(tmp_path / "npc-agency-30-days.sqlite3"))
    service = LifeSettlementService(store)
    owner = "quality-30-days"
    service.ensure_world(owner, now=start)

    for day in range(1, 31):
        service.npc_life.settle_due(
            owner,
            "Asia/Shanghai",
            now=start + timedelta(days=day),
            max_windows=56,
        )

    actor_distributions = {}
    for actor_id in ("npc_preset_1", "npc_preset_2", "npc_preset_3"):
        events = store.list_actor_events(owner, actor_id, limit=100)
        decisions = store.list_actor_decisions(owner, actor_id, limit=100)
        goals = store.list_actor_goals(owner, actor_id)
        commitments = store.list_actor_commitments(owner, actor_id)
        plans = store.list_actor_plans(owner, actor_id, limit=200)
        combinations = Counter(
            (event["event_type"], event["location_id"]) for event in events
        )
        actor_distributions[actor_id] = combinations

        assert len(events) == 100
        assert len(decisions) == 100
        assert len(combinations) >= 12
        assert len({event["summary"] for event in events}) >= 18
        assert sum(bool(item["fallback_reason"]) for item in decisions) <= 15
        assert all(item["used_llm"] is False for item in decisions)
        assert store.list_decision_llm_calls(owner, actor_id) == []
        assert all(item["candidate_scores"] for item in decisions)
        assert goals and any(item["progress"] > 0 for item in goals)
        assert any(item["commitment_type"] == "sleep" for item in commitments)
        assert {item["plan_type"] for item in plans} == {"anchor", "flexible"}
        assert any(item["status"] == "completed" for item in plans)
        flexible_choices = [
            item for item in plans if item["reason_code"] == "flexible_choice"
        ]
        assert flexible_choices
        assert all(item["status"] != "cancelled" for item in flexible_choices)
        changed_plans = [item for item in plans if item["status"] == "cancelled"]
        assert all(item["public_reason"] for item in changed_plans)
        assert all(
            event["facts"].get("plan_change_public_reason") not in event["summary"]
            for event in events
            if event["facts"].get("plan_change_reason_code") == "flexible_choice"
        )
        recovery_events = [
            event for event in events
            if event["event_type"] in {"sleep", "rest", "meal", "reflection"}
        ]
        assert all(event["status"] == "completed" for event in recovery_events)
        assert sum(event["status"] != "completed" for event in events) <= 15
        assert all("private_reason" not in event["facts"] for event in events)

    assert actor_distributions["npc_preset_1"] != actor_distributions["npc_preset_2"]
    assert actor_distributions["npc_preset_2"] != actor_distributions["npc_preset_3"]
