"""Authenticated user preferences and explicitly authorized local administration."""

from fastapi import APIRouter, Depends, HTTPException, WebSocket
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal, Optional


class ConfirmBody(BaseModel):
    code_id: str = Field(min_length=1, max_length=64)


class Preferences(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    share_profile: Optional[bool] = None
    share_memory: Optional[bool] = None
    share_history: Optional[bool] = None
    share_life: Optional[bool] = None
    voice_mode: Optional[Literal["follow", "text", "always"]] = None
    proactive: Optional[bool] = None
    greeting: Optional[bool] = None
    diary: Optional[bool] = None
    life: Optional[bool] = None


class GroupSettings(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    enabled: bool
    cooldown: int = Field(default=180, ge=180, le=3600)
    hourly: int = Field(default=6, ge=1, le=6)


def router_for(service, current_user):
    router = APIRouter(tags=["QQ"])
    from .social_api import install_social_routes

    install_social_routes(router, service, current_user)

    def enabled():
        if not service.config.enabled or service.config.error:
            raise HTTPException(503, service.config.error or "QQ 功能尚未启用")

    @router.websocket("/integrations/qq/onebot/ws")
    async def onebot(ws: WebSocket):
        await service.adapter.connect(ws, service.receive)

    @router.get("/api/channels/qq/status")
    async def status(user=Depends(current_user)):
        return service.status(user["id"] in service.config.admins)

    @router.get("/api/channels/qq/binding")
    async def binding(user=Depends(current_user)):
        if not service.store.initialized:
            return {"binding": None, "pending": []}
        row = service.store.binding(user=user["id"])
        pending = service.store.rows(
            "SELECT id,external_id,expires FROM qq_codes WHERE bot=? AND user_id=? AND used=1 AND expires>?",
            (service.config.bot_id, user["id"], __import__("time").time()),
        )

        def mask(value):
            return "***" + str(value)[-4:]

        return dict(
            binding=dict(external_id=mask(row["external_id"]), prefs=row["prefs"])
            if row
            else None,
            pending=[{**r, "external_id": mask(r["external_id"])} for r in pending],
        )

    @router.post("/api/channels/qq/binding-codes")
    async def code(user=Depends(current_user)):
        enabled()
        if not service.rate("code:" + user["id"], 3):
            raise HTTPException(429, "请稍后再生成绑定码")
        return service.store.code(user["id"])

    @router.post("/api/channels/qq/bindings/confirm")
    async def confirm(body: ConfirmBody, user=Depends(current_user)):
        enabled()
        try:
            service.store.confirm(user["id"], body.code_id)
        except ValueError as error:
            raise HTTPException(409, str(error))
        return {"ok": True}

    @router.delete("/api/channels/qq/binding")
    async def unbind(user=Depends(current_user)):
        enabled()
        try:
            async with service.profile_locks[user["id"]]:
                service.store.preferences(user["id"])
        except ValueError as error:
            raise HTTPException(404, str(error))
        return {"ok": True}

    @router.patch("/api/channels/qq/preferences")
    async def preferences(body: Preferences, user=Depends(current_user)):
        enabled()
        try:
            values = {
                key: value
                for key, value in body.model_dump(exclude_unset=True).items()
                if value is not None
            }
            async with service.profile_locks[user["id"]]:
                row = service.store.preferences(user["id"], values)
        except ValueError as error:
            raise HTTPException(404, str(error))
        return row["prefs"]

    @router.patch("/api/channels/qq/groups/{group_id}")
    async def group(group_id: str, body: GroupSettings, user=Depends(current_user)):
        enabled()
        if user["id"] not in service.config.admins:
            raise HTTPException(403, "需要 QQ 管理员权限")
        if group_id not in service.config.groups:
            raise HTTPException(403, "该群不在部署白名单中")
        service.store.set_group(group_id, body.enabled, body.cooldown, body.hourly)
        return service.store.group(group_id)

    return router
