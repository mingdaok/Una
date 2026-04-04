"""
social_api.py — UNA 朋友圈 FastAPI 路由
使用 APIRouter 便于在 main_server.py 中通过 include_router 挂载。
"""
import os
import uuid
import json
import sqlite3
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import social_db

brain_instance = None  # 由 main_server.py 初始化后注入

# ====================================================
# 🤖 AI 自动化功能
# ====================================================
async def auto_reply_comment(post_id: int, comment_id: int):
    """后台自动回复评论"""
    try:
        origin = social_db.get_comment_by_id(comment_id)
        if not origin:
            return

        user_text = origin.get("content", "")
        # 简单情感关键词判断
        emotion = "neutral"
        if any(w in user_text for w in ["开心", "快乐", "兴奋", "棒", "好", "喜欢", "爱"]):
            emotion = "happy"
        elif any(w in user_text for w in ["难过", "伤心", "失落", "哭", "不好", "讨厌"]):
            emotion = "sad"
        elif any(w in user_text for w in ["累", "困", "疲惫", "休息"]):
            emotion = "calm"
        elif any(w in user_text for w in ["想", "思考", "觉得", "认为"]):
            emotion = "thoughtful"
        else:
            emotion = "neutral"

        # AI 回复模板（小妹妹风格）
        templates = {
            "happy": "哇，你这么开心，我也超级开心呢！😊✨",
            "sad": "别难过啦，小姐姐一直在这里陪着你哦~ 🤗💕",
            "calm": "累了吗？那就好好休息一下吧，我会一直在你身边的~ 😴💤",
            "thoughtful": "你的想法好特别哦！姐姐很喜欢听你说这些~ 💭🌟",
            "neutral": "嗯嗯，我都听到了！继续说吧，小姐姐很想知道更多~ 😊💬",
        }
        reply_text = templates.get(emotion, templates["neutral"])

        # 从 AI 表情包中匹配一个包用于增强
        packs = social_db.get_emoji_packs_by_owner("ai", "ai_una")
        selected_pack = None
        if packs:
            selected_pack = social_db.get_emoji_pack_by_id(packs[0].get("id"))

        # 如果有表情包选择，提取第一个 emoji
        add_text = ""
        if selected_pack and selected_pack.get("items"):
            item = selected_pack["items"][0]
            add_text = f" {item.get('emoji_text','')}"

        ai_comment = social_db.add_comment(
            post_id=post_id,
            user_id="ai_una",
            user_name="UNA",
            content=f"{reply_text}{add_text}",
            reply_to_id=comment_id,
        )

        if ai_comment:
            print(f"🤖 [AI Auto Reply] 成功回复评论 {comment_id}: {reply_text}")
        else:
            print(f"❌ [AI Auto Reply] 回复评论 {comment_id} 失败")

    except Exception as e:
        print(f"❌ [AI Auto Reply] 自动回复异常: {e}")


async def auto_accept_friend_request(user_id: str, friend_id: str):
    """后台自动接受好友请求（针对 ai_una）"""
    try:
        if friend_id == "ai_una":
            ok = social_db.accept_friend_request("ai_una", user_id)
            if ok:
                print(f"🤖 [AI Auto Accept] UNA 自动接受了 {user_id} 的好友请求")
            else:
                print(f"❌ [AI Auto Accept] UNA 接受 {user_id} 好友请求失败")
    except Exception as e:
        print(f"❌ [AI Auto Accept] 自动接受好友请求异常: {e}")


async def chat_with_una(message: str, user_id: str, context: str = "") -> str:
    """与 UNA 聊天，返回回复内容"""
    global brain_instance
    if brain_instance is None:
        print("⚠️ [Chat API] brain_instance 未注入，无法执行 chat_with_una")
        return "抱歉，我现在有点小问题，一会儿再来找我聊吧~ 😅"

    relevant_memories = ""

    emotion = "neutral"
    if any(w in message for w in ["开心", "快乐", "兴奋", "棒", "好", "喜欢", "爱"]):
        emotion = "happy"
    elif any(w in message for w in ["难过", "伤心", "失落", "哭", "不好", "讨厌"]):
        emotion = "sad"
    elif any(w in message for w in ["累", "困", "疲惫", "休息"]):
        emotion = "calm"
    elif any(w in message for w in ["想", "思考", "觉得", "认为"]):
        emotion = "thoughtful"

    try:
        response_text = ""
        async for chunk in brain_instance.chat_stream(
            user_id=user_id,
            user_text=message,
            long_term_memory=relevant_memories
        ):
            if isinstance(chunk, dict):
                if chunk.get('type') == 'sentence':
                    response_text += chunk.get('text', '')
            elif isinstance(chunk, str):
                response_text += chunk

        return response_text.strip() or "嗯嗯，我听到了！继续说吧~ 😊"
    except Exception as e:
        print(f"❌ [Chat API] 聊天异常: {e}")
        return "抱歉，我现在有点小问题，一会儿再来找我聊吧~ 😅"

