import asyncio

from speech_stream import SpeechStreamCoordinator, SpeechStreamSummary


TEST_TIMEOUT_SECONDS = 2.0


def run_scenario(coroutine):
    asyncio.run(asyncio.wait_for(coroutine, timeout=TEST_TIMEOUT_SECONDS))


def test_session_renders_units_strictly_in_index_order():
    seen = []

    async def render(unit, trace):
        seen.append(("start", unit.index))
        await asyncio.sleep(0)
        seen.append(("end", unit.index))
        return True

    async def scenario():
        coordinator = SpeechStreamCoordinator(max_parallel_synthesis=1)
        session = await coordinator.begin("user-1", "reply-1", render)
        await session.add_text("第一句。", "neutral")
        await session.add_text("第二句。" * 10, "neutral")

        summary = await session.close()

        assert summary == SpeechStreamSummary(
            reply_id="reply-1",
            total=2,
            succeeded=2,
            failed=0,
            cancelled=False,
        )

    run_scenario(scenario())
    assert seen == [("start", 0), ("end", 0), ("start", 1), ("end", 1)]


def test_failed_unit_does_not_stop_later_units():
    seen = []

    async def render(unit, trace):
        seen.append(unit.index)
        return unit.index != 1

    async def scenario():
        coordinator = SpeechStreamCoordinator()
        session = await coordinator.begin("user-1", "reply-1", render)
        await session.add_text("第一句。", "neutral")
        await session.add_text("二" * 40, "neutral")
        await session.add_text("三" * 40, "neutral")

        summary = await session.close()

        assert summary == SpeechStreamSummary(
            reply_id="reply-1",
            total=3,
            succeeded=2,
            failed=1,
            cancelled=False,
        )

    run_scenario(scenario())
    assert seen == [0, 1, 2]


def test_unit_exception_is_counted_and_later_units_continue():
    seen = []

    async def render(unit, trace):
        seen.append(unit.index)
        if unit.index == 1:
            raise RuntimeError("controlled render failure")
        return True

    async def scenario():
        coordinator = SpeechStreamCoordinator()
        session = await coordinator.begin("user-1", "reply-1", render)
        await session.add_text("第一句。", "neutral")
        await session.add_text("二" * 40, "neutral")
        await session.add_text("三" * 40, "neutral")

        summary = await session.close()

        assert summary == SpeechStreamSummary(
            reply_id="reply-1",
            total=3,
            succeeded=2,
            failed=1,
            cancelled=False,
        )

    run_scenario(scenario())
    assert seen == [0, 1, 2]


def test_close_waits_until_render_finishes():
    render_started = None
    allow_render_to_finish = None

    async def render(unit, trace):
        render_started.set()
        await allow_render_to_finish.wait()
        return True

    async def scenario():
        nonlocal render_started, allow_render_to_finish
        render_started = asyncio.Event()
        allow_render_to_finish = asyncio.Event()
        coordinator = SpeechStreamCoordinator()
        session = await coordinator.begin("user-1", "reply-1", render)
        await session.add_text("第一句。", "neutral")
        close_task = asyncio.create_task(session.close())

        await asyncio.wait_for(render_started.wait(), timeout=0.5)
        await asyncio.sleep(0)
        assert not close_task.done()

        allow_render_to_finish.set()
        summary = await asyncio.wait_for(close_task, timeout=0.5)
        assert summary.succeeded == 1
        assert not summary.cancelled

    run_scenario(scenario())


def test_begin_cancels_previous_reply_for_the_same_user():
    old_started = None
    old_cancelled = None
    old_seen = []
    new_seen = []

    async def old_render(unit, trace):
        old_seen.append(unit.text)
        old_started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            old_cancelled.set()
            raise

    async def new_render(unit, trace):
        new_seen.append(unit.text)
        return True

    async def scenario():
        nonlocal old_started, old_cancelled
        old_started = asyncio.Event()
        old_cancelled = asyncio.Event()
        coordinator = SpeechStreamCoordinator()
        old_session = await coordinator.begin("user-1", "reply-old", old_render)
        await old_session.add_text("旧回复。", "neutral")
        await asyncio.wait_for(old_started.wait(), timeout=0.5)

        new_session = await coordinator.begin("user-1", "reply-new", new_render)

        await asyncio.wait_for(old_cancelled.wait(), timeout=0.5)
        assert not coordinator.is_current("user-1", "reply-old")
        assert coordinator.is_current("user-1", "reply-new")
        await old_session.add_text("取消后不应投递。", "neutral")
        await new_session.add_text("新回复。", "neutral")
        old_summary = await old_session.close()
        new_summary = await new_session.close()
        assert old_summary.cancelled
        assert new_summary.succeeded == 1

    run_scenario(scenario())
    assert old_seen == ["旧回复。"]
    assert new_seen == ["新回复。"]


