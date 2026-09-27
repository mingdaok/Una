"""Audit regressions: only temporary databases and simulated protocol traffic."""

# ruff: noqa: F811 -- imported pytest fixtures are intentionally injected by name.
import asyncio
import json
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from test_qq_channels import stack as stack, event, bind, process_first
from test_qq_social import png, client as client
from channels.adapter import normalize
from channels.media import MediaError, audio_demuxer
from channels.store import ChannelStore
from channels.service import QQService
from conversation_service import ConversationService


def enable(service):
    service.store.set_group("300", True, 180, 6)


@pytest.mark.asyncio
async def test_revoke_while_waiting_transport_lock(stack):
    enable(stack)
    await stack.receive(event(group=300))
    await process_first(stack)
    socket = SimpleNamespace(send_json=AsyncMock())
    stack.adapter.socket = socket
    stack.adapter.send_lock = asyncio.Lock()
    await stack.adapter.send_lock.acquire()
    delivery = asyncio.create_task(stack.deliver())
    try:
        for _ in range(100):
            if (
                stack.store.rows("SELECT status FROM qq_outbox")[0]["status"]
                == "preparing"
            ):
                break
            await asyncio.sleep(0.01)
        assert (
            stack.store.rows("SELECT status FROM qq_outbox")[0]["status"] == "preparing"
        )
        stack.store.set_group("300", False, 180, 6)
        stack.adapter.send_lock.release()
        for _ in range(100):
            if (
                stack.store.rows("SELECT status FROM qq_outbox")[0]["status"]
                == "cancelled"
            ):
                break
            await asyncio.sleep(0.01)
        socket.send_json.assert_not_awaited()
        assert (
            stack.store.rows("SELECT status FROM qq_outbox")[0]["status"] == "cancelled"
        )
    finally:
        delivery.cancel()
        await asyncio.gather(delivery, return_exceptions=True)


@pytest.mark.asyncio
async def test_own_recall_and_backfill_are_canonical(stack):
    enable(stack)
    await stack.receive(event(group=300))
    row = await process_first(stack)
    out = stack.store.rows("SELECT * FROM qq_outbox")[0]
    stack.store.delivered(out, "900")
    own = normalize(
        {**event("你好", mid=900, group=300, sender="100"), "time": time.time()},
        "__backfill__",
        lambda *a: False,
    )
    own["source"] = "backfill"
    assert stack.store.ingest(own, None, row["version"], 100) == "duplicate"
    assert (
        len(stack.store.rows("SELECT * FROM qq_messages WHERE role='assistant'")) == 1
    )
    stack.social.recall(
        {"notice_type": "group_recall", "group_id": 300, "message_id": 900}
    )
    assert not stack.store.rows(
        "SELECT * FROM qq_messages WHERE role='assistant' AND delivered=1"
    )
    assert not stack.store.known_reply("300", "900")
    assert stack.store.ingest(own, None, row["version"], 100) == "duplicate"


@pytest.mark.asyncio
async def test_partial_recall_retains_only_other_part(stack):
    enable(stack)
    stack.conversation.reply.return_value = ("A" * 500 + "B" * 10, "neutral", {})
    await stack.receive(event(group=300))
    await process_first(stack)
    first, second = stack.store.rows("SELECT * FROM qq_outbox ORDER BY rowid")
    stack.store.delivered(first, 901)
    stack.store.delivered(second, 902)
    stack.social.recall(
        {"notice_type": "group_recall", "group_id": 300, "message_id": 901}
    )
    assert (
        stack.store.rows(
            "SELECT content FROM qq_messages WHERE role='assistant' AND delivered=1"
        )[0]["content"]
        == "B" * 10
    )


@pytest.mark.asyncio
async def test_protocol_age_and_restart_never_refresh_deadline(stack):
    bind(stack)
    await stack.receive({**event(), "time": time.time() - 86400})
    assert not stack.store.rows("SELECT * FROM qq_inbox")
    stamp = time.time() - 200
    await stack.receive({**event(mid=2), "time": stamp})
    row = await process_first(stack)
    assert row["time_source"] == "protocol"
    assert stack.store.rows("SELECT expires FROM qq_outbox")[0][
        "expires"
    ] == pytest.approx(stamp + 300)
    stack.store.execute("UPDATE qq_inbox SET status='processing',expires=0")
    stack.store.recover()
    assert stack.store.rows("SELECT status FROM qq_inbox")[0]["status"] == "expired"


