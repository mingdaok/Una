from datetime import datetime, timezone

import pytest

from life_simulation.action_catalog import ActionAtomDefinition, ActionCatalog
from life_simulation.candidates import CandidateGenerator
from life_simulation.constraints import ConstraintEvaluator
from life_simulation.decision_engine import DecisionEngine
from life_simulation.models import LifeWindow
from life_simulation.utility import UtilityScorer


WINDOW = LifeWindow(
    key="afternoon",
    label="下午",
    start_at=datetime(2026, 8, 15, 6, 0, tzinfo=timezone.utc),
    end_at=datetime(2026, 8, 15, 9, 0, tzinfo=timezone.utc),
)


def _catalog() -> ActionCatalog:
    return ActionCatalog(
        (
            ActionAtomDefinition(
                action_type="rest",
                categories=("recovery", "quiet"),
                allowed_locations=("home",),
                duration_minutes=(20, 90),
                base_cost={},
                base_effect={"energy": 18, "stress": -12},
                requirements={},
                window_keys=("afternoon",),
                summary_templates=("在家安静休息了一会儿。",),
            ),
            ActionAtomDefinition(
                action_type="explore",
                categories=("novelty", "outdoor"),
                allowed_locations=("old_bookstore",),
                duration_minutes=(40, 120),
                base_cost={"energy": 12},
                base_effect={"boredom": -24},
                requirements={"min_energy": 25},
                window_keys=("afternoon",),
                summary_templates=("去了旧书店，顺手翻了些和{interest}有关的内容。",),
            ),
            ActionAtomDefinition(
                action_type="connect",
                categories=("social",),
                allowed_locations=("online", "neighborhood_cafe"),
                duration_minutes=(5, 60),
                base_cost={"energy": 4},
                base_effect={"social_need": -24},
                requirements={"min_confidence": 20},
                window_keys=("afternoon",),
                summary_templates=("主动联系了一位熟悉的人。",),
            ),
        )
    )


def _actor() -> dict:
    return {
        "actor_id": "npc_preset_2",
        "display_name": "知夏",
        "interests": ["摄影", "阅读"],
        "personality": {"openness": 0.75, "conscientiousness": 0.62},
        "decision_style": {
            "spontaneity": 0.45,
            "routine_preference": 0.55,
            "novelty_seeking": 0.82,
            "plan_commitment": 0.65,
            "social_initiative": 0.35,
            "risk_tolerance": 0.30,
            "persistence": 0.68,
            "emotional_sensitivity": 0.57,
        },
    }


def _state(**overrides) -> dict:
    state = {
        "energy": 55,
        "hunger": 20,
        "stress": 25,
        "social_need": 20,
        "solitude_need": 20,
        "boredom": 84,
        "focus": 60,
        "confidence": 55,
        "comfort": 70,
        "state_version": 7,
    }
    state.update(overrides)
    return state


def test_candidate_generation_uses_needs_and_composes_action_parameters():
    candidates = CandidateGenerator(_catalog()).generate(
        _actor(), _state(boredom=78), WINDOW,
        routine_activities=(), recent_events=(),
    )

    explore = next(item for item in candidates if item.action_type == "explore")
    assert explore.source == "need"
    assert explore.location_id == "old_bookstore"
    assert explore.subject in {"摄影", "阅读"}
    assert explore.duration_minutes >= 40
    assert explore.subject in explore.summary


def test_candidate_summary_uses_readable_location_name_instead_of_internal_id():
    catalog = ActionCatalog((
        ActionAtomDefinition(
            action_type="meal", categories=("meal",),
            allowed_locations=("neighborhood_cafe",), duration_minutes=(30, 30),
            base_cost={}, base_effect={}, requirements={},
            window_keys=("afternoon",),
            summary_templates=("去了{location}认真吃了顿饭。",),
        ),
    ))
    candidate = CandidateGenerator(catalog).generate(
        _actor(), _state(hunger=80), WINDOW,
        routine_activities=(), recent_events=(),
    )[0]

    assert candidate.summary == "去了街区咖啡馆认真吃了顿饭。"
    assert "neighborhood_cafe" not in candidate.summary


def test_constraints_reject_candidates_that_exceed_energy_or_focus():
    candidates = CandidateGenerator(_catalog()).generate(
        _actor(), _state(energy=18, focus=12, boredom=80), WINDOW,
        routine_activities=(), recent_events=(),
    )

    accepted, rejected = ConstraintEvaluator().filter(
        candidates, state={"energy": 18, "focus": 12}, window=WINDOW,
    )

    assert {item.action_type for item in accepted} == {"rest"}
    assert any(item.reason_code == "energy_below_minimum" for item in rejected)


