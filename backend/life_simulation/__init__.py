"""UNA 服务端生活模拟领域包。"""

from .engine import LifeSimulationEngine
from .choices import LifeChoiceService
from .character_registry import CharacterRegistry, load_character_catalog
from .npc_life import NpcLifeService, NpcSettlementReport
from .npc_interactions import InteractionSettlementReport, NpcInteractionService
from .npc_intentions import NpcIntentionService, NpcIntentionSettlementReport
from .npc_suggestions import NpcSuggestionService, NpcSuggestionSettlementReport
from .relationship_dynamics import RelationshipDynamics
from .intention_executor import IntentionExecutor
from .proactive import LifeProactiveService, ProactiveLifeShare
from .service import LifeSettlementService
from .store import LifeStore

__all__ = [
    "LifeProactiveService",
    "LifeChoiceService",
    "CharacterRegistry",
    "IntentionExecutor",
    "LifeSimulationEngine",
    "LifeSettlementService",
    "LifeStore",
    "ProactiveLifeShare",
    "load_character_catalog",
    "NpcLifeService",
    "NpcSettlementReport",
    "NpcInteractionService",
    "InteractionSettlementReport",
    "NpcIntentionService",
    "NpcIntentionSettlementReport",
    "NpcSuggestionService",
    "NpcSuggestionSettlementReport",
    "RelationshipDynamics",
]
