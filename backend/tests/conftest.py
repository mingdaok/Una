"""pytest 启动时强制使用临时持久化目录，严禁测试触碰真实用户数据。"""

import os
import sys
import tempfile
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


TEST_DATA_DIR = Path(tempfile.mkdtemp(prefix="una-pytest-"))
os.environ["UNA_DB_PATH"] = str(TEST_DATA_DIR / "una-test.sqlite3")
os.environ["UNA_CHROMA_PATH"] = str(TEST_DATA_DIR / "chroma")
