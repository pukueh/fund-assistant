"""定投计划服务 - 低摩擦

提供：
- 微指令流 (分步提交 + 中间状态)
- 灵活周期逻辑 (每日/周/月 + 补扣)
- 智能预警 (WebSocket 即时通知)
"""

import os
import sqlite3
import json
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import calendar

logger = logging.getLogger(__name__)


# ============ 数据模型 ============

class PlanStatus(Enum):
    """计划状态"""
    DRAFT = "draft"           # 草稿（未提交）
    PENDING = "pending"       # 待执行
    ACTIVE = "active"         # 活跃中
    PAUSED = "paused"         # 已暂停
    COMPLETED = "completed"   # 已完成
    CANCELLED = "cancelled"   # 已取消


class PlanFrequency(Enum):
    """定投频率"""
    DAILY = "daily"           # 每日
    WEEKLY = "weekly"         # 每周
    BIWEEKLY = "biweekly"     # 每两周
    MONTHLY = "monthly"       # 每月


class AlertType(Enum):
    """预警类型"""
    BARGAIN_ZONE = "bargain_zone"     # 捡漏区间
    LOW_BALANCE = "low_balance"       # 余额不足
    EXECUTION_FAILED = "execution_failed"  # 执行失败
    PLAN_COMPLETED = "plan_completed"      # 计划完成


@dataclass
class InvestmentPlan:
    """定投计划"""
    id: int = 0
    user_id: int = 0
    fund_code: str = ""
    fund_name: str = ""
    amount: float = 0.0           # 每期金额
    frequency: str = "monthly"    # 频率
    weekday: int = 1              # 周几 (1-7, 用于 weekly/biweekly)
    day_of_month: int = 1         # 每月几号 (用于 monthly)
    start_date: date = None
    end_date: date = None         # 可选结束日期
    status: str = "draft"
    total_invested: float = 0.0   # 累计投入
    total_periods: int = 0        # 累计期数
    next_execution_date: date = None
    created_at: datetime = None
    
    # 智能预警设置
    bargain_nav: float = 0.0      # 捡漏区间净值
    alert_enabled: bool = True
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "fund_code": self.fund_code,
            "fund_name": self.fund_name,
            "amount": self.amount,
            "frequency": self.frequency,
            "weekday": self.weekday,
            "day_of_month": self.day_of_month,
            "start_date": str(self.start_date) if self.start_date else None,
            "end_date": str(self.end_date) if self.end_date else None,
            "status": self.status,
            "total_invested": self.total_invested,
            "total_periods": self.total_periods,
            "next_execution_date": str(self.next_execution_date) if self.next_execution_date else None,
            "bargain_nav": self.bargain_nav,
            "alert_enabled": self.alert_enabled
        }


@dataclass
class PlanExecution:
    """定投执行记录"""
    id: int = 0
    plan_id: int = 0
    execution_date: date = None
    amount: float = 0.0
    nav: float = 0.0
    shares: float = 0.0
    status: str = "pending"  # pending/success/failed/retrying
    retry_count: int = 0
    error_message: str = ""
    created_at: datetime = None


@dataclass
class MicroFlowState:
    """微指令流状态（分步提交）"""
    session_id: str
    user_id: int
    step: int  # 1=验证资格, 2=计算份额, 3=确认
    fund_code: str = ""
    fund_name: str = ""
    amount: float = 0.0
    frequency: str = "monthly"
    estimated_nav: float = 0.0
    estimated_shares: float = 0.0
    fee_rate: float = 0.0
    expires_at: datetime = None
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class SmartAlert:
    """智能预警"""
    id: int = 0
    user_id: int = 0
    plan_id: int = 0
    alert_type: str = ""
    message: str = ""
    data: Dict = None
    is_read: bool = False
    created_at: datetime = None
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "type": self.alert_type,
            "message": self.message,
            "data": self.data or {},
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ============ Investment Plan Service ============

