import sqlite3
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(CURRENT_DIR, "una_memory.db")

print(f"Recreating tables in {DB_PATH}...")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Drop the tables
cursor.execute("DROP TABLE IF EXISTS una_post_likes")
cursor.execute("DROP TABLE IF EXISTS una_comments")
cursor.execute("DROP TABLE IF EXISTS una_posts")

conn.commit()
conn.close()

# Re-initialize to apply new schema
import social_db
social_db.init_social_tables()

print("Social tables dropped and recreated with multi-tenant support.")
