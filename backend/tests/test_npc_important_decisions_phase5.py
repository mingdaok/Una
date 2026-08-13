from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor

from life_simulation.candidates import ActionCandidate
from life_simulation.decision_engine import DecisionEngine
from life_simulation.important_decisions import (
    ImportantDecisionAdvisor,
    LlmProviderResponse,
)
from life_simulation.models import LifeWindow
from life_simulation.store import LifeStore
from life_simulation.utility import ScoredCandidate


START = datetime(2026, 8, 18, 6, 0, tzinfo=timezone.utc)
WINDOW = LifeWindow(
    key="afternoon", label="下午", start_at=START,
    end_at=START + timedelta(hours=3),
)


def candidate(candidate_id, source, score):
    return ScoredCandidate(
        candidate=ActionCandidate(
            candidate_id, "focus_project" if source == "goal" else "explore",
            candidate_id, "home", candidate_id, source, 60,
        ),
        score=score,
        components={"goal_progress": 30 if source == "goal" else 0},
    )


class Provider:
    def __init__(self, payload=None, error=None):
        self.payload = payload
        self.error = error
        self.calls = []

    def decide(self, request):
        self.calls.append(request)
        if self.error:
            raise self.error
        return LlmProviderResponse(
            payload=self.payload, model="test-model", latency_ms=27,
            input_tokens=120, output_tokens=34,
        )


def make_advisor(tmp_path, provider, budget=2):
    store = LifeStore(str(tmp_path / "important-decisions.sqlite3"))
    return store, ImportantDecisionAdvisor(
        store, provider=provider, enabled=True, daily_budget=budget,
        score_gap_threshold=8,
    )


def test_close_important_candidates_can_be_selected_from_strict_whitelist(tmp_path):
    provider = Provider({
        "selected_candidate_id": "candidate-goal",
        "motivation": "goal_commitment",
        "public_reason": "想把已经开始的事情继续推进。",
        "private_reason": "不想让自己又一次半途而废。",
        "confidence": 0.78,
    })
    store, advisor = make_advisor(tmp_path, provider)
    candidates = (
        candidate("candidate-rule", "routine", 46),
        candidate("candidate-goal", "goal", 43),
    )

    result = advisor.consider(
        "user-a", {"actor_id": "npc_preset_2"}, {"state_version": 4},
        WINDOW, candidates, rule_selected_id="candidate-rule",
        has_hard_commitment=False,
    )

    assert result.selected_candidate_id == "candidate-goal"
    assert result.used_llm is True
    assert result.public_reason
    assert result.private_reason
    request_text = str(provider.calls[0])
    assert "user-a" not in request_text
    assert "private_reason" not in request_text
    calls = store.list_decision_llm_calls("user-a", "npc_preset_2")
    assert calls[0]["status"] == "accepted"
    assert calls[0]["input_tokens"] == 120


def test_illegal_candidate_and_timeout_fall_back_to_rule_selection(tmp_path):
    illegal = Provider({
        "selected_candidate_id": "invented-location-and-person",
        "motivation": "novelty",
        "public_reason": "临时改变主意。",
        "private_reason": "想试试。",
        "confidence": 0.7,
    })
    store, advisor = make_advisor(tmp_path, illegal)
    candidates = (
        candidate("candidate-rule", "routine", 46),
        candidate("candidate-goal", "goal", 43),
    )

    invalid = advisor.consider(
        "user-a", {"actor_id": "npc_preset_2"}, {"state_version": 4},
        WINDOW, candidates, rule_selected_id="candidate-rule",
        has_hard_commitment=False,
    )
    timeout_advisor = ImportantDecisionAdvisor(
        store, provider=Provider(error=TimeoutError("slow")), enabled=True,
        daily_budget=2, score_gap_threshold=8,
    )
    timed_out = timeout_advisor.consider(
        "user-a", {"actor_id": "npc_preset_2"}, {"state_version": 5},
        LifeWindow(
            key="evening", label="晚上",
            start_at=START + timedelta(hours=4),
            end_at=START + timedelta(hours=7),
        ),
        candidates, rule_selected_id="candidate-rule",
        has_hard_commitment=False,
    )

    assert invalid.selected_candidate_id == "candidate-rule"
    assert invalid.fallback_reason == "illegal_candidate"
    assert timed_out.selected_candidate_id == "candidate-rule"
    assert timed_out.fallback_reason == "provider_timeout"


