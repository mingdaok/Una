"""Versioned, channel-neutral provenance for generated content."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable, Optional


CONTENT_EVIDENCE_VERSION = 1


@dataclass(frozen=True)
class EvidenceSource:
    source_id: str
    source_type: str
    actor_ids: tuple[str, ...] = ()
    world_time: Optional[str] = None
    disclosure_level: str = "public"
    status: str = "completed"
    summary: str = field(default="", repr=False)

    def as_dict(self, *, include_summary: bool = False) -> dict[str, Any]:
        result = {
            "source_id": self.source_id,
            "source_type": self.source_type,
            "actor_ids": list(self.actor_ids),
            "world_time": self.world_time,
            "disclosure_level": self.disclosure_level,
            "status": self.status,
        }
        if include_summary:
            result["summary"] = self.summary
        return result

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "EvidenceSource":
        return cls(
            source_id=str(value.get("source_id", "")),
            source_type=str(value.get("source_type", "unknown")),
            actor_ids=tuple(str(item) for item in value.get("actor_ids", []) if item),
            world_time=value.get("world_time"),
            disclosure_level=str(value.get("disclosure_level", "public")),
            status=str(value.get("status", "completed")),
            summary=str(value.get("summary", "")),
        )


@dataclass(frozen=True)
class ContentEvidence:
    sources: tuple[EvidenceSource, ...] = ()
    generation_reason: str = ""
    generator_version: str = "content-evidence-v1"
    used_source_ids: tuple[str, ...] = ()
    validation_status: str = "pending"
    validation_codes: tuple[str, ...] = ()
    version: int = CONTENT_EVIDENCE_VERSION

    @property
    def source_event_ids(self) -> list[str]:
        return [
            source.source_id
            for source in self.sources
            if source.source_type in {"una_life_event", "npc_life_event", "npc_interaction"}
        ]

    @property
    def source_actor_ids(self) -> list[str]:
        return sorted({actor_id for source in self.sources for actor_id in source.actor_ids})

    def as_dict(self, *, include_summaries: bool = False) -> dict[str, Any]:
        return {
            "version": self.version,
            "generation_reason": self.generation_reason,
            "generator_version": self.generator_version,
            "sources": [source.as_dict(include_summary=include_summaries) for source in self.sources],
            "source_event_ids": self.source_event_ids,
            "source_actor_ids": self.source_actor_ids,
            "used_source_ids": list(self.used_source_ids),
            "validation_status": self.validation_status,
            "validation_codes": list(self.validation_codes),
        }

    def with_validation(
        self,
        *,
        used_source_ids: Iterable[str],
        status: str,
        codes: Iterable[str] = (),
    ) -> "ContentEvidence":
        return ContentEvidence(
            sources=self.sources,
            generation_reason=self.generation_reason,
            generator_version=self.generator_version,
            used_source_ids=tuple(dict.fromkeys(str(item) for item in used_source_ids if item)),
            validation_status=status,
            validation_codes=tuple(dict.fromkeys(str(item) for item in codes if item)),
            version=self.version,
        )

    @classmethod
    def from_dict(cls, value: Optional[dict[str, Any]]) -> "ContentEvidence":
        value = value or {}
        return cls(
            sources=tuple(EvidenceSource.from_dict(item) for item in value.get("sources", []) if isinstance(item, dict)),
            generation_reason=str(value.get("generation_reason", "")),
            generator_version=str(value.get("generator_version", "content-evidence-v1")),
            used_source_ids=tuple(str(item) for item in value.get("used_source_ids", []) if item),
            validation_status=str(value.get("validation_status", "pending")),
            validation_codes=tuple(str(item) for item in value.get("validation_codes", []) if item),
            version=int(value.get("version", CONTENT_EVIDENCE_VERSION)),
        )


def evidence_from_event(
    event: dict[str, Any],
    *,
    source_type: str,
    actor_ids: Iterable[str],
    generation_reason: str,
    generator_version: str,
) -> ContentEvidence:
    return ContentEvidence(
        sources=(EvidenceSource(
            source_id=str(event["event_id"]),
            source_type=source_type,
            actor_ids=tuple(dict.fromkeys(str(item) for item in actor_ids if item)),
            world_time=event.get("end_at"),
            disclosure_level=str(event.get("disclosure_level", "public")),
            status=str(event.get("status", "completed")),
            summary=str(event.get("summary", "")),
        ),),
        generation_reason=generation_reason,
        generator_version=generator_version,
    )


__all__ = ["ContentEvidence", "EvidenceSource", "evidence_from_event"]