@pytest.mark.asyncio
async def test_watermark_sees_twenty_first_message(stack):
    enable(stack)
    await stack.receive(event(group=300, direct=False))
    await process_first(stack)
    outgoing = stack.store.rows("SELECT * FROM qq_outbox")[0]
    stack.conversation.topic_current = AsyncMock(return_value=True)
    for i in range(20):
        await stack.receive(event("同话题", mid=10 + i, group=300, direct=False))
    assert await stack.social.fresh(outgoing)
    await stack.receive(event("新话题", mid=30, group=300, direct=False))
    assert not await stack.social.fresh(outgoing)
    assert not stack.store.submission_current(outgoing)
    assert stack.conversation.topic_current.await_count == 1


@pytest.mark.asyncio
async def test_failure_diagnostic_is_not_success_and_has_no_secret(stack):
    enable(stack)
    stack.conversation.reply.side_effect = ValueError(
        "SECRET https://example.test/private"
    )
    await stack.receive(event(group=300))
    await process_first(stack)
    log = stack.store.rows("SELECT * FROM qq_group_decisions")[0]
    assert log["reason"] == "generation_failed"
    assert log["stage"] == "generation" and log["error_code"] == "ValueError"
    assert "SECRET" not in json.dumps(log)


def test_concurrent_upload_and_deleted_shared_preview(stack):
    library = stack.social.library
    content = png()
    with ThreadPoolExecutor(max_workers=8) as pool:
        assets = list(pool.map(lambda _: library.add(content, "300", "开心"), range(8)))
    assert len({a["id"] for a in assets}) == 1
    other = library.add(content, "301", "开心")
    library.remove(other["id"])
    with pytest.raises(MediaError):
        library.path(library.get(other["id"]))
    with pytest.raises(MediaError):
        library.update(other["id"], {"status": "ready"})
    assert library.path(assets[0]).is_file()


def test_long_current_message_survives_with_identity():
    record = {
        "message_id": "77",
        "speaker": {
            "id": "qq:group:300:member:200",
            "display_name": "昵称" * 100,
            "role": "member",
        },
        "content": "长" * 8000,
        "reply_to": {"message_id": "76", "content": "引用" * 1000},
    }
    result = ConversationService.bounded_history([{"identity": record}])
    assert result and result[0]["speaker"]["id"] == record["speaker"]["id"]
    assert result[0]["message_id"] == "77" and "截断" in result[0]["content"]
    assert len(json.dumps(result[0], ensure_ascii=False).encode()) <= 6000


def test_wal_reader_not_blocked_by_writer(stack):
    with stack.store.db() as db:
        db.execute("INSERT INTO qq_codes VALUES('a','100','owner','digest',1,NULL,0)")
        with ThreadPoolExecutor(max_workers=1) as pool:
            assert (
                pool.submit(
                    stack.store.rows, "SELECT count(*) AS n FROM qq_codes"
                ).result(timeout=1)[0]["n"]
                == 0
            )


@pytest.mark.asyncio
async def test_waiting_tts_does_not_starve_ready_task(stack):
    bind(stack)
    await stack.receive(event())
    first = await process_first(stack)
    await stack.receive(event(mid=2))
    second = await process_first(stack)
    out = stack.store.rows("SELECT * FROM qq_outbox WHERE inbox_id=?", (second["id"],))[
        0
    ]
    stack.store.delivered(out, 900)
    for row in (first, second):
        stack.store.media_job(
            "tts",
            {"inbox_id": row["id"], "text": "你好", "emotion": "neutral"},
            dedupe=row["id"] + ":tts",
            row=row,
        )
    await stack.social.work_once("tts")
    # The ready task is selected on the next iteration, even though the first waits.
    await stack.social.work_once("tts")
    tasks = stack.store.rows("SELECT * FROM qq_media_jobs ORDER BY created")
    assert tasks[0]["status"] == "pending" and tasks[0]["ready_at"] > time.time()
    assert tasks[1]["status"] == "failed"  # no fake TTS provider configured


@pytest.mark.asyncio
async def test_disabled_lifecycle_creates_nothing(stack, tmp_path):
    path = tmp_path / "disabled.sqlite"
    store = ChannelStore(path, "100", deferred=True)
    service = QQService(
        replace(stack.config, enabled=False, media_dir=str(tmp_path / "absent")),
        store,
        stack.conversation,
        stack.database,
    )
    await service.start()
    await service.close()
    assert not path.exists() and not (tmp_path / "absent").exists()


