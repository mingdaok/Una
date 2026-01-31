import sqlite3
from datetime import datetime

DB_PATH = "una_memory.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT, user_text TEXT, una_reply TEXT, mood_score INTEGER, timestamp DATETIME
        )
    ''')
    conn.commit()
    conn.close()

def save_chat(user_id, user_text, reply, score):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO chat_history (user_id, user_text, una_reply, mood_score, timestamp) VALUES (?, ?, ?, ?, ?)",
                   (user_id, user_text, reply, score, datetime.now()))
    conn.commit()
    conn.close()

def get_recent_history(user_id, limit=5):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT user_text, una_reply FROM chat_history WHERE user_id=? ORDER BY id DESC LIMIT ?", (user_id, limit))
    rows = cursor.fetchall()
    conn.close()
    return rows