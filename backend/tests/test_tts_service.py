import pytest

from speech_metrics import SpeechTrace, log_speech_stage
from tts_service import build_gsv_payload


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
