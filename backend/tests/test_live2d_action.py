import os
import sys


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from live2d_action import ActionDirector, parse_action_plan


def valid_plan(**changes):
    plan = {
        "intent": "shy_happy",
        "intensity": 0.68,
        "expression": "subtle",
        "timing": "after_sentence",
        "duration_ms": 1200,
        "variation_seed": 82914,
    }
    plan.update(changes)
    return plan


def test_parse_action_plan_normalizes_bounds_and_rejects_unknown_intent():
    normalized = parse_action_plan(valid_plan(intensity=3, duration_ms=9999))

    assert normalized["intensity"] == 1.0
    assert normalized["duration_ms"] == 2500
    assert parse_action_plan(valid_plan(intent="wave_forever")) is None


def test_director_downgrades_ordinary_expressive_action_and_enforces_cooldown():
    now = [100.0]
    director = ActionDirector(clock=lambda: now[0], id_factory=lambda: "action-1")

    event = director.decide("u-1", valid_plan(intent="thinking", expression="expressive"))

    assert event["expression"] == "subtle"
    assert director.decide("u-1", valid_plan()) is None

    now[0] += 3.1
    assert director.decide("u-1", valid_plan(variation_seed=2))["action_id"] == "action-1"


def test_director_allows_qualified_expressive_action_and_suppresses_fourth_normal_action():
    now = [0.0]
    director = ActionDirector(clock=lambda: now[0], id_factory=lambda: "event")

    for seed in (1, 2, 3):
        assert director.decide("u-1", valid_plan(variation_seed=seed)) is not None
        now[0] += 3.1

    assert director.decide("u-1", valid_plan(variation_seed=4)) is None

    event = director.decide("u-1", valid_plan(
        intent="happy_surprise",
        intensity=0.8,
        expression="expressive",
        variation_seed=5,
    ))

    assert event["expression"] == "expressive"
