import importlib

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch, tmp_path):
    monkeypatch.setenv("UNA_DB_PATH", str(tmp_path / "auth-api.sqlite3"))
    monkeypatch.setenv("UNA_JWT_SECRET", "test-secret-that-is-at-least-32-bytes")

    import settings
    import database
    import auth_service
    import auth_api

    importlib.reload(settings)
    importlib.reload(database)
    importlib.reload(auth_service)
    importlib.reload(auth_api)
    database.init_db()

    app = FastAPI()
    app.include_router(auth_api.router)
    return TestClient(app)


def test_register_login_and_protected_profile(client):
    register = client.post(
        "/api/auth/register",
        json={"username": "UnaUser", "password": "correct-horse-battery"},
    )

    assert register.status_code == 201
    session = register.json()
    assert session["user"]["username"] == "unauser"

    assert client.get("/api/auth/me").status_code == 401

    profile = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {session['access_token']}"},
    )
    assert profile.status_code == 200
    assert profile.json()["id"] == session["user"]["id"]


def test_websocket_ticket_requires_authentication_and_is_one_time(client):
    login = client.post(
        "/api/auth/register",
        json={"username": "ticketuser", "password": "correct-horse-battery"},
    ).json()
    headers = {"Authorization": f"Bearer {login['access_token']}"}

    assert client.post("/api/auth/ws-ticket").status_code == 401

    ticket = client.post("/api/auth/ws-ticket", headers=headers).json()["ticket"]

    import auth_api

    assert auth_api.auth_service.consume_ws_ticket(ticket) == login["user"]["id"]
    assert auth_api.auth_service.consume_ws_ticket(ticket) is None
