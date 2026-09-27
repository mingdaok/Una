import asyncio
import json
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient

from channels.config import QQConfig
from channels.store import ChannelStore
from channels.service import QQService
from channels.api import router_for
from channels.adapter import normalize, SendUnknown
from channels.media import QQMedia, MediaError, PublicResolver
from conversation_service import ConversationService


@pytest.fixture
def stack(tmp_path):
    config = QQConfig(
        enabled=True,
        token="x" * 32,
        bot_id="100",
        users=("200", "201"),
        groups=("300", "301"),
        admins=("owner",),
        media_dir=str(tmp_path / "media"),
    )
    store = ChannelStore(tmp_path / "qq.sqlite3", config.bot_id)
    db = SimpleNamespace(
        get_app_user_by_id=lambda user: dict(id=user, is_active=True),
        get_diaries=lambda *a: [],
    )
    convo = SimpleNamespace(
        reply=AsyncMock(return_value=("你好", "happy", {})),
        should_join=AsyncMock(return_value=True),
        memory=SimpleNamespace(remember=lambda *a: None),
    )
    service = QQService(config, store, convo, db)
    return service


def bind(service, external="200", user="owner"):
    code = service.store.code(user)
    assert service.store.claim_code(code["code"], external)
    service.store.confirm(user, code["id"])
    return service.store.binding(user=user)


def event(text="你好", mid=1, group=None, sender="200", direct=True):
    segments = [{"type": "text", "data": {"text": text}}]
    if group and direct:
        segments.insert(0, {"type": "at", "data": {"qq": "100"}})
    return dict(
        post_type="message",
        self_id=100,
        user_id=int(sender),
        group_id=group,
        message_type="group" if group else "private",
        message_id=mid,
        message=segments,
    )


async def process_first(service):
    row = service.store.rows(
        "SELECT * FROM qq_inbox WHERE status='pending' ORDER BY created LIMIT 1"
    )[0]
    service.store.execute(
        "UPDATE qq_inbox SET status='processing' WHERE id=?", (row["id"],)
    )
    await service.process(row)
    return row


@pytest.mark.asyncio
async def test_duplicate_survives_restart_and_only_one_turn(stack):
    bind(stack)
    for _ in range(10):
        await stack.receive(event())
    assert len(stack.store.rows("SELECT * FROM qq_inbox")) == 1
    await process_first(stack)
    assert stack.conversation.reply.await_count == 1
    fresh = ChannelStore(stack.store.path, "100")
    assert len(fresh.rows("SELECT * FROM qq_outbox")) == 1
    assert fresh.rows("SELECT status FROM qq_inbox")[0]["status"] == "done"


def test_binding_expiry_ownership_and_single_use(stack):
    code = stack.store.code("owner")
    assert stack.store.claim_code(code["code"], "200")
    assert not stack.store.claim_code(code["code"], "201")
    with pytest.raises(ValueError):
        stack.store.confirm("intruder", code["id"])
    stack.store.confirm("owner", code["id"])
    assert stack.store.binding(user="owner")["external_id"] == "200"
    code = stack.store.code("other")
    stack.store.execute("UPDATE qq_codes SET expires=0 WHERE id=?", (code["id"],))
    assert not stack.store.claim_code(code["code"], "201")


@pytest.mark.asyncio
async def test_revoke_during_generation_never_queues_reply(stack):
    bind(stack)
    await stack.receive(event())

    async def reply(*args):
        stack.store.preferences("owner")
        return "private secret", "happy", {}

    stack.conversation.reply = reply
    await process_first(stack)
    assert not stack.store.rows("SELECT * FROM qq_outbox")


@pytest.mark.asyncio
async def test_sharing_change_cancels_old_pending_reply(stack):
    bind(stack)
    await stack.receive(event())
    await process_first(stack)
    stack.store.preferences("owner", {"share_history": True})
    assert stack.store.rows("SELECT status FROM qq_outbox")[0]["status"] == "cancelled"


