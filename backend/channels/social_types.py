"""Validated QQ plans. Model output is data, never a transport instruction."""

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class MediaClarification(ValueError):
    """A normal request for a precise image reference, not a download failure."""


class Behavior(StrictModel):
    autonomous: bool = True
    context_count: int = Field(default=60, ge=20, le=200)
    stickers: bool = True
    collect: bool = False
    auto_accept: bool = False
    voice: bool = True
    autonomous_voice: bool = False
    test_percent: int | None = Field(default=None, ge=0, le=100)
    test_until: float | None = None


class Decision(StrictModel):
    @model_validator(mode="before")
    @classmethod
    def optional_nulls(cls, data):
        if isinstance(data, dict):
            data = dict(data)
            for key, default in (
                ("sticker_query", ""),
                ("context_message_ids", []),
                ("preferred_mode", "text"),
                ("needs_media", False),
            ):
                if key in data and data[key] is None:
                    data[key] = default
        return data

    decision: Literal["reply", "silence"]
    reason_code: Literal[
        "direct_question",
        "topic_followup",
        "can_help",
        "natural_banter",
        "not_relevant",
        "conflict",
        "too_recent",
        "no_new_information",
    ]
    target_message_id: str | None = None
    context_message_ids: list[str] = Field(default_factory=list, max_length=10)
    preferred_mode: Literal["text", "text_sticker", "sticker", "voice"] = "text"
    sticker_query: str = Field(default="", max_length=200)
    needs_media: bool = False


class ReplyPlan(StrictModel):
    @model_validator(mode="before")
    @classmethod
    def optional_nulls(cls, data):
        if isinstance(data, dict):
            data = dict(data)
            for key, default in (
                ("text", ""),
                ("emotion", "neutral"),
                ("voice", False),
                ("reply_style", "plain"),
            ):
                if key in data and data[key] is None:
                    data[key] = default
        return data

    schema_version: Literal[1] = 1
    text: str = Field(default="", max_length=1500)
    emotion: Literal[
        "neutral", "happy", "sad", "angry", "shy", "thinking", "playful"
    ] = "neutral"
    sticker_id: str | None = None
    voice: bool = False
    reply_to_message_id: str | None = None
    reply_style: Literal["plain", "quote"] = "plain"


class StickerDescription(StrictModel):
    is_sticker: bool
    confidence: float = Field(ge=0, le=1)
    description: str = Field(max_length=500)
    ocr: str = Field(default="", max_length=500)
    private_content: bool = False


def grams(text):
    text = "".join(str(text).lower().split())[:4000]
    return {text[i : i + n] for n in (2, 3) for i in range(max(0, len(text) - n + 1))}


def relevance(query, text):
    a, b = grams(query), grams(text)
    return len(a & b) / max(1, len(a))
