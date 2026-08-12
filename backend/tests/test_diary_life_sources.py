import database


def test_diary_persists_life_event_sources_and_idempotency(monkeypatch, tmp_path):
    database_path = str(tmp_path / "diary.sqlite3")
    monkeypatch.setattr(database, "DB_PATH", database_path)
    database.init_diary_table()

    evidence = {
        "version": 1,
        "sources": [{"source_id": "event-1", "source_type": "una_life_event"}],
        "used_source_ids": ["event-1"],
        "validation_status": "passed",
    }
    saved = database.save_diary(
        user_id="user-a",
        date="2026-08-10",
        diary_type="DAILY",
        content="今天沿河走了走。",
        mood="peaceful",
        author_ai_id="ai_una",
        source_event_ids=["event-1", "event-2"],
        life_world_date="2026-08-10",
        visibility_level="private",
        generation_reason="life_and_dialogue",
        idempotency_key="life-diary:user-a:ai_una:2026-08-10:DAILY",
        content_evidence=evidence,
    )
    duplicate = database.save_diary(
        user_id="user-a",
        date="2026-08-10",
        diary_type="DAILY",
        content="重复内容",
        mood="peaceful",
        idempotency_key="life-diary:user-a:ai_una:2026-08-10:DAILY",
    )

    diary = database.get_diaries("user-a", limit=1)[0]
    assert saved is True
    assert duplicate is False
    assert diary["source_event_ids"] == ["event-1", "event-2"]
    assert diary["generation_reason"] == "life_and_dialogue"
    assert diary["visibility_level"] == "private"
    assert diary["content_evidence"] == evidence
