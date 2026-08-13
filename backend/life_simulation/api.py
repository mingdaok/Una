"""已认证用户的生活模拟 API。"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

import database
import settings as runtime_settings
from auth_api import get_current_user

from .acceptance import LifeAcceptanceService
from .clock import parse_datetime, utc_now
from .chat_context import LifeChatContextService
from .choices import LifeChoiceService
from .content_quality import ContentQualityAuditor
from .content_safety import ContentSafetyService
from .content_safety_eval import ContentSafetyEvaluator
from .continuity import story_stage_label
from .proactive import LifeProactiveService
from .quality import LifeQualityEvaluator
from .quality_jobs import QualityEvaluationJobService
from .service import LifeSettlementService
from .locations import location_name
from .store import DEFAULT_AI_ID, LifeStore


CLIENT_EVENT_FIELDS = (
    "event_id",
    "event_type",
    "status",
    "start_at",
    "end_at",
    "location_id",
    "summary",
    "importance",
    "mentionability",
    "publicability",
    "interpretation",
    "story_arc_id",
)


def _client_event(event: dict) -> dict:
    """Return only fields that are safe and useful for the owner-facing UI."""
    return {key: event[key] for key in CLIENT_EVENT_FIELDS if key in event}


def _client_profile(profile: dict) -> dict:
    fields = (
        "ai_id",
        "display_name",
        "timezone",
        "simulation_enabled",
        "activity_level",
        "social_posts_enabled",
        "diaries_enabled",
        "proactive_messages_enabled",
        "proactive_frequency",
        "major_plot_level",
    )
    return {key: profile[key] for key in fields}


def _client_state(state: dict) -> dict:
    fields = (
        "ai_id",
        "current_location",
        "current_activity",
        "energy",
        "hunger",
        "stress",
        "social_need",
        "solitude_need",
        "mood",
        "active_goals",
        "obligations",
        "last_settled_at",
    )
    result = {key: state[key] for key in fields}
    result["active_goals"] = [
        (
            {
                key: goal[key]
                for key in ("kind", "intention_type", "summary")
                if key in goal
            }
            if isinstance(goal, dict)
            else goal
        )
        for goal in state.get("active_goals", [])
    ]
    return result


def _client_settlement(settlement: Optional[dict]) -> Optional[dict]:
    if settlement is None:
        return None
    fields = (
        "settled_windows",
        "created_events",
        "skipped_windows",
        "stale_retries",
        "capped",
        "last_settled_at",
    )
    return {key: settlement[key] for key in fields}


def _client_status(status: dict) -> dict:
    return {
        "profile": _client_profile(status["profile"]),
        "state": _client_state(status["state"]),
        "settlement": _client_settlement(status.get("settlement")),
    }


def _client_offline_summary(summary: dict) -> dict:
    result = dict(summary)
    result["events"] = [_client_event(event) for event in summary.get("events", [])]
    result["settlement"] = _client_settlement(summary.get("settlement"))
    return result


def _client_story_arc(arc: dict) -> dict:
    return {
        "story_arc_id": arc["story_arc_id"],
        "arc_type": arc["arc_type"],
        "title": arc["title"],
        "status": arc["status"],
        "stage": arc["stage"],
        "stage_label": story_stage_label(arc["stage"]),
        "impact_level": arc["impact_level"],
        "started_at": arc["started_at"],
        "last_advanced_at": arc["last_advanced_at"],
        "completed_at": arc["completed_at"],
    }


def _client_relationship(relationship: dict) -> dict:
    fields = (
        "other_ai_id",
        "display_name",
        "familiarity",
        "affinity",
        "trust",
        "tension",
        "obligation",
        "closeness_score",
        "relationship_tier",
        "disclosure_level",
        "last_interaction_at",
    )
    return {key: relationship[key] for key in fields}


def _client_quality_job(job: dict) -> dict:
    fields = (
        "job_id", "seeds", "days", "status", "progress_current",
        "progress_total", "cancel_requested", "result", "error_text",
        "created_at", "started_at", "finished_at",
    )
    return {key: job[key] for key in fields if key in job}


def _client_story_choice(choice: dict) -> dict:
    fields = (
        "choice_id",
        "source_kind",
        "choice_type",
        "prompt",
        "context_text",
        "status",
        "selected_option_id",
        "resolution_text",
        "created_at",
        "expires_at",
        "resolved_at",
    )
    result = {key: choice[key] for key in fields if key in choice}
    result["options"] = [
        {
            key: option[key]
            for key in ("id", "label", "description")
            if key in option
        }
        for option in choice.get("options", [])
    ]
    return result


def _client_intention(intention: dict) -> dict:
    return {
        key: intention[key]
        for key in (
            "intention_id",
            "choice_id",
            "intention_type",
            "summary",
            "status",
            "earliest_at",
            "deadline_at",
            "resolution_reason",
            "created_at",
            "updated_at",
            "applied_at",
        )
        if key in intention
    }


def _client_actor(actor: dict) -> dict:
    return {
        key: actor[key]
        for key in (
            "actor_id",
            "actor_role",
            "display_name",
            "status",
            "avatar_key",
            "traits",
            "interests",
            "introduced_at",
            "definition_version",
        )
        if key in actor
    }


def _client_actor_state(state: Optional[dict]) -> Optional[dict]:
    if state is None:
        return None
    return {
        key: state[key]
        for key in (
            "actor_id",
            "current_location",
            "current_activity",
            "energy",
            "hunger",
            "stress",
            "social_need",
            "solitude_need",
            "boredom",
            "focus",
            "confidence",
            "comfort",
            "mood",
            "last_settled_at",
            "updated_at",
        )
        if key in state
    }


def _client_actor_schedule(schedule: dict) -> dict:
    result = {
        key: schedule[key]
        for key in (
            "schedule_id",
            "actor_id",
            "window_key",
            "activity_id",
            "event_type",
            "location_id",
            "summary",
            "starts_at",
            "ends_at",
            "status",
            "decision_engine_version",
        )
        if key in schedule
    }
    result["location_name"] = location_name(schedule.get("location_id"))
    return result


def _actor_event_source(event: dict) -> str:
    facts = event.get("facts") or {}
    if facts.get("simulator_version") == "npc-rules-v1":
        return "v1 固定模板"
    return {
        "routine": "习惯候选",
        "need": "状态驱动",
        "state": "状态驱动",
        "goal": "目标驱动",
        "relationship": "关系驱动",
        "memory": "记忆驱动",
        "environment": "环境机会",
        "commitment": "承诺行动",
    }.get(facts.get("candidate_source"), "自主行动")


def _client_actor_event(event: dict) -> dict:
    result = {
        key: event[key]
        for key in (
            "event_id",
            "actor_id",
            "schedule_id",
            "event_type",
            "status",
            "start_at",
            "end_at",
            "location_id",
            "summary",
            "importance",
            "mentionability",
            "publicability",
            "interpretation",
            "disclosure_level",
        )
        if key in event
    }
    result["source"] = _actor_event_source(event)
    result["location_name"] = location_name(event.get("location_id"))
    return result


def _client_interaction_event(event: dict) -> dict:
    result = {
        key: event[key]
        for key in (
            "event_id",
            "event_type",
            "status",
            "start_at",
            "end_at",
            "location_id",
            "summary",
            "importance",
            "mentionability",
            "publicability",
        )
        if key in event
    }
    result["participants"] = [
        {
            "actor_id": item["actor_id"],
            "participant_role": item["participant_role"],
        }
        for item in event.get("participants", [])
    ]
    result["location_name"] = location_name(event.get("location_id"))
    perspective = event.get("perspective")
    if perspective:
        result["perspective"] = {
            key: perspective[key]
            for key in (
                "actor_id",
                "knowledge_source",
                "confidence",
                "interpretation",
                "disclosure_level",
            )
            if key in perspective
        }
    return result


def _debug_interaction_invitation(invitation: dict) -> dict:
    fields = (
        "invitation_id", "initiator_actor_id", "target_actor_id",
        "interaction_template", "starts_at", "ends_at", "location_id",
        "status", "reason_code", "public_reason", "decision_score", "updated_at",
    )
    return {key: invitation[key] for key in fields if key in invitation}


def _client_actor_intention(intention: dict) -> dict:
    return {
        key: intention[key]
        for key in (
            "intention_instance_id",
            "actor_id",
            "template_id",
            "driver",
            "status",
            "summary",
            "target_actor_id",
            "formed_at",
            "earliest_at",
            "deadline_at",
            "resolved_at",
            "outcome_event_id",
        )
        if key in intention
    }


def _client_actor_suggestion(suggestion: dict) -> dict:
    return {
        key: suggestion[key]
        for key in (
            "suggestion_id",
            "actor_id",
            "suggestion_type",
            "message",
            "target_actor_id",
            "status",
            "decision_reason_code",
            "response_text",
            "linked_intention_id",
            "reevaluate_after",
            "created_at",
            "updated_at",
        )
        if key in suggestion
    }


def _debug_actor_decision(decision: dict) -> dict:
    """Developer-only decision evidence; never used by ordinary actor APIs."""
    return {
        key: decision[key]
        for key in (
            "decision_id",
            "actor_id",
            "decision_at",
            "state_version",
            "selected_candidate_id",
            "candidate_scores",
            "rejected_candidates",
            "reason_codes",
            "random_seed_hash",
            "temperature",
            "used_llm",
            "llm_model",
            "fallback_reason",
            "engine_version",
        )
        if key in decision
    }


def _debug_actor_goal(goal: dict) -> dict:
    return {key: goal[key] for key in (
        "goal_id", "actor_id", "goal_type", "title", "priority", "progress",
        "deadline", "status", "origin", "next_review_at", "created_at", "updated_at",
    ) if key in goal}


def _debug_actor_commitment(commitment: dict) -> dict:
    return {key: commitment[key] for key in (
        "commitment_id", "actor_id", "commitment_type", "title", "starts_at",
        "ends_at", "location_id", "participant_ids", "flexibility", "status",
    ) if key in commitment}


class LifeSettingsBody(BaseModel):
    timezone: Optional[str] = None
    simulation_enabled: Optional[bool] = None
    activity_level: Optional[Literal["quiet", "natural", "dramatic"]] = None
    social_posts_enabled: Optional[bool] = None
    diaries_enabled: Optional[bool] = None
    proactive_messages_enabled: Optional[bool] = None
    proactive_frequency: Optional[Literal["occasional", "natural", "frequent"]] = None
    major_plot_level: Optional[Literal["off", "ask", "allow"]] = None


class SettleBody(BaseModel):
    until: Optional[datetime] = None


class ProactiveFeedbackBody(BaseModel):
    delivery_id: str
    reaction: Literal["more", "less", "stop"]


class ResolveChoiceBody(BaseModel):
    option_id: str


class ActorSuggestionBody(BaseModel):
    request_id: str
    suggestion_type: Literal["rest", "walk", "connect", "project", "explore"]
    message: str = ""
    target_actor_id: Optional[str] = None


class AcceptanceResetBody(BaseModel):
    seed: str
    scenario: Literal["baseline", "one_day", "three_days", "one_week"] = "baseline"
    start_at: Optional[datetime] = None


class AcceptanceAdvanceBody(BaseModel):
    hours: int


class QualityEvaluationBody(BaseModel):
    seeds: list[str]
    days: int = 3


class ContentAuditBody(BaseModel):
    post_limit: int = 50
    diary_limit: int = 30
    chat_limit: int = 100


def create_life_router(
    service: LifeSettlementService,
    proactive: Optional[LifeProactiveService] = None,
    choices: Optional[LifeChoiceService] = None,
    *,
    acceptance_enabled: bool = False,
) -> APIRouter:
    router = APIRouter(prefix="/api/life", tags=["AI 生活模拟"])
    proactive = proactive or LifeProactiveService(service.store)
    choices = choices or LifeChoiceService(service.store, service.characters)
    acceptance = LifeAcceptanceService(service)
    quality = LifeQualityEvaluator()
    quality_jobs = QualityEvaluationJobService(service.store, quality)
    content_quality = ContentQualityAuditor(service.store, service.characters)
    content_safety_evaluator = ContentSafetyEvaluator()

    if acceptance_enabled:
        @router.get("/acceptance/status")
        def get_acceptance_status(
            current_user: dict = Depends(get_current_user),
        ):
            return acceptance.status(current_user["id"])

        @router.post("/acceptance/reset")
        def reset_acceptance_world(
            body: AcceptanceResetBody,
            current_user: dict = Depends(get_current_user),
        ):
            try:
                return acceptance.reset(
                    current_user["id"],
                    seed=body.seed,
                    scenario=body.scenario,
                    start_at=body.start_at,
                )
            except ValueError as error:
                raise HTTPException(status_code=400, detail=str(error)) from error

        @router.post("/acceptance/advance")
        def advance_acceptance_world(
            body: AcceptanceAdvanceBody,
            current_user: dict = Depends(get_current_user),
        ):
            try:
                return acceptance.advance(current_user["id"], hours=body.hours)
            except ValueError as error:
                raise HTTPException(status_code=400, detail=str(error)) from error

        @router.post("/acceptance/release")
        def release_acceptance_world(
            current_user: dict = Depends(get_current_user),
        ):
            return acceptance.release(current_user["id"])

        @router.post("/acceptance/evaluate")
        def evaluate_life_quality(
            body: QualityEvaluationBody,
            current_user: dict = Depends(get_current_user),
        ):
            del current_user  # Authentication is required; evaluation worlds are temporary.
            if body.days > 7:
                raise HTTPException(
                    status_code=400,
                    detail="超过 7 天的评估请使用后台评估任务接口",
                )
            try:
                return quality.evaluate(body.seeds, days=body.days)
            except ValueError as error:
                raise HTTPException(status_code=400, detail=str(error)) from error

        @router.post("/acceptance/evaluation-jobs", status_code=202)
        def create_quality_evaluation_job(
            body: QualityEvaluationBody,
            current_user: dict = Depends(get_current_user),
        ):
            try:
                return _client_quality_job(quality_jobs.create(
                    current_user["id"], seeds=body.seeds, days=body.days
                ))
            except ValueError as error:
                raise HTTPException(status_code=400, detail=str(error)) from error

        @router.get("/acceptance/evaluation-jobs")
        def list_quality_evaluation_jobs(
            limit: int = Query(default=20, ge=1, le=100),
            current_user: dict = Depends(get_current_user),
        ):
            return {
                "items": [
                    _client_quality_job(item)
                    for item in quality_jobs.list(current_user["id"], limit=limit)
                ]
            }

        @router.get("/acceptance/evaluation-jobs/{job_id}")
        def get_quality_evaluation_job(
            job_id: str, current_user: dict = Depends(get_current_user),
        ):
            job = quality_jobs.get(current_user["id"], job_id)
            if job is None:
                raise HTTPException(status_code=404, detail="评估任务不存在")
            return _client_quality_job(job)

        @router.post("/acceptance/evaluation-jobs/{job_id}/cancel")
        def cancel_quality_evaluation_job(
            job_id: str, current_user: dict = Depends(get_current_user),
        ):
            job = quality_jobs.cancel(current_user["id"], job_id)
            if job is None:
                raise HTTPException(status_code=404, detail="评估任务不存在")
            return _client_quality_job(job)

        @router.post("/acceptance/content-audit")
        def audit_generated_content(
            body: ContentAuditBody,
            current_user: dict = Depends(get_current_user),
        ):
            try:
                return content_quality.audit(
                    current_user["id"],
                    post_limit=body.post_limit,
                    diary_limit=body.diary_limit,
                    chat_limit=body.chat_limit,
                )
            except ValueError as error:
                raise HTTPException(status_code=400, detail=str(error)) from error

        @router.post("/acceptance/safety-evaluate")
        def evaluate_content_safety(
            current_user: dict = Depends(get_current_user),
        ):
            del current_user  # Authentication required; corpus runs in a temporary DB.
            return content_safety_evaluator.evaluate()

        @router.get("/acceptance/actors/{actor_id}/decisions")
        def inspect_actor_decisions(
            actor_id: str,
            limit: int = Query(default=30, ge=1, le=100),
            current_user: dict = Depends(get_current_user),
        ):
            decisions = service.list_actor_decisions(
                current_user["id"], actor_id, limit=limit
            )
            if decisions is None:
                raise HTTPException(status_code=404, detail="NPC 不存在或未启用")
            return {
                "items": [_debug_actor_decision(item) for item in decisions],
                "count": len(decisions),
            }

        @router.get("/acceptance/actors/{actor_id}/planning")
        def inspect_actor_planning(
            actor_id: str,
            current_user: dict = Depends(get_current_user),
        ):
            planning = service.inspect_actor_planning(current_user["id"], actor_id)
            if planning is None:
                raise HTTPException(status_code=404, detail="NPC 不存在或未启用")
            return {
                "goals": [_debug_actor_goal(item) for item in planning["goals"]],
                "commitments": [
                    _debug_actor_commitment(item) for item in planning["commitments"]
                ],
                "plans": [service.npc_life.plan_manager.client_plan(item) for item in planning["plans"]],
                "invitations": [
                    _debug_interaction_invitation(item)
                    for item in planning["invitations"]
                ],
                "environment": {
                    "weather": planning["environment"]["weather"],
                    "opportunities": [
                        {
                            key: item[key]
                            for key in (
                                "opportunity_id", "opportunity_type", "title",
                                "starts_at", "ends_at", "location_id",
                                "action_type", "tags", "status", "cooldown_key",
                            )
                            if key in item
                        }
                        for item in planning["environment"]["opportunities"]
                    ],
                },
                "decision_context": {
                    "relationships": [
                        {
                            key: item[key]
                            for key in (
                                "other_ai_id", "display_name", "familiarity",
                                "affinity", "trust", "tension",
                                "last_interaction_at",
                            )
                            if key in item
                        }
                        for item in planning["decision_context"]["relationships"]
                    ],
                    "memory_signals": [
                        {
                            key: item[key]
                            for key in (
                                "memory_id", "memory_kind", "source_kind",
                                "confidence", "learned_at",
                            )
                            if key in item
                        }
                        for item in planning["decision_context"]["memory_signals"]
                    ],
                },
                "reflections": [
                    {
                        key: item[key]
                        for key in (
                            "reflection_id", "period_type", "period_start",
                            "period_end", "summary", "source_event_ids",
                            "goal_changes", "memory_changes", "created_at",
                        )
                        if key in item
                    }
                    for item in planning["reflections"]
                ],
                "goal_transitions": [
                    {
                        key: item[key]
                        for key in (
                            "transition_id", "goal_id", "previous_status",
                            "next_status", "reason_code", "public_reason",
                            "evidence_event_ids", "decided_at",
                        )
                        if key in item
                    }
                    for item in planning["goal_transitions"]
                ],
                "llm_calls": [
                    {
                        key: item[key]
                        for key in (
                            "call_id", "actor_id", "decision_at", "state_version",
                            "status", "trigger_reason", "selected_candidate_id",
                            "model", "latency_ms", "input_tokens", "output_tokens",
                            "fallback_reason",
                        )
                        if key in item
                    }
                    for item in planning["llm_calls"]
                ],
            }

    @router.get("/status")
    def get_status(
        ai_id: str = Query(default=DEFAULT_AI_ID),
        current_user: dict = Depends(get_current_user),
    ):
        return _client_status(service.get_status(current_user["id"], ai_id))

    @router.get("/settings")
    def get_settings(
        ai_id: str = Query(default=DEFAULT_AI_ID),
        current_user: dict = Depends(get_current_user),
    ):
        profile = service.get_status(current_user["id"], ai_id, settle=False)["profile"]
        return _client_profile(profile)

    @router.put("/settings")
    def update_settings(
        body: LifeSettingsBody,
        ai_id: str = Query(default=DEFAULT_AI_ID),
        current_user: dict = Depends(get_current_user),
    ):
        try:
            changes = body.model_dump(exclude_none=True)
            profile = service.update_settings(current_user["id"], changes, ai_id)
            return _client_profile(profile)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @router.get("/events")
    def get_events(
        ai_id: str = Query(default=DEFAULT_AI_ID),
        limit: int = Query(default=30, ge=1, le=100),
        before: Optional[str] = Query(default=None),
        since: Optional[str] = Query(default=None),
        min_importance: int = Query(default=0, ge=0, le=100),
        current_user: dict = Depends(get_current_user),
    ):
        try:
            events = service.list_events(
                current_user["id"],
                ai_id,
                limit=limit,
                before=before,
                since=since,
                min_importance=min_importance,
            )
            return {"items": [_client_event(event) for event in events], "count": len(events)}
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @router.get("/arcs")
    def get_story_arcs(
        ai_id: str = Query(default=DEFAULT_AI_ID),
        status: Optional[Literal["active", "completed", "paused"]] = Query(default=None),
        limit: int = Query(default=10, ge=1, le=50),
        current_user: dict = Depends(get_current_user),
    ):
        arcs = service.list_story_arcs(
            current_user["id"],
            ai_id,
            status=status,
            limit=limit,
        )
        return {"items": [_client_story_arc(arc) for arc in arcs], "count": len(arcs)}

    @router.get("/relationships")
    def get_relationships(
        ai_id: str = Query(default=DEFAULT_AI_ID),
        limit: int = Query(default=20, ge=1, le=50),
        current_user: dict = Depends(get_current_user),
    ):
        relationships = service.list_relationships(
            current_user["id"],
            ai_id,
            limit=limit,
        )
        return {
            "items": [_client_relationship(item) for item in relationships],
            "count": len(relationships),
        }

    @router.get("/actors")
    def get_world_actors(
        role: Optional[Literal["lead", "friend", "acquaintance", "background"]] = Query(
            default=None
        ),
        current_user: dict = Depends(get_current_user),
    ):
        actors = service.characters.ensure_world(current_user["id"])
        actors = [actor for actor in actors if actor["status"] == "active"]
        if role:
            actors = [actor for actor in actors if actor["actor_role"] == role]
        merged = [
            service.characters.get_actor(current_user["id"], actor["actor_id"])
            for actor in actors
        ]
        items = [_client_actor(actor) for actor in merged if actor is not None]
        return {"items": items, "count": len(items)}

    @router.get("/actors/{actor_id}/life")
    def get_actor_life(
        actor_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        life = service.get_actor_life(current_user["id"], actor_id)
        if life is None:
            raise HTTPException(status_code=404, detail="NPC 不存在或未启用")
        return {
            "actor": _client_actor(life["actor"]),
            "state": _client_actor_state(life["state"]),
            "schedule": [
                _client_actor_schedule(item) for item in life["schedule"]
            ],
            "intentions": [
                _client_actor_intention(item) for item in life["intentions"]
            ],
        }

    @router.get("/actors/{actor_id}/events")
    def get_actor_events(
        actor_id: str,
        limit: int = Query(default=30, ge=1, le=100),
        before: Optional[str] = Query(default=None),
        since: Optional[str] = Query(default=None),
        min_importance: int = Query(default=0, ge=0, le=100),
        current_user: dict = Depends(get_current_user),
    ):
        try:
            events = service.list_actor_events(
                current_user["id"],
                actor_id,
                limit=limit,
                before=before,
                since=since,
                min_importance=min_importance,
            )
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        if events is None:
            raise HTTPException(status_code=404, detail="NPC 不存在或未启用")
        return {
            "items": [_client_actor_event(event) for event in events],
            "count": len(events),
        }

    @router.get("/actors/{actor_id}/interactions")
    def get_actor_interactions(
        actor_id: str,
        limit: int = Query(default=30, ge=1, le=100),
        before: Optional[str] = Query(default=None),
        since: Optional[str] = Query(default=None),
        min_importance: int = Query(default=0, ge=0, le=100),
        current_user: dict = Depends(get_current_user),
    ):
        try:
            events = service.list_actor_interactions(
                current_user["id"],
                actor_id,
                limit=limit,
                before=before,
                since=since,
                min_importance=min_importance,
            )
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        if events is None:
            raise HTTPException(status_code=404, detail="NPC 不存在或未启用")
        return {
            "items": [_client_interaction_event(event) for event in events],
            "count": len(events),
        }

    @router.get("/actors/{actor_id}/relationships")
    def get_actor_relationships(
        actor_id: str,
        limit: int = Query(default=20, ge=1, le=50),
        current_user: dict = Depends(get_current_user),
    ):
        relationships = service.list_actor_relationships(
            current_user["id"], actor_id, limit=limit
        )
        if relationships is None:
            raise HTTPException(status_code=404, detail="NPC 不存在或未启用")
        return {
            "items": [_client_relationship(item) for item in relationships],
            "count": len(relationships),
        }

    @router.get("/actors/{actor_id}/intentions")
    def get_actor_intentions(
        actor_id: str,
        status: Optional[Literal["active", "completed"]] = Query(default=None),
        limit: int = Query(default=30, ge=1, le=100),
        current_user: dict = Depends(get_current_user),
    ):
        intentions = service.list_actor_intentions(
            current_user["id"],
            actor_id,
            status=status,
            limit=limit,
        )
        if intentions is None:
            raise HTTPException(status_code=404, detail="NPC 不存在或未启用")
        return {
            "items": [_client_actor_intention(item) for item in intentions],
            "count": len(intentions),
        }

    @router.post("/actors/{actor_id}/suggestions")
    def submit_actor_suggestion(
        actor_id: str,
        body: ActorSuggestionBody,
        current_user: dict = Depends(get_current_user),
    ):
        if not body.request_id.strip() or len(body.request_id) > 128:
            raise HTTPException(status_code=400, detail="request_id 无效")
        if len(body.message) > 500:
            raise HTTPException(status_code=400, detail="建议说明不能超过 500 字")
        try:
            suggestion = service.submit_actor_suggestion(
                current_user["id"],
                actor_id,
                suggestion_type=body.suggestion_type,
                request_id=body.request_id.strip(),
                message=body.message,
                target_actor_id=body.target_actor_id,
            )
            return _client_actor_suggestion(suggestion)
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @router.get("/actors/{actor_id}/suggestions")
    def get_actor_suggestions(
        actor_id: str,
        status: Optional[Literal["accepted", "adjusted", "deferred", "declined"]] = Query(default=None),
        limit: int = Query(default=30, ge=1, le=100),
        current_user: dict = Depends(get_current_user),
    ):
        suggestions = service.list_actor_suggestions(
            current_user["id"], actor_id, status=status, limit=limit
        )
        if suggestions is None:
            raise HTTPException(status_code=404, detail="NPC 不存在或未启用")
        return {
            "items": [_client_actor_suggestion(item) for item in suggestions],
            "count": len(suggestions),
        }

    @router.get("/choices")
    def get_story_choices(
        ai_id: str = Query(default=DEFAULT_AI_ID),
        status: Optional[Literal["pending", "resolved", "expired"]] = Query(
            default="pending"
        ),
        limit: int = Query(default=10, ge=1, le=50),
        current_user: dict = Depends(get_current_user),
    ):
        service.get_status(current_user["id"], ai_id)
        if status == "pending":
            choices.materialize_due(current_user["id"], ai_id)
        items = service.store.list_story_choices(
            current_user["id"], ai_id, status=status, limit=limit
        )
        return {"items": [_client_story_choice(item) for item in items], "count": len(items)}

    @router.post("/choices/{choice_id}/resolve")
    def resolve_story_choice(
        choice_id: str,
        body: ResolveChoiceBody,
        ai_id: str = Query(default=DEFAULT_AI_ID),
        current_user: dict = Depends(get_current_user),
    ):
        try:
            result = choices.resolve(
                current_user["id"], choice_id, body.option_id, ai_id
            )
            if result is None:
                raise HTTPException(status_code=404, detail="选择不存在")
            return {
                "choice": _client_story_choice(result["choice"]),
                "intention": _client_intention(result["intention"]),
                "state": _client_state(service.store.get_state(current_user["id"], ai_id)),
            }
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error

    @router.get("/intentions")
    def get_life_intentions(
        ai_id: str = Query(default=DEFAULT_AI_ID),
        status: Optional[
            Literal["active", "deferred", "fulfilled", "abandoned", "expired", "applied"]
        ] = Query(default=None),
        limit: int = Query(default=10, ge=1, le=50),
        current_user: dict = Depends(get_current_user),
    ):
        service.ensure_world(current_user["id"], ai_id)
        service.store.expire_due_intentions(
            current_user["id"], ai_id, now=utc_now()
        )
        items = service.store.list_intentions(
            current_user["id"],
            ai_id,
            statuses=(status,) if status else None,
            limit=limit,
            order="recent",
        )
        return {"items": [_client_intention(item) for item in items], "count": len(items)}

    @router.post("/settle")
    def settle(
        body: SettleBody,
        ai_id: str = Query(default=DEFAULT_AI_ID),
        current_user: dict = Depends(get_current_user),
    ):
        until = parse_datetime(body.until or utc_now())
        if until > utc_now():
            raise HTTPException(status_code=400, detail="不能结算未来时间")
        report = service.settle_due(current_user["id"], ai_id, now=until).as_dict()
        return _client_settlement(report)

    @router.get("/offline-summary")
    def offline_summary(
        ai_id: str = Query(default=DEFAULT_AI_ID),
        since: Optional[str] = Query(default=None),
        current_user: dict = Depends(get_current_user),
    ):
        try:
            summary = service.offline_summary(current_user["id"], ai_id, since=since)
            return _client_offline_summary(summary)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @router.post("/proactive-feedback")
    def proactive_feedback(
        body: ProactiveFeedbackBody,
        ai_id: str = Query(default=DEFAULT_AI_ID),
        current_user: dict = Depends(get_current_user),
    ):
        result = proactive.record_feedback(
            current_user["id"], body.delivery_id, body.reaction, ai_id
        )
        if result is None:
            raise HTTPException(status_code=404, detail="主动分享记录不存在")
        return result

    @router.get("/proactive-status")
    def proactive_status(
        ai_id: str = Query(default=DEFAULT_AI_ID),
        current_user: dict = Depends(get_current_user),
    ):
        last_time, _, _ = database.get_last_interaction(current_user["id"])
        return proactive.inspect_status(current_user["id"], last_time, ai_id)

    return router


life_store = LifeStore(database.DB_PATH)
life_service = LifeSettlementService(life_store)
life_proactive_service = LifeProactiveService(life_store)
life_choice_service = LifeChoiceService(life_store, life_service.characters)
life_chat_context_service = LifeChatContextService(life_service)
life_content_safety_service = ContentSafetyService(
    life_store, life_service.characters
)
router = create_life_router(
    life_service,
    life_proactive_service,
    life_choice_service,
    acceptance_enabled=runtime_settings.settings.environment == "development",
)