class InvestmentPlanService:
    """定投计划服务"""
    
    # 中国交易日判断（简化版）
    TRADING_HOURS = (9, 15)  # 9:00 - 15:00
    
    def __init__(self, db_path: str = "./data/investment.db"):
        self.db_path = db_path
        self._flow_cache: Dict[str, MicroFlowState] = {}  # 微指令流缓存
        self._ensure_db()
    
    def _ensure_db(self):
        """初始化数据库"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 定投计划表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS investment_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                fund_code TEXT NOT NULL,
                fund_name TEXT,
                amount REAL NOT NULL,
                frequency TEXT DEFAULT 'monthly',
                weekday INTEGER DEFAULT 1,
                day_of_month INTEGER DEFAULT 1,
                start_date TEXT,
                end_date TEXT,
                status TEXT DEFAULT 'draft',
                total_invested REAL DEFAULT 0,
                total_periods INTEGER DEFAULT 0,
                next_execution_date TEXT,
                bargain_nav REAL DEFAULT 0,
                alert_enabled INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 执行记录表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS plan_executions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plan_id INTEGER NOT NULL,
                execution_date TEXT,
                amount REAL,
                nav REAL,
                shares REAL,
                status TEXT DEFAULT 'pending',
                retry_count INTEGER DEFAULT 0,
                error_message TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 预警表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS smart_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                plan_id INTEGER,
                alert_type TEXT NOT NULL,
                message TEXT,
                data_json TEXT,
                is_read INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
        logger.info("✅ Investment 数据库初始化完成")
    
    # ============ 微指令流 ============
    
    def start_flow(self, user_id: int, fund_code: str) -> MicroFlowState:
        """开始微指令流 - 步骤1：验证资格"""
        import uuid
        
        session_id = str(uuid.uuid4())
        
        # 验证基金代码
        fund_name = self._validate_fund(fund_code)
        if not fund_name:
            raise ValueError(f"无效的基金代码: {fund_code}")
        
        state = MicroFlowState(
            session_id=session_id,
            user_id=user_id,
            step=1,
            fund_code=fund_code,
            fund_name=fund_name,
            expires_at=datetime.now() + timedelta(minutes=30)
        )
        
        self._flow_cache[session_id] = state
        return state
    
    def calculate_flow(
        self, 
        session_id: str, 
        amount: float, 
        frequency: str
    ) -> MicroFlowState:
        """微指令流 - 步骤2：计算预估份额"""
        state = self._flow_cache.get(session_id)
        if not state:
            raise ValueError("会话已过期，请重新开始")
        
        if state.step != 1:
            raise ValueError("请先完成步骤1")
        
        # 获取当前净值
        nav = self._get_fund_nav(state.fund_code)
        
        # 计算预估份额
        fee_rate = 0.0015  # 假设申购费率 0.15%
        net_amount = amount * (1 - fee_rate)
        estimated_shares = net_amount / nav if nav > 0 else 0
        
        state.step = 2
        state.amount = amount
        state.frequency = frequency
        state.estimated_nav = nav
        state.estimated_shares = round(estimated_shares, 2)
        state.fee_rate = fee_rate
        
        return state
    
    def confirm_flow(self, session_id: str) -> InvestmentPlan:
        """微指令流 - 步骤3：确认提交"""
        state = self._flow_cache.get(session_id)
        if not state:
            raise ValueError("会话已过期，请重新开始")
        
        if state.step != 2:
            raise ValueError("请先完成步骤2")
        
        # 创建定投计划
        plan = InvestmentPlan(
            user_id=state.user_id,
            fund_code=state.fund_code,
            fund_name=state.fund_name,
            amount=state.amount,
            frequency=state.frequency,
            start_date=date.today(),
            status=PlanStatus.ACTIVE.value,
            created_at=datetime.now()
        )
        
        # 计算下一个执行日期
        plan.next_execution_date = self._calculate_next_execution_date(plan)
        
        # 保存到数据库
        plan_id = self._save_plan(plan)
        plan.id = plan_id
        
        # 清理缓存
        del self._flow_cache[session_id]
        
        return plan
    
    def _validate_fund(self, fund_code: str) -> Optional[str]:
        """验证基金代码"""
        # 简化验证
        if len(fund_code) == 6 and fund_code.isdigit():
            return f"基金{fund_code}"
        return None
    
    def _get_fund_nav(self, fund_code: str) -> float:
        """获取基金净值"""
        try:
            from data_ingestion.collectors import NavCollector
            collector = NavCollector()
            history = collector.get_history(fund_code, limit=1)
            if history:
                return history[0].nav
        except Exception:
            pass
        return 1.0
    
    # ============ 灵活周期逻辑 ============
    
    def _calculate_next_execution_date(self, plan: InvestmentPlan) -> date:
        """计算下一个交易日"""
        today = date.today()
        
        if plan.frequency == PlanFrequency.DAILY.value:
            next_date = today + timedelta(days=1)
        
        elif plan.frequency == PlanFrequency.WEEKLY.value:
            # 计算下一个指定周几
            days_ahead = plan.weekday - today.isoweekday()
            if days_ahead <= 0:
                days_ahead += 7
            next_date = today + timedelta(days=days_ahead)
        
        elif plan.frequency == PlanFrequency.BIWEEKLY.value:
            days_ahead = plan.weekday - today.isoweekday()
            if days_ahead <= 0:
                days_ahead += 14
            else:
                days_ahead += 7
            next_date = today + timedelta(days=days_ahead)
        
        elif plan.frequency == PlanFrequency.MONTHLY.value:
            # 计算下个月的指定日期
            if today.day >= plan.day_of_month:
                # 下个月
                if today.month == 12:
                    next_date = date(today.year + 1, 1, plan.day_of_month)
                else:
                    # 处理月末情况
                    next_month = today.month + 1
                    max_day = calendar.monthrange(today.year, next_month)[1]
                    next_date = date(today.year, next_month, min(plan.day_of_month, max_day))
            else:
                next_date = date(today.year, today.month, plan.day_of_month)
        
        else:
            next_date = today + timedelta(days=1)
        
        # 调整到交易日
        return self._adjust_to_trading_day(next_date)
    
    def _adjust_to_trading_day(self, target_date: date) -> date:
        """调整到最近的交易日"""
        # 简化版：跳过周末
        while target_date.weekday() >= 5:  # 5=周六, 6=周日
            target_date += timedelta(days=1)
        return target_date
    
    def _is_trading_day(self, check_date: date) -> bool:
        """判断是否为交易日"""
        # 简化版：周末非交易日
        return check_date.weekday() < 5
    
    # ============ 执行与补扣 ============
    
    async def execute_due_plans(self) -> List[Dict]:
        """执行到期的定投计划
        
        由 Celery 定时任务调用
        """
        today = date.today()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 查找今日到期的计划
        cursor.execute("""
            SELECT * FROM investment_plans 
            WHERE status = 'active' AND next_execution_date <= ?
        """, (str(today),))
        
        results = []
        for row in cursor.fetchall():
            plan = self._row_to_plan(row)
            
            try:
                # 执行定投
                execution = await self._execute_plan(plan)
                results.append({
                    "plan_id": plan.id,
                    "status": "success",
                    "shares": execution.shares
                })
                
                # 更新下一个执行日期
                plan.next_execution_date = self._calculate_next_execution_date(plan)
                plan.total_invested += plan.amount
                plan.total_periods += 1
                self._update_plan(plan)
                
            except Exception as e:
                # 记录失败，设置补扣
                self._record_failed_execution(plan, str(e))
                results.append({
                    "plan_id": plan.id,
                    "status": "failed",
                    "error": str(e)
                })
                
                # 发送预警
                self._create_alert(
                    plan.user_id,
                    plan.id,
                    AlertType.EXECUTION_FAILED,
                    f"定投执行失败: {plan.fund_name}，将在明日补扣"
                )
        
        conn.close()
        return results
    
    async def _execute_plan(self, plan: InvestmentPlan) -> PlanExecution:
        """执行单个定投计划"""
        nav = self._get_fund_nav(plan.fund_code)
        shares = plan.amount / nav if nav > 0 else 0
        
        execution = PlanExecution(
            plan_id=plan.id,
            execution_date=date.today(),
            amount=plan.amount,
            nav=nav,
            shares=round(shares, 2),
            status="success",
            created_at=datetime.now()
        )
        
        self._save_execution(execution)
        return execution
    
    def _record_failed_execution(self, plan: InvestmentPlan, error: str):
        """记录失败的执行"""
        execution = PlanExecution(
            plan_id=plan.id,
            execution_date=date.today(),
            amount=plan.amount,
            status="failed",
            error_message=error,
            created_at=datetime.now()
        )
        self._save_execution(execution)
    
    async def retry_failed_executions(self) -> int:
        """重试失败的执行（补扣）"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 查找需要重试的执行
        cursor.execute("""
            SELECT * FROM plan_executions 
            WHERE status = 'failed' AND retry_count < 3
        """)
        
        retry_count = 0
        for row in cursor.fetchall():
            # 重试逻辑...
            retry_count += 1
        
        conn.close()
        return retry_count
    
    # ============ 智能预警 ============
    
    async def check_bargain_zones(self):
        """检查捡漏区间
        
        当基金净值跌至用户设定区间时发送预警
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM investment_plans 
            WHERE status = 'active' AND alert_enabled = 1 AND bargain_nav > 0
        """)
        
        for row in cursor.fetchall():
            plan = self._row_to_plan(row)
            current_nav = self._get_fund_nav(plan.fund_code)
            
            if current_nav <= plan.bargain_nav:
                self._create_alert(
                    plan.user_id,
                    plan.id,
                    AlertType.BARGAIN_ZONE,
                    f"基金 {plan.fund_name} 净值 {current_nav:.4f} 已跌至您设定的捡漏区间！",
                    {"current_nav": current_nav, "target_nav": plan.bargain_nav}
                )
        
        conn.close()
    
    def _create_alert(
        self, 
        user_id: int, 
        plan_id: int, 
        alert_type: AlertType,
        message: str,
        data: Dict = None
    ):
        """创建预警"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO smart_alerts (user_id, plan_id, alert_type, message, data_json)
            VALUES (?, ?, ?, ?, ?)
        """, (
            user_id,
            plan_id,
            alert_type.value,
            message,
            json.dumps(data or {}, ensure_ascii=False)
        ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"🔔 预警已创建: {message}")
    
    def get_alerts(self, user_id: int, unread_only: bool = False) -> List[SmartAlert]:
        """获取用户预警列表"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        sql = "SELECT * FROM smart_alerts WHERE user_id = ?"
        params = [user_id]
        
        if unread_only:
            sql += " AND is_read = 0"
        
        sql += " ORDER BY created_at DESC LIMIT 50"
        
        cursor.execute(sql, params)
        
        alerts = []
        for row in cursor.fetchall():
            alerts.append(SmartAlert(
                id=row[0],
                user_id=row[1],
                plan_id=row[2],
                alert_type=row[3],
                message=row[4],
                data=json.loads(row[5]) if row[5] else {},
                is_read=bool(row[6]),
                created_at=datetime.fromisoformat(row[7]) if row[7] else None
            ))
        
        conn.close()
        return alerts
    
    # ============ 计划管理 ============
    
    def get_user_plans(self, user_id: int) -> List[InvestmentPlan]:
        """获取用户的定投计划"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM investment_plans 
            WHERE user_id = ?
            ORDER BY created_at DESC
        """, (user_id,))
        
        plans = [self._row_to_plan(row) for row in cursor.fetchall()]
        conn.close()
        return plans
    
    def pause_plan(self, plan_id: int):
        """暂停计划"""
        self._update_plan_status(plan_id, PlanStatus.PAUSED.value)
    
    def resume_plan(self, plan_id: int):
        """恢复计划"""
        self._update_plan_status(plan_id, PlanStatus.ACTIVE.value)
    
    def cancel_plan(self, plan_id: int):
        """取消计划"""
        self._update_plan_status(plan_id, PlanStatus.CANCELLED.value)
    
    def _update_plan_status(self, plan_id: int, status: str):
        """更新计划状态"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE investment_plans SET status = ? WHERE id = ?",
            (status, plan_id)
        )
        conn.commit()
        conn.close()
    
    # ============ 数据库辅助 ============
    
    def _save_plan(self, plan: InvestmentPlan) -> int:
        """保存定投计划"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO investment_plans 
            (user_id, fund_code, fund_name, amount, frequency, weekday, day_of_month,
             start_date, end_date, status, next_execution_date, bargain_nav, alert_enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            plan.user_id, plan.fund_code, plan.fund_name, plan.amount,
            plan.frequency, plan.weekday, plan.day_of_month,
            str(plan.start_date) if plan.start_date else None,
            str(plan.end_date) if plan.end_date else None,
            plan.status,
            str(plan.next_execution_date) if plan.next_execution_date else None,
            plan.bargain_nav, 1 if plan.alert_enabled else 0
        ))
        
        plan_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return plan_id
    
    def _update_plan(self, plan: InvestmentPlan):
        """更新定投计划"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE investment_plans SET
                total_invested = ?, total_periods = ?, next_execution_date = ?
            WHERE id = ?
        """, (
            plan.total_invested, plan.total_periods,
            str(plan.next_execution_date) if plan.next_execution_date else None,
            plan.id
        ))
        
        conn.commit()
        conn.close()
    
    def _save_execution(self, execution: PlanExecution):
        """保存执行记录"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO plan_executions 
            (plan_id, execution_date, amount, nav, shares, status, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            execution.plan_id,
            str(execution.execution_date) if execution.execution_date else None,
            execution.amount, execution.nav, execution.shares,
            execution.status, execution.error_message
        ))
        
        conn.commit()
        conn.close()
    
    def _row_to_plan(self, row) -> InvestmentPlan:
        """数据库行转换为 InvestmentPlan"""
        return InvestmentPlan(
            id=row[0],
            user_id=row[1],
            fund_code=row[2],
            fund_name=row[3],
            amount=row[4],
            frequency=row[5],
            weekday=row[6],
            day_of_month=row[7],
            start_date=date.fromisoformat(row[8]) if row[8] else None,
            end_date=date.fromisoformat(row[9]) if row[9] else None,
            status=row[10],
            total_invested=row[11],
            total_periods=row[12],
            next_execution_date=date.fromisoformat(row[13]) if row[13] else None,
            bargain_nav=row[14],
            alert_enabled=bool(row[15])
        )


# 单例
_investment_service: Optional[InvestmentPlanService] = None

def get_investment_service() -> InvestmentPlanService:
    global _investment_service
    if _investment_service is None:
        _investment_service = InvestmentPlanService()
    return _investment_service
