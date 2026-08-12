from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth_api import get_current_user
from life_simulation.api import create_life_router
from life_simulation.chat_context import LifeChatContextService
from life_simulation.continuity import LifeContinuityDirector
from life_simulation.models import LifeEventDraft, LifeWindow, SimulationResult
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


START = datetime(2026, 8, 9, 15, 0, tzinfo=timezone.utc)


def make_service(tmp_path):
    store = LifeStore(str(tmp_path / "npc-interactions.sqlite3"))
    return store, LifeSettlementService(store)


def test_npc_interactions_have_one_fact_two_perspectives_and_bidirectional_relations(
    tmp_path,
):
    store, service = make_service(tmp_path)
    service.ensure_world("user-a", now=START)
    service.ensure_world("user-b", now=START)
    end = START + timedelta(days=4)

    first = service.settle_due("user-a", now=end)
    second = service.settle_due("user-a", now=end)

    assert first.interaction_settlement["npc_events_created"] >= 1
    assert second.interaction_settlement["npc_events_created"] == 0
    interactions = store.list_interaction_events("user-a", limit=100)
    npc_interactions = [
        event
        for event in interactions
        if event["facts"].get("source_kind") == "npc_schedule_overlap"
    ]
    assert npc_interactions
    event = npc_interactions[0]
    participant_ids = [item["actor_id"] for item in event["participants"]]
    assert len(participant_ids) == 2
    assert set(event["perspectives"]) == set(participant_ids)
    assert all(
        event["perspectives"][actor_id]["interpretation"]
        for actor_id in participant_ids
    )
    assert event["perspectives"][participant_ids[0]]["private_thought"] != event[
        "perspectives"
    ][participant_ids[1]]["private_thought"]
    assert len(event["facts"]["source_schedule_ids"]) == 2

    first_side = next(
        item
        for item in store.list_relationships("user-a", participant_ids[0])
        if item["other_ai_id"] == participant_ids[1]
    )
    second_side = next(
        item
        for item in store.list_relationships("user-a", participant_ids[1])
        if item["other_ai_id"] == participant_ids[0]
    )
    assert event["event_id"] in first_side["evidence_event_ids"]
    assert event["event_id"] in second_side["evidence_event_ids"]
    assert first_side["familiarity"] == second_side["familiarity"]
    assert store.list_interaction_events("user-b") == []
    assert store.list_relationships("user-b", participant_ids[0]) == []


def test_una_friend_chat_is_bridged_without_double_counting_lead_relation(tmp_path):
    store, service = make_service(tmp_path)
    service.ensure_world("user-a", now=START)
    profile = store.get_profile("user-a")
    state = store.get_state("user-a")
    window = LifeWindow(
        key="bridge_friend_chat",
        label="朋友聊天",
        start_at=START,
        end_at=START + timedelta(hours=1),
    )
    draft = LifeEventDraft(
        event_type="friend_chat",
        status="completed",
        start_at=window.start_at,
        end_at=window.end_at,
        location_id="neighborhood_cafe",
        summary="和朋友聊了聊最近的事情。",
        facts={"requested_participant_ai_id": "npc_preset_1"},
        importance=46,
        mentionability=78,
        publicability=35,
        interpretation="这是一次轻松的交流。",
        private_thought="听见对方的近况，感觉彼此没有疏远。",
    )
    enriched = LifeContinuityDirector(service.characters).enrich(
        "user-a",
        "ai_una",
        profile,
        window,
        SimulationResult(event=draft, state=dict(state)),
        store,
    )
    status, source = store.apply_window(
        "user-a",
        "ai_una",
        window,
        enriched,
        int(state["state_version"]),
        "bridge-test-v1",
        window.end_at,
    )
    assert status == "applied"

    first = service.npc_interactions.materialize_due(
        "user-a", "Asia/Shanghai", now=window.end_at
    )
    second = service.npc_interactions.materialize_due(
        "user-a", "Asia/Shanghai", now=window.end_at
    )

    assert first.lead_events_bridged == 1
    assert second.lead_events_bridged == 0
    interaction = store.list_interaction_events(
        "user-a", actor_id="npc_preset_1"
    )[0]
    assert interaction["facts"]["source_event_id"] == source["event_id"]
    assert {item["actor_id"] for item in interaction["participants"]} == {
        "ai_una",
        "npc_preset_1",
    }
    assert set(interaction["perspectives"]) == {"ai_una", "npc_preset_1"}
    lead_relation = store.list_relationships("user-a", "ai_una")[0]
    npc_relation = store.list_relationships("user-a", "npc_preset_1")[0]
    assert lead_relation["familiarity"] == 3
    assert npc_relation["other_ai_id"] == "ai_una"
    assert npc_relation["familiarity"] == 3


def test_interaction_api_hides_private_perspectives_and_is_owner_scoped(
    tmp_path, monkeypatch
):
    store, service = make_service(tmp_path)
    service.ensure_world("user-a", now=START)
    end = START + timedelta(days=4)
    service.settle_due("user-a", now=end)
    interaction = store.list_interaction_events("user-a", limit=1)[0]
    actor_id = interaction["participants"][0]["actor_id"]
    if actor_id == "ai_una":
        actor_id = interaction["participants"][1]["actor_id"]

    app = FastAPI()
    app.include_router(create_life_router(service))
    current = {"id": "user-a", "username": "a"}
    app.dependency_overrides[get_current_user] = lambda: current
    monkeypatch.setattr("life_simulation.service.utc_now", lambda: end)
    client = TestClient(app)

    events = client.get(f"/api/life/actors/{actor_id}/interactions")
    relationships = client.get(f"/api/life/actors/{actor_id}/relationships")

    assert events.status_code == 200
    assert events.json()["count"] >= 1
    item = events.json()["items"][0]
    assert "facts" not in item
    assert "perspectives" not in item
    assert "private_thought" not in str(item)
    assert item["perspective"]["interpretation"]
    assert relationships.status_code == 200
    assert relationships.json()["count"] >= 1
    assert "private_summary" not in relationships.json()["items"][0]

    current["id"] = "user-b"
    assert (
        client.get(f"/api/life/actors/{actor_id}/interactions").json()["count"]
        == 0
    )


def test_shared_interaction_can_enter_named_npc_chat_context(tmp_path):
    store, service = make_service(tmp_path)
    service.ensure_world("user-a", now=START)
    end = START + timedelta(days=4)
    service.settle_due("user-a", now=end)
    interaction = next(
        event
        for event in store.list_interaction_events("user-a", limit=100)
        if event["facts"].get("source_kind") == "npc_schedule_overlap"
    )
    actor_id = interaction["participants"][0]["actor_id"]
    actor_name = service.characters.display_name("user-a", actor_id)

    context = LifeChatContextService(service).build_context(
        "user-a", f"{actor_name}最近和朋友怎么样？", now=end
    )

    assert "[共同经历·" in context
    assert interaction["summary"] in context
    assert f"从{actor_name}的视角看" in context
    assert "private_thought" not in context
    assert "不要公开任何私密想法" in context
