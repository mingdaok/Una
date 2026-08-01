import asyncio

import pytest

from voice_call_protocol import MAX_TURN_ID, BinaryFrameHeader, ProtocolError
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
@pytest.mark.parametrize("turn_id", [True, 1.0, MAX_TURN_ID + 1])
async def test_start_turn_rejects_values_outside_task_1_safe_integer_domain(turn_id):
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())

    with pytest.raises(ProtocolError, match="turn_id"):
        await session.start_turn(turn_id)


@pytest.mark.asyncio
async def test_start_turn_rejects_a_handle_superseded_while_waiting_for_old_tasks():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())
    await session.start_turn(1)
    cancellation_started = asyncio.Event()
    release_cancelled_task = asyncio.Event()

    async def block_cancellation():
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancellation_started.set()
            await release_cancelled_task.wait()
            raise

    blocker = asyncio.create_task(block_cancellation())
    session.track(blocker)
    await asyncio.sleep(0)
    second_start = asyncio.create_task(session.start_turn(2))
    await cancellation_started.wait()
    third_start = asyncio.create_task(session.start_turn(3))
    await asyncio.sleep(0)
    release_cancelled_task.set()

    with pytest.raises(ProtocolError, match="已失效"):
        await second_start
    third = await third_start

    assert third.turn_id == 3
    assert session.is_current(3) is True


@pytest.mark.asyncio
async def test_completed_tracked_task_is_released_from_session_ownership():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())
    await session.start_turn(1)
    task = asyncio.create_task(asyncio.sleep(0))
    session.track(task)

    await task

    assert task not in session._tasks


@pytest.mark.asyncio
async def test_cancelled_task_can_close_the_session_from_finally_without_deadlocking():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())
    await session.start_turn(1)

    async def close_in_cancellation_cleanup():
        try:
            await asyncio.Event().wait()
        finally:
            await session.close()

    task = asyncio.create_task(close_in_cancellation_cleanup())
    session.track(task)
    await asyncio.sleep(0)

    with pytest.raises(ProtocolError, match="已失效"):
        await asyncio.wait_for(session.start_turn(2), timeout=0.1)

    assert task.cancelled()


@pytest.mark.asyncio
async def test_old_task_cleanup_cannot_track_a_child_into_the_new_turn():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())
    await session.start_turn(1)
    children = []

    async def create_child_in_cancellation_cleanup():
        try:
            await asyncio.Event().wait()
        finally:
            child = asyncio.create_task(asyncio.Event().wait())
            children.append(child)
            session.track(child)

    task = asyncio.create_task(create_child_in_cancellation_cleanup())
    session.track(task)
    await asyncio.sleep(0)

    current = await session.start_turn(2)
    child = children[0]
    await asyncio.sleep(0)

    assert child.cancelled()
    assert child not in session._tasks
    assert session.is_current(current.turn_id)


@pytest.mark.asyncio
async def test_tracked_task_can_start_a_new_turn_without_cancelling_or_waiting_for_itself():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())
    await session.start_turn(1)

    async def start_from_tracked_task():
        return await session.start_turn(2)

    task = asyncio.create_task(start_from_tracked_task())
    session.track(task)
    await asyncio.sleep(0)

    handle = await asyncio.wait_for(task, timeout=0.1)

    assert handle.turn_id == 2
    assert session.is_current(2)


@pytest.mark.asyncio
async def test_tracked_task_can_cancel_its_turn_without_cancelling_or_waiting_for_itself():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())
    await session.start_turn(1)

    async def cancel_from_tracked_task():
        return await session.cancel_turn(1, "client_interrupt")

    task = asyncio.create_task(cancel_from_tracked_task())
    session.track(task)
    await asyncio.sleep(0)

    assert await asyncio.wait_for(task, timeout=0.1) is True
    assert session.is_current(1) is False


@pytest.mark.asyncio
async def test_tracked_task_can_close_without_cancelling_or_waiting_for_itself():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())
    await session.start_turn(1)

    async def close_from_tracked_task():
        await session.close()

    task = asyncio.create_task(close_from_tracked_task())
    session.track(task)
    await asyncio.sleep(0)

    await asyncio.wait_for(task, timeout=0.1)
    with pytest.raises(ProtocolError, match="关闭"):
        await session.start_turn(2)


@pytest.mark.asyncio
async def test_concurrent_external_close_waits_for_the_first_close_to_finish():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())
    await session.start_turn(1)
    cancellation_started = asyncio.Event()
    release_cancelled_task = asyncio.Event()

    async def block_cancellation():
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancellation_started.set()
            await release_cancelled_task.wait()
            raise

    task = asyncio.create_task(block_cancellation())
    session.track(task)
    await asyncio.sleep(0)
    first_close = asyncio.create_task(session.close())
    await cancellation_started.wait()
    second_close = asyncio.create_task(session.close())

    try:
        await asyncio.sleep(0)
        assert second_close.done() is False
    finally:
        release_cancelled_task.set()

    await first_close
    await second_close


@pytest.mark.asyncio
async def test_task_waited_by_close_can_reenter_close_without_waiting_for_completion():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())
    await session.start_turn(1)

    async def close_again_in_cancellation_cleanup():
        try:
            await asyncio.Event().wait()
        finally:
            await session.close()

    task = asyncio.create_task(close_again_in_cancellation_cleanup())
    session.track(task)
    await asyncio.sleep(0)

    await asyncio.wait_for(session.close(), timeout=0.1)

    assert task.cancelled()


@pytest.mark.asyncio
async def test_close_without_an_active_turn_completes_for_following_callers():
    session = VoiceCallSession(user_id="u1", session_id="s1", sender=RecordingSender())

    await session.close()
    await asyncio.wait_for(session.close(), timeout=0.1)


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


@pytest.mark.asyncio
async def test_send_pcm_rejects_input_direction_headers():
    sender = VoiceCallSender(YieldingConnection())
    header = BinaryFrameHeader("s1", "input", 1, 0, 2)

    with pytest.raises(ProtocolError, match="direction"):
        await sender.send_pcm(header, b"\x00\x01")


@pytest.mark.asyncio
async def test_send_json_cannot_interleave_a_pcm_metadata_and_bytes_pair():
    connection = YieldingConnection()
    sender = VoiceCallSender(connection)
    header = BinaryFrameHeader("s1", "output", 1, 0, 2)

    pcm_send = asyncio.create_task(sender.send_pcm(header, b"\x00\x01"))
    await asyncio.sleep(0)
    json_send = asyncio.create_task(sender.send_json({"type": "pong"}))
    await asyncio.gather(pcm_send, json_send)

    assert connection.messages == [
        ("json", {"type": "output_audio_chunk", "session_id": "s1", "turn_id": 1, "direction": "output", "sequence": 0, "byte_length": 2}),
        ("bytes", b"\x00\x01"),
        ("json", {"type": "pong"}),
    ]
