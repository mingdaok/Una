from life_simulation.quality_jobs import QualityEvaluationJobService
from life_simulation.store import LifeStore


class Evaluator:
    @staticmethod
    def validate(seeds, *, days):
        assert days in {30, 90}
        return list(seeds)

    @staticmethod
    def total_steps(seeds, *, days):
        return len(list(seeds)) * (days // 30)

    def evaluate(self, seeds, *, days, progress_callback, cancel_requested):
        total = self.total_steps(seeds, days=days)
        for index in range(total):
            if cancel_requested():
                raise AssertionError("unexpected cancel")
            progress_callback(index + 1, total)
        return {"seed_count": len(seeds), "days_per_seed": days}


class CancellingEvaluator(Evaluator):
    def evaluate(self, seeds, *, days, progress_callback, cancel_requested):
        from life_simulation.quality import EvaluationCancelled

        self.on_first_step()
        if cancel_requested():
            raise EvaluationCancelled("cancelled")
        raise AssertionError("cancel request should be visible to the worker")


def test_background_quality_job_persists_progress_result_and_owner_isolation(tmp_path):
    store = LifeStore(str(tmp_path / "jobs.sqlite3"))
    jobs = QualityEvaluationJobService(store, Evaluator())
    created = jobs.create("user-a", seeds=["a", "b"], days=30, run_async=False)

    completed = jobs.run("user-a", created["job_id"])

    assert completed["status"] == "completed"
    assert completed["progress_current"] == completed["progress_total"] == 2
    assert completed["result"]["days_per_seed"] == 30
    assert jobs.get("user-b", created["job_id"]) is None
    assert jobs.list("user-a")[0]["job_id"] == created["job_id"]


def test_queued_background_quality_job_can_be_cancelled(tmp_path):
    store = LifeStore(str(tmp_path / "cancel.sqlite3"))
    jobs = QualityEvaluationJobService(store, Evaluator())
    created = jobs.create("user-a", seeds=["a"], days=90, run_async=False)

    cancelled = jobs.cancel("user-a", created["job_id"])

    assert cancelled["status"] == "cancelled"
    assert cancelled["cancel_requested"] is True


def test_running_background_quality_job_observes_cancel_request(tmp_path):
    store = LifeStore(str(tmp_path / "running-cancel.sqlite3"))
    evaluator = CancellingEvaluator()
    jobs = QualityEvaluationJobService(store, evaluator)
    created = jobs.create("user-a", seeds=["a"], days=90, run_async=False)
    evaluator.on_first_step = lambda: jobs.cancel("user-a", created["job_id"])

    cancelled = jobs.run("user-a", created["job_id"])

    assert cancelled["status"] == "cancelled"
    assert cancelled["cancel_requested"] is True
