import os
import sys
from unittest.mock import MagicMock, patch

import pytest


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from brain_engine import UnaBrain


@pytest.mark.asyncio
@patch('database.get_user_profile', return_value="Test Profile")
@patch('database.get_recent_history', return_value=[])
async def test_cross_model_action_is_dropped_without_leaking_control_text(
    mock_get_recent_history, mock_get_user_profile
):
    brain = UnaBrain(api_key="test", base_url="test", model="test")

    async def mock_create(*args, **kwargs):
        async def mock_async_generator():
            contents = [
                "EMOTION: neutral | MOOD: 0\n",
                (
                    'ACTION: {"duration_ms":900,"variation_seed":1,'
                    '"blend":{"in_ms":80,"out_ms":120},'
                    '"tracks":[{"channel":"panda_hug","mode":"override",'
                    '"keyframes":[{"t":0,"value":0},{"t":0.5,"value":1},'
                    '{"t":1,"value":0}]}]}\n'
                ),
                "safe reply",
            ]
            for content in contents:
                chunk = MagicMock()
                chunk.choices = [MagicMock()]
                chunk.choices[0].delta.content = content
                yield chunk

        class MockResponse:
            def __aiter__(self):
                return mock_async_generator()

        return MockResponse()

    with patch.object(brain.client.chat.completions, 'create', side_effect=mock_create):
        events = []
        async for event in brain.chat_stream(
            user_id="test_user",
            user_text="hello",
            live2d_model="hiyori",
        ):
            events.append(event)

    assert not [event for event in events if event['type'] == 'live2d_action_candidate']
    sentences = "".join(
        event['text'] for event in events if event['type'] == 'sentence'
    )
    assert sentences == "safe reply"
    assert "ACTION:" not in sentences


