"""私有用户媒体的登记与受保护下载路由。"""

from __future__ import annotations

import mimetypes
import os
import time
import uuid
from typing import Optional

import jwt
from fastapi import APIRouter, Header, HTTPException, Query, status
from fastapi.responses import FileResponse

import database
from auth_api import auth_service
from settings import settings


router = APIRouter(prefix="/api/media", tags=["私有媒体"])


def media_url(media_id: str, owner_user_id: str | None = None) -> str:
    """返回可用于 img/audio 的短期媒体票据；不把 Access Token 放入 URL。"""
    base_url = f"/api/media/{media_id}"
    if not owner_user_id:
        return base_url
    ticket = jwt.encode(
        {"sub": owner_user_id, "media_id": media_id, "type": "media", "exp": int(time.time()) + 300},
        settings.jwt_secret,
        algorithm="HS256",
    )
    return f"{base_url}?ticket={ticket}"


def media_id_from_url(url: str | None) -> str | None:
    if not url or not url.startswith("/api/media/"):
        return None
    return url.split("?", 1)[0].rsplit("/", 1)[-1]


def register_media(owner_user_id: str, media_type: str, storage_path: str) -> dict:
    """登记已落盘的用户文件；调用方必须已根据认证身份确定 owner。"""
    absolute_path = os.path.abspath(storage_path)
    if not os.path.isfile(absolute_path):
        raise FileNotFoundError(absolute_path)
    return database.create_private_media(
        str(uuid.uuid4()), owner_user_id, media_type, absolute_path
    )


@router.get("/{media_id}")
def read_private_media(
    media_id: str,
    ticket: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
):
    media = database.get_private_media(media_id)
    if not media:
        raise HTTPException(status_code=404, detail="媒体不存在")
    scheme, _, access_token = (authorization or "").partition(" ")
    current_user = auth_service.verify_access(access_token) if scheme.lower() == "bearer" else None
    if not current_user and ticket:
        try:
            payload = jwt.decode(ticket, settings.jwt_secret, algorithms=["HS256"])
            if payload.get("type") == "media" and payload.get("media_id") == media_id:
                current_user = {"id": payload.get("sub")}
        except jwt.PyJWTError:
            pass
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="缺少有效的访问令牌")
    if media["owner_user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="媒体不存在")
    if not os.path.isfile(media["storage_path"]):
        raise HTTPException(status_code=404, detail="媒体文件不存在")
    media_type, _ = mimetypes.guess_type(media["storage_path"])
    return FileResponse(media["storage_path"], media_type=media_type or "application/octet-stream")
