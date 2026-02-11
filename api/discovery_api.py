"""基金发现 API 端点

Robinhood 风格的基金发现功能：
- Daily Movers (涨跌榜/热度榜)
- AI 简报
- 标签发现
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List

router = APIRouter(prefix="/api/discovery", tags=["discovery"])


@router.get("/movers")
async def get_daily_movers(limit: int = Query(10, ge=1, le=50)):
    """获取 Daily Movers
    
    Returns:
        - top_gainers: 涨幅榜
        - top_losers: 跌幅榜
        - most_popular: 热度榜
        - fund_flows: 资金流向
    """
    from services.discovery_service import get_discovery_service
    
    service = get_discovery_service()
    return await service.get_daily_movers(limit)


@router.get("/brief/{fund_code}")
async def get_fund_brief(fund_code: str):
    """获取 AI 简报 (Cortex Style)
    
    返回3条简洁的涨跌原因
    """
    from services.discovery_service import get_discovery_service
    
    service = get_discovery_service()
    brief = await service.generate_brief(fund_code)
    return brief.to_dict()


@router.get("/tags")
async def get_all_tags():
    """获取所有标签"""
    from services.discovery_service import get_discovery_service
    
    service = get_discovery_service()
    return {"tags": service.get_all_tags()}


@router.get("/tags/{tag_slug}/funds")
async def get_funds_by_tag(
    tag_slug: str,
    limit: int = Query(20, ge=1, le=100)
):
    """通过标签发现基金"""
    from services.discovery_service import get_discovery_service
    
    service = get_discovery_service()
    funds = service.get_funds_by_tag(tag_slug, limit)
    return {"tag": tag_slug, "funds": funds}


@router.get("/fund/{fund_code}/tags")
async def get_fund_tags(fund_code: str):
    """获取基金的标签"""
    from services.discovery_service import get_discovery_service
    
    service = get_discovery_service()
    return {"fund_code": fund_code, "tags": service.get_fund_tags(fund_code)}


@router.post("/fund/{fund_code}/tag")
async def add_fund_tag(
    fund_code: str,
    tag_slug: str = Query(..., description="标签slug"),
    confidence: float = Query(1.0, ge=0, le=1)
):
    """为基金添加标签"""
    from services.discovery_service import get_discovery_service
    
    service = get_discovery_service()
    service.add_fund_tag(fund_code, tag_slug, confidence)
    return {"status": "success", "fund_code": fund_code, "tag": tag_slug}


@router.post("/track/search/{fund_code}")
async def track_search(fund_code: str):
    """记录搜索热度"""
    from services.discovery_service import get_discovery_service
    
    service = get_discovery_service()
    service.record_search(fund_code)
    return {"status": "tracked"}


@router.post("/track/view/{fund_code}")
async def track_view(fund_code: str):
    """记录浏览热度"""
    from services.discovery_service import get_discovery_service
    
    service = get_discovery_service()
    service.record_view(fund_code)
    return {"status": "tracked"}
