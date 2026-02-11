"""定投计划 API 端点

提供：
- 微指令流 (分步提交)
- 计划管理 (CRUD)
- 智能预警
"""

from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict

router = APIRouter(prefix="/api/investment", tags=["investment"])

from utils.auth import get_current_user


def _assert_plan_ownership(plan_id: int, user_id: int):
    """Ensure plan belongs to current user"""
    from services.investment_service import get_investment_service
    import sqlite3

    service = get_investment_service()
    conn = sqlite3.connect(service.db_path)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM investment_plans WHERE id = ? AND user_id = ?",
        (plan_id, user_id)
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="投资计划不存在")


# ============ 请求模型 ============

class FlowCalculateRequest(BaseModel):
    session_id: str
    amount: float
    frequency: str = "monthly"


class PlanCreateRequest(BaseModel):
    session_id: str


class BargainAlertRequest(BaseModel):
    plan_id: int
    bargain_nav: float


# ============ 微指令流 API ============

@router.post("/flow/start")
async def start_investment_flow(
    fund_code: str,
    current_user: Dict = Depends(get_current_user)
):
    """微指令流 - 步骤1：验证资格
    
    返回 session_id 用于后续步骤
    """
    from services.investment_service import get_investment_service
    
    try:
        service = get_investment_service()
        user_id = int(current_user["user_id"])
        state = service.start_flow(user_id, fund_code)
        return {
            "step": 1,
            "session_id": state.session_id,
            "fund_code": state.fund_code,
            "fund_name": state.fund_name,
            "message": "基金验证通过，请继续设置定投金额"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/flow/calculate")
async def calculate_investment(request: FlowCalculateRequest):
    """微指令流 - 步骤2：计算预估份额"""
    from services.investment_service import get_investment_service
    
    try:
        service = get_investment_service()
        state = service.calculate_flow(
            request.session_id,
            request.amount,
            request.frequency
        )
        return {
            "step": 2,
            "session_id": state.session_id,
            "amount": state.amount,
            "frequency": state.frequency,
            "estimated_nav": state.estimated_nav,
            "estimated_shares": state.estimated_shares,
            "fee_rate": state.fee_rate,
            "message": "预估计算完成，请确认提交"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/flow/confirm")
async def confirm_investment(request: PlanCreateRequest):
    """微指令流 - 步骤3：确认提交
    
    创建定投计划
    """
    from services.investment_service import get_investment_service
    
    try:
        service = get_investment_service()
        plan = service.confirm_flow(request.session_id)
        return {
            "step": 3,
            "plan_id": plan.id,
            "status": "created",
            "plan": plan.to_dict(),
            "message": "定投计划创建成功！"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ 计划管理 API ============

@router.get("/plans")
async def get_user_plans(current_user: Dict = Depends(get_current_user)):
    """获取用户的定投计划列表"""
    from services.investment_service import get_investment_service
    
    service = get_investment_service()
    user_id = int(current_user["user_id"])
    plans = service.get_user_plans(user_id)
    return {"plans": [p.to_dict() for p in plans]}


@router.post("/plans/{plan_id}/pause")
async def pause_plan(plan_id: int, current_user: Dict = Depends(get_current_user)):
    """暂停定投计划"""
    from services.investment_service import get_investment_service
    
    service = get_investment_service()
    _assert_plan_ownership(plan_id, int(current_user["user_id"]))
    service.pause_plan(plan_id)
    return {"status": "paused", "plan_id": plan_id}


@router.post("/plans/{plan_id}/resume")
async def resume_plan(plan_id: int, current_user: Dict = Depends(get_current_user)):
    """恢复定投计划"""
    from services.investment_service import get_investment_service
    
    service = get_investment_service()
    _assert_plan_ownership(plan_id, int(current_user["user_id"]))
    service.resume_plan(plan_id)
    return {"status": "resumed", "plan_id": plan_id}


@router.post("/plans/{plan_id}/cancel")
async def cancel_plan(plan_id: int, current_user: Dict = Depends(get_current_user)):
    """取消定投计划"""
    from services.investment_service import get_investment_service
    
    service = get_investment_service()
    _assert_plan_ownership(plan_id, int(current_user["user_id"]))
    service.cancel_plan(plan_id)
    return {"status": "cancelled", "plan_id": plan_id}


# ============ 智能预警 API ============

@router.get("/alerts")
async def get_alerts(
    unread_only: bool = Query(False),
    current_user: Dict = Depends(get_current_user)
):
    """获取预警列表"""
    from services.investment_service import get_investment_service
    
    service = get_investment_service()
    user_id = int(current_user["user_id"])
    alerts = service.get_alerts(user_id, unread_only)
    return {"alerts": [a.to_dict() for a in alerts]}


@router.post("/plans/{plan_id}/bargain-alert")
async def set_bargain_alert(
    plan_id: int,
    bargain_nav: float = Query(..., gt=0, description="捡漏区间净值"),
    current_user: Dict = Depends(get_current_user)
):
    """设置捡漏区间预警"""
    from services.investment_service import get_investment_service
    
    service = get_investment_service()
    _assert_plan_ownership(plan_id, int(current_user["user_id"]))
    
    conn = __import__('sqlite3').connect(service.db_path)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE investment_plans SET bargain_nav = ? WHERE id = ?",
        (bargain_nav, plan_id)
    )
    conn.commit()
    conn.close()
    
    return {
        "status": "set",
        "plan_id": plan_id,
        "bargain_nav": bargain_nav,
        "message": f"当净值跌至 {bargain_nav} 时将收到提醒"
    }