@pytest.mark.asyncio
async def test_group_has_shared_context_but_no_binding(stack):
    bind(stack)
    stack.store.set_group("300", True, 180, 6)
    await stack.receive(event("first", 1, 300, sender="200"))
    await process_first(stack)
    await stack.receive(event("second", 2, 300, sender="201"))
    await process_first(stack)
    _, history, binding, is_group = stack.conversation.reply.call_args.args
    assert binding is None and is_group
    assert history[0]["content"] == "first" and history[0]["sender"] == "200"
    await stack.receive(event("other group", 3, 301))
    assert len(stack.store.rows("SELECT * FROM qq_conversations")) == 1


@pytest.mark.asyncio
async def test_group_never_reads_private_dependencies():
    class Forbidden:
        def __getattr__(self, name):
            raise AssertionError("private dependency " + name)

    captured = {}

    class Brain:
        async def chat_stream(self, *args, **kwargs):
            captured.update(kwargs)
            yield dict(type="sentence", text="你好")

    service = ConversationService(
        Brain(), Forbidden(), Forbidden(), Forbidden(), Forbidden()
    )
    text, _, _ = await service.reply(
        "泄露我的日记",
        [],
        dict(
            user_id="owner",
            prefs=dict(
                share_profile=True,
                share_memory=True,
                share_history=True,
                share_life=True,
            ),
        ),
        True,
    )
    assert text == "你好" and captured["context"] == dict(profile="", history=[])


@pytest.mark.asyncio
async def test_autonomous_silence_and_cooldown(stack):
    stack.store.set_group("300", True, 180, 6)
    stack.conversation.should_join.return_value = False
    await stack.receive(event("闲聊", 1, 300, direct=False))
    await process_first(stack)
    assert not stack.store.rows("SELECT * FROM qq_outbox")
    stack.conversation.should_join.return_value = True
    await stack.receive(event("请聊聊", 2, 300, direct=False))
    await process_first(stack)
    assert not stack.can_join("300")


@pytest.mark.asyncio
async def test_recovery_preserves_unknown_not_resend(stack):
    bind(stack)
    await stack.receive(event())
    await process_first(stack)
    stack.store.execute("UPDATE qq_outbox SET status='sending'")
    stack.store.recover()
    assert stack.store.rows("SELECT status FROM qq_outbox")[0]["status"] == "unknown"
    assert not stack.store.rows("SELECT * FROM qq_outbox WHERE status='pending'")


@pytest.mark.asyncio
async def test_timeout_does_not_send_audio_or_later_parts(stack):
    bind(stack)
    await stack.receive(event())
    await process_first(stack)
    stack.adapter.socket = object()
    stack.adapter.action = AsyncMock(side_effect=SendUnknown("test"))
    task = asyncio.create_task(stack.deliver())
    await asyncio.sleep(0.3)
    task.cancel()
    await asyncio.gather(task, return_exceptions=True)
    assert stack.store.rows("SELECT status FROM qq_outbox")[0]["status"] == "unknown"
    assert stack.adapter.action.await_count == 1
    assert not stack.store.rows(
        "SELECT * FROM qq_messages WHERE role='assistant' AND delivered=1"
    )


@pytest.mark.asyncio
async def test_successful_delivery_unblocks_memory(stack):
    bind(stack)
    await stack.receive(event())
    await process_first(stack)
    stack.adapter.socket = object()
    stack.adapter.action = AsyncMock(return_value={"message_id": 999})
    task = asyncio.create_task(stack.deliver())
    await asyncio.sleep(0.3)
    task.cancel()
    await asyncio.gather(task, return_exceptions=True)
    assert stack.store.rows("SELECT status FROM qq_outbox")[0]["status"] == "delivered"
    assert (
        stack.store.rows("SELECT delivered FROM qq_messages WHERE role='assistant'")[0][
            "delivered"
        ]
        == 1
    )


@pytest.mark.asyncio
async def test_bound_queue_and_generation_reset(stack):
    bind(stack)
    for i in range(6):
        await stack.receive(event(mid=i))
    assert len(stack.store.rows("SELECT * FROM qq_inbox WHERE status='pending'")) == 5
    before = stack.store.rows("SELECT * FROM qq_outbox")
    assert len(before) == 1  # one bounded busy response, no model work for overflow
    stack.store.reset("private", "200")
    await process_first(stack)
    after = stack.store.rows("SELECT * FROM qq_outbox")
    assert len(after) == len(before) and all(not stack.valid(row) for row in after)


