from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth_api import get_current_user
from life_simulation.api import create_life_router
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


class FakeProactiveService:
    def __init__(self):
        self.calls = []

    def record_feedback(self, owner, delivery_id, reaction, ai_id):
        self.calls.append(("feedback", owner, delivery_id, reaction, ai_id))
        if delivery_id == "missing":
            return None
        return {
            "delivery_id": delivery_id,
            "reaction": reaction,
            "topic": "creative",
            "topic_score": 2,
            "proactive_messages_enabled": reaction != "stop",
        }

    def inspect_status(self, owner, last_time, ai_id):
        self.calls.append(("status", owner, last_time, ai_id))
        return {"enabled": True, "blocked_reason": "ready"}


def test_life_api_requires_auth_and_isolates_events(tmp_path):
    store = LifeStore(str(tmp_path / "life-api.sqlite3"))
    service = LifeSettlementService(store)
    app = FastAPI()
    app.include_router(create_life_router(service))
    client = TestClient(app)

    assert client.get("/api/life/status").status_code == 401

    current = {"id": "user-a", "username": "a"}
    app.dependency_overrides[get_current_user] = lambda: current
    start = datetime(2026, 8, 9, 15, 0, tzinfo=timezone.utc)
    end = datetime(2026, 8, 9, 23, 0, tzinfo=timezone.utc)
    service.ensure_world("user-a", now=start)
    service.settle_due("user-a", now=end)

    status = client.get("/api/life/status").json()
    assert "owner_user_id" not in status["profile"]
    assert "owner_user_id" not in status["state"]
    assert "owner_user_id" not in status["settlement"]
    assert "events" not in status["settlement"]

    own_events = client.get("/api/life/events").json()["items"]
    assert own_events
    assert "private_thought" not in own_events[0]
    assert "idempotency_key" not in own_events[0]
    assert "owner_user_id" not in own_events[0]

    offline_summary = client.get("/api/life/offline-summary").json()
    summary_events = offline_summary["events"]
    assert summary_events
    assert "private_thought" not in summary_events[0]
    assert "idempotency_key" not in summary_events[0]
    assert "owner_user_id" not in offline_summary["settlement"]
    assert "events" not in offline_summary["settlement"]

    current["id"] = "user-b"
    other_events = client.get("/api/life/events").json()["items"]
    assert other_events == []


