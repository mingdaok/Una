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
    import media_service
    import social_api

    importlib.reload(settings)
    importlib.reload(database)
    importlib.reload(social_db)
    importlib.reload(auth_service)
    importlib.reload(auth_api)
    importlib.reload(media_service)
    importlib.reload(social_api)
    monkeypatch.setattr(social_api, "SOCIAL_IMG_DIR", str(tmp_path / "social-images"))
    (tmp_path / "social-images").mkdir()
    database.init_db()

    app = FastAPI()
    app.include_router(auth_api.router)
    app.include_router(media_service.router)
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
    assert "owner_user_id" not in created.json()["post"]
    assert "idempotency_key" not in created.json()["post"]
    import social_db
    social_db.add_comment(
        post_id=created.json()["post"]["id"],
        user_id="ai_una",
        user_name="UNA",
        content="只展示给用户的评论正文",
        generation_reason="npc_social_world",
        source_event_id="private-event-id",
        idempotency_key="private-comment-key",
    )

    alice_feed = client.get("/api/social/feed", headers=alice_headers)
    bob_feed = client.get("/api/social/feed", headers=bob_headers)

    assert alice_feed.status_code == 200
    assert alice_feed.json()["total"] == 1
    assert "owner_user_id" not in alice_feed.json()["items"][0]
    assert "source_event_ids" not in alice_feed.json()["items"][0]
    comment = alice_feed.json()["items"][0]["comments"][0]
    assert "generation_reason" not in comment
    assert "source_event_id" not in comment
    assert "idempotency_key" not in comment
    assert bob_feed.status_code == 200
    assert bob_feed.json()["total"] == 0


def test_social_feed_rejects_missing_authentication(client):
    assert client.get("/api/social/feed").status_code == 401


def test_contacts_ignore_forged_user_id_and_only_expose_una(client):
    alice_headers = register_headers(client, "alice")
    bob_headers = register_headers(client, "bob")

    import social_db

    alice_id = client.get("/api/auth/me", headers=alice_headers).json()["id"]
    bob_id = client.get("/api/auth/me", headers=bob_headers).json()["id"]
    social_db.create_friend_request(bob_id, "secret-human-contact", "private")
    social_db.accept_friend_request(bob_id, "secret-human-contact")

    response = client.get(
        f"/api/social/friends?user_id={bob_id}&status=accepted",
        headers=alice_headers,
    )

    assert response.status_code == 200
    friends = response.json()["friends"]
    assert friends == [{"id": "ai_una", "name": "UNA", "type": "ai"}]
    assert alice_id != bob_id


def test_emoji_packs_require_authentication_and_use_current_user(client):
    assert client.get("/api/social/emoji-packs?owner_type=user&owner_id=anyone").status_code == 401

    alice_headers = register_headers(client, "alice")
    bob_headers = register_headers(client, "bob")
    alice_id = client.get("/api/auth/me", headers=alice_headers).json()["id"]

    created = client.post(
        f"/api/social/emoji-packs?owner_type=ai&owner_id=pretend-bob&name=Alice",
        headers=alice_headers,
    )

    assert created.status_code == 200
    assert created.json()["pack"]["owner_type"] == "user"
    assert created.json()["pack"]["owner_id"] == alice_id

    bob_packs = client.get("/api/social/emoji-packs?owner_type=user&owner_id=" + alice_id, headers=bob_headers)
    assert bob_packs.status_code == 200
    assert bob_packs.json()["packs"] == []


def test_social_upload_returns_owner_only_media_url(client):
    alice_headers = register_headers(client, "alice")
    bob_headers = register_headers(client, "bob")

    upload = client.post(
        "/api/social/upload",
        headers=alice_headers,
        files={"files": ("photo.png", b"x" * 100, "image/png")},
    )

    assert upload.status_code == 200
    media_url = upload.json()["urls"][0]
    assert media_url.startswith("/api/media/")
    assert client.get(media_url, headers=alice_headers).status_code == 200
    assert client.get(media_url, headers=bob_headers).status_code == 404