def test_group_retention_keeps_archive_but_model_window_is_sixty(stack):
    conv = stack.store.conversation("group", "300")
    for i in range(70):
        stack.store.execute(
            "INSERT INTO qq_messages(id,conversation,generation,role,sender,content,created,delivered) VALUES(?,?,0,?,?,?,?,1)",
            (str(i), conv["id"], "user", "200", "hello", time.time() + i),
        )
    stack.store.cleanup()
    assert len(stack.store.rows("SELECT * FROM qq_messages")) == 70
    assert len(stack.store.history(conv["id"], 0, group=True)) == 60


def test_api_authorization_and_preferences(stack):
    def user(authorization: str = Header(default="")):
        if not authorization:
            raise HTTPException(401)
        return {"id": authorization}

    app = FastAPI()
    app.include_router(router_for(stack, user))
    with TestClient(app) as client:
        assert client.get("/api/channels/qq/status").status_code == 401
        assert (
            client.get(
                "/api/channels/qq/status", headers={"Authorization": "member"}
            ).json()["is_admin"]
            is False
        )
        assert (
            client.patch(
                "/api/channels/qq/groups/300",
                headers={"Authorization": "member"},
                json={"enabled": True},
            ).status_code
            == 403
        )
        assert (
            client.patch(
                "/api/channels/qq/groups/999",
                headers={"Authorization": "owner"},
                json={"enabled": True},
            ).status_code
            == 403
        )
        assert (
            client.patch(
                "/api/channels/qq/groups/300",
                headers={"Authorization": "owner"},
                json={"enabled": True},
            ).status_code
            == 200
        )
        bind(stack)
        assert (
            client.patch(
                "/api/channels/qq/preferences",
                headers={"Authorization": "owner"},
                json={"voice_mode": "invalid"},
            ).status_code
            == 422
        )
        assert (
            client.patch(
                "/api/channels/qq/preferences",
                headers={"Authorization": "owner"},
                json={"share_memory": True},
            ).status_code
            == 200
        )
        assert stack.store.binding(user="owner")["prefs"]["share_memory"] is True


def test_normalize_ignores_self_and_cq_text_is_not_command():
    raw = event("[CQ:at,qq=100]", group=300, direct=False)
    normalized = normalize(raw, "100", lambda *a: False)
    assert not normalized["direct"]
    assert normalize(event(sender="100"), "100", lambda *a: False) is None


@pytest.mark.asyncio
async def test_reverse_socket_receives_echo_without_blocking_generation(stack):
    seen = []

    async def receive(data):
        seen.append(data)

    class Socket:
        headers = {"authorization": "Bearer " + "x" * 32, "x-self-id": "100"}

        def __init__(self):
            self.input = asyncio.Queue()
            self.accepted = False

        async def accept(self):
            self.accepted = True

        async def close(self, code):
            pass

        async def receive_text(self):
            return await self.input.get()

        async def send_json(self, payload):
            await self.input.put(
                json.dumps(
                    {
                        "status": "ok",
                        "retcode": 0,
                        "echo": payload["echo"],
                        "data": {"message_id": 7},
                    }
                )
            )

    ws = Socket()
    task = asyncio.create_task(stack.adapter.connect(ws, receive))
    await asyncio.sleep(0)
    await ws.input.put(json.dumps(event()))
    assert await stack.adapter.action("send_private_msg", {}) == {"message_id": 7}
    assert seen
    task.cancel()
    await asyncio.gather(task, return_exceptions=True)


@pytest.mark.asyncio
async def test_bad_websocket_auth(stack):
    ws = SimpleNamespace(
        headers={"authorization": "wrong", "x-self-id": "100"},
        close=AsyncMock(),
        accept=AsyncMock(),
    )
    await stack.adapter.connect(ws, AsyncMock())
    ws.accept.assert_not_called()
    ws.close.assert_awaited_once_with(code=1008)


