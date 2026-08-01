import asyncio
import importlib

import pytest

from speech_stream import SpeechStreamCoordinator


TEST_TIMEOUT_SECONDS = 2.0


def run_scenario(coroutine):
    asyncio.run(asyncio.wait_for(coroutine, timeout=TEST_TIMEOUT_SECONDS))


def delivery_class():
    return importlib.import_module("speech_delivery").SpeechReplyDelivery


def test_start_chunks_and_end_share_reply_id_and_unit_indexes():
    events = []

    async def scenario():
        coordinator = SpeechStreamCoordinator()

        async def broadcast(user_id, event):
            events.append((user_id, event))

        async def render(unit, trace):
            await broadcast("user-1", {
                "type": "audio_stream_chunk",
                "reply_id": trace.reply_id,
                "chunk_index": unit.index,
            })
            return True

        delivery = delivery_class()(
            coordinator=coordinator,
            user_id="user-1",
            reply_id="reply-1",
            broadcast=broadcast,
            render_unit=render,
        )
        await delivery.start()
        await delivery.add_text("第一句。", "neutral")
        await delivery.add_text("第二句。" * 10, "neutral")
        summary = await delivery.finish(full_text="第一句。第二句。")

        assert summary.total == 2

    run_scenario(scenario())
    assert [event["type"] for _, event in events] == [
        "audio_stream_start", "audio_stream_chunk", "audio_stream_chunk",
        "audio_stream_end",
    ]
    assert {event["reply_id"] for _, event in events} == {"reply-1"}
    assert [
        event["chunk_index"]
        for _, event in events
        if event["type"] == "audio_stream_chunk"
    ] == [0, 1]


def test_finish_waits_for_render_before_broadcasting_end():
    events = []

    async def scenario():
        render_started = asyncio.Event()
        release_render = asyncio.Event()
        coordinator = SpeechStreamCoordinator()

        async def broadcast(user_id, event):
            events.append(event)

        async def render(unit, trace):
            render_started.set()
            await release_render.wait()
            events.append({
                "type": "audio_stream_chunk",
                "reply_id": trace.reply_id,
                "chunk_index": unit.index,
            })
            return True

        delivery = delivery_class()(
            coordinator=coordinator,
            user_id="user-1",
            reply_id="reply-1",
            broadcast=broadcast,
            render_unit=render,
        )
        await delivery.start()
        await delivery.add_text("第一句。", "neutral")
        finish_task = asyncio.create_task(delivery.finish(full_text="第一句。"))

        await render_started.wait()
        await asyncio.sleep(0)
        assert not finish_task.done()
        assert "audio_stream_end" not in [event["type"] for event in events]

        release_render.set()
        await finish_task

    run_scenario(scenario())
    assert [event["type"] for event in events][-2:] == [
        "audio_stream_chunk", "audio_stream_end",
    ]


def test_new_reply_prevents_delayed_old_chunk_and_end_broadcasts():
    events = []

    async def scenario():
        old_started = asyncio.Event()
        old_cancelled = asyncio.Event()
        release_old = asyncio.Event()
        coordinator = SpeechStreamCoordinator()

        async def broadcast(user_id, event):
            events.append(event)

        async def old_render(unit, trace):
            old_started.set()
            try:
                await release_old.wait()
            except asyncio.CancelledError:
                old_cancelled.set()
                await release_old.wait()
            if coordinator.is_current("user-1", trace.reply_id):
                events.append({"type": "audio_stream_chunk", "reply_id": trace.reply_id})
                return True
            return False

        async def new_render(unit, trace):
            events.append({"type": "audio_stream_chunk", "reply_id": trace.reply_id})
            return True

        old = delivery_class()(
            coordinator=coordinator, user_id="user-1", reply_id="reply-old",
            broadcast=broadcast, render_unit=old_render,
        )
        new = delivery_class()(
            coordinator=coordinator, user_id="user-1", reply_id="reply-new",
            broadcast=broadcast, render_unit=new_render,
        )
        await old.start()
        await old.add_text("旧回复。", "neutral")
        await old_started.wait()

        new_start = asyncio.create_task(new.start())
        await old_cancelled.wait()
        release_old.set()
        await new_start
        await old.finish(full_text="旧回复。")
        await new.add_text("新回复。", "neutral")
        await new.finish(full_text="新回复。")

    run_scenario(scenario())
    old_types = [
        event["type"] for event in events if event["reply_id"] == "reply-old"
    ]
    assert old_types == ["audio_stream_start"]
    assert [
        event["type"] for event in events if event["reply_id"] == "reply-new"
    ] == ["audio_stream_start", "audio_stream_chunk", "audio_stream_end"]


