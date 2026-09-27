"""Group image replies without @, using simulated media and temporary storage."""

import json
import time
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

import test_qq_channels
from channels.social_types import Decision
from channels.media import MediaError

stack = test_qq_channels.stack
event = test_qq_channels.event


def picture(mid=1, sender="200", group=300, direct=False, text=""):
    data = event(text, mid=mid, sender=sender, group=group, direct=direct)
    data["message"].append(
        {"type": "image", "data": {"url": f"https://gchat.qpic.cn/{mid}"}}
    )
    return data


def quote(mid, reference, text="这个", sender="200", direct=False):
    data = event(text, mid=mid, group=300, sender=sender, direct=direct)
    data["message"].append({"type": "reply", "data": {"id": str(reference)}})
    return data


def setup(service):
    service.store.set_group("300", True, 180, 6)

    async def process(data):
        return {"text": data["text"], "images": ["data:image/jpeg;base64,dGVzdA=="]}

    service.media = SimpleNamespace(process=AsyncMock(side_effect=process))


async def latest(service):
    conv = service.store.conversation("group", "300")
    row = service.store.freeze_window(conv["id"])
    service.store.execute(
        "UPDATE qq_inbox SET status='processing' WHERE id=?", (row["id"],)
    )
    await service.process(row)
    return row


def seen(service):
    return json.loads(service.conversation.reply.call_args.args[0])


@pytest.mark.asyncio
@pytest.mark.parametrize("test_mode", [False, True])
async def test_unmentioned_picture_is_seen_after_deciding_to_reply(
    stack, monkeypatch, test_mode
):
    setup(stack)
    if test_mode:
        stack.config = replace(stack.config, test_reply_percent=95)
        monkeypatch.setattr("channels.social_runtime.random.randrange", lambda _: 0)
    await stack.receive(picture(text="这是什么"))
    await latest(stack)
    assert stack.media.process.await_count == 1
    assert stack.conversation.reply.call_args.kwargs["images"]
    assert seen(stack)["media_status"] == "images_attached"
    assert seen(stack)["media_source"] == {"message_id": "1", "sender": "200"}
    assert stack.store.rows("SELECT autonomous FROM qq_outbox")[0]["autonomous"] == 1


@pytest.mark.asyncio
@pytest.mark.parametrize("text", ["这张图是什么", "看看这个", "说话"])
async def test_image_then_question_without_mention(stack, text):
    setup(stack)
    await stack.receive(picture())
    await stack.receive(event(text, mid=2, group=300, direct=False))
    await latest(stack)
    assert stack.media.process.call_args.args[0]["segments"][0]["data"]["url"].endswith(
        "/1"
    )
    assert seen(stack)["content"] == text
    assert seen(stack)["media_source"]["message_id"] == "1"


@pytest.mark.asyncio
async def test_quote_someone_elses_picture_without_mention(stack):
    setup(stack)
    await stack.receive(picture(sender="201"))
    await stack.receive(quote(2, 1, "哈哈哈"))
    await latest(stack)
    assert seen(stack)["speaker"]["id"].endswith(":200")
    assert seen(stack)["media_source"]["sender"] == "201"


@pytest.mark.asyncio
async def test_speak_follows_own_latest_quoted_picture_question(stack):
    setup(stack)
    await stack.receive(picture(sender="201"))
    await stack.receive(quote(2, 1, "这张图里是啥"))
    await stack.receive(event("说话", mid=3, group=300, direct=True))
    row = stack.store.rows("SELECT * FROM qq_inbox ORDER BY created DESC LIMIT 1")[0]
    stack.store.execute(
        "UPDATE qq_inbox SET status='processing' WHERE id=?", (row["id"],)
    )
    await stack.process(row)
    assert seen(stack)["media_source"] == {"message_id": "1", "sender": "201"}


