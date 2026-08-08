import os
import sys


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from voice_call_metrics import log_voice_metric, sanitize_voice_metric


def test_metric_drops_tokens_text_urls_and_audio(capsys):
    log_voice_metric({
        "session_id": "1234567890",
        "turn_id": 2,
        "stage": "asr",
        "status": "completed",
        "duration_ms": 12.5,
        "ticket": "secret",
        "Authorization": "Bearer secret",
        "text": "私人内容",
        "pcm": b"secret",
        "url": "/ws/voice-call?ticket=secret",
    })
    output = capsys.readouterr().out
    assert "12345678" in output
    assert "1234567890" not in output
    assert "secret" not in output
    assert "私人内容" not in output
    assert "ticket" not in output


def test_metric_rejects_unknown_stage_and_unbounded_values():
    assert sanitize_voice_metric({"stage": "unknown", "duration_ms": 1}) is None
    assert sanitize_voice_metric({"stage": "asr", "duration_ms": float("inf")}) == {
        "stage": "asr",
    }


def test_metric_sink_failure_is_never_propagated():
    def broken_writer(_line):
        raise RuntimeError("sink failed")

    log_voice_metric({"stage": "cancel", "status": "cancelled"}, writer=broken_writer)
