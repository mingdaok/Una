from datetime import datetime, timedelta, timezone

from life_simulation.models import RelationshipChange
from life_simulation.reflection import ReflectionService
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


NOW = datetime(2026, 9, 1, 12, 0, tzinfo=timezone.utc)


def make_service(tmp_path):
    store = LifeStore(str(tmp_path / "reflection.sqlite3"))
    service = LifeSettlementService(store)
    service.ensure_world("user-a", now=NOW - timedelta(days=20))
    return store, service


def add_interaction(store, service, *, index, now):
    store.create_interaction_event(
        "user-a",
        event={
            "event_type": "npc_meetup", "status": "completed",
            "start_at": now - timedelta(minutes=45), "end_at": now,
            "location_id": "neighborhood_cafe", "summary": "两个人见面聊了近况。",
            "facts": {"source_kind": "test"}, "importance": 40,
            "mentionability": 50, "publicability": 10,
            "idempotency_key": f"reflection-test:{index}",
        },
        participants=[
            {"actor_id": "npc_preset_1"}, {"actor_id": "npc_preset_2"},
        ],
        perspectives={
            "npc_preset_1": {"interpretation": "这次交流让彼此更熟悉。"},
            "npc_preset_2": {"interpretation": "这次交流让彼此更熟悉。"},
        },
        relationship_changes=[
            ("npc_preset_1", RelationshipChange(
                other_ai_id="npc_preset_2", display_name="知夏",
                familiarity_delta=2, affinity_delta=1, trust_delta=1,
            )),
            ("npc_preset_2", RelationshipChange(
                other_ai_id="npc_preset_1", display_name="小满",
                familiarity_delta=2, affinity_delta=1, trust_delta=1,
            )),
        ],
        now=now,
    )


def test_daily_reflection_consolidates_memories_and_is_idempotent(tmp_path):
    store, service = make_service(tmp_path)
    add_interaction(store, service, index=1, now=NOW - timedelta(days=1, hours=2))
    add_interaction(store, service, index=2, now=NOW - timedelta(days=1, hours=1))
    actors = service.characters.list_contacts("user-a")

    first = ReflectionService(store).reflect_due("user-a", actors, now=NOW)
    replay = ReflectionService(store).reflect_due("user-a", actors, now=NOW)

    assert first.created >= len(actors) * 20
    assert first.memories_created >= 2
    assert first.memories_consolidated >= 4
    assert replay.created == 0
    memories = store.list_actor_memories("user-a", "npc_preset_1", limit=20)
    relation_memory = next(item for item in memories if item["memory_kind"] == "relationship")
    assert relation_memory["source_kind"] == "reflection"
    assert relation_memory["metadata"]["other_actor_id"] == "npc_preset_2"
    assert store.list_actor_reflections("user-b", "npc_preset_1") == []


def test_goal_review_supports_pause_recovery_failure_and_abandonment(tmp_path):
    store, service = make_service(tmp_path)
    actor = service.characters.get_actor("user-a", "npc_preset_1")
    goal = store.list_actor_goals("user-a", actor["actor_id"])[0]
    old = NOW - timedelta(days=20)
    with store._connect() as connection:
        connection.execute(
            "UPDATE ai_actor_goals SET progress = 0, status = 'active', "
            "created_at = ?, next_review_at = ? WHERE goal_id = ?",
            (old.isoformat(), old.isoformat(), goal["goal_id"]),
        )

    paused = service.reflections.goals.review_actor("user-a", actor, now=NOW)
    assert paused.transitions[0]["next_status"] == "paused"

    with store._connect() as connection:
        connection.execute(
            "UPDATE ai_actor_goals SET next_review_at = ? WHERE goal_id = ?",
            ((NOW + timedelta(days=7)).isoformat(), goal["goal_id"]),
        )
    recovered = service.reflections.goals.review_actor(
        "user-a", actor, now=NOW + timedelta(days=8)
    )
    assert recovered.transitions[0]["next_status"] == "active"

    transitions = store.list_goal_transitions("user-a", actor["actor_id"])
    assert {item["next_status"] for item in transitions} >= {"paused", "active"}
    assert all(item["public_reason"] for item in transitions)


