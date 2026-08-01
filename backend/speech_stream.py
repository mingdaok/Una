from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Awaitable, Callable

from speech_metrics import SpeechTrace, log_speech_stage
from speech_units import SpeechUnit, SpeechUnitAggregator


@dataclass(frozen=True)
class SpeechStreamSummary:
    reply_id: str
    total: int
    succeeded: int
    failed: int
    cancelled: bool


RenderUnit = Callable[[SpeechUnit, SpeechTrace], Awaitable[bool]]


_QUEUE_SENTINEL = object()


class SpeechStreamSession:
    def __init__(
        self,
        *,
        user_id: str,
        reply_id: str,
        render_unit: RenderUnit,
        render_semaphore: asyncio.Semaphore,
        on_terminal: Callable[["SpeechStreamSession"], None],
    ):
        self.user_id = user_id
        self.reply_id = reply_id
        self._render_unit = render_unit
        self._render_semaphore = render_semaphore
        self._on_terminal = on_terminal
        self._aggregator = SpeechUnitAggregator()
        self._queue = asyncio.Queue()
        self._state_lock = asyncio.Lock()
        self._debounce_task: asyncio.Task | None = None
        self._worker_task = asyncio.create_task(self._run_worker())
        self._finished = asyncio.Event()
        self._closed = False
        self._cancelled = False
        self._total = 0
        self._succeeded = 0
        self._failed = 0

    async def add_text(self, text: str, emotion: str) -> None:
        previous_debounce = None
        async with self._state_lock:
            if self._closed or self._cancelled:
                return
            now_ms = self._now_ms()
            units = self._aggregator.add(text, emotion, now_ms)
            self._enqueue_units(units)
            previous_debounce = self._debounce_task
            if previous_debounce is not None:
                previous_debounce.cancel()
            deadline_ms = now_ms + self._aggregator.debounce_ms
            self._debounce_task = asyncio.create_task(
                self._flush_after_debounce(deadline_ms)
            )

        if previous_debounce is not None:
            await asyncio.gather(previous_debounce, return_exceptions=True)

    async def close(self) -> SpeechStreamSummary:
        owns_close = False
        debounce_task = None
        async with self._state_lock:
            if not self._closed:
                owns_close = True
                self._closed = True
                debounce_task = self._debounce_task
                self._debounce_task = None
                if debounce_task is not None:
                    debounce_task.cancel()
                self._enqueue_units(self._aggregator.close(self._now_ms()))
                self._queue.put_nowait(_QUEUE_SENTINEL)

        if owns_close:
            if debounce_task is not None:
                await asyncio.gather(debounce_task, return_exceptions=True)
            await self._queue.join()
            await asyncio.gather(self._worker_task, return_exceptions=True)
            self._mark_terminal()
        else:
            await self._finished.wait()

        return self._summary()

    async def cancel(self) -> None:
        async with self._state_lock:
            if self._cancelled:
                wait_for_existing_cancel = True
                debounce_task = None
                worker_task = None
            elif self._finished.is_set():
                return
            else:
                wait_for_existing_cancel = False
                self._cancelled = True
                self._closed = True
                debounce_task = self._debounce_task
                self._debounce_task = None
                worker_task = self._worker_task
                if debounce_task is not None:
                    debounce_task.cancel()
                worker_task.cancel()

        if wait_for_existing_cancel:
            await self._finished.wait()
            return

        tasks = [task for task in (debounce_task, worker_task) if task is not None]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self._drain_queue()
        self._mark_terminal()

    async def _flush_after_debounce(self, deadline_ms: float) -> None:
        current_task = asyncio.current_task()
        try:
            while True:
                remaining_ms = deadline_ms - self._now_ms()
                if remaining_ms <= 0:
                    break
                await asyncio.sleep(remaining_ms / 1000)
            async with self._state_lock:
                if self._closed or self._cancelled:
                    return
                self._enqueue_units(self._aggregator.flush_due(self._now_ms()))
        finally:
            if self._debounce_task is current_task:
                self._debounce_task = None

    async def _run_worker(self) -> None:
        while True:
            queued = await self._queue.get()
            try:
                if queued is _QUEUE_SENTINEL:
                    return
                if self._cancelled:
                    continue
                unit, enqueued_at_ms = queued
                trace = SpeechTrace(reply_id=self.reply_id, chunk_index=unit.index)
                async with self._render_semaphore:
                    queue_wait_ms = self._now_ms() - enqueued_at_ms
                    log_speech_stage(trace, "queue_wait", queue_wait_ms)
                    try:
                        rendered = await self._render_unit(unit, trace)
                    except asyncio.CancelledError:
                        raise
                    except Exception:
                        self._failed += 1
                        continue
                    if self._cancelled:
                        return
                    if rendered:
                        self._succeeded += 1
                    else:
                        self._failed += 1
            finally:
                self._queue.task_done()

    def _enqueue_units(self, units: list[SpeechUnit]) -> None:
        for unit in units:
            trace = SpeechTrace(reply_id=self.reply_id, chunk_index=unit.index)
            log_speech_stage(trace, "aggregate_wait", unit.aggregate_wait_ms)
            self._queue.put_nowait((unit, self._now_ms()))
            self._total += 1

    def _drain_queue(self) -> None:
        while True:
            try:
                self._queue.get_nowait()
            except asyncio.QueueEmpty:
                return
            else:
                self._queue.task_done()

    def _mark_terminal(self) -> None:
        if self._finished.is_set():
            return
        self._finished.set()
        self._on_terminal(self)

    def _summary(self) -> SpeechStreamSummary:
        return SpeechStreamSummary(
            reply_id=self.reply_id,
            total=self._total,
            succeeded=self._succeeded,
            failed=self._failed,
            cancelled=self._cancelled,
        )

    @staticmethod
    def _now_ms() -> float:
        return asyncio.get_running_loop().time() * 1000


class SpeechStreamCoordinator:
    def __init__(self, *, max_parallel_synthesis: int = 1):
        self._render_semaphore = asyncio.Semaphore(max_parallel_synthesis)
        self._sessions: dict[str, SpeechStreamSession] = {}
        self._state_lock = asyncio.Lock()

    async def begin(
        self, user_id: str, reply_id: str, render_unit: RenderUnit
    ) -> SpeechStreamSession:
        async with self._state_lock:
            previous = self._sessions.get(user_id)
            if previous is not None:
                await previous.cancel()
            session = SpeechStreamSession(
                user_id=user_id,
                reply_id=reply_id,
                render_unit=render_unit,
                render_semaphore=self._render_semaphore,
                on_terminal=self._remove_if_current,
            )
            self._sessions[user_id] = session
            return session

    async def cancel(self, user_id: str) -> None:
        async with self._state_lock:
            session = self._sessions.get(user_id)
            if session is not None:
                await session.cancel()

    def is_current(self, user_id: str, reply_id: str) -> bool:
        session = self._sessions.get(user_id)
        return (
            session is not None
            and session.reply_id == reply_id
            and not session._cancelled
        )

    def _remove_if_current(self, session: SpeechStreamSession) -> None:
        if self._sessions.get(session.user_id) is session:
            self._sessions.pop(session.user_id, None)