@pytest.mark.asyncio
async def test_media_rejects_urls_count_and_duration(stack, tmp_path):
    media = QQMedia(stack.config, stack.adapter, None, None, None)
    for url in (
        "file:///C:/secret",
        "http://multimedia.nt.qq.com/a",
        "https://127.0.0.1/a",
        "https://multimedia.nt.qq.com.evil/a",
        "https://u:p@multimedia.nt.qq.com/a",
    ):
        with pytest.raises(MediaError):
            media.validate_url(url)
    data = dict(text="", segments=[dict(type="image", data=dict(url="x"))] * 4)
    with pytest.raises(MediaError, match="3"):
        await media.process(data)
    media.download = AsyncMock(return_value=b"RIFF\x00\x00\x00\x00WAVE")
    media.command = AsyncMock(return_value=b'{"format":{"duration":"61"}}')
    with pytest.raises(MediaError, match="60"):
        await media.process(
            dict(
                text="",
                segments=[
                    dict(type="record", data=dict(url="https://multimedia.nt.qq.com/a"))
                ],
            )
        )
    assert not [p for p in media.root.iterdir() if p.is_file()]


@pytest.mark.asyncio
async def test_notifications_quiet_hours_and_dedup(stack, monkeypatch):
    from datetime import datetime
    from zoneinfo import ZoneInfo
    import channels.service as module

    bind(stack)
    stack.store.preferences("owner", dict(proactive=True))
    daytime = datetime(2026, 9, 24, 12, tzinfo=ZoneInfo("Asia/Shanghai")).timestamp()
    monkeypatch.setattr(module.time, "time", lambda: daytime)
    stack.store.execute("UPDATE qq_bindings SET last_input=?", (daytime - 9 * 3600,))
    stack.adapter.socket = object()
    await stack.notifications()
    await stack.notifications()
    assert len(stack.store.rows("SELECT * FROM qq_outbox")) == 1
    midnight = datetime(2026, 9, 25, 1, tzinfo=ZoneInfo("Asia/Shanghai")).timestamp()
    monkeypatch.setattr(module.time, "time", lambda: midnight)
    await stack.notifications()
    assert len(stack.store.rows("SELECT * FROM qq_outbox")) == 1


@pytest.mark.asyncio
async def test_rebinding_never_inherits_old_account_history(stack):
    bind(stack)
    await stack.receive(event("old account secret"))
    await process_first(stack)
    old = stack.store.conversation("private", "200")
    stack.store.preferences("owner")
    bind(stack, user="new-owner")
    current = stack.store.conversation("private", "200")
    assert current["generation"] > old["generation"]
    assert stack.store.history(current["id"], current["generation"]) == []


@pytest.mark.asyncio
async def test_reset_replay_does_not_reset_twice(stack):
    bind(stack)
    await stack.receive(event("/una reset", mid=55))
    first = stack.store.conversation("private", "200")["generation"]
    await stack.receive(event("/una reset", mid=55))
    assert stack.store.conversation("private", "200")["generation"] == first


@pytest.mark.asyncio
async def test_text_does_not_wait_for_tts(stack):
    bind(stack)
    stack.store.preferences("owner", {"voice_mode": "always"})
    ready = asyncio.Event()
    finish = asyncio.Event()

    async def synthesize(*args):
        ready.set()
        await finish.wait()
        return "file:///test.mp3"

    stack.media = SimpleNamespace(synthesize=synthesize, command=AsyncMock(return_value=b'{"format":{"duration":"2"}}'))
    await stack.receive(event())
    await asyncio.wait_for(process_first(stack), 2)
    text_rows = stack.store.rows(
        "SELECT * FROM qq_outbox WHERE kind='text' AND status='pending'"
    )
    assert text_rows and not ready.is_set()
    stack.store.delivered(text_rows[0], "99")
    task = asyncio.create_task(stack.social.work_once("tts"))
    await asyncio.wait_for(ready.wait(), 2)
    assert not stack.store.rows("SELECT * FROM qq_outbox WHERE kind='audio'")
    finish.set()
    await task
    assert len(stack.store.rows("SELECT * FROM qq_outbox WHERE kind='audio'")) == 1


