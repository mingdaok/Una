import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

from speech_metrics import SpeechTrace, log_speech_stage
from tts_service import build_gsv_payload


def test_realtime_payload_requests_raw_mode_two_without_changing_default():
    normal = build_gsv_payload("你好")
    realtime = build_gsv_payload("你好", media_type="raw", streaming_mode=2)

    assert (normal["media_type"], normal["streaming_mode"]) == ("wav", False)
    assert (realtime["media_type"], realtime["streaming_mode"]) == ("raw", 2)
    assert realtime["text_split_method"] == "cut0"
    assert realtime["fragment_interval"] == pytest.approx(0.05)


def test_short_tts_unit_avoids_second_split_and_long_silence():
    payload = build_gsv_payload("这是一个短语音单元。", "neutral")

    assert payload["streaming_mode"] is False
    assert payload["text_split_method"] == "cut0"
    assert payload["fragment_interval"] == 0.05


def test_oversized_direct_call_falls_back_to_punctuation_split():
    payload = build_gsv_payload("很长。" * 41, "neutral")

    assert len(payload["text"]) > 80
    assert payload["text_split_method"] == "cut5"


def test_stage_log_contains_no_media_url_or_ticket(capsys):
    trace = SpeechTrace(reply_id="reply-1", chunk_index=2)

    log_speech_stage(trace, "gpt_http", 123.45, status="ok")

    output = capsys.readouterr().out
    assert "reply-1" in output
    assert "chunk=2" in output
    assert "123.45" in output
    assert "ticket=" not in output
    assert "/api/media/" not in output


