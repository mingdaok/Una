"""Turn lived story continuity into occasional, owner-facing advice moments."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from .clock import parse_datetime, utc_now
from .character_registry import CharacterRegistry
from .store import DEFAULT_AI_ID, LifeStore


class LifeChoiceService:
    def __init__(
        self, store: LifeStore, characters: Optional[CharacterRegistry] = None
    ):
        self.store = store
        self.characters = characters or CharacterRegistry(store)

    def materialize_due(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        now: Optional[datetime] = None,
    ) -> Optional[dict]:
        current = parse_datetime(now or utc_now())
        profile = self.store.get_profile(owner_user_id, ai_id)
        if profile is None or profile.get("major_plot_level") == "off":
            return None
        self.characters.ensure_world(owner_user_id, now=current)

        self.store.expire_story_choices(owner_user_id, ai_id, now=current)
        pending = self.store.list_story_choices(
            owner_user_id, ai_id, status="pending", limit=1
        )
        if pending:
            return pending[0]

        choice = self._from_completed_arc(owner_user_id, ai_id, current)
        if choice is not None:
            return choice
        return self._from_relationship(owner_user_id, ai_id, current)

    def resolve(
        self,
        owner_user_id: str,
        choice_id: str,
        option_id: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        now: Optional[datetime] = None,
    ) -> Optional[dict]:
        return self.store.resolve_story_choice(
            owner_user_id,
            ai_id,
            choice_id,
            option_id,
            now=parse_datetime(now or utc_now()),
        )

    def _from_completed_arc(
        self, owner_user_id: str, ai_id: str, current: datetime
    ) -> Optional[dict]:
        arcs = self.store.list_story_arcs(
            owner_user_id, ai_id, status="completed", limit=10
        )
        for arc in arcs:
            if arc["arc_type"] != "creative_project":
                continue
            title = arc["title"]
            lead_name = self.characters.get_lead(owner_user_id)["display_name"]
            choice = self.store.create_story_choice(
                owner_user_id,
                ai_id,
                source_kind="story_arc",
                source_id=arc["story_arc_id"],
                choice_type="creative_next_step",
                context_text=f"{lead_name} 完成了「{title}」。",
                prompt="“那个作品终于完成了。我有点犹豫，接下来该怎么对待它。你愿意给我一个建议吗？”",
                options=[
                    {
                        "id": "share_friend",
                        "label": "鼓励她给朋友看看",
                        "description": "把这份完成的心情分享给信任的人。",
                        "intention_summary": "考虑把完成的作品给信任的朋友看看",
                        "resolution_text": f"{lead_name} 记下了你的鼓励。她会等一个自己也觉得合适的时机。",
                        "effect": {"social_openness": 1},
                        "intention_policy": {
                            "priority": 62,
                            "deadline_hours": 168,
                            "conditions": {"windows": ["evening"]},
                        },
                    },
                    {
                        "id": "keep_private",
                        "label": "先为自己留着",
                        "description": "不急着公开，让作品先属于她自己。",
                        "intention_summary": "先把作品留给自己，等真正想分享时再决定",
                        "resolution_text": f"{lead_name} 决定先不赶时间。她想让这件作品安静地陪自己一阵。",
                        "effect": {"solitude_preference": 1},
                        "intention_policy": {
                            "priority": 48,
                            "delay_hours": 12,
                            "deadline_hours": 96,
                            "conditions": {"windows": ["late_night"]},
                        },
                    },
                    {
                        "id": "autonomy",
                        "label": "让她按自己的感觉决定",
                        "description": "你的在意会被记住，决定仍然由她来做。",
                        "intention_summary": "按自己的感受决定作品是否与别人分享",
                        "resolution_text": f"{lead_name} 收下了这份信任。她会照自己的感受决定下一步。",
                        "effect": {"autonomy": 1},
                        "intention_policy": {
                            "priority": 44,
                            "delay_hours": 12,
                            "deadline_hours": 96,
                            "conditions": {"windows": ["late_night"]},
                        },
                    },
                ],
                created_at=current,
                expires_at=current + timedelta(days=7),
                idempotency_key=f"choice:creative:{arc['story_arc_id']}",
            )
            if choice["status"] == "pending":
                return choice
        return None

    def _from_relationship(
        self, owner_user_id: str, ai_id: str, current: datetime
    ) -> Optional[dict]:
        relationships = self.store.list_relationships(owner_user_id, ai_id, limit=10)
        for relationship in relationships:
            if relationship["familiarity"] < 6 or not relationship["last_interaction_at"]:
                continue
            other_ai_id = self.characters.canonical_actor_id(
                relationship["other_ai_id"]
            )
            name = self.characters.display_name(owner_user_id, other_ai_id)
            lead_name = self.characters.get_lead(owner_user_id)["display_name"]
            last_interaction = relationship["last_interaction_at"]
            choice = self.store.create_story_choice(
                owner_user_id,
                ai_id,
                source_kind="relationship",
                source_id=other_ai_id,
                choice_type="relationship_invitation",
                context_text=f"{name} 前几天提到，下次想和 {lead_name} 一起去看看旧城区的新展。",
                prompt="“我还没决定，要不要把这个约定认真排进生活里。你怎么看？”",
                options=[
                    {
                        "id": "encourage",
                        "label": "鼓励她赴约",
                        "description": f"回应 {name} 的邀请，看看这段来往会走向哪里。",
                        "intention_summary": f"找一个合适的时间回应{name}的邀请",
                        "resolution_text": f"{lead_name} 有一点被你说动了。她会找合适的时间回应{name}。",
                        "effect": {
                            "relationship": other_ai_id,
                            "openness": 1,
                        },
                        "intention_policy": {
                            "priority": 68,
                            "deadline_hours": 168,
                            "conditions": {"windows": ["evening"]},
                        },
                    },
                    {
                        "id": "slow",
                        "label": "建议先留点自己的时间",
                        "description": "先照顾当下的节奏，不必立刻答应。",
                        "intention_summary": "先照顾自己的节奏，再决定是否赴约",
                        "resolution_text": f"{lead_name} 觉得慢一点也很好。她会先看看自己最近真正需要什么。",
                        "effect": {"solitude_preference": 1},
                        "intention_policy": {
                            "initial_status": "deferred",
                            "priority": 46,
                            "delay_hours": 48,
                            "deadline_hours": 120,
                            "conditions": {"windows": ["late_night"]},
                        },
                    },
                    {
                        "id": "autonomy",
                        "label": "让她自己决定",
                        "description": "给她空间，也让她知道你愿意听。",
                        "intention_summary": f"按自己的感受决定要不要回应{name}的邀请",
                        "resolution_text": f"{lead_name} 记住了你给她的空间。她会自己想清楚，再作决定。",
                        "effect": {"autonomy": 1},
                        "intention_policy": {
                            "priority": 44,
                            "delay_hours": 12,
                            "deadline_hours": 96,
                            "conditions": {"windows": ["late_night"]},
                        },
                    },
                ],
                created_at=current,
                expires_at=current + timedelta(days=7),
                idempotency_key=(
                    f"choice:relationship:{other_ai_id}:{last_interaction}"
                ),
            )
            if choice["status"] == "pending":
                return choice
        return None
