import asyncio
import io
import json
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from PIL import Image
from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient

from test_qq_channels import stack, event, bind, process_first
from channels.api import router_for
from channels.social_types import ReplyPlan, Decision, StickerDescription
from channels.social_runtime import voice_requested
from channels.media import MediaError
from conversation_service import ConversationService


def png(color="red"):
    output = io.BytesIO()
    Image.new("RGB", (10, 10), color).save(output, format="PNG")
    return output.getvalue()


def test_model_optional_nulls_are_absent_not_generation_failure():
    decision = Decision.model_validate({"decision": "reply", "reason_code": "natural_banter", "target_message_id": "1", "sticker_query": None, "context_message_ids": None, "preferred_mode": None})
    assert decision.sticker_query == "" and decision.context_message_ids == []
    assert decision.target_message_id == "1"
    plan = ReplyPlan.model_validate({"text": None, "voice": None, "emotion": None, "sticker_id": "candidate"})
    assert plan.text == "" and not plan.voice and plan.emotion == "neutral"
    with pytest.raises(ValueError):
        Decision.model_validate({"decision": "reply", "reason_code": "made-up", "sticker_query": None})


def group_on(service):
    service.store.set_group("300", True, 180, 6)


@pytest.mark.asyncio
async def test_high_probability_mode_bypasses_autonomous_cooldown_only(stack, monkeypatch):
    from dataclasses import replace
    stack.config = replace(stack.config, test_reply_percent=95)
    group_on(stack)
    monkeypatch.setattr("channels.social_runtime.random.randrange", lambda n: 94)
    for mid in (1, 2):
        await stack.receive(event("测试插话", mid=mid, group=300, direct=False))
        await process_first(stack)
    assert len(stack.store.rows("SELECT * FROM qq_outbox")) == 2
    stack.conversation.should_join.assert_not_awaited()
    monkeypatch.setattr("channels.social_runtime.random.randrange", lambda n: 95)
    await stack.receive(event("这次应安静", mid=3, group=300, direct=False))
    await process_first(stack)
    assert len(stack.store.rows("SELECT * FROM qq_outbox")) == 2
    stack.store.set_behavior("300", {"autonomous": False})
    monkeypatch.setattr("channels.social_runtime.random.randrange", lambda n: 0)
    await stack.receive(event("关闭后不插话", mid=4, group=300, direct=False))
    await process_first(stack)
    assert len(stack.store.rows("SELECT * FROM qq_outbox")) == 2


def test_test_probability_config_is_opt_in(monkeypatch):
    from channels.config import QQConfig
    monkeypatch.delenv("UNA_QQ_TEST_REPLY_PERCENT", raising=False)
    assert QQConfig.load().test_reply_percent == 0
    monkeypatch.setenv("UNA_QQ_TEST_REPLY_PERCENT", "95")
    assert QQConfig.load().test_reply_percent == 95


@pytest.mark.asyncio
async def test_planner_selects_older_speaker_and_preserves_reply_target(stack):
    group_on(stack)
    await stack.receive(event("我在问问题", mid=1, group=300, sender="200", direct=False))
    await stack.receive(event("我只是路过", mid=2, group=300, sender="201", direct=False))
    stack.conversation.decide = AsyncMock(return_value=Decision(decision="reply", reason_code="can_help", target_message_id="1"))
    row = stack.store.freeze_window(stack.store.conversation("group", "300")["id"])
    stack.store.execute("UPDATE qq_inbox SET status='processing' WHERE id=?", (row["id"],))
    await stack.process(row)
    prompt = json.loads(stack.conversation.reply.call_args.args[0])
    assert prompt["speaker"]["id"].endswith(":member:200")
    plan = json.loads(stack.store.rows("SELECT payload FROM qq_reply_plans")[0]["payload"])
    assert plan["reply_to_message_id"] == "1"
    outgoing = stack.store.rows("SELECT * FROM qq_outbox")[0]
    stack.social.recall({"notice_type": "group_recall", "group_id": 300, "message_id": 1})
    assert not await stack.social.fresh(outgoing)