@pytest.mark.asyncio
async def test_generate_audio_records_each_successful_external_stage(monkeypatch, tmp_path):
    import tts_service

    stages = []

    class FakeResponse:
        status = 200

        async def read(self):
            return b"wav-content"

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

    class FakeSession:
        def __init__(self, *, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        def post(self, url, *, json):
            return FakeResponse()

    async def fake_rhubarb(audio_filepath):
        return [{"value": "A", "start": 0.0, "end": 0.1}]

    async def fake_transcode(wav_filepath, mp3_filepath):
        return True

    monkeypatch.setattr(tts_service.aiohttp, "ClientSession", FakeSession)
    monkeypatch.setattr(tts_service, "_run_rhubarb", fake_rhubarb)
    monkeypatch.setattr(tts_service, "_convert_wav_to_mp3", fake_transcode)
    monkeypatch.setattr(tts_service, "AUDIO_DIR", str(tmp_path))
    monkeypatch.setattr(tts_service, "REF_AUDIO_PATH", "reference.wav")
    monkeypatch.setattr(
        tts_service,
        "log_speech_stage",
        lambda trace, stage, duration_ms, *, status="ok": stages.append((trace, stage, status)),
    )
    trace = SpeechTrace(reply_id="reply-1", chunk_index=2)

    audio_url, visemes = await tts_service.generate_audio_gsv(
        "测试语音", "neutral", trace=trace
    )

    assert audio_url is not None
    assert audio_url.endswith(".mp3")
    assert visemes == [{"value": "A", "start": 0.0, "end": 0.1}]
    assert [stage for _, stage, _ in stages] == [
        "gpt_http",
        "write_file",
        "rhubarb",
        "transcode",
    ]
    assert all(recorded_trace == trace and status == "ok" for recorded_trace, _, status in stages)


@pytest.mark.asyncio
async def test_generate_audio_marks_missing_rhubarb_as_failed_but_returns_audio(monkeypatch, tmp_path):
    import tts_service

    stages = []

    class FakeResponse:
        status = 200

        async def read(self):
            return b"wav-content"

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

    class FakeSession:
        def __init__(self, *, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        def post(self, url, *, json):
            return FakeResponse()

    async def fake_transcode(wav_filepath, mp3_filepath):
        return True

    monkeypatch.setattr(tts_service.aiohttp, "ClientSession", FakeSession)
    monkeypatch.setattr(tts_service, "_convert_wav_to_mp3", fake_transcode)
    monkeypatch.setattr(tts_service, "AUDIO_DIR", str(tmp_path))
    monkeypatch.setattr(tts_service, "CURRENT_DIR", str(tmp_path))
    monkeypatch.setattr(tts_service, "REF_AUDIO_PATH", "reference.wav")
    monkeypatch.setattr(
        tts_service,
        "log_speech_stage",
        lambda trace, stage, duration_ms, *, status="ok": stages.append((stage, status)),
    )

    audio_url, visemes = await tts_service.generate_audio_gsv(
        "测试语音", "neutral", trace=SpeechTrace(reply_id="reply-1", chunk_index=2)
    )

    assert audio_url is not None
    assert audio_url.endswith(".mp3")
    assert visemes == []
    assert stages == [
        ("gpt_http", "ok"),
        ("write_file", "ok"),
        ("rhubarb", "failed"),
        ("transcode", "ok"),
    ]


@pytest.mark.asyncio
async def test_edge_rhubarb_failure_removes_temporary_wav_and_keeps_mp3(monkeypatch, tmp_path):
    import tts_service

    stages = []

    class FakeCommunicate:
        def __init__(self, text, voice, *, rate):
            pass

        async def save(self, filepath):
            Path(filepath).write_bytes(b"mp3-content")

    class FakeProcess:
        returncode = 0

        async def communicate(self):
            return b"", b""

    async def fake_create_subprocess_exec(*args, **kwargs):
        Path(args[-1]).write_bytes(b"wav-content")
        return FakeProcess()

    async def failing_rhubarb(wav_filepath):
        assert Path(wav_filepath).exists()
        raise tts_service.RhubarbStageError("alignment failed")

    monkeypatch.setitem(
        sys.modules, "edge_tts", SimpleNamespace(Communicate=FakeCommunicate)
    )
    monkeypatch.setattr(tts_service.asyncio, "create_subprocess_exec", fake_create_subprocess_exec)
    monkeypatch.setattr(tts_service, "_run_rhubarb", failing_rhubarb)
    monkeypatch.setattr(tts_service, "AUDIO_DIR", str(tmp_path))
    monkeypatch.setattr(tts_service, "REF_AUDIO_PATH", "")
    monkeypatch.setattr(
        tts_service,
        "log_speech_stage",
        lambda trace, stage, duration_ms, *, status="ok": stages.append((stage, status)),
    )

    audio_url, visemes = await tts_service.generate_audio_gsv(
        "Edge 降级语音", "neutral", trace=SpeechTrace("reply-edge", 4)
    )

    assert audio_url is not None
    assert audio_url.endswith(".mp3")
    assert visemes == []
    assert list(tmp_path.glob("*.mp3"))
    assert list(tmp_path.glob("*.wav")) == []
    assert stages == [("rhubarb", "failed")]


@pytest.mark.asyncio
async def test_edge_wav_cleanup_failure_does_not_discard_playable_mp3(monkeypatch, tmp_path):
    import tts_service

    cleanup_attempts = []

    class FakeCommunicate:
        def __init__(self, text, voice, *, rate):
            pass

        async def save(self, filepath):
            Path(filepath).write_bytes(b"mp3-content")

    class FakeProcess:
        returncode = 0

        async def communicate(self):
            return b"", b""

    async def fake_create_subprocess_exec(*args, **kwargs):
        Path(args[-1]).write_bytes(b"wav-content")
        return FakeProcess()

    async def successful_rhubarb(wav_filepath):
        return [{"value": "A", "start": 0.0, "end": 0.1}]

    def failing_remove(filepath):
        cleanup_attempts.append(Path(filepath).suffix)
        raise OSError("cleanup denied")

    monkeypatch.setitem(
        sys.modules, "edge_tts", SimpleNamespace(Communicate=FakeCommunicate)
    )
    monkeypatch.setattr(tts_service.asyncio, "create_subprocess_exec", fake_create_subprocess_exec)
    monkeypatch.setattr(tts_service, "_run_rhubarb", successful_rhubarb)
    monkeypatch.setattr(tts_service.os, "remove", failing_remove)
    monkeypatch.setattr(tts_service, "AUDIO_DIR", str(tmp_path))
    monkeypatch.setattr(tts_service, "REF_AUDIO_PATH", "")

    audio_url, visemes = await tts_service.generate_audio_gsv(
        "Edge 降级语音", "neutral", trace=SpeechTrace("reply-edge", 5)
    )

    assert audio_url is not None
    assert audio_url.endswith(".mp3")
    assert visemes == [{"value": "A", "start": 0.0, "end": 0.1}]
    assert list(tmp_path.glob("*.mp3"))
    assert cleanup_attempts == [".wav"]
