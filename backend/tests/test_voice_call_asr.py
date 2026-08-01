import threading
import sys
import types

import numpy as np
import pytest

# ASR model loading is external and slow; these tests exercise UNA's boundary only.
funasr_stub = types.ModuleType("funasr")
funasr_stub.AutoModel = object
sys.modules.setdefault("funasr", funasr_stub)

import asr_engine
from asr_engine import SenseVoiceASR


class FakeModel:
    def __init__(self, result):
        self.result = result
        self.inputs = []

    def generate(self, **kwargs):
        self.inputs.append(kwargs["input"])
        return self.result


def make_engine(model):
    engine = SenseVoiceASR.__new__(SenseVoiceASR)
    engine.model = model
    engine._inference_lock = threading.Lock()
    return engine


def test_recognize_pcm16_passes_normalized_float_array_to_model_without_ffmpeg_or_disk(monkeypatch):
    def forbidden_side_effect(*args, **kwargs):
        raise AssertionError("PCM recognition must not invoke FFmpeg or the filesystem")

    monkeypatch.setattr(asr_engine.subprocess, "run", forbidden_side_effect)
    monkeypatch.setattr(asr_engine.os.path, "exists", forbidden_side_effect)
    engine = make_engine(FakeModel([{"text": "<|zh|><|HAPPY|><|speech|>你好"}]))
    pcm = np.array([-32768, 0, 32767], dtype="<i2").tobytes()

    text, emotion = engine.recognize_pcm16(pcm)

    received = engine.model.inputs[0]
    assert received.dtype == np.float32
    assert received.tolist() == pytest.approx([-1.0, 0.0, 32767 / 32768])
    assert (text, emotion) == ("你好", "happy")


@pytest.mark.parametrize(
    ("pcm_factory", "sample_rate", "error"),
    [
        pytest.param(lambda: b"\x00", 16000, "PCM16", id="odd-byte-count"),
        pytest.param(lambda: b"\x00" * 960002, 16000, "PCM16", id="input-too-large"),
        pytest.param(lambda: b"\x00\x00", 8000, "16 kHz", id="wrong-sample-rate"),
    ],
)
def test_recognize_pcm16_rejects_invalid_realtime_audio_before_model_inference(pcm_factory, sample_rate, error):
    model = FakeModel([])
    engine = make_engine(model)

    with pytest.raises(ValueError, match=error):
        engine.recognize_pcm16(pcm_factory(), sample_rate=sample_rate)

    assert model.inputs == []


def test_recognize_pcm16_returns_empty_recognition_for_empty_audio():
    model = FakeModel([])
    engine = make_engine(model)

    assert engine.recognize_pcm16(b"") == ("", "neutral")
    assert model.inputs == []


def test_recognize_pcm16_returns_empty_recognition_when_model_is_unavailable():
    engine = make_engine(None)

    assert engine.recognize_pcm16(b"\x00\x00") == ("", "neutral")


def test_recognize_file_keeps_tag_and_emotion_cleanup_behavior(monkeypatch):
    engine = make_engine(FakeModel([{"text": "<|zh|><|SAD|><|speech|>  保持文件识别  "}]))
    monkeypatch.setattr(engine, "_convert_audio_to_pcm", lambda path: path)

    assert engine.recognize("existing.wav") == ("保持文件识别", "sad")
