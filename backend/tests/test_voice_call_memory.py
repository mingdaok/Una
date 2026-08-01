import asyncio
import threading
import time
from dataclasses import FrozenInstanceError

import pytest

from voice_call_memory import CallMemorySnapshot, VoiceCallMemory
from voice_call_session import VoiceCallSession


class FakeDatabase:
    def __init__(self, profile="", history=None):
        self.profile = profile
        self.history = list(history or [])
        self.calls = []
        self._lock = threading.Lock()

    def get_user_profile(self, user_id):
        with self._lock:
            self.calls.append(("profile", user_id))
        return self.profile

    def get_recent_history(self, user_id, limit):
        with self._lock:
            self.calls.append(("history", user_id, limit))
        return self.history[-limit:]

    def add_message(self, user_id, role, content, mood_score=0, audio_path=None):
        with self._lock:
            self.calls.append(("add", user_id, role, content, mood_score, audio_path))


class BlockingMemoryService:
    def __init__(self):
        self.queries = []
        self.remembered = []
        self.remembered_event = threading.Event()
        self._lock = threading.Lock()

    def recall(self, user_id, query):
        with self._lock:
            self.queries.append((user_id, query))
        time.sleep(0.05)
        return "too late"

    def remember(self, user_id, user_text, ai_text, emotion):
        with self._lock:
            self.remembered.append((user_id, user_text, ai_text, emotion))
        self.remembered_event.set()


class FailingMemoryService:
    def recall(self, user_id, query):
        raise RuntimeError("vector store unavailable")

    def remember(self, user_id, user_text, ai_text, emotion):
        raise RuntimeError("vector write unavailable")


class WaitingMemoryService:
    def __init__(self):
        self.started = threading.Event()
        self.release = threading.Event()

    def recall(self, user_id, query):
        return ""

    def remember(self, user_id, user_text, ai_text, emotion):
        self.started.set()
        self.release.wait()


class RecordingSender:
    async def send_json(self, payload):
        return None


@pytest.mark.asyncio
async def test_slow_vector_recall_does_not_block_snapshot():
    storage = FakeDatabase(profile="喜欢猫", history=[{"role": "user", "content": "早安"}])
    memory = BlockingMemoryService()
    service = VoiceCallMemory(storage, memory, recall_timeout_ms=10)

    started = time.monotonic()
    snapshot = await service.load("u1")
    elapsed = time.monotonic() - started

    assert snapshot.user_id == "u1"
    assert snapshot.profile == "喜欢猫"
    assert snapshot.long_term_memory == ""
    assert memory.queries == [("u1", "早安")]
    assert elapsed < 0.04


@pytest.mark.asyncio
async def test_vector_recall_exception_degrades_to_an_empty_memory_snapshot():
    service = VoiceCallMemory(FakeDatabase(profile="档案"), FailingMemoryService())

    snapshot = await service.load("u1")

    assert snapshot.profile == "档案"
    assert snapshot.long_term_memory == ""


def test_default_recall_budget_is_150_milliseconds():
    service = VoiceCallMemory(FakeDatabase(), BlockingMemoryService())

    assert service.recall_timeout_ms == 150


@pytest.mark.asyncio
async def test_load_limits_recent_history_to_twenty_messages():
    history = [{"role": "user", "content": f"消息 {index}"} for index in range(25)]
    storage = FakeDatabase(history=history)
    service = VoiceCallMemory(storage, BlockingMemoryService(), recall_timeout_ms=1)

    snapshot = await service.load("u1")

    assert len(snapshot.recent_history) == 20
    assert snapshot.recent_history[0]["content"] == "消息 5"
    assert ("history", "u1", 20) in storage.calls


def test_appending_messages_returns_a_new_immutable_snapshot():
    original = CallMemorySnapshot("u1", "档案", ({"role": "user", "content": "早安"},), "记忆")
    service = VoiceCallMemory(FakeDatabase(), BlockingMemoryService())

    after_user = service.append_user(original, "今天天气不错")
    after_ai = service.append_ai(after_user, "适合散步")

    assert original.recent_history == ({"role": "user", "content": "早安"},)
    assert after_ai.recent_history == (
        {"role": "user", "content": "早安"},
        {"role": "user", "content": "今天天气不错"},
        {"role": "assistant", "content": "适合散步"},
    )
    with pytest.raises(FrozenInstanceError):
        after_ai.profile = "changed"


