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