@pytest.mark.asyncio
@patch('database.get_user_profile', return_value="Test Profile")
@patch('database.get_recent_history', return_value=[])
async def test_chat_stream_emits_v3_motion_candidate_before_reply_text(
    mock_get_recent_history, mock_get_user_profile
):
    brain = UnaBrain(api_key="test", base_url="test", model="test")

    async def mock_create(*args, **kwargs):
        async def mock_async_generator():
            chunks = [
                "EMOTION: shy | MOOD: 2\n",
                (
                    'ACTION: {"duration_ms":1200,"variation_seed":8,'
                    '"blend":{"in_ms":100,"out_ms":160},'
                    '"tracks":[{"channel":"head_pitch","mode":"override",'
                    '"keyframes":[{"t":0,"value":0},{"t":0.5,"value":-0.4},'
                    '{"t":1,"value":0}]}]}\n'
                ),
                "你好呀！",
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
    assert candidates[0]['plan']['tracks'][0]['channel'] == 'head_pitch'
    reply_text = "".join(event['text'] for event in events if event['type'] == 'sentence')
    assert 'ACTION:' not in reply_text


@pytest.mark.asyncio
@patch('database.get_user_profile', return_value="Test Profile")
@patch('database.get_recent_history', return_value=[])
async def test_action_json_without_trailing_newline_is_not_sent_as_reply_text(
    mock_get_recent_history, mock_get_user_profile
):
    brain = UnaBrain(api_key="test", base_url="test", model="test")

    async def mock_create(*args, **kwargs):
        async def mock_async_generator():
            chunks = [
                "EMOTION: shy | MOOD: 2\n",
                'ACTION: {"intent": "shy_happy", ',
                '"intensity": 0.4, "expression": "subtle", ',
                '"timing": "after_sentence", "duration_ms": 800, ',
                '"variation_seed": 3}小白呀……当然记得！',
            ]
            for content in chunks:
                mock_chunk = MagicMock()
                mock_chunk.choices = [MagicMock()]
                mock_chunk.choices[0].delta.content = content
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
    sentences = "".join(event['text'] for event in events if event['type'] == 'sentence')
    assert len(candidates) == 1
    assert candidates[0]['plan']['intent'] == 'shy_happy'
    assert sentences == '小白呀……当然记得！'
    assert 'ACTION:' not in sentences


@pytest.mark.asyncio
@patch('database.get_user_profile', return_value="Test Profile")
@patch('database.get_recent_history', return_value=[])
async def test_chat_stream_ignores_provider_chunks_without_choices(
    mock_get_recent_history, mock_get_user_profile
):
    brain = UnaBrain(api_key="test", base_url="test", model="test")

    async def mock_create(*args, **kwargs):
        async def mock_async_generator():
            contents = [
                "EMOTION: neutral | MOOD: 0\n",
                "ACTION: null\n",
                "我还记得你！",
            ]
            for content in contents:
                mock_chunk = MagicMock()
                mock_chunk.choices = [MagicMock()]
                mock_chunk.choices[0].delta.content = content
                yield mock_chunk

            terminal_chunk = MagicMock()
            terminal_chunk.choices = []
            yield terminal_chunk

        class MockResponse:
            def __aiter__(self):
                return mock_async_generator()

        return MockResponse()

    with patch.object(brain.client.chat.completions, 'create', side_effect=mock_create):
        events = []
        async for event in brain.chat_stream(user_id="test_user", user_text="hello"):
            events.append(event)

    sentences = "".join(event['text'] for event in events if event['type'] == 'sentence')
    assert sentences == '我还记得你！'
    assert '卡住' not in sentences


@pytest.mark.asyncio
@patch('database.get_user_profile', return_value="Test Profile")
@patch('database.get_recent_history', return_value=[])
async def test_balanced_invalid_action_json_is_dropped_without_losing_reply_text(
    mock_get_recent_history, mock_get_user_profile
):
    brain = UnaBrain(api_key="test", base_url="test", model="test")

    async def mock_create(*args, **kwargs):
        async def mock_async_generator():
            contents = [
                "EMOTION: neutral | MOOD: 0\n",
                'ACTION: {"intent": broken}正文仍然保留！',
            ]
            for content in contents:
                mock_chunk = MagicMock()
                mock_chunk.choices = [MagicMock()]
                mock_chunk.choices[0].delta.content = content
                yield mock_chunk

        class MockResponse:
            def __aiter__(self):
                return mock_async_generator()

        return MockResponse()

    with patch.object(brain.client.chat.completions, 'create', side_effect=mock_create):
        events = []
        async for event in brain.chat_stream(user_id="test_user", user_text="hello"):
            events.append(event)

    sentences = "".join(event['text'] for event in events if event['type'] == 'sentence')
    assert sentences == '正文仍然保留！'
    assert 'ACTION:' not in sentences


@pytest.mark.asyncio
@patch('database.get_user_profile', return_value="Test Profile")
@patch('database.get_recent_history', return_value=[])
async def test_truncated_action_json_at_end_of_stream_is_never_sent_as_reply_text(
    mock_get_recent_history, mock_get_user_profile
):
    brain = UnaBrain(api_key="test", base_url="test", model="test")

    async def mock_create(*args, **kwargs):
        async def mock_async_generator():
            contents = [
                "EMOTION: neutral | MOOD: 0\n",
                'ACTION: {"intent": "shy_happy"',
            ]
            for content in contents:
                mock_chunk = MagicMock()
                mock_chunk.choices = [MagicMock()]
                mock_chunk.choices[0].delta.content = content
                yield mock_chunk

        class MockResponse:
            def __aiter__(self):
                return mock_async_generator()

        return MockResponse()

    with patch.object(brain.client.chat.completions, 'create', side_effect=mock_create):
        events = []
        async for event in brain.chat_stream(user_id="test_user", user_text="hello"):
            events.append(event)

    sentences = "".join(event['text'] for event in events if event['type'] == 'sentence')
    assert sentences == ''


@pytest.mark.asyncio
@patch('database.get_user_profile', return_value="Test Profile")
@patch('database.get_recent_history', return_value=[])
async def test_mixed_legacy_and_semantic_action_prefix_is_fully_intercepted(
    mock_get_recent_history, mock_get_user_profile
):
    brain = UnaBrain(api_key="test", base_url="test", model="test")

    async def mock_create(*args, **kwargs):
        async def mock_async_generator():
            contents = [
                "EMOTION: thinking | MOOD: 3\n",
                "[动作:期待] ",
                'ACTION: {"intent": "curious_question", "intensity": 0.4, ',
                '"expression": "subtle", "timing": "after_sentence", ',
                '"duration_ms": 1000, "variation_seed": 5}',
                "（光晕轻晃）啊呀！让我猜猜。",
            ]
            for content in contents:
                mock_chunk = MagicMock()
                mock_chunk.choices = [MagicMock()]
                mock_chunk.choices[0].delta.content = content
                yield mock_chunk

        class MockResponse:
            def __aiter__(self):
                return mock_async_generator()

        return MockResponse()

    with patch.object(brain.client.chat.completions, 'create', side_effect=mock_create):
        events = []
        async for event in brain.chat_stream(user_id="test_user", user_text="hello"):
            events.append(event)

    candidates = [
        event for event in events
        if event['type'] == 'live2d_action_candidate'
    ]
    sentences = "".join(
        event['text'] for event in events
        if event['type'] == 'sentence'
    )

    assert len(candidates) == 1
    assert candidates[0]['plan']['intent'] == 'curious_question'
    assert sentences == "啊呀！让我猜猜。"
    assert 'ACTION:' not in sentences
    assert '[动作:' not in sentences
