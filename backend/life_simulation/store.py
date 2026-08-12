"""生活模拟的 SQLite 权威存储。"""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

from .clock import parse_datetime
from .models import LifeWindow, RelationshipChange, SimulationResult


DEFAULT_AI_ID = "ai_una"


class LifeStore:
    def __init__(self, database_path: str):
        self.database_path = database_path
        self.init_schema()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def init_schema(self) -> None:
        connection = self._connect()
        try:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS ai_life_profiles (
                    owner_user_id TEXT NOT NULL,
                    ai_id TEXT NOT NULL,
                    display_name TEXT NOT NULL DEFAULT 'UNA',
                    timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
                    simulation_enabled INTEGER NOT NULL DEFAULT 1,
                    activity_level TEXT NOT NULL DEFAULT 'natural',
                    social_posts_enabled INTEGER NOT NULL DEFAULT 1,
                    diaries_enabled INTEGER NOT NULL DEFAULT 1,
                    proactive_messages_enabled INTEGER NOT NULL DEFAULT 0,
                    proactive_frequency TEXT NOT NULL DEFAULT 'natural',
                    major_plot_level TEXT NOT NULL DEFAULT 'ask',
                    profile_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (owner_user_id, ai_id)
                );

                CREATE TABLE IF NOT EXISTS ai_life_states (
                    owner_user_id TEXT NOT NULL,
                    ai_id TEXT NOT NULL,
                    current_location TEXT NOT NULL DEFAULT 'home',
                    current_activity TEXT NOT NULL DEFAULT 'resting',
                    energy INTEGER NOT NULL DEFAULT 72,
                    hunger INTEGER NOT NULL DEFAULT 20,
                    stress INTEGER NOT NULL DEFAULT 25,
                    social_need INTEGER NOT NULL DEFAULT 25,
                    solitude_need INTEGER NOT NULL DEFAULT 20,
                    mood_json TEXT NOT NULL DEFAULT '{}',
                    active_goals_json TEXT NOT NULL DEFAULT '[]',
                    obligations_json TEXT NOT NULL DEFAULT '[]',
                    last_settled_at TEXT NOT NULL,
                    state_version INTEGER NOT NULL DEFAULT 0,
                    simulator_version TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (owner_user_id, ai_id),
                    FOREIGN KEY (owner_user_id, ai_id)
                        REFERENCES ai_life_profiles(owner_user_id, ai_id)
                        ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS ai_life_events (
                    event_id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    world_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    actor_ai_ids_json TEXT NOT NULL,
                    participant_ids_json TEXT NOT NULL DEFAULT '[]',
                    start_at TEXT NOT NULL,
                    end_at TEXT NOT NULL,
                    location_id TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    facts_json TEXT NOT NULL DEFAULT '{}',
                    importance INTEGER NOT NULL,
                    mentionability INTEGER NOT NULL,
                    publicability INTEGER NOT NULL,
                    follow_up_required INTEGER NOT NULL DEFAULT 0,
                    story_arc_id TEXT,
                    parent_event_id TEXT,
                    idempotency_key TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_ai_life_events_owner_time
                    ON ai_life_events(owner_user_id, end_at DESC);
                CREATE INDEX IF NOT EXISTS idx_ai_life_events_owner_importance
                    ON ai_life_events(owner_user_id, importance DESC, end_at DESC);

                CREATE TABLE IF NOT EXISTS ai_event_perspectives (
                    event_id TEXT NOT NULL,
                    owner_user_id TEXT NOT NULL,
                    ai_id TEXT NOT NULL,
                    knowledge_source TEXT NOT NULL DEFAULT 'firsthand',
                    confidence INTEGER NOT NULL DEFAULT 100,
                    interpretation TEXT NOT NULL DEFAULT '',
                    emotion_delta_json TEXT NOT NULL DEFAULT '{}',
                    private_thought TEXT NOT NULL DEFAULT '',
                    disclosure_level TEXT NOT NULL DEFAULT 'familiar',
                    learned_at TEXT NOT NULL,
                    evidence_refs_json TEXT NOT NULL DEFAULT '[]',
                    PRIMARY KEY (event_id, ai_id),
                    FOREIGN KEY (event_id) REFERENCES ai_life_events(event_id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS ai_story_arcs (
                    story_arc_id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    lead_ai_id TEXT NOT NULL DEFAULT 'ai_una',
                    arc_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    status TEXT NOT NULL,
                    stage TEXT NOT NULL,
                    stage_version INTEGER NOT NULL DEFAULT 0,
                    participant_ai_ids_json TEXT NOT NULL DEFAULT '[]',
                    state_json TEXT NOT NULL DEFAULT '{}',
                    impact_level TEXT NOT NULL DEFAULT 'ordinary',
                    started_at TEXT NOT NULL,
                    last_advanced_at TEXT NOT NULL,
                    completed_at TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_ai_story_arcs_owner_status
                    ON ai_story_arcs(owner_user_id, status, last_advanced_at DESC);

                CREATE TABLE IF NOT EXISTS ai_relationships (
                    owner_user_id TEXT NOT NULL,
                    ai_id TEXT NOT NULL,
                    other_ai_id TEXT NOT NULL,
                    display_name TEXT NOT NULL DEFAULT '',
                    familiarity INTEGER NOT NULL DEFAULT 0,
                    affinity INTEGER NOT NULL DEFAULT 0,
                    trust INTEGER NOT NULL DEFAULT 0,
                    tension INTEGER NOT NULL DEFAULT 0,
                    obligation INTEGER NOT NULL DEFAULT 0,
                    evidence_event_ids_json TEXT NOT NULL DEFAULT '[]',
                    private_summary TEXT NOT NULL DEFAULT '',
                    last_interaction_at TEXT,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (owner_user_id, ai_id, other_ai_id)
                );

                CREATE TABLE IF NOT EXISTS ai_memory_entries (
                    memory_id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    ai_id TEXT NOT NULL,
                    event_id TEXT,
                    memory_kind TEXT NOT NULL,
                    content TEXT NOT NULL,
                    source_kind TEXT NOT NULL,
                    confidence INTEGER NOT NULL,
                    state TEXT NOT NULL,
                    disclosure_level TEXT NOT NULL,
                    metadata_json TEXT NOT NULL DEFAULT '{}',
                    learned_at TEXT NOT NULL,
                    revised_at TEXT,
                    FOREIGN KEY (event_id) REFERENCES ai_life_events(event_id) ON DELETE SET NULL
                );

                CREATE INDEX IF NOT EXISTS idx_ai_memory_entries_owner_ai_time
                    ON ai_memory_entries(owner_user_id, ai_id, learned_at DESC);

                CREATE TABLE IF NOT EXISTS ai_life_jobs (
                    job_id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    ai_id TEXT NOT NULL,
                    job_type TEXT NOT NULL,
                    idempotency_key TEXT NOT NULL UNIQUE,
                    status TEXT NOT NULL,
                    scheduled_at TEXT NOT NULL,
                    started_at TEXT,
                    finished_at TEXT,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    error_text TEXT,
                    payload_json TEXT NOT NULL DEFAULT '{}'
                );

                CREATE TABLE IF NOT EXISTS ai_life_proactive_deliveries (
                    delivery_id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    ai_id TEXT NOT NULL,
                    source_event_id TEXT NOT NULL,
                    channel TEXT NOT NULL DEFAULT 'websocket',
                    status TEXT NOT NULL,
                    topic TEXT NOT NULL DEFAULT 'daily_life',
                    message_text TEXT NOT NULL,
                    claimed_at TEXT NOT NULL,
                    delivered_at TEXT,
                    attempts INTEGER NOT NULL DEFAULT 1,
                    last_error TEXT,
                    UNIQUE (owner_user_id, ai_id, source_event_id, channel),
                    FOREIGN KEY (source_event_id)
                        REFERENCES ai_life_events(event_id)
                        ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_ai_life_proactive_owner_time
                    ON ai_life_proactive_deliveries(
                        owner_user_id, ai_id, delivered_at DESC, claimed_at DESC
                    );

                CREATE TABLE IF NOT EXISTS ai_life_proactive_feedback (
                    feedback_id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    ai_id TEXT NOT NULL,
                    delivery_id TEXT NOT NULL UNIQUE,
                    source_event_id TEXT NOT NULL,
                    topic TEXT NOT NULL,
                    reaction TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (delivery_id)
                        REFERENCES ai_life_proactive_deliveries(delivery_id)
                        ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS ai_life_topic_preferences (
                    owner_user_id TEXT NOT NULL,
                    ai_id TEXT NOT NULL,
                    topic TEXT NOT NULL,
                    score INTEGER NOT NULL DEFAULT 0,
                    positive_count INTEGER NOT NULL DEFAULT 0,
                    negative_count INTEGER NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (owner_user_id, ai_id, topic)
                );

                CREATE TABLE IF NOT EXISTS ai_story_choices (
                    choice_id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    ai_id TEXT NOT NULL,
                    source_kind TEXT NOT NULL,
                    source_id TEXT NOT NULL,
                    choice_type TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    context_text TEXT NOT NULL DEFAULT '',
                    options_json TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    selected_option_id TEXT,
                    resolution_text TEXT,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    resolved_at TEXT,
                    idempotency_key TEXT NOT NULL UNIQUE,
                    FOREIGN KEY (owner_user_id, ai_id)
                        REFERENCES ai_life_profiles(owner_user_id, ai_id)
                        ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_ai_story_choices_owner_status
                    ON ai_story_choices(owner_user_id, ai_id, status, created_at DESC);
                CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_story_choices_one_pending
                    ON ai_story_choices(owner_user_id, ai_id)
                    WHERE status = 'pending';

                CREATE TABLE IF NOT EXISTS ai_life_intentions (
                    intention_id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    ai_id TEXT NOT NULL,
                    choice_id TEXT NOT NULL UNIQUE,
                    intention_type TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    effect_json TEXT NOT NULL DEFAULT '{}',
                    status TEXT NOT NULL DEFAULT 'active',
                    priority INTEGER NOT NULL DEFAULT 50,
                    earliest_at TEXT,
                    deadline_at TEXT,
                    conditions_json TEXT NOT NULL DEFAULT '{}',
                    attempt_count INTEGER NOT NULL DEFAULT 0,
                    last_attempt_at TEXT,
                    resolution_reason TEXT,
                    created_at TEXT NOT NULL,
                    applied_at TEXT,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (choice_id) REFERENCES ai_story_choices(choice_id)
                        ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_ai_life_intentions_owner_status
                    ON ai_life_intentions(owner_user_id, ai_id, status, created_at DESC);

                CREATE TABLE IF NOT EXISTS ai_life_schema_migrations (
                    version INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    applied_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS ai_life_acceptance_controls (
                    owner_user_id TEXT PRIMARY KEY,
                    seed TEXT NOT NULL,
                    virtual_now TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS ai_actor_profiles (
                    owner_user_id TEXT NOT NULL,
                    actor_id TEXT NOT NULL,
                    definition_key TEXT NOT NULL,
                    actor_role TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    display_name_override TEXT,
                    status TEXT NOT NULL DEFAULT 'active',
                    introduced_at TEXT NOT NULL,
                    disabled_at TEXT,
                    definition_version INTEGER NOT NULL DEFAULT 1,
                    profile_overrides_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (owner_user_id, actor_id)
                );

                CREATE INDEX IF NOT EXISTS idx_ai_actor_profiles_owner_role
                    ON ai_actor_profiles(owner_user_id, actor_role, status);

                CREATE TABLE IF NOT EXISTS ai_actor_states (
                    owner_user_id TEXT NOT NULL,
                    actor_id TEXT NOT NULL,
                    current_location TEXT NOT NULL DEFAULT 'home',
                    current_activity TEXT NOT NULL DEFAULT 'resting',
                    energy INTEGER NOT NULL DEFAULT 70,
                    hunger INTEGER NOT NULL DEFAULT 24,
                    stress INTEGER NOT NULL DEFAULT 24,
                    social_need INTEGER NOT NULL DEFAULT 28,
                    solitude_need INTEGER NOT NULL DEFAULT 22,
                    mood_json TEXT NOT NULL DEFAULT '{}',
                    active_goals_json TEXT NOT NULL DEFAULT '[]',
                    last_settled_at TEXT NOT NULL,
                    state_version INTEGER NOT NULL DEFAULT 0,
                    simulator_version TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (owner_user_id, actor_id),
                    FOREIGN KEY (owner_user_id, actor_id)
                        REFERENCES ai_actor_profiles(owner_user_id, actor_id)
                        ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS ai_actor_schedules (
                    schedule_id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    actor_id TEXT NOT NULL,
                    window_key TEXT NOT NULL,
                    activity_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    location_id TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    starts_at TEXT NOT NULL,
                    ends_at TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'planned',
                    plan_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE (owner_user_id, actor_id, starts_at, window_key),
                    FOREIGN KEY (owner_user_id, actor_id)
                        REFERENCES ai_actor_profiles(owner_user_id, actor_id)
                        ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_ai_actor_schedules_owner_actor_time
                    ON ai_actor_schedules(owner_user_id, actor_id, starts_at ASC);

                CREATE TABLE IF NOT EXISTS ai_actor_events (
                    event_id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    actor_id TEXT NOT NULL,
                    schedule_id TEXT,
                    event_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    start_at TEXT NOT NULL,
                    end_at TEXT NOT NULL,
                    location_id TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    facts_json TEXT NOT NULL DEFAULT '{}',
                    importance INTEGER NOT NULL,
                    mentionability INTEGER NOT NULL,
                    publicability INTEGER NOT NULL,
                    interpretation TEXT NOT NULL DEFAULT '',
                    private_thought TEXT NOT NULL DEFAULT '',
                    disclosure_level TEXT NOT NULL DEFAULT 'familiar',
                    idempotency_key TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (owner_user_id, actor_id)
                        REFERENCES ai_actor_profiles(owner_user_id, actor_id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (schedule_id)
                        REFERENCES ai_actor_schedules(schedule_id)
                        ON DELETE SET NULL
                );

                CREATE INDEX IF NOT EXISTS idx_ai_actor_events_owner_actor_time
                    ON ai_actor_events(owner_user_id, actor_id, end_at DESC);

                CREATE TABLE IF NOT EXISTS ai_interaction_events (
                    event_id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    start_at TEXT NOT NULL,
                    end_at TEXT NOT NULL,
                    location_id TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    facts_json TEXT NOT NULL DEFAULT '{}',
                    importance INTEGER NOT NULL,
                    mentionability INTEGER NOT NULL,
                    publicability INTEGER NOT NULL,
                    idempotency_key TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_ai_interaction_events_owner_time
                    ON ai_interaction_events(owner_user_id, end_at DESC);

                CREATE TABLE IF NOT EXISTS ai_interaction_participants (
                    event_id TEXT NOT NULL,
                    owner_user_id TEXT NOT NULL,
                    actor_id TEXT NOT NULL,
                    participant_role TEXT NOT NULL DEFAULT 'participant',
                    PRIMARY KEY (event_id, actor_id),
                    FOREIGN KEY (event_id)
                        REFERENCES ai_interaction_events(event_id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_ai_interaction_participants_actor
                    ON ai_interaction_participants(owner_user_id, actor_id, event_id);

                CREATE TABLE IF NOT EXISTS ai_interaction_perspectives (
                    event_id TEXT NOT NULL,
                    owner_user_id TEXT NOT NULL,
                    actor_id TEXT NOT NULL,
                    knowledge_source TEXT NOT NULL DEFAULT 'firsthand',
                    confidence INTEGER NOT NULL DEFAULT 100,
                    interpretation TEXT NOT NULL DEFAULT '',
                    emotion_delta_json TEXT NOT NULL DEFAULT '{}',
                    private_thought TEXT NOT NULL DEFAULT '',
                    disclosure_level TEXT NOT NULL DEFAULT 'familiar',
                    learned_at TEXT NOT NULL,
                    PRIMARY KEY (event_id, actor_id),
                    FOREIGN KEY (event_id)
                        REFERENCES ai_interaction_events(event_id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS ai_actor_intentions (
                    intention_instance_id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    actor_id TEXT NOT NULL,
                    template_id TEXT NOT NULL,
                    driver TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'active',
                    summary TEXT NOT NULL,
                    motivation TEXT NOT NULL DEFAULT '',
                    target_actor_id TEXT,
                    score INTEGER NOT NULL,
                    source_state_version INTEGER NOT NULL,
                    decision_context_json TEXT NOT NULL DEFAULT '{}',
                    action_json TEXT NOT NULL DEFAULT '{}',
                    formed_at TEXT NOT NULL,
                    earliest_at TEXT NOT NULL,
                    deadline_at TEXT NOT NULL,
                    resolved_at TEXT,
                    outcome_event_id TEXT,
                    decision_key TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (owner_user_id, actor_id)
                        REFERENCES ai_actor_profiles(owner_user_id, actor_id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (outcome_event_id)
                        REFERENCES ai_actor_events(event_id) ON DELETE SET NULL
                );

                CREATE INDEX IF NOT EXISTS idx_ai_actor_intentions_owner_actor_time
                    ON ai_actor_intentions(
                        owner_user_id, actor_id, status, formed_at DESC
                    );
                CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_actor_intentions_one_active
                    ON ai_actor_intentions(owner_user_id, actor_id)
                    WHERE status = 'active';

                CREATE TABLE IF NOT EXISTS ai_actor_suggestions (
                    suggestion_id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    actor_id TEXT NOT NULL,
                    suggestion_type TEXT NOT NULL,
                    message TEXT NOT NULL DEFAULT '',
                    target_actor_id TEXT,
                    status TEXT NOT NULL,
                    decision_reason_code TEXT NOT NULL,
                    response_text TEXT NOT NULL,
                    evaluation_json TEXT NOT NULL DEFAULT '{}',
                    linked_intention_id TEXT,
                    reevaluate_after TEXT,
                    idempotency_key TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (owner_user_id, actor_id)
                        REFERENCES ai_actor_profiles(owner_user_id, actor_id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (linked_intention_id)
                        REFERENCES ai_actor_intentions(intention_instance_id)
                        ON DELETE SET NULL
                );

                CREATE INDEX IF NOT EXISTS idx_ai_actor_suggestions_owner_actor_time
                    ON ai_actor_suggestions(
                        owner_user_id, actor_id, status, created_at DESC
                    );
                """
            )
            self._record_schema_baseline(connection)
            self._apply_schema_migration(
                connection,
                2,
                "life_table_compatibility",
                self._extend_life_tables,
            )
            self._apply_schema_migration(
                connection,
                3,
                "expression_source_tracking",
                self._extend_expression_tables,
            )
            self._apply_schema_migration(
                connection,
                4,
                "intention_lifecycle",
                self._extend_intention_tables,
            )
            self._apply_schema_migration(
                connection,
                5,
                "character_profiles",
                self._extend_actor_profile_tables,
            )
            self._apply_schema_migration(
                connection,
                6,
                "npc_autonomous_life_v1",
                self._extend_npc_life_tables,
            )
            self._apply_schema_migration(
                connection,
                7,
                "npc_relationship_interactions_v1",
                self._extend_interaction_tables,
            )
            self._apply_schema_migration(
                connection,
                8,
                "npc_intentions_decisions_v1",
                self._extend_actor_intention_tables,
            )
            self._apply_schema_migration(
                connection,
                9,
                "npc_user_suggestions_agency_v1",
                self._extend_actor_suggestion_tables,
            )
            self._apply_schema_migration(
                connection,
                10,
                "npc_acceptance_tools_v1",
                self._extend_acceptance_control_tables,
            )
            self._apply_schema_migration(
                connection,
                11,
                "unified_content_evidence_v1",
                self._extend_content_evidence_tables,
            )
            connection.commit()
        finally:
            connection.close()

    @staticmethod
    def _table_exists(connection: sqlite3.Connection, table: str) -> bool:
        return connection.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (table,)
        ).fetchone() is not None

    @staticmethod
    def _column_names(connection: sqlite3.Connection, table: str) -> set[str]:
        return {row[1] for row in connection.execute(f"PRAGMA table_info({table})").fetchall()}

    @staticmethod
    def _record_schema_baseline(connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            INSERT OR IGNORE INTO ai_life_schema_migrations
                (version, name, applied_at)
            VALUES (1, 'life_core_baseline', ?)
            """,
            (datetime.now(timezone.utc).isoformat(),),
        )

    @staticmethod
    def _extend_acceptance_control_tables(connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_life_acceptance_controls (
                owner_user_id TEXT PRIMARY KEY,
                seed TEXT NOT NULL,
                virtual_now TEXT NOT NULL,
                started_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

    def _extend_content_evidence_tables(self, connection: sqlite3.Connection) -> None:
        for table in ("chat_history", "una_posts", "una_diary"):
            if not self._table_exists(connection, table):
                continue
            if "content_evidence_json" not in self._column_names(connection, table):
                connection.execute(
                    f"ALTER TABLE {table} ADD COLUMN "
                    "content_evidence_json TEXT NOT NULL DEFAULT '{}'"
                )

    @staticmethod
    def _apply_schema_migration(
        connection: sqlite3.Connection,
        version: int,
        name: str,
        action: Callable[[sqlite3.Connection], None],
    ) -> None:
        exists = connection.execute(
            "SELECT 1 FROM ai_life_schema_migrations WHERE version = ?",
            (version,),
        ).fetchone()
        if exists:
            return
        action(connection)
        connection.execute(
            """
            INSERT INTO ai_life_schema_migrations (version, name, applied_at)
            VALUES (?, ?, ?)
            """,
            (version, name, datetime.now(timezone.utc).isoformat()),
        )

    def _extend_expression_tables(self, connection: sqlite3.Connection) -> None:
        additions = {
            "una_diary": {
                "author_ai_id": "TEXT NOT NULL DEFAULT 'ai_una'",
                "source_event_ids": "TEXT NOT NULL DEFAULT '[]'",
                "life_world_date": "TEXT",
                "visibility_level": "TEXT NOT NULL DEFAULT 'private'",
                "generation_reason": "TEXT",
                "idempotency_key": "TEXT",
            },
            "una_posts": {
                "source_event_ids": "TEXT NOT NULL DEFAULT '[]'",
                "life_world_time": "TEXT",
                "generation_reason": "TEXT",
                "idempotency_key": "TEXT",
                "deleted_at": "TEXT",
            },
        }
        for table, columns in additions.items():
            if not self._table_exists(connection, table):
                continue
            existing = self._column_names(connection, table)
            for name, definition in columns.items():
                if name not in existing:
                    connection.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")
            connection.execute(
                f"CREATE UNIQUE INDEX IF NOT EXISTS idx_{table}_life_idempotency "
                f"ON {table}(idempotency_key) WHERE idempotency_key IS NOT NULL"
            )

    def _extend_life_tables(self, connection: sqlite3.Connection) -> None:
        additions = {
            "ai_life_profiles": {
                "proactive_frequency": "TEXT NOT NULL DEFAULT 'natural'",
            },
            "ai_story_arcs": {"lead_ai_id": "TEXT NOT NULL DEFAULT 'ai_una'"},
            "ai_relationships": {"display_name": "TEXT NOT NULL DEFAULT ''"},
            "ai_life_proactive_deliveries": {
                "topic": "TEXT NOT NULL DEFAULT 'daily_life'",
                "attempts": "INTEGER NOT NULL DEFAULT 1",
                "last_error": "TEXT",
            },
        }
        for table, columns in additions.items():
            existing = self._column_names(connection, table)
            for name, definition in columns.items():
                if name not in existing:
                    connection.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_ai_story_arcs_owner_lead_status "
            "ON ai_story_arcs(owner_user_id, lead_ai_id, status, last_advanced_at DESC)"
        )

    def _extend_intention_tables(self, connection: sqlite3.Connection) -> None:
        additions = {
            "priority": "INTEGER NOT NULL DEFAULT 50",
            "earliest_at": "TEXT",
            "deadline_at": "TEXT",
            "conditions_json": "TEXT NOT NULL DEFAULT '{}'",
            "attempt_count": "INTEGER NOT NULL DEFAULT 0",
            "last_attempt_at": "TEXT",
            "resolution_reason": "TEXT",
            "updated_at": "TEXT",
        }
        existing = self._column_names(connection, "ai_life_intentions")
        for name, definition in additions.items():
            if name not in existing:
                connection.execute(
                    f"ALTER TABLE ai_life_intentions ADD COLUMN {name} {definition}"
                )
        connection.execute(
            """
            UPDATE ai_life_intentions
            SET updated_at = COALESCE(updated_at, created_at)
            WHERE updated_at IS NULL
            """
        )

    @staticmethod
    def _extend_actor_profile_tables(connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_actor_profiles (
                owner_user_id TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                definition_key TEXT NOT NULL,
                actor_role TEXT NOT NULL,
                display_name TEXT NOT NULL,
                display_name_override TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                introduced_at TEXT NOT NULL,
                disabled_at TEXT,
                definition_version INTEGER NOT NULL DEFAULT 1,
                profile_overrides_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (owner_user_id, actor_id)
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_actor_profiles_owner_role
            ON ai_actor_profiles(owner_user_id, actor_role, status)
            """
        )

    @staticmethod
    def _extend_npc_life_tables(connection: sqlite3.Connection) -> None:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS ai_actor_states (
                owner_user_id TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                current_location TEXT NOT NULL DEFAULT 'home',
                current_activity TEXT NOT NULL DEFAULT 'resting',
                energy INTEGER NOT NULL DEFAULT 70,
                hunger INTEGER NOT NULL DEFAULT 24,
                stress INTEGER NOT NULL DEFAULT 24,
                social_need INTEGER NOT NULL DEFAULT 28,
                solitude_need INTEGER NOT NULL DEFAULT 22,
                mood_json TEXT NOT NULL DEFAULT '{}',
                active_goals_json TEXT NOT NULL DEFAULT '[]',
                last_settled_at TEXT NOT NULL,
                state_version INTEGER NOT NULL DEFAULT 0,
                simulator_version TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (owner_user_id, actor_id),
                FOREIGN KEY (owner_user_id, actor_id)
                    REFERENCES ai_actor_profiles(owner_user_id, actor_id)
                    ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS ai_actor_schedules (
                schedule_id TEXT PRIMARY KEY,
                owner_user_id TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                window_key TEXT NOT NULL,
                activity_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                location_id TEXT NOT NULL,
                summary TEXT NOT NULL,
                starts_at TEXT NOT NULL,
                ends_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'planned',
                plan_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (owner_user_id, actor_id, starts_at, window_key),
                FOREIGN KEY (owner_user_id, actor_id)
                    REFERENCES ai_actor_profiles(owner_user_id, actor_id)
                    ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_ai_actor_schedules_owner_actor_time
                ON ai_actor_schedules(owner_user_id, actor_id, starts_at ASC);

            CREATE TABLE IF NOT EXISTS ai_actor_events (
                event_id TEXT PRIMARY KEY,
                owner_user_id TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                schedule_id TEXT,
                event_type TEXT NOT NULL,
                status TEXT NOT NULL,
                start_at TEXT NOT NULL,
                end_at TEXT NOT NULL,
                location_id TEXT NOT NULL,
                summary TEXT NOT NULL,
                facts_json TEXT NOT NULL DEFAULT '{}',
                importance INTEGER NOT NULL,
                mentionability INTEGER NOT NULL,
                publicability INTEGER NOT NULL,
                interpretation TEXT NOT NULL DEFAULT '',
                private_thought TEXT NOT NULL DEFAULT '',
                disclosure_level TEXT NOT NULL DEFAULT 'familiar',
                idempotency_key TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                FOREIGN KEY (owner_user_id, actor_id)
                    REFERENCES ai_actor_profiles(owner_user_id, actor_id)
                    ON DELETE CASCADE,
                FOREIGN KEY (schedule_id)
                    REFERENCES ai_actor_schedules(schedule_id)
                    ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_ai_actor_events_owner_actor_time
                ON ai_actor_events(owner_user_id, actor_id, end_at DESC);
            """
        )

    @staticmethod
    def _extend_interaction_tables(connection: sqlite3.Connection) -> None:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS ai_interaction_events (
                event_id TEXT PRIMARY KEY,
                owner_user_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                status TEXT NOT NULL,
                start_at TEXT NOT NULL,
                end_at TEXT NOT NULL,
                location_id TEXT NOT NULL,
                summary TEXT NOT NULL,
                facts_json TEXT NOT NULL DEFAULT '{}',
                importance INTEGER NOT NULL,
                mentionability INTEGER NOT NULL,
                publicability INTEGER NOT NULL,
                idempotency_key TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_ai_interaction_events_owner_time
                ON ai_interaction_events(owner_user_id, end_at DESC);

            CREATE TABLE IF NOT EXISTS ai_interaction_participants (
                event_id TEXT NOT NULL,
                owner_user_id TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                participant_role TEXT NOT NULL DEFAULT 'participant',
                PRIMARY KEY (event_id, actor_id),
                FOREIGN KEY (event_id)
                    REFERENCES ai_interaction_events(event_id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_ai_interaction_participants_actor
                ON ai_interaction_participants(owner_user_id, actor_id, event_id);

            CREATE TABLE IF NOT EXISTS ai_interaction_perspectives (
                event_id TEXT NOT NULL,
                owner_user_id TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                knowledge_source TEXT NOT NULL DEFAULT 'firsthand',
                confidence INTEGER NOT NULL DEFAULT 100,
                interpretation TEXT NOT NULL DEFAULT '',
                emotion_delta_json TEXT NOT NULL DEFAULT '{}',
                private_thought TEXT NOT NULL DEFAULT '',
                disclosure_level TEXT NOT NULL DEFAULT 'familiar',
                learned_at TEXT NOT NULL,
                PRIMARY KEY (event_id, actor_id),
                FOREIGN KEY (event_id)
                    REFERENCES ai_interaction_events(event_id) ON DELETE CASCADE
            );
            """
        )

    @staticmethod
    def _extend_actor_intention_tables(connection: sqlite3.Connection) -> None:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS ai_actor_intentions (
                intention_instance_id TEXT PRIMARY KEY,
                owner_user_id TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                template_id TEXT NOT NULL,
                driver TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                summary TEXT NOT NULL,
                motivation TEXT NOT NULL DEFAULT '',
                target_actor_id TEXT,
                score INTEGER NOT NULL,
                source_state_version INTEGER NOT NULL,
                decision_context_json TEXT NOT NULL DEFAULT '{}',
                action_json TEXT NOT NULL DEFAULT '{}',
                formed_at TEXT NOT NULL,
                earliest_at TEXT NOT NULL,
                deadline_at TEXT NOT NULL,
                resolved_at TEXT,
                outcome_event_id TEXT,
                decision_key TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (owner_user_id, actor_id)
                    REFERENCES ai_actor_profiles(owner_user_id, actor_id)
                    ON DELETE CASCADE,
                FOREIGN KEY (outcome_event_id)
                    REFERENCES ai_actor_events(event_id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_ai_actor_intentions_owner_actor_time
                ON ai_actor_intentions(
                    owner_user_id, actor_id, status, formed_at DESC
                );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_actor_intentions_one_active
                ON ai_actor_intentions(owner_user_id, actor_id)
                WHERE status = 'active';
            """
        )

    @staticmethod
    def _extend_actor_suggestion_tables(connection: sqlite3.Connection) -> None:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS ai_actor_suggestions (
                suggestion_id TEXT PRIMARY KEY,
                owner_user_id TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                suggestion_type TEXT NOT NULL,
                message TEXT NOT NULL DEFAULT '',
                target_actor_id TEXT,
                status TEXT NOT NULL,
                decision_reason_code TEXT NOT NULL,
                response_text TEXT NOT NULL,
                evaluation_json TEXT NOT NULL DEFAULT '{}',
                linked_intention_id TEXT,
                reevaluate_after TEXT,
                idempotency_key TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (owner_user_id, actor_id)
                    REFERENCES ai_actor_profiles(owner_user_id, actor_id)
                    ON DELETE CASCADE,
                FOREIGN KEY (linked_intention_id)
                    REFERENCES ai_actor_intentions(intention_instance_id)
                    ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_ai_actor_suggestions_owner_actor_time
                ON ai_actor_suggestions(
                    owner_user_id, actor_id, status, created_at DESC
                );
            """
        )
    def ensure_world(
        self,
        owner_user_id: str,
        ai_id: str,
        now: datetime,
        simulator_version: str,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        now_iso = now.isoformat()
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            connection.execute(
                """
                INSERT OR IGNORE INTO ai_life_profiles
                    (owner_user_id, ai_id, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                """,
                (owner_user_id, ai_id, now_iso, now_iso),
            )
            connection.execute(
                """
                INSERT OR IGNORE INTO ai_life_states
                    (owner_user_id, ai_id, last_settled_at, simulator_version, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (owner_user_id, ai_id, now_iso, simulator_version, now_iso),
            )
            connection.commit()
        finally:
            connection.close()
        return self.get_profile(owner_user_id, ai_id), self.get_state(owner_user_id, ai_id)

    def get_profile(self, owner_user_id: str, ai_id: str = DEFAULT_AI_ID) -> Optional[dict[str, Any]]:
        connection = self._connect()
        try:
            row = connection.execute(
                "SELECT * FROM ai_life_profiles WHERE owner_user_id = ? AND ai_id = ?",
                (owner_user_id, ai_id),
            ).fetchone()
            return self._decode_profile(row) if row else None
        finally:
            connection.close()

    def get_state(self, owner_user_id: str, ai_id: str = DEFAULT_AI_ID) -> Optional[dict[str, Any]]:
        connection = self._connect()
        try:
            row = connection.execute(
                "SELECT * FROM ai_life_states WHERE owner_user_id = ? AND ai_id = ?",
                (owner_user_id, ai_id),
            ).fetchone()
            return self._decode_state(row) if row else None
        finally:
            connection.close()

    def update_settings(self, owner_user_id: str, ai_id: str, changes: dict[str, Any], now: datetime) -> dict[str, Any]:
        allowed = {
            "timezone",
            "simulation_enabled",
            "activity_level",
            "social_posts_enabled",
            "diaries_enabled",
            "proactive_messages_enabled",
            "proactive_frequency",
            "major_plot_level",
        }
        fields = {key: value for key, value in changes.items() if key in allowed}
        if not fields:
            profile = self.get_profile(owner_user_id, ai_id)
            if profile is None:
                raise KeyError("生活世界不存在")
            return profile
        for key in (
            "simulation_enabled",
            "social_posts_enabled",
            "diaries_enabled",
            "proactive_messages_enabled",
        ):
            if key in fields:
                fields[key] = int(bool(fields[key]))
        assignments = ", ".join(f"{key} = ?" for key in fields)
        values = list(fields.values())
        connection = self._connect()
        try:
            connection.execute(
                f"UPDATE ai_life_profiles SET {assignments}, updated_at = ? "
                "WHERE owner_user_id = ? AND ai_id = ?",
                (*values, now.isoformat(), owner_user_id, ai_id),
            )
            connection.commit()
        finally:
            connection.close()
        profile = self.get_profile(owner_user_id, ai_id)
        if profile is None:
            raise KeyError("生活世界不存在")
        return profile

    def list_enabled_worlds(self) -> list[tuple[str, str]]:
        connection = self._connect()
        try:
            rows = connection.execute(
                "SELECT owner_user_id, ai_id FROM ai_life_profiles WHERE simulation_enabled = 1"
            ).fetchall()
            return [(row[0], row[1]) for row in rows]
        finally:
            connection.close()

    def ensure_actor_profile(
        self,
        owner_user_id: str,
        *,
        actor_id: str,
        definition_key: str,
        actor_role: str,
        display_name: str,
        definition_version: int,
        now: datetime,
        status: str = "active",
    ) -> dict[str, Any]:
        if status not in {"active", "disabled"}:
            raise ValueError("角色档案状态必须是 active 或 disabled")
        now_iso = now.isoformat()
        disabled_at = now_iso if status == "disabled" else None
        connection = self._connect()
        try:
            connection.execute(
                """
                INSERT OR IGNORE INTO ai_actor_profiles (
                    owner_user_id, actor_id, definition_key, actor_role,
                    display_name, status, introduced_at, disabled_at,
                    definition_version, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    owner_user_id,
                    actor_id,
                    definition_key,
                    actor_role,
                    display_name,
                    status,
                    now_iso,
                    disabled_at,
                    definition_version,
                    now_iso,
                    now_iso,
                ),
            )
            connection.execute(
                """
                UPDATE ai_actor_profiles
                SET definition_key = ?, actor_role = ?,
                    display_name = CASE
                        WHEN display_name_override IS NULL OR display_name_override = ''
                        THEN ? ELSE display_name END,
                    status = ?,
                    disabled_at = CASE
                        WHEN ? = 'active' THEN NULL
                        ELSE COALESCE(disabled_at, ?)
                    END,
                    definition_version = ?, updated_at = ?
                WHERE owner_user_id = ? AND actor_id = ?
                """,
                (
                    definition_key,
                    actor_role,
                    display_name,
                    status,
                    status,
                    now_iso,
                    definition_version,
                    now_iso,
                    owner_user_id,
                    actor_id,
                ),
            )
            connection.commit()
        finally:
            connection.close()
        profile = self.get_actor_profile(owner_user_id, actor_id)
        if profile is None:
            raise RuntimeError("角色档案写入失败")
        return profile

    def get_actor_profile(
        self, owner_user_id: str, actor_id: str
    ) -> Optional[dict[str, Any]]:
        connection = self._connect()
        try:
            row = connection.execute(
                """
                SELECT * FROM ai_actor_profiles
                WHERE owner_user_id = ? AND actor_id = ?
                """,
                (owner_user_id, actor_id),
            ).fetchone()
            return self._decode_actor_profile(row) if row else None
        finally:
            connection.close()

    def list_actor_profiles(
        self,
        owner_user_id: str,
        *,
        actor_role: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        clauses = ["owner_user_id = ?"]
        params: list[Any] = [owner_user_id]
        if actor_role:
            clauses.append("actor_role = ?")
            params.append(actor_role)
        if status:
            clauses.append("status = ?")
            params.append(status)
        connection = self._connect()
        try:
            rows = connection.execute(
                f"SELECT * FROM ai_actor_profiles WHERE {' AND '.join(clauses)} "
                "ORDER BY introduced_at ASC, actor_id ASC",
                params,
            ).fetchall()
            return [self._decode_actor_profile(row) for row in rows]
        finally:
            connection.close()

    def canonicalize_relationship_aliases(
        self,
        owner_user_id: str,
        aliases: dict[str, str],
        *,
        now: datetime,
    ) -> int:
        """Merge legacy contact IDs using a config-provided alias map."""

        if not aliases:
            return 0
        changed = 0
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            for legacy_id, canonical_id in aliases.items():
                legacy_rows = connection.execute(
                    """
                    SELECT * FROM ai_relationships
                    WHERE owner_user_id = ? AND other_ai_id = ?
                    """,
                    (owner_user_id, legacy_id),
                ).fetchall()
                for legacy_row in legacy_rows:
                    legacy = dict(legacy_row)
                    current_row = connection.execute(
                        """
                        SELECT * FROM ai_relationships
                        WHERE owner_user_id = ? AND ai_id = ? AND other_ai_id = ?
                        """,
                        (owner_user_id, legacy["ai_id"], canonical_id),
                    ).fetchone()
                    if current_row is None:
                        connection.execute(
                            """
                            UPDATE ai_relationships SET other_ai_id = ?, updated_at = ?
                            WHERE owner_user_id = ? AND ai_id = ? AND other_ai_id = ?
                            """,
                            (
                                canonical_id,
                                now.isoformat(),
                                owner_user_id,
                                legacy["ai_id"],
                                legacy_id,
                            ),
                        )
                    else:
                        current = dict(current_row)
                        evidence = list(
                            dict.fromkeys(
                                [
                                    *self._load_json(
                                        current.get("evidence_event_ids_json"), []
                                    ),
                                    *self._load_json(
                                        legacy.get("evidence_event_ids_json"), []
                                    ),
                                ]
                            )
                        )[-20:]
                        last_interaction = max(
                            filter(
                                None,
                                [
                                    current.get("last_interaction_at"),
                                    legacy.get("last_interaction_at"),
                                ],
                            ),
                            default=None,
                        )
                        connection.execute(
                            """
                            UPDATE ai_relationships SET
                                familiarity = ?, affinity = ?, trust = ?, tension = ?,
                                obligation = ?, evidence_event_ids_json = ?,
                                private_summary = ?, last_interaction_at = ?, updated_at = ?
                            WHERE owner_user_id = ? AND ai_id = ? AND other_ai_id = ?
                            """,
                            (
                                max(current["familiarity"], legacy["familiarity"]),
                                max(current["affinity"], legacy["affinity"]),
                                max(current["trust"], legacy["trust"]),
                                max(current["tension"], legacy["tension"]),
                                max(current["obligation"], legacy["obligation"]),
                                self._json(evidence),
                                current.get("private_summary")
                                or legacy.get("private_summary", ""),
                                last_interaction,
                                now.isoformat(),
                                owner_user_id,
                                legacy["ai_id"],
                                canonical_id,
                            ),
                        )
                        connection.execute(
                            """
                            DELETE FROM ai_relationships
                            WHERE owner_user_id = ? AND ai_id = ? AND other_ai_id = ?
                            """,
                            (owner_user_id, legacy["ai_id"], legacy_id),
                        )
                    changed += 1

                connection.execute(
                    """
                    UPDATE ai_story_choices SET source_id = ?
                    WHERE owner_user_id = ? AND source_kind = 'relationship'
                      AND source_id = ?
                    """,
                    (canonical_id, owner_user_id, legacy_id),
                )
                intention_rows = connection.execute(
                    """
                    SELECT intention_id, effect_json FROM ai_life_intentions
                    WHERE owner_user_id = ? AND effect_json LIKE ?
                    """,
                    (owner_user_id, f"%{legacy_id}%"),
                ).fetchall()
                for row in intention_rows:
                    effect = self._load_json(row["effect_json"], {})
                    if effect.get("relationship") != legacy_id:
                        continue
                    effect["relationship"] = canonical_id
                    connection.execute(
                        "UPDATE ai_life_intentions SET effect_json = ?, updated_at = ? "
                        "WHERE intention_id = ?",
                        (self._json(effect), now.isoformat(), row["intention_id"]),
                    )
            connection.commit()
            return changed
        except Exception:
            if connection.in_transaction:
                connection.rollback()
            raise
        finally:
            connection.close()

    def ensure_actor_state(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        initial_state: dict[str, Any],
        now: datetime,
        simulator_version: str,
    ) -> dict[str, Any]:
        now_iso = now.isoformat()
        connection = self._connect()
        try:
            connection.execute(
                """
                INSERT OR IGNORE INTO ai_actor_states (
                    owner_user_id, actor_id, current_location, current_activity,
                    energy, hunger, stress, social_need, solitude_need,
                    mood_json, active_goals_json, last_settled_at,
                    simulator_version, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    owner_user_id,
                    actor_id,
                    initial_state.get("current_location", "home"),
                    initial_state.get("current_activity", "resting"),
                    int(initial_state.get("energy", 70)),
                    int(initial_state.get("hunger", 24)),
                    int(initial_state.get("stress", 24)),
                    int(initial_state.get("social_need", 28)),
                    int(initial_state.get("solitude_need", 22)),
                    self._json(initial_state.get("mood", {})),
                    self._json(initial_state.get("active_goals", [])),
                    now_iso,
                    simulator_version,
                    now_iso,
                ),
            )
            connection.commit()
        finally:
            connection.close()
        state = self.get_actor_state(owner_user_id, actor_id)
        if state is None:
            raise RuntimeError("NPC 状态写入失败")
        return state

    def get_actor_state(
        self, owner_user_id: str, actor_id: str
    ) -> Optional[dict[str, Any]]:
        connection = self._connect()
        try:
            row = connection.execute(
                """
                SELECT * FROM ai_actor_states
                WHERE owner_user_id = ? AND actor_id = ?
                """,
                (owner_user_id, actor_id),
            ).fetchone()
            return self._decode_actor_state(row) if row else None
        finally:
            connection.close()

    def list_actor_states(self, owner_user_id: str) -> list[dict[str, Any]]:
        connection = self._connect()
        try:
            rows = connection.execute(
                """
                SELECT * FROM ai_actor_states
                WHERE owner_user_id = ? ORDER BY actor_id ASC
                """,
                (owner_user_id,),
            ).fetchall()
            return [self._decode_actor_state(row) for row in rows]
        finally:
            connection.close()

    def ensure_actor_schedule(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        schedule_id: str,
        window: LifeWindow,
        plan: dict[str, Any],
        now: datetime,
    ) -> dict[str, Any]:
        now_iso = now.isoformat()
        connection = self._connect()
        try:
            connection.execute(
                """
                INSERT OR IGNORE INTO ai_actor_schedules (
                    schedule_id, owner_user_id, actor_id, window_key,
                    activity_id, event_type, location_id, summary,
                    starts_at, ends_at, status, plan_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?)
                """,
                (
                    schedule_id,
                    owner_user_id,
                    actor_id,
                    window.key,
                    plan["activity_id"],
                    plan["event_type"],
                    plan["location_id"],
                    plan["summary"],
                    window.start_at.isoformat(),
                    window.end_at.isoformat(),
                    self._json(plan),
                    now_iso,
                    now_iso,
                ),
            )
            connection.commit()
            row = connection.execute(
                """
                SELECT * FROM ai_actor_schedules
                WHERE owner_user_id = ? AND actor_id = ?
                  AND starts_at = ? AND window_key = ?
                """,
                (
                    owner_user_id,
                    actor_id,
                    window.start_at.isoformat(),
                    window.key,
                ),
            ).fetchone()
            if row is None:
                raise RuntimeError("NPC 日程写入失败")
            return self._decode_actor_schedule(row)
        finally:
            connection.close()

    def list_actor_schedules(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        after: Optional[str] = None,
        before: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        clauses = ["owner_user_id = ?", "actor_id = ?"]
        params: list[Any] = [owner_user_id, actor_id]
        if after:
            clauses.append("ends_at > ?")
            params.append(parse_datetime(after).isoformat())
        if before:
            clauses.append("starts_at < ?")
            params.append(parse_datetime(before).isoformat())
        if status:
            clauses.append("status = ?")
            params.append(status)
        params.append(max(1, min(200, limit)))
        connection = self._connect()
        try:
            rows = connection.execute(
                f"SELECT * FROM ai_actor_schedules WHERE {' AND '.join(clauses)} "
                "ORDER BY starts_at ASC LIMIT ?",
                params,
            ).fetchall()
            return [self._decode_actor_schedule(row) for row in rows]
        finally:
            connection.close()

    def apply_actor_window(
        self,
        owner_user_id: str,
        actor_id: str,
        window: LifeWindow,
        *,
        schedule_id: Optional[str],
        next_state: dict[str, Any],
        event: Optional[dict[str, Any]],
        expected_state_version: int,
        simulator_version: str,
        now: datetime,
    ) -> tuple[str, Optional[dict[str, Any]]]:
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            current = connection.execute(
                """
                SELECT state_version, last_settled_at FROM ai_actor_states
                WHERE owner_user_id = ? AND actor_id = ?
                """,
                (owner_user_id, actor_id),
            ).fetchone()
            if current is None:
                connection.rollback()
                raise KeyError("NPC 状态不存在")
            if parse_datetime(current["last_settled_at"]) >= window.end_at:
                connection.rollback()
                return "already", None
            if int(current["state_version"]) != expected_state_version:
                connection.rollback()
                return "stale", None

            persisted_event = None
            if event is not None:
                event_id = event.get("event_id") or uuid.uuid4().hex
                connection.execute(
                    """
                    INSERT OR IGNORE INTO ai_actor_events (
                        event_id, owner_user_id, actor_id, schedule_id,
                        event_type, status, start_at, end_at, location_id,
                        summary, facts_json, importance, mentionability,
                        publicability, interpretation, private_thought,
                        disclosure_level, idempotency_key, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event_id,
                        owner_user_id,
                        actor_id,
                        schedule_id,
                        event["event_type"],
                        event.get("status", "completed"),
                        window.start_at.isoformat(),
                        window.end_at.isoformat(),
                        event["location_id"],
                        event["summary"],
                        self._json(event.get("facts", {})),
                        int(event.get("importance", 30)),
                        int(event.get("mentionability", 45)),
                        int(event.get("publicability", 25)),
                        event.get("interpretation", ""),
                        event.get("private_thought", ""),
                        event.get("disclosure_level", "familiar"),
                        event["idempotency_key"],
                        now.isoformat(),
                    ),
                )
                event_row = connection.execute(
                    """
                    SELECT * FROM ai_actor_events WHERE idempotency_key = ?
                    """,
                    (event["idempotency_key"],),
                ).fetchone()
                persisted_event = (
                    self._decode_actor_event(event_row) if event_row else None
                )

            state_update = connection.execute(
                """
                UPDATE ai_actor_states SET
                    current_location = ?, current_activity = ?, energy = ?,
                    hunger = ?, stress = ?, social_need = ?, solitude_need = ?,
                    mood_json = ?, active_goals_json = ?, last_settled_at = ?,
                    state_version = state_version + 1,
                    simulator_version = ?, updated_at = ?
                WHERE owner_user_id = ? AND actor_id = ? AND state_version = ?
                """,
                (
                    next_state.get("current_location", "home"),
                    next_state.get("current_activity", "resting"),
                    int(next_state.get("energy", 70)),
                    int(next_state.get("hunger", 24)),
                    int(next_state.get("stress", 24)),
                    int(next_state.get("social_need", 28)),
                    int(next_state.get("solitude_need", 22)),
                    self._json(next_state.get("mood", {})),
                    self._json(next_state.get("active_goals", [])),
                    window.end_at.isoformat(),
                    simulator_version,
                    now.isoformat(),
                    owner_user_id,
                    actor_id,
                    expected_state_version,
                ),
            )
            if state_update.rowcount != 1:
                connection.rollback()
                return "stale", None
            if schedule_id:
                connection.execute(
                    """
                    UPDATE ai_actor_schedules
                    SET status = 'completed', updated_at = ?
                    WHERE schedule_id = ? AND owner_user_id = ? AND actor_id = ?
                    """,
                    (now.isoformat(), schedule_id, owner_user_id, actor_id),
                )
            connection.commit()
            return "applied", persisted_event
        except Exception:
            if connection.in_transaction:
                connection.rollback()
            raise
        finally:
            connection.close()

    def list_actor_events(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        since: Optional[str] = None,
        before: Optional[str] = None,
        min_importance: int = 0,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        clauses = [
            "owner_user_id = ?",
            "actor_id = ?",
            "importance >= ?",
        ]
        params: list[Any] = [owner_user_id, actor_id, max(0, min_importance)]
        if since:
            clauses.append("end_at >= ?")
            params.append(parse_datetime(since).isoformat())
        if before:
            clauses.append("end_at < ?")
            params.append(parse_datetime(before).isoformat())
        params.append(max(1, min(100, limit)))
        connection = self._connect()
        try:
            rows = connection.execute(
                f"SELECT * FROM ai_actor_events WHERE {' AND '.join(clauses)} "
                "ORDER BY end_at DESC LIMIT ?",
                params,
            ).fetchall()
            return [self._decode_actor_event(row) for row in rows]
        finally:
            connection.close()

    def create_actor_intention(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        intention: dict[str, Any],
        now: datetime,
    ) -> tuple[dict[str, Any], bool]:
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            existing = connection.execute(
                """
                SELECT * FROM ai_actor_intentions
                WHERE owner_user_id = ? AND decision_key = ?
                """,
                (owner_user_id, intention["decision_key"]),
            ).fetchone()
            if existing:
                connection.commit()
                return self._decode_actor_intention(existing), False
            active = connection.execute(
                """
                SELECT * FROM ai_actor_intentions
                WHERE owner_user_id = ? AND actor_id = ? AND status = 'active'
                """,
                (owner_user_id, actor_id),
            ).fetchone()
            if active:
                connection.commit()
                return self._decode_actor_intention(active), False
            connection.execute(
                """
                INSERT INTO ai_actor_intentions (
                    intention_instance_id, owner_user_id, actor_id, template_id,
                    driver, status, summary, motivation, target_actor_id, score,
                    source_state_version, decision_context_json, action_json,
                    formed_at, earliest_at, deadline_at, decision_key,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    intention["intention_instance_id"],
                    owner_user_id,
                    actor_id,
                    intention["template_id"],
                    intention["driver"],
                    intention["summary"],
                    intention.get("motivation", ""),
                    intention.get("target_actor_id"),
                    int(intention["score"]),
                    int(intention["source_state_version"]),
                    self._json(intention.get("decision_context", {})),
                    self._json(intention.get("action", {})),
                    intention["formed_at"],
                    intention["earliest_at"],
                    intention["deadline_at"],
                    intention["decision_key"],
                    now.isoformat(),
                    now.isoformat(),
                ),
            )
            state_row = connection.execute(
                """
                SELECT active_goals_json FROM ai_actor_states
                WHERE owner_user_id = ? AND actor_id = ?
                """,
                (owner_user_id, actor_id),
            ).fetchone()
            if state_row:
                goals = self._load_json(state_row["active_goals_json"], [])
                goals = [
                    goal
                    for goal in goals
                    if goal.get("intention_instance_id")
                    != intention["intention_instance_id"]
                ]
                goals.append(
                    {
                        "intention_instance_id": intention["intention_instance_id"],
                        "template_id": intention["template_id"],
                        "summary": intention["summary"],
                        "target_actor_id": intention.get("target_actor_id"),
                        "deadline_at": intention["deadline_at"],
                    }
                )
                connection.execute(
                    """
                    UPDATE ai_actor_states SET active_goals_json = ?,
                        state_version = state_version + 1, updated_at = ?
                    WHERE owner_user_id = ? AND actor_id = ?
                    """,
                    (self._json(goals), now.isoformat(), owner_user_id, actor_id),
                )
            row = connection.execute(
                "SELECT * FROM ai_actor_intentions WHERE intention_instance_id = ?",
                (intention["intention_instance_id"],),
            ).fetchone()
            connection.commit()
            return self._decode_actor_intention(row), True
        except Exception:
            if connection.in_transaction:
                connection.rollback()
            raise
        finally:
            connection.close()

    def list_actor_intentions(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        status: Optional[str] = None,
        limit: int = 30,
    ) -> list[dict[str, Any]]:
        clauses = ["owner_user_id = ?", "actor_id = ?"]
        params: list[Any] = [owner_user_id, actor_id]
        if status:
            clauses.append("status = ?")
            params.append(status)
        params.append(max(1, min(100, limit)))
        connection = self._connect()
        try:
            rows = connection.execute(
                f"SELECT * FROM ai_actor_intentions WHERE {' AND '.join(clauses)} "
                "ORDER BY formed_at DESC LIMIT ?",
                params,
            ).fetchall()
            return [self._decode_actor_intention(row) for row in rows]
        finally:
            connection.close()

    def create_actor_suggestion(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        suggestion: dict[str, Any],
        now: datetime,
    ) -> tuple[dict[str, Any], bool]:
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            existing = connection.execute(
                "SELECT * FROM ai_actor_suggestions "
                "WHERE owner_user_id = ? AND idempotency_key = ?",
                (owner_user_id, suggestion["idempotency_key"]),
            ).fetchone()
            if existing:
                connection.commit()
                return self._decode_actor_suggestion(existing), False
            connection.execute(
                """
                INSERT INTO ai_actor_suggestions (
                    suggestion_id, owner_user_id, actor_id, suggestion_type,
                    message, target_actor_id, status, decision_reason_code,
                    response_text, evaluation_json, linked_intention_id,
                    reevaluate_after, idempotency_key, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    suggestion["suggestion_id"], owner_user_id, actor_id,
                    suggestion["suggestion_type"], suggestion.get("message", ""),
                    suggestion.get("target_actor_id"), suggestion["status"],
                    suggestion["decision_reason_code"], suggestion["response_text"],
                    self._json(suggestion.get("evaluation", {})),
                    suggestion.get("linked_intention_id"),
                    suggestion.get("reevaluate_after"), suggestion["idempotency_key"],
                    now.isoformat(), now.isoformat(),
                ),
            )
            row = connection.execute(
                "SELECT * FROM ai_actor_suggestions WHERE suggestion_id = ?",
                (suggestion["suggestion_id"],),
            ).fetchone()
            connection.commit()
            return self._decode_actor_suggestion(row), True
        except Exception:
            if connection.in_transaction:
                connection.rollback()
            raise
        finally:
            connection.close()

    def list_actor_suggestions(
        self,
        owner_user_id: str,
        actor_id: str,
        *,
        status: Optional[str] = None,
        limit: int = 30,
    ) -> list[dict[str, Any]]:
        clauses = ["owner_user_id = ?", "actor_id = ?"]
        params: list[Any] = [owner_user_id, actor_id]
        if status:
            clauses.append("status = ?")
            params.append(status)
        params.append(max(1, min(100, limit)))
        connection = self._connect()
        try:
            rows = connection.execute(
                f"SELECT * FROM ai_actor_suggestions WHERE {' AND '.join(clauses)} "
                "ORDER BY created_at DESC LIMIT ?",
                params,
            ).fetchall()
            return [self._decode_actor_suggestion(row) for row in rows]
        finally:
            connection.close()

    def link_actor_suggestion(
        self,
        owner_user_id: str,
        suggestion_id: str,
        *,
        status: str,
        reason_code: str,
        response_text: str,
        linked_intention_id: Optional[str],
        now: datetime,
    ) -> Optional[dict[str, Any]]:
        connection = self._connect()
        try:
            cursor = connection.execute(
                """
                UPDATE ai_actor_suggestions SET status = ?,
                    decision_reason_code = ?, response_text = ?,
                    linked_intention_id = ?, reevaluate_after = NULL, updated_at = ?
                WHERE owner_user_id = ? AND suggestion_id = ?
                """,
                (
                    status, reason_code, response_text, linked_intention_id,
                    now.isoformat(), owner_user_id, suggestion_id,
                ),
            )
            connection.commit()
            if cursor.rowcount != 1:
                return None
        finally:
            connection.close()
        items = []
        connection = self._connect()
        try:
            row = connection.execute(
                "SELECT * FROM ai_actor_suggestions "
                "WHERE owner_user_id = ? AND suggestion_id = ?",
                (owner_user_id, suggestion_id),
            ).fetchone()
            return self._decode_actor_suggestion(row) if row else None
        finally:
            connection.close()

    def complete_actor_intention(
        self,
        owner_user_id: str,
        actor_id: str,
        intention_instance_id: str,
        *,
        event: dict[str, Any],
        now: datetime,
    ) -> tuple[Optional[dict[str, Any]], bool]:
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            intention_row = connection.execute(
                """
                SELECT * FROM ai_actor_intentions
                WHERE intention_instance_id = ? AND owner_user_id = ?
                    AND actor_id = ?
                """,
                (intention_instance_id, owner_user_id, actor_id),
            ).fetchone()
            if intention_row is None:
                connection.rollback()
                raise KeyError("NPC 意图不存在")
            intention = self._decode_actor_intention(intention_row)
            if intention["status"] != "active":
                event_row = None
                if intention.get("outcome_event_id"):
                    event_row = connection.execute(
                        "SELECT * FROM ai_actor_events WHERE event_id = ?",
                        (intention["outcome_event_id"],),
                    ).fetchone()
                connection.commit()
                return (
                    self._decode_actor_event(event_row) if event_row else None,
                    False,
                )
            event_id = event["event_id"]
            connection.execute(
                """
                INSERT INTO ai_actor_events (
                    event_id, owner_user_id, actor_id, schedule_id, event_type,
                    status, start_at, end_at, location_id, summary, facts_json,
                    importance, mentionability, publicability, interpretation,
                    private_thought, disclosure_level, idempotency_key, created_at
                ) VALUES (?, ?, ?, NULL, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?)
                """,
                (
                    event_id,
                    owner_user_id,
                    actor_id,
                    event["event_type"],
                    event["start_at"],
                    event["end_at"],
                    event["location_id"],
                    event["summary"],
                    self._json(event.get("facts", {})),
                    int(event.get("importance", 35)),
                    int(event.get("mentionability", 50)),
                    int(event.get("publicability", 20)),
                    event.get("interpretation", ""),
                    event.get("disclosure_level", "familiar"),
                    event["idempotency_key"],
                    now.isoformat(),
                ),
            )
            state_row = connection.execute(
                """
                SELECT * FROM ai_actor_states
                WHERE owner_user_id = ? AND actor_id = ?
                """,
                (owner_user_id, actor_id),
            ).fetchone()
            if state_row:
                state = self._decode_actor_state(state_row)
                goals = [
                    goal
                    for goal in state.get("active_goals", [])
                    if goal.get("intention_instance_id") != intention_instance_id
                ]
                for key, delta in event.get("state_delta", {}).items():
                    if key in {
                        "energy", "hunger", "stress", "social_need", "solitude_need"
                    }:
                        state[key] = max(0, min(100, int(state[key]) + int(delta)))
                connection.execute(
                    """
                    UPDATE ai_actor_states SET energy = ?, hunger = ?, stress = ?,
                        social_need = ?, solitude_need = ?, active_goals_json = ?,
                        state_version = state_version + 1, updated_at = ?
                    WHERE owner_user_id = ? AND actor_id = ?
                    """,
                    (
                        state["energy"], state["hunger"], state["stress"],
                        state["social_need"], state["solitude_need"],
                        self._json(goals), now.isoformat(), owner_user_id, actor_id,
                    ),
                )
            target_actor_id = intention.get("target_actor_id")
            if target_actor_id:
                delta = event.get("relationship_delta", {})
                self._apply_relationship_change(
                    connection,
                    owner_user_id,
                    actor_id,
                    RelationshipChange(
                        other_ai_id=target_actor_id,
                        display_name=event.get("target_display_name", ""),
                        familiarity_delta=int(delta.get("familiarity", 0)),
                        affinity_delta=int(delta.get("affinity", 0)),
                        trust_delta=int(delta.get("trust", 0)),
                        tension_delta=int(delta.get("tension", 0)),
                        obligation_delta=int(delta.get("obligation", 0)),
                        private_summary="主动联系留下了新的关系证据。",
                    ),
                    event_id,
                    parse_datetime(event["end_at"]),
                )
            connection.execute(
                """
                UPDATE ai_actor_intentions SET status = 'completed',
                    resolved_at = ?, outcome_event_id = ?, updated_at = ?
                WHERE intention_instance_id = ? AND status = 'active'
                """,
                (now.isoformat(), event_id, now.isoformat(), intention_instance_id),
            )
            row = connection.execute(
                "SELECT * FROM ai_actor_events WHERE event_id = ?", (event_id,)
            ).fetchone()
            connection.commit()
            return self._decode_actor_event(row), True
        except Exception:
            if connection.in_transaction:
                connection.rollback()
            raise
        finally:
            connection.close()

    def create_interaction_event(
        self,
        owner_user_id: str,
        *,
        event: dict[str, Any],
        participants: list[dict[str, str]],
        perspectives: dict[str, dict[str, Any]],
        relationship_changes: list[tuple[str, Any]],
        now: datetime,
    ) -> tuple[dict[str, Any], bool]:
        if len(participants) < 2:
            raise ValueError("共同事件至少需要两个参与者")
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            existing = connection.execute(
                """
                SELECT event_id FROM ai_interaction_events
                WHERE owner_user_id = ? AND idempotency_key = ?
                """,
                (owner_user_id, event["idempotency_key"]),
            ).fetchone()
            if existing:
                result = self._load_interaction_event(
                    connection, existing["event_id"]
                )
                connection.commit()
                return result, False

            event_id = event.get("event_id") or uuid.uuid4().hex
            connection.execute(
                """
                INSERT INTO ai_interaction_events (
                    event_id, owner_user_id, event_type, status, start_at,
                    end_at, location_id, summary, facts_json, importance,
                    mentionability, publicability, idempotency_key, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_id,
                    owner_user_id,
                    event["event_type"],
                    event.get("status", "completed"),
                    parse_datetime(event["start_at"]).isoformat(),
                    parse_datetime(event["end_at"]).isoformat(),
                    event["location_id"],
                    event["summary"],
                    self._json(event.get("facts", {})),
                    int(event.get("importance", 40)),
                    int(event.get("mentionability", 60)),
                    int(event.get("publicability", 30)),
                    event["idempotency_key"],
                    now.isoformat(),
                ),
            )
            for participant in participants:
                actor_id = participant["actor_id"]
                connection.execute(
                    """
                    INSERT INTO ai_interaction_participants (
                        event_id, owner_user_id, actor_id, participant_role
                    ) VALUES (?, ?, ?, ?)
                    """,
                    (
                        event_id,
                        owner_user_id,
                        actor_id,
                        participant.get("participant_role", "participant"),
                    ),
                )
                perspective = perspectives.get(actor_id, {})
                connection.execute(
                    """
                    INSERT INTO ai_interaction_perspectives (
                        event_id, owner_user_id, actor_id, knowledge_source,
                        confidence, interpretation, emotion_delta_json,
                        private_thought, disclosure_level, learned_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event_id,
                        owner_user_id,
                        actor_id,
                        perspective.get("knowledge_source", "firsthand"),
                        int(perspective.get("confidence", 100)),
                        perspective.get("interpretation", ""),
                        self._json(perspective.get("emotion_delta", {})),
                        perspective.get("private_thought", ""),
                        perspective.get("disclosure_level", "familiar"),
                        now.isoformat(),
                    ),
                )
            interaction_at = parse_datetime(event["end_at"])
            for actor_id, change in relationship_changes:
                self._apply_relationship_change(
                    connection,
                    owner_user_id,
                    actor_id,
                    change,
                    event_id,
                    interaction_at,
                )
            result = self._load_interaction_event(connection, event_id)
            connection.commit()
            return result, True
        except Exception:
            if connection.in_transaction:
                connection.rollback()
            raise
        finally:
            connection.close()

    def list_interaction_events(
        self,
        owner_user_id: str,
        *,
        actor_id: Optional[str] = None,
        since: Optional[str] = None,
        before: Optional[str] = None,
        min_importance: int = 0,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        clauses = ["e.owner_user_id = ?", "e.importance >= ?"]
        params: list[Any] = [owner_user_id, max(0, min_importance)]
        join = ""
        if actor_id:
            join = (
                "JOIN ai_interaction_participants filter_participant "
                "ON filter_participant.event_id = e.event_id"
            )
            clauses.append("filter_participant.actor_id = ?")
            clauses.append("filter_participant.owner_user_id = ?")
            params.extend([actor_id, owner_user_id])
        if since:
            clauses.append("e.end_at >= ?")
            params.append(parse_datetime(since).isoformat())
        if before:
            clauses.append("e.end_at < ?")
            params.append(parse_datetime(before).isoformat())
        params.append(max(1, min(100, limit)))
        connection = self._connect()
        try:
            rows = connection.execute(
                f"SELECT e.event_id FROM ai_interaction_events e {join} "
                f"WHERE {' AND '.join(clauses)} "
                "ORDER BY e.end_at DESC LIMIT ?",
                params,
            ).fetchall()
            return [
                self._load_interaction_event(
                    connection, row["event_id"], perspective_actor_id=actor_id
                )
                for row in rows
            ]
        finally:
            connection.close()

    def _load_interaction_event(
        self,
        connection: sqlite3.Connection,
        event_id: str,
        *,
        perspective_actor_id: Optional[str] = None,
    ) -> dict[str, Any]:
        row = connection.execute(
            "SELECT * FROM ai_interaction_events WHERE event_id = ?",
            (event_id,),
        ).fetchone()
        if row is None:
            raise KeyError("共同事件不存在")
        result = dict(row)
        result["facts"] = self._load_json(result.pop("facts_json"), {})
        participant_rows = connection.execute(
            """
            SELECT actor_id, participant_role
            FROM ai_interaction_participants
            WHERE event_id = ? ORDER BY rowid ASC
            """,
            (event_id,),
        ).fetchall()
        result["participants"] = [dict(item) for item in participant_rows]
        perspective_rows = connection.execute(
            """
            SELECT * FROM ai_interaction_perspectives
            WHERE event_id = ? ORDER BY actor_id ASC
            """,
            (event_id,),
        ).fetchall()
        perspectives = {}
        for perspective_row in perspective_rows:
            perspective = dict(perspective_row)
            perspective["emotion_delta"] = self._load_json(
                perspective.pop("emotion_delta_json"), {}
            )
            perspectives[perspective["actor_id"]] = perspective
        result["perspectives"] = perspectives
        if perspective_actor_id:
            result["perspective"] = perspectives.get(perspective_actor_id)
        return result

    def apply_window(
        self,
        owner_user_id: str,
        ai_id: str,
        window: LifeWindow,
        result: SimulationResult,
        expected_state_version: int,
        simulator_version: str,
        now: datetime,
    ) -> tuple[str, Optional[dict[str, Any]]]:
        """短事务写入窗口结果；返回 applied、already 或 stale。"""

        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            current = connection.execute(
                """
                SELECT state_version, last_settled_at FROM ai_life_states
                WHERE owner_user_id = ? AND ai_id = ?
                """,
                (owner_user_id, ai_id),
            ).fetchone()
            if not current:
                connection.rollback()
                raise KeyError("生活状态不存在")
            if parse_datetime(current["last_settled_at"]) >= window.end_at:
                connection.rollback()
                return "already", None
            if current["state_version"] != expected_state_version:
                connection.rollback()
                return "stale", None

            event = None
            if result.event is not None:
                event_id = uuid.uuid4().hex
                world_id = f"private:{owner_user_id}"
                idempotency_key = (
                    f"{owner_user_id}:{ai_id}:{window.key}:"
                    f"{window.start_at.isoformat()}:{simulator_version}"
                )
                draft = result.event
                connection.execute(
                    """
                    INSERT INTO ai_life_events (
                        event_id, owner_user_id, world_id, event_type, status,
                        actor_ai_ids_json, participant_ids_json, start_at, end_at,
                        location_id, summary, facts_json, importance, mentionability,
                        publicability, follow_up_required, story_arc_id, parent_event_id,
                        idempotency_key, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event_id,
                        owner_user_id,
                        world_id,
                        draft.event_type,
                        draft.status,
                        self._json([ai_id]),
                        self._json(draft.participant_ids),
                        draft.start_at.isoformat(),
                        draft.end_at.isoformat(),
                        draft.location_id,
                        draft.summary,
                        self._json(draft.facts),
                        draft.importance,
                        draft.mentionability,
                        draft.publicability,
                        int(draft.follow_up_required),
                        draft.story_arc_id,
                        draft.parent_event_id,
                        idempotency_key,
                        now.isoformat(),
                    ),
                )
                connection.execute(
                    """
                    INSERT INTO ai_event_perspectives (
                        event_id, owner_user_id, ai_id, interpretation,
                        emotion_delta_json, private_thought, disclosure_level,
                        learned_at, evidence_refs_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event_id,
                        owner_user_id,
                        ai_id,
                        draft.interpretation,
                        self._json(draft.emotion_delta),
                        draft.private_thought,
                        draft.disclosure_level,
                        now.isoformat(),
                        self._json([event_id]),
                    ),
                )
                self._apply_story_arc_change(
                    connection,
                    owner_user_id,
                    ai_id,
                    draft.story_arc_change,
                )
                for relationship_change in draft.relationship_changes:
                    self._apply_relationship_change(
                        connection,
                        owner_user_id,
                        ai_id,
                        relationship_change,
                        event_id,
                        draft.end_at,
                    )
                life_intention_id = draft.facts.get("life_intention_id")
                if life_intention_id:
                    intention_outcome = draft.facts.get("intention_outcome", "fulfilled")
                    if intention_outcome not in {"fulfilled", "abandoned"}:
                        intention_outcome = "fulfilled"
                    connection.execute(
                        """
                        UPDATE ai_life_intentions
                        SET status = ?, applied_at = ?, attempt_count = attempt_count + 1,
                            last_attempt_at = ?, resolution_reason = ?, updated_at = ?
                        WHERE intention_id = ? AND owner_user_id = ? AND ai_id = ?
                          AND status IN ('active', 'deferred')
                        """,
                        (
                            intention_outcome,
                            draft.end_at.isoformat(),
                            draft.end_at.isoformat(),
                            draft.facts.get(
                                "intention_resolution_reason", "event_completed"
                            ),
                            draft.end_at.isoformat(),
                            life_intention_id,
                            owner_user_id,
                            ai_id,
                        ),
                    )
                event = {
                    "event_id": event_id,
                    "event_type": draft.event_type,
                    "summary": draft.summary,
                    "start_at": draft.start_at.isoformat(),
                    "end_at": draft.end_at.isoformat(),
                    "importance": draft.importance,
                    "mentionability": draft.mentionability,
                    "publicability": draft.publicability,
                    "location_id": draft.location_id,
                    "story_arc_id": draft.story_arc_id,
                    "participant_ids": list(draft.participant_ids),
                }

            state = result.state
            connection.execute(
                """
                UPDATE ai_life_states SET
                    current_location = ?, current_activity = ?, energy = ?, hunger = ?,
                    stress = ?, social_need = ?, solitude_need = ?, mood_json = ?,
                    active_goals_json = ?, obligations_json = ?, last_settled_at = ?,
                    state_version = state_version + 1, simulator_version = ?, updated_at = ?
                WHERE owner_user_id = ? AND ai_id = ? AND state_version = ?
                """,
                (
                    state.get("current_location", "home"),
                    state.get("current_activity", "resting"),
                    state.get("energy", 72),
                    state.get("hunger", 20),
                    state.get("stress", 25),
                    state.get("social_need", 25),
                    state.get("solitude_need", 20),
                    self._json(state.get("mood", {})),
                    self._json(state.get("active_goals", [])),
                    self._json(state.get("obligations", [])),
                    window.end_at.isoformat(),
                    simulator_version,
                    now.isoformat(),
                    owner_user_id,
                    ai_id,
                    expected_state_version,
                ),
            )
            connection.commit()
            return "applied", event
        except sqlite3.IntegrityError as error:
            connection.rollback()
            if "idempotency" in str(error).lower() or "unique" in str(error).lower():
                return "already", None
            raise
        finally:
            connection.close()

    def _apply_story_arc_change(
        self,
        connection: sqlite3.Connection,
        owner_user_id: str,
        ai_id: str,
        change: Any,
    ) -> None:
        if change is None:
            return
        if change.action == "start":
            connection.execute(
                """
                INSERT INTO ai_story_arcs (
                    story_arc_id, owner_user_id, lead_ai_id, arc_type, title,
                    status, stage, stage_version, participant_ai_ids_json,
                    state_json, impact_level, started_at, last_advanced_at,
                    completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    change.story_arc_id,
                    owner_user_id,
                    ai_id,
                    change.arc_type,
                    change.title,
                    change.status,
                    change.stage,
                    change.stage_version,
                    self._json([ai_id]),
                    self._json(change.state),
                    change.impact_level,
                    change.started_at.isoformat(),
                    change.last_advanced_at.isoformat(),
                    change.completed_at.isoformat() if change.completed_at else None,
                ),
            )
            return

        cursor = connection.execute(
            """
            UPDATE ai_story_arcs SET
                status = ?, stage = ?, stage_version = ?, state_json = ?,
                impact_level = ?, last_advanced_at = ?, completed_at = ?
            WHERE story_arc_id = ? AND owner_user_id = ? AND lead_ai_id = ?
            """,
            (
                change.status,
                change.stage,
                change.stage_version,
                self._json(change.state),
                change.impact_level,
                change.last_advanced_at.isoformat(),
                change.completed_at.isoformat() if change.completed_at else None,
                change.story_arc_id,
                owner_user_id,
                ai_id,
            ),
        )
        if cursor.rowcount != 1:
            raise KeyError("要推进的故事线不存在")

    def _apply_relationship_change(
        self,
        connection: sqlite3.Connection,
        owner_user_id: str,
        ai_id: str,
        change: Any,
        event_id: str,
        interaction_at: datetime,
    ) -> None:
        row = connection.execute(
            """
            SELECT * FROM ai_relationships
            WHERE owner_user_id = ? AND ai_id = ? AND other_ai_id = ?
            """,
            (owner_user_id, ai_id, change.other_ai_id),
        ).fetchone()
        current = dict(row) if row else {}
        evidence = self._load_json(current.get("evidence_event_ids_json"), [])
        evidence = [*evidence, event_id][-20:]

        def metric(name: str, delta: int) -> int:
            return max(0, min(100, int(current.get(name, 0)) + int(delta)))

        values = {
            "familiarity": metric("familiarity", change.familiarity_delta),
            "affinity": metric("affinity", change.affinity_delta),
            "trust": metric("trust", change.trust_delta),
            "tension": metric("tension", change.tension_delta),
            "obligation": metric("obligation", change.obligation_delta),
        }
        if row:
            connection.execute(
                """
                UPDATE ai_relationships SET
                    display_name = ?, familiarity = ?, affinity = ?, trust = ?,
                    tension = ?, obligation = ?, evidence_event_ids_json = ?,
                    private_summary = ?, last_interaction_at = ?, updated_at = ?
                WHERE owner_user_id = ? AND ai_id = ? AND other_ai_id = ?
                """,
                (
                    change.display_name,
                    values["familiarity"],
                    values["affinity"],
                    values["trust"],
                    values["tension"],
                    values["obligation"],
                    self._json(evidence),
                    change.private_summary or current.get("private_summary", ""),
                    interaction_at.isoformat(),
                    interaction_at.isoformat(),
                    owner_user_id,
                    ai_id,
                    change.other_ai_id,
                ),
            )
            return
        connection.execute(
            """
            INSERT INTO ai_relationships (
                owner_user_id, ai_id, other_ai_id, display_name, familiarity,
                affinity, trust, tension, obligation, evidence_event_ids_json,
                private_summary, last_interaction_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                owner_user_id,
                ai_id,
                change.other_ai_id,
                change.display_name,
                values["familiarity"],
                values["affinity"],
                values["trust"],
                values["tension"],
                values["obligation"],
                self._json(evidence),
                change.private_summary,
                interaction_at.isoformat(),
                interaction_at.isoformat(),
            ),
        )

    def get_active_story_arc(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        arc_type: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        clauses = ["owner_user_id = ?", "lead_ai_id = ?", "status = 'active'"]
        params: list[Any] = [owner_user_id, ai_id]
        if arc_type:
            clauses.append("arc_type = ?")
            params.append(arc_type)
        connection = self._connect()
        try:
            row = connection.execute(
                f"SELECT * FROM ai_story_arcs WHERE {' AND '.join(clauses)} "
                "ORDER BY last_advanced_at DESC LIMIT 1",
                params,
            ).fetchone()
            return self._decode_story_arc(row) if row else None
        finally:
            connection.close()

    def list_story_arcs(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        status: Optional[str] = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        clauses = ["owner_user_id = ?", "lead_ai_id = ?"]
        params: list[Any] = [owner_user_id, ai_id]
        if status:
            clauses.append("status = ?")
            params.append(status)
        params.append(max(1, min(50, limit)))
        connection = self._connect()
        try:
            rows = connection.execute(
                f"SELECT * FROM ai_story_arcs WHERE {' AND '.join(clauses)} "
                "ORDER BY last_advanced_at DESC LIMIT ?",
                params,
            ).fetchall()
            return [self._decode_story_arc(row) for row in rows]
        finally:
            connection.close()

    def list_relationships(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        connection = self._connect()
        try:
            rows = connection.execute(
                """
                SELECT * FROM ai_relationships
                WHERE owner_user_id = ? AND ai_id = ?
                ORDER BY last_interaction_at DESC, familiarity DESC
                LIMIT ?
                """,
                (owner_user_id, ai_id, max(1, min(50, limit))),
            ).fetchall()
            return [self._decode_relationship(row) for row in rows]
        finally:
            connection.close()

    def create_story_choice(
        self,
        owner_user_id: str,
        ai_id: str,
        *,
        source_kind: str,
        source_id: str,
        choice_type: str,
        prompt: str,
        context_text: str,
        options: list[dict[str, Any]],
        created_at: datetime,
        expires_at: datetime,
        idempotency_key: str,
    ) -> dict[str, Any]:
        """Create a choice once and return the existing row on retries."""

        choice_id = uuid.uuid4().hex
        connection = self._connect()
        try:
            connection.execute(
                """
                INSERT OR IGNORE INTO ai_story_choices (
                    choice_id, owner_user_id, ai_id, source_kind, source_id,
                    choice_type, prompt, context_text, options_json, status,
                    created_at, expires_at, idempotency_key
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
                """,
                (
                    choice_id,
                    owner_user_id,
                    ai_id,
                    source_kind,
                    source_id,
                    choice_type,
                    prompt,
                    context_text,
                    self._json(options),
                    created_at.isoformat(),
                    expires_at.isoformat(),
                    idempotency_key,
                ),
            )
            row = connection.execute(
                "SELECT * FROM ai_story_choices WHERE idempotency_key = ?",
                (idempotency_key,),
            ).fetchone()
            if row is None:
                row = connection.execute(
                    """
                    SELECT * FROM ai_story_choices
                    WHERE owner_user_id = ? AND ai_id = ? AND status = 'pending'
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (owner_user_id, ai_id),
                ).fetchone()
            connection.commit()
            if row is None:
                raise RuntimeError("故事选择写入失败")
            return self._decode_story_choice(row)
        finally:
            connection.close()

    def expire_story_choices(
        self, owner_user_id: str, ai_id: str, *, now: datetime
    ) -> int:
        connection = self._connect()
        try:
            cursor = connection.execute(
                """
                UPDATE ai_story_choices SET status = 'expired'
                WHERE owner_user_id = ? AND ai_id = ? AND status = 'pending'
                  AND expires_at <= ?
                """,
                (owner_user_id, ai_id, now.isoformat()),
            )
            connection.commit()
            return cursor.rowcount
        finally:
            connection.close()

    def list_story_choices(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        status: Optional[str] = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        clauses = ["owner_user_id = ?", "ai_id = ?"]
        params: list[Any] = [owner_user_id, ai_id]
        if status:
            clauses.append("status = ?")
            params.append(status)
        params.append(max(1, min(50, limit)))
        connection = self._connect()
        try:
            rows = connection.execute(
                f"SELECT * FROM ai_story_choices WHERE {' AND '.join(clauses)} "
                "ORDER BY created_at DESC LIMIT ?",
                params,
            ).fetchall()
            return [self._decode_story_choice(row) for row in rows]
        finally:
            connection.close()

    def list_active_intentions(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        return self.list_intentions(
            owner_user_id,
            ai_id,
            statuses=("active", "deferred"),
            limit=limit,
        )

    def list_intentions(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        statuses: Optional[tuple[str, ...]] = None,
        limit: int = 10,
        order: str = "priority",
    ) -> list[dict[str, Any]]:
        clauses = ["owner_user_id = ?", "ai_id = ?"]
        params: list[Any] = [owner_user_id, ai_id]
        if statuses:
            placeholders = ",".join("?" for _ in statuses)
            clauses.append(f"status IN ({placeholders})")
            params.extend(statuses)
        params.append(max(1, min(50, limit)))
        connection = self._connect()
        try:
            ordering = (
                "COALESCE(updated_at, created_at) DESC, created_at DESC"
                if order == "recent"
                else "priority DESC, created_at ASC"
            )
            rows = connection.execute(
                f"SELECT * FROM ai_life_intentions WHERE {' AND '.join(clauses)} "
                f"ORDER BY {ordering} LIMIT ?",
                params,
            ).fetchall()
            return [self._decode_life_intention(row) for row in rows]
        finally:
            connection.close()

    def expire_due_intentions(
        self,
        owner_user_id: str,
        ai_id: str,
        *,
        now: datetime,
    ) -> list[str]:
        """Expire overdue intentions and remove their state goals atomically."""

        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            rows = connection.execute(
                """
                SELECT intention_id FROM ai_life_intentions
                WHERE owner_user_id = ? AND ai_id = ?
                  AND status IN ('active', 'deferred')
                  AND deadline_at IS NOT NULL AND deadline_at <= ?
                """,
                (owner_user_id, ai_id, now.isoformat()),
            ).fetchall()
            intention_ids = [row[0] for row in rows]
            if not intention_ids:
                connection.rollback()
                return []
            placeholders = ",".join("?" for _ in intention_ids)
            connection.execute(
                f"""
                UPDATE ai_life_intentions
                SET status = 'expired', resolution_reason = 'deadline_elapsed',
                    updated_at = ?
                WHERE intention_id IN ({placeholders})
                """,
                (now.isoformat(), *intention_ids),
            )
            state_row = connection.execute(
                """
                SELECT active_goals_json FROM ai_life_states
                WHERE owner_user_id = ? AND ai_id = ?
                """,
                (owner_user_id, ai_id),
            ).fetchone()
            if state_row:
                goals = self._load_json(state_row[0], [])
                filtered = [
                    goal
                    for goal in goals
                    if not (
                        isinstance(goal, dict)
                        and goal.get("intention_id") in intention_ids
                    )
                ]
                connection.execute(
                    """
                    UPDATE ai_life_states
                    SET active_goals_json = ?, updated_at = ?,
                        state_version = state_version + 1
                    WHERE owner_user_id = ? AND ai_id = ?
                    """,
                    (self._json(filtered), now.isoformat(), owner_user_id, ai_id),
                )
            connection.commit()
            return intention_ids
        except Exception:
            if connection.in_transaction:
                connection.rollback()
            raise
        finally:
            connection.close()

    def resolve_story_choice(
        self,
        owner_user_id: str,
        ai_id: str,
        choice_id: str,
        option_id: str,
        *,
        now: datetime,
    ) -> Optional[dict[str, Any]]:
        """Resolve a choice and materialize its intention in one transaction."""

        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute(
                """
                SELECT * FROM ai_story_choices
                WHERE choice_id = ? AND owner_user_id = ? AND ai_id = ?
                """,
                (choice_id, owner_user_id, ai_id),
            ).fetchone()
            if row is None:
                connection.rollback()
                return None
            choice = self._decode_story_choice(row)
            if choice["status"] == "resolved":
                if choice["selected_option_id"] != option_id:
                    connection.rollback()
                    raise ValueError("这个选择已经用另一种方式回应过了")
                intention_row = connection.execute(
                    "SELECT * FROM ai_life_intentions WHERE choice_id = ?", (choice_id,)
                ).fetchone()
                connection.commit()
                return {
                    "choice": choice,
                    "intention": self._decode_life_intention(intention_row),
                }
            if choice["status"] != "pending" or parse_datetime(choice["expires_at"]) <= now:
                connection.execute(
                    "UPDATE ai_story_choices SET status = 'expired' WHERE choice_id = ?",
                    (choice_id,),
                )
                connection.commit()
                raise ValueError("这个选择已经过期了")

            option = next(
                (item for item in choice["options"] if item.get("id") == option_id), None
            )
            if option is None:
                connection.rollback()
                raise ValueError("选项不存在")
            summary = str(option.get("intention_summary") or option.get("label") or "").strip()
            resolution = str(option.get("resolution_text") or "UNA 记下了你的想法。")
            effect = option.get("effect") if isinstance(option.get("effect"), dict) else {}
            policy = (
                option.get("intention_policy")
                if isinstance(option.get("intention_policy"), dict)
                else {}
            )
            intention_status = str(policy.get("initial_status", "active"))
            if intention_status not in {"active", "deferred"}:
                intention_status = "active"
            earliest_at = now + timedelta(hours=max(0, int(policy.get("delay_hours", 0))))
            deadline_hours = max(1, int(policy.get("deadline_hours", 168)))
            deadline_at = earliest_at + timedelta(hours=deadline_hours)
            priority = max(0, min(100, int(policy.get("priority", 50))))
            conditions = (
                policy.get("conditions")
                if isinstance(policy.get("conditions"), dict)
                else {}
            )
            intention_id = uuid.uuid4().hex
            connection.execute(
                """
                UPDATE ai_story_choices
                SET status = 'resolved', selected_option_id = ?, resolution_text = ?,
                    resolved_at = ?
                WHERE choice_id = ?
                """,
                (option_id, resolution, now.isoformat(), choice_id),
            )
            connection.execute(
                """
                INSERT INTO ai_life_intentions (
                    intention_id, owner_user_id, ai_id, choice_id, intention_type,
                    summary, effect_json, status, priority, earliest_at, deadline_at,
                    conditions_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    intention_id,
                    owner_user_id,
                    ai_id,
                    choice_id,
                    choice["choice_type"],
                    summary,
                    self._json(effect),
                    intention_status,
                    priority,
                    earliest_at.isoformat(),
                    deadline_at.isoformat(),
                    self._json(conditions),
                    now.isoformat(),
                    now.isoformat(),
                ),
            )
            state_row = connection.execute(
                """
                SELECT active_goals_json FROM ai_life_states
                WHERE owner_user_id = ? AND ai_id = ?
                """,
                (owner_user_id, ai_id),
            ).fetchone()
            goals = self._load_json(state_row[0], []) if state_row else []
            goals = [
                goal
                for goal in goals
                if not (
                    goal == summary
                    or (isinstance(goal, dict) and goal.get("intention_id") == intention_id)
                )
            ]
            goals.append(
                {
                    "kind": "life_intention",
                    "intention_id": intention_id,
                    "choice_id": choice_id,
                    "intention_type": choice["choice_type"],
                    "summary": summary,
                    "effect": effect,
                }
            )
            connection.execute(
                """
                UPDATE ai_life_states
                SET active_goals_json = ?, updated_at = ?
                WHERE owner_user_id = ? AND ai_id = ?
                """,
                (self._json(goals[-8:]), now.isoformat(), owner_user_id, ai_id),
            )
            connection.execute(
                """
                INSERT INTO ai_memory_entries (
                    memory_id, owner_user_id, ai_id, memory_kind, content,
                    source_kind, confidence, state, disclosure_level,
                    metadata_json, learned_at
                ) VALUES (?, ?, ?, 'shared_decision', ?, 'user_advice', 90,
                          'active', 'familiar', ?, ?)
                """,
                (
                    uuid.uuid4().hex,
                    owner_user_id,
                    ai_id,
                    summary,
                    self._json(
                        {
                            "choice_id": choice_id,
                            "choice_type": choice["choice_type"],
                            "selected_option_id": option_id,
                        }
                    ),
                    now.isoformat(),
                ),
            )
            connection.commit()
            resolved = connection.execute(
                "SELECT * FROM ai_story_choices WHERE choice_id = ?", (choice_id,)
            ).fetchone()
            intention = connection.execute(
                "SELECT * FROM ai_life_intentions WHERE intention_id = ?", (intention_id,)
            ).fetchone()
            return {
                "choice": self._decode_story_choice(resolved),
                "intention": self._decode_life_intention(intention),
            }
        except Exception:
            if connection.in_transaction:
                connection.rollback()
            raise
        finally:
            connection.close()

    def list_events(
        self,
        owner_user_id: str,
        ai_id: str = DEFAULT_AI_ID,
        *,
        limit: int = 30,
        before: Optional[str] = None,
        since: Optional[str] = None,
        min_importance: int = 0,
    ) -> list[dict[str, Any]]:
        clauses = ["e.owner_user_id = ?", "e.importance >= ?", "p.ai_id = ?"]
        params: list[Any] = [owner_user_id, min_importance, ai_id]
        if before:
            clauses.append("e.end_at < ?")
            params.append(parse_datetime(before).isoformat())
        if since:
            clauses.append("e.end_at >= ?")
            params.append(parse_datetime(since).isoformat())
        params.append(max(1, min(100, limit)))
        connection = self._connect()
        try:
            rows = connection.execute(
                f"""
                SELECT e.*, p.knowledge_source, p.confidence, p.interpretation,
                       p.emotion_delta_json, p.private_thought, p.disclosure_level
                FROM ai_life_events e
                JOIN ai_event_perspectives p ON p.event_id = e.event_id
                WHERE {' AND '.join(clauses)}
                ORDER BY e.end_at DESC
                LIMIT ?
                """,
                params,
            ).fetchall()
            return [self._decode_event(row) for row in rows]
        finally:
            connection.close()

    def claim_proactive_delivery(
        self,
        owner_user_id: str,
        ai_id: str,
        source_event_id: str,
        message_text: str,
        *,
        topic: str,
        now: datetime,
        cooldown_since: datetime,
        day_start: datetime,
        stale_claim_before: datetime,
        max_daily: int,
        channel: str = "websocket",
    ) -> Optional[dict[str, Any]]:
        """Atomically reserve one reconnect delivery across tabs and workers."""

        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            profile = connection.execute(
                """
                SELECT proactive_messages_enabled FROM ai_life_profiles
                WHERE owner_user_id = ? AND ai_id = ?
                """,
                (owner_user_id, ai_id),
            ).fetchone()
            if not profile or not bool(profile[0]):
                connection.rollback()
                return None

            connection.execute(
                """
                UPDATE ai_life_proactive_deliveries
                SET status = 'failed', last_error = 'claim_timeout'
                WHERE owner_user_id = ? AND ai_id = ? AND channel = ?
                  AND status = 'claimed' AND claimed_at < ?
                """,
                (owner_user_id, ai_id, channel, stale_claim_before.isoformat()),
            )
            existing = connection.execute(
                """
                SELECT * FROM ai_life_proactive_deliveries
                WHERE owner_user_id = ? AND ai_id = ?
                  AND source_event_id = ? AND channel = ?
                """,
                (owner_user_id, ai_id, source_event_id, channel),
            ).fetchone()
            recent = connection.execute(
                """
                SELECT 1 FROM ai_life_proactive_deliveries
                WHERE owner_user_id = ? AND ai_id = ? AND channel = ?
                  AND (
                    (status = 'delivered' AND delivered_at >= ?)
                    OR status = 'claimed'
                  )
                LIMIT 1
                """,
                (owner_user_id, ai_id, channel, cooldown_since.isoformat()),
            ).fetchone()
            delivered_today = connection.execute(
                """
                SELECT COUNT(*) FROM ai_life_proactive_deliveries
                WHERE owner_user_id = ? AND ai_id = ? AND channel = ?
                  AND status = 'delivered' AND delivered_at >= ?
                """,
                (owner_user_id, ai_id, channel, day_start.isoformat()),
            ).fetchone()[0]
            if (existing and existing["status"] in {"claimed", "delivered"}) or recent or delivered_today >= max_daily:
                connection.rollback()
                return None

            if existing:
                delivery_id = existing["delivery_id"]
                connection.execute(
                    """
                    UPDATE ai_life_proactive_deliveries
                    SET status = 'claimed', topic = ?, message_text = ?, claimed_at = ?,
                        delivered_at = NULL, attempts = attempts + 1, last_error = NULL
                    WHERE delivery_id = ?
                    """,
                    (topic, message_text, now.isoformat(), delivery_id),
                )
            else:
                delivery_id = uuid.uuid4().hex
                connection.execute(
                    """
                    INSERT INTO ai_life_proactive_deliveries (
                        delivery_id, owner_user_id, ai_id, source_event_id,
                        channel, status, topic, message_text, claimed_at
                    ) VALUES (?, ?, ?, ?, ?, 'claimed', ?, ?, ?)
                    """,
                    (
                        delivery_id,
                        owner_user_id,
                        ai_id,
                        source_event_id,
                        channel,
                        topic,
                        message_text,
                        now.isoformat(),
                    ),
                )
            connection.commit()
            return {
                "delivery_id": delivery_id,
                "owner_user_id": owner_user_id,
                "ai_id": ai_id,
                "source_event_id": source_event_id,
                "channel": channel,
                "status": "claimed",
                "topic": topic,
                "message_text": message_text,
                "claimed_at": now.isoformat(),
            }
        except sqlite3.IntegrityError:
            connection.rollback()
            return None
        finally:
            connection.close()

    def complete_proactive_delivery(
        self, owner_user_id: str, delivery_id: str, *, now: datetime
    ) -> bool:
        connection = self._connect()
        try:
            cursor = connection.execute(
                """
                UPDATE ai_life_proactive_deliveries
                SET status = 'delivered', delivered_at = ?
                WHERE delivery_id = ? AND owner_user_id = ? AND status = 'claimed'
                """,
                (now.isoformat(), delivery_id, owner_user_id),
            )
            connection.commit()
            return cursor.rowcount == 1
        finally:
            connection.close()

    def fail_proactive_delivery(
        self, owner_user_id: str, delivery_id: str, *, error: str
    ) -> bool:
        connection = self._connect()
        try:
            cursor = connection.execute(
                """
                UPDATE ai_life_proactive_deliveries
                SET status = 'failed', last_error = ?
                WHERE delivery_id = ? AND owner_user_id = ? AND status = 'claimed'
                """,
                (error[:200], delivery_id, owner_user_id),
            )
            connection.commit()
            return cursor.rowcount == 1
        finally:
            connection.close()

    def record_proactive_feedback(
        self,
        owner_user_id: str,
        ai_id: str,
        delivery_id: str,
        reaction: str,
        *,
        now: datetime,
    ) -> Optional[dict[str, Any]]:
        weights = {"more": 2, "less": -2, "stop": -4}
        if reaction not in weights:
            raise ValueError("无效的主动分享反馈")
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            delivery = connection.execute(
                """
                SELECT delivery_id, source_event_id, topic
                FROM ai_life_proactive_deliveries
                WHERE delivery_id = ? AND owner_user_id = ? AND ai_id = ?
                  AND status = 'delivered'
                """,
                (delivery_id, owner_user_id, ai_id),
            ).fetchone()
            if not delivery:
                connection.rollback()
                return None
            previous = connection.execute(
                """
                SELECT feedback_id, reaction FROM ai_life_proactive_feedback
                WHERE delivery_id = ? AND owner_user_id = ?
                """,
                (delivery_id, owner_user_id),
            ).fetchone()
            old_reaction = previous["reaction"] if previous else None
            if old_reaction == reaction:
                preference = connection.execute(
                    """
                    SELECT * FROM ai_life_topic_preferences
                    WHERE owner_user_id = ? AND ai_id = ? AND topic = ?
                    """,
                    (owner_user_id, ai_id, delivery["topic"]),
                ).fetchone()
                enabled = connection.execute(
                    """
                    SELECT proactive_messages_enabled FROM ai_life_profiles
                    WHERE owner_user_id = ? AND ai_id = ?
                    """,
                    (owner_user_id, ai_id),
                ).fetchone()[0]
                connection.commit()
                return {
                    "delivery_id": delivery_id,
                    "reaction": reaction,
                    "topic": delivery["topic"],
                    "topic_score": preference["score"] if preference else 0,
                    "proactive_messages_enabled": bool(enabled),
                }

            now_iso = now.isoformat()
            if previous:
                connection.execute(
                    """
                    UPDATE ai_life_proactive_feedback
                    SET reaction = ?, updated_at = ? WHERE feedback_id = ?
                    """,
                    (reaction, now_iso, previous["feedback_id"]),
                )
            else:
                connection.execute(
                    """
                    INSERT INTO ai_life_proactive_feedback (
                        feedback_id, owner_user_id, ai_id, delivery_id,
                        source_event_id, topic, reaction, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        uuid.uuid4().hex,
                        owner_user_id,
                        ai_id,
                        delivery_id,
                        delivery["source_event_id"],
                        delivery["topic"],
                        reaction,
                        now_iso,
                        now_iso,
                    ),
                )
            score_delta = weights[reaction] - weights.get(old_reaction, 0)
            positive_delta = int(reaction == "more") - int(old_reaction == "more")
            negative_delta = int(reaction in {"less", "stop"}) - int(
                old_reaction in {"less", "stop"}
            )
            connection.execute(
                """
                INSERT INTO ai_life_topic_preferences (
                    owner_user_id, ai_id, topic, score,
                    positive_count, negative_count, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(owner_user_id, ai_id, topic) DO UPDATE SET
                    score = MAX(-10, MIN(10, score + excluded.score)),
                    positive_count = MAX(0, positive_count + excluded.positive_count),
                    negative_count = MAX(0, negative_count + excluded.negative_count),
                    updated_at = excluded.updated_at
                """,
                (
                    owner_user_id,
                    ai_id,
                    delivery["topic"],
                    score_delta,
                    positive_delta,
                    negative_delta,
                    now_iso,
                ),
            )
            if reaction == "stop":
                connection.execute(
                    """
                    UPDATE ai_life_profiles
                    SET proactive_messages_enabled = 0, updated_at = ?
                    WHERE owner_user_id = ? AND ai_id = ?
                    """,
                    (now_iso, owner_user_id, ai_id),
                )
            preference = connection.execute(
                """
                SELECT score FROM ai_life_topic_preferences
                WHERE owner_user_id = ? AND ai_id = ? AND topic = ?
                """,
                (owner_user_id, ai_id, delivery["topic"]),
            ).fetchone()
            enabled = connection.execute(
                """
                SELECT proactive_messages_enabled FROM ai_life_profiles
                WHERE owner_user_id = ? AND ai_id = ?
                """,
                (owner_user_id, ai_id),
            ).fetchone()[0]
            connection.commit()
            return {
                "delivery_id": delivery_id,
                "reaction": reaction,
                "topic": delivery["topic"],
                "topic_score": preference["score"],
                "proactive_messages_enabled": bool(enabled),
            }
        finally:
            connection.close()

    def list_proactive_deliveries(
        self, owner_user_id: str, ai_id: str = DEFAULT_AI_ID, *, limit: int = 10
    ) -> list[dict[str, Any]]:
        connection = self._connect()
        try:
            rows = connection.execute(
                """
                SELECT delivery_id, source_event_id, status, topic, claimed_at,
                       delivered_at, attempts, last_error
                FROM ai_life_proactive_deliveries
                WHERE owner_user_id = ? AND ai_id = ?
                ORDER BY claimed_at DESC LIMIT ?
                """,
                (owner_user_id, ai_id, max(1, min(50, limit))),
            ).fetchall()
            return [dict(row) for row in rows]
        finally:
            connection.close()

    def list_topic_preferences(
        self, owner_user_id: str, ai_id: str = DEFAULT_AI_ID
    ) -> list[dict[str, Any]]:
        connection = self._connect()
        try:
            rows = connection.execute(
                """
                SELECT topic, score, positive_count, negative_count, updated_at
                FROM ai_life_topic_preferences
                WHERE owner_user_id = ? AND ai_id = ?
                ORDER BY ABS(score) DESC, updated_at DESC
                """,
                (owner_user_id, ai_id),
            ).fetchall()
            return [dict(row) for row in rows]
        finally:
            connection.close()

    @staticmethod
    def _json(value: Any) -> str:
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))

    @staticmethod
    def _load_json(value: Optional[str], fallback: Any) -> Any:
        if not value:
            return fallback
        try:
            return json.loads(value)
        except (TypeError, json.JSONDecodeError):
            return fallback

    def _decode_profile(self, row: sqlite3.Row) -> dict[str, Any]:
        result = dict(row)
        result["profile"] = self._load_json(result.pop("profile_json"), {})
        for key in (
            "simulation_enabled",
            "social_posts_enabled",
            "diaries_enabled",
            "proactive_messages_enabled",
        ):
            result[key] = bool(result[key])
        return result

    def _decode_state(self, row: sqlite3.Row) -> dict[str, Any]:
        result = dict(row)
        result["mood"] = self._load_json(result.pop("mood_json"), {})
        result["active_goals"] = self._load_json(result.pop("active_goals_json"), [])
        result["obligations"] = self._load_json(result.pop("obligations_json"), [])
        return result

    def _decode_event(self, row: sqlite3.Row) -> dict[str, Any]:
        result = dict(row)
        result["actor_ai_ids"] = self._load_json(result.pop("actor_ai_ids_json"), [])
        result["participant_ids"] = self._load_json(result.pop("participant_ids_json"), [])
        result["facts"] = self._load_json(result.pop("facts_json"), {})
        result["emotion_delta"] = self._load_json(result.pop("emotion_delta_json"), {})
        result["follow_up_required"] = bool(result["follow_up_required"])
        return result

    def _decode_story_arc(self, row: sqlite3.Row) -> dict[str, Any]:
        result = dict(row)
        result["participant_ai_ids"] = self._load_json(
            result.pop("participant_ai_ids_json"), []
        )
        result["state"] = self._load_json(result.pop("state_json"), {})
        return result

    def get_acceptance_control(self, owner_user_id: str) -> Optional[dict[str, Any]]:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM ai_life_acceptance_controls WHERE owner_user_id = ?",
                (owner_user_id,),
            ).fetchone()
        return dict(row) if row else None

    def save_acceptance_control(
        self,
        owner_user_id: str,
        *,
        seed: str,
        virtual_now: datetime,
        started_at: datetime,
    ) -> dict[str, Any]:
        current = datetime.now(timezone.utc).isoformat()
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO ai_life_acceptance_controls
                    (owner_user_id, seed, virtual_now, started_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(owner_user_id) DO UPDATE SET
                    seed = excluded.seed,
                    virtual_now = excluded.virtual_now,
                    started_at = excluded.started_at,
                    updated_at = excluded.updated_at
                """,
                (
                    owner_user_id,
                    seed,
                    parse_datetime(virtual_now).isoformat(),
                    parse_datetime(started_at).isoformat(),
                    current,
                ),
            )
        control = self.get_acceptance_control(owner_user_id)
        if control is None:
            raise RuntimeError("验收时钟保存失败")
        return control

    def clear_acceptance_control(self, owner_user_id: str) -> None:
        with self._connect() as connection:
            connection.execute(
                "DELETE FROM ai_life_acceptance_controls WHERE owner_user_id = ?",
                (owner_user_id,),
            )

    def reset_acceptance_world(self, owner_user_id: str) -> None:
        """Delete only this owner's life-simulation world, preserving account data."""
        tables = (
            "ai_life_proactive_feedback",
            "ai_life_proactive_deliveries",
            "ai_life_topic_preferences",
            "ai_life_jobs",
            "ai_memory_entries",
            "ai_event_perspectives",
            "ai_life_events",
            "ai_story_arcs",
            "ai_relationships",
            "ai_interaction_events",
            "ai_actor_profiles",
            "ai_life_profiles",
        )
        with self._connect() as connection:
            for table in tables:
                connection.execute(
                    f"DELETE FROM {table} WHERE owner_user_id = ?",
                    (owner_user_id,),
                )

    def _decode_relationship(self, row: sqlite3.Row) -> dict[str, Any]:
        result = dict(row)
        result["evidence_event_ids"] = self._load_json(
            result.pop("evidence_event_ids_json"), []
        )
        return result

    def _decode_story_choice(self, row: sqlite3.Row) -> dict[str, Any]:
        result = dict(row)
        result["options"] = self._load_json(result.pop("options_json"), [])
        return result

    def _decode_life_intention(self, row: sqlite3.Row) -> dict[str, Any]:
        result = dict(row)
        result["effect"] = self._load_json(result.pop("effect_json"), {})
        result["conditions"] = self._load_json(result.pop("conditions_json"), {})
        return result

    def _decode_actor_profile(self, row: sqlite3.Row) -> dict[str, Any]:
        result = dict(row)
        result["profile_overrides"] = self._load_json(
            result.pop("profile_overrides_json"), {}
        )
        return result

    def _decode_actor_state(self, row: sqlite3.Row) -> dict[str, Any]:
        result = dict(row)
        result["mood"] = self._load_json(result.pop("mood_json"), {})
        result["active_goals"] = self._load_json(
            result.pop("active_goals_json"), []
        )
        return result

    def _decode_actor_schedule(self, row: sqlite3.Row) -> dict[str, Any]:
        result = dict(row)
        result["plan"] = self._load_json(result.pop("plan_json"), {})
        return result

    def _decode_actor_event(self, row: sqlite3.Row) -> dict[str, Any]:
        result = dict(row)
        result["facts"] = self._load_json(result.pop("facts_json"), {})
        return result

    def _decode_actor_intention(self, row: sqlite3.Row) -> dict[str, Any]:
        result = dict(row)
        result["decision_context"] = self._load_json(
            result.pop("decision_context_json"), {}
        )
        result["action"] = self._load_json(result.pop("action_json"), {})
        return result

    def _decode_actor_suggestion(self, row: sqlite3.Row) -> dict[str, Any]:
        result = dict(row)
        result["evaluation"] = self._load_json(result.pop("evaluation_json"), {})
        return result
