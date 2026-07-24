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
import media_service
from auth_api import get_current_user
import database  # 🔥 引入消息记录模块，用于文本聊天记忆持久化

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


async def auto_comment_on_post(post_id: int):
    """后台 AI 主动对用户的朋友圈发表评论"""
    try:
        post = social_db.get_post_by_id(post_id)
        if not post:
            return
        # 不要评论 AI 自己发的动态
        if post.get("author_type") == "ai" or post.get("author_id") == "ai_una":
            return

        post_content = post.get("content", "")
        if not post_content.strip():
            return

        # 使用 brain_instance 生成智能评论
        global brain_instance
        if brain_instance:
            try:
                ai_reply = ""
                async for chunk in brain_instance.chat_stream(
                    user_id=post.get("author_id", "unknown"),
                    user_text=f"（你的好朋友刚刚发了一条朋友圈，内容是：'{post_content}'。请你以亲切小妹妹的语气写一条简短的评论回复，不要超过30字，可以包含emoji。只输出评论内容本身，不要加引号或多余前缀。）",
                    long_term_memory=""
                ):
                    if isinstance(chunk, dict):
                        if chunk.get('type') == 'sentence':
                            ai_reply += chunk.get('text', '')
                    elif isinstance(chunk, str):
                        ai_reply += chunk

                ai_reply = ai_reply.strip()
                if ai_reply:
                    social_db.add_comment(
                        post_id=post_id,
                        user_id="ai_una",
                        user_name="UNA",
                        content=ai_reply,
                        reply_to_id=None
                    )
                    print(f"🤖 [AI Auto Comment] 成功评论帖子 {post_id}: {ai_reply}")
                    return
            except Exception as e:
                print(f"⚠️ [AI Auto Comment] 智能评论生成失败，回退模板: {e}")

        # 回退：模板评论
        import random
        templates = [
            "好棒呀！看得我心情都变好了~ ✨",
            "哇，分享的好开心！我也想参与~ 😊",
            "太有趣了吧！下次带上我呀~ 💕",
            "看到你发的，我也笑了呢~ 😄",
            "好好看！这也太厉害了吧~ 🌟",
        ]
        reply_text = random.choice(templates)
        social_db.add_comment(
            post_id=post_id,
            user_id="ai_una",
            user_name="UNA",
            content=reply_text,
            reply_to_id=None
        )
        print(f"🤖 [AI Auto Comment] 模板评论帖子 {post_id}: {reply_text}")

    except Exception as e:
        print(f"❌ [AI Auto Comment] 自动评论异常: {e}")


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
    """与 UNA 聊天，返回回复内容（带记忆持久化）"""
    global brain_instance
    if brain_instance is None:
        print("⚠️ [Chat API] brain_instance 未注入，无法执行 chat_with_una")
        return "抱歉，我现在有点小问题，一会儿再来找我聊吧~ 😅"

    # 🔥 Step 1: 存入用户消息到历史记录
    database.add_message(user_id, "user", message)

    # 🔥 Step 2: 提取最近历史对话作为上下文
    recent_history = database.get_recent_history(user_id, limit=20)
    history_text = "\n".join([f"{item.get('role','unknown')}: {item.get('text','')}" for item in recent_history])

    try:
        response_text = ""
        async for chunk in brain_instance.chat_stream(
            user_id=user_id,
            user_text=message,
            long_term_memory=history_text  # 🔥 传入历史记忆
        ):
            if isinstance(chunk, dict):
                if chunk.get('type') == 'sentence':
                    response_text += chunk.get('text', '')
            elif isinstance(chunk, str):
                response_text += chunk

        final_reply = response_text.strip() or "嗯嗯，我听到了！继续说吧~ 😊"

        # 🔥 Step 3: 存入 AI 回复到历史记录
        database.add_message(user_id, "ai", final_reply)

        return final_reply
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

router = APIRouter(
    prefix="/api/social",
    tags=["社交朋友圈"],
    dependencies=[Depends(get_current_user)],
)


# ====================================================
# 📦 Pydantic 请求体
# ====================================================
class CreatePostBody(BaseModel):
    author_type: str = "user"   # "user" 或 "ai"
    author_avatar: str = ""     # 发布者头像 URL
    content: str = ""
    image_urls: List[str] = []  # 由 /upload 接口返回的 URL 列表
    location: str = ""
    emoji_pack_ids: List[int] = []  # 使用的表情包 ID 列表
    post_type: str = "text"     # 'text', 'image', 'mixed'
    visibility: str = "public"  # 'public', 'friends_only', 'private'


class LikeBody(BaseModel):
    pass


class CommentBody(BaseModel):
    content: str
    reply_to_id: Optional[int] = None


