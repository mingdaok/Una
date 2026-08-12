from datetime import datetime, timedelta, timezone
import sqlite3

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth_api import get_current_user
from life_simulation.api import create_life_router
from life_simulation.chat_context import LifeChatContextService
from life_simulation.choices import LifeChoiceService
from life_simulation.models import LifeWindow
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


NOW = datetime(2026, 8, 10, 12, 0, tzinfo=timezone.utc)


def make_world(tmp_path):
    store = LifeStore(str(tmp_path / "choices.sqlite3"))
    service = LifeSettlementService(store)
    service.ensure_world("user-a", now=NOW)
    service.ensure_world("user-b", now=NOW)
    return store, service, LifeChoiceService(store)


def seed_relationship(store, owner="user-a"):
    with sqlite3.connect(store.database_path) as connection:
        connection.execute(
            """
            INSERT INTO ai_relationships (
                owner_user_id, ai_id, other_ai_id, display_name, familiarity,
                affinity, trust, tension, obligation, last_interaction_at, updated_at
            ) VALUES (?, 'ai_una', 'ai_xiaoman', '小满', 8, 5, 3, 0, 0, ?, ?)
            """,
            (owner, NOW.isoformat(), NOW.isoformat()),
        )


def seed_completed_arc(store):
    with sqlite3.connect(store.database_path) as connection:
        connection.execute(
            """
            INSERT INTO ai_story_arcs (
                story_arc_id, owner_user_id, lead_ai_id, arc_type, title, status,
                stage, participant_ai_ids_json, state_json, impact_level,
                started_at, last_advanced_at, completed_at
            ) VALUES (
                'arc-finished', 'user-a', 'ai_una', 'creative_project',
                '把零碎光影做成完整作品', 'completed', 'completed', '[]', '{}',
                'ordinary', ?, ?, ?
            )
            """,
            (
                (NOW - timedelta(days=2)).isoformat(),
                NOW.isoformat(),
                NOW.isoformat(),
            ),
        )


def test_materializes_one_owner_scoped_choice_idempotently(tmp_path):
    store, _, choices = make_world(tmp_path)
    seed_relationship(store)

    first = choices.materialize_due("user-a", now=NOW)
    second = choices.materialize_due("user-a", now=NOW + timedelta(minutes=5))

    assert first["choice_id"] == second["choice_id"]
    assert first["choice_type"] == "relationship_invitation"
    assert len(first["options"]) == 3
    assert store.list_story_choices("user-b", status="pending") == []


def test_completed_creative_arc_takes_priority(tmp_path):
    store, _, choices = make_world(tmp_path)
    seed_relationship(store)
    seed_completed_arc(store)

    choice = choices.materialize_due("user-a", now=NOW)

    assert choice["source_kind"] == "story_arc"
    assert choice["source_id"] == "arc-finished"
    assert "作品终于完成" in choice["prompt"]


def test_resolve_is_atomic_idempotent_and_becomes_chat_memory(tmp_path):
    store, service, choices = make_world(tmp_path)
    seed_relationship(store)
    choice = choices.materialize_due("user-a", now=NOW)

    result = choices.resolve(
        "user-a", choice["choice_id"], "encourage", now=NOW + timedelta(minutes=1)
    )
    repeated = choices.resolve(
        "user-a", choice["choice_id"], "encourage", now=NOW + timedelta(minutes=2)
    )

    assert result["choice"]["status"] == "resolved"
    assert repeated["intention"]["intention_id"] == result["intention"]["intention_id"]
    goals = store.get_state("user-a")["active_goals"]
    assert any(
        isinstance(goal, dict) and goal["summary"] == result["intention"]["summary"]
        for goal in goals
    )
    assert len(store.list_active_intentions("user-a")) == 1
    context = LifeChatContextService(service).build_context(
        "user-a", "还记得我们商量过的决定吗？", now=NOW + timedelta(minutes=3)
    )
    assert "[一起商量过]" in context
    assert result["intention"]["summary"] in context
    assert "建议而不是命令" in context

    with pytest.raises(ValueError, match="另一种方式"):
        choices.resolve(
            "user-a", choice["choice_id"], "slow", now=NOW + timedelta(minutes=3)
        )
    assert choices.resolve(
        "user-b", choice["choice_id"], "encourage", now=NOW + timedelta(minutes=3)
    ) is None


