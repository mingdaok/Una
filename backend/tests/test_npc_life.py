from datetime import datetime, timedelta, timezone

import yaml

from life_simulation.character_registry import (
    DEFAULT_CHARACTER_CATALOG,
    CharacterRegistry,
    load_character_catalog,
)
from life_simulation.chat_context import LifeChatContextService
from life_simulation.npc_life import NpcLifeService
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


START = datetime(2026, 8, 9, 15, 0, tzinfo=timezone.utc)
END = datetime(2026, 8, 9, 23, 0, tzinfo=timezone.utc)


def make_service(tmp_path):
    store = LifeStore(str(tmp_path / "npc-life.sqlite3"))
    return store, LifeSettlementService(store)


def test_world_seeds_three_independent_npc_states_and_persistent_schedules(tmp_path):
    store, service = make_service(tmp_path)

    service.ensure_world("user-a", now=START)
    service.ensure_world("user-a", now=START)

    states = store.list_actor_states("user-a")
    assert [state["actor_id"] for state in states] == [
        "npc_preset_1",
        "npc_preset_2",
        "npc_preset_3",
    ]
    assert len({state["energy"] for state in states}) >= 2
    assert all(0 <= state["boredom"] <= 100 for state in states)
    assert all(0 <= state["focus"] <= 100 for state in states)
    assert all(0 <= state["confidence"] <= 100 for state in states)
    summaries = []
    schedule_ids = []
    for actor_id in ("npc_preset_1", "npc_preset_2", "npc_preset_3"):
        schedules = store.list_actor_schedules("user-a", actor_id)
        assert schedules
        assert all(item["status"] == "planned" for item in schedules)
        assert all(
            item["decision_engine_version"] == "npc-agency-v2"
            for item in schedules
        )
        schedule_ids.extend(item["schedule_id"] for item in schedules)
        summaries.extend(item["summary"] for item in schedules)
    assert len(schedule_ids) == len(set(schedule_ids))
    assert any("厨房" in summary or "绿植" in summary for summary in summaries)
    assert any("照片" in summary or "相机" in summary for summary in summaries)
    assert any("工具" in summary or "骑" in summary for summary in summaries)


def test_npc_settlement_creates_owner_scoped_events_and_is_idempotent(tmp_path):
    store, service = make_service(tmp_path)
    service.ensure_world("user-a", now=START)
    service.ensure_world("user-b", now=START)

    first = service.settle_due("user-a", now=END)
    second = service.settle_due("user-a", now=END)

    npc_report = first.npc_settlement
    assert npc_report["settled_windows"] == 6
    assert npc_report["created_events"] == 6
    assert second.npc_settlement["settled_windows"] == 0
    for actor_id in ("npc_preset_1", "npc_preset_2", "npc_preset_3"):
        events = store.list_actor_events("user-a", actor_id)
        assert len(events) == 2
        assert all(event["actor_id"] == actor_id for event in events)
        assert store.list_actor_events("user-b", actor_id) == []
        completed = store.list_actor_schedules(
            "user-a", actor_id, status="completed"
        )
        assert len(completed) == 2
        decisions = store.list_actor_decisions("user-a", actor_id)
        assert len(decisions) == 2
        assert all(
            decision["engine_version"] == "npc-agency-v2"
            for decision in decisions
        )
        assert all(decision["used_llm"] is False for decision in decisions)


def test_each_npc_follows_its_configured_routine(tmp_path):
    store, service = make_service(tmp_path)
    service.ensure_world("user-a", now=START)
    service.settle_due("user-a", now=END)

    friend_one = store.list_actor_events("user-a", "npc_preset_1")
    friend_two = store.list_actor_events("user-a", "npc_preset_2")
    friend_three = store.list_actor_events("user-a", "npc_preset_3")

    assert {event["facts"]["routine_template"] for event in friend_one} == {
        "preset_friend_1_daily"
    }
    assert {event["facts"]["routine_template"] for event in friend_two} == {
        "preset_friend_2_daily"
    }
    assert {event["facts"]["routine_template"] for event in friend_three} == {
        "preset_friend_3_daily"
    }
    assert {event["summary"] for event in friend_one}.isdisjoint(
        {event["summary"] for event in friend_two}
    )
    assert {event["summary"] for event in friend_two}.isdisjoint(
        {event["summary"] for event in friend_three}
    )


def test_named_npc_events_enter_chat_context_without_private_details(tmp_path):
    store, service = make_service(tmp_path)
    service.ensure_world("user-a", now=START)
    end = START + timedelta(hours=20)
    service.settle_due("user-a", now=end)
    context_service = LifeChatContextService(service)

    context = context_service.build_context(
        "user-a", "知夏最近怎么样？", now=end
    )
    unrelated = context_service.build_context("user-a", "晚上好", now=end)

    assert "[NPC近况·知夏" in context
    assert "这是对方自己的可披露生活记录" in context
    assert "private_thought" not in context
    assert "不要说成自己的亲历" in context
    assert "[NPC近况" not in unrelated


def test_long_npc_offline_period_is_compressed_before_detailed_events(tmp_path):
    store, service = make_service(tmp_path)
    now = START + timedelta(days=20)
    service.ensure_world("user-a", now=START)

    report = service.npc_life.settle_due(
        "user-a", "Asia/Shanghai", now=now
    )

    assert report.created_events <= 3 * (1 + 49)
    for actor_id in ("npc_preset_1", "npc_preset_2", "npc_preset_3"):
        events = store.list_actor_events("user-a", actor_id, limit=100)
        summary = next(
            event for event in events if event["event_type"] == "period_summary"
        )
        assert summary["facts"]["compressed"] is True
        assert summary["facts"]["covered_days"] >= 12


def test_npc_service_does_not_create_life_for_disabled_profiles(tmp_path):
    raw = yaml.safe_load(DEFAULT_CHARACTER_CATALOG.read_text(encoding="utf-8"))
    raw["characters"][2]["enabled"] = False
    custom_path = tmp_path / "disabled-npc.yaml"
    custom_path.write_text(
        yaml.safe_dump(raw, allow_unicode=True, sort_keys=False), encoding="utf-8"
    )
    store = LifeStore(str(tmp_path / "disabled-npc.sqlite3"))
    characters = CharacterRegistry(
        store, load_character_catalog(str(custom_path))
    )
    characters.ensure_world("user-a", now=START)
    npc_service = NpcLifeService(store, characters)
    actors = npc_service.ensure_world("user-a", "Asia/Shanghai", now=START)

    assert {actor["actor_id"] for actor in actors} == {
        "npc_preset_1",
        "npc_preset_3",
    }
    assert store.get_actor_state("user-a", "npc_preset_2") is None