def test_private_job_ownership_and_group_test_override(stack, client):
    owner = bind(stack)
    other = bind(stack, "201", "other")
    for binding in (owner, other):
        conv = stack.store.conversation("private", binding["external_id"])
        stack.store.media_job(
            "tts",
            {"text": "PRIVATE"},
            dedupe=binding["id"],
            row={"conversation": conv["id"], "binding_id": binding["id"]},
        )
    response = client.get(
        "/api/channels/qq/media-jobs", headers={"authorization": "owner"}
    )
    assert (
        len(response.json()) == 1
        and "PRIVATE" not in response.text
        and "binding_id" not in response.text
    )
    stack.config = replace(stack.config, test_reply_percent=95)
    assert stack.store.test_mode("300", 95)[0] == 95
    stop = client.put(
        "/api/channels/qq/admin/groups/300/test-mode",
        headers={"authorization": "owner"},
        json={"percent": 0},
    )
    assert stop.status_code == 200 and stop.json()["percent"] == 0
    assert stack.store.test_mode("301", 95)[0] == 95
    start = client.put(
        "/api/channels/qq/admin/groups/300/test-mode",
        headers={"authorization": "owner"},
        json={"percent": 95},
    )
    assert 1790 < start.json()["until"] - time.time() <= 1800


@pytest.mark.parametrize(
    "content",
    [
        b"#EXTM3U\nfile:///outside.wav",
        b"ffconcat version 1.0\nfile outside.wav",
        b"<playlist>file:///outside.wav</playlist>",
    ],
)
def test_reference_containers_rejected_before_decoder(content):
    with pytest.raises(MediaError):
        audio_demuxer(content)


@pytest.mark.asyncio
async def test_embedding_transient_failure_recovers(stack):
    library = stack.social.library
    calls = []

    def embed(texts):
        calls.append(texts)
        if len(calls) == 1:
            raise RuntimeError("cold")
        return [[1.0, 0.0]]

    library.embed = embed
    assert await library.vector("你好") is None
    assert library.embed is embed
    library.embedding_retry_at = 0
    assert await library.vector("你好") == [1.0, 0.0]


@pytest.mark.asyncio
async def test_schema_migration_preserves_unknown_and_delivered(stack):
    bind(stack)
    await stack.receive(event())
    await process_first(stack)
    stack.store.execute("UPDATE qq_outbox SET status='unknown'")
    store = ChannelStore(stack.store.path, "100")
    store.recover()
    assert store.rows("SELECT status FROM qq_outbox")[0]["status"] == "unknown"
    assert store.rows("SELECT max(version) AS v FROM qq_schema")[0]["v"] == 4


@pytest.mark.asyncio
async def test_recall_before_ack_and_clear_keep_delivery_truth(stack):
    enable(stack)
    await stack.receive(event(group=300))
    await process_first(stack)
    out = stack.store.rows("SELECT * FROM qq_outbox")[0]
    stack.social.recall(
        {"notice_type": "group_recall", "group_id": 300, "message_id": 777}
    )
    stack.store.delivered(out, 777)
    assert not stack.store.rows(
        "SELECT * FROM qq_messages WHERE role='assistant' AND delivered=1"
    )
    stack.store.execute("UPDATE qq_outbox SET status='unknown'")
    stack.store.clear_group("300")
    assert stack.store.rows("SELECT status FROM qq_outbox")[0]["status"] == "unknown"


@pytest.mark.asyncio
async def test_export_skips_twenty_ineligible_rows(stack):
    owner = bind(stack)
    other = bind(stack, "201", "other")
    for i in range(21):
        binding = owner if i < 20 else other
        raw = normalize(
            event(mid=i, sender=binding["external_id"]), "100", lambda *a: False
        )
        stack.store.ingest(raw, binding, binding["version"], 100)
        row = stack.store.rows("SELECT * FROM qq_inbox WHERE status='pending'")[0]
        stack.store.execute(
            "UPDATE qq_inbox SET status='processing' WHERE id=?", (row["id"],)
        )
        stack.store.complete(row, "已交付", {})
        stack.store.delivered(
            stack.store.rows("SELECT * FROM qq_outbox WHERE inbox_id=?", (row["id"],))[
                0
            ],
            str(1000 + i),
        )
    # Simulate the original permission snapshot for the eligible last row.
    stack.store.execute(
        "UPDATE qq_bindings SET prefs=json_set(prefs,'$.share_history',json('true')) WHERE id=?",
        (other["id"],),
    )
    exported = []
    stack.store.export_history = lambda inbox, user: exported.append((inbox, user))
    task = asyncio.create_task(stack.postprocess())
    try:
        for _ in range(100):
            if exported:
                break
            await asyncio.sleep(0.01)
        assert exported == [(row["id"], "other")]
    finally:
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)


@pytest.mark.asyncio
async def test_test_mode_obeys_stop_and_mute(stack, monkeypatch):
    enable(stack)
    stack.config = replace(stack.config, test_reply_percent=95)
    monkeypatch.setattr("channels.social_runtime.random.randrange", lambda _: 0)
    await stack.receive(event("不要插话", group=300, direct=False))
    await process_first(stack)
    assert not stack.store.rows("SELECT * FROM qq_outbox")
    await stack.receive(
        {
            "post_type": "notice",
            "notice_type": "group_ban",
            "group_id": 300,
            "user_id": 100,
            "duration": 60,
        }
    )
    await stack.receive(event("你好", mid=2, group=300))
    await process_first(stack)
    assert not stack.store.rows("SELECT * FROM qq_outbox")