def test_encouraged_invitation_becomes_a_future_npc_event(tmp_path):
    store, service, choices = make_world(tmp_path)
    seed_relationship(store)
    choice = choices.materialize_due("user-a", now=NOW)
    resolved = choices.resolve(
        "user-a", choice["choice_id"], "encourage", now=NOW + timedelta(minutes=1)
    )
    profile = store.get_profile("user-a")
    state = store.get_state("user-a")
    window = LifeWindow(
        key="evening",
        label="傍晚",
        start_at=NOW + timedelta(hours=6),
        end_at=NOW + timedelta(hours=8),
    )

    simulation = service.engine.simulate("user-a", "ai_una", profile, state, window)
    directive = service.intention_executor.plan(
        "user-a", "ai_una", state, window
    )
    simulation = service.intention_executor.apply(directive, simulation, window)
    simulation = service.continuity.enrich(
        "user-a", "ai_una", profile, window, simulation, store
    )
    status, event = store.apply_window(
        "user-a",
        "ai_una",
        window,
        simulation,
        state["state_version"],
        service.engine.version,
        window.end_at,
    )

    assert status == "applied"
    assert event["event_type"] == "friend_chat"
    assert event["participant_ids"] == ["npc_preset_1"]
    assert "旧城区的新展" in event["summary"]
    assert store.list_active_intentions("user-a") == []
    assert store.get_state("user-a")["active_goals"] == []
    persisted_intention = store.list_intentions("user-a", limit=1)[0]
    assert persisted_intention["attempt_count"] == 1
    assert persisted_intention["last_attempt_at"] == window.end_at.isoformat()
    with sqlite3.connect(store.database_path) as connection:
        intention_status = connection.execute(
            "SELECT status FROM ai_life_intentions WHERE intention_id = ?",
            (resolved["intention"]["intention_id"],),
        ).fetchone()[0]
    assert intention_status == "fulfilled"
    context = LifeChatContextService(service).build_context(
        "user-a", "我们商量的事情后来呢？", now=window.end_at
    )
    assert "后来已经按自己的判断落实" in context


def test_off_setting_suppresses_new_choice(tmp_path):
    store, service, choices = make_world(tmp_path)
    seed_relationship(store)
    service.update_settings("user-a", {"major_plot_level": "off"})

    assert choices.materialize_due("user-a", now=NOW) is None
    assert store.list_story_choices("user-a") == []


def test_deferred_advice_waits_for_earliest_window(tmp_path):
    store, service, choices = make_world(tmp_path)
    seed_relationship(store)
    choice = choices.materialize_due("user-a", now=NOW)
    result = choices.resolve("user-a", choice["choice_id"], "slow", now=NOW)
    intention = result["intention"]
    assert intention["status"] == "deferred"
    assert datetime.fromisoformat(intention["earliest_at"]) == NOW + timedelta(hours=48)

    early_window = LifeWindow(
        key="late_night",
        label="深夜",
        start_at=NOW + timedelta(hours=24),
        end_at=NOW + timedelta(hours=26),
    )
    assert service.intention_executor.plan(
        "user-a", "ai_una", store.get_state("user-a"), early_window
    ) is None

    due_window = LifeWindow(
        key="late_night",
        label="深夜",
        start_at=NOW + timedelta(hours=48),
        end_at=NOW + timedelta(hours=50),
    )
    directive = service.intention_executor.plan(
        "user-a", "ai_una", store.get_state("user-a"), due_window
    )
    assert directive is not None
    assert directive.event_type == "reflection"
    assert directive.resolution_reason == "personal_pace_honored"


def test_overdue_intention_expires_and_removes_active_goal(tmp_path):
    store, _, choices = make_world(tmp_path)
    seed_relationship(store)
    choice = choices.materialize_due("user-a", now=NOW)
    resolved = choices.resolve("user-a", choice["choice_id"], "encourage", now=NOW)

    expired = store.expire_due_intentions(
        "user-a", "ai_una", now=NOW + timedelta(days=8)
    )

    assert expired == [resolved["intention"]["intention_id"]]
    intention = store.list_intentions("user-a", limit=1)[0]
    assert intention["status"] == "expired"
    assert intention["resolution_reason"] == "deadline_elapsed"
    assert store.get_state("user-a")["active_goals"] == []


