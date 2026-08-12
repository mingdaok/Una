from datetime import datetime, timedelta, timezone

from life_simulation.models import LifeEventDraft, LifeWindow, SimulationResult
from life_simulation.proactive import LifeProactiveService
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


def make_world(tmp_path, owner="user-a"):
    store = LifeStore(str(tmp_path / "proactive.sqlite3"))
    settlement = LifeSettlementService(store)
    start = datetime(2026, 8, 10, 0, 0, tzinfo=timezone.utc)
    settlement.ensure_world(owner, now=start)
    return store, settlement, LifeProactiveService(store), start


def add_event(
    store,
    owner,
    start,
    *,
    event_type="evening_walk",
    mentionability=80,
    importance=55,
    disclosure_level="familiar",
    summary="沿河走了一小段，看见晚霞落在水面上。",
):
    state = store.get_state(owner)
    window = LifeWindow(
        key=f"test-{event_type}-{start.isoformat()}",
        label="测试",
        start_at=start,
        end_at=start + timedelta(hours=1),
    )
    draft = LifeEventDraft(
        event_type=event_type,
        status="completed",
        start_at=window.start_at,
        end_at=window.end_at,
        location_id="riverside",
        summary=summary,
        facts={},
        importance=importance,
        mentionability=mentionability,
        publicability=20,
        interpretation="心情放松了一些。",
        disclosure_level=disclosure_level,
    )
    status, event = store.apply_window(
        owner,
        "ai_una",
        window,
        SimulationResult(event=draft, state=dict(state)),
        int(state["state_version"]),
        "test-proactive-v1",
        window.end_at,
    )
    assert status == "applied"
    return event


def enable(store, owner, now):
    store.update_settings(
        owner, "ai_una", {"proactive_messages_enabled": True}, now
    )


def test_claims_one_safe_offline_event_and_deduplicates_it(tmp_path):
    store, _, proactive, start = make_world(tmp_path)
    event = add_event(store, "user-a", start + timedelta(hours=1))
    enable(store, "user-a", start + timedelta(hours=2))
    now = start + timedelta(hours=6)

    share = proactive.claim_for_reconnect("user-a", start, now=now)

    assert share is not None
    assert share.source_event_id == event["event_id"]
    assert "晚霞落在水面上" in share.text
    assert proactive.claim_for_reconnect("user-a", start, now=now) is None
    assert proactive.complete("user-a", share, now=now) is True
    assert proactive.claim_for_reconnect("user-a", start, now=now + timedelta(hours=9)) is None


def test_requires_explicit_opt_in_and_meaningful_absence(tmp_path):
    store, _, proactive, start = make_world(tmp_path)
    add_event(store, "user-a", start + timedelta(hours=1))
    now = start + timedelta(hours=4)

    assert proactive.claim_for_reconnect("user-a", start, now=now) is None
    enable(store, "user-a", now)
    assert proactive.claim_for_reconnect(
        "user-a", now - timedelta(minutes=90), now=now
    ) is None


def test_filters_private_low_value_and_summary_events(tmp_path):
    store, _, proactive, start = make_world(tmp_path)
    add_event(
        store,
        "user-a",
        start + timedelta(hours=1),
        disclosure_level="private",
    )
    add_event(
        store,
        "user-a",
        start + timedelta(hours=2),
        mentionability=45,
    )
    add_event(
        store,
        "user-a",
        start + timedelta(hours=3),
        event_type="period_summary",
        mentionability=90,
    )
    enable(store, "user-a", start + timedelta(hours=4))

    assert proactive.claim_for_reconnect(
        "user-a", start, now=start + timedelta(hours=7)
    ) is None


def test_failed_delivery_can_release_claim_for_retry(tmp_path):
    store, _, proactive, start = make_world(tmp_path)
    add_event(store, "user-a", start + timedelta(hours=1))
    enable(store, "user-a", start + timedelta(hours=2))
    now = start + timedelta(hours=6)

    first = proactive.claim_for_reconnect("user-a", start, now=now)
    assert first is not None
    assert proactive.release("user-a", first) is True
    second = proactive.claim_for_reconnect("user-a", start, now=now)
    assert second is not None
    assert second.delivery_id == first.delivery_id
    delivery = store.list_proactive_deliveries("user-a")[0]
    assert delivery["attempts"] == 2
    assert delivery["last_error"] is None


