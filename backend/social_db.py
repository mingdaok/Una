"""
social_db.py — UNA 朋友圈数据库操作层
使用原生 sqlite3，与现有 database.py 保持一致的风格。
三张核心表：una_posts (动态) / una_comments (评论) / una_post_likes (点赞)
"""
from __future__ import annotations

import os
import json
import sqlite3
import datetime
from settings import settings

# 复用与 database.py 相同的 DB 路径配置
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = settings.database_path or os.path.join(CURRENT_DIR, "una_memory.db")


# ====================================================
# 🔧 初始化建表
# ====================================================
def init_social_tables():
    """初始化朋友圈相关的三张数据表（幂等操作，可重复调用）"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 动态表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS una_posts (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_user_id   TEXT    NOT NULL,
            author_id       TEXT    NOT NULL,
            author_name     TEXT    DEFAULT '',
            author_type     TEXT    DEFAULT 'user',
            author_avatar   TEXT    DEFAULT '',
            content         TEXT    NOT NULL,
            images          TEXT    DEFAULT '[]',
            location        TEXT    DEFAULT '',
            emoji_pack_ids  TEXT    DEFAULT '[]',
            post_type       TEXT    DEFAULT 'text',
            visibility      TEXT    DEFAULT 'public',
            source_event_ids TEXT   NOT NULL DEFAULT '[]',
            life_world_time TEXT,
            generation_reason TEXT,
            idempotency_key TEXT,
            content_evidence_json TEXT NOT NULL DEFAULT '{}',
            deleted_at      TEXT,
            timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 评论表（reply_to_id 为 NULL 表示直接评论动态，非 NULL 表示楼中楼回复）
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS una_comments (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id     INTEGER NOT NULL,
            user_id     TEXT    NOT NULL,
            user_name   TEXT    DEFAULT '',
            content     TEXT    NOT NULL,
            reply_to_id INTEGER DEFAULT NULL,
            generation_reason TEXT,
            source_event_id TEXT,
            idempotency_key TEXT,
            timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES una_posts(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("PRAGMA table_info(una_comments)")
    comment_columns = {row[1] for row in cursor.fetchall()}
    comment_additions = {
        "generation_reason": "TEXT",
        "source_event_id": "TEXT",
        "idempotency_key": "TEXT",
        "content_evidence_json": "TEXT NOT NULL DEFAULT '{}'",
    }
    for name, definition in comment_additions.items():
        if name not in comment_columns:
            cursor.execute(f"ALTER TABLE una_comments ADD COLUMN {name} {definition}")
    cursor.execute(
        """CREATE UNIQUE INDEX IF NOT EXISTS idx_una_comments_life_idempotency
           ON una_comments(idempotency_key) WHERE idempotency_key IS NOT NULL"""
    )

    cursor.execute("PRAGMA table_info(una_posts)")
    post_columns = {row[1] for row in cursor.fetchall()}
    post_additions = {
        "source_event_ids": "TEXT NOT NULL DEFAULT '[]'",
        "life_world_time": "TEXT",
        "generation_reason": "TEXT",
        "idempotency_key": "TEXT",
        "deleted_at": "TEXT",
    }
    for name, definition in post_additions.items():
        if name not in post_columns:
            cursor.execute(f"ALTER TABLE una_posts ADD COLUMN {name} {definition}")
    cursor.execute(
        """CREATE UNIQUE INDEX IF NOT EXISTS idx_una_posts_life_idempotency
           ON una_posts(idempotency_key) WHERE idempotency_key IS NOT NULL"""
    )

    # 点赞表（联合唯一约束防止重复点赞）
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS una_post_likes (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id   INTEGER NOT NULL,
            user_id   TEXT    NOT NULL,
            user_name TEXT    DEFAULT '',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES una_posts(id) ON DELETE CASCADE,
            UNIQUE (post_id, user_id)
        )
    """)

    # 表情包表（支持 AI 和用户两种类型）
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emoji_packs (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_type      TEXT    NOT NULL,
            owner_id        TEXT    NOT NULL,
            name            TEXT    NOT NULL,
            description     TEXT    DEFAULT '',
            is_enabled      BOOLEAN DEFAULT 1,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 表情包项目表（单个表情的映射）
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emoji_pack_items (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            pack_id         INTEGER NOT NULL,
            emoji_text      TEXT    NOT NULL,
            tags            TEXT    DEFAULT '[]',
            keywords        TEXT    DEFAULT '[]',
            image_path      TEXT    DEFAULT '',
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pack_id) REFERENCES emoji_packs(id) ON DELETE CASCADE
        )
    """)

    # 好友表（用户与 AI / 用户之间的好友关系）
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS friends (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     TEXT    NOT NULL,
            friend_id   TEXT    NOT NULL,
            status      TEXT    DEFAULT 'pending',
            note        TEXT    DEFAULT '',
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, friend_id)
        )
    """)

    # 用户档案表（存储头像、封面等）
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_profiles (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         TEXT    NOT NULL UNIQUE,
            avatar_url      TEXT    DEFAULT '',
            cover_url       TEXT    DEFAULT '',
            nickname        TEXT    DEFAULT '',
            bio             TEXT    DEFAULT '',
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()
    print("✅ [Social] 朋友圈数据表初始化完成")


# 启动时自动初始化
init_social_tables()


# ====================================================
# 📝 动态操作
# ====================================================
def create_post(owner_user_id: str, author_id: str, content: str, images: list = None,
                location: str = "", author_name: str = "", author_type: str = "user",
                author_avatar: str = "", emoji_pack_ids: list = None, 
                post_type: str = "text", visibility: str = "public",
                source_event_ids: list = None, life_world_time: str = None,
                generation_reason: str = None, idempotency_key: str = None,
                content_evidence: dict = None,
                timestamp: str = None) -> dict | None:
    """
    发布一条新动态。
    :param owner_user_id:   所属的用户（租户隔离）
    :param author_id:       发布者 ID（用户账号或 AI 名字）
    :param content:         正文文本
    :param images:          图片 URL 列表（可为空）
    :param location:        位置标签（可为空）
    :param author_name:     展示昵称
    :param author_type:     发布者类型，'user' 或 'ai'
    :param author_avatar:   发布者头像 URL
    :param emoji_pack_ids:  使用的表情包 ID 列表
    :param post_type:       动态类型，'text'、'image'、'mixed' 等
    :param visibility:      可见性，'public'、'friends_only'、'private' 等
    :return: 新插入的动态字典，失败返回 None
    """
    images_json = json.dumps(images or [], ensure_ascii=False)
    emoji_ids_json = json.dumps(emoji_pack_ids or [], ensure_ascii=False)
    source_event_ids_json = json.dumps(source_event_ids or [], ensure_ascii=False)
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO una_posts
               (owner_user_id, author_id, author_name, author_type, author_avatar, content, images,
                location, emoji_pack_ids, post_type, visibility, source_event_ids,
                life_world_time, generation_reason, idempotency_key,
                content_evidence_json, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))""",
            (owner_user_id, author_id, author_name, author_type, author_avatar, content, images_json, 
             location, emoji_ids_json, post_type, visibility, source_event_ids_json,
             life_world_time, generation_reason, idempotency_key,
             json.dumps(content_evidence or {}, ensure_ascii=False), timestamp)
        )
        post_id = cursor.lastrowid
        conn.commit()
        return get_post_by_id(post_id)
    except Exception as e:
        print(f"❌ [Social] create_post 失败: {e}")
        return None
    finally:
        if conn is not None:
            conn.close()


def has_ai_life_post_on_date(owner_user_id: str, life_date: str, ai_id: str = "ai_una") -> bool:
    """判断某 AI 在生活世界日期内是否已经发布过事件动态。"""
    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            """
            SELECT 1 FROM una_posts
            WHERE owner_user_id = ? AND author_id = ?
              AND generation_reason = 'life_event'
              AND substr(life_world_time, 1, 10) = ?
              AND deleted_at IS NULL
            LIMIT 1
            """,
            (owner_user_id, ai_id, life_date),
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def get_post_by_idempotency_key(owner_user_id: str, idempotency_key: str) -> dict | None:
    """按租户和稳定键查找后台生成的动态。"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            """
            SELECT * FROM una_posts
            WHERE owner_user_id = ? AND idempotency_key = ? AND deleted_at IS NULL
            LIMIT 1
            """,
            (owner_user_id, idempotency_key),
        ).fetchone()
    finally:
        conn.close()
    return _build_post_dict(dict(row)) if row else None


def get_post_by_id(post_id: int) -> dict | None:
    """根据 ID 查询单条动态（含点赞和评论树）"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM una_posts WHERE id = ?", (post_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return _build_post_dict(dict(row))


def get_feed(owner_user_id: str, page: int = 1, page_size: int = 20) -> dict:
    """
    分页获取朋友圈列表（倒序），并附带每条动态的点赞列表和树状评论。
    :param owner_user_id: 所属的用户（租户隔离）
    :param page:      页码（从 1 开始）
    :param page_size: 每页条数
    :return:          {"total": int, "page": int, "items": [post_dict, ...]}
    """
    offset = (page - 1) * page_size
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 总数
    cursor.execute("SELECT COUNT(*) FROM una_posts WHERE owner_user_id = ?", (owner_user_id,))
    total = cursor.fetchone()[0]

    # 分页查询动态列表（倒序）
    cursor.execute(
        "SELECT * FROM una_posts WHERE owner_user_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?",
        (owner_user_id, page_size, offset)
    )
    rows = cursor.fetchall()
    conn.close()

    items = [_build_post_dict(dict(r)) for r in rows]
    return {"total": total, "page": page, "page_size": page_size, "items": items}


def _get_user_avatar(user_id: str) -> str:
    """内部工具：根据 user_id 从 user_profiles 表获取最新头像 URL"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT avatar_url FROM user_profiles WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        return row["avatar_url"] if row and row["avatar_url"] else ""
    except Exception:
        return ""


def _build_post_dict(post: dict) -> dict:
    """内部工具：将动态行数据关联点赞和评论后返回完整字典"""
    post_id = post["id"]
    # 反序列化图片 JSON
    try:
        post["images"] = json.loads(post.get("images") or "[]")
    except Exception:
        post["images"] = []

    # 反序列化表情包列表
    try:
        post["emoji_pack_ids"] = json.loads(post.get("emoji_pack_ids") or "[]")
    except Exception:
        post["emoji_pack_ids"] = []

    try:
        post["source_event_ids"] = json.loads(post.get("source_event_ids") or "[]")
    except Exception:
        post["source_event_ids"] = []
    try:
        post["content_evidence"] = json.loads(
            post.get("content_evidence_json") or "{}"
        )
    except Exception:
        post["content_evidence"] = {}

    # 🔥 实时关联最新头像：覆盖发布时保存的旧头像
    latest_avatar = _get_user_avatar(post.get("author_id", ""))
    if latest_avatar:
        post["author_avatar"] = latest_avatar

    post["likes"] = get_likes_by_post(post_id)
    post["comments"] = get_comment_tree(post_id)

    # 🔥 为每条评论附加最新头像
    def _attach_avatar_to_comments(comment_list):
        for c in comment_list:
            c["user_avatar"] = _get_user_avatar(c.get("user_id", ""))
            if c.get("replies"):
                _attach_avatar_to_comments(c["replies"])

    _attach_avatar_to_comments(post["comments"])
    return post


# ====================================================
# ❤️ 点赞操作
# ====================================================
def toggle_like(post_id: int, user_id: str, user_name: str = "") -> dict:
    """
    点赞或取消点赞（切换逻辑）。
    :return: {"action": "liked" | "unliked", "like_count": int}
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # 查询是否已点赞
        cursor.execute(
            "SELECT id FROM una_post_likes WHERE post_id = ? AND user_id = ?",
            (post_id, user_id)
        )
        existing = cursor.fetchone()

        if existing:
            # 已点赞 → 取消
            cursor.execute(
                "DELETE FROM una_post_likes WHERE post_id = ? AND user_id = ?",
                (post_id, user_id)
            )
            action = "unliked"
        else:
            # 未点赞 → 点赞
            cursor.execute(
                "INSERT INTO una_post_likes (post_id, user_id, user_name) VALUES (?, ?, ?)",
                (post_id, user_id, user_name)
            )
            action = "liked"

        conn.commit()
        # 返回最新点赞数
        cursor.execute("SELECT COUNT(*) FROM una_post_likes WHERE post_id = ?", (post_id,))
        count = cursor.fetchone()[0]
        conn.close()
        return {"action": action, "like_count": count}
    except Exception as e:
        conn.close()
        print(f"❌ [Social] toggle_like 失败: {e}")
        return {"action": "error", "like_count": 0}


def ensure_like(post_id: int, user_id: str, user_name: str = "", timestamp: str = None) -> bool:
    """幂等写入后台互动点赞；已存在时返回 False。"""
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.execute(
            """
            INSERT OR IGNORE INTO una_post_likes (post_id, user_id, user_name, timestamp)
            VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
            """,
            (post_id, user_id, user_name, timestamp),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def get_likes_by_post(post_id: int) -> list:
    """获取某条动态的点赞列表（用户 ID + 昵称）"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT user_id, user_name, timestamp FROM una_post_likes WHERE post_id = ? ORDER BY timestamp ASC",
        (post_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ====================================================
# 💬 评论操作
# ====================================================
def add_comment(post_id: int, user_id: str, content: str,
                reply_to_id: int = None, user_name: str = "",
                generation_reason: str = None, source_event_id: str = None,
                idempotency_key: str = None, timestamp: str = None) -> dict | None:
    """
    发表评论或楼中楼回复。
    :param reply_to_id: 被回复的评论 ID，为 None 则直接评论动态
    :return: 新评论的字典
    """
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO una_comments (
                   post_id, user_id, user_name, content, reply_to_id,
                   generation_reason, source_event_id, idempotency_key, timestamp
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))""",
            (
                post_id,
                user_id,
                user_name,
                content,
                reply_to_id,
                generation_reason,
                source_event_id,
                idempotency_key,
                timestamp,
            )
        )
        comment_id = cursor.lastrowid
        conn.commit()
        return get_comment_by_id(comment_id)
    except sqlite3.IntegrityError as e:
        if conn is not None:
            conn.close()
            conn = None
        if idempotency_key:
            existing = get_comment_by_idempotency_key(post_id, idempotency_key)
            if existing:
                return existing
        print(f"❌ [Social] add_comment 失败: {e}")
        return None
    except Exception as e:
        print(f"❌ [Social] add_comment 失败: {e}")
        return None
    finally:
        if conn is not None:
            conn.close()


def get_comment_by_id(comment_id: int) -> dict | None:
    """查询单条评论"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM una_comments WHERE id = ?", (comment_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_comment_by_idempotency_key(post_id: int, idempotency_key: str) -> dict | None:
    """读取某条动态下由后台生成的稳定评论。"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            """
            SELECT * FROM una_comments
            WHERE post_id = ? AND idempotency_key = ?
            LIMIT 1
            """,
            (post_id, idempotency_key),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_comment_tree(post_id: int) -> list:
    """
    获取某条动态下的树状评论结构。
    顶层评论 (reply_to_id IS NULL) 每个带一个 replies 子列表。
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM una_comments WHERE post_id = ? ORDER BY timestamp ASC",
        (post_id,)
    )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    # 先建立 id → comment 映射
    id_map = {r["id"]: r for r in rows}
    # 给每条评论加 replies 字段
    for r in rows:
        r["replies"] = []

    # 树状组装：按 reply_to_id 挂载
    root_comments = []
    for r in rows:
        if r["reply_to_id"] is None:
            root_comments.append(r)
        else:
            parent = id_map.get(r["reply_to_id"])
            if parent:
                parent["replies"].append(r)
            else:
                # 父评论不存在（已删除），仍作为顶层展示
                root_comments.append(r)

    return root_comments


