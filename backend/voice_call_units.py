"""Deterministic speech-unit planning for low-latency realtime voice."""

from __future__ import annotations

import re
from dataclasses import dataclass


_STRONG_BOUNDARY = re.compile(r"[。！？!?\n]")


@dataclass(frozen=True)
class SpeechUnit:
    index: int
    text: str
    emotion: str


class VoiceSpeechUnitPlanner:
    def __init__(
        self,
        *,
        first_min_chars: int = 8,
        first_wait_ms: int = 120,
        first_hard_limit: int = 40,
        later_target_chars: int = 40,
        later_soft_limit: int = 60,
        later_hard_limit: int = 80,
    ) -> None:
        self.first_min_chars = first_min_chars
        self.first_wait_ms = first_wait_ms
        self.first_hard_limit = first_hard_limit
        self.later_target_chars = later_target_chars
        self.later_soft_limit = later_soft_limit
        self.later_hard_limit = later_hard_limit
        self._text = ""
        self._emotion = "neutral"
        self._deadline_ms: int | None = None
        self._next_index = 0

    @property
    def has_pending(self) -> bool:
        return bool(self._text)

    @property
    def waiting_for_first_deadline(self) -> bool:
        return self._next_index == 0 and bool(self._text) and self._deadline_ms is not None

    @property
    def first_deadline_ms(self) -> int | None:
        return self._deadline_ms

    def add_sentence(self, text: str, emotion: str, now_ms: int) -> list[SpeechUnit]:
        clean = str(text or "").strip()
        if not clean:
            return []
        if not self._text:
            self._emotion = str(emotion or "neutral")
        self._text += clean
        if self._next_index == 0 and self._deadline_ms is None:
            self._deadline_ms = now_ms + self.first_wait_ms
        return self._drain(force=False)

    def flush_due(self, now_ms: int) -> list[SpeechUnit]:
        if (
            self._next_index == 0
            and self._text
            and self._deadline_ms is not None
            and now_ms >= self._deadline_ms
        ):
            return self._drain(force=True, first_only=True)
        return []

    def close(self, now_ms: int) -> list[SpeechUnit]:
        _ = now_ms
        return self._drain(force=True)

    def _drain(self, *, force: bool, first_only: bool = False) -> list[SpeechUnit]:
        units: list[SpeechUnit] = []
        if self._next_index == 0 and self._text:
            take = min(len(self._text), self.first_hard_limit)
            if not force:
                if len(self._text) < self.first_min_chars:
                    return []
                safe_take = self._boundary_between(
                    self._text,
                    self.first_min_chars,
                    self.first_hard_limit,
                )
                if safe_take is None and len(self._text) < self.first_hard_limit:
                    return []
                take = safe_take or self.first_hard_limit
            elif len(self._text) > self.first_hard_limit:
                take = self._boundary_at_or_before(self._text, self.first_hard_limit) or take
            units.append(self._emit(take))
            self._deadline_ms = None
            if first_only:
                return units

        while self._text:
            if force:
                take = min(len(self._text), self.later_hard_limit)
                if len(self._text) > self.later_hard_limit:
                    take = self._boundary_at_or_before(self._text, self.later_hard_limit) or take
                units.append(self._emit(take))
                continue

            if len(self._text) < self.later_target_chars:
                break
            take = self._boundary_between(
                self._text,
                self.later_target_chars,
                self.later_soft_limit,
            )
            if take is None:
                if len(self._text) < self.later_hard_limit:
                    break
                take = self._boundary_at_or_before(self._text, self.later_hard_limit)
                take = take or self.later_hard_limit
            units.append(self._emit(take))
        return units

    def _emit(self, count: int) -> SpeechUnit:
        text = self._text[:count].strip()
        self._text = self._text[count:].lstrip()
        unit = SpeechUnit(self._next_index, text, self._emotion)
        self._next_index += 1
        return unit

    @staticmethod
    def _boundary_at_or_before(text: str, limit: int) -> int | None:
        positions = [match.end() for match in _STRONG_BOUNDARY.finditer(text[:limit])]
        return positions[-1] if positions else None

    @staticmethod
    def _boundary_between(text: str, minimum: int, maximum: int) -> int | None:
        positions = [match.end() for match in _STRONG_BOUNDARY.finditer(text[:maximum])]
        eligible = [position for position in positions if position >= minimum]
        return eligible[-1] if eligible else None
