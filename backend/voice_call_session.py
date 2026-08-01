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
        self._retiring_tasks: set[asyncio.Task[Any]] = set()
        self._task_turns: dict[asyncio.Task[Any], int] = {}
        self._current: TurnHandle | None = None
        self._last_turn_id = 0
        self._closed = False
        self._close_complete: asyncio.Event | None = None
        self._close_waiting_tasks: frozenset[asyncio.Task[Any]] = frozenset()

    async def start_turn(self, turn_id: int) -> TurnHandle:
        async with self._lifecycle_lock:
            async with self._lock:
                if self._closed:
                    raise ProtocolError("语音会话已关闭")
                self._validate_turn_id(turn_id)
                if turn_id <= self._last_turn_id:
                    raise ProtocolError("turn_id 必须严格递增")
                old_tasks = self._tasks_except_current()
                self._retiring_tasks.update(old_tasks)
                old_handle = self._current
                self._tasks.clear()
                self._last_turn_id = turn_id
                new_handle = TurnHandle(turn_id, asyncio.Event())
                self._current = new_handle
        if old_handle is not None:
            old_handle.cancel_event.set()
        await self._cancel_and_wait(old_tasks)
        async with self._lifecycle_lock:
            async with self._lock:
                if self._current is not new_handle:
                    raise ProtocolError("轮次已失效")
        return new_handle

    def track(self, task: asyncio.Task[Any]) -> None:
        current = self._current
        if self._closed or current is None:
            task.cancel()
            return
        parent = asyncio.current_task()
        parent_turn_id = self._task_turns.get(parent) if parent is not None else None
        if parent_turn_id is not None and parent_turn_id != current.turn_id:
            task.cancel()
            return
        self._tasks.add(task)
        self._task_turns[task] = current.turn_id
        task.add_done_callback(self._untrack)

    async def cancel_turn(self, turn_id: int, reason: str) -> bool:
        _ = reason
        async with self._lifecycle_lock:
            async with self._lock:
                if self._current is None or self._current.turn_id != turn_id:
                    return False
                current = self._current
                tasks = self._tasks_except_current()
                self._retiring_tasks.update(tasks)
                self._tasks.clear()
                self._current = None
        current.cancel_event.set()
        await self._cancel_and_wait(tasks)
        return True

    def is_current(self, turn_id: int) -> bool:
        return self._current is not None and self._current.turn_id == turn_id

    async def close(self) -> None:
        caller = asyncio.current_task()
        async with self._lifecycle_lock:
            async with self._lock:
                if self._closed:
                    close_complete = self._close_complete
                    wait_for_close = caller not in self._close_waiting_tasks
                    current = None
                    tasks = ()
                    first_close = False
                else:
                    self._closed = True
                    current = self._current
                    active_tasks = self._tasks_except_current()
                    self._retiring_tasks.update(active_tasks)
                    tasks = self._all_tasks_except_current()
                    self._current = None
                    self._tasks.clear()
                    self._close_complete = asyncio.Event()
                    self._close_waiting_tasks = frozenset(tasks)
                    close_complete = self._close_complete
                    wait_for_close = False
                    first_close = True
        if not first_close:
            if wait_for_close and close_complete is not None:
                await close_complete.wait()
            return
        if current is not None:
            current.cancel_event.set()
        try:
            await self._cancel_and_wait(tasks)
        finally:
            async with self._lifecycle_lock:
                async with self._lock:
                    self._close_waiting_tasks = frozenset()
                    close_complete.set()

    def _untrack(self, task: asyncio.Task[Any]) -> None:
        self._tasks.discard(task)
        self._retiring_tasks.discard(task)
        self._task_turns.pop(task, None)

    def _tasks_except_current(self) -> tuple[asyncio.Task[Any], ...]:
        caller = asyncio.current_task()
        return tuple(task for task in self._tasks if task is not caller)

    def _all_tasks_except_current(self) -> tuple[asyncio.Task[Any], ...]:
        caller = asyncio.current_task()
        return tuple(task for task in self._tasks | self._retiring_tasks if task is not caller)

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
