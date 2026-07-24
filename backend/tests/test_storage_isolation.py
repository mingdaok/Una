import importlib
import os
import sys
from pathlib import Path


BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


def test_pytest_session_uses_temporary_persistence():
    configured_path = Path(os.environ["UNA_DB_PATH"])

    assert configured_path.name == "una-test.sqlite3"
    assert str(configured_path).startswith(os.environ["TEMP"])


def test_database_path_uses_test_environment(monkeypatch, tmp_path):
    test_db = tmp_path / "una-test.sqlite3"
    monkeypatch.setenv("UNA_DB_PATH", str(test_db))

    import settings
    import database

    importlib.reload(settings)
    importlib.reload(database)
    database.init_db()

    assert database.DB_PATH == str(test_db)
    assert test_db.exists()


def test_social_database_uses_same_configured_path(monkeypatch, tmp_path):
    test_db = tmp_path / "una-social-test.sqlite3"
    monkeypatch.setenv("UNA_DB_PATH", str(test_db))

    import settings
    import social_db

    importlib.reload(settings)
    importlib.reload(social_db)

    assert social_db.DB_PATH == str(test_db)


def test_chroma_path_uses_test_environment(monkeypatch, tmp_path):
    test_chroma_path = tmp_path / "chroma"
    monkeypatch.setenv("UNA_CHROMA_PATH", str(test_chroma_path))

    import settings
    from memory import vector_db

    importlib.reload(settings)
    importlib.reload(vector_db)

    assert vector_db.DB_PERSIST_PATH == str(test_chroma_path)


def test_cors_origins_are_loaded_from_explicit_environment_config(monkeypatch):
    monkeypatch.setenv("UNA_CORS_ORIGINS", "https://app.example.com,https://admin.example.com")

    import settings

    importlib.reload(settings)

    assert settings.settings.cors_origins == ("https://app.example.com", "https://admin.example.com")
