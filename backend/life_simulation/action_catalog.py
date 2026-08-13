"""Validated action atoms used by the NPC agency decision engine."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Mapping


STATE_METRICS = {
    "energy",
    "hunger",
    "stress",
    "social_need",
    "solitude_need",
    "boredom",
    "focus",
    "confidence",
    "comfort",
}


@dataclass(frozen=True)
class ActionAtomDefinition:
    action_type: str
    categories: tuple[str, ...]
    allowed_locations: tuple[str, ...]
    duration_minutes: tuple[int, int]
    base_cost: dict[str, int]
    base_effect: dict[str, int]
    requirements: dict[str, int]
    window_keys: tuple[str, ...]
    summary_templates: tuple[str, ...]
    required_resources: tuple[str, ...] = ()
    risk_level: str = "ordinary"


class ActionCatalog:
    def __init__(self, atoms: Iterable[ActionAtomDefinition]):
        normalized = tuple(atoms)
        if not normalized:
            raise ValueError("action_atoms 至少需要一个行动原子")
        self._by_type: dict[str, ActionAtomDefinition] = {}
        for atom in normalized:
            self._validate(atom)
            if atom.action_type in self._by_type:
                raise ValueError(f"行动原子 ID 重复: {atom.action_type}")
            self._by_type[atom.action_type] = atom
        self.atoms = normalized

    def get(self, action_type: str) -> ActionAtomDefinition | None:
        return self._by_type.get(action_type)

    def for_window(self, window_key: str) -> tuple[ActionAtomDefinition, ...]:
        return tuple(
            atom
            for atom in self.atoms
            if not atom.window_keys or window_key in atom.window_keys
        )

    @staticmethod
    def _validate(atom: ActionAtomDefinition) -> None:
        if not atom.action_type.strip():
            raise ValueError("行动原子缺少 action_type")
        if not atom.allowed_locations:
            raise ValueError(f"行动原子 {atom.action_type} 缺少 allowed_locations")
        minimum, maximum = atom.duration_minutes
        if minimum <= 0 or maximum < minimum:
            raise ValueError(f"行动原子 {atom.action_type} 的时长范围无效")
        if not atom.summary_templates:
            raise ValueError(f"行动原子 {atom.action_type} 缺少 summary_templates")
        unknown = (set(atom.base_cost) | set(atom.base_effect)) - STATE_METRICS
        if unknown:
            raise ValueError(
                f"行动原子 {atom.action_type} 包含未知状态字段: {sorted(unknown)}"
            )
        allowed_requirements = {f"min_{name}" for name in STATE_METRICS}
        unknown_requirements = set(atom.requirements) - allowed_requirements
        if unknown_requirements:
            raise ValueError(
                f"行动原子 {atom.action_type} 包含未知约束: "
                f"{sorted(unknown_requirements)}"
            )
        if atom.risk_level not in {"ordinary", "major"}:
            raise ValueError(
                f"行动原子 {atom.action_type} 的 risk_level 必须是 ordinary 或 major"
            )


def parse_action_atoms(raw_atoms: Any) -> ActionCatalog:
    if not isinstance(raw_atoms, Mapping):
        raise ValueError("action_atoms 必须是对象")
    atoms = []
    for action_type, raw in raw_atoms.items():
        if not isinstance(raw, Mapping):
            raise ValueError(f"行动原子 {action_type} 必须是对象")
        duration = raw.get("duration_minutes", (20, 60))
        if not isinstance(duration, (list, tuple)) or len(duration) != 2:
            raise ValueError(f"行动原子 {action_type} 的 duration_minutes 必须有两个值")
        atoms.append(
            ActionAtomDefinition(
                action_type=str(action_type).strip(),
                categories=tuple(str(item).strip() for item in raw.get("categories", ())),
                allowed_locations=tuple(
                    str(item).strip() for item in raw.get("allowed_locations", ())
                ),
                duration_minutes=(int(duration[0]), int(duration[1])),
                base_cost={
                    str(key): int(value)
                    for key, value in (raw.get("base_cost") or {}).items()
                },
                base_effect={
                    str(key): int(value)
                    for key, value in (raw.get("base_effect") or {}).items()
                },
                requirements={
                    str(key): int(value)
                    for key, value in (raw.get("requirements") or {}).items()
                },
                window_keys=tuple(
                    str(item).strip() for item in raw.get("window_keys", ())
                ),
                summary_templates=tuple(
                    str(item).strip()
                    for item in raw.get("summary_templates", ())
                    if str(item).strip()
                ),
                required_resources=tuple(
                    str(item).strip()
                    for item in raw.get("required_resources", ())
                    if str(item).strip()
                ),
                risk_level=str(raw.get("risk_level", "ordinary")).strip(),
            )
        )
    return ActionCatalog(atoms)


__all__ = ["ActionAtomDefinition", "ActionCatalog", "parse_action_atoms"]