def test_different_users_share_the_global_render_semaphore():
    first_entered = None
    second_entered = None
    release_first = None
    active_renders = 0
    maximum_active_renders = 0

    async def render(unit, trace):
        nonlocal active_renders, maximum_active_renders
        active_renders += 1
        maximum_active_renders = max(maximum_active_renders, active_renders)
        try:
            if trace.reply_id == "reply-1":
                first_entered.set()
                await release_first.wait()
            else:
                second_entered.set()
            return True
        finally:
            active_renders -= 1

    async def scenario():
        nonlocal first_entered, second_entered, release_first
        first_entered = asyncio.Event()
        second_entered = asyncio.Event()
        release_first = asyncio.Event()
        coordinator = SpeechStreamCoordinator(max_parallel_synthesis=1)
        first = await coordinator.begin("user-1", "reply-1", render)
        second = await coordinator.begin("user-2", "reply-2", render)
        await first.add_text("第一句。", "neutral")
        await asyncio.wait_for(first_entered.wait(), timeout=0.5)
        await second.add_text("第二句。", "neutral")
        await asyncio.sleep(0.02)

        assert not second_entered.is_set()
        assert maximum_active_renders == 1

        release_first.set()
        first_summary, second_summary = await asyncio.gather(
            first.close(), second.close()
        )
        assert first_summary.succeeded == 1
        assert second_summary.succeeded == 1

    run_scenario(scenario())
    assert maximum_active_renders == 1


def test_debounce_seals_pending_unit_without_more_text():
    second_rendered = None
    seen = []

    async def render(unit, trace):
        seen.append((unit.index, unit.text))
        if unit.index == 1:
            second_rendered.set()
        return True

    async def scenario():
        nonlocal second_rendered
        second_rendered = asyncio.Event()
        coordinator = SpeechStreamCoordinator()
        session = await coordinator.begin("user-1", "reply-1", render)
        await session.add_text("第一句。", "neutral")
        await session.add_text("短尾段", "neutral")

        await asyncio.wait_for(second_rendered.wait(), timeout=0.75)
        summary = await session.close()
        assert summary.total == 2
        assert summary.succeeded == 2

    run_scenario(scenario())
    assert seen == [(0, "第一句。"), (1, "短尾段")]


def test_coordinator_cancel_stops_render_and_leaves_no_session_tasks():
    render_started = None
    render_cancelled = None

    async def render(unit, trace):
        render_started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            render_cancelled.set()
            raise

    async def scenario():
        nonlocal render_started, render_cancelled
        render_started = asyncio.Event()
        render_cancelled = asyncio.Event()
        current_task = asyncio.current_task()
        baseline_tasks = set(asyncio.all_tasks())
        coordinator = SpeechStreamCoordinator()
        session = await coordinator.begin("user-1", "reply-1", render)
        await session.add_text("第一句。", "neutral")
        await session.add_text("待防抖尾段", "neutral")
        await asyncio.wait_for(render_started.wait(), timeout=0.5)

        await asyncio.wait_for(coordinator.cancel("user-1"), timeout=0.5)
        summary = await session.close()
        await asyncio.sleep(0)

        assert render_cancelled.is_set()
        assert summary.cancelled
        assert not coordinator.is_current("user-1", "reply-1")
        session_tasks = {
            task
            for task in asyncio.all_tasks()
            if task is not current_task
            and task not in baseline_tasks
            and not task.done()
        }
        assert session_tasks == set()

    run_scenario(scenario())