def test_una_can_abandon_advice_when_wellbeing_conflicts(tmp_path):
    store, service, choices = make_world(tmp_path)
    seed_relationship(store)
    choice = choices.materialize_due("user-a", now=NOW)
    resolved = choices.resolve("user-a", choice["choice_id"], "encourage", now=NOW)
    profile = store.get_profile("user-a")
    state = store.get_state("user-a")
    state["stress"] = 90
    window = LifeWindow(
        key="evening",
        label="晚间",
        start_at=NOW + timedelta(hours=6),
        end_at=NOW + timedelta(hours=8),
    )
    base = service.engine.simulate("user-a", "ai_una", profile, state, window)
    directive = service.intention_executor.plan("user-a", "ai_una", state, window)
    assert directive.outcome == "abandoned"
    result = service.intention_executor.apply(directive, base, window)
    result = service.continuity.enrich(
        "user-a", "ai_una", profile, window, result, store
    )
    status, event = store.apply_window(
        "user-a",
        "ai_una",
        window,
        result,
        state["state_version"],
        service.engine.version,
        window.end_at,
    )

    assert status == "applied"
    assert event["event_type"] == "reflection"
    intention = store.list_intentions("user-a", limit=1)[0]
    assert intention["intention_id"] == resolved["intention"]["intention_id"]
    assert intention["status"] == "abandoned"
    assert intention["resolution_reason"] == "wellbeing_overrode_plan"


def test_choice_api_hides_internal_effects_and_is_owner_scoped(tmp_path):
    store, service, choices = make_world(tmp_path)
    seed_relationship(store)
    choice = choices.materialize_due("user-a", now=NOW)
    current_user = {"id": "user-a", "username": "a"}
    app = FastAPI()
    app.include_router(create_life_router(service, choices=choices))
    app.dependency_overrides[get_current_user] = lambda: current_user
    client = TestClient(app)

    payload = client.get("/api/life/choices?status=pending&limit=1").json()
    assert payload["items"][0]["choice_id"] == choice["choice_id"]
    assert set(payload["items"][0]["options"][0]) == {"id", "label", "description"}

    resolved = client.post(
        f"/api/life/choices/{choice['choice_id']}/resolve",
        json={"option_id": "encourage"},
    )
    assert resolved.status_code == 200
    assert "effect" not in resolved.json()["intention"]
    assert "owner_user_id" not in resolved.json()["choice"]
    assert "effect" not in resolved.json()["state"]["active_goals"][0]
    intentions = client.get("/api/life/intentions?limit=3").json()["items"]
    assert intentions[0]["intention_id"] == resolved.json()["intention"]["intention_id"]
    assert "effect" not in intentions[0]
    assert "conditions" not in intentions[0]

    current_user["id"] = "user-b"
    hidden = client.post(
        f"/api/life/choices/{choice['choice_id']}/resolve",
        json={"option_id": "encourage"},
    )
    assert hidden.status_code == 404


def test_intention_lifecycle_schema_is_versioned(tmp_path):
    store, _, _ = make_world(tmp_path)
    with sqlite3.connect(store.database_path) as connection:
        versions = connection.execute(
            "SELECT version, name FROM ai_life_schema_migrations ORDER BY version"
        ).fetchall()
        columns = {
            row[1]
            for row in connection.execute("PRAGMA table_info(ai_life_intentions)")
        }

    assert versions == [
        (1, "life_core_baseline"),
        (2, "life_table_compatibility"),
        (3, "expression_source_tracking"),
        (4, "intention_lifecycle"),
        (5, "character_profiles"),
        (6, "npc_autonomous_life_v1"),
        (7, "npc_relationship_interactions_v1"),
        (8, "npc_intentions_decisions_v1"),
        (9, "npc_user_suggestions_agency_v1"),
        (10, "npc_acceptance_tools_v1"),
        (11, "unified_content_evidence_v1"),
    ]
    assert {
        "priority",
        "earliest_at",
        "deadline_at",
        "conditions_json",
        "attempt_count",
        "last_attempt_at",
        "resolution_reason",
        "updated_at",
    } <= columns
