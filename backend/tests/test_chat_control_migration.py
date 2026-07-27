import os
import sqlite3
import sys
from pathlib import Path


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import chat_control_migration
from chat_control_migration import clean_database


ACTION_JSON = (
    '{"intent":"curious_question","intensity":0.4,'
    '"expression":"subtle","timing":"after_sentence",'
    '"duration_ms":1000,"variation_seed":5}'
)

LEGACY_EMOTION_REPLY = (
    "EMOTION: [双手轻捂胸口微笑(shy)] | MOOD: [4]"
    "（围巾轻轻遮住泛光的下巴）"
    "小白……这是第十三次了呢。虽然很感谢这份心意。\n\n"
    "但更想看到你在现实里找到能真实触碰的温暖呀。"
)

LEGACY_EMOTION_BODY = (
    "小白……这是第十三次了呢。虽然很感谢这份心意。\n\n"
    "但更想看到你在现实里找到能真实触碰的温暖呀。"
)


def create_chat_database(path: Path) -> None:
    connection = sqlite3.connect(path)
    try:
        connection.execute(
            """
            CREATE TABLE chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                content TEXT NOT NULL
            )
            """
        )
        connection.executemany(
            "INSERT INTO chat_history (role, content) VALUES (?, ?)",
            [
                ("ai", "这是正常回复。"),
                (
                    "ai",
                    f"ACTION: {ACTION_JSON}（光晕轻晃）啊呀！让我猜猜。",
                ),
                (
                    "ai",
                    f"[动作:期待] ACTION: {ACTION_JSON}正文保留。",
                ),
                ("ai", LEGACY_EMOTION_REPLY),
                ("ai", "EMOTION: 未知格式 同行正文不得删除。"),
                ("ai", "ACTION : null 空格冒号格式留待人工处理。"),
                ("ai", "  ACTION : null 前导空格不得被伪装成已清理。"),
                (
                    "user",
                    f"ACTION: {ACTION_JSON}这是用户输入，不得修改。",
                ),
            ],
        )
        connection.commit()
    finally:
        connection.close()


def read_messages(path: Path):
    connection = sqlite3.connect(path)
    try:
        return connection.execute(
            "SELECT role, content FROM chat_history ORDER BY id"
        ).fetchall()
    finally:
        connection.close()


def test_preview_does_not_modify_database_and_apply_creates_backup(tmp_path):
    database_path = tmp_path / "chat.sqlite3"
    backup_path = tmp_path / "chat.before-control-clean.sqlite3"
    create_chat_database(database_path)
    original_messages = read_messages(database_path)

    preview = clean_database(database_path, apply=False)

    assert preview == {
        "scanned": 7,
        "matched": 6,
        "skipped": 3,
        "updated": 0,
        "backup_path": None,
    }
    assert read_messages(database_path) == original_messages

    result = clean_database(
        database_path,
        apply=True,
        backup_path=backup_path,
    )

    assert result == {
        "scanned": 7,
        "matched": 6,
        "skipped": 3,
        "updated": 3,
        "backup_path": str(backup_path),
    }
    assert backup_path.exists()
    assert read_messages(backup_path) == original_messages
    assert read_messages(database_path) == [
        ("ai", "这是正常回复。"),
        ("ai", "啊呀！让我猜猜。"),
        ("ai", "正文保留。"),
        ("ai", LEGACY_EMOTION_BODY),
        ("ai", "EMOTION: 未知格式 同行正文不得删除。"),
        ("ai", "ACTION : null 空格冒号格式留待人工处理。"),
        ("ai", "  ACTION : null 前导空格不得被伪装成已清理。"),
        ("user", f"ACTION: {ACTION_JSON}这是用户输入，不得修改。"),
    ]

    second_preview = clean_database(database_path, apply=False)
    assert second_preview["matched"] == 3
    assert second_preview["skipped"] == 3
    assert second_preview["updated"] == 0


def test_apply_holds_write_lock_before_scanning(tmp_path, monkeypatch):
    database_path = tmp_path / "chat.sqlite3"
    backup_path = tmp_path / "chat.before-control-clean.sqlite3"
    create_chat_database(database_path)
    original_sanitize = chat_control_migration.sanitize_reply_text
    concurrent_attempts = []

    def sanitize_while_another_writer_attempts(content):
        if not concurrent_attempts:
            other = sqlite3.connect(database_path, timeout=0)
            try:
                other.execute(
                    "UPDATE chat_history SET content = ? WHERE id = 1",
                    ("并发写入不得被旧快照覆盖。",),
                )
                other.commit()
                concurrent_attempts.append("updated")
            except sqlite3.OperationalError:
                other.rollback()
                concurrent_attempts.append("locked")
            finally:
                other.close()
        return original_sanitize(content)

    monkeypatch.setattr(
        chat_control_migration,
        "sanitize_reply_text",
        sanitize_while_another_writer_attempts,
    )

    clean_database(database_path, apply=True, backup_path=backup_path)

    assert concurrent_attempts == ["locked"]
    assert read_messages(database_path)[0] == ("ai", "这是正常回复。")