def test_budget_hard_commitment_and_unimportant_windows_skip_provider(tmp_path):
    provider = Provider({
        "selected_candidate_id": "candidate-goal", "motivation": "goal_commitment",
        "public_reason": "继续推进。", "private_reason": "不想放弃。",
        "confidence": 0.8,
    })
    store, advisor = make_advisor(tmp_path, provider, budget=1)
    important = (
        candidate("candidate-rule", "routine", 46),
        candidate("candidate-goal", "goal", 43),
    )
    ordinary = (
        candidate("candidate-rule", "routine", 60),
        candidate("candidate-other", "routine", 30),
    )

    first = advisor.consider(
        "user-a", {"actor_id": "npc_preset_2"}, {"state_version": 1},
        WINDOW, important, rule_selected_id="candidate-rule",
        has_hard_commitment=False,
    )
    budget = advisor.consider(
        "user-a", {"actor_id": "npc_preset_2"}, {"state_version": 2},
        LifeWindow("evening", "晚上", START + timedelta(hours=4), START + timedelta(hours=7)),
        important, rule_selected_id="candidate-rule", has_hard_commitment=False,
    )
    hard = advisor.consider(
        "user-a", {"actor_id": "npc_preset_2"}, {"state_version": 3},
        WINDOW, important, rule_selected_id="candidate-rule",
        has_hard_commitment=True,
    )
    unimportant = advisor.consider(
        "user-b", {"actor_id": "npc_preset_2"}, {"state_version": 1},
        WINDOW, ordinary, rule_selected_id="candidate-rule",
        has_hard_commitment=False,
    )

    assert first.used_llm is True
    assert budget.fallback_reason == "daily_budget_exhausted"
    assert hard.triggered is False
    assert unimportant.triggered is False
    assert len(provider.calls) == 1


def test_decision_engine_applies_advice_and_keeps_rule_fallback_context(tmp_path):
    provider = Provider({
        "selected_candidate_id": "candidate-goal",
        "motivation": "goal_commitment",
        "public_reason": "想继续推进长期目标。",
        "private_reason": "不想再次搁置它。",
        "confidence": 0.76,
    })
    _, advisor = make_advisor(tmp_path, provider)
    engine = DecisionEngine(
        engine_version="npc-agency-v2", important_advisor=advisor,
    )

    result = engine.select(
        "user-a", {"actor_id": "npc_preset_2"}, {"state_version": 6},
        WINDOW,
        (
            candidate("candidate-rule", "routine", 46),
            candidate("candidate-goal", "goal", 43),
        ),
        has_hard_commitment=False,
        fallback_reason="v2_catalog_partial",
    )

    assert result.selected.candidate.candidate_id == "candidate-goal"
    assert result.used_llm is True
    assert result.llm_model == "test-model"
    assert result.fallback_reason == "v2_catalog_partial"
    audit = result.as_audit()
    assert audit["selected_candidate_id"] == "candidate-goal"
    assert audit["llm_public_reason"] == "想继续推进长期目标。"
    assert [item["selected"] for item in audit["candidate_scores"]] == [False, True]


def test_hard_commitment_cannot_be_overridden_by_sampling_or_llm(tmp_path):
    provider = Provider({
        "selected_candidate_id": "candidate-goal",
        "motivation": "goal_commitment",
        "public_reason": "改去推进目标。",
        "private_reason": "临时更想做自己的事。",
        "confidence": 0.9,
    })
    _, advisor = make_advisor(tmp_path, provider)
    engine = DecisionEngine(
        engine_version="npc-agency-v2", important_advisor=advisor,
    )
    hard = candidate("candidate-invitation", "commitment", 5)
    hard = ScoredCandidate(
        candidate=ActionCandidate(
            **{
                **hard.candidate.__dict__,
                "metadata": {"flexibility": "hard"},
            }
        ),
        score=hard.score,
        components=hard.components,
    )

    result = engine.select(
        "user-a", {"actor_id": "npc_preset_2"}, {"state_version": 7},
        WINDOW,
        (hard, candidate("candidate-goal", "goal", 80)),
        has_hard_commitment=True,
    )

    assert result.selected.candidate.candidate_id == "candidate-invitation"
    assert result.used_llm is False
    assert provider.calls == []
    assert [item["probability"] for item in result.candidate_scores] == [1.0, 0.0]


def test_daily_budget_is_atomically_reserved_under_concurrency(tmp_path):
    provider = Provider({
        "selected_candidate_id": "candidate-goal",
        "motivation": "goal_commitment",
        "public_reason": "继续推进。",
        "private_reason": "不想放弃。",
        "confidence": 0.8,
    })
    store, advisor = make_advisor(tmp_path, provider, budget=1)
    important = (
        candidate("candidate-rule", "routine", 46),
        candidate("candidate-goal", "goal", 43),
    )

    def run(version):
        window = LifeWindow(
            "afternoon", "下午",
            START + timedelta(minutes=version),
            START + timedelta(hours=3, minutes=version),
        )
        return advisor.consider(
            "user-a", {"actor_id": "npc_preset_2"},
            {"state_version": version}, window, important,
            rule_selected_id="candidate-rule", has_hard_commitment=False,
        )

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(run, range(1, 5)))

    assert sum(item.used_llm for item in results) == 1
    assert sum(item.fallback_reason == "daily_budget_exhausted" for item in results) == 3
    assert len(provider.calls) == 1
    calls = store.list_decision_llm_calls("user-a", "npc_preset_2")
    assert len(calls) == 1
    assert calls[0]["status"] == "accepted"


def test_explicit_consequential_triggers_are_classified(tmp_path):
    _, advisor = make_advisor(tmp_path, Provider({}))
    relationship = candidate("repair", "relationship", 44)
    relationship = ScoredCandidate(
        candidate=ActionCandidate(**{
            **relationship.candidate.__dict__,
            "metadata": {"relationship_repair": True, "relationship_tension": 45},
        }),
        score=44,
        components=relationship.components,
    )
    routine = candidate("routine", "routine", 46)

    assert advisor._trigger_reason((routine, relationship)) == "persistent_relationship_conflict"