@pytest.fixture
def client(stack):
    def user(authorization: str = Header(default="")):
        if not authorization:
            raise HTTPException(401)
        return {"id": authorization}
    app = FastAPI()
    app.include_router(router_for(stack, user))
    with TestClient(app) as client:
        yield client


def test_observation_has_hard_deadline_and_durable_rate(stack):
    conv = stack.store.conversation("group", "300")
    for second in range(9):
        stack.store.observe(conv["id"], 0, 100+second)
    assert not stack.store.window_ready(conv["id"], 107)
    assert stack.store.window_ready(conv["id"], 108)  # No quiet gap, still gets a turn.


@pytest.mark.asyncio
async def test_freeze_coalesces_without_losing_context(stack):
    group_on(stack)
    for n in range(9):
        await stack.receive(event(f"群聊内容{n}", mid=n, group=300, direct=False))
    conv = stack.store.conversation("group", "300")
    frozen = stack.store.freeze_window(conv["id"])
    assert json.loads(frozen["payload"])["message_id"] == "8"
    assert len(stack.store.rows("SELECT * FROM qq_messages")) == 9
    assert len(stack.store.rows("SELECT * FROM qq_inbox WHERE status='pending'")) == 1
    assert not stack.store.window_ready(conv["id"])


@pytest.mark.asyncio
async def test_silence_creates_no_reply_plan_or_outbox(stack):
    group_on(stack)
    stack.conversation.decide = AsyncMock(return_value=Decision(decision="silence", reason_code="not_relevant"))
    await stack.receive(event("他们自己聊", group=300, direct=False))
    await process_first(stack)
    assert not stack.store.rows("SELECT * FROM qq_outbox")
    assert stack.store.rows("SELECT reason FROM qq_group_decisions")[0]["reason"] == "not_relevant"


@pytest.mark.asyncio
async def test_group_behavior_revocation_invalidates_old_plan(stack):
    group_on(stack)
    await stack.receive(event(group=300))
    await process_first(stack)
    outgoing = stack.store.rows("SELECT * FROM qq_outbox")[0]
    assert stack.valid(outgoing)
    stack.store.set_behavior("300", {"stickers": False})
    assert not stack.valid(outgoing)


@pytest.mark.asyncio
async def test_media_association_uses_quote_or_unique_same_sender(stack):
    group_on(stack)
    picture = event("", mid=1, group=300, direct=False)
    picture["message"].append({"type": "image", "data": {"url": "https://gchat.qpic.cn/a"}})
    await stack.receive(picture)
    await stack.receive(event("这张图是什么", mid=2, group=300))
    row = stack.store.rows("SELECT * FROM qq_inbox ORDER BY created DESC LIMIT 1")[0]
    associated = stack.store.resolve_media(row, json.loads(row["payload"]))
    assert associated["media_source"] == {"message_id": "1", "sender": "200"}
    wrong = {**json.loads(row["payload"]), "sender": "201"}
    assert not stack.store.resolve_media(row, wrong)["segments"]
    quoted = {**wrong, "reply_id": "1"}
    assert stack.store.resolve_media(row, quoted)["media_source"]["sender"] == "200"
    picture["message_id"] = 3
    await stack.receive(picture)
    await stack.receive(event("看看这个图", mid=4, group=300))
    row = stack.store.rows("SELECT * FROM qq_inbox ORDER BY created DESC LIMIT 1")[0]
    with pytest.raises(ValueError, match="哪张"):
        stack.store.resolve_media(row, json.loads(row["payload"]))


