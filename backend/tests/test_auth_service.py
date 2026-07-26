import importlib

import pytest


@pytest.fixture
def auth_service(monkeypatch, tmp_path):
    monkeypatch.setenv("UNA_DB_PATH", str(tmp_path / "auth.sqlite3"))
    monkeypatch.setenv("UNA_JWT_SECRET", "test-secret-that-is-at-least-32-bytes")

    import settings
    import database
    import auth_service as auth_module

    importlib.reload(settings)
    importlib.reload(database)
    importlib.reload(auth_module)
    database.init_db()

    return auth_module.AuthService()


def test_register_hashes_password_and_returns_uuid(auth_service):
    account = auth_service.register("UnaUser", "correct-horse-battery")

    import database

    assert account["id"]
    assert account["username"] == "unauser"
    assert "correct-horse-battery" not in database.get_password_hash(account["id"])


def test_authenticate_rejects_wrong_password(auth_service):
    auth_service.register("alice", "correct-horse-battery")

    assert auth_service.authenticate("alice", "wrong-password") is None
    assert auth_service.authenticate("alice", "correct-horse-battery")["username"] == "alice"


def test_migrate_legacy_account_reuses_legacy_user_id_and_history(auth_service):
    import database

    created, _ = database.register_user("mingdaok", "legacy-password")
    assert created is True
    database.add_message("mingdaok", "user", "旧聊天记录")

    account = auth_service.migrate_legacy_account("mingdaok", "new-secure-password")

    assert account == {"id": "mingdaok", "username": "mingdaok"}
    assert auth_service.authenticate("mingdaok", "new-secure-password") == account
    assert database.get_recent_history(account["id"], limit=1)[0]["content"] == "旧聊天记录"


def test_refresh_token_can_only_be_used_once(auth_service):
    account = auth_service.register("alice", "correct-horse-battery")
    session = auth_service.issue_session(account["id"])

    rotated = auth_service.rotate_refresh(session["refresh_token"])

    assert rotated
    assert auth_service.rotate_refresh(session["refresh_token"]) is None
    assert auth_service.verify_access(rotated["access_token"])["id"] == account["id"]


def test_websocket_ticket_can_only_be_consumed_once(auth_service):
    account = auth_service.register("ticket_user", "correct-horse-battery")

    ticket = auth_service.create_ws_ticket(account["id"])

    assert auth_service.consume_ws_ticket(ticket) == account["id"]
    assert auth_service.consume_ws_ticket(ticket) is None
