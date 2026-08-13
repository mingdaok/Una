from datetime import datetime, timedelta, timezone

from life_simulation.invitation_engine import InvitationDecisionEngine
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


START = datetime(2026, 8, 9, 15, 0, tzinfo=timezone.utc)


def make_world(tmp_path):
    store = LifeStore(str(tmp_path / "npc-social-phase3.sqlite3"))
    service = LifeSettlementService(store)
    service.ensure_world("user-a", now=START)
    return store, service


def test_invited_actor_can_accept_postpone_or_reject_deterministically():
    engine = InvitationDecisionEngine(version="npc-social-phase3")
    invitation = {
        "invitation_id": "invite-1",
        "initiator_actor_id": "npc_preset_1",
        "target_actor_id": "npc_preset_2",
        "starts_at": START.isoformat(),
        "ends_at": (START + timedelta(hours=3)).isoformat(),
        "location_id": "neighborhood_cafe",
    }

    accepted = engine.decide(
        "user-a", invitation,
        target_state={"energy": 72, "stress": 18, "social_need": 68},
        relationship={"affinity": 60, "trust": 55, "tension": 5},
        has_conflict=False,
    )
    postponed = engine.decide(
        "user-a", invitation,
        target_state={"energy": 20, "stress": 62, "social_need": 45},
        relationship={"affinity": 45, "trust": 40, "tension": 10},
        has_conflict=False,
    )
    rejected = engine.decide(
        "user-a", invitation,
        target_state={"energy": 70, "stress": 35, "social_need": 15},
        relationship={"affinity": 5, "trust": 5, "tension": 80},
        has_conflict=True,
    )

    assert accepted.status == "accepted"
    assert postponed.status == "postponed"
    assert rejected.status == "rejected"
    assert engine.decide(
        "user-a", invitation,
        target_state={"energy": 72, "stress": 18, "social_need": 68},
        relationship={"affinity": 60, "trust": 55, "tension": 5},
        has_conflict=False,
    ) == accepted


def test_accepted_invitation_creates_shared_commitments_event_views_and_memories(tmp_path):
    store, service = make_world(tmp_path)
    service.settle_due("user-a", now=START + timedelta(days=7))

    invitations = store.list_interaction_invitations("user-a", limit=100)
    accepted = [item for item in invitations if item["status"] == "accepted"]
    assert accepted
    interaction_events = store.list_interaction_events("user-a", limit=100)
    assert interaction_events, "七天内至少应有一次双方实际完成的互动"
    accepted_by_id = {item["invitation_id"]: item for item in accepted}
    matched = [
        item for item in interaction_events
        if item["facts"].get("invitation_id") in accepted_by_id
    ]
    assert matched, [item["facts"] for item in interaction_events]
    event = matched[0]
    invitation = accepted_by_id[event["facts"]["invitation_id"]]
    participants = {invitation["initiator_actor_id"], invitation["target_actor_id"]}

    commitments = []
    for actor_id in participants:
        commitments.extend(store.list_actor_commitments("user-a", actor_id, limit=200))
    shared = [
        item for item in commitments
        if item["metadata"].get("invitation_id") == invitation["invitation_id"]
    ]
    assert {item["actor_id"] for item in shared} == participants
    assert all(item["flexibility"] == "hard" for item in shared)

    assert {item["actor_id"] for item in event["participants"]} == participants
    assert set(event["perspectives"]) == participants
    memories = store.list_interaction_memories(
        "user-a", event_id=event["event_id"], limit=10
    )
    assert {item["ai_id"] for item in memories} == participants


def test_rejected_or_postponed_invitation_never_becomes_completed_event(tmp_path):
    store, service = make_world(tmp_path)
    service.settle_due("user-a", now=START + timedelta(days=14))

    invitations = store.list_interaction_invitations("user-a", limit=200)
    unresolved = [item for item in invitations if item["status"] in {"rejected", "postponed"}]
    assert unresolved
    events = store.list_interaction_events("user-a", limit=200)
    completed_invitation_ids = {
        event["facts"].get("invitation_id") for event in events
        if event["status"] == "completed"
    }
    assert all(item["invitation_id"] not in completed_invitation_ids for item in unresolved)


def test_completed_pair_events_have_two_views_and_no_location_overlap(tmp_path):
    store, service = make_world(tmp_path)
    service.settle_due("user-a", now=START + timedelta(days=7))

    events = [
        item for item in store.list_interaction_events("user-a", limit=200)
        if item["facts"].get("invitation_id")
    ]
    assert events
    for event in events:
        participant_ids = {item["actor_id"] for item in event["participants"]}
        assert set(event["perspectives"]) == participant_ids
        for actor_id in participant_ids:
            overlapping = [
                item for item in store.list_actor_events("user-a", actor_id, limit=100)
                if item["start_at"] < event["end_at"]
                and item["end_at"] > event["start_at"]
            ]
            assert overlapping
            assert {item["location_id"] for item in overlapping} == {
                event["location_id"]
            }