# ====================================================
# 🔧 配置
# ====================================================
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# 图片存储目录：backend/static/social_images
SOCIAL_IMG_DIR = os.path.join(CURRENT_DIR, "static", "social_images")
os.makedirs(SOCIAL_IMG_DIR, exist_ok=True)

# 允许上传的图片扩展名
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"}
# 单张图片大小限制（10 MB）
MAX_IMG_SIZE = 10 * 1024 * 1024

router = APIRouter(prefix="/api/social", tags=["社交朋友圈"])


# ====================================================
# 📦 Pydantic 请求体
# ====================================================
class CreatePostBody(BaseModel):
    author_id: str
    author_name: str = ""
    author_type: str = "user"   # "user" 或 "ai"
    author_avatar: str = ""     # 发布者头像 URL
    content: str = ""
    image_urls: List[str] = []  # 由 /upload 接口返回的 URL 列表
    location: str = ""
    emoji_pack_ids: List[int] = []  # 使用的表情包 ID 列表
    post_type: str = "text"     # 'text', 'image', 'mixed'
    visibility: str = "public"  # 'public', 'friends_only', 'private'


class LikeBody(BaseModel):
    user_id: str
    user_name: str = ""


class CommentBody(BaseModel):
    user_id: str
    user_name: str = ""
    content: str
    reply_to_id: Optional[int] = None


class DeleteCommentBody(BaseModel):
    user_id: str


class DeletePostBody(BaseModel):
    author_id: str


