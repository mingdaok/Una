import importlib

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch, tmp_path):
    monkeypatch.setenv("UNA_DB_PATH", str(tmp_path / "social-api.sqlite3"))
    monkeypatch.setenv("UNA_JWT_SECRET", "test-secret-that-is-at-least-32-bytes")

    import settings
    import database
    import social_db
    import auth_service
    import auth_api
    import social_api

    importlib.reload(settings)
    importlib.reload(database)
    importlib.reload(social_db)
    importlib.reload(auth_service)
    importlib.reload(auth_api)
    importlib.reload(social_api)
    database.init_db()

    app = FastAPI()
    app.include_router(auth_api.router)
    app.include_router(social_api.router)
    return TestClient(app)


def register_headers(client, username):
    response = client.post(
        "/api/auth/register",
        json={"username": username, "password": "correct-horse-battery"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_social_post_owner_comes_from_authenticated_user(client):
    alice_headers = register_headers(client, "alice")
    bob_headers = register_headers(client, "bob")

    created = client.post(
        "/api/social/post",
        headers=alice_headers,
        json={
            "owner_user_id": "pretend-bob",
            "author_id": "pretend-bob",
            "author_name": "Pretend Bob",
            "content": "只属于 Alice 的记录",
        },
    )

    assert created.status_code == 200
    assert created.json()["post"]["owner_user_id"] != "pretend-bob"

    alice_feed = client.get("/api/social/feed", headers=alice_headers)
    bob_feed = client.get("/api/social/feed", headers=bob_headers)

    assert alice_feed.status_code == 200
    assert alice_feed.json()["total"] == 1
    assert bob_feed.status_code == 200
    assert bob_feed.json()["total"] == 0


def test_social_feed_rejects_missing_authentication(client):
    assert client.get("/api/social/feed").status_code == 401
