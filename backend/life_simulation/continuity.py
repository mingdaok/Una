"""把离散日常事件连接成可持续推进的故事与关系。"""

from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Any, Optional, TYPE_CHECKING

from .clock import parse_datetime
from .models import LifeEventDraft, RelationshipChange, SimulationResult, StoryArcChange

if TYPE_CHECKING:
    from .character_registry import CharacterRegistry
    from .models import LifeWindow
    from .store import LifeStore


CREATIVE_ARC_TYPE = "creative_project"
CREATIVE_ARC_TITLE = "把零碎光影做成完整作品"
CREATIVE_EVENT_WEIGHTS = {
    "creative_practice": 2,
    "focused_work": 1,
    "reading": 1,
    "reflection": 1,
}

STAGE_LABELS = {
    "spark": "刚刚有了想法",
    "exploring": "正在寻找方向",
    "shaping": "慢慢形成轮廓",
    "finishing": "正在认真收尾",
    "completed": "已经完成",
}

STAGE_SUMMARIES = {
    "spark": "下午试了一个新的创作方向，留下了一个想继续完成的主题。",
    "exploring": "继续试着整理那个新主题，终于找到更清晰的感觉。",
    "shaping": "把前几天的零碎灵感重新整理，作品开始有了完整轮廓。",
    "finishing": "花了一段时间修改细节，那个反复琢磨的作品接近完成了。",
    "completed": "把那个断断续续做了几天的作品认真完成了。",
}

def story_stage_label(stage: str) -> str:
    return STAGE_LABELS.get(stage, "正在继续")


class LifeContinuityDirector:
    """用稳定规则装饰事件，所有真正写入仍由 LifeStore 原子完成。"""

    def __init__(self, characters: Optional["CharacterRegistry"] = None):
        self.characters = characters

    def enrich(
        self,
        owner_user_id: str,
        ai_id: str,
        _profile: dict[str, Any],
        window: "LifeWindow",
        result: SimulationResult,
        store: "LifeStore",
    ) -> SimulationResult:
        if self.characters is None:
            from .character_registry import CharacterRegistry

            self.characters = CharacterRegistry(store)
            self.characters.ensure_world(owner_user_id, now=window.end_at)
        event = result.event
        if event is None:
            return result

        self._connect_creative_arc(owner_user_id, ai_id, window, event, store)
        self._connect_relationship(owner_user_id, ai_id, event)
        return result

    def _connect_creative_arc(
        self,
        owner_user_id: str,
        ai_id: str,
        window: "LifeWindow",
        event: LifeEventDraft,
        store: "LifeStore",
    ) -> None:
        if event.facts.get("life_intention_id"):
            return
        weight = CREATIVE_EVENT_WEIGHTS.get(event.event_type, 0)
        active = store.get_active_story_arc(owner_user_id, ai_id, CREATIVE_ARC_TYPE)
        if active is None and event.event_type != "creative_practice":
            return
        if active is None:
            progress = 1
            stage = "spark"
            story_arc_id = self._stable_id(
                "arc", owner_user_id, ai_id, window.start_at.isoformat()
            )
            change = StoryArcChange(
                story_arc_id=story_arc_id,
                arc_type=CREATIVE_ARC_TYPE,
                title=CREATIVE_ARC_TITLE,
                action="start",
                status="active",
                stage=stage,
                stage_version=0,
                state={"progress": progress, "source": "life_simulation"},
                impact_level="ordinary",
                started_at=event.start_at,
                last_advanced_at=event.end_at,
            )
        elif weight > 0:
            progress = int(active.get("state", {}).get("progress", 1)) + weight
            stage = self._stage_for_progress(progress)
            completed = stage == "completed"
            change = StoryArcChange(
                story_arc_id=active["story_arc_id"],
                arc_type=active["arc_type"],
                title=active["title"],
                action="complete" if completed else "advance",
                status="completed" if completed else "active",
                stage=stage,
                stage_version=int(active["stage_version"]) + 1,
                state={**active.get("state", {}), "progress": progress},
                impact_level=active["impact_level"],
                started_at=event.start_at if not active.get("started_at") else self._as_datetime(active["started_at"]),
                last_advanced_at=event.end_at,
                completed_at=event.end_at if completed else None,
            )
        else:
            return

        event.story_arc_id = change.story_arc_id
        event.story_arc_change = change
        event.summary = STAGE_SUMMARIES[change.stage]
        event.importance = max(event.importance, 48 if change.status == "active" else 66)
        event.mentionability = max(event.mentionability, 72 if change.status == "active" else 88)
        event.follow_up_required = change.status == "completed"
        event.facts = {
            **event.facts,
            "arc_type": change.arc_type,
            "arc_stage": change.stage,
            "arc_stage_label": story_stage_label(change.stage),
        }

    def _connect_relationship(
        self, owner_user_id: str, ai_id: str, event: LifeEventDraft
    ) -> None:
        if event.event_type != "friend_chat":
            return
        other_ai_id = event.facts.get("requested_participant_ai_id")
        display_name = event.facts.get("requested_participant_display_name")
        if not other_ai_id:
            other_ai_id, display_name = self._primary_contact(owner_user_id, ai_id)
        elif self.characters is not None:
            other_ai_id = self.characters.canonical_actor_id(other_ai_id)
            display_name = self.characters.display_name(owner_user_id, other_ai_id)
        elif not display_name:
            other_ai_id, display_name = self._primary_contact(owner_user_id, ai_id)
        if other_ai_id not in event.participant_ids:
            event.participant_ids.append(other_ai_id)
        if not event.facts.get("life_intention_id"):
            event.summary = f"和{display_name}聊了聊最近各自忙的事情。"
        event.facts = {**event.facts, "participant_display_names": [display_name]}
        event.relationship_changes.append(
            RelationshipChange(
                other_ai_id=other_ai_id,
                display_name=display_name,
                familiarity_delta=3,
                affinity_delta=2,
                trust_delta=1,
                tension_delta=-1,
                private_summary=f"和{display_name}的来往变得更自然了一点。",
            )
        )

    @staticmethod
    def _stage_for_progress(progress: int) -> str:
        if progress >= 8:
            return "completed"
        if progress >= 6:
            return "finishing"
        if progress >= 4:
            return "shaping"
        if progress >= 2:
            return "exploring"
        return "spark"

    def _primary_contact(self, owner_user_id: str, ai_id: str) -> tuple[str, str]:
        if self.characters is None:
            raise RuntimeError("角色注册中心尚未配置")
        contacts = self.characters.list_contacts(owner_user_id)
        if not contacts:
            raise RuntimeError("当前世界没有可用的预设朋友")
        digest = hashlib.sha256(f"{owner_user_id}:{ai_id}:social".encode("utf-8")).digest()
        selected = contacts[int.from_bytes(digest[:2], "big") % len(contacts)]
        return selected["actor_id"], selected["display_name"]

    @staticmethod
    def _stable_id(kind: str, *parts: str) -> str:
        raw = ":".join((kind, *parts)).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()[:32]

    @staticmethod
    def _as_datetime(value: str) -> datetime:
        return parse_datetime(value)
