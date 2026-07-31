from __future__ import annotations

from dataclasses import dataclass


_SAFE_SPLIT_CHARS = frozenset("。！？!?；;,，、\n")


@dataclass(frozen=True)
class SpeechUnit:
    index: int
    text: str
    emotion: str
    created_at_ms: float
    aggregate_wait_ms: float


class SpeechUnitAggregator:
    def __init__(
        self,
        *,
        target_min_chars: int = 40,
        target_max_chars: int = 60,
        hard_max_chars: int = 80,
        debounce_ms: float = 200.0,
    ):
        self.target_min_chars = target_min_chars
        self.target_max_chars = target_max_chars
        self.hard_max_chars = hard_max_chars
        self.debounce_ms = debounce_ms
        self._next_index = 0
        self._pending_text = ""
        self._pending_emotion = ""
        self._pending_started_at_ms: float | None = None
        self._pending_updated_at_ms: float | None = None

    def add(self, text: str, emotion: str, now_ms: float) -> list[SpeechUnit]:
        if self._is_ignored(text):
            return []

        if self._next_index == 0:
            first_text, remainder = self._split_at_safe_boundary(text, self.hard_max_chars)
            units = [self._create_unit(first_text, emotion, now_ms, 0.0)]
            if remainder:
                self._start_pending(remainder, emotion, now_ms)
                units.extend(self._emit_ready(now_ms))
            return units

        units: list[SpeechUnit] = []
        if self._pending_text and self._pending_emotion != emotion:
            units.append(self._emit_pending(now_ms))

        if not self._pending_text:
            self._start_pending(text, emotion, now_ms)
        else:
            self._pending_text += text
            self._pending_updated_at_ms = now_ms
        units.extend(self._emit_ready(now_ms))
        return units

    def flush_due(self, now_ms: float) -> list[SpeechUnit]:
        if not self._pending_text or self._pending_updated_at_ms is None:
            return []
        if now_ms - self._pending_updated_at_ms < self.debounce_ms:
            return []
        return [self._emit_pending(now_ms)]

    def close(self, now_ms: float) -> list[SpeechUnit]:
        if not self._pending_text:
            return []
        return [self._emit_pending(now_ms)]

    @staticmethod
    def _is_ignored(text: str) -> bool:
        stripped = text.strip()
        return not stripped or (
            len(stripped.splitlines()) == 1
            and stripped.startswith(("ACTION:", "EMOTION:"))
        )

    def _start_pending(self, text: str, emotion: str, now_ms: float) -> None:
        self._pending_text = text
        self._pending_emotion = emotion
        self._pending_started_at_ms = now_ms
        self._pending_updated_at_ms = now_ms

    def _emit_ready(self, now_ms: float) -> list[SpeechUnit]:
        units: list[SpeechUnit] = []
        while self._pending_text:
            if len(self._pending_text) > self.hard_max_chars:
                prefix, remainder = self._split_at_safe_boundary(
                    self._pending_text, self.hard_max_chars
                )
                units.append(self._emit_prefix(prefix, now_ms))
                if remainder:
                    self._start_pending(remainder, self._pending_emotion, now_ms)
                continue

            if len(self._pending_text) < self.target_min_chars:
                break

            if len(self._pending_text) <= self.target_max_chars:
                units.append(self._emit_pending(now_ms))
                continue

            prefix, remainder = self._split_at_safe_boundary(
                self._pending_text, self.target_max_chars
            )
            units.append(self._emit_prefix(prefix, now_ms))
            if remainder:
                self._start_pending(remainder, self._pending_emotion, now_ms)
        return units

    def _emit_prefix(self, prefix: str, now_ms: float) -> SpeechUnit:
        emotion = self._pending_emotion
        started_at_ms = self._pending_started_at_ms
        self._pending_text = self._pending_text[len(prefix):]
        if not self._pending_text:
            self._clear_pending()
        return self._create_unit(prefix, emotion, now_ms, now_ms - started_at_ms)

    def _emit_pending(self, now_ms: float) -> SpeechUnit:
        text = self._pending_text
        emotion = self._pending_emotion
        started_at_ms = self._pending_started_at_ms
        self._clear_pending()
        return self._create_unit(text, emotion, now_ms, now_ms - started_at_ms)

    def _clear_pending(self) -> None:
        self._pending_text = ""
        self._pending_emotion = ""
        self._pending_started_at_ms = None
        self._pending_updated_at_ms = None

    def _create_unit(
        self, text: str, emotion: str, now_ms: float, aggregate_wait_ms: float
    ) -> SpeechUnit:
        unit = SpeechUnit(
            index=self._next_index,
            text=text,
            emotion=emotion,
            created_at_ms=now_ms,
            aggregate_wait_ms=aggregate_wait_ms,
        )
        self._next_index += 1
        return unit

    @staticmethod
    def _split_at_safe_boundary(text: str, limit: int) -> tuple[str, str]:
        if len(text) <= limit:
            return text, ""
        split_at = limit
        for index in range(limit - 1, -1, -1):
            if text[index] in _SAFE_SPLIT_CHARS:
                split_at = index + 1
                break
        return text[:split_at], text[split_at:]