def test_migration_17_adds_long_horizon_tables(tmp_path):
    store = LifeStore(str(tmp_path / "migration.sqlite3"))
    with store._connect() as connection:
        migration = connection.execute(
            "SELECT name FROM ai_life_schema_migrations WHERE version = 17"
        ).fetchone()
        tables = {
            row[0] for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }
        columns = {
            row[1] for row in connection.execute(
                "PRAGMA table_info(ai_memory_entries)"
            ).fetchall()
        }
    assert migration[0] == "npc_long_horizon_agency_v2"
    assert {"ai_actor_reflections", "ai_actor_goal_transitions", "ai_quality_evaluation_jobs"} <= tables
    assert {"salience", "activation_count", "last_activated_at", "superseded_by_memory_id"} <= columns


def test_reflection_backfills_each_missing_day_and_weekly_summary(tmp_path):
    start = datetime(2026, 8, 1, 12, tzinfo=timezone.utc)
    store = LifeStore(str(tmp_path / "reflection-backfill.sqlite3"))
    service = LifeSettlementService(store)
    service.ensure_world("user-a", now=start)
    actors = service.characters.list_contacts("user-a")

    first = service.reflections.reflect_due(
        "user-a", actors, now=start + timedelta(days=10)
    )
    replay = service.reflections.reflect_due(
        "user-a", actors, now=start + timedelta(days=10)
    )

    daily = store.list_actor_reflections(
        "user-a", "npc_preset_1", period_type="daily", limit=30
    )
    weekly = store.list_actor_reflections(
        "user-a", "npc_preset_1", period_type="weekly", limit=30
    )
    assert first.created >= len(actors) * 10
    assert len(daily) == 10
    assert weekly
    assert replay.created == 0


def test_contextual_memory_retrieval_ranks_and_activates_cross_type_matches(tmp_path):
    store = LifeStore(str(tmp_path / "memory-retrieval.sqlite3"))
    learned = NOW - timedelta(days=5)
    base = {
        "source_kind": "test", "confidence": 60, "salience": 50,
        "disclosure_level": "private",
    }
    store.upsert_consolidated_memory(
        "user-a", "npc_preset_1",
        memory={
            **base, "memory_id": "location-memory", "memory_kind": "episodic",
            "content": "在旧书店发生过一件事。",
            "metadata": {"location_id": "old_bookstore"},
        }, now=learned,
    )
    store.upsert_consolidated_memory(
        "user-a", "npc_preset_1",
        memory={
            **base, "memory_id": "relationship-memory",
            "memory_kind": "relationship", "content": "对朋友的长期判断。",
            "metadata": {"other_actor_id": "npc_preset_2"},
        }, now=learned,
    )
    store.upsert_consolidated_memory(
        "user-a", "npc_preset_1",
        memory={
            **base, "memory_id": "action-memory", "memory_kind": "self",
            "content": "做项目时积累的经验。",
            "metadata": {"action_type": "focus_project"},
        }, now=learned,
    )

    memories = store.list_actor_memories(
        "user-a", "npc_preset_1", limit=3,
        context={
            "location_id": "old_bookstore",
            "participant_ids": ["npc_preset_2"],
            "action_type": "focus_project",
        },
        activate_at=NOW,
    )
    activated = store.list_actor_memories(
        "user-a", "npc_preset_1", limit=3
    )

    assert all(item["retrieval_matches"] for item in memories)
    assert {item["memory_kind"] for item in memories} == {
        "episodic", "relationship", "self",
    }
    assert all(item["activation_count"] == 1 for item in activated)
    assert all(item["last_activated_at"] == NOW.isoformat() for item in activated)