# ====================================================
# 🖼️ 图片上传
# ====================================================
@router.post("/upload", summary="上传图片（支持多文件）")
async def upload_images(files: List[UploadFile] = File(...)):
    """
    接收 1~9 张图片，保存到 static/social_images 目录，
    返回可通过 /static/social_images/xxx 访问的 URL 列表。
    """
    if not files:
        raise HTTPException(status_code=400, detail="请至少上传一张图片")
    if len(files) > 9:
        raise HTTPException(status_code=400, detail="最多支持同时上传 9 张图片")

    urls = []
    for file in files:
        # 校验扩展名
        _, ext = os.path.splitext(file.filename or "")
        ext = ext.lower()
        if ext not in ALLOWED_EXTS:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的图片格式: {ext}，允许: {', '.join(ALLOWED_EXTS)}"
            )

        # 读取内容
        content = await file.read()
        if len(content) > MAX_IMG_SIZE:
            raise HTTPException(status_code=400, detail=f"图片过大，最大允许 {MAX_IMG_SIZE // 1024 // 1024} MB")
        if len(content) < 100:
            raise HTTPException(status_code=400, detail="图片文件内容为空或损坏")

        # 使用 UUID 生成唯一文件名，防止覆盖
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(SOCIAL_IMG_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(content)

        # 返回可访问的静态 URL
        url = f"/static/social_images/{filename}"
        urls.append(url)

    return {"status": "ok", "urls": urls, "count": len(urls)}


# ====================================================
# 📝 发布动态
# ====================================================
@router.post("/post", summary="发布新动态")
async def create_post(body: CreatePostBody):
    if not body.content.strip() and not body.image_urls:
        raise HTTPException(status_code=400, detail="动态内容和图片不能同时为空")

    post = social_db.create_post(
        author_id=body.author_id,
        content=body.content.strip(),
        images=body.image_urls,
        location=body.location,
        author_name=body.author_name,
        author_type=body.author_type,
        author_avatar=body.author_avatar,
        emoji_pack_ids=body.emoji_pack_ids,
        post_type=body.post_type,
        visibility=body.visibility,
    )
    if post is None:
        raise HTTPException(status_code=500, detail="动态发布失败，请稍后重试")

    return {"status": "ok", "post": post}


# ====================================================
# 🗑️ 删除动态
# ====================================================
@router.delete("/post/{post_id}", summary="删除自己的动态")
async def delete_post(post_id: int, body: DeletePostBody):
    success = social_db.delete_post(post_id, body.author_id)
    if not success:
        raise HTTPException(status_code=403, detail="动态不存在或无权删除")
    return {"status": "ok"}


# ====================================================
# 📋 获取朋友圈列表
# ====================================================
@router.get("/feed", summary="分页获取朋友圈动态列表")
async def get_feed(
    page: int = Query(default=1, ge=1, description="页码，从 1 开始"),
    page_size: int = Query(default=20, ge=1, le=50, description="每页条数（最大 50）"),
):
    """
    返回按时间倒序分页的动态列表，每条动态内嵌：
    - likes: 点赞用户列表
    - comments: 树状评论（顶层 comments 下含 replies 子列表）
    """
    result = social_db.get_feed(page=page, page_size=page_size)
    return result


# ====================================================
# ❤️ 点赞 / 取消点赞
# ====================================================
@router.post("/post/{post_id}/like", summary="点赞或取消点赞")
async def toggle_like(post_id: int, body: LikeBody):
    if not body.user_id:
        raise HTTPException(status_code=400, detail="user_id 不能为空")

    result = social_db.toggle_like(
        post_id=post_id,
        user_id=body.user_id,
        user_name=body.user_name,
    )
    if result["action"] == "error":
        raise HTTPException(status_code=500, detail="操作失败，请稍后重试")

    return {"status": "ok", **result}


# ====================================================
# 💬 发表评论 / 楼中楼回复
# ====================================================
@router.post("/post/{post_id}/comment", summary="发表评论或楼中楼回复")
async def add_comment(post_id: int, body: CommentBody, background_tasks: BackgroundTasks):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="评论内容不能为空")
    if not body.user_id:
        raise HTTPException(status_code=400, detail="user_id 不能为空")

    comment = social_db.add_comment(
        post_id=post_id,
        user_id=body.user_id,
        content=body.content.strip(),
        reply_to_id=body.reply_to_id,
        user_name=body.user_name,
    )
    if comment is None:
        raise HTTPException(status_code=500, detail="评论发布失败，请稍后重试")

    # 检查是否是评论 ai_una 的动态，如果是则自动回复
    post = social_db.get_post_by_id(post_id)
    if post and post.get("author_id") == "ai_una" and body.user_id != "ai_una":
        background_tasks.add_task(auto_reply_comment, post_id, comment["id"])

    return {"status": "ok", "comment": comment}


@router.post("/post/{post_id}/comment/{comment_id}/ai-reply", summary="AI 自动回复评论")
async def ai_reply_comment(post_id: int, comment_id: int):
    origin = social_db.get_comment_by_id(comment_id)
    if not origin:
        raise HTTPException(status_code=404, detail="原评论不存在")

    user_text = origin.get("content", "")
    # 简单情感关键词判断
    emotion = "neutral"
    if any(w in user_text for w in ["开心", "快乐", "兴奋", "棒"]):
        emotion = "happy"
    elif any(w in user_text for w in ["难过", "伤心", "失落", "哭"]):
        emotion = "sad"
    elif any(w in user_text for w in ["累", "困", "疲惫"]):
        emotion = "calm"
    else:
        emotion = "thoughtful"

    # AI 回复模板
    templates = {
        "happy": "你真棒！这种好心情我要你一直保持下去 🌟",
        "sad": "别着急，我一直在这儿陪着你，你不孤单 ☁️",
        "calm": "慢慢来，给自己一点空间和时间 🍵",
        "thoughtful": "你的想法很深刻，继续保持这种洞察力 💭",
        "neutral": "嗯，我听到了，继续聊下去吧 😊",
    }
    reply_text = templates.get(emotion, templates["neutral"])

    # 从 AI 表情包中匹配一个包用于增强
    packs = social_db.get_emoji_packs_by_owner("ai", "ai_una")
    selected_pack = None
    if packs:
        selected_pack = social_db.get_emoji_pack_by_id(packs[0].get("id"))

    # 如果有表情包选择，提取第一个 emoji
    add_text = ""
    if selected_pack and selected_pack.get("items"):
        item = selected_pack["items"][0]
        add_text = f" {item.get('emoji_text','')}"

    ai_comment = social_db.add_comment(
        post_id=post_id,
        user_id="ai_una",
        user_name="UNA",
        content=f"{reply_text}{add_text}",
        reply_to_id=comment_id,
    )

    if ai_comment is None:
        raise HTTPException(status_code=500, detail="AI 回复失败")

    return {"status": "ok", "comment": ai_comment}


