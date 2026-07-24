import os
import sys
from unittest.mock import MagicMock, patch

import pytest


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from brain_engine import UnaBrain


@pytest.mark.asyncio
@patch('database.get_user_profile', return_value="Test Profile")
@patch('database.get_recent_history', return_value=[])
async def test_chat_stream_emits_structured_action_candidate_before_reply_text(
    mock_get_recent_history, mock_get_user_profile
):
    brain = UnaBrain(api_key="test", base_url="test", model="test")

    async def mock_create(*args, **kwargs):
        async def mock_async_generator():
            chunks = [
                "EMOTION: shy | MOOD: 2\n",
                'ACTION: {"intent": "shy_happy", ',
                '"intensity": 0.68, "expression": "subtle", ',
                '"timing": "after_sentence", "duration_ms": 1200, ',
                '"variation_seed": 8}\n你好呀！',
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

    candidates = [event for event in events if event['type'] == 'live2d_action_candidate']
    assert len(candidates) == 1
    assert candidates[0]['plan']['intent'] == 'shy_happy'
    sentences = "".join(event['text'] for event in events if event['type'] == 'sentence')
    assert 'ACTION:' not in sentences
