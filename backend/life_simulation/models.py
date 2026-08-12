"""生活模拟的内部数据契约。"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional


@dataclass(frozen=True)
class StoryArcChange:
    """随一个生活事件原子写入的故事线变化。"""

    story_arc_id: str
    arc_type: str
    title: str
    action: str
    status: str
    stage: str
    stage_version: int
    state: dict[str, Any]
    impact_level: str
    started_at: datetime
    last_advanced_at: datetime
    completed_at: Optional[datetime] = None


@dataclass(frozen=True)
class RelationshipChange:
    """随互动事件累积的关系变化，不直接暴露私密总结。"""

    other_ai_id: str
    display_name: str
    familiarity_delta: int = 0
    affinity_delta: int = 0
    trust_delta: int = 0
    tension_delta: int = 0
    obligation_delta: int = 0
    private_summary: str = ""


@dataclass(frozen=True)
class IntentionDirective:
    """A due intention translated into a bounded event request for one window."""

    intention_id: str
    intention_type: str
    summary: str
    outcome: str
    resolution_reason: str
    event_type: str
    location_id: str
    event_summary: str
    interpretation: str
    importance: int
    mentionability: int
    publicability: int
    participant_ai_id: Optional[str] = None
    participant_display_name: Optional[str] = None
    facts: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class LifeWindow:
    """一个可独立、幂等结算的生活时间窗口。"""

    key: str
    label: str
    start_at: datetime
    end_at: datetime


@dataclass
class LifeEventDraft:
    """规则引擎生成、尚未写入数据库的客观事件。"""

    event_type: str
    status: str
    start_at: datetime
    end_at: datetime
    location_id: str
    summary: str
    facts: dict[str, Any]
    importance: int
    mentionability: int
    publicability: int
    follow_up_required: bool = False
    story_arc_id: Optional[str] = None
    parent_event_id: Optional[str] = None
    participant_ids: list[str] = field(default_factory=list)
    interpretation: str = ""
    emotion_delta: dict[str, int] = field(default_factory=dict)
    private_thought: str = ""
    disclosure_level: str = "familiar"
    story_arc_change: Optional[StoryArcChange] = None
    relationship_changes: list[RelationshipChange] = field(default_factory=list)


@dataclass
class SimulationResult:
    """单个窗口的结算结果，事件为空也必须推进状态游标。"""

    event: Optional[LifeEventDraft]
    state: dict[str, Any]


@dataclass
class SettlementReport:
    """一次补算的可观测结果。"""

    owner_user_id: str
    ai_id: str
    settled_windows: int = 0
    created_events: int = 0
    skipped_windows: int = 0
    stale_retries: int = 0
    capped: bool = False
    last_settled_at: Optional[str] = None
    events: list[dict[str, Any]] = field(default_factory=list)
    npc_settlement: dict[str, Any] = field(default_factory=dict)
    interaction_settlement: dict[str, Any] = field(default_factory=dict)
    intention_settlement: dict[str, Any] = field(default_factory=dict)
    suggestion_settlement: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "owner_user_id": self.owner_user_id,
            "ai_id": self.ai_id,
            "settled_windows": self.settled_windows,
            "created_events": self.created_events,
            "skipped_windows": self.skipped_windows,
            "stale_retries": self.stale_retries,
            "capped": self.capped,
            "last_settled_at": self.last_settled_at,
            "events": self.events,
            "npc_settlement": self.npc_settlement,
            "interaction_settlement": self.interaction_settlement,
            "intention_settlement": self.intention_settlement,
            "suggestion_settlement": self.suggestion_settlement,
        }