@pytest.mark.asyncio
async def test_all_reads_and_writes_keep_the_same_user_id():
    storage = FakeDatabase(history=[{"role": "user", "content": "hello"}])
    memory = BlockingMemoryService()
    service = VoiceCallMemory(storage, memory, recall_timeout_ms=10)

    snapshot = await service.load("user-a")
    await service.persist_user_text(snapshot, "final asr")
    await service.persist_ai_completion(snapshot, "final asr", "complete reply", "happy", 7)
    await asyncio.to_thread(memory.remembered_event.wait, 0.2)

    assert all(call[1] == "user-a" for call in storage.calls)
    assert memory.queries[0][0] == "user-a"
    assert memory.remembered == [("user-a", "final asr", "complete reply", "happy")]


@pytest.mark.asyncio
async def test_final_asr_text_is_persisted_immediately_as_user_history():
    storage = FakeDatabase()
    service = VoiceCallMemory(storage, BlockingMemoryService())
    snapshot = CallMemorySnapshot("u1", "", (), "")

    await service.persist_user_text(snapshot, "最终识别文本")

    assert storage.calls == [("add", "u1", "user", "最终识别文本", 0, None)]


@pytest.mark.asyncio
async def test_cancelled_empty_ai_reply_is_not_persisted_or_remembered():
    storage = FakeDatabase()
    memory = BlockingMemoryService()
    service = VoiceCallMemory(storage, memory)
    snapshot = CallMemorySnapshot("u1", "", (), "")

    await service.persist_ai_completion(snapshot, "用户文本", "  ", "neutral", 0)
    await asyncio.sleep(0)

    assert storage.calls == []
    assert memory.remembered == []


@pytest.mark.asyncio
async def test_complete_ai_reply_reaches_sqlite_before_background_memory():
    storage = FakeDatabase()
    memory = BlockingMemoryService()
    service = VoiceCallMemory(storage, memory)
    snapshot = CallMemorySnapshot("u1", "", (), "")

    await service.persist_ai_completion(snapshot, "用户文本", "完整回复", "happy", 9)
    assert storage.calls == [("add", "u1", "assistant", "完整回复", 9, None)]

    assert await asyncio.to_thread(memory.remembered_event.wait, 0.2)
    assert memory.remembered == [("u1", "用户文本", "完整回复", "happy")]


@pytest.mark.asyncio
async def test_background_remember_exception_is_consumed_by_its_done_callback():
    service = VoiceCallMemory(FakeDatabase(), FailingMemoryService())
    snapshot = CallMemorySnapshot("u1", "", (), "")
    loop = asyncio.get_running_loop()
    unhandled = []
    original_handler = loop.get_exception_handler()
    loop.set_exception_handler(lambda _loop, context: unhandled.append(context))

    try:
        await service.persist_ai_completion(snapshot, "用户文本", "完整回复", "happy", 9)
        await asyncio.sleep(0.05)
    finally:
        loop.set_exception_handler(original_handler)

    assert unhandled == []


@pytest.mark.asyncio
async def test_memory_task_tracker_uses_session_finalizer_across_turn_changes():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())
    await session.start_turn(1)
    memory = WaitingMemoryService()
    service = VoiceCallMemory(FakeDatabase(), memory, task_tracker=session.track_finalizer)
    snapshot = CallMemorySnapshot("u1", "", (), "")

    await service.persist_ai_completion(snapshot, "用户文本", "完整回复", "happy", 9)
    assert await asyncio.to_thread(memory.started.wait, 0.2)
    await session.start_turn(2)
    closing = asyncio.create_task(session.close())
    await asyncio.sleep(0)

    assert closing.done() is False
    memory.release.set()
    await closing
