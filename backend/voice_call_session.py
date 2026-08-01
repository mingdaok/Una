"""Session ownership and ordered sending for local realtime voice calls."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

from voice_call_protocol import MAX_TURN_ID, BinaryFrameHeader, ProtocolError


@dataclass(frozen=True)
class TurnHandle:
    turn_id: int
    cancel_event: asyncio.Event


class VoiceCallSender:
    """Serialize control messages and binary PCM frames on one connection."""

    def __init__(self, connection: Any) -> None:
        self._connection = connection
        self._send_lock = asyncio.Lock()

    async def send_json(self, payload: dict[str, object]) -> None:
        async with self._send_lock:
            await self._connection.send_json(payload)

    async def send_pcm(self, header: BinaryFrameHeader, payload: bytes) -> None:
        if len(payload) != header.byte_length:
            raise ProtocolError("PCM payload 长度与 byte_length 不一致")
        if header.direction != "output":
            raise ProtocolError("direction 必须为 output")
        metadata: dict[str, object] = {
            "type": "output_audio_chunk",
            "session_id": header.session_id,
            "turn_id": header.turn_id,
            "direction": header.direction,
            "sequence": header.sequence,
            "byte_length": header.byte_length,
        }
        async with self._send_lock:
            await self._connection.send_json(metadata)
            await self._connection.send_bytes(payload)


class VoiceCallSession:
    """Own exactly one active turn and its background tasks at a time."""

    def __init__(self, user_id: str, session_id: str, sender: VoiceCallSender | Any) -> None:
        self.user_id = user_id
        self.session_id = session_id
        self.sender = sender
        self._lifecycle_lock = asyncio.Lock()
        self._lock = asyncio.Lock()
        self._tasks: set[asyncio.Task[Any]] = set()
        self._current: TurnHandle | None = None
        self._last_turn_id = 0
        self._closed = False

    async def start_turn(self, turn_id: int) -> TurnHandle:
        async with self._lifecycle_lock:
            async with self._lock:
                if self._closed:
                    raise ProtocolError("语音会话已关闭")
                self._validate_turn_id(turn_id)
                if turn_id <= self._last_turn_id:
                    raise ProtocolError("turn_id 必须严格递增")
                old_tasks = tuple(self._tasks)
                old_handle = self._current
                self._tasks.clear()
                self._last_turn_id = turn_id
                new_handle = TurnHandle(turn_id, asyncio.Event())
                self._current = new_handle
            if old_handle is not None:
                old_handle.cancel_event.set()
            await self._cancel_and_wait(old_tasks)
            return new_handle

    def track(self, task: asyncio.Task[Any]) -> None:
        if self._closed:
            task.cancel()
            return
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def cancel_turn(self, turn_id: int, reason: str) -> bool:
        _ = reason
        async with self._lifecycle_lock:
            async with self._lock:
                if self._current is None or self._current.turn_id != turn_id:
                    return False
                current = self._current
                tasks = tuple(self._tasks)
                self._tasks.clear()
                self._current = None
            current.cancel_event.set()
            await self._cancel_and_wait(tasks)
            return True

    def is_current(self, turn_id: int) -> bool:
        return self._current is not None and self._current.turn_id == turn_id

    async def close(self) -> None:
        async with self._lifecycle_lock:
            async with self._lock:
                if self._closed:
                    return
                self._closed = True
                current = self._current
                tasks = tuple(self._tasks)
                self._current = None
                self._tasks.clear()
            if current is not None:
                current.cancel_event.set()
            await self._cancel_and_wait(tasks)

    @staticmethod
    def _validate_turn_id(turn_id: object) -> None:
        if (
            not isinstance(turn_id, int)
            or isinstance(turn_id, bool)
            or not 0 < turn_id <= MAX_TURN_ID
        ):
            raise ProtocolError("turn_id 必须为正整数")

    @staticmethod
    async def _cancel_and_wait(tasks: tuple[asyncio.Task[Any], ...]) -> None:
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