def delete_comment(comment_id: int, user_id: str) -> bool:
    """删除自己的评论（校验 user_id 归属）"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM una_comments WHERE id = ? AND user_id = ?",
            (comment_id, user_id)
        )
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        return affected > 0
    except Exception as e:
        print(f"❌ [Social] delete_comment 失败: {e}")
        return False


def delete_post(post_id: int, author_id: str) -> bool:
    """删除自己的动态（同时级联删除评论和点赞，SQLite 外键需开启）"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.execute(
            "DELETE FROM una_posts WHERE id = ? AND author_id = ?",
            (post_id, author_id)
        )
        affected = cursor.rowcount
        # 手动清理（防止 SQLite 外键未启用时漏删）
        if affected:
            cursor.execute("DELETE FROM una_comments WHERE post_id = ?", (post_id,))
            cursor.execute("DELETE FROM una_post_likes WHERE post_id = ?", (post_id,))
        conn.commit()
        conn.close()
        return affected > 0
    except Exception as e:
        print(f"❌ [Social] delete_post 失败: {e}")
        return False

# ====================================================
# 😄 表情包管理操作
# ====================================================
def create_emoji_pack(owner_type: str, owner_id: str, name: str, description: str = "") -> dict | None:
    """
    创建新的表情包（owner_type: 'ai' 或 'user'）。
    :return: 新表情包的字典
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO emoji_packs (owner_type, owner_id, name, description)
               VALUES (?, ?, ?, ?)""",
            (owner_type, owner_id, name, description)
        )
        pack_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return get_emoji_pack_by_id(pack_id)
    except Exception as e:
        print(f"❌ [Social] create_emoji_pack 失败: {e}")
        return None