@pytest.mark.asyncio
async def test_history_import_is_bounded_deduplicated_and_never_replies(stack):
    group_on(stack)
    stack.adapter.socket = object()
    records = [dict(event("旧话题", mid=100+n, group=300), time=time.time()-10) for n in range(4)]
    records += [dict(event("别的群", group=301), time=time.time()-10), dict(event("过期", mid=900, group=300), time=time.time()-90000)]
    stack.adapter.action = AsyncMock(return_value={"messages": records})
    conv = stack.store.conversation("group", "300")
    job = {"conversation": conv["id"], "generation": 0, "version": stack.store.group("300")["version"]}
    for n in range(2):
        stack.store.media_job("history", {"group_id": "300"}, dedupe=f"history{n}", row=job)
        await stack.social.work_once()
    assert len(stack.store.rows("SELECT * FROM qq_messages")) == 4
    assert not stack.store.rows("SELECT * FROM qq_outbox")
    assert not stack.store.rows("SELECT * FROM qq_inbox WHERE status='pending'")
    assert all(json.loads(m["metadata"])["source"] == "backfill" for m in stack.store.rows("SELECT metadata FROM qq_messages"))


def test_sticker_asset_dedupe_scope_tombstone_and_candidate_validation(stack):
    library = stack.social.library
    a = library.add(png(), "300", "认输的猫")
    assert library.add(png(), "300", "不同描述")["id"] == a["id"]
    assert library.usable(a["id"], "300") and not library.usable(a["id"], "301")
    library.remove(a["id"])
    assert library.add(png(), "300")["status"] == "rejected"
    assert not library.usable(a["id"], "300")


@pytest.mark.asyncio
async def test_semantic_candidates_scope_and_recent_use(stack):
    library = stack.social.library
    a = library.add(png(), "300", "认输 嘴硬")
    library.add(png("blue"), "301", "认输 嘴硬")
    library.add(png("green"), "public", "开心 鼓励")
    assert [r["id"] for r in await library.candidates("300", "认输", "c")] == [a["id"]]
    library.embed = lambda texts: [[1., 0.]]
    await library.index(a["id"])
    assert await library.candidates("300", "愿赌服输", "c")


@pytest.mark.asyncio
async def test_pure_sticker_delivery_marks_real_history_and_revocation_cancels(stack):
    group_on(stack)
    asset = stack.social.library.add(png(), "300", "认输的猫")
    await stack.receive(event(group=300))
    row = stack.store.rows("SELECT * FROM qq_inbox")[0]
    stack.store.execute("UPDATE qq_inbox SET status='processing' WHERE id=?", (row["id"],))
    plan = ReplyPlan(sticker_id=asset["id"], reply_to_message_id="1")
    stack.store.complete(row, "", {}, plan=plan, sticker=stack.social.library.usable(asset["id"], "300"))
    outgoing = stack.store.rows("SELECT * FROM qq_outbox")[0]
    assert outgoing["kind"] == "image" and outgoing["depends_on"] is None
    assert stack.store.rows("SELECT delivered FROM qq_messages WHERE role='assistant'")[0]["delivered"] == 0
    stack.store.delivered(outgoing, "123")
    assert stack.store.rows("SELECT delivered FROM qq_messages WHERE role='assistant'")[0]["delivered"] == 1
    stack.social.library.update(asset["id"], {"status": "disabled"})
    assert not stack.social.library.usable(asset["id"], "300", outgoing["asset_version"])


@pytest.mark.asyncio
async def test_collection_is_opt_in_and_cannot_publish_private_images(stack):
    group_on(stack)
    data = event("", group=300, direct=False)
    data["message"].append({"type": "image", "data": {"url": "https://gchat.qpic.cn/a"}})
    await stack.receive(data)
    assert not stack.store.rows("SELECT * FROM qq_media_jobs")
    stack.store.set_behavior("300", {"collect": True, "auto_accept": True})
    stack.media = SimpleNamespace(download=AsyncMock(return_value=png()))
    stack.conversation.describe_sticker = AsyncMock(return_value=StickerDescription(is_sticker=True, confidence=0.98, description="认输的猫", private_content=True))
    data["message_id"] = 2
    await stack.receive(data)
    await stack.social.work_once()
    assert stack.store.rows("SELECT status FROM qq_media_assets")[0]["status"] == "rejected"
    assert not await stack.social.library.candidates("300", "认输", "c")


