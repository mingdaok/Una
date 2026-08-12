from datetime import datetime, timedelta, timezone
import sqlite3

from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth_api import get_current_user
from life_simulation.api import create_life_router
from life_simulation.chat_context import LifeChatContextService
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


START = datetime(2026, 8, 11, 1, 0, tzinfo=timezone.utc)


def make_service(tmp_path):
    store = LifeStore(str(tmp_path / "npc-intentions.sqlite3"))
    service = LifeSettlementService(store)
    service.ensure_world("user-a", now=START)
    return store, service


def set_actor_needs(store, actor_id, **values):
    allowed = {
        "energy", "hunger", "stress", "social_need", "solitude_need"
    }
    assert set(values) <= allowed
    assignments = ", ".join(f"{key} = ?" for key in values)
    with sqlite3.connect(store.database_path) as connection:
        connection.execute(
            f"UPDATE ai_actor_states SET {assignments} "
            "WHERE owner_user_id = 'user-a' AND actor_id = ?",
            [*values.values(), actor_id],
        )


def test_each_npc_forms_one_persistent_deterministic_intention(tmp_path):
    store, service = make_service(tmp_path)

    first = service.npc_intentions.materialize_due(
        "user-a", "Asia/Shanghai", now=START
    )
    second = service.npc_intentions.materialize_due(
        "user-a", "Asia/Shanghai", now=START
    )

    assert first.formed == 3
    assert second.formed == 0
    assert second.skipped == 3
    for actor_id in ("npc_preset_1", "npc_preset_2", "npc_preset_3"):
        intentions = store.list_actor_intentions("user-a", actor_id)
        state = store.get_actor_state("user-a", actor_id)
        assert len(intentions) == 1
        assert intentions[0]["status"] == "active"
        assert intentions[0]["decision_context"]["candidate_scores"]
        assert intentions[0]["decision_key"].endswith("npc-intention-rules-v1")
        if intentions[0]["template_id"] != "reconnect_friend":
            assert intentions[0]["target_actor_id"] is None
        assert state["active_goals"][0]["summary"] == intentions[0]["summary"]


def test_high_social_need_selects_contact_and_completion_changes_relationship(tmp_path):
    store, service = make_service(tmp_path)
    actor_id = "npc_preset_1"
    set_actor_needs(
        store,
        actor_id,
        energy=50,
        hunger=20,
        stress=20,
        social_need=94,
        solitude_need=18,
    )

    formed = service.npc_intentions.materialize_due(
        "user-a", "Asia/Shanghai", now=START
    )
    intention = store.list_actor_intentions("user-a", actor_id, limit=1)[0]

    assert formed.formed == 3
    assert intention["template_id"] == "reconnect_friend"
    assert intention["target_actor_id"]
    assert intention["decision_context"]["metric"] == "social_need"

    completed_at = START + timedelta(hours=7)
    completed = service.npc_intentions.materialize_due(
        "user-a", "Asia/Shanghai", now=completed_at
    )
    resolved = store.list_actor_intentions("user-a", actor_id, limit=1)[0]
    event = next(
        item
        for item in store.list_actor_events("user-a", actor_id)
        if item["facts"].get("source_kind") == "npc_intention"
    )
    relationship = next(
        item
        for item in store.list_relationships("user-a", actor_id)
        if item["other_ai_id"] == intention["target_actor_id"]
    )

    assert completed.completed == 3
    assert resolved["status"] == "completed"
    assert resolved["outcome_event_id"] == event["event_id"]
    assert event["facts"]["intention_instance_id"] == intention[
        "intention_instance_id"
    ]
    assert event["schedule_id"] is None
    assert event["event_id"] in relationship["evidence_event_ids"]
    assert relationship["familiarity"] == 2
    assert store.get_actor_state("user-a", actor_id)["active_goals"] == []

    replay = service.npc_intentions.materialize_due(
        "user-a", "Asia/Shanghai", now=completed_at
    )
    assert replay.completed == 0
    assert len(store.list_actor_events("user-a", actor_id)) == 1


def test_intention_api_is_owner_scoped_and_hides_decision_internals(
    tmp_path, monkeypatch
):
    store, service = make_service(tmp_path)
    service.npc_intentions.materialize_due(
        "user-a", "Asia/Shanghai", now=START
    )
    app = FastAPI()
    app.include_router(create_life_router(service))
    current = {"id": "user-a", "username": "a"}
    app.dependency_overrides[get_current_user] = lambda: current
    monkeypatch.setattr("life_simulation.service.utc_now", lambda: START)
    client = TestClient(app)

    response = client.get("/api/life/actors/npc_preset_1/intentions")

    assert response.status_code == 200
    assert response.json()["count"] == 1
    item = response.json()["items"][0]
    assert item["summary"]
    assert item["status"] == "active"
    assert "decision_context" not in item
    assert "motivation" not in item
    assert "action" not in item
    assert "score" not in item

    current["id"] = "user-b"
    other = client.get("/api/life/actors/npc_preset_1/intentions")
    assert other.status_code == 200
    assert other.json()["count"] == 1
    assert other.json()["items"][0]["intention_instance_id"] != item[
        "intention_instance_id"
    ]


def test_active_named_npc_intention_enters_chat_as_plan_not_fact(tmp_path):
    store, service = make_service(tmp_path)
    service.npc_intentions.materialize_due(
        "user-a", "Asia/Shanghai", now=START
    )
    intention = store.list_actor_intentions(
        "user-a", "npc_preset_2", status="active", limit=1
    )[0]
    name = service.characters.display_name("user-a", "npc_preset_2")

    context = LifeChatContextService(service).build_context(
        "user-a", f"{name}最近有什么打算？", now=START
    )

    assert f"[NPC近期打算·{name}]" in context
    assert intention["summary"] in context
    assert "不要说成已经发生的事实" in context
    assert "candidate_scores" not in context
    assert "motivation" not in context