def get_emoji_pack_by_id(pack_id: int) -> dict | None:
    """根据 ID 查询表情包及其项目"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM emoji_packs WHERE id = ?", (pack_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None
        
        pack = dict(row)
        # 获取该包下的所有表情项目
        cursor.execute(
            """SELECT id, emoji_text, tags, keywords, image_path 
               FROM emoji_pack_items WHERE pack_id = ? ORDER BY id ASC""",
            (pack_id,)
        )
        items = []
        for item_row in cursor.fetchall():
            item = dict(item_row)
            try:
                item["tags"] = json.loads(item.get("tags") or "[]")
                item["keywords"] = json.loads(item.get("keywords") or "[]")
            except:
                item["tags"] = []
                item["keywords"] = []
            items.append(item)
        
        pack["items"] = items
        conn.close()
        return pack
    except Exception as e:
        print(f"❌ [Social] get_emoji_pack_by_id 失败: {e}")
        return None


def get_emoji_packs_by_owner(owner_type: str, owner_id: str) -> list:
    """获取某个所有者的所有表情包"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, owner_type, owner_id, name, description, is_enabled, created_at 
               FROM emoji_packs WHERE owner_type = ? AND owner_id = ? ORDER BY created_at DESC""",
            (owner_type, owner_id)
        )
        packs = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return packs
    except Exception as e:
        print(f"❌ [Social] get_emoji_packs_by_owner 失败: {e}")
        return []


def add_emoji_to_pack(pack_id: int, emoji_text: str, tags: list = None, 
                      keywords: list = None, image_path: str = "") -> dict | None:
    """
    向表情包中添加单个表情"""
    tags_json = json.dumps(tags or [], ensure_ascii=False)
    keywords_json = json.dumps(keywords or [], ensure_ascii=False)
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO emoji_pack_items (pack_id, emoji_text, tags, keywords, image_path)
               VALUES (?, ?, ?, ?, ?)""",
            (pack_id, emoji_text, tags_json, keywords_json, image_path)
        )
        item_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return get_emoji_item_by_id(item_id)
    except Exception as e:
        print(f"❌ [Social] add_emoji_to_pack 失败: {e}")
        return None


