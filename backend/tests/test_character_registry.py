from datetime import datetime, timezone
import sqlite3

import pytest
import yaml

from life_simulation.character_registry import (
    DEFAULT_CHARACTER_CATALOG,
    CharacterRegistry,
    load_character_catalog,
)
from life_simulation.store import LifeStore


NOW = datetime(2026, 8, 11, 8, 0, tzinfo=timezone.utc)


def test_default_catalog_has_three_editable_presets_and_legacy_aliases():
    catalog = load_character_catalog()

    friends = [item for item in catalog.definitions if item.role == "friend"]

    assert [item.actor_id for item in friends] == [
        "npc_preset_1",
        "npc_preset_2",
        "npc_preset_3",
    ]
    assert catalog.canonical_actor_id("ai_xiaoman") == "npc_preset_1"
    assert catalog.action_atoms
    assert catalog.get("npc_preset_2").decision_style["novelty_seeking"] > 0
    assert catalog.canonical_actor_id("ai_zhixia") == "npc_preset_2"
    assert catalog.canonical_actor_id("ai_alan") == "npc_preset_3"


def test_character_content_can_be_replaced_by_yaml_only(tmp_path):
    raw = yaml.safe_load(DEFAULT_CHARACTER_CATALOG.read_text(encoding="utf-8"))
    preset = next(
        item for item in raw["characters"] if item["actor_id"] == "npc_preset_1"
    )
    preset["display_name"] = "新角色名"
    preset["personality"]["warmth"] = 0.31
    preset["traits"] = ["冷静", "守时"]
    preset["interests"] = ["天文"]
    preset["social_moments"][0]["content"] = "昨晚去天台看了星星。"
    custom_path = tmp_path / "custom-presets.yaml"
    custom_path.write_text(
        yaml.safe_dump(raw, allow_unicode=True, sort_keys=False), encoding="utf-8"
    )

    catalog = load_character_catalog(str(custom_path))
    definition = catalog.get("npc_preset_1")

    assert definition is not None
    assert definition.display_name == "新角色名"
    assert definition.personality["warmth"] == 0.31
    assert definition.traits == ("冷静", "守时")
    assert definition.interests == ("天文",)
    assert definition.social_moments[0].content == "昨晚去天台看了星星。"
    assert definition.actor_id == "npc_preset_1"


def test_registry_seeds_owner_scoped_profiles_and_merges_config(tmp_path):
    store = LifeStore(str(tmp_path / "actors.sqlite3"))
    registry = CharacterRegistry(store)

    registry.ensure_world("user-a", now=NOW)
    registry.ensure_world("user-b", now=NOW)

    user_a = store.list_actor_profiles("user-a")
    user_b = store.list_actor_profiles("user-b")
    contact = registry.get_actor("user-a", "npc_preset_2")

    assert len(user_a) == 4
    assert len(user_b) == 4
    assert {item["owner_user_id"] for item in user_a} == {"user-a"}
    assert contact is not None
    assert contact["display_name"] == "知夏"
    assert contact["interests"] == ["摄影", "旧建筑", "阅读"]
    assert contact["prompt_identity"]


def test_registry_syncs_disabled_preset_status(tmp_path):
    raw = yaml.safe_load(DEFAULT_CHARACTER_CATALOG.read_text(encoding="utf-8"))
    raw["characters"][1]["enabled"] = False
    custom_path = tmp_path / "disabled-presets.yaml"
    custom_path.write_text(
        yaml.safe_dump(raw, allow_unicode=True, sort_keys=False), encoding="utf-8"
    )
    store = LifeStore(str(tmp_path / "disabled-actors.sqlite3"))
    registry = CharacterRegistry(store, load_character_catalog(str(custom_path)))

    registry.ensure_world("user-a", now=NOW)

    disabled = store.get_actor_profile("user-a", "npc_preset_1")
    assert disabled is not None
    assert disabled["status"] == "disabled"
    assert disabled["disabled_at"] == NOW.isoformat()
    assert [item["actor_id"] for item in registry.list_contacts("user-a")] == [
        "npc_preset_2",
        "npc_preset_3",
    ]


