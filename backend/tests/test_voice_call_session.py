import asyncio

import pytest

from voice_call_protocol import BinaryFrameHeader, ProtocolError
from voice_call_session import VoiceCallSender, VoiceCallSession


class RecordingSender:
    async def send_json(self, payload):
        return None


class YieldingConnection:
    def __init__(self):
        self.messages = []

    async def send_json(self, payload):
        self.messages.append(("json", payload))
        await asyncio.sleep(0)

    async def send_bytes(self, payload):
        self.messages.append(("bytes", payload))
        await asyncio.sleep(0)


@pytest.mark.asyncio
async def test_new_turn_cancels_old_tasks_and_rejects_late_callbacks():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())
    old = await session.start_turn(1)
    blocker = asyncio.create_task(asyncio.Event().wait())
    session.track(blocker)

    new = await session.start_turn(2)

    assert old.cancel_event.is_set()
    assert blocker.cancelled()
    assert session.is_current(1) is False
    assert session.is_current(new.turn_id) is True


@pytest.mark.asyncio
async def test_start_turn_rejects_repeated_or_decreasing_turn_ids():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())
    await session.start_turn(3)

    with pytest.raises(ProtocolError, match="严格递增"):
        await session.start_turn(3)
    with pytest.raises(ProtocolError, match="严格递增"):
        await session.start_turn(2)


@pytest.mark.asyncio
async def test_close_waits_for_tracked_tasks_to_reach_a_terminal_state():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())
    await session.start_turn(1)
    finished = asyncio.Event()

    async def wait_until_cancelled():
        try:
            await asyncio.Event().wait()
        finally:
            finished.set()

    task = asyncio.create_task(wait_until_cancelled())
    session.track(task)
    await asyncio.sleep(0)

    await session.close()

    assert task.cancelled()
    assert finished.is_set()


@pytest.mark.asyncio
async def test_cancelling_a_missing_old_turn_leaves_the_current_turn_running():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())
    current = await session.start_turn(2)
    task = asyncio.create_task(asyncio.Event().wait())
    session.track(task)

    cancelled = await session.cancel_turn(1, "client_interrupt")

    assert cancelled is False
    assert current.cancel_event.is_set() is False
    assert task.cancelled() is False
    assert session.is_current(2) is True
    await session.close()


@pytest.mark.asyncio
async def test_send_pcm_keeps_each_metadata_and_bytes_pair_adjacent():
    connection = YieldingConnection()
    sender = VoiceCallSender(connection)
    first = BinaryFrameHeader("s1", "output", 1, 0, 2)
    second = BinaryFrameHeader("s1", "output", 1, 1, 2)

    await asyncio.gather(
        sender.send_pcm(first, b"\x00\x01"),
        sender.send_pcm(second, b"\x02\x03"),
    )

    assert connection.messages in (
        [
            ("json", {"type": "output_audio_chunk", "session_id": "s1", "turn_id": 1, "direction": "output", "sequence": 0, "byte_length": 2}),
            ("bytes", b"\x00\x01"),
            ("json", {"type": "output_audio_chunk", "session_id": "s1", "turn_id": 1, "direction": "output", "sequence": 1, "byte_length": 2}),
            ("bytes", b"\x02\x03"),
        ],
        [
            ("json", {"type": "output_audio_chunk", "session_id": "s1", "turn_id": 1, "direction": "output", "sequence": 1, "byte_length": 2}),
            ("bytes", b"\x02\x03"),
            ("json", {"type": "output_audio_chunk", "session_id": "s1", "turn_id": 1, "direction": "output", "sequence": 0, "byte_length": 2}),
            ("bytes", b"\x00\x01"),
        ],
    )


@pytest.mark.asyncio
async def test_send_pcm_rejects_a_payload_with_a_different_declared_length():
    sender = VoiceCallSender(YieldingConnection())
    header = BinaryFrameHeader("s1", "output", 1, 0, 2)

    with pytest.raises(ProtocolError, match="byte_length"):
        await sender.send_pcm(header, b"\x00\x01\x02\x03")