@pytest.mark.asyncio
async def test_collection_approval_and_epoch_invalidation(stack):
    group_on(stack)
    stack.store.set_behavior("300", {"collect": True})
    stack.media = SimpleNamespace(download=AsyncMock(return_value=png()))
    stack.conversation.describe_sticker = AsyncMock(return_value=StickerDescription(is_sticker=True, confidence=0.98, description="认输的猫"))
    data = event("", group=300, direct=False)
    data["message"].append({"type": "image", "data": {"url": "https://gchat.qpic.cn/a"}})
    await stack.receive(data)
    await stack.social.work_once()
    asset = stack.store.rows("SELECT * FROM qq_media_assets")[0]
    assert asset["status"] == "review" and asset["scope"] == "300"
    stack.social.library.update(asset["id"], {"status": "ready"})
    assert await stack.social.library.candidates("300", "认输", "c")
    assert not await stack.social.library.candidates("301", "认输", "c")


def test_admin_endpoints_auth_and_preview(client, stack):
    path = '/api/channels/qq/admin/stickers'
    assert client.get(path).status_code == 401
    assert client.get(path, headers={"Authorization": "member"}).status_code == 403
    owner = {"Authorization": "owner"}
    assert client.get(path+'?scope=999', headers=owner).status_code == 403
    response = client.post(path+'?scope=300&description=cat', files={"file": ("a.png", png(), "image/png")}, headers=owner)
    assert response.status_code == 200
    asset = response.json()
    assert "storage_key" not in asset
    assert client.get(path+'/'+asset['id']+'/preview').status_code == 401
    assert client.get(path+'/'+asset['id']+'/preview', headers=owner).content == png()
    assert client.patch('/api/channels/qq/admin/groups/300/behavior', json={"context_count": 10000}, headers=owner).status_code == 422
    assert client.patch('/api/channels/qq/admin/groups/999/behavior', json={"collect": True}, headers=owner).status_code == 403


def test_invalid_sticker_payload_and_limits(stack):
    for payload in (b'not an image', b'x'*(5*1024*1024+1)):
        with pytest.raises(MediaError):
            stack.social.library.add(payload, "300")
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        ReplyPlan.model_validate({"text": "ok", "url": "file:///secret"})


@pytest.mark.asyncio
async def test_quota_reserved_persists_and_unknown_is_never_released(stack):
    group_on(stack)
    await stack.receive(event(group=300, direct=False))
    row = await process_first(stack)
    stack.store.execute("UPDATE qq_outbox SET status='sending'")
    stack.store.recover()
    assert stack.store.rows("SELECT status FROM qq_outbox")[0]["status"] == "unknown"
    assert stack.store.rows("SELECT status FROM qq_quota_reservations")[0]["status"] == "consumed"
    event2 = json.loads(row["payload"])
    assert not stack.store.reserve({**row, "id": "new-id"}, event2, ReplyPlan(text="next"))


@pytest.mark.asyncio
async def test_clear_group_removes_readable_payloads_and_invalidates_jobs(stack):
    group_on(stack)
    await stack.receive(event("群秘密", group=300))
    await process_first(stack)
    outgoing = stack.store.rows("SELECT * FROM qq_outbox")[0]
    stack.store.clear_group("300")
    assert not stack.valid(outgoing)
    assert not stack.store.rows("SELECT * FROM qq_messages")
    assert "群秘密" not in json.dumps(stack.store.rows("SELECT * FROM qq_inbox"), ensure_ascii=False)


@pytest.mark.asyncio
async def test_topic_recheck_is_bounded_and_allows_same_topic(stack):
    group_on(stack)
    await stack.receive(event("这个报错", group=300, direct=False))
    await process_first(stack)
    outgoing = stack.store.rows("SELECT * FROM qq_outbox")[0]
    await stack.receive(event("补充错误码", mid=2, group=300, direct=False))
    stack.conversation.topic_current = AsyncMock(return_value=True)
    assert await stack.social.fresh(outgoing)
    assert await stack.social.fresh(outgoing)
    stack.conversation.topic_current.assert_awaited_once()


