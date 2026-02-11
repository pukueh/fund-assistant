"""资产持仓 API 端点

提供：
- 持仓摘要 (Sparkline)
- 资产快照历史
- 成就系统
"""

from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional, List, Dict
import json
from pydantic import BaseModel
from utils.auth import get_current_user

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("/summary")
async def get_portfolio_summary(current_user: Dict = Depends(get_current_user)):
    """获取持仓摘要 (Robinhood 风格)
    
    返回：
    - total_value: 总资产
    - day_change: 今日盈亏
    - day_change_pct: 今日涨跌幅
    - sparkline_24h: 24小时趋势线
    """
    user_id = current_user["user_id"]
    from services.portfolio_service import get_portfolio_service
    
    service = get_portfolio_service()
    summary = await service.get_summary(user_id)
    return summary.to_dict()


@router.get("/snapshots")
async def get_portfolio_snapshots(
    days: int = Query(30, ge=1, le=365),
    current_user: Dict = Depends(get_current_user)
):
    """获取资产快照历史
    
    用于渲染资产增长曲线
    """
    user_id = current_user["user_id"]
    from services.portfolio_service import get_portfolio_service
    
    service = get_portfolio_service()
    snapshots = service.get_snapshots(user_id, days)
    return {
        "user_id": user_id,
        "days": days,
        "snapshots": [s.to_dict() for s in snapshots]
    }


@router.post("/snapshot")
async def create_snapshot(current_user: Dict = Depends(get_current_user)):
    """手动生成资产快照"""
    user_id = current_user["user_id"]
    from services.portfolio_service import get_portfolio_service
    
    service = get_portfolio_service()
    snapshot = await service.generate_snapshot(user_id)
    return {"status": "created", "snapshot": snapshot.to_dict()}


@router.get("/achievements")
async def get_achievements(current_user: Dict = Depends(get_current_user)):
    """获取用户成就列表"""
    user_id = current_user["user_id"]
    from services.portfolio_service import get_portfolio_service
    
    service = get_portfolio_service()
    achievements = service.get_achievements(user_id)
    pending = service.get_pending_achievements(user_id)
    
    return {
        "earned": [a.to_dict() for a in achievements],
        "pending": pending,
        "total_earned": len(achievements),
        "total_available": len(achievements) + len(pending)
    }


@router.get("/achievements/recent")
async def get_recent_achievements(
    limit: int = Query(5, ge=1, le=20),
    current_user: Dict = Depends(get_current_user)
):
    """获取最近获得的成就"""
    user_id = current_user["user_id"]
    from services.portfolio_service import get_portfolio_service
    
    service = get_portfolio_service()
    achievements = service.get_achievements(user_id)[:limit]
    return {"achievements": [a.to_dict() for a in achievements]}


@router.get("/growth-curve")
async def get_growth_curve(
    period: str = Query("1M", pattern="^(1W|1M|3M|6M|1Y|ALL)$"),
    current_user: Dict = Depends(get_current_user)
):
    """获取资产增长曲线数据
    
    period: 1W, 1M, 3M, 6M, 1Y, ALL
    """
    user_id = current_user["user_id"]
    from services.portfolio_service import get_portfolio_service
    
    period_days = {
        "1W": 7,
        "1M": 30,
        "3M": 90,
        "6M": 180,
        "1Y": 365,
        "ALL": 3650
    }
    
    days = period_days.get(period, 30)
    
    service = get_portfolio_service()
    snapshots = service.get_snapshots(user_id, days)
    
    # 转换为图表数据格式
    chart_data = [
        {
            "time": s.date.strftime("%Y-%m-%d"),
            "value": s.total_value,
            "profit": s.total_profit
        }
        for s in snapshots
    ]
    
    return {
        "period": period,
        "data": chart_data
    }


class TagUpdate(BaseModel):
    tags: List[str]


@router.post("/holding/{code}/tags")
async def update_holding_tags(
    code: str,
    tag_update: TagUpdate,
    current_user: Dict = Depends(get_current_user)
):
    """更新持仓标签"""
    user_id = current_user["user_id"]
    from tools.portfolio_tools import PortfolioTool
    
    # 使用 PortfolioTool 更新标签
    # 注意：PortoflioTool 独立管理数据库连接
    tool = PortfolioTool()
    result_json = tool.update_tags(code, tag_update.tags, user_id=user_id)
    result = json.loads(result_json)
    

    if result.get("状态") == "成功":
        return result
    else:
        raise HTTPException(status_code=404, detail=result.get("原因", "更新失败"))


# ============ 持仓管理 API (从 server.py 迁移) ============

class HoldingAdd(BaseModel):
    fund_code: str
    fund_name: Optional[str] = ""
    shares: float
    cost_nav: float


@router.get("/valuation")
async def get_valuation(current_user: Dict = Depends(get_current_user)):
    """获取持仓估值"""
    from tools.portfolio_tools import PortfolioTool
    print(f"DEBUG: Processing valuation for user {current_user['user_id']}")
    tool = PortfolioTool()
    result = tool.calculate_valuation(user_id=current_user["user_id"])
    return json.loads(result)


@router.get("/holdings")
async def list_holdings(current_user: Dict = Depends(get_current_user)):
    """获取持仓列表"""
    from tools.portfolio_tools import PortfolioTool
    tool = PortfolioTool()
    result = tool.list_holdings(user_id=current_user["user_id"])
    return json.loads(result)


@router.post("/holdings")
async def add_holding(holding: HoldingAdd, current_user: Dict = Depends(get_current_user)):
    """添加持仓"""
    from tools.portfolio_tools import PortfolioTool
    tool = PortfolioTool()
    result = tool.add_holding(
        holding.fund_code,
        holding.fund_name or holding.fund_code,
        holding.shares,
        holding.cost_nav,
        user_id=current_user["user_id"]
    )
    return json.loads(result)


@router.delete("/holdings/{fund_code}")
async def remove_holding(fund_code: str, current_user: Dict = Depends(get_current_user)):
    """删除持仓"""
    from tools.portfolio_tools import PortfolioTool
    print(f"DEBUG: Deleting holding {fund_code} for user {current_user['user_id']}")
    tool = PortfolioTool()
    result = tool.remove_holding(fund_code, user_id=current_user["user_id"])
    print(f"DEBUG: Deletion result: {result}")
    return json.loads(result)


@router.post("/holdings/batch")
async def batch_add_holdings(holdings: List[HoldingAdd], current_user: Dict = Depends(get_current_user)):
    """批量添加持仓"""
    from tools.portfolio_tools import PortfolioTool
    tool = PortfolioTool()
    
    # Check limit to prevent abuse
    if len(holdings) > 100:
        raise HTTPException(status_code=400, detail="单次导入不能超过100条")
        
    holdings_dict = [h.dict() for h in holdings]
    result_json = tool.batch_add_holdings(holdings_dict, user_id=current_user["user_id"])
    return json.loads(result_json)