@pytest.mark.asyncio
async def test_image_success_and_safe_tts_path(stack, tmp_path):
    import io
    from PIL import Image

    data = io.BytesIO()
    Image.new("RGB", (4, 4), "red").save(data, format="PNG")
    calls = []

    def vision(encoded, text, **kwargs):
        calls.append((encoded, kwargs))
        raise AssertionError("QQ must not call the intermediate vision model")

    async def tts(text, emotion, **kwargs):
        assert kwargs["lipsync"] is False
        target = tmp_path / "media" / "reply.mp3"
        target.write_bytes(b"fake")
        return str(target), []

    media = QQMedia(
        stack.config, stack.adapter, SimpleNamespace(see_and_reply=vision), None, tts
    )
    media.download = AsyncMock(return_value=data.getvalue())
    reply = await media.process(
        dict(
            text="看看",
            segments=[
                dict(type="image", data={"url": "https://multimedia.nt.qq.com/a"})
            ],
        )
    )
    assert reply["text"] == "看看" and calls == []
    assert len(reply["images"]) == 1
    assert reply["images"][0].startswith("data:image/jpeg;base64,")
    assert (await media.synthesize("你好", "happy")).endswith("reply.mp3")


@pytest.mark.asyncio
async def test_public_resolver_rejects_private_dns():
    resolver = PublicResolver()
    resolver.resolver = SimpleNamespace(
        resolve=AsyncMock(return_value=[{"host": "127.0.0.1"}])
    )
    with pytest.raises(MediaError):
        await resolver.resolve("multimedia.nt.qq.com")


@pytest.mark.asyncio
async def test_stale_autonomous_reply_is_not_sent(stack):
    stack.store.set_group("300", True, 180, 6)
    await stack.receive(event("topic one", 1, 300, direct=False))
    await process_first(stack)
    await stack.receive(event("different topic", 2, 300, direct=False, sender="201"))
    stack.adapter.socket = object()
    stack.adapter.action = AsyncMock(return_value={"message_id": 9})
    task = asyncio.create_task(stack.deliver())
    await asyncio.sleep(0.1)
    task.cancel()
    await asyncio.gather(task, return_exceptions=True)
    assert stack.adapter.action.await_count == 0
    assert stack.store.rows("SELECT status FROM qq_outbox")[0]["status"] == "cancelled"


def test_single_worker_lock_releases_on_close(tmp_path):
    from channels.lease import WorkerLease

    first = WorkerLease(tmp_path / "test.sqlite3")
    second = WorkerLease(tmp_path / "test.sqlite3")
    first.acquire()
    try:
        with pytest.raises(RuntimeError):
            second.acquire()
    finally:
        first.release()
    second.acquire()
    second.release()


@pytest.mark.asyncio
@pytest.mark.parametrize("sharing", [False, True])
async def test_private_history_export_is_atomic_and_excludes_group(stack, sharing):
    import sqlite3

    bind(stack)
    stack.store.preferences("owner", {"share_history": sharing})
    with sqlite3.connect(stack.store.path) as db:
        db.execute(
            "CREATE TABLE chat_history(user_id,role,content,mood_score,audio_path,content_evidence_json,source_channel,source_message_id)"
        )
    await stack.receive(event())
    row = await process_first(stack)
    out = stack.store.rows("SELECT * FROM qq_outbox")[0]
    stack.store.delivered(out, "99")
    stack.store.export_history(row["id"], "owner")
    stack.store.export_history(row["id"], "owner")
    exported = stack.store.rows("SELECT * FROM chat_history")
    assert len(exported) == (2 if sharing else 0) and all(
        r["user_id"] == "owner" and r["source_channel"] == "qq" for r in exported
    )


@pytest.mark.asyncio
async def test_asr_success_uses_pcm_without_untrusted_file_paths(stack):
    import wave

    calls = []

    def recognize(pcm, rate):
        calls.append((len(pcm), rate))
        return ("你好 UNA", "neutral")

    media = QQMedia(
        stack.config,
        stack.adapter,
        None,
        SimpleNamespace(recognize_pcm16=recognize),
        None,
    )
    media.download = AsyncMock(return_value=b"RIFF\x00\x00\x00\x00WAVE")

    async def command(*args):
        if args[0] == "ffprobe":
            return b'{"format":{"duration":"1"}}'
        with wave.open(str(args[-1]), "wb") as audio:
            audio.setnchannels(1)
            audio.setsampwidth(2)
            audio.setframerate(16000)
            audio.writeframes(b"\x00\x00" * 160)
        return b""

    media.command = command
    text = await media.process(
        dict(
            text="[语音]",
            segments=[
                dict(type="record", data={"url": "https://multimedia.nt.qq.com/a"})
            ],
        )
    )
    assert "你好 UNA" in text["text"] and calls == [(320, 16000)]
    assert text["images"] == []
    assert not [p for p in media.root.iterdir() if p.is_file()]


