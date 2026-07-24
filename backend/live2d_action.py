"""Live2D 表演计划的协议校验和自动触发策略。"""

import secrets
import time
import uuid


INTENTS = frozenset({
    "warm_listening",
    "thinking",
    "shy_happy",
    "happy_surprise",
    "gentle_comfort",
    "sad_support",
    "encouraging",
    "curious_question",
})
EXPRESSIONS = frozenset({"subtle", "expressive"})
TIMINGS = frozenset({"reply_start", "after_sentence", "reply_end"})
EXPRESSIVE_INTENTS = frozenset({"happy_surprise", "gentle_comfort", "sad_support"})


def parse_action_plan(payload):
    """将不可信的模型输出规范为可执行的语义动作计划。"""
    if not isinstance(payload, dict) or payload.get("intent") not in INTENTS:
        return None

    try:
        intensity = min(1.0, max(0.0, float(payload.get("intensity", 0.0))))
        duration_ms = min(2500, max(400, int(payload.get("duration_ms", 900))))
    except (TypeError, ValueError):
        return None

    expression = payload.get("expression", "subtle")
    timing = payload.get("timing", "after_sentence")
    if expression not in EXPRESSIONS or timing not in TIMINGS:
        return None

    seed = payload.get("variation_seed", secrets.randbelow(2 ** 31))
    if not isinstance(seed, int) or seed < 0:
        return None

    return {
        "intent": payload["intent"],
        "intensity": intensity,
        "expression": expression,
        "timing": timing,
        "duration_ms": duration_ms,
        "variation_seed": seed,
    }


class ActionDirector:
    """根据用户会话节奏决定是否将语义动作推送到前端。"""

    def __init__(self, clock=time.monotonic, id_factory=lambda: str(uuid.uuid4())):
        self.clock = clock
        self.id_factory = id_factory
        self._states = {}

    def decide(self, user_id, plan):
        plan = parse_action_plan(plan)
        if plan is None:
            return None

        now = self.clock()
        state = self._states.setdefault(user_id, {
            "last_action_at": float("-inf"),
            "last_expressive_at": float("-inf"),
            "consecutive_actions": 0,
        })
        is_qualified_expressive = (
            plan["expression"] == "expressive"
            and plan["intent"] in EXPRESSIVE_INTENTS
            and plan["intensity"] >= 0.7
        )
        if plan["expression"] == "expressive" and not is_qualified_expressive:
            plan["expression"] = "subtle"

        if now - state["last_action_at"] < 3.0:
            return None
        if plan["expression"] == "expressive" and now - state["last_expressive_at"] < 8.0:
            return None
        if state["consecutive_actions"] >= 3 and plan["expression"] != "expressive":
            return None

        state["last_action_at"] = now
        if plan["expression"] == "expressive":
            state["last_expressive_at"] = now
            state["consecutive_actions"] = 1
        else:
            state["consecutive_actions"] += 1

        return {
            "type": "live2d_action_v2",
            "action_id": self.id_factory(),
            **plan,
        }
