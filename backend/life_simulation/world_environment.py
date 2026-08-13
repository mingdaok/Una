"""Deterministic locations, travel, weather, and low-frequency world opportunities."""

from __future__ import annotations

import hashlib
from dataclasses import replace
from datetime import datetime, time, timedelta
from typing import Any, Iterable

from .candidates import ActionCandidate
from .clock import parse_datetime
from .models import LifeWindow
from .store import LifeStore


LOCATION_DEFINITIONS: dict[str, dict[str, Any]] = {
    "home": {"hours": ("00:00", "24:00"), "exposure": "indoor", "comfort": 0.95},
    "online": {"hours": ("00:00", "24:00"), "exposure": "indoor", "comfort": 0.85},
    "personal_space": {"hours": ("00:00", "24:00"), "exposure": "indoor", "comfort": 0.90},
    "old_bookstore": {"weekday": ("09:30", "20:00"), "weekend": ("10:00", "21:00"), "exposure": "indoor", "comfort": 0.72},
    "neighborhood_cafe": {"hours": ("08:00", "22:00"), "exposure": "indoor", "comfort": 0.76},
    "library_cafe": {"hours": ("09:00", "21:00"), "exposure": "indoor", "comfort": 0.78},
    "gallery": {"hours": ("10:00", "19:00"), "exposure": "indoor", "comfort": 0.62},
    "studio": {"hours": ("07:00", "23:00"), "exposure": "indoor", "comfort": 0.80},
    "workshop": {"hours": ("07:00", "23:00"), "exposure": "indoor", "comfort": 0.68},
    "neighborhood_shop": {"hours": ("08:00", "21:00"), "exposure": "indoor", "comfort": 0.66},
    "hardware_market": {"hours": ("08:00", "18:00"), "exposure": "covered", "comfort": 0.48},
    "old_street_market": {"hours": ("07:00", "19:00"), "exposure": "outdoor", "comfort": 0.50},
    "old_town": {"hours": ("06:00", "23:00"), "exposure": "outdoor", "comfort": 0.58},
    "riverside": {"hours": ("05:00", "23:00"), "exposure": "outdoor", "comfort": 0.65},
    "riverside_route": {"hours": ("05:00", "23:00"), "exposure": "outdoor", "comfort": 0.55},
    "south_bridge": {"hours": ("05:00", "23:30"), "exposure": "outdoor", "comfort": 0.52},
    "neighborhood": {"hours": ("00:00", "24:00"), "exposure": "outdoor", "comfort": 0.70},
    "city": {"hours": ("00:00", "24:00"), "exposure": "mixed", "comfort": 0.55},
}

TRAVEL_FROM_HOME = {
    "home": 0, "online": 0, "personal_space": 0,
    "neighborhood": 8, "neighborhood_shop": 10, "neighborhood_cafe": 15,
    "old_bookstore": 25, "old_street_market": 22, "old_town": 28,
    "library_cafe": 24, "gallery": 32, "studio": 20, "workshop": 25,
    "hardware_market": 30, "riverside": 24, "riverside_route": 22,
    "south_bridge": 30, "city": 30,
}

OPPORTUNITY_TEMPLATES = (
    {"key": "book_exchange", "title": "旧书交换角今天开放", "location": "old_bookstore", "action": "explore", "tags": ("quiet", "novelty")},
    {"key": "riverside_market", "title": "河边临时小市集", "location": "riverside", "action": "explore", "tags": ("outdoor", "novelty")},
    {"key": "open_workshop", "title": "工作室开放体验时段", "location": "workshop", "action": "focus_project", "tags": ("productive", "novelty")},
)


