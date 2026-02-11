"""影子基金经理追踪 API

端点：
- 博主管理
- 持仓获取
- 业绩分析
- 排行榜
"""

from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/shadow", tags=["shadow"])


def get_current_user_id():
    return 1


# ============ 请求模型 ============

class AddBloggerRequest(BaseModel):
    platform: str  # xueqiu/wechat/twitter
    platform_id: str
    name: str
    description: str = ""


class ExtractHoldingsRequest(BaseModel):
    text: str


# ============ 博主管理 ============

@router.post("/track")
async def add_blogger_to_track(request: AddBloggerRequest):
    """添加追踪博主"""
    from services.shadow_tracker_service import get_shadow_service
    
    service = get_shadow_service()
    blogger_id = service.add_blogger(
        platform=request.platform,
        platform_id=request.platform_id,
        name=request.name,
        description=request.description
    )
    
    return {
        "status": "tracking",
        "blogger_id": blogger_id,
        "name": request.name
    }


@router.get("/bloggers")
async def list_bloggers(active_only: bool = Query(True)):
    """列出追踪的博主"""
    from services.shadow_tracker_service import get_shadow_service
    
    service = get_shadow_service()
    bloggers = service.list_bloggers(active_only)
    return {"bloggers": [b.to_dict() for b in bloggers]}


@router.get("/bloggers/{blogger_id}")
async def get_blogger(blogger_id: int):
    """获取博主详情"""
    from services.shadow_tracker_service import get_shadow_service
    
    service = get_shadow_service()
    blogger = service.get_blogger(blogger_id)
    
    if not blogger:
        raise HTTPException(status_code=404, detail="博主不存在")
    
    return blogger.to_dict()


@router.delete("/bloggers/{blogger_id}")
async def stop_tracking(blogger_id: int):
    """停止追踪博主"""
    from services.shadow_tracker_service import get_shadow_service
    import sqlite3
    
    service = get_shadow_service()
    conn = sqlite3.connect(service.db_path)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE bloggers SET is_active = 0 WHERE id = ?",
        (blogger_id,)
    )
    conn.commit()
    conn.close()
    
    return {"status": "stopped", "blogger_id": blogger_id}


# ============ 持仓获取 ============

@router.get("/{blogger_id}/portfolio")
async def get_blogger_portfolio(blogger_id: int):
    """获取博主影子组合"""
    from services.shadow_tracker_service import get_shadow_service
    
    service = get_shadow_service()
    portfolio = service.build_shadow_portfolio(blogger_id)
    return portfolio.to_dict()


@router.post("/{blogger_id}/fetch")
async def fetch_latest_holdings(blogger_id: int):
    """抓取博主最新持仓"""
    from services.shadow_tracker_service import get_shadow_service
    
    service = get_shadow_service()
    holdings = await service.fetch_and_extract(blogger_id)
    
    return {
        "status": "fetched",
        "blogger_id": blogger_id,
        "holdings_count": len(holdings),
        "holdings": [h.to_dict() for h in holdings]
    }


@router.post("/extract")
async def extract_holdings_from_text(request: ExtractHoldingsRequest):
    """从文本中提取持仓信息（LLM）"""
    from services.shadow_tracker_service import HoldingExtractor
    
    extractor = HoldingExtractor()
    holdings = extractor.extract_from_text(request.text)
    
    return {
        "extracted_count": len(holdings),
        "holdings": holdings
    }


# ============ 业绩分析 ============

@router.get("/{blogger_id}/performance")
async def get_blogger_performance(
    blogger_id: int,
    period: str = Query("3M", pattern="^(1M|3M|6M|1Y)$")
):
    """获取博主业绩归因分析"""
    from services.shadow_tracker_service import get_shadow_service
    
    service = get_shadow_service()
    metrics = await service.analyze_performance(blogger_id, period)
    
    return {
        "blogger_id": blogger_id,
        "period": period,
        "metrics": metrics.to_dict()
    }


@router.get("/{blogger_id}/evaluate")
async def evaluate_blogger(blogger_id: int):
    """评估博主是否值得跟投"""
    from agents.shadow_analyst import ShadowAnalystWrapper
    
    analyst = ShadowAnalystWrapper()
    evaluation = analyst.should_follow(blogger_id)
    
    return evaluation


# ============ 排行榜 ============

@router.get("/ranking")
async def get_blogger_ranking(
    period: str = Query("3M", pattern="^(1M|3M|6M|1Y)$"),
    sort_by: str = Query("alpha", pattern="^(alpha|total_return|sharpe_ratio|win_rate)$"),
    limit: int = Query(20, ge=1, le=100)
):
    """获取博主排行榜"""
    from services.shadow_tracker_service import get_shadow_service
    
    service = get_shadow_service()
    ranking = service.get_blogger_ranking(period, sort_by, limit)
    
    return {
        "period": period,
        "sort_by": sort_by,
        "ranking": ranking
    }


@router.get("/top-picks")
async def get_top_picks(limit: int = Query(5, ge=1, le=20)):
    """获取最值得关注的博主"""
    from services.shadow_tracker_service import get_shadow_service
    
    service = get_shadow_service()
    
    # 综合 alpha 和 sharpe 排序
    ranking = service.get_blogger_ranking("3M", "alpha", limit)
    
    top_picks = []
    for r in ranking:
        if r.get("alpha", 0) and r["alpha"] > 0:
            top_picks.append({
                "blogger_id": r["blogger_id"],
                "name": r["name"],
                "alpha": r["alpha"],
                "recommendation": "可以参考" if r["alpha"] > 5 else "谨慎判断"
            })
    
    return {"top_picks": top_picks}
