from datetime import datetime, timedelta, timezone

from life_simulation.models import LifeWindow, RelationshipChange
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


START = datetime(2026, 8, 11, 1, 0, tzinfo=timezone.utc)


def make_service(tmp_path):
    store = LifeStore(str(tmp_path / "relationship-dynamics.sqlite3"))
    service = LifeSettlementService(store)
    service.ensure_world("user-a", now=START)
    return store, service


def seed_bidirectional_relation(
    store, service, actor_a, actor_b, *, familiarity=0, affinity=0, trust=0, tension=0
):
    event_key = f"relationship-seed:{actor_a}:{actor_b}"
    change_a = RelationshipChange(
        other_ai_id=actor_b,
        display_name=service.characters.display_name("user-a", actor_b),
        familiarity_delta=familiarity,
        affinity_delta=affinity,
        trust_delta=trust,
        tension_delta=tension,
    )
    change_b = RelationshipChange(
        other_ai_id=actor_a,
        display_name=service.characters.display_name("user-a", actor_a),
        familiarity_delta=familiarity,
        affinity_delta=affinity,
        trust_delta=trust,
        tension_delta=tension,
    )
    store.create_interaction_event(
        "user-a",
        event={
            "event_type": "test_relationship_seed",
            "status": "completed",
            "start_at": START,
            "end_at": START,
            "location_id": "test",
            "summary": "测试关系种子。",
            "facts": {"source_kind": "test"},
            "importance": 1,
            "mentionability": 1,
            "publicability": 1,
            "idempotency_key": event_key,
        },
        participants=[
            {"actor_id": actor_a, "participant_role": "participant"},
            {"actor_id": actor_b, "participant_role": "participant"},
        ],
        perspectives={actor_a: {}, actor_b: {}},
        relationship_changes=[(actor_a, change_a), (actor_b, change_b)],
        now=START,
    )


def test_relationship_tiers_are_directional_and_exposed_safely(tmp_path):
    _, service = make_service(tmp_path)
    seed_bidirectional_relation(
        service.store,
        service,
        "npc_preset_1",
        "npc_preset_2",
        familiarity=70,
        affinity=68,
        trust=72,
        tension=4,
    )

    relationship = service.list_actor_relationships(
        "user-a", "npc_preset_1"
    )[0]

    assert relationship["relationship_tier"] == "trusted"
    assert relationship["closeness_score"] >= 65
    assert relationship["disclosure_level"] == "trusted"
    assert "private_summary" in relationship


def test_interaction_memories_are_owner_scoped_and_reach_decision_planning(tmp_path):
    store, service = make_service(tmp_path)
    seed_bidirectional_relation(
        store,
        service,
        "npc_preset_1",
        "npc_preset_2",
        familiarity=55,
        affinity=50,
        trust=48,
        tension=6,
    )
    actor = service.characters.get_actor("user-a", "npc_preset_1")
    memories = store.list_actor_memories("user-a", actor["actor_id"])
    relationships = store.list_relationships("user-a", actor["actor_id"])

    assert memories[0]["metadata"]["other_actor_id"] == "npc_preset_2"
    assert store.list_actor_memories("user-b", actor["actor_id"]) == []

    plan = service.npc_life.engine.plan(
        "user-a",
        actor,
        LifeWindow(
            key="evening",
            label="晚上",
            start_at=START + timedelta(hours=1),
            end_at=START + timedelta(hours=5),
        ),
        state=store.get_actor_state("user-a", actor["actor_id"]),
        relationships=tuple(relationships),
        memories=tuple(memories),
    )
    evidence = plan["decision"]["candidate_scores"]

    assert any(item["source"] == "relationship" for item in evidence)
    assert any(item["source"] == "memory" for item in evidence)
    assert any(
        item["components"]["relationship_motivation"] > 0
        for item in evidence if item["source"] == "relationship"
    )
    assert any(
        item["components"]["memory_relevance"] > 0
        for item in evidence if item["source"] == "memory"
    )
    assert "测试关系种子" not in str(evidence)


def test_high_closeness_pair_is_preferred_for_interaction(tmp_path):
    _, service = make_service(tmp_path)
    seed_bidirectional_relation(
        service.store,
        service,
        "npc_preset_1",
        "npc_preset_2",
        familiarity=80,
        affinity=80,
        trust=80,
        tension=0,
    )
    contacts = service.characters.list_contacts("user-a")

    pair = service.npc_interactions._pair_for_day(
        "user-a", contacts, START.date().toordinal()
    )

    assert {item["actor_id"] for item in pair} == {
        "npc_preset_1",
        "npc_preset_2",
    }


def test_conflict_then_repair_uses_shared_events_and_bidirectional_evidence(
    tmp_path, monkeypatch
):
    store, service = make_service(tmp_path)
    actor_a = service.characters.get_actor("user-a", "npc_preset_1")
    actor_b = service.characters.get_actor("user-a", "npc_preset_2")
    seed_bidirectional_relation(
        store,
        service,
        actor_a["actor_id"],
        actor_b["actor_id"],
        familiarity=45,
        affinity=35,
        trust=30,
        tension=40,
    )
    monkeypatch.setattr(service.relationship_dynamics, "_seed", lambda *parts: 0)
    first_window = LifeWindow(
        key="evening",
        label="晚上",
        start_at=START,
        end_at=START + timedelta(hours=4),
    )
    conflict = service.npc_interactions._template_for_day(
        "user-a", actor_a, actor_b, START.date().toordinal()
    )

    assert conflict.interaction_kind == "conflict"
    assert service.npc_interactions._create_npc_interaction(
        "user-a",
        actor_a,
        actor_b,
        conflict,
        first_window,
        {actor_a["actor_id"]: "a", actor_b["actor_id"]: "b"},
        first_window.end_at,
    )
    after_conflict = service.relationship_dynamics.aggregate(
        "user-a", actor_a["actor_id"], actor_b["actor_id"]
    )
    assert after_conflict["tension"] == 52
    assert after_conflict["trust"] == 27

    repair = service.npc_interactions._template_for_day(
        "user-a", actor_a, actor_b, START.date().toordinal() + 3
    )
    assert repair.interaction_kind == "repair"
    second_window = LifeWindow(
        key="evening",
        label="晚上",
        start_at=START + timedelta(days=3),
        end_at=START + timedelta(days=3, hours=4),
    )
    assert service.npc_interactions._create_npc_interaction(
        "user-a",
        actor_a,
        actor_b,
        repair,
        second_window,
        {actor_a["actor_id"]: "c", actor_b["actor_id"]: "d"},
        second_window.end_at,
    )
    assert not service.npc_interactions._create_npc_interaction(
        "user-a",
        actor_a,
        actor_b,
        repair,
        second_window,
        {actor_a["actor_id"]: "c", actor_b["actor_id"]: "d"},
        second_window.end_at,
    )
    after_repair = service.relationship_dynamics.aggregate(
        "user-a", actor_a["actor_id"], actor_b["actor_id"]
    )
    assert after_repair["tension"] == 36
    assert after_repair["trust"] == 32
    events = store.list_interaction_events(
        "user-a", actor_id=actor_a["actor_id"], limit=10
    )
    repair_event = next(
        event for event in events if event["facts"].get("interaction_kind") == "repair"
    )
    relation = next(
        item
        for item in store.list_relationships("user-a", actor_a["actor_id"])
        if item["other_ai_id"] == actor_b["actor_id"]
    )
    assert repair_event["event_id"] in relation["evidence_event_ids"]
