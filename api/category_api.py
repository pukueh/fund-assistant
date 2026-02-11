"""板块分类 API 端点

CoinGecko 风格的板块系统：
- 多维度标签
- 板块指数
- Top Categories
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("/")
async def get_all_categories():
    """获取所有板块"""
    from services.category_service import get_category_service
    
    service = get_category_service()
    categories = service.get_all_categories()
    return {"categories": [c.to_dict() for c in categories]}


@router.get("/top")
async def get_top_categories(limit: int = Query(10, ge=1, le=50)):
    """获取热门板块排行
    
    Returns:
        - top_gainers: 涨幅最高板块
        - top_losers: 跌幅最大板块
        - most_funds: 基金最多板块
    """
    from services.category_service import get_category_service
    
    service = get_category_service()
    return await service.get_top_categories(limit)


@router.get("/{slug}")
async def get_category(slug: str):
    """获取单个板块详情"""
    from services.category_service import get_category_service
    
    service = get_category_service()
    category = service.get_category_by_slug(slug)
    
    if not category:
        raise HTTPException(status_code=404, detail="板块不存在")
    
    return category.to_dict()


@router.get("/{slug}/funds")
async def get_category_funds(
    slug: str,
    limit: int = Query(50, ge=1, le=100)
):
    """获取板块内的基金列表"""
    from services.category_service import get_category_service
    
    service = get_category_service()
    funds = service.get_category_funds(slug, limit)
    return {"category": slug, "funds": funds}


@router.get("/{slug}/index")
async def get_category_index(slug: str):
    """获取板块指数（实时计算）"""
    from services.category_service import get_category_service
    
    service = get_category_service()
    category = service.get_category_by_slug(slug)
    
    if not category:
        raise HTTPException(status_code=404, detail="板块不存在")
    
    index_data = await service.calculate_category_index(category.id)
    return {
        "category": slug,
        "index": index_data
    }


@router.post("/{slug}/funds/{fund_code}")
async def add_fund_to_category(
    slug: str,
    fund_code: str,
    weight: float = Query(1.0, ge=0.1, le=10.0)
):
    """将基金添加到板块"""
    from services.category_service import get_category_service
    
    service = get_category_service()
    service.add_fund_to_category(fund_code, slug, weight)
    return {
        "status": "added",
        "category": slug,
        "fund_code": fund_code,
        "weight": weight
    }


@router.get("/fund/{fund_code}")
async def get_fund_categories(fund_code: str):
    """获取基金所属的板块（多维度标签）"""
    from services.category_service import get_category_service
    
    service = get_category_service()
    categories = service.get_fund_categories(fund_code)
    return {
        "fund_code": fund_code,
        "categories": [c.to_dict() for c in categories]
    }


@router.post("/refresh")
async def refresh_all_indices():
    """刷新所有板块指数（管理员）"""
    from services.category_service import get_category_service
    
    service = get_category_service()
    await service.refresh_all_indices()
    return {"status": "refreshed"}
