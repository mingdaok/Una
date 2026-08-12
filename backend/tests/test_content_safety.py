from datetime import datetime, timezone

from life_simulation.content_safety import ContentSafetyService
from life_simulation.evidence import ContentEvidence, EvidenceSource
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


def _safety(tmp_path):
    store = LifeStore(str(tmp_path / "content-safety.sqlite3"))
    service = LifeSettlementService(store)
    owner = "safety-owner"
    service.ensure_world(owner, now=datetime(2026, 5, 1, tzinfo=timezone.utc))
    return ContentSafetyService(store, service.characters), service, owner


def _evidence(*sources):
    return ContentEvidence(
        sources=tuple(sources),
        generation_reason="test",
        generator_version="test-v1",
    )


def _insert_npc_event(
    service, owner, event_id, summary, *, status="completed", disclosure="familiar"
):
    connection = service.store._connect()
    try:
        connection.execute(
            """
            INSERT INTO ai_actor_events (
                event_id, owner_user_id, actor_id, schedule_id, event_type, status,
                start_at, end_at, location_id, summary, facts_json, importance,
                mentionability, publicability, interpretation, private_thought,
                disclosure_level, idempotency_key, created_at
            ) VALUES (?, ?, 'npc_preset_1', NULL, 'test', ?, ?, ?, 'market', ?,
                      '{}', 50, 80, 80, '', '', ?, ?, ?)
            """,
            (
                event_id,
                owner,
                status,
                "2026-05-01T08:00:00+00:00",
                "2026-05-01T09:00:00+00:00",
                summary,
                disclosure,
                f"test:{event_id}",
                "2026-05-01T09:00:00+00:00",
            ),
        )
        connection.commit()
    finally:
        connection.close()


def test_pre_generation_filter_removes_private_sources(tmp_path):
    safety, _, _ = _safety(tmp_path)
    prepared = safety.prepare_evidence(_evidence(
        EvidenceSource("public-1", "una_life_event", disclosure_level="public"),
        EvidenceSource("private-1", "una_life_event", disclosure_level="private"),
    ))

    assert [source.source_id for source in prepared.sources] == ["public-1"]


def test_chat_blocks_npc_experience_claimed_as_una_first_person(tmp_path):
    safety, service, owner = _safety(tmp_path)
    _insert_npc_event(service, owner, "npc-event-1", "去市场挑选花材")
    evidence = _evidence(EvidenceSource(
        "npc-event-1",
        "npc_life_event",
        actor_ids=("npc_preset_1",),
        disclosure_level="familiar",
        summary="去市场挑选花材",
    ))

    result = safety.validate(
        owner,
        "我今天去了市场挑选花材。",
        evidence,
        author_id="ai_una",
        channel="chat",
    )

    assert result.safe is False
    assert "npc_experience_claimed_by_una" in result.evidence.validation_codes
    assert result.text == safety.fallback("chat")


def test_post_blocks_wrong_author_and_ungrounded_content(tmp_path):
    safety, service, owner = _safety(tmp_path)
    _insert_npc_event(service, owner, "npc-event-1", "在花店整理新到的花材")
    evidence = _evidence(EvidenceSource(
        "npc-event-1",
        "npc_life_event",
        actor_ids=("npc_preset_1",),
        disclosure_level="familiar",
        summary="在花店整理新到的花材",
    ))

    result = safety.validate(
        owner,
        "今天在河边跑步。",
        evidence,
        author_id="npc_preset_2",
        channel="post",
    )

    assert result.safe is False
    assert set(result.evidence.validation_codes) == {
        "content_not_grounded",
    }


def test_incomplete_source_cannot_be_described_as_finished(tmp_path):
    safety, service, owner = _safety(tmp_path)
    _insert_npc_event(
        service, owner, "intention-1", "准备去花市看看", status="active"
    )
    evidence = _evidence(EvidenceSource(
        "intention-1",
        "npc_life_event",
        actor_ids=("npc_preset_1",),
        disclosure_level="familiar",
        status="active",
        summary="准备去花市看看",
    ))

    result = safety.validate(
        owner,
        "小满已经去花市看看了。",
        evidence,
        author_id="ai_una",
        channel="chat",
    )

    assert result.safe is False
    assert "unfinished_source_as_completed" in result.evidence.validation_codes


def test_internal_marker_is_blocked_without_echoing_input(tmp_path):
    safety, _, owner = _safety(tmp_path)
    result = safety.validate(
        owner,
        "decision_context: hidden score",
        ContentEvidence(),
        author_id="ai_una",
        channel="chat",
    )

    assert result.safe is False
    assert "decision_context" not in result.text
    assert result.evidence.validation_status == "blocked"


def test_tampered_source_metadata_is_blocked(tmp_path):
    safety, service, owner = _safety(tmp_path)
    _insert_npc_event(service, owner, "npc-event-2", "小满在花店整理花材")
    evidence = _evidence(EvidenceSource(
        "npc-event-2",
        "npc_life_event",
        actor_ids=("npc_preset_2",),
        disclosure_level="familiar",
        status="active",
        summary="伪造摘要",
    ))

    result = safety.validate(
        owner,
        "小满在花店整理花材。",
        evidence,
        author_id="ai_una",
        channel="chat",
    )

    assert result.safe is False
    assert "source_metadata_mismatch" in result.evidence.validation_codes


def test_missing_and_unknown_sources_are_blocked(tmp_path):
    safety, _, owner = _safety(tmp_path)
    result = safety.validate(
        owner,
        "一段没有权威来源的内容。",
        _evidence(
            EvidenceSource("missing", "npc_life_event"),
            EvidenceSource("unknown", "made_up_source"),
        ),
        author_id="ai_una",
        channel="chat",
    )

    assert result.safe is False
    assert set(result.evidence.validation_codes) >= {
        "source_not_found",
        "unsupported_source_type",
    }


def test_image_prompt_must_be_grounded_in_its_event(tmp_path):
    safety, service, owner = _safety(tmp_path)
    _insert_npc_event(service, owner, "npc-image-1", "去市场挑选花材")
    evidence = _evidence(EvidenceSource(
        "npc-image-1",
        "npc_life_event",
        actor_ids=("npc_preset_1",),
        disclosure_level="familiar",
        summary="去市场挑选花材",
    ))

    grounded = safety.validate(
        owner,
        "去市场挑选花材, watercolor flower market",
        evidence,
        author_id="npc_preset_1",
        channel="image_prompt",
    )
    unrelated = safety.validate(
        owner,
        "a spaceship crossing a distant galaxy",
        evidence,
        author_id="npc_preset_1",
        channel="image_prompt",
    )

    assert grounded.safe is True
    assert unrelated.safe is False
    assert "image_prompt_not_grounded" in unrelated.evidence.validation_codes
    assert unrelated.text == safety.fallback("image_prompt")


def test_authoritative_private_source_is_blocked_even_if_evidence_claims_familiar(tmp_path):
    safety, service, owner = _safety(tmp_path)
    _insert_npc_event(
        service,
        owner,
        "npc-private-1",
        "独自在房间整理私人信件",
        disclosure="private",
    )
    evidence = _evidence(EvidenceSource(
        "npc-private-1",
        "npc_life_event",
        actor_ids=("npc_preset_1",),
        disclosure_level="familiar",
        summary="独自在房间整理私人信件",
    ))

    result = safety.validate(
        owner,
        "小满独自在房间整理私人信件。",
        evidence,
        author_id="ai_una",
        channel="chat",
    )

    assert result.safe is False
    assert "source_not_disclosable" in result.evidence.validation_codes