@pytest.mark.asyncio
async def test_planner_target_uses_older_members_media_not_latest_members(stack):
    setup(stack)
    await stack.receive(picture(mid=1, sender="200", text="看看我这张"))
    await stack.receive(picture(mid=2, sender="201", text="这是我的"))
    stack.conversation.decide = AsyncMock(
        return_value=Decision(
            decision="reply",
            reason_code="natural_banter",
            target_message_id="1",
            context_message_ids=["1"],
        )
    )
    await latest(stack)
    media = stack.media.process.call_args.args[0]
    assert media["message_id"] == "1" and media["sender"] == "200"
    assert media["segments"][0]["data"]["url"].endswith("/1")
    assert seen(stack)["speaker"]["id"].endswith(":200")
    latest_content = stack.store.rows(
        "SELECT content FROM qq_messages WHERE platform_id='2' AND role='user'"
    )[0]["content"]
    assert latest_content.startswith("这是我的")


@pytest.mark.asyncio
async def test_planner_can_request_media_without_keyword(stack):
    setup(stack)
    await stack.receive(picture())
    await stack.receive(event("她什么心情", mid=2, group=300, direct=False))
    stack.conversation.decide = AsyncMock(
        return_value=Decision(
            decision="reply",
            reason_code="topic_followup",
            target_message_id="2",
            needs_media=True,
        )
    )
    await latest(stack)
    assert seen(stack)["media_source"]["message_id"] == "1"


@pytest.mark.asyncio
async def test_multiple_own_images_ask_which_without_claiming_download_failed(stack):
    setup(stack)
    await stack.receive(picture(1))
    await stack.receive(picture(2))
    await stack.receive(event("看看这个", mid=3, group=300, direct=False))
    await latest(stack)
    stack.media.process.assert_not_awaited()
    stack.conversation.reply.assert_not_awaited()
    result = json.loads(
        stack.store.rows("SELECT payload FROM qq_reply_plans")[0]["payload"]
    )
    assert "哪张" in result["text"] and result["reply_to_message_id"] == "3"
    assert not stack.store.rows(
        "SELECT * FROM qq_group_decisions WHERE reason='generation_failed'"
    )


@pytest.mark.asyncio
async def test_own_image_not_confused_by_other_members_images(stack):
    setup(stack)
    await stack.receive(picture(1))
    await stack.receive(picture(2, sender="201"))
    await stack.receive(event("看看这个", mid=3, group=300, direct=False))
    await latest(stack)
    assert seen(stack)["media_source"] == {"message_id": "1", "sender": "200"}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "mode", ["other_member", "other_group", "recalled", "expired", "unknown_quote"]
)
async def test_unavailable_image_is_not_replaced_with_unrelated_media(stack, mode):
    setup(stack)
    if mode == "other_group":
        stack.store.set_group("301", True, 180, 6)
    await stack.receive(
        picture(
            1,
            sender="201" if mode == "other_member" else "200",
            group=301 if mode == "other_group" else 300,
        )
    )
    if mode == "recalled":
        stack.social.recall(
            {"notice_type": "group_recall", "group_id": 300, "message_id": 1}
        )
    if mode == "expired":
        stack.store.execute(
            "UPDATE qq_messages SET created=created-130 WHERE platform_id='1'"
        )
    data = (
        quote(2, 999, "这张图是什么")
        if mode == "unknown_quote"
        else event("这张图是什么", mid=2, group=300, direct=False)
    )
    await stack.receive(data)
    await latest(stack)
    stack.media.process.assert_not_awaited()
    assert seen(stack)["media_status"] == "not_provided"