class DeleteCommentBody(BaseModel):
    pass


class DeletePostBody(BaseModel):
    pass


# ====================================================
# 🖼️ 图片上传
# ====================================================
@router.post("/upload", summary="上传图片（支持多文件）")
async def upload_images(
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user),
):
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

        media = media_service.register_media(current_user["id"], "social_image", filepath)
        urls.append(media_service.media_url(media["id"], current_user["id"]))

    return {"status": "ok", "urls": urls, "count": len(urls)}


# ====================================================
# 📝 发布动态
# ====================================================
@router.post("/post", summary="发布新动态")
async def create_post(
    body: CreatePostBody,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    if not body.content.strip() and not body.image_urls:
        raise HTTPException(status_code=400, detail="动态内容和图片不能同时为空")

    post = social_db.create_post(
        owner_user_id=current_user["id"],
        author_id=current_user["id"],
        content=body.content.strip(),
        images=[
            media_service.media_url(media_id, current_user["id"])
            if (media_id := media_service.media_id_from_url(url)) else url
            for url in body.image_urls
        ],
        location=body.location,
        author_name=current_user["username"],
        author_type="user",
        author_avatar="",
        emoji_pack_ids=body.emoji_pack_ids,
        post_type=body.post_type,
        visibility=body.visibility,
    )
    if post is None:
        raise HTTPException(status_code=500, detail="动态发布失败，请稍后重试")

    # 🔥 用户发朋友圈时，AI 自动评论（仅对非 AI 发布的动态生效）
    if post:
        background_tasks.add_task(auto_comment_on_post, post["id"])

    return {"status": "ok", "post": post}


# ====================================================
# 🗑️ 删除动态
# ====================================================
@router.delete("/post/{post_id}", summary="删除自己的动态")
async def delete_post(post_id: int, body: DeletePostBody, current_user: dict = Depends(get_current_user)):
    post = social_db.get_post_by_id(post_id)
    if not post or post.get("owner_user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="无权删除该动态")
    success = social_db.delete_post(post_id, current_user["id"])
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
    current_user: dict = Depends(get_current_user),
):
    """
    返回按时间倒序分页的动态列表，每条动态内嵌：
    - likes: 点赞用户列表
    - comments: 树状评论（顶层 comments 下含 replies 子列表）
    """
    result = social_db.get_feed(owner_user_id=current_user["id"], page=page, page_size=page_size)
    for post in result.get("items", []):
        post["images"] = [
            media_service.media_url(media_id, current_user["id"])
            if (media_id := media_service.media_id_from_url(url)) else url
            for url in post.get("images", [])
        ]
    return result


# ====================================================
# ❤️ 点赞 / 取消点赞
# ====================================================
@router.post("/post/{post_id}/like", summary="点赞或取消点赞")
async def toggle_like(post_id: int, body: LikeBody, current_user: dict = Depends(get_current_user)):
    post = social_db.get_post_by_id(post_id)
    if not post or post.get("owner_user_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="动态不存在")

    result = social_db.toggle_like(
        post_id=post_id,
        user_id=current_user["id"],
        user_name=current_user["username"],
    )
    if result["action"] == "error":
        raise HTTPException(status_code=500, detail="操作失败，请稍后重试")

    return {"status": "ok", **result}


# ====================================================
# 💬 发表评论 / 楼中楼回复
# ====================================================
@router.post("/post/{post_id}/comment", summary="发表评论或楼中楼回复")
async def add_comment(
    post_id: int,
    body: CommentBody,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="评论内容不能为空")
    post = social_db.get_post_by_id(post_id)
    if not post or post.get("owner_user_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="动态不存在")

    comment = social_db.add_comment(
        post_id=post_id,
        user_id=current_user["id"],
        content=body.content.strip(),
        reply_to_id=body.reply_to_id,
        user_name=current_user["username"],
    )
    if comment is None:
        raise HTTPException(status_code=500, detail="评论发布失败，请稍后重试")

    # 🔥 放宽 AI 自动回复触发条件
    if current_user["id"] != "ai_una":
        should_ai_reply = False
        post = social_db.get_post_by_id(post_id)

        # 条件 1: 帖子是 AI 发的
        if post and post.get("author_id") == "ai_una":
            should_ai_reply = True

        # 条件 2: 回复的评论是 AI 发的
        if body.reply_to_id:
            replied_comment = social_db.get_comment_by_id(body.reply_to_id)
            if replied_comment and replied_comment.get("user_id") == "ai_una":
                should_ai_reply = True

        # 条件 3: 评论内容中 @UNA
        if "@una" in body.content.lower() or "@UNA" in body.content:
            should_ai_reply = True

        if should_ai_reply:
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
async def delete_comment(
    comment_id: int,
    body: DeleteCommentBody,
    current_user: dict = Depends(get_current_user),
):
    comment = social_db.get_comment_by_id(comment_id)
    if not comment or comment.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="评论不存在或无权删除")
    post = social_db.get_post_by_id(comment["post_id"])
    if not post or post.get("owner_user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="评论不存在或无权删除")
    success = social_db.delete_comment(comment_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=403, detail="评论不存在或无权删除")
    return {"status": "ok"}

# ====================================================
# 😄 表情包管理 API
# ====================================================
def get_current_users_emoji_pack(pack_id: int, current_user: dict) -> dict:
    """只允许用户读取和操作自己的表情包。"""
    pack = social_db.get_emoji_pack_by_id(pack_id)
    if not pack or pack.get("owner_type") != "user" or pack.get("owner_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="表情包不存在")
    return pack


@router.post("/emoji-packs", summary="创建自己的表情包")
async def create_emoji_pack(
    name: str = Query(..., description="表情包名称"),
    description: str = Query(default="", description="表情包描述"),
    current_user: dict = Depends(get_current_user),
):
    pack = social_db.create_emoji_pack(
        owner_type="user", owner_id=current_user["id"], name=name, description=description
    )
    if pack is None:
        raise HTTPException(status_code=500, detail="表情包创建失败")
    return {"status": "ok", "pack": pack}


@router.get("/emoji-packs", summary="获取自己的表情包")
async def get_emoji_packs(current_user: dict = Depends(get_current_user)):
    packs = social_db.get_emoji_packs_by_owner("user", current_user["id"])
    return {"status": "ok", "packs": packs}


@router.get("/emoji-packs/{pack_id}", summary="获取表情包的详细信息")
async def get_emoji_pack(pack_id: int, current_user: dict = Depends(get_current_user)):
    return {"status": "ok", "pack": get_current_users_emoji_pack(pack_id, current_user)}


@router.put("/emoji-packs/{pack_id}", summary="更新表情包信息")
async def update_emoji_pack(
    pack_id: int,
    name: str = Query(default=None, description="新的表情包名称"),
    description: str = Query(default=None, description="新的表情包描述"),
    is_enabled: bool = Query(default=None, description="是否启用"),
    current_user: dict = Depends(get_current_user),
):
    get_current_users_emoji_pack(pack_id, current_user)
    pack = social_db.update_emoji_pack(
        pack_id=pack_id, owner_id=current_user["id"], name=name,
        description=description, is_enabled=is_enabled
    )
    if pack is None:
        raise HTTPException(status_code=404, detail="表情包不存在")
    return {"status": "ok", "pack": pack}


@router.delete("/emoji-packs/{pack_id}", summary="删除表情包")
async def delete_emoji_pack(pack_id: int, current_user: dict = Depends(get_current_user)):
    get_current_users_emoji_pack(pack_id, current_user)
    if not social_db.delete_emoji_pack(pack_id, current_user["id"]):
        raise HTTPException(status_code=404, detail="表情包不存在")
    return {"status": "ok"}


@router.post("/emoji-packs/{pack_id}/items", summary="向表情包添加表情")
async def add_emoji_to_pack(
    pack_id: int,
    files: List[UploadFile] = File(default=[]),
    emoji_texts: str = Query(..., description="emoji 文本列表（逗号分隔）"),
    tags_list: str = Query(default="", description="标签列表（逗号分隔）"),
    keywords_list: str = Query(default="", description="关键词列表（逗号分隔）"),
    current_user: dict = Depends(get_current_user),
):
    """
    向表情包批量添加表情项（支持上传对应的图片）。
    emoji_texts: 逗号分隔的 emoji 文本（如 "😀,😁,😂"）
    tags_list: 逗号分隔的标签（如 "快乐,开心,笑脸"）
    keywords_list: 逗号分隔的关键词（如 "happy,joy,smile"）
    """
    get_current_users_emoji_pack(pack_id, current_user)
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
async def get_emoji_items(pack_id: int, current_user: dict = Depends(get_current_user)):
    pack = get_current_users_emoji_pack(pack_id, current_user)
    return {"status": "ok", "items": pack.get("items", [])}


@router.delete("/emoji-packs/{pack_id}/items/{item_id}", summary="删除表情项")
async def delete_emoji_item(pack_id: int, item_id: int, current_user: dict = Depends(get_current_user)):
    """删除表情包中的某个表情项（需校验权限）"""
    get_current_users_emoji_pack(pack_id, current_user)
    
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
@router.post("/friends/request", summary="初始化专属 UNA 联系人")
async def create_friend_request(current_user: dict = Depends(get_current_user)):
    """公网版不提供真人好友；UNA 是当前账号的唯一联系人。"""
    return {"status": "ok", "friend": {"id": "ai_una", "name": "UNA", "type": "ai"}}


@router.get("/friends", summary="获取好友列表")
async def get_friends(current_user: dict = Depends(get_current_user)):
    return {"status": "ok", "friends": [{"id": "ai_una", "name": "UNA", "type": "ai"}]}


# ====================================================
# 👤 用户档案 API
# ====================================================
@router.get("/user/{user_id}/profile", summary="获取用户档案")
async def get_user_profile(user_id: str, current_user: dict = Depends(get_current_user)):
    """获取用户的头像、封面等档案信息"""
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="无权读取其他用户资料")
    profile = social_db.get_or_create_user_profile(current_user["id"])
    if profile is None:
        raise HTTPException(status_code=500, detail="档案获取失败")
    return {"status": "ok", "profile": profile}


@router.put("/user/{user_id}/profile", summary="更新用户档案")
async def update_user_profile(
    user_id: str,
    avatar_url: str = Query(default=None, description="头像 URL"),
    cover_url: str = Query(default=None, description="封面 URL"),
    nickname: str = Query(default=None, description="昵称"),
    bio: str = Query(default=None, description="个人简介"),
    current_user: dict = Depends(get_current_user),
):
    """更新用户的头像、封面、昵称、简介等"""
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="无权修改其他用户资料")
    profile = social_db.update_user_profile(
        user_id=current_user["id"],
        avatar_url=avatar_url,
        cover_url=cover_url,
        nickname=nickname,
        bio=bio
    )
    if profile is None:
        raise HTTPException(status_code=500, detail="档案更新失败")
    return {"status": "ok", "profile": profile}


@router.post("/user/{user_id}/avatar", summary="上传用户头像")
async def upload_avatar(
    user_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """上传用户头像（单文件）"""
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="无权修改其他用户资料")
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
    
    media = media_service.register_media(current_user["id"], "avatar", filepath)
    avatar_url = media_service.media_url(media["id"], current_user["id"])
    
    # 更新档案
    profile = social_db.update_user_profile(user_id=user_id, avatar_url=avatar_url)
    return {"status": "ok", "avatar_url": avatar_url, "profile": profile}


@router.post("/user/{user_id}/cover", summary="上传用户封面")
async def upload_cover(
    user_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """上传用户朋友圈封面（单文件）"""
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="无权修改其他用户资料")
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
    
    media = media_service.register_media(current_user["id"], "cover", filepath)
    cover_url = media_service.media_url(media["id"], current_user["id"])
    
    # 更新档案
    profile = social_db.update_user_profile(user_id=user_id, cover_url=cover_url)
    return {"status": "ok", "cover_url": cover_url, "profile": profile}


# ====================================================
# 💬 聊天 API
# ====================================================
class ChatRequestBody(BaseModel):
    message: str
    context: str = ""  # 上下文，如 "wechat_chat"

@router.post("/chat", summary="与 UNA 聊天")
async def chat_with_una_api(body: ChatRequestBody, current_user: dict = Depends(get_current_user)):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="消息不能为空")
    try:
        response = await chat_with_una(body.message.strip(), current_user["id"], body.context)
        return {"status": "ok", "response": response}
    except Exception as e:
        print(f"❌ [Chat API] 聊天异常: {e}")
        raise HTTPException(status_code=500, detail="聊天服务暂时不可用")


# ====================================================
# 📜 聊天历史记录 API
# ====================================================
@router.get("/chat/history", summary="获取与好友的聊天历史")
async def get_chat_history(
    friend_id: str = Query(default="ai_una", description="好友 ID"),
    limit: int = Query(default=50, ge=1, le=200, description="最大条数"),
    current_user: dict = Depends(get_current_user),
):
    """获取某用户与好友的聊天历史记录"""
    try:
        # 从 database.py 获取该用户的对话历史
        user_id = current_user["id"]
        history = database.get_recent_history(user_id, limit=limit)
        # 转换格式：将 role (user/ai) 映射为 sender ID
        messages = []
        for item in history:
            messages.append({
                "sender": user_id if item.get("role") == "user" else friend_id,
                "senderName": user_id if item.get("role") == "user" else "UNA",
                "content": item.get("text", ""),
                "timestamp": item.get("timestamp", ""),
                "type": "text"
            })
        return {"status": "ok", "messages": messages, "total": len(messages)}
    except Exception as e:
        print(f"❌ [Chat History] 获取聊天历史异常: {e}")
        return {"status": "ok", "messages": [], "total": 0}
