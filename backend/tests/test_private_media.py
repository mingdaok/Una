import importlib

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


@pytest.fixture
def media_client(monkeypatch, tmp_path):
    monkeypatch.setenv("UNA_DB_PATH", str(tmp_path / "media.sqlite3"))
    monkeypatch.setenv("UNA_JWT_SECRET", "test-secret-that-is-at-least-32-bytes")

    import settings
    import database
    import auth_service
    import auth_api
    import media_service

    importlib.reload(settings)
    importlib.reload(database)
    importlib.reload(auth_service)
    importlib.reload(auth_api)
    importlib.reload(media_service)
    database.init_db()

    app = FastAPI()
    app.include_router(auth_api.router)
    app.include_router(media_service.router)
    return TestClient(app), media_service, tmp_path


def register(client, username):
    response = client.post(
        "/api/auth/register",
        json={"username": username, "password": "correct-horse-battery"},
    )
    session = response.json()
    return session["user"], {"Authorization": f"Bearer {session['access_token']}"}


def test_private_media_is_only_streamed_to_its_owner(media_client):
    client, media_service, tmp_path = media_client
    alice, alice_headers = register(client, "alice")
    _, bob_headers = register(client, "bob")
    audio_file = tmp_path / "reply.mp3"
    audio_file.write_bytes(b"private-audio")

    media = media_service.register_media(alice["id"], "audio", str(audio_file))

    own_response = client.get(media_service.media_url(media["id"]), headers=alice_headers)
    assert own_response.status_code == 200
    assert own_response.content == b"private-audio"
    assert client.get(media_service.media_url(media["id"]), headers=bob_headers).status_code == 404
    assert client.get(media_service.media_url(media["id"])).status_code == 401


def test_history_audio_url_signing_accepts_legacy_null_paths(media_client):
    _, media_service, _ = media_client
    history = [
        {"role": "user", "content": "hello", "audio_path": None},
        {"role": "ai", "content": "hi", "audio_path": ""},
    ]

    result = media_service.sign_history_audio_urls(history, "legacy-user")

    assert result == history
    assert result[0]["audio_path"] is None
