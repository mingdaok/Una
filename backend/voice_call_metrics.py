"""Privacy-safe console metrics for realtime voice calls."""

from __future__ import annotations

import json
import math
from collections.abc import Mapping
from typing import Any, Callable


SAFE_STAGES = frozenset({
    "pcm_received",
    "asr",
    "memory_snapshot",
    "llm_first_text",
    "tts_first_byte",
    "ws_delivery",
    "cancel",
})
SAFE_STATUSES = frozenset({
    "started", "completed", "accepted", "cancelled", "stale", "error",
})
_INTEGER_FIELDS = ("turn_id", "sequence", "byte_count")


def _safe_get(metric: Mapping[str, Any], field: str) -> Any:
    try:
        return metric[field]
    except Exception:
        return None


def sanitize_voice_metric(metric: Any) -> dict[str, Any] | None:
    """Return only explicitly allowed, bounded scalar fields."""
    if not isinstance(metric, Mapping):
        return None
    try:
        stage = _safe_get(metric, "stage")
        if stage not in SAFE_STAGES:
            return None
        safe: dict[str, Any] = {"stage": stage}

        session_id = _safe_get(metric, "session_id")
        if isinstance(session_id, str) and session_id:
            safe["session_id"] = session_id[:8]

        status = _safe_get(metric, "status")
        if status in SAFE_STATUSES:
            safe["status"] = status

        for field in _INTEGER_FIELDS:
            value = _safe_get(metric, field)
            if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
                safe[field] = value

        duration = _safe_get(metric, "duration_ms")
        if isinstance(duration, (int, float)) and not isinstance(duration, bool):
            duration = float(duration)
            if math.isfinite(duration) and duration >= 0:
                safe["duration_ms"] = round(duration, 3)
        return safe
    except Exception:
        return None


def log_voice_metric(
    metric: Any,
    *,
    writer: Callable[[str], Any] = print,
) -> None:
    """Best-effort logging; malformed metrics and failing sinks never escape."""
    try:
        safe = sanitize_voice_metric(metric)
        if safe is not None:
            writer(f"[VoiceCallMetric] {json.dumps(safe, ensure_ascii=False, sort_keys=True)}")
    except Exception:
        return