def test_cancel_makes_add_text_and_finish_safe_without_chunk_or_end():
    events = []

    async def scenario():
        render_started = asyncio.Event()
        release_render = asyncio.Event()
        coordinator = SpeechStreamCoordinator()

        async def broadcast(user_id, event):
            events.append(event)

        async def render(unit, trace):
            render_started.set()
            try:
                await release_render.wait()
            except asyncio.CancelledError:
                await release_render.wait()
            if coordinator.is_current("user-1", trace.reply_id):
                events.append({"type": "audio_stream_chunk", "reply_id": trace.reply_id})
                return True
            return False

        delivery = delivery_class()(
            coordinator=coordinator, user_id="user-1", reply_id="reply-1",
            broadcast=broadcast, render_unit=render,
        )
        await delivery.start()
        await delivery.add_text("旧回复。", "neutral")
        await render_started.wait()
        cancel_task = asyncio.create_task(delivery.cancel())
        await asyncio.sleep(0)
        release_render.set()
        await cancel_task
        await delivery.add_text("取消后文本。", "neutral")
        summary = await delivery.finish(full_text="旧回复。取消后文本。")
        assert summary.cancelled

    run_scenario(scenario())
    assert [event["type"] for event in events] == ["audio_stream_start"]


def test_failed_render_is_counted_and_end_is_still_broadcast():
    events = []

    async def scenario():
        coordinator = SpeechStreamCoordinator()

        async def broadcast(user_id, event):
            events.append(event)

        async def render(unit, trace):
            return False

        delivery = delivery_class()(
            coordinator=coordinator, user_id="user-1", reply_id="reply-1",
            broadcast=broadcast, render_unit=render,
        )
        await delivery.start()
        await delivery.add_text("失败单元。", "neutral")
        summary = await delivery.finish(full_text="失败单元。")
        assert summary.failed == 1

    run_scenario(scenario())
    assert events[-1] == {
        "type": "audio_stream_end",
        "reply_id": "reply-1",
        "full_text": "失败单元。",
        "failed_chunks": 1,
    }


def test_new_reply_cancels_an_old_end_broadcast_that_has_not_committed():
    events = []

    async def scenario():
        old_end_started = asyncio.Event()
        release_old_end = asyncio.Event()
        coordinator = SpeechStreamCoordinator()

        async def broadcast(user_id, event):
            if (
                event["type"] == "audio_stream_end"
                and event["reply_id"] == "reply-old"
            ):
                old_end_started.set()
                await release_old_end.wait()
            events.append(event)

        async def render(unit, trace):
            events.append({
                "type": "audio_stream_chunk",
                "reply_id": trace.reply_id,
                "chunk_index": unit.index,
            })
            return True

        old = delivery_class()(
            coordinator=coordinator, user_id="user-1", reply_id="reply-old",
            broadcast=broadcast, render_unit=render,
        )
        new = delivery_class()(
            coordinator=coordinator, user_id="user-1", reply_id="reply-new",
            broadcast=broadcast, render_unit=render,
        )
        await old.start()
        await old.add_text("旧回复。", "neutral")
        old_finish = asyncio.create_task(old.finish(full_text="旧回复。"))
        await old_end_started.wait()

        await new.start()
        release_old_end.set()
        await old_finish
        await new.add_text("新回复。", "neutral")
        await new.finish(full_text="新回复。")

    run_scenario(scenario())
    assert not any(
        event["type"] == "audio_stream_end"
        and event["reply_id"] == "reply-old"
        for event in events
    )
    assert [
        event["type"] for event in events if event["reply_id"] == "reply-new"
    ] == ["audio_stream_start", "audio_stream_chunk", "audio_stream_end"]


