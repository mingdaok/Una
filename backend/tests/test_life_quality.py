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

    for seeds, days in (([], 3), (["same", "same"], 3), (["ok"], 0), (["ok"], 91)):
        try:
            evaluator.evaluate(seeds, days=days)
        except ValueError:
            pass
        else:
            raise AssertionError("invalid quality batch should be rejected")


def test_quality_evaluation_reports_week_chunks_for_long_runs():
    evaluator = LifeQualityEvaluator()
    progress = []

    result = evaluator.evaluate(
        ["long-run"], days=8,
        progress_callback=lambda current, total: progress.append((current, total)),
    )

    assert progress == [(1, 2), (2, 2)]
    assert result["days_per_seed"] == 8
    assert result["metrics"]["reflection_count"] > 0


def test_ninety_day_stability_run_completes_with_long_horizon_signals():
    result = LifeQualityEvaluator().evaluate(["stability-90-days"], days=90)

    assert result["seed_count"] == 1
    assert result["days_per_seed"] == 90
    assert result["metrics"]["actor_event_count"] > 0
    assert result["metrics"]["reflection_count"] > 0
    assert result["metrics"]["intention_count"] > 0
    assert 0 <= result["metrics"]["summary_repetition_rate"] <= 1
    assert result["runs"][0]["reflections"] > 0
