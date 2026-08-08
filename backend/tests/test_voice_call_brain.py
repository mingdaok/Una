import os
import sys
from unittest.mock import MagicMock, patch

import pytest


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from brain_engine import UnaBrain


class StreamResponse:
    def __init__(self, chunks):
        self._chunks = chunks

    def __aiter__(self):
        async def generate():
            for text in self._chunks:
                chunk = MagicMock()
                chunk.choices = [MagicMock()]
                chunk.choices[0].delta.content = text
                yield chunk

        return generate()


async def collect(stream):
    return [event async for event in stream]


@pytest.fixture
def brain():
    return UnaBrain(api_key="test", base_url="http://test", model="test-model")


@pytest.mark.asyncio
async def test_voice_stream_uses_snapshot_prompt_and_drops_all_control_events(brain):
    captured = {}

    async def create(**kwargs):
        captured.update(kwargs)
        return StreamResponse([
            "EMOTION: happy | MOOD: 2\n",
            'ACTION: {"tracks":[]}\n',
            "你好呀！我们慢慢聊。",
        ])

    with (
        patch.object(brain.client.chat.completions, "create", side_effect=create),
        patch("database.get_user_profile", side_effect=AssertionError("voice stream must use snapshot")),
        patch("database.get_recent_history", side_effect=AssertionError("voice stream must use snapshot")),
    ):
        events = await collect(brain.chat_voice_stream(
            "u1",
            "你好",
            profile="喜欢猫",
            recent_history=({"role": "user", "content": "早安"},),
            long_term_memory="一起看过雨",
        ))

    prompt = captured["messages"][0]["content"]
    body = "".join(event["text"] for event in events if event["type"] == "sentence")
    assert "只输出适合直接朗读的自然语言正文" in prompt
    assert "喜欢猫" in prompt
    assert "一起看过雨" in prompt
    assert "user: 早安" in prompt
    assert body == "你好呀！我们慢慢聊。"
    assert "ACTION:" not in body
    assert "EMOTION:" not in body
    assert {event["type"] for event in events} <= {"meta", "sentence"}
    assert events[0] == {"type": "meta", "emotion": "happy", "mood_score": 2}


@pytest.mark.asyncio
async def test_voice_stream_emits_crisis_reply_without_calling_provider(brain):
    with patch.object(
        brain.client.chat.completions,
        "create",
        side_effect=AssertionError("crisis reply must be local"),
    ):
        events = await collect(brain.chat_voice_stream(
            "u1", "我不想活了", profile="", recent_history=(), long_term_memory="",
        ))

    assert events[0] == {"type": "meta", "emotion": "uneasy", "mood_score": -5}
    assert "联系身边的人" in events[1]["text"]


@pytest.mark.asyncio
async def test_voice_stream_flushes_first_strong_sentence_and_unpunctuated_tail(brain):
    async def create(**kwargs):
        return StreamResponse(["好！", "我会一直在这里"])

    with patch.object(brain.client.chat.completions, "create", side_effect=create):
        events = await collect(brain.chat_voice_stream(
            "u1", "陪陪我", profile="", recent_history=(), long_term_memory="",
        ))

    sentences = [event["text"] for event in events if event["type"] == "sentence"]
    assert sentences == ["好！", "我会一直在这里"]


@pytest.mark.asyncio
async def test_voice_stream_uses_fixed_plain_fallback_on_provider_error(brain):
    with patch.object(
        brain.client.chat.completions,
        "create",
        side_effect=RuntimeError("network down"),
    ):
        events = await collect(brain.chat_voice_stream(
            "u1", "你好", profile="", recent_history=(), long_term_memory="",
        ))

    assert events == [
        {"type": "meta", "emotion": "neutral", "mood_score": 0},
        {"type": "sentence", "text": "我好像有点卡住了，稍等我一下。"},
    ]


@pytest.mark.asyncio
@patch("database.get_user_profile", return_value="profile")
@patch("database.get_recent_history", return_value=[])
async def test_existing_chat_stream_keeps_live2d_control_prompt(history, profile, brain):
    captured = {}

    async def create(**kwargs):
        captured.update(kwargs)
        return StreamResponse(["EMOTION: neutral | MOOD: 0\n", "ACTION: null\n", "你好！"])

    with patch.object(brain.client.chat.completions, "create", side_effect=create):
        await collect(brain.chat_stream("u1", "你好"))

    prompt = captured["messages"][0]["content"]
    assert "第二行必须为 ACTION 控制行" in prompt
    assert "只输出适合直接朗读的自然语言正文" not in prompt
