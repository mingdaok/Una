"""Authenticated administration; no media directory is mounted publicly."""

import json
import time
from typing import Literal
from fastapi import Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from pydantic import Field
from .social_types import StrictModel
from .media import MediaError


class BehaviorPatch(StrictModel):
    autonomous: bool | None = None
    context_count: int | None = Field(default=None, ge=20, le=200)
    stickers: bool | None = None
    collect: bool | None = None
    auto_accept: bool | None = None
    voice: bool | None = None
    autonomous_voice: bool | None = None


class TestModeBody(StrictModel):
    percent: int = Field(default=95, ge=0, le=100)
    minutes: int = Field(default=30, ge=1, le=120)


class AssetPatch(StrictModel):
    description: str | None = Field(default=None, max_length=500)
    scope: str | None = Field(default=None, max_length=32)
    status: Literal["ready", "review", "disabled", "rejected"] | None = None


def install_social_routes(router, service, current_user):
    store, library = service.store, service.social.library

    def admin(user=Depends(current_user)):
        if user["id"] not in service.config.admins:
            raise HTTPException(403, "需要 QQ 管理员权限")
        if not service.config.enabled or service.config.error:
            raise HTTPException(503, service.config.error or "QQ 功能尚未启用")
        return user

    def group_scope(group):
        if group not in service.config.groups:
            raise HTTPException(403, "该群不在部署白名单中")
        return store.conversation("group", group)

    def scope_check(scope):
        if scope != "public":
            group_scope(scope)

    def asset_get(ident):
        try:
            asset = library.get(ident)
            scope_check(asset["scope"])
            return asset
        except ValueError as error:
            raise HTTPException(404, str(error))

    def enqueue(*args, **kwargs):
        try:
            return store.media_job(*args, **kwargs)
        except MediaError as error:
            raise HTTPException(429, str(error))

    def public_asset(asset):
        return {
            k: asset[k]
            for k in (
                "id",
                "scope",
                "description",
                "ocr",
                "status",
                "format",
                "size",
                "version",
                "created",
                "index_status",
            )
        }

    @router.get(
        "/api/channels/qq/admin/groups/{group_id}/behavior",
        dependencies=[Depends(admin)],
    )
    def behavior(group_id: str):
        group_scope(group_id)
        return store.behavior(group_id)

    @router.patch(
        "/api/channels/qq/admin/groups/{group_id}/behavior",
        dependencies=[Depends(admin)],
    )
    def update_behavior(group_id: str, body: BehaviorPatch):
        group_scope(group_id)
        return store.set_behavior(group_id, body.model_dump(exclude_none=True))

    @router.get(
        "/api/channels/qq/admin/groups/{group_id}/decisions",
        dependencies=[Depends(admin)],
    )
    def decisions(
        group_id: str,
        offset: int = Query(0, ge=0),
        limit: int = Query(30, ge=1, le=100),
    ):
        conv = group_scope(group_id)
        return store.rows(
            "SELECT id,reason,target,elapsed,created,stage,error_code,trigger_kind,(SELECT group_concat(DISTINCT o.status) FROM qq_outbox o WHERE o.inbox_id=qq_group_decisions.id) AS delivery_status FROM qq_group_decisions WHERE conversation=? AND generation=? ORDER BY created DESC LIMIT ? OFFSET ?",
            (conv["id"], conv["generation"], limit, offset),
        )

    @router.get(
        "/api/channels/qq/admin/groups/{group_id}/test-mode",
        dependencies=[Depends(admin)],
    )
    def test_mode(group_id: str):
        group_scope(group_id)
        percent, until = store.test_mode(group_id, service.config.test_reply_percent)
        return {
            "percent": percent,
            "until": until,
            "legacy": store.behavior(group_id)["test_percent"] is None,
        }

    @router.put(
        "/api/channels/qq/admin/groups/{group_id}/test-mode",
        dependencies=[Depends(admin)],
    )
    def set_test_mode(group_id: str, body: TestModeBody):
        group_scope(group_id)
        store.set_behavior(
            group_id,
            {
                "test_percent": body.percent,
                "test_until": time.time() + body.minutes * 60 if body.percent else 0.0,
            },
        )
        return test_mode(group_id)

    @router.get("/api/channels/qq/media-jobs")
    def own_jobs(
        user=Depends(current_user),
        offset: int = Query(0, ge=0),
        limit: int = Query(30, ge=1, le=100),
    ):
        if not store.initialized:
            return []
        return store.rows(
            "SELECT j.id,j.kind,j.status,j.stage,j.error,j.created,j.attempts,j.result,(SELECT o.status FROM qq_outbox o WHERE o.inbox_id=json_extract(j.payload,'$.inbox_id') AND o.kind='audio' LIMIT 1) AS delivery_status FROM qq_media_jobs j JOIN qq_bindings b ON b.id=j.binding_id WHERE b.bot=? AND b.user_id=? ORDER BY j.created DESC LIMIT ? OFFSET ?",
            (store.bot_id, user["id"], limit, offset),
        )

    @router.get("/api/channels/qq/admin/media-health", dependencies=[Depends(admin)])
    def media_health():
        return store.rows(
            "SELECT j.kind,j.status,j.stage,count(*) AS count FROM qq_media_jobs j LEFT JOIN qq_conversations c ON c.id=j.conversation WHERE j.conversation IS NULL OR c.bot=? GROUP BY j.kind,j.status,j.stage",
            (store.bot_id,),
        )

    @router.get(
        "/api/channels/qq/admin/groups/{group_id}/history",
        dependencies=[Depends(admin)],
    )
    def history(
        group_id: str,
        offset: int = Query(0, ge=0),
        limit: int = Query(30, ge=1, le=100),
    ):
        conv = group_scope(group_id)
        rows = store.rows(
            "SELECT sender,role,content,created,platform_id,metadata FROM qq_messages WHERE conversation=? AND generation=? AND delivered=1 AND created>=? ORDER BY created DESC LIMIT ? OFFSET ?",
            (conv["id"], conv["generation"], time.time() - 86400, limit, offset),
        )
        for row in rows:
            meta = json.loads(row.pop("metadata"))
            row["sender_name"] = meta.get("sender_name", "")
            row["source"] = meta.get("source") or "live"
        return rows

    @router.post(
        "/api/channels/qq/admin/groups/{group_id}/history-sync",
        dependencies=[Depends(admin)],
    )
    def sync(group_id: str):
        conv = group_scope(group_id)
        group = store.group(group_id)
        if not group["enabled"] or not service.adapter.socket:
            raise HTTPException(409, "请先启用该群并连接 QQ")
        pending = store.rows(
            "SELECT id FROM qq_media_jobs WHERE conversation=? AND kind='history' AND status IN ('pending','processing')",
            (conv["id"],),
        )
        if pending:
            return {"job_id": pending[0]["id"]}
        ident = enqueue(
            "history",
            {"group_id": group_id},
            dedupe=f"history:{conv['id']}:{time.time_ns()}",
            row={
                "conversation": conv["id"],
                "generation": conv["generation"],
                "version": group["version"],
            },
        )
        return {"job_id": ident}

    @router.delete(
        "/api/channels/qq/admin/groups/{group_id}/context",
        dependencies=[Depends(admin)],
    )
    def clear(group_id: str):
        group_scope(group_id)
        store.clear_group(group_id)
        return {"ok": True}

    @router.get("/api/channels/qq/admin/stickers", dependencies=[Depends(admin)])
    def assets(
        scope: str = "public",
        offset: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=100),
    ):
        scope_check(scope)
        return [
            public_asset(a)
            for a in store.rows(
                "SELECT * FROM qq_media_assets WHERE scope=? ORDER BY created DESC LIMIT ? OFFSET ?",
                (scope, limit, offset),
            )
        ]

    @router.post("/api/channels/qq/admin/stickers", dependencies=[Depends(admin)])
    async def upload(
        file: UploadFile = File(...),
        scope: str = "public",
        description: str = Query("", max_length=500),
    ):
        scope_check(scope)
        try:
            content = await file.read(5 * 1024 * 1024 + 1)
            import asyncio

            asset = await asyncio.to_thread(library.add, content, scope, description)
            if asset["status"] != "rejected":
                kind = "index" if description else "describe"
                enqueue(
                    kind,
                    {"asset_id": asset["id"], "asset_version": asset["version"]},
                    dedupe=f"{kind}:{asset['id']}:{asset['version']}",
                )
            return public_asset(asset)
        except MediaError as error:
            raise HTTPException(400, str(error))
        finally:
            await file.close()

    @router.patch(
        "/api/channels/qq/admin/stickers/{ident}", dependencies=[Depends(admin)]
    )
    def patch(ident: str, body: AssetPatch):
        asset = asset_get(ident)
        values = body.model_dump(exclude_none=True)
        if "scope" in values:
            scope_check(values["scope"])
        if (
            values.get("status") == "ready"
            and not values.get("description", asset["description"]).strip()
        ):
            raise HTTPException(400, "请先填写表情含义再接收")
        try:
            updated = library.update(ident, values)
        except Exception:
            raise HTTPException(409, "目标图库已有相同图片")
        if updated["status"] == "ready":
            enqueue(
                "index",
                {"asset_id": ident},
                dedupe=f"index:{ident}:{updated['version']}",
            )
        return public_asset(updated)

    @router.delete(
        "/api/channels/qq/admin/stickers/{ident}", dependencies=[Depends(admin)]
    )
    def remove(ident: str):
        asset_get(ident)
        library.remove(ident)
        return {"ok": True}

    @router.post(
        "/api/channels/qq/admin/stickers/{ident}/reindex", dependencies=[Depends(admin)]
    )
    def reindex(ident: str):
        asset = asset_get(ident)
        if asset["status"] == "rejected":
            raise HTTPException(409, "素材已删除")
        kind = "index" if asset["description"] else "describe"
        return {
            "job_id": enqueue(
                kind,
                {"asset_id": ident, "asset_version": asset["version"]},
                dedupe=f"{kind}:{ident}:{time.time_ns()}",
            )
        }

    @router.get(
        "/api/channels/qq/admin/stickers/{ident}/preview", dependencies=[Depends(admin)]
    )
    def preview(ident: str):
        asset = asset_get(ident)
        try:
            return FileResponse(
                library.path(asset),
                media_type="image/" + asset["format"].lower(),
                headers={
                    "Cache-Control": "no-store",
                    "X-Content-Type-Options": "nosniff",
                },
            )
        except MediaError as error:
            raise HTTPException(404, str(error))

    @router.get("/api/channels/qq/admin/media-jobs", dependencies=[Depends(admin)])
    def media_jobs(offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100)):
        rows = store.rows(
            "SELECT j.id,j.kind,j.status,j.error,j.created,j.attempts,j.stage,j.result,j.payload,c.target FROM qq_media_jobs j LEFT JOIN qq_conversations c ON c.id=j.conversation WHERE j.conversation IS NULL OR (c.bot=? AND c.scope='group') ORDER BY j.created DESC LIMIT ? OFFSET ?",
            (store.bot_id, limit, offset),
        )
        result = []
        for row in rows:
            payload = json.loads(row.pop("payload"))
            if row["target"] and row["target"] not in service.config.groups:
                continue
            if row["kind"] == "history":
                row["received"], row["imported"] = (
                    payload.get("received"),
                    payload.get("imported"),
                )
            result.append(row)
        return result
