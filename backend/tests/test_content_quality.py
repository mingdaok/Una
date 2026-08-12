import json
import sqlite3
from datetime import datetime, timedelta, timezone

from life_simulation.content_quality import ContentQualityAuditor
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


def _world(tmp_path):
    store = LifeStore(str(tmp_path / "content-quality.sqlite3"))
    service = LifeSettlementService(store)
    owner = "content-owner"
    start = datetime(2026, 5, 1, tzinfo=timezone.utc)
    service.ensure_world(owner, now=start)
    service.settle_due(owner, now=start + timedelta(days=1))
    event = store.list_actor_events(owner, "npc_preset_1", limit=1)[0]
    with sqlite3.connect(store.database_path) as connection:
        connection.executescript(
            """
            CREATE TABLE una_posts (
                id INTEGER PRIMARY KEY, owner_user_id TEXT, author_id TEXT,
                author_type TEXT, content TEXT, source_event_ids TEXT,
                life_world_time TEXT, generation_reason TEXT, deleted_at TEXT,
                timestamp TEXT
            );
            CREATE TABLE una_diary (
                id INTEGER PRIMARY KEY, user_id TEXT, content TEXT,
                author_ai_id TEXT, source_event_ids TEXT, life_world_date TEXT,
                generation_reason TEXT
            );
            CREATE TABLE chat_history (
                id INTEGER PRIMARY KEY, user_id TEXT, role TEXT,
                content TEXT, timestamp TEXT
            );
            """
        )
        leaked_content = f"{event['summary']} {event['private_thought']}"
        for post_id in (1, 2):
            connection.execute(
                "INSERT INTO una_posts VALUES (?, ?, ?, 'ai', ?, ?, ?, 'npc_autonomous_event', NULL, ?)",
                (
                    post_id, owner, "npc_preset_1", leaked_content,
                    json.dumps([event["event_id"]]), event["end_at"], event["end_at"],
                ),
            )
        connection.execute(
            "INSERT INTO una_diary VALUES (1, ?, '今天写了一点生活。', 'ai_una', '[]', '2026-05-02', 'life_and_dialogue')",
            (owner,),
        )
        connection.execute(
            "INSERT INTO chat_history VALUES (1, ?, 'assistant', '最近小满去了市场，也做了新的尝试。', ?)",
            (owner, event["end_at"]),
        )
    return service, owner, event


def test_content_audit_detects_privacy_sources_duplicates_and_chat_traceability(tmp_path):
    service, owner, event = _world(tmp_path)
    result = ContentQualityAuditor(service.store, service.characters).audit(owner)

    assert result["summary"]["scanned"] == 4
    assert result["summary"]["high_risk"] == 2
    assert result["metrics"]["privacy_leak_count"] == 2
    assert result["metrics"]["duplicate_pair_count"] == 1
    assert result["metrics"]["life_chat_reference_count"] == 1
    assert result["issue_codes"]["missing_source"] == 1
    assert result["issue_codes"]["chat_source_untraceable"] == 1
    assert result["issue_codes"]["private_thought_leak"] == 2
    assert event["private_thought"] not in json.dumps(result, ensure_ascii=False)


def test_content_audit_is_owner_isolated_and_handles_empty_content_tables(tmp_path):
    service, _, _ = _world(tmp_path)

    result = ContentQualityAuditor(service.store, service.characters).audit("other-owner")

    assert result["summary"]["scanned"] == 0
    assert result["summary"]["issues"] == 0
    assert result["metrics"]["privacy_leak_count"] == 0


def test_content_audit_validates_limits(tmp_path):
    service, owner, _ = _world(tmp_path)
    auditor = ContentQualityAuditor(service.store, service.characters)

    try:
        auditor.audit(owner, chat_limit=201)
    except ValueError:
        pass
    else:
        raise AssertionError("oversized audit should be rejected")


def test_content_audit_traces_chat_with_unified_evidence(tmp_path):
    service, owner, event = _world(tmp_path)
    evidence = {
        "version": 1,
        "sources": [{
            "source_id": event["event_id"],
            "source_type": "npc_life_event",
            "actor_ids": ["npc_preset_1"],
            "world_time": event["end_at"],
            "disclosure_level": "familiar",
            "status": "completed",
        }],
        "used_source_ids": [event["event_id"]],
        "validation_status": "passed",
    }
    with sqlite3.connect(service.store.database_path) as connection:
        connection.execute(
            "ALTER TABLE chat_history ADD COLUMN content_evidence_json TEXT NOT NULL DEFAULT '{}'"
        )
        connection.execute(
            "UPDATE chat_history SET content_evidence_json = ? WHERE id = 1",
            (json.dumps(evidence, ensure_ascii=False),),
        )

    result = ContentQualityAuditor(service.store, service.characters).audit(owner)

    assert result["metrics"]["life_chat_reference_count"] == 1
    assert result["metrics"]["traceable_life_chat_count"] == 1
    assert result["issue_codes"].get("chat_source_untraceable", 0) == 0
