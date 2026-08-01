from __future__ import annotations

import asyncio
from typing import Awaitable, Callable

from speech_stream import (
    RenderUnit,
    SpeechStreamCoordinator,
    SpeechStreamSession,
    SpeechStreamSummary,
)


Broadcast = Callable[[str, dict], Awaitable[None]]


class SpeechReplyDelivery:
    def __init__(
        self,
        *,
        coordinator: SpeechStreamCoordinator,
        user_id: str,
        reply_id: str,
        broadcast: Broadcast,
        render_unit: RenderUnit,
    ):
        self._coordinator = coordinator
        self._user_id = user_id
        self._reply_id = reply_id
        self._broadcast = broadcast
        self._render_unit = render_unit
        self._session: SpeechStreamSession | None = None
        self._broadcast_task: asyncio.Task | None = None
        self._active = False

    async def start(self) -> None:
        if self._session is not None:
            return
        self._active = True
        self._session = await self._coordinator.begin(
            self._user_id,
            self._reply_id,
            self._render_unit,
            on_superseded=self._invalidate,
        )
        if self._active:
            try:
                await self._broadcast_if_active({
                    "type": "audio_stream_start",
                    "reply_id": self._reply_id,
                })
            except BaseException:
                await self.cancel()
                raise

    async def add_text(self, text: str, emotion: str) -> None:
        if not self._active or self._session is None:
            return
        await self._session.add_text(text, emotion)

    async def finish(self, *, full_text: str) -> SpeechStreamSummary:
        if self._session is None:
            raise RuntimeError("speech delivery must be started before finish")
        summary = await self._session.close()
        try:
            if self._active and not summary.cancelled:
                await self._broadcast_if_active({
                    "type": "audio_stream_end",
                    "reply_id": self._reply_id,
                    "full_text": full_text,
                    "failed_chunks": summary.failed,
                })
        finally:
            self._active = False
            self._coordinator.release_reply(self._user_id, self._reply_id)
        return summary

    async def cancel(self) -> None:
        if not self._active:
            return
        self._invalidate()
        if self._session is not None:
            await self._session.cancel()
        self._coordinator.release_reply(self._user_id, self._reply_id)

    async def _broadcast_if_active(self, event: dict) -> None:
        if not self._active:
            return
        task = asyncio.create_task(self._broadcast(self._user_id, event))
        self._broadcast_task = task
        try:
            result = (await asyncio.gather(task, return_exceptions=True))[0]
            if isinstance(result, asyncio.CancelledError):
                return
            if isinstance(result, BaseException):
                raise result
        finally:
            if self._broadcast_task is task:
                self._broadcast_task = None

    def _invalidate(self) -> None:
        self._active = False
        task = self._broadcast_task
        if task is not None and not task.done():
            task.cancel()
