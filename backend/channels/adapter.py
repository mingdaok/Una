"""OneBot v11 reverse websocket. Receive loop never waits for generation."""

import asyncio
import hmac
import json
import math
import time
import uuid
from fastapi import WebSocketDisconnect


class SendUnknown(Exception):
    pass


class SendFailed(Exception):
    pass


class OneBotAdapter:
    def __init__(self, config):
        self.config = config
        self.socket = None
        self.pending = {}
        self.last_heartbeat = 0
        self.send_lock = None

    async def connect(self, ws, receive):
        expected = "Bearer " + self.config.token
        if (
            not self.config.enabled
            or self.config.error
            or not hmac.compare_digest(ws.headers.get("authorization", ""), expected)
            or ws.headers.get("x-self-id") != self.config.bot_id
        ):
            await ws.close(code=1008)
            return
        await ws.accept()
        if self.socket:
            await self.socket.close(code=1012)
            self._fail_pending()
        self.socket = ws
        self.last_heartbeat = time.time()
        try:
            while self.socket is ws:
                raw = await asyncio.wait_for(ws.receive_text(), timeout=90)
                if len(raw) > 262144:
                    await ws.close(code=1009)
                    break
                try:
                    data = json.loads(raw)
                except (ValueError, TypeError):
                    continue
                if not isinstance(data, dict):
                    continue
                if "echo" in data:
                    future = self.pending.pop(str(data["echo"]), None)
                    if future and not future.done():
                        future.set_result(data)
                    continue
                if str(data.get("self_id", "")) != self.config.bot_id:
                    continue
                self.last_heartbeat = time.time()
                # This callback only validates and persists; it never runs an LLM.
                await receive(data)
        except (WebSocketDisconnect, asyncio.TimeoutError, RuntimeError):
            pass
        finally:
            if self.socket is ws:
                self.socket = None
                self._fail_pending()

    def _fail_pending(self):
        for future in self.pending.values():
            if not future.done():
                future.set_exception(SendUnknown("connection_lost"))
        self.pending.clear()

    async def action(self, action, params, *, before_send=None):
        if self.send_lock is None:
            self.send_lock = asyncio.Lock()
        if not self.socket:
            raise SendFailed("offline_before_send")
        initial_socket = self.socket
        echo = uuid.uuid4().hex
        future = asyncio.get_running_loop().create_future()
        self.pending[echo] = future
        submitted = False
        acquired = False
        try:
            try:
                await asyncio.wait_for(
                    self.send_lock.acquire(), self.config.send_timeout
                )
                acquired = True
            except asyncio.TimeoutError as error:
                raise SendFailed("lock_timeout_before_send") from error
            try:
                socket = self.socket
                if socket is None or socket is not initial_socket:
                    raise SendFailed("offline_before_send")
                if before_send is not None and not before_send():
                    raise SendFailed("cancelled_before_send")
                submitted = True
                await asyncio.wait_for(
                    socket.send_json(
                        {"action": action, "params": params, "echo": echo}
                    ),
                    self.config.send_timeout,
                )
            finally:
                if acquired:
                    self.send_lock.release()
                    acquired = False
            response = await asyncio.wait_for(future, self.config.send_timeout)
            if response.get("status") != "ok" or response.get("retcode") != 0:
                raise SendFailed("platform_rejected")
            return response.get("data") or {}
        except SendFailed:
            raise
        except Exception as error:
            if not submitted:
                raise SendFailed("prepare_failed") from error
            raise SendUnknown("ack_missing") from error
        finally:
            self.pending.pop(echo, None)
            if not future.done():
                future.cancel()
            elif not future.cancelled():
                future.exception()

    async def close(self):
        if self.socket:
            await self.socket.close(code=1001)
        self.socket = None
        self._fail_pending()


def normalize(data, bot_id, known_reply):
    if data.get("post_type") != "message" or str(data.get("user_id", "")) == bot_id:
        return None
    scope = data.get("message_type")
    if scope not in ("private", "group") or not isinstance(data.get("message"), list):
        return None
    if (
        not isinstance(data.get("message_id"), (int, str))
        or len(str(data["message_id"])) > 128
    ):
        return None
    sender = str(data.get("user_id", ""))
    target = str(data.get("group_id", "")) if scope == "group" else sender
    if not sender.isdigit() or not target.isdigit() or data.get("message_id") is None:
        return None
    segments = []
    text = []
    direct = scope == "private"
    has_voice = False
    mentions = []
    reply_id = None
    info = data.get("sender") if isinstance(data.get("sender"), dict) else {}
    sender_name = str(info.get("card") or info.get("nickname") or "")[:100]
    for segment in data["message"][:100]:
        if not isinstance(segment, dict) or not isinstance(segment.get("data"), dict):
            continue
        kind, payload = segment.get("type"), segment["data"]
        if kind == "text":
            text.append(str(payload.get("text", ""))[:8000])
        elif kind == "at":
            mentioned = str(payload.get("qq", ""))
            if mentioned == "all" or mentioned.isdigit():
                mentions.append(mentioned)
            if mentioned == bot_id:
                direct = True
        elif kind == "reply" and scope == "group":
            value = str(payload.get("id", ""))
            if value and len(value) <= 128 and reply_id is None:
                reply_id = value
                if known_reply(target, value):
                    direct = True
        elif kind in ("image", "record"):
            segments.append(
                {
                    "type": kind,
                    "data": {
                        "url": str(payload.get("url", "")),
                        "file": str(payload.get("file", "")),
                    },
                }
            )
            text.append("[图片]" if kind == "image" else "[语音]")
            has_voice = has_voice or kind == "record"
    message_text = "".join(text).strip()[:8000]
    if scope == "group" and direct and not message_text:
        message_text = "[对方叫了你，没有附带文字]"
    now = time.time()
    stamp = data.get("time")
    if stamp is not None:
        try:
            stamp = float(stamp)
        except (TypeError, ValueError):
            return None
        if not math.isfinite(stamp) or stamp <= 0 or stamp > now + 30:
            return None
    return dict(
        event_time=stamp if stamp is not None else now,
        received_at=now,
        time_source="protocol" if stamp is not None else "received",
        scope=scope,
        target=target,
        sender=sender,
        sender_name=sender_name,
        mentions=list(dict.fromkeys(mentions)),
        reply_id=reply_id,
        message_id=str(data["message_id"]),
        text=message_text,
        segments=segments,
        direct=direct,
        has_voice=has_voice,
    )
