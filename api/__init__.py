"""API 模块"""
from .chart_api import router as chart_router
from .discovery_api import router as discovery_router
from .portfolio_api import router as portfolio_router
from .investment_api import router as investment_router
from .category_api import router as category_router
from .shadow_api import router as shadow_router

__all__ = [
    'chart_router', 
    'discovery_router', 
    'portfolio_router',
    'investment_router',
    'category_router',
    'shadow_router'
]
