"""Transport quoting is independent of the internal response target."""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
import test_qq_channels
from test_qq_social import png
from channels.social_types import ReplyPlan
from conversation_service import ConversationService

stack = test_qq_channels.stack
event = test_qq_channels.event


def test_old_and_null_plans_default_to_plain():
    assert (
        ReplyPlan.model_validate({"text": "好", "reply_to_message_id": "1"}).reply_style
        == "plain"
    )
    assert ReplyPlan.model_validate({"reply_style": None}).reply_style == "plain"
    with pytest.raises(ValueError):
        ReplyPlan(reply_style="at_all")


@pytest.mark.asyncio
@pytest.mark.parametrize("direct", [True, False])
async def test_mentions_and_autonomous_replies_both_default_to_plain(stack, direct):
    stack.store.set_group("300", True, 180, 6)
    await stack.receive(event(group=300, direct=direct))
    await test_qq_channels.process_first(stack)
    out = stack.store.rows("SELECT * FROM qq_outbox")[0]
    assert [s["type"] for s in json.loads(out["payload"])] == ["text"]
    stored = stack.store.rows("SELECT * FROM qq_reply_plans")[0]
    assert json.loads(stored["payload"])["reply_to_message_id"] == "1"
    assert "1" in json.loads(stored["dependencies"])
    stack.store.delivered(out, "900")
    conv = stack.store.conversation("group", "300")
    history = stack.store.history(conv["id"], conv["generation"], group=True)
    own = next(h["identity"] for h in history if h["role"] == "assistant")
    assert own["reply_to"] is None
    assert own["response_to_message_id"] == "1"
    assert stack.store.known_reply("300", "900")
    stack.social.recall(
        {"notice_type": "group_recall", "group_id": 300, "message_id": 1}
    )
    assert not stack.store.submission_current(out)


@pytest.mark.asyncio
@pytest.mark.parametrize("style", ["plain", "quote"])
@pytest.mark.parametrize("kind", ["text", "sticker", "combined"])
async def test_quote_is_optional_and_only_on_first_part(stack, style, kind):
    stack.store.set_group("300", True, 180, 6)
    await stack.receive(event(group=300))
    row = stack.store.rows("SELECT * FROM qq_inbox")[0]
    stack.store.execute(
        "UPDATE qq_inbox SET status='processing' WHERE id=?", (row["id"],)
    )
    text = "好" * 650 if kind != "sticker" else ""
    sticker = None
    if kind != "text":
        asset = stack.social.library.add(png(), "300", "开心")
        sticker = stack.social.library.usable(asset["id"], "300")
    plan = ReplyPlan(text=text, reply_to_message_id="1", reply_style=style)
    stack.store.complete(row, text, {}, plan=plan, sticker=sticker)
    outgoing = stack.store.rows("SELECT * FROM qq_outbox ORDER BY rowid")
    types = [[s["type"] for s in json.loads(out["payload"])] for out in outgoing]
    assert sum(parts.count("reply") for parts in types) == (
        1 if style == "quote" else 0
    )
    assert all("at" not in parts for parts in types)
    if style == "quote":
        assert json.loads(outgoing[0]["payload"])[0] == {
            "type": "reply",
            "data": {"id": "1"},
        }
    meta = json.loads(
        stack.store.rows("SELECT metadata FROM qq_messages WHERE role='assistant'")[0][
            "metadata"
        ]
    )
    assert meta["response_to_message_id"] == "1"
    assert meta["reply_id"] == ("1" if style == "quote" else None)


@pytest.mark.asyncio
async def test_model_quote_cannot_change_validated_target(stack):
    stack.store.set_group("300", True, 180, 6)
    stack.conversation.brain = SimpleNamespace(client=object())
    stack.conversation.reply_plan = AsyncMock(
        return_value=(
            ReplyPlan(
                text="这个问题",
                reply_style="quote",
                reply_to_message_id="foreign-message",
            ),
            "neutral",
            {},
        )
    )
    await stack.receive(event(group=300))
    await test_qq_channels.process_first(stack)
    out = stack.store.rows("SELECT payload FROM qq_outbox")[0]
    assert json.loads(out["payload"])[0] == {"type": "reply", "data": {"id": "1"}}


@pytest.mark.asyncio
async def test_private_message_never_emits_group_quote(stack):
    test_qq_channels.bind(stack)
    await stack.receive(event())
    row = stack.store.rows("SELECT * FROM qq_inbox")[0]
    stack.store.execute(
        "UPDATE qq_inbox SET status='processing' WHERE id=?", (row["id"],)
    )
    stack.store.complete(
        row,
        "好",
        {},
        plan=ReplyPlan(text="好", reply_style="quote", reply_to_message_id="1"),
    )
    out = stack.store.rows("SELECT payload FROM qq_outbox")[0]
    assert json.loads(out["payload"]) == [{"type": "text", "data": {"text": "好"}}]


@pytest.mark.asyncio
async def test_model_prompt_requests_plain_by_default_and_accepts_quote():
    service = ConversationService(SimpleNamespace(), None, None)
    service.json_request = AsyncMock(
        return_value={"text": "回答前面那条", "reply_style": "quote"}
    )
    plan, _, _ = await service.reply_plan("问题", [], group=True)
    assert plan.reply_style == "quote"
    prompt = service.json_request.call_args.args[0]
    assert '"reply_style":"plain"' in prompt
    assert "即使对方@你也不必引用回去" in prompt