def get_emoji_item_by_id(item_id: int) -> dict | None:
    """查询单个表情项目"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM emoji_pack_items WHERE id = ?", (item_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        item = dict(row)
        try:
            item["tags"] = json.loads(item.get("tags") or "[]")
            item["keywords"] = json.loads(item.get("keywords") or "[]")
        except:
            item["tags"] = []
            item["keywords"] = []
        return item
    except Exception as e:
        print(f"❌ [Social] get_emoji_item_by_id 失败: {e}")
        return None


def delete_emoji_pack(pack_id: int, owner_id: str) -> bool:
    """删除表情包（校验 owner_id 归属）"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.execute(
            "DELETE FROM emoji_packs WHERE id = ? AND owner_id = ?",
            (pack_id, owner_id)
        )
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        return affected > 0
    except Exception as e:
        print(f"❌ [Social] delete_emoji_pack 失败: {e}")
        return False


def update_emoji_pack(pack_id: int, owner_id: str, name: str = None, 
                      description: str = None, is_enabled: bool = None) -> dict | None:
    """更新表情包信息"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if description is not None:
            updates.append("description = ?")
            params.append(description)
        if is_enabled is not None:
            updates.append("is_enabled = ?")
            params.append(is_enabled)
        
        if not updates:
            conn.close()
            return get_emoji_pack_by_id(pack_id)
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.extend([pack_id, owner_id])
        
        cursor.execute(
            f"UPDATE emoji_packs SET {', '.join(updates)} WHERE id = ? AND owner_id = ?",
            params
        )
        conn.commit()
        conn.close()
        return get_emoji_pack_by_id(pack_id)
    except Exception as e:
        print(f"❌ [Social] update_emoji_pack 失败: {e}")
        return None


# ====================================================
# 👤 用户档案操作
# ====================================================
def get_or_create_user_profile(user_id: str) -> dict | None:
    """获取或创建用户档案"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        
        if row:
            conn.close()
            return dict(row)
        
        # 创建新档案
        cursor.execute(
            """INSERT INTO user_profiles (user_id) VALUES (?)""",
            (user_id,)
        )
        profile_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_profiles WHERE id = ?", (profile_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        print(f"❌ [Social] get_or_create_user_profile 失败: {e}")
        return None


