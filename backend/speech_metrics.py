from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SpeechTrace:
    reply_id: str
    chunk_index: int


def log_speech_stage(
    trace: SpeechTrace | None,
    stage: str,
    duration_ms: float,
    *,
    status: str = "ok",
) -> None:
    if trace is None:
        return
    safe_stage = stage if stage in {
        "aggregate_wait", "queue_wait", "gpt_http", "write_file",
        "rhubarb", "transcode", "ws_delivery",
    } else "unknown"
    safe_status = status if status in {"ok", "failed", "cancelled"} else "failed"
    print(
        f"⏱️ [Speech] reply={trace.reply_id} chunk={trace.chunk_index} "
        f"stage={safe_stage} status={safe_status} duration_ms={duration_ms:.2f}"
    )
