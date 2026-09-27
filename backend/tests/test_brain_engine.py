import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

# 尝试导入，需要确保当前路径在 sys.path 中
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from brain_engine import UnaBrain

@pytest.fixture
def brain():
    return UnaBrain(api_key="test", base_url="test", model="test")

@pytest.mark.asyncio
@patch('database.get_user_profile', return_value="Test Profile")
@patch('database.get_recent_history', return_value=[])
async def test_legacy_action_prefix_is_stripped_without_emitting_preset_action(
    mock_get_recent_history, mock_get_user_profile, brain
):
    async def mock_create(*args, **kwargs):
        async def mock_async_generator():
            chunks = [
                "EMOTION: happy | MOOD: 5\n",
                "[动作:惊讶",
                ", ",
                "头左偏",
                "] ",
                "哇！",
                "你来了！"
            ]
            for chunk in chunks:
                mock_chunk = MagicMock()
                mock_chunk.choices = [MagicMock()]
                mock_chunk.choices[0].delta.content = chunk
                yield mock_chunk
        class MockResponse:
            def __aiter__(self):
                return mock_async_generator()
        return MockResponse()
    
    with patch.object(brain.client.chat.completions, 'create', side_effect=mock_create):
        events = []
        async for event in brain.chat_stream(user_id="test_user", user_text="hello"):
            events.append(event)
            
        # Assertions
        # 1. 应该先产生 meta
        assert events[0]['type'] == 'meta'
        assert events[0]['emotion'] == 'happy'
        
        # 2. 旧版动作标签只做清理，不再触发预设动作
        action_events = [e for e in events if e['type'] == 'chat_action']
        assert action_events == []

        # 3. 句子产出中，不应该包含 "[动作:惊讶, 头左偏]" 这类文本
        sentence_events = [e for e in events if e['type'] == 'sentence']
        combined_text = "".join([e['text'] for e in sentence_events])
        assert "[动作" not in combined_text
        assert "惊讶" not in combined_text
        assert "哇！" in combined_text


@pytest.mark.asyncio
@pytest.mark.parametrize("channel", ["qq_private", "qq_group", "web"])
async def test_channel_persona_and_generation_budget(brain, channel):
    async def empty_stream():
        if False:
            yield None
    create = AsyncMock(return_value=empty_stream())
    with patch.object(brain.client.chat.completions, "create", create):
        _ = [event async for event in brain.chat_stream(
            "test", "你好", context={"profile": "PRIVATE_PROFILE", "history": []},
            long_term_memory="PRIVATE_MEMORY", life_context="PRIVATE_LIFE", channel=channel,
        )]
    options = create.call_args.kwargs
    prompt = options["messages"][0]["content"]
    if channel == "web":
        assert "心理支持 AI" in prompt
        assert "max_tokens" not in options
    else:
        assert "你是 UNA，在 QQ" in prompt
        assert "80-150" not in prompt
        assert "tracks" not in prompt
        assert options["max_tokens"] == 768
        if channel == "qq_group":
            assert "PRIVATE_PROFILE" not in prompt
            assert "PRIVATE_MEMORY" not in prompt
            assert "PRIVATE_LIFE" not in prompt
        else:
            assert "PRIVATE_PROFILE" in prompt


@pytest.mark.asyncio
async def test_qq_images_are_passed_as_user_content_blocks(brain):
    async def empty_stream():
        if False:
            yield None
    create = AsyncMock(return_value=empty_stream())
    images = ["data:image/jpeg;base64,YQ==", "data:image/jpeg;base64,Yg=="]
    with patch.object(brain.client.chat.completions, "create", create):
        _ = [event async for event in brain.chat_stream(
            "qq_group", '{"speaker":{"id":"member:200"},"content":"两张图有何不同"}',
            context={"profile": "", "history": []}, channel="qq_group", images=images,
        )]
    messages = create.call_args.kwargs["messages"]
    assert isinstance(messages[0]["content"], str)
    content = messages[1]["content"]
    assert "member:200" in content[0]["text"]
    assert [part["image_url"]["url"] for part in content[1:]] == images
