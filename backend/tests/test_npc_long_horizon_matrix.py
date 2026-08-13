from datetime import datetime, timedelta, timezone

from life_simulation.character_registry import CharacterRegistry
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


def test_fourteen_day_shutdown_catchup_is_compressed_idempotent_and_llm_free(tmp_path):
    start = datetime(2026, 8, 1, tzinfo=timezone.utc)
    store = LifeStore(str(tmp_path / "shutdown.sqlite3"))
    service = LifeSettlementService(store)
    service.ensure_world("shutdown-user", now=start)

    first = service.settle_due("shutdown-user", now=start + timedelta(days=14))
    replay = service.settle_due("shutdown-user", now=start + timedelta(days=14))

    assert first.npc_settlement["created_events"] > 0
    assert replay.npc_settlement["created_events"] == 0
    for actor_id in ("npc_preset_1", "npc_preset_2", "npc_preset_3"):
        summaries = [
            item for item in store.list_actor_events("shutdown-user", actor_id, limit=100)
            if item["event_type"] == "period_summary"
        ]
        assert len(summaries) == 1
        assert summaries[0]["facts"]["covered_days"] >= 6
        assert store.list_decision_llm_calls("shutdown-user", actor_id) == []


def test_definition_upgrade_preserves_stable_actor_identity_and_existing_schedule(tmp_path):
    start = datetime(2026, 8, 1, tzinfo=timezone.utc)
    store = LifeStore(str(tmp_path / "upgrade.sqlite3"))
    service = LifeSettlementService(store)
    service.ensure_world("upgrade-user", now=start)
    schedule = store.list_actor_schedules("upgrade-user", "npc_preset_1", limit=1)[0]

    with store._connect() as connection:
        connection.execute(
            "UPDATE ai_actor_profiles SET display_name = '旧名称', definition_version = 0 "
            "WHERE owner_user_id = 'upgrade-user' AND actor_id = 'npc_preset_1'"
        )
    CharacterRegistry(store).ensure_world("upgrade-user", now=start + timedelta(days=1))

    actor = service.characters.get_actor("upgrade-user", "npc_preset_1")
    preserved = next(
        item for item in store.list_actor_schedules(
            "upgrade-user", "npc_preset_1", limit=200
        ) if item["schedule_id"] == schedule["schedule_id"]
    )
    assert actor["actor_id"] == "npc_preset_1"
    assert actor["definition_version"] >= 1
    assert preserved["plan"] == schedule["plan"]
