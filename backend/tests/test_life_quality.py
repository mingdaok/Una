from life_simulation.quality import LifeQualityEvaluator


def test_quality_evaluation_is_deterministic_and_returns_tuning_metrics():
    evaluator = LifeQualityEvaluator()

    first = evaluator.evaluate(["quality-a", "quality-b"], days=2)
    replay = evaluator.evaluate(["quality-a", "quality-b"], days=2)

    assert replay == first
    assert first["seed_count"] == 2
    assert first["days_per_seed"] == 2
    assert first["metrics"]["actor_event_count"] > 0
    assert first["metrics"]["events_per_actor_day"] > 0
    assert 0 <= first["metrics"]["summary_repetition_rate"] <= 1
    assert first["metrics"]["intention_count"] >= 3
    assert sum(first["metrics"]["suggestion_outcomes"].values()) == 6
    assert len(first["runs"]) == 2


def test_quality_evaluation_validates_batch_boundaries():
    evaluator = LifeQualityEvaluator()

    for seeds, days in (([], 3), (["same", "same"], 3), (["ok"], 0), (["ok"], 8)):
        try:
            evaluator.evaluate(seeds, days=days)
        except ValueError:
            pass
        else:
            raise AssertionError("invalid quality batch should be rejected")
