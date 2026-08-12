"""Validated character presets and per-owner actor profile access."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional, TYPE_CHECKING

import yaml

from .clock import utc_now

if TYPE_CHECKING:
    from .store import LifeStore


DEFAULT_CHARACTER_CATALOG = Path(__file__).with_name("characters") / "presets.yaml"


@dataclass(frozen=True)
class SocialMomentDefinition:
    content: str
    location: str
    lead_comment: str


@dataclass(frozen=True)
class RoutineActivityDefinition:
    activity_id: str
    event_type: str
    location_id: str
    summary: str
    interpretation: str
    private_thought: str
    importance: int
    mentionability: int
    publicability: int
    state_delta: dict[str, int]


@dataclass(frozen=True)
class InteractionTemplateDefinition:
    interaction_id: str
    interaction_kind: str
    event_type: str
    location_id: str
    summary_template: str
    actor_a_interpretation: str
    actor_b_interpretation: str
    actor_a_private_thought: str
    actor_b_private_thought: str
    importance: int
    mentionability: int
    publicability: int
    relationship_delta: dict[str, int]
    min_tension: int
    min_trust: int


@dataclass(frozen=True)
class IntentionTemplateDefinition:
    intention_id: str
    suggestion_type: str
    driver: str
    state_metric: str
    state_direction: str
    threshold: int
    base_score: int
    need_weight: float
    personality_key: str
    personality_weight: int
    target_mode: str
    summary_template: str
    motivation_template: str
    event_type: str
    location_id: str
    event_summary_template: str
    interpretation_template: str
    importance: int
    mentionability: int
    publicability: int
    state_delta: dict[str, int]
    relationship_delta: dict[str, int]


@dataclass(frozen=True)
class CharacterDefinition:
    definition_key: str
    definition_version: int
    actor_id: str
    legacy_aliases: tuple[str, ...]
    role: str
    display_name: str
    aliases: tuple[str, ...]
    enabled: bool
    avatar_key: str
    voice_key: str
    personality: dict[str, float]
    traits: tuple[str, ...]
    interests: tuple[str, ...]
    routine_template: str
    speaking_style: dict[str, Any]
    prompt_identity: str
    social_moments: tuple[SocialMomentDefinition, ...]


class CharacterCatalog:
    def __init__(
        self,
        schema_version: int,
        definitions: list[CharacterDefinition],
        routine_templates: dict[str, dict[str, tuple[RoutineActivityDefinition, ...]]],
        interaction_templates: tuple[InteractionTemplateDefinition, ...],
        intention_templates: tuple[IntentionTemplateDefinition, ...],
        relationship_policy: dict[str, Any],
    ):
        self.schema_version = schema_version
        self.definitions = tuple(definitions)
        self.routine_templates = routine_templates
        self.interaction_templates = interaction_templates
        self.intention_templates = intention_templates
        self.relationship_policy = relationship_policy
        self._by_id = {definition.actor_id: definition for definition in definitions}
        self._aliases: dict[str, str] = {}
        for definition in definitions:
            for alias in definition.legacy_aliases:
                self._aliases[alias] = definition.actor_id

    def canonical_actor_id(self, actor_id: str) -> str:
        return self._aliases.get(actor_id, actor_id)

    def get(self, actor_id: str) -> Optional[CharacterDefinition]:
        return self._by_id.get(self.canonical_actor_id(actor_id))

    def activities_for(
        self, actor_id: str, window_key: str
    ) -> tuple[RoutineActivityDefinition, ...]:
        definition = self.get(actor_id)
        if definition is None:
            return ()
        template = self.routine_templates.get(definition.routine_template, {})
        return template.get(window_key, ())

    @property
    def legacy_alias_map(self) -> dict[str, str]:
        return dict(self._aliases)

    @property
    def lead(self) -> CharacterDefinition:
        return next(definition for definition in self.definitions if definition.role == "lead")


def _required_text(raw: dict[str, Any], field: str, actor: str) -> str:
    value = str(raw.get(field, "")).strip()
    if not value:
        raise ValueError(f"角色 {actor} 缺少 {field}")
    return value


def _parse_definition(raw: dict[str, Any]) -> CharacterDefinition:
    actor_id = _required_text(raw, "actor_id", "<unknown>")
    moments = tuple(
        SocialMomentDefinition(
            content=_required_text(item, "content", actor_id),
            location=_required_text(item, "location", actor_id),
            lead_comment=_required_text(item, "lead_comment", actor_id),
        )
        for item in raw.get("social_moments", [])
    )
    personality = raw.get("personality") or {}
    if not isinstance(personality, dict):
        raise ValueError(f"角色 {actor_id} 的 personality 必须是对象")
    normalized_personality: dict[str, float] = {}
    for key, value in personality.items():
        number = float(value)
        if number < 0 or number > 1:
            raise ValueError(f"角色 {actor_id} 的人格权重 {key} 必须在 0..1")
        normalized_personality[str(key)] = number
    return CharacterDefinition(
        definition_key=_required_text(raw, "definition_key", actor_id),
        definition_version=max(1, int(raw.get("definition_version", 1))),
        actor_id=actor_id,
        legacy_aliases=tuple(str(item).strip() for item in raw.get("legacy_aliases", []) if str(item).strip()),
        role=_required_text(raw, "role", actor_id),
        display_name=_required_text(raw, "display_name", actor_id),
        aliases=tuple(str(item).strip() for item in raw.get("aliases", []) if str(item).strip()),
        enabled=bool(raw.get("enabled", True)),
        avatar_key=str(raw.get("avatar_key", "")).strip(),
        voice_key=str(raw.get("voice_key", "")).strip(),
        personality=normalized_personality,
        traits=tuple(str(item).strip() for item in raw.get("traits", []) if str(item).strip()),
        interests=tuple(str(item).strip() for item in raw.get("interests", []) if str(item).strip()),
        routine_template=str(raw.get("routine_template", "")).strip(),
        speaking_style=dict(raw.get("speaking_style") or {}),
        prompt_identity=str(raw.get("prompt_identity", "")).strip(),
        social_moments=moments,
    )


def _parse_routine_templates(
    raw_templates: Any,
) -> dict[str, dict[str, tuple[RoutineActivityDefinition, ...]]]:
    if not isinstance(raw_templates, dict):
        raise ValueError("routine_templates 必须是对象")
    templates: dict[str, dict[str, tuple[RoutineActivityDefinition, ...]]] = {}
    for template_key, raw_windows in raw_templates.items():
        if not isinstance(raw_windows, dict):
            raise ValueError(f"日程模板 {template_key} 必须按时间窗口配置")
        windows: dict[str, tuple[RoutineActivityDefinition, ...]] = {}
        for window_key, raw_activities in raw_windows.items():
            if not isinstance(raw_activities, list) or not raw_activities:
                raise ValueError(
                    f"日程模板 {template_key} 的 {window_key} 至少需要一个活动"
                )
            activities = []
            for raw_activity in raw_activities:
                activity_label = f"{template_key}.{window_key}"
                state_delta = raw_activity.get("state_delta") or {}
                if not isinstance(state_delta, dict):
                    raise ValueError(f"活动 {activity_label} 的 state_delta 必须是对象")
                activities.append(
                    RoutineActivityDefinition(
                        activity_id=_required_text(
                            raw_activity, "activity_id", activity_label
                        ),
                        event_type=_required_text(
                            raw_activity, "event_type", activity_label
                        ),
                        location_id=_required_text(
                            raw_activity, "location_id", activity_label
                        ),
                        summary=_required_text(raw_activity, "summary", activity_label),
                        interpretation=str(
                            raw_activity.get("interpretation", "")
                        ).strip(),
                        private_thought=str(
                            raw_activity.get("private_thought", "")
                        ).strip(),
                        importance=max(
                            0, min(100, int(raw_activity.get("importance", 30)))
                        ),
                        mentionability=max(
                            0, min(100, int(raw_activity.get("mentionability", 45)))
                        ),
                        publicability=max(
                            0, min(100, int(raw_activity.get("publicability", 25)))
                        ),
                        state_delta={
                            str(key): int(value) for key, value in state_delta.items()
                        },
                    )
                )
            windows[str(window_key)] = tuple(activities)
        templates[str(template_key)] = windows
    return templates


def _parse_interaction_templates(
    raw_templates: Any,
) -> tuple[InteractionTemplateDefinition, ...]:
    if not isinstance(raw_templates, list) or not raw_templates:
        raise ValueError("interaction_templates 至少需要一个互动模板")
    templates = []
    seen_ids = set()
    allowed_kinds = {"supportive", "conflict", "repair"}
    for raw in raw_templates:
        interaction_id = _required_text(raw, "interaction_id", "interaction")
        if interaction_id in seen_ids:
            raise ValueError(f"互动模板 ID 重复: {interaction_id}")
        seen_ids.add(interaction_id)
        interaction_kind = str(raw.get("kind", "supportive")).strip()
        if interaction_kind not in allowed_kinds:
            raise ValueError(f"互动模板 {interaction_id} 的 kind 无效")
        perspectives = raw.get("perspectives") or {}
        actor_a = perspectives.get("actor_a") or {}
        actor_b = perspectives.get("actor_b") or {}
        relationship_delta = raw.get("relationship_delta") or {}
        if not isinstance(relationship_delta, dict):
            raise ValueError(
                f"互动模板 {interaction_id} 的 relationship_delta 必须是对象"
            )
        summary_template = _required_text(
            raw, "summary_template", interaction_id
        )
        if "{actor_a}" not in summary_template or "{actor_b}" not in summary_template:
            raise ValueError(
                f"互动模板 {interaction_id} 必须同时包含 actor_a 和 actor_b 占位符"
            )
        try:
            summary_template.format(actor_a="A", actor_b="B")
        except (KeyError, ValueError) as error:
            raise ValueError(
                f"互动模板 {interaction_id} 的 summary_template 占位符无效"
            ) from error
        templates.append(
            InteractionTemplateDefinition(
                interaction_id=interaction_id,
                interaction_kind=interaction_kind,
                event_type=_required_text(raw, "event_type", interaction_id),
                location_id=_required_text(raw, "location_id", interaction_id),
                summary_template=summary_template,
                actor_a_interpretation=str(
                    actor_a.get("interpretation", "")
                ).strip(),
                actor_b_interpretation=str(
                    actor_b.get("interpretation", "")
                ).strip(),
                actor_a_private_thought=str(
                    actor_a.get("private_thought", "")
                ).strip(),
                actor_b_private_thought=str(
                    actor_b.get("private_thought", "")
                ).strip(),
                importance=max(0, min(100, int(raw.get("importance", 35)))),
                mentionability=max(
                    0, min(100, int(raw.get("mentionability", 55)))
                ),
                publicability=max(
                    0, min(100, int(raw.get("publicability", 30)))
                ),
                relationship_delta={
                    str(key): int(value)
                    for key, value in relationship_delta.items()
                },
                min_tension=max(0, min(100, int(raw.get("min_tension", 0)))),
                min_trust=max(0, min(100, int(raw.get("min_trust", 0)))),
            )
        )
    return tuple(templates)


def _parse_intention_templates(
    raw_templates: Any,
) -> tuple[IntentionTemplateDefinition, ...]:
    if not isinstance(raw_templates, list) or not raw_templates:
        raise ValueError("intention_templates 至少需要一个意图模板")
    templates = []
    seen_ids = set()
    seen_suggestion_types = set()
    allowed_metrics = {
        "energy",
        "hunger",
        "stress",
        "social_need",
        "solitude_need",
    }
    allowed_directions = {"high", "low"}
    allowed_targets = {"none", "relationship"}
    allowed_placeholders = {"actor", "interest", "target"}
    for raw in raw_templates:
        intention_id = _required_text(raw, "intention_id", "intention")
        if intention_id in seen_ids:
            raise ValueError(f"意图模板 ID 重复: {intention_id}")
        seen_ids.add(intention_id)
        state_metric = _required_text(raw, "state_metric", intention_id)
        state_direction = str(raw.get("state_direction", "high")).strip()
        target_mode = str(raw.get("target_mode", "none")).strip()
        if state_metric not in allowed_metrics:
            raise ValueError(f"意图模板 {intention_id} 的状态指标无效")
        if state_direction not in allowed_directions:
            raise ValueError(f"意图模板 {intention_id} 的状态方向无效")
        if target_mode not in allowed_targets:
            raise ValueError(f"意图模板 {intention_id} 的目标模式无效")
        action = raw.get("action") or {}
        if not isinstance(action, dict):
            raise ValueError(f"意图模板 {intention_id} 的 action 必须是对象")
        state_delta = action.get("state_delta") or {}
        relationship_delta = action.get("relationship_delta") or {}
        if not isinstance(state_delta, dict):
            raise ValueError(f"意图模板 {intention_id} 的 state_delta 必须是对象")
        if not isinstance(relationship_delta, dict):
            raise ValueError(
                f"意图模板 {intention_id} 的 relationship_delta 必须是对象"
            )
        text_fields = {
            "summary_template": _required_text(raw, "summary_template", intention_id),
            "motivation_template": _required_text(
                raw, "motivation_template", intention_id
            ),
            "event_summary_template": _required_text(
                action, "summary_template", intention_id
            ),
            "interpretation_template": str(
                action.get("interpretation_template", "")
            ).strip(),
        }
        for field, template in text_fields.items():
            try:
                template.format(actor="A", interest="I", target="T")
            except (KeyError, ValueError) as error:
                raise ValueError(
                    f"意图模板 {intention_id} 的 {field} 占位符无效；"
                    f"仅支持 {sorted(allowed_placeholders)}"
                ) from error
        suggestion_type = _required_text(raw, "suggestion_type", intention_id)
        if suggestion_type in seen_suggestion_types:
            raise ValueError(f"意图建议类型重复: {suggestion_type}")
        seen_suggestion_types.add(suggestion_type)
        templates.append(
            IntentionTemplateDefinition(
                intention_id=intention_id,
                suggestion_type=suggestion_type,
                driver=_required_text(raw, "driver", intention_id),
                state_metric=state_metric,
                state_direction=state_direction,
                threshold=max(0, min(100, int(raw.get("threshold", 50)))),
                base_score=int(raw.get("base_score", 20)),
                need_weight=float(raw.get("need_weight", 0.7)),
                personality_key=str(raw.get("personality_key", "")).strip(),
                personality_weight=int(raw.get("personality_weight", 0)),
                target_mode=target_mode,
                summary_template=text_fields["summary_template"],
                motivation_template=text_fields["motivation_template"],
                event_type=_required_text(action, "event_type", intention_id),
                location_id=_required_text(action, "location_id", intention_id),
                event_summary_template=text_fields["event_summary_template"],
                interpretation_template=text_fields["interpretation_template"],
                importance=max(0, min(100, int(action.get("importance", 35)))),
                mentionability=max(
                    0, min(100, int(action.get("mentionability", 50)))
                ),
                publicability=max(
                    0, min(100, int(action.get("publicability", 20)))
                ),
                state_delta={str(key): int(value) for key, value in state_delta.items()},
                relationship_delta={
                    str(key): int(value)
                    for key, value in relationship_delta.items()
                },
            )
        )
    return tuple(templates)


@lru_cache(maxsize=4)
def load_character_catalog(path: str | None = None) -> CharacterCatalog:
    catalog_path = Path(path) if path else DEFAULT_CHARACTER_CATALOG
    with catalog_path.open("r", encoding="utf-8") as source:
        raw = yaml.safe_load(source) or {}
    schema_version = int(raw.get("schema_version", 0))
    if schema_version != 1:
        raise ValueError(f"不支持的角色配置版本: {schema_version}")
    definitions = [_parse_definition(item) for item in raw.get("characters", [])]
    routine_templates = _parse_routine_templates(raw.get("routine_templates", {}))
    interaction_templates = _parse_interaction_templates(
        raw.get("interaction_templates", [])
    )
    intention_templates = _parse_intention_templates(
        raw.get("intention_templates", [])
    )
    relationship_policy = raw.get("relationship_policy") or {}
    if not isinstance(relationship_policy, dict):
        raise ValueError("relationship_policy 必须是对象")
    tiers = relationship_policy.get("tiers") or []
    if not isinstance(tiers, list) or not tiers:
        raise ValueError("relationship_policy.tiers 至少需要一项")
    previous = -1
    for tier in tiers:
        minimum = int(tier.get("min_closeness", 0))
        if minimum <= previous:
            raise ValueError("关系层级 min_closeness 必须严格递增")
        _required_text(tier, "key", "relationship tier")
        previous = minimum
    if not definitions:
        raise ValueError("角色配置不能为空")

    actor_ids = [item.actor_id for item in definitions]
    definition_keys = [item.definition_key for item in definitions]
    if len(actor_ids) != len(set(actor_ids)):
        raise ValueError("角色配置包含重复 actor_id")
    if len(definition_keys) != len(set(definition_keys)):
        raise ValueError("角色配置包含重复 definition_key")
    leads = [item for item in definitions if item.role == "lead" and item.enabled]
    if len(leads) != 1:
        raise ValueError("角色配置必须且只能包含一个启用的 lead")

    reserved = set(actor_ids)
    legacy_aliases: set[str] = set()
    for definition in definitions:
        for alias in definition.legacy_aliases:
            if alias in reserved or alias in legacy_aliases:
                raise ValueError(f"角色旧 ID 别名重复或与正式 ID 冲突: {alias}")
            legacy_aliases.add(alias)
        if definition.role == "friend" and not definition.social_moments:
            raise ValueError(f"预设朋友 {definition.actor_id} 至少需要一条社交素材")
        if (
            definition.role == "friend"
            and definition.routine_template not in routine_templates
        ):
            raise ValueError(
                f"预设朋友 {definition.actor_id} 引用了不存在的日程模板: "
                f"{definition.routine_template}"
            )
    return CharacterCatalog(
        schema_version,
        definitions,
        routine_templates,
        interaction_templates,
        intention_templates,
        relationship_policy,
    )


class CharacterRegistry:
    """The only runtime entry point for character definitions and world profiles."""

    def __init__(
        self,
        store: "LifeStore",
        catalog: Optional[CharacterCatalog] = None,
    ):
        self.store = store
        self.catalog = catalog or load_character_catalog()

    def ensure_world(
        self, owner_user_id: str, *, now: Optional[datetime] = None
    ) -> list[dict[str, Any]]:
        current = now or utc_now()
        self.store.canonicalize_relationship_aliases(
            owner_user_id, self.catalog.legacy_alias_map, now=current
        )
        for definition in self.catalog.definitions:
            self.store.ensure_actor_profile(
                owner_user_id,
                actor_id=definition.actor_id,
                definition_key=definition.definition_key,
                actor_role=definition.role,
                display_name=definition.display_name,
                definition_version=definition.definition_version,
                now=current,
                status="active" if definition.enabled else "disabled",
            )
        return self.store.list_actor_profiles(owner_user_id)

    def get_definition(self, actor_id: str) -> Optional[CharacterDefinition]:
        return self.catalog.get(actor_id)

    def canonical_actor_id(self, actor_id: str) -> str:
        return self.catalog.canonical_actor_id(actor_id)

    def get_actor(self, owner_user_id: str, actor_id: str) -> Optional[dict[str, Any]]:
        canonical_id = self.canonical_actor_id(actor_id)
        profile = self.store.get_actor_profile(owner_user_id, canonical_id)
        if profile is None:
            definition = self.get_definition(canonical_id)
            if definition is None or not definition.enabled:
                return None
            self.store.ensure_actor_profile(
                owner_user_id,
                actor_id=definition.actor_id,
                definition_key=definition.definition_key,
                actor_role=definition.role,
                display_name=definition.display_name,
                definition_version=definition.definition_version,
                now=utc_now(),
                status="active" if definition.enabled else "disabled",
            )
            profile = self.store.get_actor_profile(owner_user_id, canonical_id)
        if profile is None:
            return None
        definition = self.get_definition(canonical_id)
        return self._merge(profile, definition)

    def get_lead(self, owner_user_id: str) -> dict[str, Any]:
        actor = self.get_actor(owner_user_id, self.catalog.lead.actor_id)
        if actor is None:
            raise KeyError("主角色档案不存在")
        return actor

    def list_contacts(self, owner_user_id: str) -> list[dict[str, Any]]:
        self.ensure_world(owner_user_id)
        profiles = self.store.list_actor_profiles(
            owner_user_id, actor_role="friend", status="active"
        )
        contacts = []
        for profile in profiles:
            definition = self.get_definition(profile["actor_id"])
            if definition is not None and definition.enabled:
                contacts.append(self._merge(profile, definition))
        return contacts

    def display_name(self, owner_user_id: str, actor_id: str) -> str:
        actor = self.get_actor(owner_user_id, actor_id)
        if actor is not None:
            return actor["display_name"]
        definition = self.get_definition(actor_id)
        return definition.display_name if definition else actor_id

    @staticmethod
    def _merge(
        profile: dict[str, Any], definition: Optional[CharacterDefinition]
    ) -> dict[str, Any]:
        result = dict(profile)
        result["display_name"] = (
            profile.get("display_name_override") or profile["display_name"]
        )
        if definition is not None:
            result.update(
                {
                    "aliases": list(definition.aliases),
                    "legacy_aliases": list(definition.legacy_aliases),
                    "avatar_key": definition.avatar_key,
                    "voice_key": definition.voice_key,
                    "personality": dict(definition.personality),
                    "traits": list(definition.traits),
                    "interests": list(definition.interests),
                    "routine_template": definition.routine_template,
                    "speaking_style": dict(definition.speaking_style),
                    "prompt_identity": definition.prompt_identity,
                    "social_moments": list(definition.social_moments),
                }
            )
        return result


__all__ = [
    "CharacterCatalog",
    "CharacterDefinition",
    "CharacterRegistry",
    "InteractionTemplateDefinition",
    "IntentionTemplateDefinition",
    "RoutineActivityDefinition",
    "SocialMomentDefinition",
    "load_character_catalog",
]
