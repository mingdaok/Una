import sqlite3
import os
import hashlib
import datetime
from settings import settings

# 🔥 核心修复：确保路径绝对正确，防止 nohup 启动时找不到 DB
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = settings.database_path or os.path.join(CURRENT_DIR, "una_memory.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. 聊天记录表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            role TEXT,
            content TEXT,
            mood_score INTEGER DEFAULT 0,
            audio_path TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # 2. 用户表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password_hash TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 公网多用户账号与可撤销刷新会话。保留上方 legacy users 表，避免影响历史本地数据。
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS app_users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL COLLATE NOCASE UNIQUE,
            password_hash TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS auth_refresh_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            revoked_at TEXT,
            FOREIGN KEY (user_id) REFERENCES app_users(id)
        )
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_auth_refresh_sessions_user_id
        ON auth_refresh_sessions(user_id)
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS private_media (
            id TEXT PRIMARY KEY,
            owner_user_id TEXT NOT NULL,
            media_type TEXT NOT NULL,
            storage_path TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_user_id) REFERENCES app_users(id)
        )
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_private_media_owner
        ON private_media(owner_user_id)
    """)
    
    # 🔥 自动迁移：检查旧表是否缺少 mood_score 或 audio_path 字段
    try:
        cursor.execute("PRAGMA table_info(chat_history)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'mood_score' not in columns:
            print("⚠️ 正在迁移数据库: 添加 mood_score 字段...")
            cursor.execute("ALTER TABLE chat_history ADD COLUMN mood_score INTEGER DEFAULT 0")
            
        if 'audio_path' not in columns:
            print("⚠️ 正在迁移数据库: 添加 audio_path 字段...")
            cursor.execute("ALTER TABLE chat_history ADD COLUMN audio_path TEXT")
            
    except Exception as e:
        print(f"❌ 数据库迁移警告: {e}")
        
    conn.commit()
    conn.close()

# 初始化基础表
init_db()

# ==========================================
# 👤 用户认证模块
# ==========================================
def register_user(username, password):
    try:
        if not username or not password: return False, "用户名或密码不能为空"
        pwd_hash = hashlib.sha256(password.encode()).hexdigest()
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, pwd_hash))
        conn.commit()
        conn.close()
        return True, "注册成功"
    except sqlite3.IntegrityError:
        return False, "用户名已存在"
    except Exception as e:
        return False, str(e)


def get_legacy_user_by_username(username):
    """读取旧版 users 表中的账号，用于一次性迁移到 app_users。"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            "SELECT username, password_hash, created_at FROM users WHERE username = ? COLLATE NOCASE",
            (username,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def login_user(username, password):
    if not username or not password: return False, "请输入账号密码"
    pwd_hash = hashlib.sha256(password.encode()).hexdigest()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT username FROM users WHERE username=? AND password_hash=?", (username, pwd_hash))
    user = cursor.fetchone()
    conn.close()
    if user: return True, user[0]
    else: return False, "用户名或密码错误"

# ==========================================
# 💬 消息记录模块
# ==========================================
def create_app_user(user_id, username, password_hash):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO app_users (id, username, password_hash) VALUES (?, ?, ?)",
            (user_id, username, password_hash),
        )
        conn.commit()
        return get_app_user_by_id(user_id)
    except sqlite3.IntegrityError:
        return None
    finally:
        if 'conn' in locals():
            conn.close()


def get_app_user_by_id(user_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            "SELECT id, username, password_hash, is_active, created_at FROM app_users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_app_user_by_username(username):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            "SELECT id, username, password_hash, is_active, created_at FROM app_users WHERE username = ?",
            (username,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_password_hash(user_id):
    user = get_app_user_by_id(user_id)
    return user["password_hash"] if user else None


def create_refresh_session(session_id, user_id, token_hash, expires_at):
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            "INSERT INTO auth_refresh_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
            (session_id, user_id, token_hash, expires_at),
        )
        conn.commit()
    finally:
        conn.close()


def consume_refresh_session(token_hash, revoked_at):
    """原子地撤销一个仍有效的刷新令牌，并返回其所属用户。"""
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute(
            """
            SELECT id, user_id FROM auth_refresh_sessions
            WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?
            """,
            (token_hash, revoked_at),
        ).fetchone()
        if not row:
            conn.rollback()
            return None
        conn.execute(
            "UPDATE auth_refresh_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL",
            (revoked_at, row[0]),
        )
        conn.commit()
        return row[1]
    finally:
        conn.close()


def create_private_media(media_id, owner_user_id, media_type, storage_path):
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """INSERT INTO private_media (id, owner_user_id, media_type, storage_path)
               VALUES (?, ?, ?, ?)""",
            (media_id, owner_user_id, media_type, storage_path),
        )
        conn.commit()
        return get_private_media(media_id)
    finally:
        conn.close()