def update_user_profile(user_id: str, avatar_url: str = None, cover_url: str = None,
                        nickname: str = None, bio: str = None) -> dict | None:
    """更新用户档案"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        updates = []
        params = []
        
        if avatar_url is not None:
            updates.append("avatar_url = ?")
            params.append(avatar_url)
        if cover_url is not None:
            updates.append("cover_url = ?")
            params.append(cover_url)
        if nickname is not None:
            updates.append("nickname = ?")
            params.append(nickname)
        if bio is not None:
            updates.append("bio = ?")
            params.append(bio)
        
        if not updates:
            conn.close()
            return get_or_create_user_profile(user_id)
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(user_id)
        
        cursor.execute(
            f"UPDATE user_profiles SET {', '.join(updates)} WHERE user_id = ?",
            params
        )
        conn.commit()
        conn.close()
        return get_or_create_user_profile(user_id)
    except Exception as e:
        print(f"❌ [Social] update_user_profile 失败: {e}")
        return None


# ====================================================
# 🤝 好友系统操作
# ====================================================

def create_friend_request(user_id: str, friend_id: str, note: str = "") -> dict | None:
    """创建好友申请，状态为 pending"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """INSERT OR IGNORE INTO friends (user_id, friend_id, status, note) VALUES (?, ?, 'pending', ?)""",
            (user_id, friend_id, note)
        )
        conn.commit()
        conn.close()
        return get_friend_relationship(user_id, friend_id)
    except Exception as e:
        print(f"❌ [Social] create_friend_request 失败: {e}")
        return None


def accept_friend_request(user_id: str, friend_id: str) -> bool:
    """接受好友申请，同时创建反向好友记录"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE friends SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND friend_id = ?",
            (user_id, friend_id)
        )
        cursor.execute(
            "INSERT OR IGNORE INTO friends (user_id, friend_id, status, created_at, updated_at) VALUES (?, ?, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            (friend_id, user_id)
        )
        conn.commit()
        uncle = cursor.rowcount
        conn.close()
        return True
    except Exception as e:
        print(f"❌ [Social] accept_friend_request 失败: {e}")
        return False


def get_friend_relationship(user_id: str, friend_id: str) -> dict | None:
    """查询两个用户之间的好友关系"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM friends WHERE user_id = ? AND friend_id = ?",
            (user_id, friend_id)
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        print(f"❌ [Social] get_friend_relationship 失败: {e}")
        return None


def get_friends(user_id: str, status: str = 'accepted') -> list:
    """获取某用户的好友列表"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM friends WHERE user_id = ? AND status = ? ORDER BY updated_at DESC",
            (user_id, status)
        )
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"❌ [Social] get_friends 失败: {e}")
        return []
