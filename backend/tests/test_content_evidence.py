from datetime import datetime, timedelta, timezone

import database

from life_simulation.chat_context import LifeChatContextService
from life_simulation.evidence import ContentEvidence, EvidenceSource
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


def test_content_evidence_is_versioned_and_does_not_persist_source_summaries():
    evidence = ContentEvidence(
        sources=(
            EvidenceSource(
                source_id="event-1",
                source_type="npc_life_event",
                actor_ids=("npc_preset_1",),
                world_time="2026-08-10T08:00:00+00:00",
                disclosure_level="familiar",
                summary="小满去了花市。",
            ),
        ),
        generation_reason="chat_life_context",
        generator_version="test-v1",
    ).with_validation(used_source_ids=["event-1"], status="passed")

    payload = evidence.as_dict()

    assert payload["version"] == 1
    assert payload["source_event_ids"] == ["event-1"]
    assert payload["source_actor_ids"] == ["npc_preset_1"]
    assert payload["used_source_ids"] == ["event-1"]
    assert "summary" not in payload["sources"][0]
    assert ContentEvidence.from_dict(payload).as_dict() == payload


def test_chat_context_bundle_carries_selected_event_provenance(tmp_path):
    store = LifeStore(str(tmp_path / "chat-evidence.sqlite3"))
    service = LifeSettlementService(store)
    owner = "chat-owner"
    start = datetime(2026, 5, 1, tzinfo=timezone.utc)
    service.ensure_world(owner, now=start)
    now = start + timedelta(days=1)
    service.settle_due(owner, now=now)

    bundle = LifeChatContextService(service).build_context_bundle(
        owner, "你的朋友小满最近怎么样？", now=now
    )

    assert bundle.text
    assert bundle.evidence.generation_reason == "chat_life_context"
    assert bundle.evidence.sources
    assert all(source.source_id for source in bundle.evidence.sources)
    assert any("npc_preset_1" in source.actor_ids for source in bundle.evidence.sources)


def test_chat_history_round_trips_content_evidence(monkeypatch, tmp_path):
    monkeypatch.setattr(database, "DB_PATH", str(tmp_path / "chat-storage.sqlite3"))
    database.init_db()
    evidence = {
        "version": 1,
        "sources": [{"source_id": "event-1", "source_type": "una_life_event"}],
        "used_source_ids": ["event-1"],
        "validation_status": "passed",
    }

    database.add_message(
        "owner-a", "ai", "今天去散步了。", content_evidence=evidence
    )

    message = database.get_recent_history("owner-a", limit=1)[0]
    assert message["content_evidence"] == evidence
