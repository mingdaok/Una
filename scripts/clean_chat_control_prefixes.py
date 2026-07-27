"""预览或清理 UNA 历史 AI 消息中的控制前缀。"""

import argparse
import json
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from chat_control_migration import clean_database


def parse_args():
    parser = argparse.ArgumentParser(
        description="清理 chat_history 中误存的 EMOTION/ACTION/[动作] 控制前缀。"
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=ROOT_DIR / "backend" / "una_memory.db",
        help="目标 SQLite 数据库路径。",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="创建备份后实际更新；不传时只预览。",
    )
    parser.add_argument(
        "--backup",
        type=Path,
        default=None,
        help="可选的备份文件路径；默认在数据库旁生成带时间戳的备份。",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    result = clean_database(
        args.db,
        apply=args.apply,
        backup_path=args.backup,
    )
    mode = "应用" if args.apply else "预览"
    print(f"历史控制文本清理（{mode}）")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