def test_registry_migrates_and_merges_legacy_relationship_ids(tmp_path):
    store = LifeStore(str(tmp_path / "legacy-actors.sqlite3"))
    with sqlite3.connect(store.database_path) as connection:
        connection.executemany(
            """
            INSERT INTO ai_relationships (
                owner_user_id, ai_id, other_ai_id, display_name,
                familiarity, affinity, trust, tension, obligation,
                evidence_event_ids_json, private_summary,
                last_interaction_at, updated_at
            ) VALUES (?, 'ai_una', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    "user-a",
                    "ai_xiaoman",
                    "旧名字",
                    8,
                    3,
                    2,
                    1,
                    0,
                    '["legacy-event"]',
                    "旧关系摘要",
                    "2026-08-10T08:00:00+00:00",
                    "2026-08-10T08:00:00+00:00",
                ),
                (
                    "user-a",
                    "npc_preset_1",
                    "小满",
                    5,
                    7,
                    6,
                    0,
                    2,
                    '["current-event"]',
                    "",
                    "2026-08-11T07:00:00+00:00",
                    "2026-08-11T07:00:00+00:00",
                ),
            ],
        )

    CharacterRegistry(store).ensure_world("user-a", now=NOW)
    relationships = store.list_relationships("user-a")

    assert len(relationships) == 1
    merged = relationships[0]
    assert merged["other_ai_id"] == "npc_preset_1"
    assert merged["familiarity"] == 8
    assert merged["affinity"] == 7
    assert merged["trust"] == 6
    assert merged["obligation"] == 2
    assert merged["evidence_event_ids"] == ["current-event", "legacy-event"]
    assert merged["private_summary"] == "旧关系摘要"


def test_catalog_rejects_duplicate_stable_actor_ids(tmp_path):
    raw = yaml.safe_load(DEFAULT_CHARACTER_CATALOG.read_text(encoding="utf-8"))
    raw["characters"][2]["actor_id"] = "npc_preset_1"
    invalid_path = tmp_path / "invalid-presets.yaml"
    invalid_path.write_text(
        yaml.safe_dump(raw, allow_unicode=True, sort_keys=False), encoding="utf-8"
    )

    with pytest.raises(ValueError, match="重复 actor_id"):
        load_character_catalog(str(invalid_path))


def test_catalog_rejects_interaction_summary_missing_participant(tmp_path):
    raw = yaml.safe_load(DEFAULT_CHARACTER_CATALOG.read_text(encoding="utf-8"))
    raw["interaction_templates"][0]["summary_template"] = (
        "{actor_a}独自回顾了这次见面。"
    )
    invalid_path = tmp_path / "invalid-interaction-presets.yaml"
    invalid_path.write_text(
        yaml.safe_dump(raw, allow_unicode=True, sort_keys=False), encoding="utf-8"
    )

    with pytest.raises(ValueError, match="必须同时包含 actor_a 和 actor_b"):
        load_character_catalog(str(invalid_path))


def test_catalog_rejects_unknown_intention_placeholder(tmp_path):
    raw = yaml.safe_load(DEFAULT_CHARACTER_CATALOG.read_text(encoding="utf-8"))
    raw["intention_templates"][0]["summary_template"] = "{unknown}想休息。"
    invalid_path = tmp_path / "invalid-intention-presets.yaml"
    invalid_path.write_text(
        yaml.safe_dump(raw, allow_unicode=True, sort_keys=False), encoding="utf-8"
    )

    with pytest.raises(ValueError, match="占位符无效"):
        load_character_catalog(str(invalid_path))


def test_catalog_rejects_duplicate_suggestion_types(tmp_path):
    raw = yaml.safe_load(DEFAULT_CHARACTER_CATALOG.read_text(encoding="utf-8"))
    raw["intention_templates"][1]["suggestion_type"] = raw[
        "intention_templates"
    ][0]["suggestion_type"]
    invalid_path = tmp_path / "duplicate-suggestion-type.yaml"
    invalid_path.write_text(
        yaml.safe_dump(raw, allow_unicode=True, sort_keys=False), encoding="utf-8"
    )

    with pytest.raises(ValueError, match="建议类型重复"):
        load_character_catalog(str(invalid_path))


def test_catalog_rejects_unordered_relationship_tiers(tmp_path):
    raw = yaml.safe_load(DEFAULT_CHARACTER_CATALOG.read_text(encoding="utf-8"))
    raw["relationship_policy"]["tiers"][1]["min_closeness"] = 0
    invalid_path = tmp_path / "unordered-relationship-tiers.yaml"
    invalid_path.write_text(
        yaml.safe_dump(raw, allow_unicode=True, sort_keys=False), encoding="utf-8"
    )

    with pytest.raises(ValueError, match="必须严格递增"):
        load_character_catalog(str(invalid_path))