def test_delivery_records_are_isolated_by_owner(tmp_path):
    store, settlement, proactive, start = make_world(tmp_path)
    settlement.ensure_world("user-b", now=start)
    for owner in ("user-a", "user-b"):
        add_event(store, owner, start + timedelta(hours=1))
        enable(store, owner, start + timedelta(hours=2))

    assert proactive.claim_for_reconnect(
        "user-a", start, now=start + timedelta(hours=6)
    ) is not None
    assert proactive.claim_for_reconnect(
        "user-b", start, now=start + timedelta(hours=6)
    ) is not None


def test_feedback_updates_topic_preference_and_stop_disables_sharing(tmp_path):
    store, _, proactive, start = make_world(tmp_path)
    add_event(store, "user-a", start + timedelta(hours=1), event_type="friend_chat")
    enable(store, "user-a", start + timedelta(hours=2))
    now = start + timedelta(hours=6)
    share = proactive.claim_for_reconnect("user-a", start, now=now)
    assert share is not None
    assert share.topic == "social"
    assert proactive.complete("user-a", share, now=now)

    liked = proactive.record_feedback(
        "user-a", share.delivery_id, "more", now=now + timedelta(minutes=1)
    )
    assert liked["topic_score"] == 2
    less = proactive.record_feedback(
        "user-a", share.delivery_id, "less", now=now + timedelta(minutes=2)
    )
    assert less["topic_score"] == -2
    repeated = proactive.record_feedback(
        "user-a", share.delivery_id, "less", now=now + timedelta(minutes=3)
    )
    assert repeated["topic_score"] == -2
    stopped = proactive.record_feedback(
        "user-a", share.delivery_id, "stop", now=now + timedelta(minutes=4)
    )
    assert stopped["proactive_messages_enabled"] is False
    assert store.get_profile("user-a")["proactive_messages_enabled"] is False


def test_frequency_policy_changes_absence_threshold_and_daily_budget(tmp_path):
    store, _, proactive, start = make_world(tmp_path)
    add_event(store, "user-a", start + timedelta(hours=1))
    enable(store, "user-a", start + timedelta(hours=2))
    now = start + timedelta(hours=4)
    store.update_settings(
        "user-a", "ai_una", {"proactive_frequency": "occasional"}, now
    )
    assert proactive.claim_for_reconnect(
        "user-a", now - timedelta(hours=3), now=now
    ) is None

    store.update_settings(
        "user-a", "ai_una", {"proactive_frequency": "frequent"}, now
    )
    share = proactive.claim_for_reconnect(
        "user-a", now - timedelta(hours=3), now=now
    )
    assert share is not None
    status = proactive.inspect_status(
        "user-a", now - timedelta(hours=3), now=now
    )
    assert status["frequency"] == "frequent"
    assert status["daily_limit"] == 3
    assert status["blocked_reason"] == "in_flight"


def test_diagnostics_explain_disabled_and_failed_delivery(tmp_path):
    store, _, proactive, start = make_world(tmp_path)
    add_event(store, "user-a", start + timedelta(hours=1))
    disabled = proactive.inspect_status(
        "user-a", start, now=start + timedelta(hours=6)
    )
    assert disabled["blocked_reason"] == "disabled"

    enable(store, "user-a", start + timedelta(hours=2))
    share = proactive.claim_for_reconnect(
        "user-a", start, now=start + timedelta(hours=6)
    )
    proactive.release("user-a", share, error="websocket_disconnected")
    status = proactive.inspect_status(
        "user-a", start, now=start + timedelta(hours=6)
    )
    assert status["blocked_reason"] == "ready"
    assert status["recent_deliveries"][0]["status"] == "failed"
    assert status["recent_deliveries"][0]["last_error"] == "websocket_disconnected"