# ====================================================
# 🗑️ 删除评论
# ====================================================
@router.delete("/comment/{comment_id}", summary="删除自己的评论")
async def delete_comment(comment_id: int, body: DeleteCommentBody):
    success = social_db.delete_comment(comment_id, body.user_id)
    if not success:
        raise HTTPException(status_code=403, detail="评论不存在或无权删除")
    return {"status": "ok"}

# ====================================================
# 😄 表情包管理 API
# ====================================================
@router.post("/emoji-packs", summary="创建新的表情包")
async def create_emoji_pack(
    owner_type: str = Query(..., description="'ai' 或 'user'"),
    owner_id: str = Query(..., description="所有者 ID"),
    name: str = Query(..., description="表情包名称"),
    description: str = Query(default="", description="表情包描述")
):
    """创建新的表情包"""
    if owner_type not in ["ai", "user"]:
        raise HTTPException(status_code=400, detail="owner_type 必须是 'ai' 或 'user'")
    
    pack = social_db.create_emoji_pack(
        owner_type=owner_type,
        owner_id=owner_id,
        name=name,
        description=description
    )
    if pack is None:
        raise HTTPException(status_code=500, detail="表情包创建失败")
    
    return {"status": "ok", "pack": pack}


@router.get("/emoji-packs", summary="获取用户的所有表情包")
async def get_emoji_packs(
    owner_type: str = Query(..., description="'ai' 或 'user'"),
    owner_id: str = Query(..., description="所有者 ID")
):
    """获取某个所有者的所有表情包（简略版，不含子项目）"""
    packs = social_db.get_emoji_packs_by_owner(owner_type, owner_id)
    return {"status": "ok", "packs": packs}


@router.get("/emoji-packs/{pack_id}", summary="获取表情包的详细信息")
async def get_emoji_pack(pack_id: int):
    """获取表情包及其包含的所有表情项目"""
    pack = social_db.get_emoji_pack_by_id(pack_id)
    if pack is None:
        raise HTTPException(status_code=404, detail="表情包不存在")
    return {"status": "ok", "pack": pack}


@router.put("/emoji-packs/{pack_id}", summary="更新表情包信息")
async def update_emoji_pack(
    pack_id: int,
    owner_id: str = Query(..., description="所有者 ID（用于权限校验）"),
    name: str = Query(default=None, description="新的表情包名称"),
    description: str = Query(default=None, description="新的表情包描述"),
    is_enabled: bool = Query(default=None, description="是否启用")
):
    """更新表情包的元数据"""
    pack = social_db.update_emoji_pack(
        pack_id=pack_id,
        owner_id=owner_id,
        name=name,
        description=description,
        is_enabled=is_enabled
    )
    if pack is None:
        raise HTTPException(status_code=403, detail="表情包不存在或无权修改")
    return {"status": "ok", "pack": pack}


@router.delete("/emoji-packs/{pack_id}", summary="删除表情包")
async def delete_emoji_pack(
    pack_id: int,
    owner_id: str = Query(..., description="所有者 ID（用于权限校验）")
):
    """删除某个表情包及其所有项目"""
    success = social_db.delete_emoji_pack(pack_id, owner_id)
    if not success:
        raise HTTPException(status_code=403, detail="表情包不存在或无权删除")
    return {"status": "ok"}


