import asyncio
import os
import sys

import pytest


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from voice_call_memory import CallMemorySnapshot
from voice_call_protocol import MAX_INPUT_BYTES, BinaryFrameHeader, ProtocolError
from voice_call_service import VoiceCallService
from voice_call_tts import GptSovitsUnavailable


class RecordingSender:
    def __init__(self):
        self.events = []

    async def send_json(self, payload):
        self.events.append(dict(payload))

    async def send_pcm(self, header, payload):
        self.events.append({
            "type": "output_audio_chunk",
            "turn_id": header.turn_id,
            "sequence": header.sequence,
            "payload": bytes(payload),
        })

    def types(self):
        return [event["type"] for event in self.events]

    def audio_sequences(self):
        return [event["sequence"] for event in self.events if event["type"] == "output_audio_chunk"]


class FakeAsr:
    def __init__(self, result=("今天有点累", "sad")):
        self.result = result
        self.calls = []

    def recognize_pcm16(self, pcm, sample_rate):
        self.calls.append((bytes(pcm), sample_rate))
        return self.result


class FakeBrain:
    def __init__(self, events=None, gate=None, failure=None):
        self.events = events or [
            {"type": "meta", "emotion": "gentle", "mood_score": -1},
            {"type": "sentence", "text": "那就先靠一会儿。"},
            {"type": "sentence", "text": "我在这里陪你。"},
        ]
        self.gate = gate
        self.failure = failure
        self.calls = []

    async def chat_voice_stream(self, user_id, user_text, **context):
        self.calls.append((user_id, user_text, context))
        for event in self.events:
            yield event
        if self.gate is not None:
            await self.gate.wait()
        if self.failure is not None:
            raise self.failure


class FakeMemory:
    def __init__(self):
        self.saved_users = []
        self.saved_ai = []

    async def load(self, user_id):
        return CallMemorySnapshot(user_id, "喜欢猫", (), "记得一次散步")

    def append_user(self, snapshot, text):
        return CallMemorySnapshot(
            snapshot.user_id,
            snapshot.profile,
            snapshot.recent_history + ({"role": "user", "content": text},),
            snapshot.long_term_memory,
        )

    def append_ai(self, snapshot, text):
        return CallMemorySnapshot(
            snapshot.user_id,
            snapshot.profile,
            snapshot.recent_history + ({"role": "assistant", "content": text},),
            snapshot.long_term_memory,
        )

    async def persist_user_text(self, snapshot, text):
        self.saved_users.append((snapshot.user_id, text))

    async def persist_ai_completion(
        self, snapshot, user_text, ai_text, emotion, mood_score, *, task_tracker=None,
    ):
        self.saved_ai.append((snapshot.user_id, ai_text))


class BlockingUserMemory(FakeMemory):
    def __init__(self):
        super().__init__()
        self.persist_started = asyncio.Event()
        self.allow_persist = asyncio.Event()

    async def persist_user_text(self, snapshot, text):
        self.persist_started.set()
        await self.allow_persist.wait()
        await super().persist_user_text(snapshot, text)


class FakeTts:
    sample_rate = 32000
    channels = 1
    sample_width = 2

    def __init__(self, chunks=None, failure=None, gate=None):
        self.chunks = chunks or [b"\x00\x01", b"\x02\x03"]
        self.failure = failure
        self.gate = gate
        self.calls = []
        self.closed = False

    async def stream(self, text, emotion, cancel_event):
        self.calls.append((text, emotion))
        if self.gate is not None:
            await self.gate.wait()
        if self.failure is not None:
            raise self.failure
        for chunk in self.chunks:
            if cancel_event.is_set():
                raise asyncio.CancelledError
            yield chunk

    async def close(self):
        self.closed = True


def make_service(*, asr=None, brain=None, memory=None, tts=None, **options):
    return VoiceCallService(
        asr or FakeAsr(),
        brain or FakeBrain(),
        memory or FakeMemory(),
        tts or FakeTts(),
        **options,
    )


def input_header(session_id, turn_id=1, sequence=0, byte_length=4):
    return BinaryFrameHeader(session_id, "input", turn_id, sequence, byte_length)


async def complete_input(service, session, turn_id=1, pcm=b"\x00\x00\x00\x00"):
    await service.handle_speech_start(session, turn_id)
    await service.handle_audio(
        session,
        input_header(session.session_id, turn_id, 0, len(pcm)),
        pcm,
    )
    await service.handle_speech_end(session, turn_id)


@pytest.mark.asyncio
async def test_completed_turn_emits_ordered_transcript_text_and_pcm():
    sender = RecordingSender()
    service = make_service()
    session = await service.open_session("u1", sender)

    await complete_input(service, session)
    await session.wait_until_idle()

    types = sender.types()
    assert types.index("transcript_final") < types.index("assistant_text_delta")
    assert types.index("tts_start") < types.index("output_audio_chunk")
    assert types.index("output_audio_chunk") < types.index("tts_end")
    assert sender.audio_sequences() == [0, 1, 2, 3]
    assert service.memory.saved_users == [("u1", "今天有点累")]
    assert service.memory.saved_ai == [("u1", "那就先靠一会儿。我在这里陪你。")]
    assert service.brain.calls[0][1] == "今天有点累"
    transcript = next(event for event in sender.events if event["type"] == "transcript_final")
    assert set(transcript) == {"type", "session_id", "turn_id", "text"}


