from pathlib import Path
import os
import sys
from unittest.mock import MagicMock, patch

import pytest


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from brain_engine import UnaBrain


async def _captured_stream_prompt(live2d_model):
    brain = UnaBrain(api_key="test", base_url="test", model="test")
    captured = {}

    async def mock_create(*args, **kwargs):
        captured["prompt"] = kwargs["messages"][0]["content"]

        async def chunks():
            for content in (
                "EMOTION: neutral | MOOD: 0\n",
                "ACTION: null\n",
                "hello",
            ):
                chunk = MagicMock()
                chunk.choices = [MagicMock()]
                chunk.choices[0].delta.content = content
                yield chunk

        class Response:
            def __aiter__(self):
                return chunks()

        return Response()

    with (
        patch('database.get_user_profile', return_value="Test Profile"),
        patch('database.get_recent_history', return_value=[]),
        patch.object(brain.client.chat.completions, 'create', side_effect=mock_create),
    ):
        async for _ in brain.chat_stream(
            user_id="test-user",
            user_text="hello",
            live2d_model=live2d_model,
        ):
            pass

    return captured["prompt"]


@pytest.mark.asyncio
async def test_hiyori_prompt_allows_generic_and_four_arm_channels_only():
    prompt = await _captured_stream_prompt("hiyori")

    for channel in (
        "head_yaw", "head_pitch", "head_roll", "body_yaw", "body_pitch",
        "body_roll", "gaze_x", "gaze_y", "eye_open", "eye_smile",
        "brow_y", "brow_form", "cheek", "left_arm_raise",
        "right_arm_raise", "left_hand_wave", "right_hand_wave",
    ):
        assert channel in prompt
    assert "panda_hug" not in prompt
    assert "hands_to_face" not in prompt


@pytest.mark.asyncio
async def test_panda_prompt_allows_generic_and_panda_channels_only():
    prompt = await _captured_stream_prompt("panda_cake")

    for channel in (
        "head_yaw", "head_pitch", "head_roll", "body_yaw", "body_pitch",
        "body_roll", "gaze_x", "gaze_y", "eye_open", "eye_smile",
        "brow_y", "brow_form", "cheek", "panda_hug", "hands_to_face",
    ):
        assert channel in prompt
    assert "left_arm_raise" not in prompt
    assert "right_arm_raise" not in prompt
    assert "left_hand_wave" not in prompt
    assert "right_hand_wave" not in prompt
    assert "panda_hug、hands_to_face 的值域为 0..1" in prompt


@pytest.mark.asyncio
@pytest.mark.parametrize("live2d_model", [None, "forged-model"])
async def test_missing_or_unknown_model_prompt_allows_generic_channels_only(
    live2d_model,
):
    prompt = await _captured_stream_prompt(live2d_model)

    assert "head_pitch" in prompt
    for model_only_channel in (
        "left_arm_raise", "right_arm_raise", "left_hand_wave",
        "right_hand_wave", "panda_hug", "hands_to_face",
    ):
        assert model_only_channel not in prompt


def test_brain_prompt_uses_parser_compatible_control_examples():
    source = (
        Path(__file__).resolve().parents[1] / "brain_engine.py"
    ).read_text(encoding="utf-8")

    assert "EMOTION: happy | MOOD: 3" in source
    assert "ACTION: null 或 subtle" not in source
    assert '"channel":"head_pitch"' in source
    assert "mouth_open" in source
    assert "禁止" in source
    assert "ParamAngleX" not in source