class WorldEnvironment:
    def __init__(self, store: LifeStore):
        self.store = store

    @staticmethod
    def is_location_open(location_id: str, at: datetime) -> bool:
        definition = LOCATION_DEFINITIONS.get(location_id)
        if definition is None:
            return True
        hours = definition.get("weekend" if at.weekday() >= 5 else "weekday")
        hours = hours or definition.get("hours", ("00:00", "24:00"))
        minute = at.hour * 60 + at.minute
        start = WorldEnvironment._minute(hours[0])
        end = WorldEnvironment._minute(hours[1])
        return start <= minute < end

    @staticmethod
    def travel_minutes(origin: str, destination: str) -> int:
        if origin == destination or {origin, destination} <= {"home", "online", "personal_space"}:
            return 0
        origin_cost = TRAVEL_FROM_HOME.get(origin, 20)
        destination_cost = TRAVEL_FROM_HOME.get(destination, 20)
        if origin == "home":
            return destination_cost
        if destination == "home":
            return origin_cost
        return max(8, min(45, abs(origin_cost - destination_cost) + 10))

    @staticmethod
    def weather_for(owner_user_id: str, at: datetime) -> dict[str, Any]:
        roll = WorldEnvironment._seed(owner_user_id, at.date().isoformat(), "weather") % 100
        if roll < 8:
            condition, severity = "heavy_rain", 3
        elif roll < 27:
            condition, severity = "rain", 2
        elif roll < 50:
            condition, severity = "cloudy", 1
        elif roll < 58:
            condition, severity = "hot", 2
        else:
            condition, severity = "clear", 0
        return {"condition": condition, "severity": severity, "source": "deterministic_daily"}

    def materialize_opportunities(
        self, owner_user_id: str, start: datetime, end: datetime, *, now: datetime,
    ) -> list[dict[str, Any]]:
        cursor = datetime.combine(start.date(), time.min, tzinfo=start.tzinfo)
        while cursor < end:
            ordinal = cursor.date().toordinal()
            if self._seed(owner_user_id, ordinal, "public") % 100 < 68:
                template = OPPORTUNITY_TEMPLATES[
                    self._seed(owner_user_id, ordinal, "template") % len(OPPORTUNITY_TEMPLATES)
                ]
                self._ensure_template(owner_user_id, cursor, template, "public_event", now)
            if self._seed(owner_user_id, ordinal, "unexpected") % 100 < 12:
                iso_year, iso_week, _ = cursor.date().isocalendar()
                cooldown_key = f"unexpected:street_performance:{iso_year}-W{iso_week:02d}"
                if not self.store.list_world_opportunities(
                    owner_user_id, cooldown_key=cooldown_key, limit=1
                ):
                    self._ensure_template(
                        owner_user_id, cursor,
                        {"key": "street_performance", "title": "转角遇到一场临时街头演出", "location": "old_town", "action": "explore", "tags": ("outdoor", "social", "novelty")},
                        "unexpected", now, cooldown_key=cooldown_key,
                    )
            cursor += timedelta(days=1)
        return self.store.list_world_opportunities(
            owner_user_id, after=start.isoformat(), before=end.isoformat(), limit=500
        )

    def context_for(
        self, owner_user_id: str, window: LifeWindow, state: dict[str, Any]
    ) -> dict[str, Any]:
        opportunities = self.store.list_world_opportunities(
            owner_user_id, after=window.start_at.isoformat(),
            before=window.end_at.isoformat(), status="available", limit=50,
        )
        return {
            "weather": self.weather_for(owner_user_id, window.start_at),
            "origin_location": state.get("current_location", "home"),
            "window_start": window.start_at,
            "opportunities": opportunities,
        }

    def enrich_candidates(
        self, candidates: Iterable[ActionCandidate], context: dict[str, Any]
    ) -> tuple[ActionCandidate, ...]:
        weather = context["weather"]
        origin = context.get("origin_location", "home")
        at = context["window_start"]
        enriched = []
        for candidate in candidates:
            location = LOCATION_DEFINITIONS.get(candidate.location_id, {})
            exposure = location.get("exposure", "mixed")
            blocked = weather["condition"] == "heavy_rain" and exposure == "outdoor"
            weather_fit = 0
            if weather["condition"] in {"rain", "heavy_rain"}:
                weather_fit = 6 if exposure == "indoor" else -10
            elif weather["condition"] == "clear" and exposure == "outdoor":
                weather_fit = 7
            metadata = {
                **candidate.metadata,
                "location_open": self.is_location_open(candidate.location_id, at),
                "travel_minutes": self.travel_minutes(origin, candidate.location_id),
                "weather_condition": weather["condition"],
                "weather_blocked": blocked,
                "weather_fit": weather_fit,
                "location_comfort": float(location.get("comfort", 0.6)),
            }
            enriched.append(replace(candidate, metadata=metadata))
        return tuple(enriched)

    def _ensure_template(
        self, owner: str, day: datetime, template: dict[str, Any],
        opportunity_type: str, now: datetime, cooldown_key: str | None = None,
    ) -> None:
        starts_at = day + timedelta(hours=14)
        ends_at = starts_at + timedelta(hours=3)
        key = f"{owner}:{day.date().isoformat()}:{template['key']}"
        self.store.ensure_world_opportunity(
            owner,
            opportunity={
                "opportunity_id": hashlib.sha256(key.encode("utf-8")).hexdigest()[:32],
                "opportunity_type": opportunity_type,
                "title": template["title"], "starts_at": starts_at,
                "ends_at": ends_at, "location_id": template["location"],
                "action_type": template["action"], "tags": list(template["tags"]),
                "cooldown_key": cooldown_key,
                "metadata": {"template_key": template["key"], "environment_bonus": 25},
            },
            now=now,
        )

    @staticmethod
    def _minute(value: str) -> int:
        if value == "24:00":
            return 24 * 60
        hour, minute = value.split(":", 1)
        return int(hour) * 60 + int(minute)

    @staticmethod
    def _seed(*parts: Any) -> int:
        return int.from_bytes(
            hashlib.sha256(":".join(map(str, parts)).encode("utf-8")).digest()[:8],
            "big",
        )


__all__ = ["LOCATION_DEFINITIONS", "WorldEnvironment"]