def test_non_cancellation_broadcast_failure_is_not_silenced():
    async def scenario():
        coordinator = SpeechStreamCoordinator()

        async def broadcast(user_id, event):
            raise RuntimeError("controlled broadcast failure")

        async def render(unit, trace):
            return True

        delivery = delivery_class()(
            coordinator=coordinator, user_id="user-1", reply_id="reply-1",
            broadcast=broadcast, render_unit=render,
        )
        with pytest.raises(RuntimeError, match="controlled broadcast failure"):
            await delivery.start()

    run_scenario(scenario())


def test_active_start_broadcast_cancellation_is_propagated():
    async def scenario():
        coordinator = SpeechStreamCoordinator()
        cancellation_raised = False

        async def broadcast(user_id, event):
            raise asyncio.CancelledError()

        async def render(unit, trace):
            return True

        delivery = delivery_class()(
            coordinator=coordinator, user_id="user-1", reply_id="reply-1",
            broadcast=broadcast, render_unit=render,
        )
        try:
            await delivery.start()
        except asyncio.CancelledError:
            cancellation_raised = True
        finally:
            await delivery.cancel()

        assert cancellation_raised
        assert not coordinator.is_current("user-1", "reply-1")

    run_scenario(scenario())


def test_cancelling_finish_while_render_is_blocked_cleans_up_session():
    events = []

    async def scenario():
        render_started = asyncio.Event()
        render_cancelled = asyncio.Event()
        release_cancelled_render = asyncio.Event()
        coordinator = SpeechStreamCoordinator()
        current_task = asyncio.current_task()
        baseline_tasks = set(asyncio.all_tasks())

        async def broadcast(user_id, event):
            events.append(event)

        async def render(unit, trace):
            render_started.set()
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                render_cancelled.set()
                while not release_cancelled_render.is_set():
                    try:
                        await release_cancelled_render.wait()
                    except asyncio.CancelledError:
                        continue
                raise

        delivery = delivery_class()(
            coordinator=coordinator, user_id="user-1", reply_id="reply-1",
            broadcast=broadcast, render_unit=render,
        )
        await delivery.start()
        await delivery.add_text("等待取消。", "neutral")
        finish_task = asyncio.create_task(delivery.finish(full_text="等待取消。"))
        await render_started.wait()

        finish_task.cancel()
        await render_cancelled.wait()
        finish_task.cancel()
        await asyncio.sleep(0)
        release_cancelled_render.set()
        with pytest.raises(asyncio.CancelledError):
            await finish_task
        await asyncio.sleep(0)

        try:
            assert finish_task.cancelled()
            assert render_cancelled.is_set()
            assert not coordinator.is_current("user-1", "reply-1")
            leaked_tasks = {
                task
                for task in asyncio.all_tasks()
                if task is not current_task
                and task not in baseline_tasks
                and not task.done()
            }
            assert leaked_tasks == set()
        finally:
            await delivery.cancel()

    run_scenario(scenario())
    assert [event["type"] for event in events] == ["audio_stream_start"]


def test_cancelling_finish_during_end_broadcast_propagates_and_cleans_up():
    async def scenario():
        end_started = asyncio.Event()
        end_cancelled = asyncio.Event()
        coordinator = SpeechStreamCoordinator()
        current_task = asyncio.current_task()
        baseline_tasks = set(asyncio.all_tasks())

        async def broadcast(user_id, event):
            if event["type"] != "audio_stream_end":
                return
            end_started.set()
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                end_cancelled.set()
                raise

        async def render(unit, trace):
            return True

        delivery = delivery_class()(
            coordinator=coordinator, user_id="user-1", reply_id="reply-1",
            broadcast=broadcast, render_unit=render,
        )
        await delivery.start()
        finish_task = asyncio.create_task(delivery.finish(full_text="结束广播。"))
        await end_started.wait()

        finish_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await finish_task
        await asyncio.sleep(0)

        assert end_cancelled.is_set()
        assert not coordinator.is_current("user-1", "reply-1")
        leaked_tasks = {
            task
            for task in asyncio.all_tasks()
            if task is not current_task
            and task not in baseline_tasks
            and not task.done()
        }
        assert leaked_tasks == set()

    run_scenario(scenario())
