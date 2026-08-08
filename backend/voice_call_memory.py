"""Bounded memory snapshots and persistence for local realtime voice calls."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from types import MappingProxyType
from typing import Any, Callable, Mapping, Sequence


HistoryItem = Mapping[str, Any]
TaskTracker = Callable[[asyncio.Task[None]], None]
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CallMemorySnapshot:
    """The immutable memory context assigned to one voice-call turn."""

    user_id: str
    profile: str
    recent_history: tuple[HistoryItem, ...]
    long_term_memory: str


class VoiceCallMemory:
    """Load bounded context promptly and persist completed conversation turns."""

    _RECENT_HISTORY_LIMIT = 20
    _RECALL_HISTORY_LIMIT = 4

    def __init__(
        self,
        database: Any,
        memory_service: Any,
        recall_timeout_ms: int = 150,
        task_tracker: TaskTracker | None = None,
    ) -> None:
        self.database = database
        self.memory_service = memory_service
        self.recall_timeout_ms = recall_timeout_ms
        self._task_tracker = task_tracker
        self._background_tasks: set[asyncio.Task[None]] = set()

    async def load(self, user_id: str) -> CallMemorySnapshot:
        profile, history = await asyncio.gather(
            asyncio.to_thread(self.database.get_user_profile, user_id),
            asyncio.to_thread(
                self.database.get_recent_history,
                user_id,
                self._RECENT_HISTORY_LIMIT,
            ),
        )
        recent_history = self._freeze_history((history or [])[-self._RECENT_HISTORY_LIMIT :])
        query = "\n".join(
            str(item.get("content", "")) for item in recent_history[-self._RECALL_HISTORY_LIMIT :]
        ).strip() or "日常陪伴"
        recall_task = asyncio.create_task(
            asyncio.to_thread(self.memory_service.recall, user_id, query)
        )
        try:
            await asyncio.sleep(0)
            try:
                long_term_memory = await asyncio.wait_for(
                    asyncio.shield(recall_task),
                    timeout=self.recall_timeout_ms / 1000,
                )
            except asyncio.TimeoutError:
                long_term_memory = ""
                recall_task.add_done_callback(self._consume_task_exception)
            except Exception:
                long_term_memory = ""
        except asyncio.CancelledError:
            recall_task.add_done_callback(self._consume_task_exception)
            raise
        return CallMemorySnapshot(
            user_id=user_id,
            profile=profile or "",
            recent_history=recent_history,
            long_term_memory=long_term_memory or "",
        )

    def append_user(self, snapshot: CallMemorySnapshot, user_text: str) -> CallMemorySnapshot:
        return self._append(snapshot, "user", user_text)

    def append_ai(self, snapshot: CallMemorySnapshot, ai_text: str) -> CallMemorySnapshot:
        return self._append(snapshot, "assistant", ai_text)

    async def persist_user_text(self, snapshot: CallMemorySnapshot, user_text: str) -> None:
        await asyncio.to_thread(
            self.database.add_message,
            snapshot.user_id,
            "user",
            user_text,
            0,
            None,
        )

    async def persist_ai_completion(
        self,
        snapshot: CallMemorySnapshot,
        user_text: str,
        ai_text: str,
        emotion: str,
        mood_score: int,
    ) -> None:
        if not ai_text.strip():
            return
        await asyncio.to_thread(
            self.database.add_message,
            snapshot.user_id,
            "assistant",
            ai_text,
            mood_score,
            None,
        )
        self._track_background_task(
            asyncio.create_task(
                asyncio.to_thread(
                    self.memory_service.remember,
                    snapshot.user_id,
                    user_text,
                    ai_text,
                    emotion,
                )
            )
        )

    def _append(
        self,
        snapshot: CallMemorySnapshot,
        role: str,
        content: str,
    ) -> CallMemorySnapshot:
        history = self._freeze_history(
            (*snapshot.recent_history, {"role": role, "content": content})[
                -self._RECENT_HISTORY_LIMIT :
            ]
        )
        return CallMemorySnapshot(
            user_id=snapshot.user_id,
            profile=snapshot.profile,
            recent_history=history,
            long_term_memory=snapshot.long_term_memory,
        )

    def _track_background_task(self, task: asyncio.Task[None]) -> None:
        self._background_tasks.add(task)
        task.add_done_callback(self._consume_task_exception)
        task.add_done_callback(self._background_tasks.discard)
        if self._task_tracker is not None:
            self._task_tracker(task)

    @staticmethod
    def _consume_task_exception(task: asyncio.Task[Any]) -> None:
        if task.cancelled():
            return
        try:
            task.result()
        except Exception:
            logger.exception("Voice call memory background task failed")

    @staticmethod
    def _freeze_history(history: Sequence[Mapping[str, Any]]) -> tuple[HistoryItem, ...]:
        return tuple(MappingProxyType(dict(item)) for item in history)
