"""聊天流控制前缀的解复用与最终文本清洗。"""

from __future__ import annotations

import json
import re
from typing import Any

from live2d_action import parse_action_plan
from live2d_motion import (
    filter_motion_plan_for_model,
    is_motion_v3_candidate,
    parse_motion_plan,
)


_EMOTION_PREFIX = "EMOTION:"
_ACTION_PREFIX = "ACTION:"
_LEGACY_ACTION_PREFIX = "[动作:"
_PARTIAL_MARKERS = (
    _EMOTION_PREFIX,
    _ACTION_PREFIX,
    _LEGACY_ACTION_PREFIX,
    "```json",
    "```",
)
_EMOTION_RE = re.compile(
    r"^EMOTION:\s*(.*?)"
    r"\s*\|\s*MOOD:\s*(?:\[\s*(-?\d+)\s*\]|(-?\d+))",
    re.IGNORECASE,
)
_JSON_NUMBER_RE = re.compile(
    r"-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?"
)
_PARTIAL_JSON_NUMBER_SUFFIXES = frozenset((".", "e", "E", "e+", "e-", "E+", "E-"))
_JSON_DECODER = json.JSONDecoder()


def _find_json_object_end(text: str) -> int | None:
    """返回首个完整 JSON 对象的结束下标（右花括号后一位）。"""
    if not text.startswith("{"):
        return None

    depth = 0
    in_string = False
    escaped = False
    for index, char in enumerate(text):
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return index + 1
    return None


def _is_partial_marker(text: str) -> bool:
    if not text:
        return True

    upper_text = text.upper()
    for marker in _PARTIAL_MARKERS:
        if marker.upper().startswith(upper_text):
            return True
    return False


def _is_truncated_marker_at_end(text: str) -> bool:
    """只在几乎完整的控制头处截断，避免把普通的短英文正文误判为控制帧。"""
    if not text:
        return True

    upper_text = text.upper()
    return any(
        marker.upper().startswith(upper_text)
        and len(text) >= len(marker) - 1
        for marker in _PARTIAL_MARKERS
    )