def test_real_asgi_websocket_completes_a_turn(stack):
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def lifespan(app):
        await stack.start()
        try:
            yield
        finally:
            await stack.close()

    bind(stack)
    app = FastAPI(lifespan=lifespan)
    app.include_router(router_for(stack, lambda: {"id": "owner"}))
    with TestClient(app) as client:
        with client.websocket_connect(
            "/integrations/qq/onebot/ws",
            headers={"Authorization": "Bearer " + "x" * 32, "X-Self-ID": "100"},
        ) as ws:
            ws.send_json(event())
            outbound = ws.receive_json()
            assert outbound["action"] == "send_private_msg"
            assert outbound["params"]["user_id"] == 200
            assert outbound["params"]["message"][0]["data"]["text"] == "你好"
            ws.send_json(
                {
                    "echo": outbound["echo"],
                    "status": "ok",
                    "retcode": 0,
                    "data": {"message_id": 999},
                }
            )
            for _ in range(30):
                if stack.store.rows("SELECT 1 FROM qq_outbox WHERE status='delivered'"):
                    break
                time.sleep(0.05)
            assert stack.store.rows("SELECT 1 FROM qq_outbox WHERE status='delivered'")


@pytest.mark.asyncio
async def test_notification_types_share_daily_budget_and_respect_consent(
    stack, monkeypatch
):
    from datetime import datetime
    from zoneinfo import ZoneInfo
    from life_simulation.evidence import ContentEvidence, EvidenceSource
    import channels.service as module

    bind(stack)
    now = datetime(2026, 9, 24, 12, tzinfo=ZoneInfo("Asia/Shanghai")).timestamp()
    monkeypatch.setattr(module.time, "time", lambda: now)
    stack.store.preferences("owner", dict(proactive=True, share_life=True))
    stack.store.execute("UPDATE qq_bindings SET last_input=?", (now - 9 * 3600,))
    stack.adapter.socket = object()
    stack.database.get_diaries = lambda *a: [{"id": 1, "date": "2026-09-24"}]
    evidence = ContentEvidence(
        sources=(
            EvidenceSource(
                "life-1",
                "una_life_event",
                world_time="2026-09-24T03:00:00+00:00",
                summary="在公园散步",
            ),
        )
    )
    stack.conversation.life_context = SimpleNamespace(
        build_context_bundle=lambda *a: SimpleNamespace(evidence=evidence)
    )
    stack.conversation.safety = SimpleNamespace(
        prepare_evidence=lambda e: e,
        validate=lambda *a, **k: SimpleNamespace(safe=True, evidence=evidence),
    )
    await stack.notifications()
    await stack.notifications()
    await stack.notifications()
    rows = stack.store.rows("SELECT notification FROM qq_outbox WHERE status='pending'")
    assert {r["notification"] for r in rows} == {"diary", "life"} and len(rows) == 2
    stack.store.preferences("owner", dict(proactive=False))
    await stack.notifications()
    assert not stack.store.rows("SELECT 1 FROM qq_outbox WHERE status='pending'")


@pytest.mark.asyncio
async def test_socket_send_disconnect_marks_outcome_unknown(stack):
    from fastapi import WebSocketDisconnect

    stack.adapter.socket = SimpleNamespace(
        send_json=AsyncMock(side_effect=WebSocketDisconnect())
    )
    with pytest.raises(SendUnknown):
        await stack.adapter.action("send_private_msg", {})
    assert not stack.adapter.pending


def test_group_settings_cannot_exceed_plan_limits():
    from channels.api import GroupSettings
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        GroupSettings(enabled=True, cooldown=60)
    with pytest.raises(ValidationError):
        GroupSettings(enabled=True, hourly=7)
    assert GroupSettings(enabled=True, cooldown=600, hourly=3).hourly == 3


def test_bare_bot_mention_is_not_dropped():
    from channels.adapter import normalize
    data = {"post_type": "message", "message_type": "group", "group_id": 123,
            "user_id": 456, "message_id": 789,
            "message": [{"type": "at", "data": {"qq": "999"}},
                        {"type": "text", "data": {"text": " "}}]}
    result = normalize(data, "999", lambda *_: False)
    assert result["direct"] and result["text"]
    other = normalize(data, "888", lambda *_: False)
    assert not other["direct"] and not other["text"]