@pytest.mark.asyncio
async def test_tts_failure_never_duplicates_text(stack):
    bind(stack)
    stack.store.preferences("owner", {"voice_mode": "always"})
    stack.media = SimpleNamespace(synthesize=AsyncMock(return_value=None))
    await stack.receive(event())
    await process_first(stack)
    text = stack.store.rows("SELECT * FROM qq_outbox")[0]
    stack.store.delivered(text, "10")
    await stack.social.work_once("tts")
    assert len(stack.store.rows("SELECT * FROM qq_outbox")) == 1
    assert stack.store.rows("SELECT status FROM qq_media_jobs")[0]["status"] == "failed"


@pytest.mark.parametrize("text,wanted", [("用语音说一句", True), ("读给我听", True), ("语音回复", True), ("关闭语音回复", False), ("怎么设置语音回复", False)])
def test_voice_intent(text, wanted):
    assert voice_requested(text) == wanted


@pytest.mark.asyncio
async def test_structured_model_reply_filters_unknown_asset_and_control_prefix():
    create = AsyncMock(return_value=SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps({"text": "MOOD: 0你好", "sticker_id": "made-up"})))]))
    brain = SimpleNamespace(model="test", client=SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create))))
    convo = ConversationService(brain, None, None)
    plan, _, _ = await convo.reply_plan("hi", [], group=True)
    assert plan.text == "你好" and plan.sticker_id is None
    assert create.call_args.kwargs["response_format"] == {"type": "json_object"}


@pytest.mark.asyncio
async def test_planner_cannot_target_a_different_group_message():
    convo = ConversationService(None, None, None)
    convo.json_request = AsyncMock(return_value={"decision": "reply", "reason_code": "can_help", "target_message_id": "other-group"})
    decision = await convo.decide([{"message_id": "local", "speaker": {"id": "qq:group:300:member:1", "role": "member"}, "content": "你好"}])
    assert decision.decision == "silence"


@pytest.mark.asyncio
async def test_partial_group_text_only_remembers_acknowledged_content(stack):
    group_on(stack)
    stack.conversation.reply.return_value = ("甲"*500 + "乙"*100, "happy", {})
    await stack.receive(event(group=300))
    await process_first(stack)
    parts = stack.store.rows("SELECT * FROM qq_outbox ORDER BY rowid")
    stack.store.delivered(parts[0], "sent-first")
    stack.store.execute("UPDATE qq_outbox SET status='unknown' WHERE id=?", (parts[1]["id"],))
    message = stack.store.rows("SELECT * FROM qq_messages WHERE role='assistant'")[0]
    assert message["delivered"] == 1
    assert message["content"] == "甲"*500


@pytest.mark.asyncio
async def test_tts_timeout_holds_lane_until_inference_finishes(stack, monkeypatch):
    bind(stack)
    stack.store.preferences("owner", {"voice_mode": "always"})
    await stack.receive(event())
    await process_first(stack)
    text = stack.store.rows("SELECT * FROM qq_outbox")[0]
    stack.store.delivered(text, "ok")
    entered, release = asyncio.Event(), asyncio.Event()
    async def synthesize(*args):
        entered.set()
        await release.wait()
        return None
    stack.media = SimpleNamespace(synthesize=synthesize)
    real_wait = asyncio.wait
    async def timed_out(tasks, timeout=None):
        if timeout != 45:
            return await real_wait(tasks, timeout=timeout)
        await entered.wait()
        return set(), tasks
    monkeypatch.setattr("channels.social_runtime.asyncio.wait", timed_out)
    running = asyncio.create_task(stack.social.work_once("tts"))
    await entered.wait()
    await asyncio.sleep(0)
    assert not running.done()
    release.set()
    await running
    assert stack.store.rows("SELECT status FROM qq_media_jobs")[0]["status"] == "failed"
    assert len(stack.store.rows("SELECT * FROM qq_outbox")) == 1
