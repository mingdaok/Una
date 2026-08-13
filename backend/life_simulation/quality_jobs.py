"""Persistent background jobs for long-running NPC quality evaluations."""

from __future__ import annotations

import hashlib
import threading
from datetime import datetime, timezone
from typing import Any, Iterable

from .quality import EvaluationCancelled, LifeQualityEvaluator
from .store import LifeStore


class QualityEvaluationJobService:
    def __init__(
        self, store: LifeStore, evaluator: LifeQualityEvaluator | None = None
    ):
        self.store = store
        self.evaluator = evaluator or LifeQualityEvaluator()

    def create(
        self, owner_user_id: str, *, seeds: Iterable[str], days: int,
        run_async: bool = True,
    ) -> dict[str, Any]:
        normalized = [str(seed).strip() for seed in seeds]
        self.evaluator.validate(normalized, days=days)
        now = datetime.now(timezone.utc)
        raw = f"{owner_user_id}:{normalized}:{days}:{now.isoformat()}"
        job_id = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]
        job = self.store.create_quality_evaluation_job(
            owner_user_id,
            job={
                "job_id": job_id, "seeds": normalized, "days": days,
                "progress_total": self.evaluator.total_steps(normalized, days=days),
            },
            now=now,
        )
        if run_async:
            thread = threading.Thread(
                target=self.run, args=(owner_user_id, job_id),
                daemon=True, name=f"life-quality-{job_id[:8]}",
            )
            thread.start()
        return job

    def run(self, owner_user_id: str, job_id: str) -> dict[str, Any] | None:
        job = self.store.claim_quality_evaluation_job(
            owner_user_id, job_id, now=datetime.now(timezone.utc)
        )
        if not job:
            return self.store.get_quality_evaluation_job(owner_user_id, job_id)
        try:
            result = self.evaluator.evaluate(
                job["seeds"], days=job["days"],
                progress_callback=lambda current, total: self.store.update_quality_evaluation_progress(
                    owner_user_id, job_id, current=current, total=total
                ),
                cancel_requested=lambda: bool(
                    (self.store.get_quality_evaluation_job(owner_user_id, job_id) or {}).get(
                        "cancel_requested"
                    )
                ),
            )
        except EvaluationCancelled:
            return self.store.finish_quality_evaluation_job(
                owner_user_id, job_id, status="cancelled", result=None,
                error_text=None, now=datetime.now(timezone.utc),
            )
        except Exception as error:
            return self.store.finish_quality_evaluation_job(
                owner_user_id, job_id, status="failed", result=None,
                error_text=str(error)[:500], now=datetime.now(timezone.utc),
            )
        latest = self.store.get_quality_evaluation_job(owner_user_id, job_id)
        status = "cancelled" if latest and latest["cancel_requested"] else "completed"
        return self.store.finish_quality_evaluation_job(
            owner_user_id, job_id, status=status,
            result=result if status == "completed" else None,
            error_text=None, now=datetime.now(timezone.utc),
        )

    def get(self, owner: str, job_id: str) -> dict[str, Any] | None:
        return self.store.get_quality_evaluation_job(owner, job_id)

    def list(self, owner: str, *, limit: int = 20) -> list[dict[str, Any]]:
        return self.store.list_quality_evaluation_jobs(owner, limit=limit)

    def cancel(self, owner: str, job_id: str) -> dict[str, Any] | None:
        return self.store.cancel_quality_evaluation_job(
            owner, job_id, now=datetime.now(timezone.utc)
        )


__all__ = ["QualityEvaluationJobService"]
