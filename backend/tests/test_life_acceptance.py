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
    assert client.post(
        "/api/life/acceptance/evaluation-jobs",
        json={"seeds": ["demo"], "days": 30},
    ).status_code == 404
    assert client.post("/api/life/acceptance/content-audit", json={}).status_code == 404
    assert client.get(
        "/api/life/acceptance/actors/npc_preset_1/decisions"
    ).status_code == 404


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


def test_development_inspector_exposes_decision_evidence_without_private_state(tmp_path):
    client, _, _ = _client(tmp_path, enabled=True)
    client.post(
        "/api/life/acceptance/reset",
        json={"seed": "decision-evidence", "scenario": "one_day"},
    )

    response = client.get(
        "/api/life/acceptance/actors/npc_preset_1/decisions"
    )

    assert response.status_code == 200
    decision = response.json()["items"][0]
    assert decision["engine_version"] == "npc-agency-v2"
    assert decision["candidate_scores"]
    assert "private_reason" not in decision
    assert "owner_user_id" not in decision

    planning = client.get(
        "/api/life/acceptance/actors/npc_preset_1/planning"
    ).json()
    assert planning["goals"]
    assert planning["commitments"]
    assert planning["plans"]
    assert all("private_reason" not in item for item in planning["plans"])
    assert all("private_reason" not in item for item in planning["invitations"])
    assert "metadata" not in str(planning["environment"]["opportunities"])
    assert all("private_reason" not in item for item in planning["llm_calls"])
    assert "decision_context" in planning
    assert all("private_summary" not in item for item in planning["decision_context"]["relationships"])
    assert all("content" not in item for item in planning["decision_context"]["memory_signals"])
    assert all("metadata" not in item for item in planning["decision_context"]["memory_signals"])
    assert "reflections" in planning
    assert "goal_transitions" in planning
    assert all("metadata" not in item for item in planning["reflections"])
    assert all("private_reason" not in item for item in planning["goal_transitions"])


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


def test_long_quality_runs_must_use_background_jobs(tmp_path):
    client, _, _ = _client(tmp_path, enabled=True)

    response = client.post(
        "/api/life/acceptance/evaluate",
        json={"seeds": ["too-long-for-request"], "days": 8},
    )

    assert response.status_code == 400
    assert "后台评估任务" in response.json()["detail"]


def test_quality_job_routes_are_owner_scoped(tmp_path):
    client, _, current = _client(tmp_path, enabled=True)

    assert client.get("/api/life/acceptance/evaluation-jobs").json() == {"items": []}
    assert client.get("/api/life/acceptance/evaluation-jobs/missing").status_code == 404
    current["id"] = "user-b"
    assert client.post(
        "/api/life/acceptance/evaluation-jobs/missing/cancel"
    ).status_code == 404


def test_content_audit_api_is_authenticated_and_owner_scoped(tmp_path):
    client, _, _ = _client(tmp_path, enabled=True)

    response = client.post("/api/life/acceptance/content-audit", json={})

    assert response.status_code == 200
    assert response.json()["summary"]["scanned"] == 0
    assert response.json()["issues"] == []