@router.post("/emoji-packs/{pack_id}/items", summary="向表情包添加表情")
async def add_emoji_to_pack(
    pack_id: int,
    files: List[UploadFile] = File(default=[]),
    emoji_texts: str = Query(..., description="emoji 文本列表（逗号分隔）"),
    tags_list: str = Query(default="", description="标签列表（逗号分隔）"),
    keywords_list: str = Query(default="", description="关键词列表（逗号分隔）")
):
    """
    向表情包批量添加表情项（支持上传对应的图片）。
    emoji_texts: 逗号分隔的 emoji 文本（如 "😀,😁,😂"）
    tags_list: 逗号分隔的标签（如 "快乐,开心,笑脸"）
    keywords_list: 逗号分隔的关键词（如 "happy,joy,smile"）
    """
    emoji_list = [e.strip() for e in emoji_texts.split(",") if e.strip()]
    if not emoji_list:
        raise HTTPException(status_code=400, detail="emoji_texts 不能为空")
    
    tags = [t.strip() for t in tags_list.split(",") if t.strip()]
    keywords = [k.strip() for k in keywords_list.split(",") if k.strip()]
    
    # 如果有文件上传，按顺序配对
    uploaded_paths = []
    if files:
        for file in files:
            _, ext = os.path.splitext(file.filename or "")
            ext = ext.lower()
            if ext not in ALLOWED_EXTS:
                raise HTTPException(
                    status_code=400,
                    detail=f"不支持的图片格式: {ext}"
                )
            
            content = await file.read()
            if len(content) > MAX_IMG_SIZE:
                raise HTTPException(status_code=400, detail="图片过大")
            if len(content) < 100:
                raise HTTPException(status_code=400, detail="图片文件内容为空或损坏")
            
            # 保存到 emoji_packs 子目录
            emoji_pack_dir = os.path.join(SOCIAL_IMG_DIR, "emoji_packs", str(pack_id))
            os.makedirs(emoji_pack_dir, exist_ok=True)
            filename = f"{uuid.uuid4().hex}{ext}"
            filepath = os.path.join(emoji_pack_dir, filename)
            with open(filepath, "wb") as f:
                f.write(content)
            
            url = f"/static/social_images/emoji_packs/{pack_id}/{filename}"
            uploaded_paths.append(url)
    
    # 创建表情项目
    items = []
    for i, emoji in enumerate(emoji_list):
        image_path = uploaded_paths[i] if i < len(uploaded_paths) else ""
        item = social_db.add_emoji_to_pack(
            pack_id=pack_id,
            emoji_text=emoji,
            tags=tags,
            keywords=keywords,
            image_path=image_path
        )
        if item:
            items.append(item)
    
    if not items:
        raise HTTPException(status_code=500, detail="表情添加失败")
    
    return {"status": "ok", "count": len(items), "items": items}


@router.get("/emoji-packs/{pack_id}/items", summary="获取表情包的所有表情项")
async def get_emoji_items(pack_id: int):
    """获取某个表情包下的所有表情项"""
    pack = social_db.get_emoji_pack_by_id(pack_id)
    if pack is None:
        raise HTTPException(status_code=404, detail="表情包不存在")
    return {"status": "ok", "items": pack.get("items", [])}


