"""Shared validation rules for the local realtime voice-call wire protocol."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Literal


INPUT_SAMPLE_RATE = 16000
MAX_INPUT_BYTES = 960000
MAX_PCM_CHUNK_BYTES = 65536
MAX_SEQUENCE = 4095
MAX_TURN_ID = 9007199254740991
MAX_CONTROL_MESSAGE_BYTES = 8192


class ProtocolError(ValueError):
    """Raised when a peer sends a message outside the voice-call protocol."""


def _is_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _require_nonempty_string(value: object, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ProtocolError(f"{field} 不能为空")
    return value


def _require_positive_int(value: object, field: str) -> int:
    if not _is_int(value) or not 0 < value <= MAX_TURN_ID:
        raise ProtocolError(f"{field} 必须为正整数")
    return value


@dataclass(frozen=True)
class PcmFormat:
    sample_rate: int
    channels: int
    sample_width: int

    def __post_init__(self) -> None:
        if not _is_int(self.sample_rate):
            raise ProtocolError("sample_rate 必须为整数")
        if not _is_int(self.channels):
            raise ProtocolError("channels 必须为整数")
        if not _is_int(self.sample_width):
            raise ProtocolError("sample_width 必须为整数")
        if self.sample_rate != INPUT_SAMPLE_RATE:
            raise ProtocolError("sample_rate 必须为 16000")
        if self.channels != 1:
            raise ProtocolError("channels 必须为 1")
        if self.sample_width != 2:
            raise ProtocolError("sample_width 必须为 2")


@dataclass(frozen=True)
class BinaryFrameHeader:
    session_id: str
    direction: Literal["input", "output"]
    turn_id: int
    sequence: int
    byte_length: int

    def __post_init__(self) -> None:
        _require_nonempty_string(self.session_id, "session_id")
        if self.direction not in ("input", "output"):
            raise ProtocolError("direction 必须为 input 或 output")
        _require_positive_int(self.turn_id, "turn_id")
        if not _is_int(self.sequence) or not 0 <= self.sequence <= MAX_SEQUENCE:
            raise ProtocolError("sequence 超出范围")
        if not _is_int(self.byte_length) or not 0 < self.byte_length <= MAX_PCM_CHUNK_BYTES:
            raise ProtocolError(f"byte_length 必须在 1..{MAX_PCM_CHUNK_BYTES}")
        if self.byte_length % 2:
            raise ProtocolError("PCM16 必须为偶数字节")


_EVENT_FIELDS: dict[str, frozenset[str]] = {
    "call_start": frozenset(),
    "user_speech_start": frozenset({"session_id", "turn_id"}),
    "input_audio_chunk": frozenset({"session_id", "turn_id", "direction", "sequence", "byte_length"}),
    "user_speech_end": frozenset({"session_id", "turn_id"}),
    "interrupt": frozenset({"session_id"}),
    "call_end": frozenset({"session_id"}),
    "pong": frozenset(),
}


def parse_client_event(raw: str) -> dict[str, object]:
    """Parse one bounded, schema-checked JSON control message from a client."""
    if not isinstance(raw, str):
        raise ProtocolError("控制消息必须是字符串")
    if len(raw.encode("utf-8")) > MAX_CONTROL_MESSAGE_BYTES:
        raise ProtocolError(f"控制消息不能超过 {MAX_CONTROL_MESSAGE_BYTES} 字节")
    try:
        event = json.loads(raw)
    except (TypeError, json.JSONDecodeError) as error:
        raise ProtocolError("控制消息不是合法 JSON") from error
    if not isinstance(event, dict):
        raise ProtocolError("控制消息必须是对象")

    event_type = event.get("type")
    if not isinstance(event_type, str) or event_type not in _EVENT_FIELDS:
        raise ProtocolError("未知事件类型")
    expected_fields = {"type", *_EVENT_FIELDS[event_type]}
    if set(event) != expected_fields:
        if set(event) - expected_fields:
            raise ProtocolError("控制消息含未知字段")
        raise ProtocolError("控制消息缺少字段")

    normalized: dict[str, object] = {"type": event_type}
    if "session_id" in expected_fields:
        normalized["session_id"] = _require_nonempty_string(event["session_id"], "session_id")
    if "turn_id" in expected_fields:
        normalized["turn_id"] = _require_positive_int(event["turn_id"], "turn_id")
    if "sequence" in expected_fields:
        sequence = event["sequence"]
        if not _is_int(sequence) or not 0 <= sequence <= MAX_SEQUENCE:
            raise ProtocolError("sequence 超出范围")
        normalized["sequence"] = sequence
    if "direction" in expected_fields:
        if event["direction"] != "input":
            raise ProtocolError("direction 必须为 input")
        normalized["direction"] = "input"
    if "byte_length" in expected_fields:
        header = BinaryFrameHeader(
            session_id=normalized["session_id"],  # type: ignore[arg-type]
            direction=normalized["direction"],  # type: ignore[arg-type]
            turn_id=normalized["turn_id"],  # type: ignore[arg-type]
            sequence=normalized["sequence"],  # type: ignore[arg-type]
            byte_length=event["byte_length"],
        )
        normalized["byte_length"] = header.byte_length
    return normalized
