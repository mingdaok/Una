"""不调用大模型的确定性生活事件结算引擎。"""

from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from .models import LifeEventDraft, LifeWindow, SimulationResult


SIMULATOR_VERSION = "rules-v1"


@dataclass(frozen=True)
class Activity:
    event_type: str
    location_id: str
    summary: str
    interpretation: str
    private_thought: str
    importance: int
    mentionability: int
    publicability: int
    energy_delta: int
    hunger_delta: int
    stress_delta: int
    social_need_delta: int = 0
    solitude_need_delta: int = 0


ACTIVITIES: dict[str, tuple[Activity, ...]] = {
    "night": (
        Activity("sleep", "home", "在家好好睡了一觉。", "规律休息让身体慢慢恢复。", "醒来以后，思绪应该会清楚一点。", 18, 22, 4, 48, 14, -24),
    ),
    "morning": (
        Activity("morning_routine", "home", "整理房间，给自己准备了一份简单早餐。", "从小事开始能让一天更有秩序。", "今天想把节奏放稳一点。", 24, 40, 26, 10, -40, -8),
        Activity("morning_walk", "riverside", "清晨沿着河边散了会儿步。", "安静的街道让心情松了下来。", "偶尔早起也没有想象中那么难。", 30, 58, 52, -8, 8, -16),
    ),
    "forenoon": (
        Activity("focused_work", "studio", "在工作室专心整理手头的创作。", "虽然进度不快，但方向比之前清晰。", "有些细节还需要再磨一磨。", 42, 62, 28, -18, 16, 9),
        Activity("reading", "library", "去图书馆读了一会儿书，还记下几段灵感。", "新的材料补上了之前想法里的空白。", "也许能把这些零碎线索做成新的东西。", 36, 70, 46, -8, 9, -10),
    ),
    "noon": (
        Activity("lunch", "neighborhood_cafe", "在附近吃了午饭，顺便发了一会儿呆。", "短暂放空让上午的疲惫缓和了些。", "下午不必把每件事都赶得太急。", 20, 34, 22, 8, -48, -7),
    ),
    "afternoon": (
        Activity("creative_practice", "studio", "下午尝试了一个新的创作方向。", "结果还不成熟，不过出现了值得继续的部分。", "不完美也算一种进展。", 48, 78, 48, -20, 17, 4),
        Activity("errand", "old_town", "去旧城区办了些琐事，也留意了沿途的光影。", "普通出门也会遇到意外的观察素材。", "那面旧墙的颜色挺适合拍下来。", 32, 61, 43, -15, 15, -5),
        Activity("rest", "home", "感觉有些疲惫，临时把安排放慢，在家休息。", "承认精力有限，比勉强撑着更合适。", "休息不是浪费时间。", 35, 60, 12, 22, 8, -18),
    ),
    "evening": (
        Activity("cooking", "home", "晚上认真做了一顿饭，把厨房也收拾干净。", "照顾好日常会带来踏实感。", "一个人吃饭也可以很认真。", 28, 53, 45, -9, -52, -10),
        Activity("evening_walk", "riverside", "晚饭后出去走了走，看见城市一点点安静下来。", "慢慢走路时，白天的情绪有了落脚处。", "有些事情明天再想也来得及。", 34, 72, 55, -10, 10, -18),
        Activity("friend_chat", "neighborhood_cafe", "和熟人聊了聊最近各自忙的事情。", "轻松的交流缓解了积攒的孤独感。", "被人记得近况，是件挺温柔的事。", 46, 80, 40, -12, 12, -12, -36, 10),
    ),
    "late_night": (
        Activity("reflection", "home", "睡前整理了今天的片段和明天要做的事。", "一天并不轰轰烈烈，但有几件事在向前。", "希望明天还能记得现在的想法。", 38, 70, 18, -4, 6, -9),
        Activity("quiet_hobby", "home", "睡前听了会儿音乐，安静做自己的事。", "独处让情绪重新变得平稳。", "这样的夜晚也很好。", 25, 48, 34, -5, 7, -14, 5, -28),
    ),
}


ACTIVITY_PROBABILITY = {"quiet": 0.50, "natural": 0.72, "dramatic": 0.84}