@pytest.mark.asyncio
async def test_expired_scoped_test_cancels_already_generated_plan(stack):
    enable(stack)
    stack.store.set_behavior(
        "300", {"test_percent": 100, "test_until": time.time() + 1800}
    )
    await stack.receive(event(group=300, direct=False))
    await process_first(stack)
    row = stack.store.rows("SELECT * FROM qq_outbox")[0]
    stack.store.execute("UPDATE qq_reply_plans SET test_until=1")
    assert not stack.store.submission_current(row)


@pytest.mark.asyncio
async def test_lease_is_acquired_before_migration(stack, tmp_path):
    from channels.lease import WorkerLease

    path = tmp_path / "uninitialized.db"
    lease = WorkerLease(path)
    lease.acquire()
    try:
        service = QQService(
            stack.config,
            ChannelStore(path, "100", deferred=True),
            stack.conversation,
            stack.database,
        )
        with pytest.raises(RuntimeError, match="already active"):
            await service.start()
        await service.close()
        assert not path.exists()
    finally:
        lease.release()


@pytest.mark.asyncio
async def test_database_writer_does_not_freeze_event_loop(stack):
    bind(stack)
    with stack.store.db():
        incoming = asyncio.create_task(stack.receive(event()))
        start = time.perf_counter()
        for _ in range(5):
            await asyncio.sleep(0.02)
        assert time.perf_counter() - start < 0.5
        assert not incoming.done()
    await asyncio.wait_for(incoming, 2)


@pytest.mark.asyncio
async def test_socket_write_timeout_is_unknown_not_retryable(stack):
    from channels.adapter import SendUnknown

    stack.adapter.config = replace(stack.config, send_timeout=0.02)
    stack.adapter.socket = SimpleNamespace(
        send_json=AsyncMock(side_effect=lambda _: asyncio.sleep(10))
    )

    async def blocked(_):
        await asyncio.sleep(10)

    stack.adapter.socket.send_json = blocked
    with pytest.raises(SendUnknown):
        await stack.adapter.action("send_group_msg", {})
    assert not stack.adapter.send_lock.locked()


@pytest.mark.asyncio
async def test_playlist_never_opens_an_external_temp_file(stack, tmp_path):
    from channels.media import QQMedia

    outside = tmp_path / "outside.wav"
    outside.write_bytes(b"private-test-content")
    media = QQMedia(stack.config, stack.adapter, None, None, None)
    media.download = AsyncMock(return_value=("#EXTM3U\n" + outside.as_uri()).encode())
    media.command = AsyncMock()
    with pytest.raises(MediaError):
        await media.process(
            {
                "text": "",
                "segments": [
                    {
                        "type": "record",
                        "data": {"url": "https://multimedia.nt.qq.com/test"},
                    }
                ],
            }
        )
    media.command.assert_not_awaited()
    assert outside.read_bytes() == b"private-test-content"


@pytest.mark.asyncio
async def test_direct_reply_after_scoped_test_expiry_is_not_cancelled(stack):
    enable(stack)
    stack.store.set_behavior("300", {"test_percent": 95, "test_until": 1.0})
    await stack.receive(event(group=300))
    await process_first(stack)
    outgoing = stack.store.rows("SELECT * FROM qq_outbox")[0]
    assert stack.store.submission_current(outgoing)
    assert (
        stack.store.rows("SELECT test_until FROM qq_reply_plans")[0]["test_until"]
        is None
    )


@pytest.mark.asyncio
async def test_cancelled_database_call_settles_and_consumes_failure():
    import threading
    from channels.async_db import database_call

    gate, started, finished = threading.Event(), threading.Event(), threading.Event()

    def operation():
        started.set()
        gate.wait(2)
        finished.set()
        raise RuntimeError("late database error")

    loop = asyncio.get_running_loop()
    previous, errors = loop.get_exception_handler(), []
    loop.set_exception_handler(lambda _, detail: errors.append(detail))
    task = asyncio.create_task(database_call(operation))
    try:
        while not started.is_set():
            await asyncio.sleep(0.001)
        task.cancel()
        await asyncio.sleep(0.01)
        assert not task.done()
        gate.set()
        with pytest.raises(asyncio.CancelledError):
            await task
        await asyncio.sleep(0.01)
        assert finished.is_set() and not errors
    finally:
        gate.set()
        loop.set_exception_handler(previous)