@router.delete("/emoji-packs/{pack_id}/items/{item_id}", summary="删除表情项")
async def delete_emoji_item(pack_id: int, item_id: int, owner_id: str = Query(...)):
    """删除表情包中的某个表情项（需校验权限）"""
    pack = social_db.get_emoji_pack_by_id(pack_id)
    if pack is None or pack.get("owner_id") != owner_id:
        raise HTTPException(status_code=403, detail="表情包不存在或无权修改")
    
    try:
        conn = sqlite3.connect(social_db.DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM emoji_pack_items WHERE id = ? AND pack_id = ?", (item_id, pack_id))
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        
        if not affected:
            raise HTTPException(status_code=404, detail="表情项不存在")
        return {"status": "ok"}
    except Exception as e:
        print(f"❌ 删除表情项失败: {e}")
        raise HTTPException(status_code=500, detail="删除失败")


# ====================================================
# 🤝 好友系统 API
# ====================================================
@router.post("/friends/request", summary="发起好友申请")
async def create_friend_request(user_id: str = Query(...), friend_id: str = Query(...), note: str = Query(default=""), background_tasks: BackgroundTasks = None):
    rel = social_db.create_friend_request(user_id, friend_id, note)
    if rel is None:
        raise HTTPException(status_code=500, detail="好友申请失败")

    # 如果是向 ai_una 发送好友请求，则自动接受
    if friend_id == "ai_una" and background_tasks:
        background_tasks.add_task(auto_accept_friend_request, user_id, friend_id)

    return {"status": "ok", "friend": rel}


@router.post("/friends/accept", summary="接受好友申请")
async def accept_friend_request(user_id: str = Query(...), friend_id: str = Query(...)):
    ok = social_db.accept_friend_request(user_id, friend_id)
    if not ok:
        raise HTTPException(status_code=500, detail="好友接受失败")
    return {"status": "ok"}


@router.get("/friends", summary="获取好友列表")
async def get_friends(user_id: str = Query(...), status: str = Query(default='accepted')):
    friends = social_db.get_friends(user_id, status)
    return {"status": "ok", "friends": friends}


@router.get("/friends/relationship", summary="获取好友关系")
async def get_friend_relationship(user_id: str = Query(...), friend_id: str = Query(...)):
    rel = social_db.get_friend_relationship(user_id, friend_id)
    return {"status": "ok", "relationship": rel}


# ====================================================
# 👤 用户档案 API
# ====================================================
@router.get("/user/{user_id}/profile", summary="获取用户档案")
async def get_user_profile(user_id: str):
    """获取用户的头像、封面等档案信息"""
    profile = social_db.get_or_create_user_profile(user_id)
    if profile is None:
        raise HTTPException(status_code=500, detail="档案获取失败")
    return {"status": "ok", "profile": profile}


@router.put("/user/{user_id}/profile", summary="更新用户档案")
async def update_user_profile(
    user_id: str,
    avatar_url: str = Query(default=None, description="头像 URL"),
    cover_url: str = Query(default=None, description="封面 URL"),
    nickname: str = Query(default=None, description="昵称"),
    bio: str = Query(default=None, description="个人简介")
):
    """更新用户的头像、封面、昵称、简介等"""
    profile = social_db.update_user_profile(
        user_id=user_id,
        avatar_url=avatar_url,
        cover_url=cover_url,
        nickname=nickname,
        bio=bio
    )
    if profile is None:
        raise HTTPException(status_code=500, detail="档案更新失败")
    return {"status": "ok", "profile": profile}


@router.post("/user/{user_id}/avatar", summary="上传用户头像")
async def upload_avatar(user_id: str, file: UploadFile = File(...)):
    """上传用户头像（单文件）"""
    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail=f"不支持的图片格式: {ext}")
    
    content = await file.read()
    if len(content) > MAX_IMG_SIZE:
        raise HTTPException(status_code=400, detail="图片过大")
    if len(content) < 100:
        raise HTTPException(status_code=400, detail="图片文件内容为空或损坏")
    
    # 保存到 avatars 子目录
    avatar_dir = os.path.join(SOCIAL_IMG_DIR, "avatars", user_id)
    os.makedirs(avatar_dir, exist_ok=True)
    filename = f"avatar{ext}"
    filepath = os.path.join(avatar_dir, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    
    avatar_url = f"/static/social_images/avatars/{user_id}/{filename}"
    
    # 更新档案
    profile = social_db.update_user_profile(user_id=user_id, avatar_url=avatar_url)
    return {"status": "ok", "avatar_url": avatar_url, "profile": profile}


@router.post("/user/{user_id}/cover", summary="上传用户封面")
async def upload_cover(user_id: str, file: UploadFile = File(...)):
    """上传用户朋友圈封面（单文件）"""
    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail=f"不支持的图片格式: {ext}")
    
    content = await file.read()
    if len(content) > MAX_IMG_SIZE:
        raise HTTPException(status_code=400, detail="图片过大")
    if len(content) < 100:
        raise HTTPException(status_code=400, detail="图片文件内容为空或损坏")
    
    # 保存到 covers 子目录
    cover_dir = os.path.join(SOCIAL_IMG_DIR, "covers", user_id)
    os.makedirs(cover_dir, exist_ok=True)
    filename = f"cover{ext}"
    filepath = os.path.join(cover_dir, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    
    cover_url = f"/static/social_images/covers/{user_id}/{filename}"
    
    # 更新档案
    profile = social_db.update_user_profile(user_id=user_id, cover_url=cover_url)
    return {"status": "ok", "cover_url": cover_url, "profile": profile}


# ====================================================
# 💬 聊天 API
# ====================================================
class ChatRequestBody(BaseModel):
    user_id: str
    message: str
    context: str = ""  # 上下文，如 "wechat_chat"

@router.post("/chat", summary="与 UNA 聊天")
async def chat_with_una_api(body: ChatRequestBody):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="消息不能为空")
    if not body.user_id:
        raise HTTPException(status_code=400, detail="user_id 不能为空")

    try:
        response = await chat_with_una(body.message.strip(), body.user_id, body.context)
        return {"status": "ok", "response": response}
    except Exception as e:
        print(f"❌ [Chat API] 聊天异常: {e}")
        raise HTTPException(status_code=500, detail="聊天服务暂时不可用")