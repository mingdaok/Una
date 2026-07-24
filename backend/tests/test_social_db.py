import os
import sqlite3
import pytest

# 设置环境变量，使用测试数据库路径，防止污染生产数据
os.environ["TESTING"] = "true"

import social_db

@pytest.fixture(autouse=True)
def setup_teardown():
    """每个测试前后清空数据库表"""
    conn = sqlite3.connect(social_db.DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM una_posts")
    cursor.execute("DELETE FROM una_comments")
    cursor.execute("DELETE FROM una_post_likes")
    conn.commit()
    conn.close()
    yield

def test_multi_tenant_isolation_in_feed():
    """测试不同 owner_user_id 的动态隔离效果"""
    
    # 1. 插入用户 A 的帖子
    post_a1 = social_db.create_post(
        owner_user_id="user_A",
        author_id="user_A",
        content="This is user A's first post"
    )
    
    post_a2 = social_db.create_post(
        owner_user_id="user_A",
        author_id="ai_una",
        content="UNA replying to user A"
    )
    
    # 2. 插入用户 B 的帖子
    post_b1 = social_db.create_post(
        owner_user_id="user_B",
        author_id="user_B",
        content="This is user B's secret post"
    )
    
    # 3. 验证 User A 的 feed
    feed_a = social_db.get_feed(owner_user_id="user_A")
    assert feed_a["total"] == 2
    contents_a = [item["content"] for item in feed_a["items"]]
    assert "This is user A's first post" in contents_a
    assert "UNA replying to user A" in contents_a
    assert "This is user B's secret post" not in contents_a

    # 4. 验证 User B 的 feed
    feed_b = social_db.get_feed(owner_user_id="user_B")
    assert feed_b["total"] == 1
    assert feed_b["items"][0]["content"] == "This is user B's secret post"