class ControlPrefixDemux:
    """在正文开始前循环消费结构化控制帧。"""

    def __init__(self, live2d_model: str | None = None) -> None:
        self._live2d_model = live2d_model
        self._buffer = ""
        self._body_started = False
        self._meta_emitted = False
        self._action_emitted = False

    def feed(self, text: str, final: bool = False) -> tuple[list[dict[str, Any]], str]:
        if self._body_started:
            return [], text or ""

        self._buffer += text or ""
        events: list[dict[str, Any]] = []

        while True:
            self._buffer = self._buffer.lstrip("\ufeff \t\r\n")
            if not self._buffer:
                if final:
                    self._ensure_meta(events)
                return events, ""

            fence_status = self._consume_code_fence(final)
            if fence_status == "consumed":
                continue
            if fence_status == "waiting":
                return events, ""

            emotion_status = self._consume_emotion(events, final)
            if emotion_status == "consumed":
                continue
            if emotion_status == "waiting":
                return events, ""

            action_status = self._consume_action(events, final)
            if action_status == "consumed":
                continue
            if action_status == "waiting":
                return events, ""

            legacy_status = self._consume_legacy_action(final)
            if legacy_status == "consumed":
                continue
            if legacy_status == "waiting":
                return events, ""

            stage_status = self._consume_stage_direction(final)
            if stage_status == "consumed":
                continue
            if stage_status == "waiting":
                return events, ""

            if _is_partial_marker(self._buffer):
                if not final:
                    return events, ""
                if _is_truncated_marker_at_end(self._buffer):
                    self._buffer = ""
                    self._ensure_meta(events)
                    return events, ""

            self._body_started = True
            self._ensure_meta(events)
            body = self._buffer
            self._buffer = ""
            return events, body

    def finish(self) -> tuple[list[dict[str, Any]], str]:
        return self.feed("", final=True)

    def _ensure_meta(self, events: list[dict[str, Any]]) -> None:
        if not self._meta_emitted:
            events.append({
                "type": "meta",
                "emotion": "neutral",
                "mood_score": 0,
            })
            self._meta_emitted = True

    def _consume_code_fence(self, final: bool) -> str:
        lower_buffer = self._buffer.lower()
        json_fence = "```json"
        plain_fence = "```"
        if json_fence.startswith(lower_buffer) and len(lower_buffer) < len(json_fence):
            if final:
                self._buffer = ""
                return "consumed"
            return "waiting"
        if lower_buffer.startswith(json_fence):
            self._buffer = self._buffer[len(json_fence):]
            return "consumed"
        if not final and plain_fence.startswith(lower_buffer):
            return "waiting"
        if lower_buffer.startswith(plain_fence):
            self._buffer = self._buffer[len(plain_fence):]
            return "consumed"
        return "not_control"

    def _consume_emotion(
        self,
        events: list[dict[str, Any]],
        final: bool,
    ) -> str:
        upper_buffer = self._buffer.upper()
        if not upper_buffer.startswith(_EMOTION_PREFIX):
            if not final and _EMOTION_PREFIX.startswith(upper_buffer):
                return "waiting"
            return "not_control"

        match = _EMOTION_RE.match(self._buffer)
        if match:
            emotion_source = match.group(1)
            parenthesized = re.findall(
                r"\(([A-Za-z][A-Za-z_\- ]*)\)",
                emotion_source,
            )
            emotion_parts = (
                parenthesized
                or re.findall(r"[A-Za-z][A-Za-z_\-]*", emotion_source)
            )
            emotion = emotion_parts[0].lower() if emotion_parts else "neutral"
            raw_mood_score = match.group(2) or match.group(3)
            mood_score = max(-5, min(5, int(raw_mood_score)))
            self._buffer = self._buffer[match.end():]
            if not self._meta_emitted:
                events.append({
                    "type": "meta",
                    "emotion": emotion,
                    "mood_score": mood_score,
                })
                self._meta_emitted = True
            return "consumed"

        newline_index = self._buffer.find("\n")
        if newline_index >= 0:
            self._buffer = self._buffer[newline_index + 1:]
            self._ensure_meta(events)
            return "consumed"
        if final:
            self._buffer = ""
            self._ensure_meta(events)
            return "consumed"
        return "waiting"

    def _consume_action(
        self,
        events: list[dict[str, Any]],
        final: bool,
    ) -> str:
        upper_buffer = self._buffer.upper()
        if not upper_buffer.startswith(_ACTION_PREFIX):
            if not final and _ACTION_PREFIX.startswith(upper_buffer):
                return "waiting"
            return "not_control"

        raw_action = self._buffer[len(_ACTION_PREFIX):].lstrip(" \t")
        if not raw_action:
            if final:
                self._buffer = ""
                self._ensure_meta(events)
                return "consumed"
            return "waiting"

        # JSON 数字在流式场景中没有“闭合符号”：`1` 可能只是 `123`
        # 或 `1e3` 的前缀。必须等到正文字符（或流结束）才整体丢弃，
        # 不能让 WebSocket 分片位置改变最终正文。
        if raw_action[0] in "-0123456789":
            newline_index = raw_action.find("\n")
            raw_number_line = (
                raw_action
                if newline_index < 0
                else raw_action[:newline_index]
            )
            number_line = (
                raw_number_line
                if newline_index < 0
                else raw_number_line.rstrip(" \t\r")
            )
            number_match = _JSON_NUMBER_RE.match(number_line)
            if number_match is None:
                normalized_number_line = number_line.rstrip(" \t\r")
                if normalized_number_line == "-":
                    if newline_index >= 0:
                        self._buffer = raw_action[newline_index + 1:]
                    elif not final:
                        return "waiting"
                    else:
                        self._buffer = ""
                    self._ensure_meta(events)
                    return "consumed"
                self._buffer = raw_action
                self._ensure_meta(events)
                return "consumed"

            number_end = number_match.end()
            line_suffix = number_line[number_end:]
            if newline_index >= 0 and (
                not line_suffix
                or line_suffix in _PARTIAL_JSON_NUMBER_SUFFIXES
            ):
                self._buffer = raw_action[newline_index + 1:]
                self._ensure_meta(events)
                return "consumed"

            normalized_suffix = line_suffix.rstrip(" \t\r")
            is_incomplete_suffix = (
                not normalized_suffix
                or normalized_suffix in _PARTIAL_JSON_NUMBER_SUFFIXES
            )
            if newline_index < 0 and is_incomplete_suffix:
                if not final:
                    return "waiting"
                self._buffer = ""
            else:
                self._buffer = raw_action[number_end:]
            self._ensure_meta(events)
            return "consumed"

        payload = None
        action_end = None
        try:
            payload, action_end = _JSON_DECODER.raw_decode(raw_action)
        except (TypeError, ValueError, json.JSONDecodeError):
            pass

        if action_end is None and raw_action.startswith("{"):
            action_end = _find_json_object_end(raw_action)
            if action_end is None:
                if final:
                    self._buffer = ""
                    self._ensure_meta(events)
                    return "consumed"
                return "waiting"

            payload = None

        if action_end is not None:
            if is_motion_v3_candidate(payload):
                plan = parse_motion_plan(payload, model_name=self._live2d_model)
                if plan is not None:
                    plan = filter_motion_plan_for_model(
                        plan, self._live2d_model
                    )
            else:
                plan = parse_action_plan(payload)
            self._buffer = raw_action[action_end:]
            self._ensure_meta(events)
            if plan is not None and not self._action_emitted:
                events.append({
                    "type": "live2d_action_candidate",
                    "plan": plan,
                })
                self._action_emitted = True
            return "consumed"

        newline_index = raw_action.find("\n")
        if newline_index >= 0:
            self._buffer = raw_action[newline_index + 1:]
            self._ensure_meta(events)
            return "consumed"
        if final:
            self._buffer = ""
            self._ensure_meta(events)
            return "consumed"
        return "waiting"

    def _consume_legacy_action(self, final: bool) -> str:
        if not self._buffer.startswith(_LEGACY_ACTION_PREFIX):
            if not final and _LEGACY_ACTION_PREFIX.startswith(self._buffer):
                return "waiting"
            return "not_control"

        closing_index = self._buffer.find("]")
        if closing_index >= 0:
            self._buffer = self._buffer[closing_index + 1:]
            return "consumed"
        if final:
            self._buffer = ""
            return "consumed"
        return "waiting"

    def _consume_stage_direction(self, final: bool) -> str:
        pairs = {"（": "）", "(": ")"}
        opener = self._buffer[0]
        closer = pairs.get(opener)
        if closer is None:
            return "not_control"

        closing_index = self._buffer.find(closer, 1)
        if closing_index >= 0 and closing_index <= 200:
            self._buffer = self._buffer[closing_index + 1:]
            return "consumed"
        if final:
            self._buffer = ""
            return "consumed"
        if len(self._buffer) <= 200:
            return "waiting"
        return "not_control"


def sanitize_reply_text(text: str) -> str:
    """把可能泄漏到最终出口的控制前缀清理成可展示、可朗读正文。"""
    if not text:
        return ""
    demux = ControlPrefixDemux()
    _, body = demux.feed(str(text), final=True)
    return body.strip()