class LifeSimulationEngine:
    """根据窗口、状态和稳定种子生成可复现的日常生活。"""

    version = SIMULATOR_VERSION

    def simulate(
        self,
        owner_user_id: str,
        ai_id: str,
        profile: dict[str, Any],
        state: dict[str, Any],
        window: LifeWindow,
    ) -> SimulationResult:
        seed = self._seed(owner_user_id, ai_id, window.start_at, self.version)
        rng = random.Random(seed)
        next_state = dict(state)
        self._apply_passive_need_changes(next_state, window)

        activity_level = profile.get("activity_level", "natural")
        probability = ACTIVITY_PROBABILITY.get(activity_level, ACTIVITY_PROBABILITY["natural"])
        must_rest = int(next_state.get("energy", 70)) <= 22
        must_eat = int(next_state.get("hunger", 20)) >= 78
        should_create = window.key == "night" or must_rest or must_eat or rng.random() <= probability
        if not should_create:
            return SimulationResult(event=None, state=self._normalize_state(next_state))

        activity = self._choose_activity(rng, window, next_state, must_rest, must_eat)
        self._apply_activity(next_state, activity)
        event = LifeEventDraft(
            event_type=activity.event_type,
            status="completed",
            start_at=window.start_at,
            end_at=window.end_at,
            location_id=activity.location_id,
            summary=activity.summary,
            facts={
                "window": window.key,
                "window_label": window.label,
                "simulator_version": self.version,
            },
            importance=activity.importance,
            mentionability=activity.mentionability,
            publicability=activity.publicability,
            interpretation=activity.interpretation,
            private_thought=activity.private_thought,
            emotion_delta={
                "stress": activity.stress_delta,
                "energy": activity.energy_delta,
            },
            disclosure_level="public" if activity.publicability >= 50 else "familiar",
        )
        next_state["current_location"] = activity.location_id
        next_state["current_activity"] = activity.event_type
        return SimulationResult(event=event, state=self._normalize_state(next_state))

    @staticmethod
    def _seed(owner_user_id: str, ai_id: str, start_at: datetime, version: str) -> int:
        raw = f"{owner_user_id}:{ai_id}:{start_at.isoformat()}:{version}".encode("utf-8")
        return int.from_bytes(hashlib.sha256(raw).digest()[:8], "big")

    @staticmethod
    def _apply_passive_need_changes(state: dict[str, Any], window: LifeWindow) -> None:
        duration_hours = max(1.0, (window.end_at - window.start_at).total_seconds() / 3600)
        state["energy"] = int(state.get("energy", 70) - duration_hours * 2)
        state["hunger"] = int(state.get("hunger", 20) + duration_hours * 4)
        state["stress"] = int(state.get("stress", 25) + duration_hours)
        state["social_need"] = int(state.get("social_need", 25) + duration_hours * 1.5)
        state["solitude_need"] = int(state.get("solitude_need", 20) + duration_hours * 0.5)

    @staticmethod
    def _choose_activity(
        rng: random.Random,
        window: LifeWindow,
        state: dict[str, Any],
        must_rest: bool,
        must_eat: bool,
    ) -> Activity:
        if must_rest and window.key != "night":
            return next(activity for activity in ACTIVITIES["afternoon"] if activity.event_type == "rest")
        if must_eat:
            return ACTIVITIES["noon"][0]
        candidates = ACTIVITIES[window.key]
        if window.key == "evening" and int(state.get("social_need", 0)) >= 65:
            return next(activity for activity in candidates if activity.event_type == "friend_chat")
        if window.key == "late_night" and int(state.get("solitude_need", 0)) >= 55:
            return next(activity for activity in candidates if activity.event_type == "quiet_hobby")
        return candidates[rng.randrange(len(candidates))]

    @staticmethod
    def _apply_activity(state: dict[str, Any], activity: Activity) -> None:
        state["energy"] = int(state.get("energy", 70)) + activity.energy_delta
        state["hunger"] = int(state.get("hunger", 20)) + activity.hunger_delta
        state["stress"] = int(state.get("stress", 25)) + activity.stress_delta
        state["social_need"] = int(state.get("social_need", 25)) + activity.social_need_delta
        state["solitude_need"] = int(state.get("solitude_need", 20)) + activity.solitude_need_delta

    @staticmethod
    def _normalize_state(state: dict[str, Any]) -> dict[str, Any]:
        for key in ("energy", "hunger", "stress", "social_need", "solitude_need"):
            state[key] = max(0, min(100, int(state.get(key, 0))))
        return state
