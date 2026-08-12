from datetime import datetime, timedelta, timezone
import sqlite3

from life_simulation.clock import completed_windows
from life_simulation.chat_context import LifeChatContextService
from life_simulation.engine import LifeSimulationEngine
from life_simulation.models import LifeWindow
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


def make_service(tmp_path):
    store = LifeStore(str(tmp_path / "life.sqlite3"))
    return store, LifeSettlementService(store)


def test_clock_returns_only_completed_windows_in_user_timezone():
    after = datetime(2026, 8, 9, 1, 30, tzinfo=timezone.utc)  # 上海 09:30
    until = datetime(2026, 8, 9, 6, 30, tzinfo=timezone.utc)  # 上海 14:30

    windows, capped = completed_windows(after, until, "Asia/Shanghai")

    assert capped is False
    assert [window.key for window in windows] == ["forenoon", "noon"]
    assert windows[0].end_at.hour == 12
    assert windows[1].end_at.hour == 14


def test_rule_engine_is_deterministic_for_same_world_and_window():
    engine = LifeSimulationEngine()
    window = LifeWindow(
        key="night",
        label="夜间",
        start_at=datetime(2026, 8, 9, 0, tzinfo=timezone.utc),
        end_at=datetime(2026, 8, 9, 6, tzinfo=timezone.utc),
    )
    profile = {"activity_level": "natural"}
    state = {"energy": 50, "hunger": 20, "stress": 35, "social_need": 20, "solitude_need": 20}

    first = engine.simulate("user-a", "ai_una", profile, state, window)
    second = engine.simulate("user-a", "ai_una", profile, state, window)

    assert first.event is not None
    assert second.event is not None
    assert first.event.summary == second.event.summary
    assert first.state == second.state
    assert first.state["energy"] > state["energy"]


def test_settlement_is_idempotent_and_advances_empty_or_event_windows(tmp_path):
    store, service = make_service(tmp_path)
    start = datetime(2026, 8, 9, 15, 0, tzinfo=timezone.utc)  # 上海 23:00
    end = datetime(2026, 8, 9, 23, 0, tzinfo=timezone.utc)  # 上海次日 07:00
    service.ensure_world("user-a", now=start)

    first = service.settle_due("user-a", now=end)
    events_after_first = store.list_events("user-a", limit=100)
    second = service.settle_due("user-a", now=end)
    events_after_second = store.list_events("user-a", limit=100)

    assert first.settled_windows == 2
    assert first.created_events >= 1
    assert second.settled_windows == 0
    assert len(events_after_second) == len(events_after_first)
    assert store.get_state("user-a")["last_settled_at"] == first.last_settled_at


def test_events_are_private_to_owner(tmp_path):
    store, service = make_service(tmp_path)
    start = datetime(2026, 8, 9, 15, 0, tzinfo=timezone.utc)
    end = datetime(2026, 8, 9, 23, 0, tzinfo=timezone.utc)
    service.ensure_world("user-a", now=start)
    service.ensure_world("user-b", now=start)
    service.settle_due("user-a", now=end)

    assert store.list_events("user-a", limit=100)
    assert store.list_events("user-b", limit=100) == []


def test_long_offline_period_is_compressed_before_detailed_windows(tmp_path):
    store, service = make_service(tmp_path)
    now = datetime(2026, 8, 10, 4, 0, tzinfo=timezone.utc)
    service.ensure_world("user-a", now=now - timedelta(days=20))

    report = service.settle_due("user-a", now=now)
    events = store.list_events("user-a", limit=100)

    summary = next(event for event in events if event["event_type"] == "period_summary")
    assert summary["facts"]["compressed"] is True
    assert summary["facts"]["covered_days"] >= 12
    assert report.created_events <= 1 + 49


def test_schema_extends_existing_diary_and_social_tables(tmp_path):
    database_path = tmp_path / "migration.sqlite3"
    connection = sqlite3.connect(database_path)
    connection.execute("CREATE TABLE una_diary (id INTEGER PRIMARY KEY, content TEXT)")
    connection.execute("CREATE TABLE una_posts (id INTEGER PRIMARY KEY, content TEXT)")
    connection.commit()
    connection.close()

    LifeStore(str(database_path))

    connection = sqlite3.connect(database_path)
    diary_columns = {row[1] for row in connection.execute("PRAGMA table_info(una_diary)")}
    post_columns = {row[1] for row in connection.execute("PRAGMA table_info(una_posts)")}
    connection.close()
    assert {"author_ai_id", "source_event_ids", "life_world_date", "idempotency_key"} <= diary_columns
    assert {"source_event_ids", "life_world_time", "generation_reason", "deleted_at"} <= post_columns


def test_chat_context_uses_disclosable_life_events_for_direct_question(tmp_path):
    store, service = make_service(tmp_path)
    start = datetime(2026, 8, 9, 15, 0, tzinfo=timezone.utc)
    end = datetime(2026, 8, 9, 23, 0, tzinfo=timezone.utc)
    service.ensure_world("user-a", now=start)
    service.settle_due("user-a", now=end)

    context = LifeChatContextService(service).build_context(
        "user-a", "你今天都做了什么？", now=end
    )

    assert context.startswith("-")
    assert "地点：" in context
    assert "private_thought" not in context