@pytest.mark.asyncio
async def test_group_images_reach_chat_without_persisting_base64(stack):
    import io
    from PIL import Image
    stack.store.set_group("300", True, 180, 6)
    picture = io.BytesIO()
    Image.new("RGB", (8, 8), "blue").save(picture, format="PNG")
    stack.media = QQMedia(stack.config, stack.adapter, None, None, None)
    stack.media.download = AsyncMock(return_value=picture.getvalue())
    data = event("这几张图什么颜色", group=300)
    data["message"] += [{"type": "image", "data": {"url": "https://multimedia.nt.qq.com/test"}}] * 3
    await stack.receive(data)
    await process_first(stack)
    request = stack.conversation.reply.call_args
    assert json.loads(request.args[0])["speaker"]["id"] == "qq:group:300:member:200"
    assert len(request.kwargs["images"]) == 3
    assert all(image.startswith("data:image/jpeg;base64,") for image in request.kwargs["images"])
    assert all("base64" not in r["content"] for r in stack.store.rows("SELECT content FROM qq_messages"))


@pytest.mark.asyncio
async def test_passive_group_image_is_not_downloaded(stack):
    stack.store.set_group("300", True, 180, 6)
    stack.media = SimpleNamespace(process=AsyncMock())
    stack.conversation.should_join.return_value = False
    data = event("看看", group=300, direct=False)
    data["message"].append({"type": "image", "data": {"url": "https://multimedia.nt.qq.com/test"}})
    await stack.receive(data)
    await process_first(stack)
    stack.media.process.assert_not_called()
    stack.conversation.reply.assert_not_awaited()


@pytest.mark.asyncio
async def test_conversation_forwards_inline_images_to_brain_only():
    captured = {}
    async def stream(*args, **kwargs):
        captured.update(kwargs)
        yield {"type": "sentence", "text": "蓝色"}
    convo = ConversationService(SimpleNamespace(chat_stream=stream), None, None)
    images = ["data:image/jpeg;base64,YQ=="]
    await convo.reply("这是什么颜色", [], group=True, images=images)
    assert captured["images"] == images
    assert captured["context"] == {"profile": "", "history": []}


@pytest.mark.asyncio
async def test_screenshot_mood_leak_is_removed_before_qq_outbox_and_tts(stack):
    bind(stack)
    stack.store.preferences("owner", {"voice_mode": "always"})
    async def stream(*args, **kwargs):
        for fragment in ("MO", "OD: ", "0", "哦？绕了一圈又绕回这句。"):
            yield {"type": "sentence", "text": fragment}
    stack.conversation = ConversationService(SimpleNamespace(chat_stream=stream), None, None)
    stack.media = SimpleNamespace(process=AsyncMock(return_value={"text": "你好", "images": []}),
                                  synthesize=AsyncMock(return_value=None))
    await stack.receive(event("你好"))
    await process_first(stack)
    reply = "哦？绕了一圈又绕回这句。"
    queued = stack.store.rows("SELECT payload FROM qq_media_jobs WHERE kind='tts'")[0]
    assert json.loads(queued["payload"])["text"] == reply
    stack.media.synthesize.assert_not_called()
    message = stack.store.rows("SELECT content FROM qq_messages WHERE role='assistant'")[0]
    assert message["content"] == reply
    outgoing = stack.store.rows("SELECT * FROM qq_outbox")
    assert outgoing and "MOOD" not in json.dumps(outgoing, ensure_ascii=False)


def test_actual_qq_image_host_is_allowed_without_allowing_similar_hosts(stack):
    media = QQMedia(stack.config, stack.adapter, None, None, None)
    media.validate_url("https://multimedia.nt.qq.com.cn/download?fileid=test")
    for url in ("https://multimedia.nt.qq.com.cn.evil.example/a",
                "https://multimedia.nt.qq.com.cn@127.0.0.1/a",
                "http://multimedia.nt.qq.com.cn/a",
                "https://multimedia.nt.qq.com.cn:8443/a"):
        with pytest.raises(MediaError):
            media.validate_url(url)