@pytest.mark.asyncio
async def test_image_dependency_is_kept_when_planner_omits_it(stack):
    setup(stack)
    await stack.receive(picture(1))
    await stack.receive(event("这张图是什么", mid=2, group=300, direct=False))
    stack.conversation.decide = AsyncMock(
        return_value=Decision(
            decision="reply",
            reason_code="can_help",
            target_message_id="2",
            context_message_ids=["2"],
        )
    )
    await latest(stack)
    plan = stack.store.rows("SELECT dependencies FROM qq_reply_plans")[0]
    assert "1" in json.loads(plan["dependencies"])
    outgoing = stack.store.rows("SELECT * FROM qq_outbox")[0]
    stack.social.recall(
        {"notice_type": "group_recall", "group_id": 300, "message_id": 1}
    )
    assert not stack.store.submission_current(outgoing)


@pytest.mark.asyncio
@pytest.mark.parametrize("mode", ["silence", "disabled", "test_miss"])
async def test_no_media_download_when_not_joining(stack, monkeypatch, mode):
    setup(stack)
    if mode == "silence":
        stack.conversation.should_join.return_value = False
    elif mode == "disabled":
        stack.store.set_behavior("300", {"autonomous": False})
    else:
        stack.config = replace(stack.config, test_reply_percent=95)
        monkeypatch.setattr("channels.social_runtime.random.randrange", lambda _: 99)
    await stack.receive(picture())
    await latest(stack)
    stack.media.process.assert_not_awaited()
    assert not stack.store.rows("SELECT * FROM qq_outbox")


@pytest.mark.asyncio
async def test_autonomous_voice_input_is_not_downloaded(stack):
    setup(stack)
    data = event("", group=300, direct=False)
    data["message"].append(
        {"type": "record", "data": {"url": "https://gchat.qpic.cn/voice"}}
    )
    await stack.receive(data)
    await latest(stack)
    stack.media.process.assert_not_awaited()


@pytest.mark.asyncio
async def test_real_media_failure_never_generates_a_visual_guess(stack):
    setup(stack)
    stack.media.process.side_effect = MediaError("媒体下载失败：HTTP 403")
    await stack.receive(picture())
    await latest(stack)
    stack.conversation.reply.assert_not_awaited()
    assert not stack.store.rows("SELECT * FROM qq_outbox")
    assert (
        stack.store.rows(
            "SELECT stage FROM qq_group_decisions WHERE reason='generation_failed'"
        )[0]["stage"]
        == "media_input"
    )


def test_media_prompt_separates_unprovided_images_from_download_failures():
    from qq_prompt import build_qq_prompt

    prompt = build_qq_prompt(group=True, profile="", memory="", life="", history=[])
    assert "media_status=not_provided" in prompt
    assert "不得说看到空框、加载失败" in prompt


@pytest.mark.asyncio
async def test_speak_after_topic_change_does_not_attach_old_picture(stack):
    setup(stack)
    await stack.receive(picture())
    await stack.receive(
        event("换个话题，今天去哪里吃饭", mid=2, group=300, direct=False)
    )
    await stack.receive(event("说话", mid=3, group=300, direct=False))
    await latest(stack)
    stack.media.process.assert_not_awaited()
    assert seen(stack)["media_status"] == "not_provided"


@pytest.mark.asyncio
async def test_normal_autonomous_cooldown_still_limits_image_replies(stack):
    setup(stack)
    await stack.receive(picture())
    await latest(stack)
    await stack.receive(picture(2))
    await latest(stack)
    assert stack.media.process.await_count == 1
    assert len(stack.store.rows("SELECT * FROM qq_outbox")) == 1


@pytest.mark.asyncio
async def test_second_precision_timestamps_do_not_attach_future_images(stack):
    setup(stack)
    stamp = int(time.time())
    await stack.receive({**picture(1), "time": stamp})
    await stack.receive({**event("这张图是什么", mid=2, group=300, direct=False), "time": stamp})
    await stack.receive({**picture(3), "time": stamp})
    stack.conversation.decide = AsyncMock(return_value=Decision(
        decision="reply", reason_code="can_help", target_message_id="2",
    ))
    await latest(stack)
    assert seen(stack)["media_source"]["message_id"] == "1"