@pytest.mark.asyncio
async def test_input_requires_contiguous_sequence_matching_length_and_cap():
    service = make_service()
    session = await service.open_session("u1", RecordingSender())
    await service.handle_speech_start(session, 1)

    with pytest.raises(ProtocolError, match="sequence"):
        await service.handle_audio(session, input_header(session.session_id, sequence=1), b"\x00" * 4)
    with pytest.raises(ProtocolError, match="长度"):
        await service.handle_audio(session, input_header(session.session_id), b"\x00" * 2)

    state = service._states[session.session_id]
    state.input_pcm.extend(b"\x00" * MAX_INPUT_BYTES)
    with pytest.raises(ProtocolError, match=str(MAX_INPUT_BYTES)):
        await service.handle_audio(session, input_header(session.session_id, byte_length=2), b"\x00\x00")


@pytest.mark.asyncio
async def test_speech_end_closes_input_and_cannot_be_repeated():
    service = make_service()
    session = await service.open_session("u1", RecordingSender())
    await service.handle_speech_start(session, 1)
    await service.handle_speech_end(session, 1)

    with pytest.raises(ProtocolError, match="不再接收音频"):
        await service.handle_audio(
            session,
            input_header(session.session_id, byte_length=2),
            b"\x00\x00",
        )
    with pytest.raises(ProtocolError, match="已经结束录音"):
        await service.handle_speech_end(session, 1)

    await session.wait_until_idle()


@pytest.mark.asyncio
async def test_empty_asr_sends_error_without_starting_llm_or_tts():
    service = make_service(asr=FakeAsr(("", "neutral")))
    sender = RecordingSender()
    session = await service.open_session("u1", sender)

    await complete_input(service, session)
    await session.wait_until_idle()

    assert [event["code"] for event in sender.events if event["type"] == "call_error"] == ["ASR_EMPTY"]
    assert service.brain.calls == []
    assert service.tts.calls == []


@pytest.mark.asyncio
async def test_llm_and_tts_failures_have_terminal_errors():
    llm_sender = RecordingSender()
    llm_service = make_service(brain=FakeBrain(events=[], failure=RuntimeError("llm")))
    llm_session = await llm_service.open_session("u1", llm_sender)
    await complete_input(llm_service, llm_session)
    await llm_session.wait_until_idle()
    assert any(event.get("code") == "LLM_FAILED" for event in llm_sender.events)

    tts_sender = RecordingSender()
    tts_service = make_service(tts=FakeTts(failure=GptSovitsUnavailable("down")))
    tts_session = await tts_service.open_session("u1", tts_sender)
    await complete_input(tts_service, tts_session)
    await tts_session.wait_until_idle()
    assert any(event.get("code") == "TTS_FAILED" for event in tts_sender.events)
    assert tts_sender.types()[-1] == "tts_end"


@pytest.mark.asyncio
async def test_interrupt_keeps_user_text_but_drops_incomplete_ai_and_late_pcm():
    brain_gate = asyncio.Event()
    memory = FakeMemory()
    sender = RecordingSender()
    service = make_service(brain=FakeBrain(gate=brain_gate), memory=memory)
    session = await service.open_session("u1", sender)
    await complete_input(service, session)

    for _ in range(100):
        if memory.saved_users:
            break
        await asyncio.sleep(0)
    await service.interrupt(session, 1)
    brain_gate.set()
    await session.wait_until_idle()

    assert memory.saved_users == [("u1", "今天有点累")]
    assert memory.saved_ai == []
    assert sender.types()[-1] == "turn_cancelled"


@pytest.mark.asyncio
async def test_interrupt_waits_for_user_transcript_to_be_saved_durably():
    memory = BlockingUserMemory()
    sender = RecordingSender()
    service = make_service(memory=memory)
    session = await service.open_session("u1", sender)
    await complete_input(service, session)
    await asyncio.wait_for(memory.persist_started.wait(), timeout=1)

    interrupt_task = asyncio.create_task(service.interrupt(session, 1))
    await asyncio.sleep(0)
    assert not interrupt_task.done()

    memory.allow_persist.set()
    await asyncio.wait_for(interrupt_task, timeout=1)
    await session.wait_until_idle()

    assert memory.saved_users == [("u1", "今天有点累")]
    assert memory.saved_ai == []
    assert sender.types()[-1] == "turn_cancelled"


@pytest.mark.asyncio
async def test_sessions_use_unique_server_generated_ids_and_close_resources():
    service = make_service()
    first = await service.open_session("u1", RecordingSender())
    second = await service.open_session("u1", RecordingSender())

    assert first.session_id != second.session_id
    await service.close()
    assert service.tts.closed is True
    assert service._sessions == {}


@pytest.mark.asyncio
async def test_turn_reports_only_structural_latency_metrics():
    metrics = []
    service = make_service(metric_logger=metrics.append)
    session = await service.open_session("u1", RecordingSender())

    await complete_input(service, session)
    await session.wait_until_idle()

    stages = {metric["stage"] for metric in metrics}
    assert {
        "memory_snapshot", "pcm_received", "asr", "llm_first_text",
        "tts_first_byte", "ws_delivery",
    }.issubset(stages)
    assert all(metric["session_id"] == session.session_id for metric in metrics)
    assert all("text" not in metric and "pcm" not in metric and "ticket" not in metric for metric in metrics)
    assert all(metric["duration_ms"] >= 0 for metric in metrics)
