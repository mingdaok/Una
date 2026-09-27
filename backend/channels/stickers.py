"""Private local sticker library. No model-selected URLs or filesystem paths."""

import asyncio
import base64
import hashlib
import io
import json
import math
import os
import time
import uuid
from pathlib import Path
from PIL import Image, ImageOps
from .media import MediaError
from .async_db import database_call
from .social_types import relevance


class StickerLibrary:
    def __init__(self, store, root, embed=None):
        self.store = store
        self.root = Path(root).resolve() / "stickers"
        # Created lazily when authorized upload/collection starts.
        self.embed = embed
        # Model identity travels with each vector; incompatible indexes fall back to text.
        self.embedding_model = (
            getattr(embed, "model_name", None)
            or getattr(embed, "_model_name", None)
            or type(embed).__qualname__
        )
        self.embedding_lock = asyncio.Lock()
        self.embedding_task = None
        self.embedding_retry_at = 0
        self.embedding_warm = False

    def path(self, asset):
        if asset["status"] == "rejected":
            raise MediaError("表情已删除")
        path = (self.root / asset["storage_key"]).resolve()
        if path.parent != self.root or not path.is_file() or path.is_symlink():
            raise MediaError("表情文件不存在或已禁用")
        return path

    def get(self, ident):
        rows = self.store.rows("SELECT * FROM qq_media_assets WHERE id=?", (ident,))
        if not rows:
            raise ValueError("表情不存在")
        return rows[0]

    def usable(self, ident, scope, version=None):
        try:
            asset = self.get(ident)
            if (
                asset["status"] != "ready"
                or asset["scope"] not in (scope, "public")
                or (version is not None and asset["version"] != version)
            ):
                return None
            return {**asset, "uri": self.path(asset).as_uri()}
        except (ValueError, MediaError):
            return None

    def add(self, content, scope, description="", collected=False):
        if not content or len(content) > 5 * 1024 * 1024:
            raise MediaError("表情须在 5 MB 以内")
        try:
            with Image.open(io.BytesIO(content)) as image:
                fmt = image.format
                if fmt not in ("PNG", "JPEG", "WEBP", "GIF"):
                    raise MediaError("表情仅支持 PNG/JPEG/WebP/GIF")
                frames = getattr(image, "n_frames", 1)
                if (
                    image.width * image.height > 20_000_000
                    or frames > 100
                    or frames * image.width * image.height > 100_000_000
                ):
                    raise MediaError("表情尺寸或动画帧数超限")
                for index in range(frames):
                    image.seek(index)
                    image.load()
        except (OSError, Image.DecompressionBombError) as error:
            raise MediaError("表情无法解码") from error
        sha = hashlib.sha256(content).hexdigest()
        now, ident = time.time(), uuid.uuid4().hex
        key = (
            sha + "." + {"JPEG": "jpg", "PNG": "png", "WEBP": "webp", "GIF": "gif"}[fmt]
        )
        self.root.mkdir(parents=True, exist_ok=True)
        with self.store.db() as db:
            existing = db.execute(
                "SELECT * FROM qq_media_assets WHERE sha256=? AND scope=?", (sha, scope)
            ).fetchone()
            if existing:
                return dict(existing)
            usage = db.execute(
                "SELECT count(*),coalesce(sum(size),0) FROM qq_media_assets WHERE status!='rejected'"
            ).fetchone()
            if usage[0] >= 500 or usage[1] + len(content) > 500 * 1024 * 1024:
                raise MediaError("表情库已达容量上限，请先清理")
            pending = db.execute(
                "SELECT count(*) FROM qq_media_assets WHERE scope=? AND status='review'",
                (scope,),
            ).fetchone()[0]
            if pending >= 100:
                raise MediaError("该群待审核表情已达 100 张")
            temporary = self.root / (ident + ".tmp")
            try:
                temporary.write_bytes(content)
                os.replace(temporary, self.root / key)
            finally:
                temporary.unlink(missing_ok=True)
            db.execute(
                "INSERT INTO qq_media_assets(id,sha256,scope,storage_key,format,size,description,status,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?)",
                (
                    ident,
                    sha,
                    scope,
                    key,
                    fmt,
                    len(content),
                    description[:500],
                    "review" if collected or not description else "ready",
                    now,
                    now,
                ),
            )
        return self.get(ident)

    def update(self, ident, values):
        allowed = {
            k: v for k, v in values.items() if k in ("description", "scope", "status")
        }
        if not allowed:
            return self.get(ident)
        with self.store.db() as db:
            current = db.execute(
                "SELECT status FROM qq_media_assets WHERE id=?", (ident,)
            ).fetchone()
            if not current or current["status"] == "rejected":
                raise MediaError("素材已删除，不可恢复")
            db.execute(
                "UPDATE qq_media_assets SET "
                + ",".join(k + "=?" for k in allowed)
                + ",version=version+1,updated=?,vector=NULL WHERE id=?",
                (*allowed.values(), time.time(), ident),
            )
            db.execute(
                "UPDATE qq_outbox SET status='cancelled' WHERE asset_id=? AND status='pending'",
                (ident,),
            )
        return self.get(ident)

    def remove(self, ident):
        # A rejected hash is a tombstone: collection cannot silently resurrect it.
        with self.store.db() as db:
            row = db.execute(
                "SELECT * FROM qq_media_assets WHERE id=?", (ident,)
            ).fetchone()
            if not row or row["status"] == "rejected":
                return
            asset = dict(row)
            db.execute(
                "UPDATE qq_media_assets SET status='rejected',version=version+1,updated=? WHERE id=?",
                (time.time(), ident),
            )
            db.execute(
                "UPDATE qq_outbox SET status='cancelled' WHERE asset_id=? AND status IN ('pending','preparing')",
                (ident,),
            )
            others = db.execute(
                "SELECT 1 FROM qq_media_assets WHERE storage_key=? AND status!='rejected'",
                (asset["storage_key"],),
            ).fetchone()
            if not others:
                try:
                    self.path(asset).unlink()
                except MediaError:
                    pass

    def previews(self, asset):
        result = []
        with Image.open(self.path(asset)) as image:
            frames = getattr(image, "n_frames", 1)
            for index in sorted({0, frames // 2, frames - 1})[:3]:
                image.seek(index)
                frame = ImageOps.exif_transpose(image).convert("RGB")
                frame.thumbnail((512, 512))
                output = io.BytesIO()
                frame.save(output, format="JPEG", quality=80)
                result.append(
                    "data:image/jpeg;base64,"
                    + base64.b64encode(output.getvalue()).decode()
                )
        return result

    async def vector(self, text, *, indexing=False):
        if (
            not self.embed
            or self.embedding_lock.locked()
            or time.time() < self.embedding_retry_at
        ):
            return None
        if self.embedding_task and not self.embedding_task.done():
            return None
        async with self.embedding_lock:
            task = asyncio.create_task(asyncio.to_thread(self.embed, [text[:1000]]))
            self.embedding_task = task

            def settle(future):
                if not future.cancelled():
                    try:
                        future.result()
                        self.embedding_warm = True
                    except Exception:
                        pass

            task.add_done_callback(settle)
            try:
                done, _ = await asyncio.wait(
                    {task}, timeout=20 if indexing and not self.embedding_warm else 2
                )
                if not done:
                    self.embedding_retry_at = time.time() + 30
                    return None
                vector = [float(x) for x in task.result()[0]]
                if not vector or not all(math.isfinite(x) for x in vector):
                    return None
                return vector
            except Exception:
                self.embedding_retry_at = time.time() + 30
                return None

    async def index(self, ident):
        asset = await database_call(self.get, ident)
        vector = await self.vector(
            asset["description"] + " " + asset["ocr"], indexing=True
        )
        await database_call(
            self.store.execute,
            "UPDATE qq_media_assets SET vector=?,index_status=? WHERE id=? AND version=? AND status!='rejected'",
            (
                json.dumps({"model": self.embedding_model, "values": vector})
                if vector
                else None,
                "semantic" if vector else "lexical",
                ident,
                asset["version"],
            ),
        )
        return bool(vector)

    async def candidates(self, scope, query, conversation):
        recent = await database_call(
            self.store.rows,
            "SELECT asset_id FROM qq_outbox WHERE conversation=? AND status IN ('pending','preparing','sending','delivered','unknown') AND inbox_id IN (SELECT inbox_id FROM qq_outbox WHERE conversation=? GROUP BY inbox_id ORDER BY max(created) DESC LIMIT 20) AND asset_id IS NOT NULL",
            (conversation, conversation),
        )
        excluded = {r["asset_id"] for r in recent}
        rows = await database_call(
            self.store.rows,
            "SELECT * FROM qq_media_assets WHERE status='ready' AND scope IN (?, 'public') ORDER BY updated DESC LIMIT 500",
            (scope,),
        )
        vector = await self.vector(query) if any(r["vector"] for r in rows) else None

        def rank():
            ranked = []
            for row in rows:
                if row["id"] in excluded:
                    continue
                score = relevance(query, row["description"] + " " + row["ocr"])
                if vector and row["vector"]:
                    stored = json.loads(row["vector"])
                    if (
                        not isinstance(stored, dict)
                        or stored.get("model") != self.embedding_model
                    ):
                        stored = {"values": []}
                    other = stored["values"]
                    if len(other) == len(vector):
                        norm = math.sqrt(
                            sum(x * x for x in vector) * sum(x * x for x in other)
                        )
                        score = max(
                            score,
                            sum(a * b for a, b in zip(vector, other)) / max(norm, 1e-9),
                        )
                if score > 0:
                    try:
                        self.path(row)
                    except MediaError:
                        continue
                    ranked.append((score, row))
            return [
                {k: row[k] for k in ("id", "description", "ocr")}
                for _, row in sorted(ranked, key=lambda pair: pair[0], reverse=True)[
                    :12
                ]
            ]

        return await asyncio.to_thread(rank)

    def cleanup(self):
        now = time.time()
        for asset in self.store.rows(
            "SELECT * FROM qq_media_assets WHERE (status='review' AND created<?) OR (status='disabled' AND updated<?)",
            (now - 7 * 86400, now - 30 * 86400),
        ):
            self.remove(asset["id"])
        # Recover files left behind if a process died between file write and transaction commit.
        keys = {
            r["storage_key"]
            for r in self.store.rows(
                "SELECT storage_key FROM qq_media_assets WHERE status!='rejected'"
            )
        }
        for path in self.root.iterdir() if self.root.exists() else ():
            if (
                path.is_file()
                and not path.is_symlink()
                and path.name not in keys
                and path.stat().st_mtime < now - 86400
            ):
                path.unlink()
