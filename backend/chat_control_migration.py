"""历史聊天中泄漏控制前缀的可备份迁移。"""

from __future__ import annotations

import datetime
import re
import sqlite3
from pathlib import Path

from chat_control import sanitize_reply_text


_LEAKED_CONTROL_PREFIX = re.compile(
    r"^\s*(?:"
    r"EMOTION\s*:|"
    r"ACTION\s*:|"
    r"\[动作\s*:|"
    r"```(?:json)?\s*(?:EMOTION\s*:|ACTION\s*:|\[动作\s*:)"
    r")",
    re.IGNORECASE,
)


def _default_backup_path(database_path: Path) -> Path:
    timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    return database_path.with_name(
        f"{database_path.stem}.before-control-clean-{timestamp}{database_path.suffix}"
    )


def clean_database(database_path, apply=False, backup_path=None):
    """预览或清理 AI 历史消息；应用时先创建 SQLite 一致性备份。"""
    database_path = Path(database_path).resolve()
    if not database_path.is_file():
        raise FileNotFoundError(f"数据库不存在：{database_path}")

    connection = sqlite3.connect(database_path)
    try:
        if apply:
            # 先取得写锁，再选取与计算，避免按事务外旧快照覆盖并发写入。
            connection.execute("BEGIN IMMEDIATE")

        rows = connection.execute(
            "SELECT id, content FROM chat_history WHERE role = 'ai' ORDER BY id"
        ).fetchall()
        changes = []
        matched = 0
        skipped = 0
        for message_id, content in rows:
            if not isinstance(content, str) or not _LEAKED_CONTROL_PREFIX.match(content):
                continue
            matched += 1
            cleaned = sanitize_reply_text(content)
            # 历史迁移必须保守：无法可靠找出正文边界时，运行时清洗器
            # 可能返回空串；这种记录留给人工处理，绝不覆盖原始内容。
            if (
                not cleaned
                or cleaned == content
                or _LEAKED_CONTROL_PREFIX.match(cleaned)
            ):
                skipped += 1
            else:
                changes.append((cleaned, message_id, content))

        result = {
            "scanned": len(rows),
            "matched": matched,
            "skipped": skipped,
            "updated": 0,
            "backup_path": None,
        }
        if not apply:
            return result
        if not changes:
            connection.commit()
            return result

        resolved_backup = (
            Path(backup_path).resolve()
            if backup_path is not None
            else _default_backup_path(database_path)
        )
        if resolved_backup.exists():
            raise FileExistsError(f"备份文件已存在：{resolved_backup}")
        resolved_backup.parent.mkdir(parents=True, exist_ok=True)

        # 主连接持有写锁期间，从独立只读快照备份；直到更新提交前，
        # 其他写入者都无法插入或改写本次扫描范围。
        backup_source = sqlite3.connect(database_path)
        backup_connection = sqlite3.connect(resolved_backup)
        try:
            backup_source.backup(backup_connection)
        finally:
            backup_connection.close()
            backup_source.close()

        try:
            cursor = connection.executemany(
                """
                UPDATE chat_history
                SET content = ?
                WHERE id = ? AND role = 'ai' AND content = ?
                """,
                changes,
            )
            if cursor.rowcount != len(changes):
                raise RuntimeError("迁移期间消息内容发生变化，已取消本次更新")
            connection.commit()
        except Exception:
            connection.rollback()
            raise

        result["updated"] = cursor.rowcount
        result["backup_path"] = str(resolved_backup)
        return result
    finally:
        connection.close()
