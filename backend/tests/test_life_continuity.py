from datetime import datetime, timedelta, timezone
import sqlite3

from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth_api import get_current_user
from life_simulation.api import create_life_router
from life_simulation.chat_context import LifeChatContextService
from life_simulation.continuity import LifeContinuityDirector
from life_simulation.models import LifeEventDraft, LifeWindow, SimulationResult
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


def apply_event(store, director, owner_user_id, event_type, start_at):
    profile = store.get_profile(owner_user_id)
    state = store.get_state(owner_user_id)
    end_at = start_at + timedelta(hours=1)
    window = LifeWindow(
        key=f"test_{event_type}",
        label="测试窗口",
        start_at=start_at,
        end_at=end_at,
    )
    draft = LifeEventDraft(
        event_type=event_type,
        status="completed",
        start_at=start_at,
        end_at=end_at,
        location_id="studio" if event_type != "friend_chat" else "neighborhood_cafe",
        summary=f"{event_type} 普通事件",
        facts={"source": "test"},
        importance=35,
        mentionability=60,
        publicability=30,
        interpretation="这是一次有连续意义的生活片段。",
    )
    result = director.enrich(
        owner_user_id,
        "ai_una",
        profile,
        window,
        SimulationResult(event=draft, state=dict(state)),
        store,
    )
    status, event = store.apply_window(
        owner_user_id,
        "ai_una",
        window,
        result,
        int(state["state_version"]),
        "test-continuity-v1",
        end_at,
    )
    assert status == "applied"
    return event, end_at


def make_world(tmp_path, owner_user_id="user-a"):
    store = LifeStore(str(tmp_path / "continuity.sqlite3"))
    service = LifeSettlementService(store)
    start = datetime(2026, 8, 9, 0, 0, tzinfo=timezone.utc)
    service.ensure_world(owner_user_id, now=start)
    return store, service, start


def test_creative_events_form_and_complete_one_story_arc(tmp_path):
    store, _, current = make_world(tmp_path)
    director = LifeContinuityDirector()

    stages = []
    arc_ids = []
    for event_type in (
        "creative_practice",
        "focused_work",
        "creative_practice",
        "creative_practice",
        "creative_practice",
    ):
        event, current = apply_event(store, director, "user-a", event_type, current)
        arc_ids.append(event["story_arc_id"])
        arc = store.list_story_arcs("user-a", limit=1)[0]
        stages.append(arc["stage"])

    assert stages == ["spark", "exploring", "shaping", "finishing", "completed"]
    assert len(set(arc_ids)) == 1
    completed = store.list_story_arcs("user-a", status="completed")[0]
    assert completed["state"]["progress"] == 8
    assert completed["completed_at"] is not None
    latest_event = store.list_events("user-a", limit=1)[0]
    assert latest_event["summary"] == "把那个断断续续做了几天的作品认真完成了。"
    assert latest_event["follow_up_required"] is True


def test_friend_events_accumulate_one_private_relationship_per_owner(tmp_path):
    store, service, current = make_world(tmp_path)
    service.ensure_world("user-b", now=current)
    director = LifeContinuityDirector()

    first_event, current = apply_event(store, director, "user-a", "friend_chat", current)
    second_event, _ = apply_event(store, director, "user-a", "friend_chat", current)

    relationships = store.list_relationships("user-a")
    assert len(relationships) == 1
    relationship = relationships[0]
    assert relationship["display_name"] in {"小满", "知夏", "阿岚"}
    assert relationship["familiarity"] == 6
    assert relationship["affinity"] == 4
    assert relationship["trust"] == 2
    assert len(relationship["evidence_event_ids"]) == 2
    assert first_event["participant_ids"] == second_event["participant_ids"]
    assert store.list_relationships("user-b") == []


def test_chat_context_mentions_an_active_story_for_direct_life_questions(tmp_path):
    store, service, current = make_world(tmp_path)
    apply_event(store, LifeContinuityDirector(), "user-a", "creative_practice", current)

    context = LifeChatContextService(service).build_context(
        "user-a",
        "你最近的生活怎么样？",
        now=current + timedelta(hours=1),
    )

    assert "[持续中的事]" in context
    assert "把零碎光影做成完整作品" in context
    assert "刚刚有了想法" in context


def test_continuity_api_is_owner_scoped_and_hides_internal_fields(tmp_path):
    store, service, current = make_world(tmp_path)
    director = LifeContinuityDirector()
    apply_event(store, director, "user-a", "creative_practice", current)
    apply_event(store, director, "user-a", "friend_chat", current + timedelta(hours=1))

    app = FastAPI()
    app.include_router(create_life_router(service))
    current_user = {"id": "user-a", "username": "a"}
    app.dependency_overrides[get_current_user] = lambda: current_user
    client = TestClient(app)

    arc = client.get("/api/life/arcs?status=active").json()["items"][0]
    assert arc["stage_label"] == "刚刚有了想法"
    assert "state" not in arc
    assert "owner_user_id" not in arc

    relationship = client.get("/api/life/relationships").json()["items"][0]
    assert relationship["display_name"]
    assert "private_summary" not in relationship
    assert "evidence_event_ids" not in relationship
    assert "owner_user_id" not in relationship

    current_user["id"] = "user-b"
    assert client.get("/api/life/arcs").json()["items"] == []
    assert client.get("/api/life/relationships").json()["items"] == []


def test_existing_continuity_tables_gain_lead_and_display_columns(tmp_path):
    database_path = tmp_path / "continuity-migration.sqlite3"
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE ai_story_arcs (
                story_arc_id TEXT PRIMARY KEY,
                owner_user_id TEXT NOT NULL,
                status TEXT NOT NULL,
                last_advanced_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE ai_relationships (
                owner_user_id TEXT NOT NULL,
                ai_id TEXT NOT NULL,
                other_ai_id TEXT NOT NULL
            )
            """
        )

    LifeStore(str(database_path))

    with sqlite3.connect(database_path) as connection:
        arc_columns = {
            row[1] for row in connection.execute("PRAGMA table_info(ai_story_arcs)")
        }
        relationship_columns = {
            row[1] for row in connection.execute("PRAGMA table_info(ai_relationships)")
        }
    assert "lead_ai_id" in arc_columns
    assert "display_name" in relationship_columns
