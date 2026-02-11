"""Agent 包初始化"""

from .coordinator import create_coordinator_agent
from .quant import create_quant_agent
from .analyst import create_analyst_agent
from .advisor import create_advisor_agent
from .strategist import create_strategist_agent
from .intelligence_agent import create_intelligence_agent, IntelligenceAgentWrapper
from .shadow_analyst import create_shadow_analyst_agent, ShadowAnalystWrapper

__all__ = [
    "create_coordinator_agent",
    "create_quant_agent", 
    "create_analyst_agent",
    "create_advisor_agent",
    "create_strategist_agent",
    "create_intelligence_agent",
    "IntelligenceAgentWrapper",
    "create_shadow_analyst_agent",
    "ShadowAnalystWrapper"
]
