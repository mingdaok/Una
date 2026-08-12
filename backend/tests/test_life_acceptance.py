from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth_api import get_current_user
from life_simulation.api import create_life_router
from life_simulation.service import LifeSettlementService
from life_simulation.store import LifeStore


def _client(tmp_path, *, enabled: bool):
    store = LifeStore(str(tmp_path / ("acceptance-on.sqlite3" if enabled else "acceptance-off.sqlite3")))
    service = LifeSettlementService(store)
    app = FastAPI()
    app.include_router(create_life_router(service, acceptance_enabled=enabled))
    current = {"id": "user-a", "username": "a"}
    app.dependency_overrides[get_current_user] = lambda: current
    return TestClient(app), service, current


def test_acceptance_routes_are_not_registered_by_default(tmp_path):
    client, _, _ = _client(tmp_path, enabled=False)

    assert client.get("/api/life/acceptance/status").status_code == 404
    assert client.post("/api/life/acceptance/reset", json={"seed": "demo"}).status_code == 404
    assert client.post(
        "/api/life/acceptance/evaluate", json={"seeds": ["demo"], "days": 1}
    ).status_code == 404
    assert client.post("/api/life/acceptance/content-audit", json={}).status_code == 404


def test_seeded_scenario_can_be_replayed_and_advanced(tmp_path):
    client, _, _ = _client(tmp_path, enabled=True)

    first = client.post(
        "/api/life/acceptance/reset",
        json={"seed": "review-seed", "scenario": "one_day"},
    )
    assert first.status_code == 200
    assert first.json()["active"] is True
    assert first.json()["settlement"]["npc_settlement"]["created_events"] > 0

    first_events = client.get("/api/life/actors/npc_preset_1/events").json()["items"]
    replay = client.post(
        "/api/life/acceptance/reset",
        json={"seed": "review-seed", "scenario": "one_day"},
    )
    replay_events = client.get("/api/life/actors/npc_preset_1/events").json()["items"]

    assert replay.status_code == 200
    assert replay_events == first_events

    advanced = client.post("/api/life/acceptance/advance", json={"hours": 24})
    assert advanced.status_code == 200
    assert advanced.json()["advanced_hours"] == 24
    assert advanced.json()["virtual_now"] > replay.json()["virtual_now"]


def test_reset_and_release_are_isolated_to_current_user(tmp_path):
    client, service, current = _client(tmp_path, enabled=True)
    service.ensure_world("user-b")

    assert client.post(
        "/api/life/acceptance/reset", json={"seed": "isolated", "scenario": "baseline"}
    ).status_code == 200
    assert service.store.get_profile("user-b", "ai_una") is not None

    released = client.post("/api/life/acceptance/release")
    assert released.status_code == 200
    assert released.json()["active"] is False
    assert service.store.get_acceptance_control(current["id"]) is None


def test_acceptance_controls_validate_bounds(tmp_path):
    client, _, _ = _client(tmp_path, enabled=True)

    assert client.post("/api/life/acceptance/reset", json={"seed": ""}).status_code == 400
    assert client.post("/api/life/acceptance/advance", json={"hours": 24}).status_code == 400
    client.post("/api/life/acceptance/reset", json={"seed": "valid"})
    assert client.post("/api/life/acceptance/advance", json={"hours": 169}).status_code == 400


def test_quality_api_uses_temporary_worlds(tmp_path):
    client, service, _ = _client(tmp_path, enabled=True)

    response = client.post(
        "/api/life/acceptance/evaluate",
        json={"seeds": ["api-quality"], "days": 1},
    )

    assert response.status_code == 200
    assert response.json()["seed_count"] == 1
    assert response.json()["metrics"]["actor_event_count"] > 0
    assert service.store.list_enabled_worlds() == []


def test_content_audit_api_is_authenticated_and_owner_scoped(tmp_path):
    client, _, _ = _client(tmp_path, enabled=True)

    response = client.post("/api/life/acceptance/content-audit", json={})

    assert response.status_code == 200
    assert response.json()["summary"]["scanned"] == 0
    assert response.json()["issues"] == []
