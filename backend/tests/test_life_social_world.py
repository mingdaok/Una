from datetime import datetime, timedelta, timezone
import sqlite3

import social_db
from life_simulation.models import LifeEventDraft, LifeWindow, SimulationResult
from life_simulation.service import LifeSettlementService
from life_simulation.social_world import LifeSocialWorldService
from life_simulation.store import LifeStore


def add_friend_event(store, owner_user_id, start_at, participant_id="ai_zhixia"):
    state = store.get_state(owner_user_id)
    end_at = start_at + timedelta(hours=1)
    window = LifeWindow(
        key="test_friend_chat",
        label="朋友来往",
        start_at=start_at,
        end_at=end_at,
    )
    draft = LifeEventDraft(
        event_type="friend_chat",
        status="completed",
        start_at=start_at,
        end_at=end_at,
        location_id="neighborhood_cafe",
        summary="和知夏聊了聊最近各自忙的事情。",
        facts={"source": "test"},
        importance=46,
        mentionability=80,
        publicability=40,
        participant_ids=[participant_id],
        interpretation="一次自然的朋友来往。",
    )
    status, event = store.apply_window(
        owner_user_id,
        "ai_una",
        window,
        SimulationResult(event=draft, state=dict(state)),
        int(state["state_version"]),
        "test-social-world-v1",
        end_at,
    )
    assert status == "applied"
    return event, end_at


def make_services(monkeypatch, tmp_path):
    database_path = str(tmp_path / "social-world.sqlite3")
    monkeypatch.setattr(social_db, "DB_PATH", database_path)
    social_db.init_social_tables()
    store = LifeStore(database_path)
    settlement = LifeSettlementService(store)
    start_at = datetime(2026, 8, 10, 8, 0, tzinfo=timezone.utc)
    settlement.ensure_world("user-a", now=start_at)
    settlement.ensure_world("user-b", now=start_at)
    return store, LifeSocialWorldService(store, social_db), start_at


def test_friend_event_materializes_isolated_npc_post_and_una_interaction(monkeypatch, tmp_path):
    store, social_world, start_at = make_services(monkeypatch, tmp_path)
    event, end_at = add_friend_event(store, "user-a", start_at)

    first = social_world.materialize_due("user-a", now=end_at + timedelta(minutes=1))
    second = social_world.materialize_due("user-a", now=end_at + timedelta(minutes=2))

    assert first.posts_created == 1
    assert first.likes_created == 1
    assert first.comments_created == 1
    assert second.posts_created == 0
    assert second.likes_created == 0
    assert second.comments_created == 0

    feed = social_db.get_feed("user-a")
    assert feed["total"] == 1
    post = feed["items"][0]
    assert post["author_id"] == "npc_preset_2"
    assert post["author_name"] == "知夏"
    assert post["author_type"] == "npc"
    assert post["source_event_ids"] == [event["event_id"]]
    assert post["generation_reason"] == "npc_social_world"
    assert post["likes"] == [
        {"user_id": "ai_una", "user_name": "UNA", "timestamp": "2026-08-10 09:00:00"}
    ]
    assert len(post["comments"]) == 1
    assert post["comments"][0]["user_id"] == "ai_una"
    assert post["comments"][0]["source_event_id"] == event["event_id"]
    assert social_db.get_feed("user-b")["items"] == []


def test_autonomous_npc_events_become_source_tracked_posts(monkeypatch, tmp_path):
    store, social_world, start_at = make_services(monkeypatch, tmp_path)
    settlement = LifeSettlementService(store)
    end_at = start_at + timedelta(hours=8)
    settlement.settle_due("user-a", now=end_at)

    first = social_world.materialize_due(
        "user-a", now=end_at + timedelta(minutes=1)
    )
    second = social_world.materialize_due(
        "user-a", now=end_at + timedelta(minutes=2)
    )

    assert first.posts_created == 3
    assert first.likes_created == 3
    assert first.comments_created == 0
    assert second.posts_created == 0
    assert second.likes_created == 0
    feed = social_db.get_feed("user-a")
    assert feed["total"] == 3
    source_ids = []
    for post in feed["items"]:
        assert post["author_type"] == "npc"
        assert post["generation_reason"] == "npc_autonomous_event"
        assert len(post["source_event_ids"]) == 1
        source_ids.extend(post["source_event_ids"])
        actor_events = store.list_actor_events("user-a", post["author_id"])
        source_event = next(
            event
            for event in actor_events
            if event["event_id"] == post["source_event_ids"][0]
        )
        assert post["content"] == source_event["summary"]
        assert source_event["publicability"] >= 50
    assert len(source_ids) == len(set(source_ids))
    assert social_db.get_feed("user-b")["items"] == []


def test_social_world_respects_switch_and_unknown_participants(monkeypatch, tmp_path):
    store, social_world, start_at = make_services(monkeypatch, tmp_path)
    _, end_at = add_friend_event(store, "user-a", start_at, participant_id="ai_unknown")

    unknown = social_world.materialize_due("user-a", now=end_at + timedelta(minutes=1))
    assert unknown.posts_created == 0
    assert unknown.skipped == 1

    store.update_settings(
        "user-a",
        "ai_una",
        {"social_posts_enabled": False},
        end_at + timedelta(minutes=2),
    )
    add_friend_event(store, "user-a", end_at + timedelta(hours=1), participant_id="ai_xiaoman")
    disabled = social_world.materialize_due("user-a", now=end_at + timedelta(hours=3))
    assert disabled.as_dict() == {
        "scanned_events": 0,
        "matched_events": 0,
        "posts_created": 0,
        "likes_created": 0,
        "comments_created": 0,
        "skipped": 0,
    }
    assert social_db.get_feed("user-a")["items"] == []


def test_existing_comments_table_gains_social_world_metadata(monkeypatch, tmp_path):
    database_path = str(tmp_path / "social-comments-migration.sqlite3")
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE una_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                user_name TEXT DEFAULT '',
                content TEXT NOT NULL,
                reply_to_id INTEGER DEFAULT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

    monkeypatch.setattr(social_db, "DB_PATH", database_path)
    social_db.init_social_tables()

    with sqlite3.connect(database_path) as connection:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(una_comments)")}
        indexes = {row[1] for row in connection.execute("PRAGMA index_list(una_comments)")}
    assert {"generation_reason", "source_event_id", "idempotency_key"} <= columns
    assert "idx_una_comments_life_idempotency" in indexes