def test_constraints_enforce_resources_persona_participants_and_safety():
    base = next(
        item for item in CandidateGenerator(_catalog()).generate(
            _actor(), _state(social_need=80), WINDOW,
            routine_activities=(), recent_events=(),
            relationships=({
                "other_ai_id": "npc_preset_1", "display_name": "小满",
                "affinity": 40, "trust": 40, "familiarity": 50,
            },),
        ) if item.source == "relationship"
    )
    metadata = {
        **base.metadata,
        "required_resources": ["phone"],
        "target_actor_id": "npc_preset_1",
    }
    candidate = type(base)(**{**base.__dict__, "metadata": metadata})

    _, missing = ConstraintEvaluator().filter(
        (candidate,), state=_state(), window=WINDOW,
        actor={"forbidden_actions": []}, context={"available_resources": []},
    )
    _, unavailable = ConstraintEvaluator().filter(
        (candidate,), state=_state(), window=WINDOW,
        actor={"forbidden_actions": []},
        context={
            "available_resources": ["phone"],
            "unavailable_participant_ids": ["npc_preset_1"],
        },
    )
    _, forbidden = ConstraintEvaluator().filter(
        (candidate,), state=_state(), window=WINDOW,
        actor={"forbidden_actions": [candidate.action_type]},
        context={"available_resources": ["phone"]},
    )

    assert missing[0].reason_code == "missing_resource"
    assert unavailable[0].reason_code == "participant_unavailable"
    assert forbidden[0].reason_code == "persona_action_forbidden"


def test_utility_applies_need_fit_and_repetition_penalty():
    recent = (
        {"event_type": "explore", "location_id": "old_bookstore"},
        {"event_type": "explore", "location_id": "old_bookstore"},
    )
    candidates = CandidateGenerator(_catalog()).generate(
        _actor(), _state(), WINDOW, routine_activities=(), recent_events=recent,
    )
    scored = UtilityScorer().score_all(
        candidates, actor=_actor(), state=_state(), recent_events=recent,
    )
    explore = next(item for item in scored if item.candidate.action_type == "explore")

    assert explore.components["need_satisfaction"] > 0
    assert explore.components["repetition_penalty"] < 0
    assert explore.score == sum(explore.components.values())


def test_relationship_and_memory_signals_generate_safe_explainable_candidates():
    relationships = ({
        "other_ai_id": "npc_preset_1", "display_name": "小满",
        "familiarity": 65, "affinity": 58, "trust": 62, "tension": 12,
        "last_interaction_at": "2026-08-10T06:00:00+00:00",
        "private_summary": "不应进入候选或审计的内部关系摘要",
    },)
    memories = ({
        "memory_id": "memory-1", "memory_kind": "episodic",
        "source_kind": "npc_interaction", "confidence": 88,
        "content": "不应进入候选或审计的私密记忆正文",
        "learned_at": "2026-08-10T06:00:00+00:00",
        "metadata": {"other_actor_id": "npc_preset_1"},
    },)

    candidates = CandidateGenerator(_catalog()).generate(
        _actor(), _state(social_need=66), WINDOW,
        routine_activities=(), recent_events=(),
        relationships=relationships, memories=memories,
    )
    relationship = next(item for item in candidates if item.source == "relationship")
    memory = next(item for item in candidates if item.source == "memory")
    scored = UtilityScorer().score_all(
        candidates, actor=_actor(), state=_state(social_need=66), recent_events=(),
    )
    relationship_score = next(item for item in scored if item.candidate is relationship)
    memory_score = next(item for item in scored if item.candidate is memory)

    assert relationship.metadata["target_actor_id"] == "npc_preset_1"
    assert relationship_score.components["relationship_motivation"] > 0
    assert memory.metadata["memory_id"] == "memory-1"
    assert memory_score.components["memory_relevance"] > 0
    audit_text = str([item.candidate.summary for item in scored]) + str(
        [item.components for item in scored]
    )
    assert "内部关系摘要" not in audit_text
    assert "私密记忆正文" not in audit_text


def test_softmax_selection_is_reproducible_and_auditable():
    candidates = CandidateGenerator(_catalog()).generate(
        _actor(), _state(), WINDOW, routine_activities=(), recent_events=(),
    )
    scored = UtilityScorer().score_all(
        candidates, actor=_actor(), state=_state(), recent_events=(),
    )
    engine = DecisionEngine(engine_version="npc-agency-v2")

    first = engine.select(
        "owner-a", _actor(), _state(), WINDOW, scored,
        has_hard_commitment=False,
    )
    second = engine.select(
        "owner-a", _actor(), _state(), WINDOW, scored,
        has_hard_commitment=False,
    )

    assert first.selected.candidate.candidate_id == second.selected.candidate.candidate_id
    assert first.random_seed_hash == second.random_seed_hash
    assert first.temperature == second.temperature
    assert sum(item["probability"] for item in first.candidate_scores) == pytest.approx(1)
    assert first.used_llm is False