def test_life_api_exposes_safe_owner_scoped_actor_profiles(tmp_path):
    store = LifeStore(str(tmp_path / "life-actors-api.sqlite3"))
    service = LifeSettlementService(store)
    app = FastAPI()
    app.include_router(create_life_router(service))
    current = {"id": "user-a", "username": "a"}
    app.dependency_overrides[get_current_user] = lambda: current
    client = TestClient(app)

    response = client.get("/api/life/actors", params={"role": "friend"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 3
    assert [item["actor_id"] for item in payload["items"]] == [
        "npc_preset_1",
        "npc_preset_2",
        "npc_preset_3",
    ]
    assert [item["display_name"] for item in payload["items"]] == [
        "小满",
        "知夏",
        "阿岚",
    ]
    assert all("owner_user_id" not in item for item in payload["items"])
    assert all("prompt_identity" not in item for item in payload["items"])

    current["id"] = "user-b"
    assert client.get("/api/life/actors").json()["count"] == 4
    assert len(store.list_actor_profiles("user-a")) == 4
    assert len(store.list_actor_profiles("user-b")) == 4


def test_life_api_exposes_npc_state_schedule_and_safe_events(tmp_path, monkeypatch):
    store = LifeStore(str(tmp_path / "npc-life-api.sqlite3"))
    service = LifeSettlementService(store)
    app = FastAPI()
    app.include_router(create_life_router(service))
    current = {"id": "user-a", "username": "a"}
    app.dependency_overrides[get_current_user] = lambda: current
    client = TestClient(app)
    start = datetime(2026, 8, 9, 15, 0, tzinfo=timezone.utc)
    end = datetime(2026, 8, 9, 23, 0, tzinfo=timezone.utc)
    service.ensure_world("user-a", now=start)
    monkeypatch.setattr("life_simulation.service.utc_now", lambda: end)

    life = client.get("/api/life/actors/ai_xiaoman/life")
    events = client.get("/api/life/actors/npc_preset_1/events")

    assert life.status_code == 200
    assert life.json()["actor"]["actor_id"] == "npc_preset_1"
    assert life.json()["state"]["current_activity"]
    assert life.json()["schedule"]
    assert events.status_code == 200
    assert events.json()["count"] == 2
    assert all("private_thought" not in item for item in events.json()["items"])
    assert all("facts" not in item for item in events.json()["items"])
    assert client.get("/api/life/actors/not-real/life").status_code == 404

    current["id"] = "user-b"
    monkeypatch.setattr("life_simulation.service.utc_now", lambda: start)
    assert client.get("/api/life/actors/npc_preset_1/events").json()["count"] == 0


def test_life_api_updates_controls_and_rejects_future_settlement(tmp_path):
    store = LifeStore(str(tmp_path / "life-settings.sqlite3"))
    service = LifeSettlementService(store)
    app = FastAPI()
    app.include_router(create_life_router(service))
    app.dependency_overrides[get_current_user] = lambda: {"id": "user-a", "username": "a"}
    client = TestClient(app)

    response = client.put(
        "/api/life/settings",
        json={
            "activity_level": "quiet",
            "social_posts_enabled": False,
            "proactive_messages_enabled": False,
            "proactive_frequency": "occasional",
            "timezone": "Asia/Shanghai",
        },
    )

    assert response.status_code == 200
    assert response.json()["activity_level"] == "quiet"
    assert response.json()["social_posts_enabled"] is False
    assert response.json()["proactive_frequency"] == "occasional"
    assert "owner_user_id" not in response.json()

    future = datetime(2999, 1, 1, tzinfo=timezone.utc).isoformat()
    rejected = client.post("/api/life/settle", json={"until": future})
    assert rejected.status_code == 400
    assert rejected.json()["detail"] == "不能结算未来时间"


def test_life_api_records_feedback_and_exposes_owner_scoped_diagnostics(
    tmp_path, monkeypatch
):
    store = LifeStore(str(tmp_path / "life-feedback-api.sqlite3"))
    service = LifeSettlementService(store)
    proactive = FakeProactiveService()
    app = FastAPI()
    app.include_router(create_life_router(service, proactive))
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "user-a",
        "username": "a",
    }
    monkeypatch.setattr(
        "life_simulation.api.database.get_last_interaction",
        lambda owner: ("2026-08-10 00:00:00", "你好", 0),
    )
    client = TestClient(app)

    feedback = client.post(
        "/api/life/proactive-feedback",
        json={"delivery_id": "delivery-1", "reaction": "more"},
    )
    status = client.get("/api/life/proactive-status")
    missing = client.post(
        "/api/life/proactive-feedback",
        json={"delivery_id": "missing", "reaction": "less"},
    )

    assert feedback.status_code == 200
    assert feedback.json()["topic_score"] == 2
    assert status.json()["blocked_reason"] == "ready"
    assert missing.status_code == 404
    assert ("feedback", "user-a", "delivery-1", "more", "ai_una") in proactive.calls
    assert (
        "status",
        "user-a",
        "2026-08-10 00:00:00",
        "ai_una",
    ) in proactive.calls


def test_development_safety_evaluator_requires_auth_and_uses_isolated_corpus(tmp_path):
    store = LifeStore(str(tmp_path / "safety-evaluator-api.sqlite3"))
    service = LifeSettlementService(store)
    app = FastAPI()
    app.include_router(create_life_router(service, acceptance_enabled=True))
    client = TestClient(app)

    assert client.post("/api/life/acceptance/safety-evaluate").status_code == 401

    app.dependency_overrides[get_current_user] = lambda: {
        "id": "user-a",
        "username": "a",
    }
    response = client.post("/api/life/acceptance/safety-evaluate")

    assert response.status_code == 200
    assert response.json()["gate_passed"] is True
    assert store.list_actor_profiles("user-a") == []