def get_private_media(media_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            """SELECT id, owner_user_id, media_type, storage_path, created_at
               FROM private_media WHERE id = ?""",
            (media_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def add_message(user_id, role, content, mood_score=0, audio_path=None):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO chat_history (user_id, role, content, mood_score, audio_path) VALUES (?, ?, ?, ?, ?)",
            (user_id, role, content, mood_score, audio_path)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"❌ DB Write Error: {e}")

def get_recent_history(user_id, limit=50):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        # 获取最近 limit 条记录 (倒序)
        cursor.execute(
            "SELECT role, content, audio_path, timestamp, mood_score FROM chat_history WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit)
        )
        rows = cursor.fetchall()
        conn.close()
        
        formatted_data = []
        for r in rows:
            # r[0]=role, r[1]=content, r[2]=audio_path, r[3]=timestamp, r[4]=mood_score
            item = {
                "role": r[0], 
                "text": r[1],
                "content": r[1], # 兼容旧版前端
                "audio_path": (
                    r[2] if r[2] and str(r[2]).startswith("/api/media/")
                    else f"/voice/{os.path.basename(r[2])}" if r[2] else None
                ),
                "timestamp": r[3],
                "mood_score": r[4] or 0
            }
            formatted_data.append(item)
            
        return formatted_data[::-1] # 反转回正序 (从旧到新)
    except Exception as e: 
        print(f"❌ Get History Error: {e}")
        return []

def get_mood_trend(user_id, limit=50):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT mood_score, timestamp FROM chat_history WHERE user_id = ? AND role = 'ai' ORDER BY id ASC LIMIT ?",
            (user_id, limit)
        )
        rows = cursor.fetchall()
        conn.close()
        return rows
    except: return []

def get_last_interaction(user_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT timestamp, content, mood_score FROM chat_history WHERE user_id = ? AND role='user' ORDER BY id DESC LIMIT 1",
            (user_id,)
        )
        row = cursor.fetchone()
        conn.close()
        if row: return row[0], row[1], row[2]
        return None, None, 0
    except: return None, None, 0

# 🔥 [风控] 获取最近N条心情分数
def get_recent_mood_scores(user_id, limit=5):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT mood_score FROM chat_history WHERE user_id = ? AND role = 'ai' ORDER BY id DESC LIMIT ?",
            (user_id, limit)
        )
        rows = cursor.fetchall()
        conn.close()
        return [r[0] for r in rows]
    except: return []

# 🔥 [记忆] 获取最近 N 条文本对话 (用于 Query Rewrite)
def get_recent_context_text(user_id, limit=4):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT role, content FROM chat_history WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit)
        )
        rows = cursor.fetchall()
        conn.close()
        history = [{"role": row["role"], "content": row["content"]} for row in rows]
        return history[::-1]
    except Exception as e:
        print(f"DB Context Error: {e}")
        return []


# ==========================================
# 🧠 用户画像模块
# ==========================================
def init_profile_table():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_profile (
                user_id TEXT PRIMARY KEY,
                profile_data TEXT,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Profile Init Error: {e}")

init_profile_table()

def get_user_profile(user_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT profile_data FROM user_profile WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else ""
    except: return ""

def update_user_profile(user_id, new_data):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("REPLACE INTO user_profile (user_id, profile_data) VALUES (?, ?)", (user_id, new_data))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Update Profile Error: {e}")


# ==========================================
# 📔 日记本模块
# ==========================================
def init_diary_table():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS una_diary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                date TEXT,
                type TEXT,
                content TEXT,
                mood TEXT,
                memory_ref TEXT,
                image_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # 🔥 自动迁移：旧表缺少 user_id 字段时补充
        try:
            cursor.execute("PRAGMA table_info(una_diary)")
            cols = [c[1] for c in cursor.fetchall()]
            if 'user_id' not in cols:
                print("⚠️ 迁移 una_diary 表：添加 user_id 字段...")
                cursor.execute("ALTER TABLE una_diary ADD COLUMN user_id TEXT DEFAULT 'default'")
        except Exception as e:
            print(f"Diary Migration Warning: {e}")
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Diary Init Error: {e}")

init_diary_table()

def save_diary(user_id, date, diary_type, content, mood, memory_ref="", image_path=""):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        # 检查当天该用户是否已经写过 (防止重复)
        cursor.execute("SELECT id FROM una_diary WHERE user_id = ? AND date = ?", (user_id, date))
        if cursor.fetchone():
            return False

        cursor.execute(
            "INSERT INTO una_diary (user_id, date, type, content, mood, memory_ref, image_path) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, date, diary_type, content, mood, memory_ref, image_path)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Save Diary Error: {e}")
        return False

def get_diaries(user_id, limit=20):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        # 按用户过滤，只返回该用户的日记
        cursor.execute("SELECT * FROM una_diary WHERE user_id = ? ORDER BY id DESC LIMIT ?", (user_id, limit))
        rows = cursor.fetchall()
        conn.close()

        results = []
        for row in rows:
            d = dict(row)
            # 修正图片路径，确保前端能访问
            if d.get('image_path'):
                d['img'] = f"/static/mobile/diary_images/{os.path.basename(d['image_path'])}"
            else:
                d['img'] = None
            results.append(d)

        return results
    except Exception as e:
        print(f"Get Diaries Error: {e}")
        return []


def get_today_messages(user_id):
    """获取用户今天的所有对话记录，供 AI 写日记使用"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        today = datetime.date.today().strftime("%Y-%m-%d")
        cursor.execute(
            "SELECT role, content FROM chat_history "
            "WHERE user_id = ? AND date(timestamp) = ? ORDER BY id ASC",
            (user_id, today)
        )
        rows = cursor.fetchall()
        conn.close()
        return [{"role": r[0], "content": r[1]} for r in rows]
    except Exception as e:
        print(f"Get Today Messages Error: {e}")
        return []


def get_all_user_ids():
    """获取所有活跃用户 ID（定时任务用）"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT user_id FROM chat_history")
        rows = cursor.fetchall()
        conn.close()
        return [r[0] for r in rows]
    except Exception as e:
        print(f"Get All Users Error: {e}")
        return []

def get_random_user_msg(user_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        # 随机捞取一条 >5 字的消息
        cursor.execute(
            "SELECT content FROM chat_history WHERE role='user' AND user_id=? AND length(content) > 5 ORDER BY RANDOM() LIMIT 1", 
            (user_id,)
        )
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else None
    except: return None
