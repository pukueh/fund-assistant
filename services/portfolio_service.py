"""资产持仓服务 - 进度与成就感

提供：
- 资产快照系统 (每日凌晨快照)
- 里程碑引擎 (Achievement 触发器)
- PortfolioSummary API (Sparkline 数据)
"""

import os
import sqlite3
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


# ============ 数据模型 ============

class AchievementType(Enum):
    """成就类型"""
    FIRST_BUY = "first_buy"              # 首次买入
    STREAK_7 = "streak_7"                # 连续定投7天
    STREAK_30 = "streak_30"              # 连续定投30天
    STREAK_100 = "streak_100"            # 连续定投100天
    GAIN_5PCT = "gain_5pct"              # 收益超5%
    GAIN_10PCT = "gain_10pct"            # 收益超10%
    GAIN_50PCT = "gain_50pct"            # 收益超50%
    AUM_10K = "aum_10k"                  # 总资产超1万
    AUM_100K = "aum_100k"                # 总资产超10万
    AUM_1M = "aum_1m"                    # 总资产超100万
    DIVERSIFIED = "diversified"          # 持仓超5只基金
    FIRST_DIVIDEND = "first_dividend"    # 首次收到分红


@dataclass
class PortfolioSnapshot:
    """资产快照"""
    id: int = 0
    user_id: int = 0
    date: datetime = None
    total_value: float = 0.0
    total_cost: float = 0.0
    total_profit: float = 0.0
    profit_rate: float = 0.0
    positions_count: int = 0
    positions_json: str = ""
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "date": self.date.isoformat() if self.date else None,
            "total_value": self.total_value,
            "total_cost": self.total_cost,
            "total_profit": self.total_profit,
            "profit_rate": self.profit_rate,
            "positions_count": self.positions_count
        }


@dataclass
class Achievement:
    """成就"""
    id: int = 0
    user_id: int = 0
    achievement_type: str = ""
    title: str = ""
    description: str = ""
    icon: str = "🏆"
    achieved_at: datetime = None
    value: float = 0.0  # 达成时的数值
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "type": self.achievement_type,
            "title": self.title,
            "description": self.description,
            "icon": self.icon,
            "achieved_at": self.achieved_at.isoformat() if self.achieved_at else None,
            "value": self.value
        }


@dataclass
class PortfolioSummary:
    """持仓摘要 (Robinhood 风格)"""
    total_value: float
    day_change: float
    day_change_pct: float
    total_profit: float
    total_profit_pct: float
    sparkline_24h: List[float]  # 24点高频数据
    positions_count: int = 0
    
    def to_dict(self) -> Dict:
        return asdict(self)


# ============ 成就配置 ============

ACHIEVEMENT_CONFIG = {
    AchievementType.FIRST_BUY: {
        "title": "首次买入",
        "description": "恭喜完成第一笔基金投资！",
        "icon": "🎉"
    },
    AchievementType.STREAK_7: {
        "title": "坚持一周",
        "description": "连续定投7天，好的开始！",
        "icon": "📆"
    },
    AchievementType.STREAK_30: {
        "title": "月度达人",
        "description": "连续定投30天，坚持就是胜利！",
        "icon": "🏅"
    },
    AchievementType.STREAK_100: {
        "title": "百日定投",
        "description": "连续定投100天，投资大师！",
        "icon": "👑"
    },
    AchievementType.GAIN_5PCT: {
        "title": "小有收获",
        "description": "累计收益达到5%",
        "icon": "📈"
    },
    AchievementType.GAIN_10PCT: {
        "title": "收益翻倍",
        "description": "累计收益达到10%",
        "icon": "💰"
    },
    AchievementType.GAIN_50PCT: {
        "title": "投资高手",
        "description": "累计收益达到50%",
        "icon": "🚀"
    },
    AchievementType.AUM_10K: {
        "title": "小有积蓄",
        "description": "总资产突破1万元",
        "icon": "💵"
    },
    AchievementType.AUM_100K: {
        "title": "财富增长",
        "description": "总资产突破10万元",
        "icon": "💎"
    },
    AchievementType.AUM_1M: {
        "title": "百万富翁",
        "description": "总资产突破100万元",
        "icon": "🏆"
    },
    AchievementType.DIVERSIFIED: {
        "title": "分散投资",
        "description": "持有超过5只基金",
        "icon": "🎯"
    },
}


# ============ Portfolio Service ============

class PortfolioService:
    """资产持仓服务"""
    
    def __init__(self, db_path: str = "./data/fund_assistant.db"):
        self.db_path = db_path
        self._ensure_db()
    
    def _ensure_db(self):
        """初始化数据库"""
        # Tables are now created centrally by Database._init_tables() in utils/database.py
        # Just ensure the database and directory exist
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        # Ensure tables exist (in case this service is used standalone)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 资产快照表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS portfolio_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                total_value REAL,
                total_cost REAL,
                total_profit REAL,
                profit_rate REAL,
                positions_count INTEGER,
                positions_json TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, date)
            )
        """)
        
        # 成就表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                achievement_type TEXT NOT NULL,
                title TEXT,
                description TEXT,
                icon TEXT,
                achieved_at TEXT,
                value REAL,
                UNIQUE(user_id, achievement_type)
            )
        """)
        
        # 创建索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_snapshots_user_date 
            ON portfolio_snapshots(user_id, date DESC)
        """)
        
        conn.commit()
        conn.close()
        logger.info("✅ Portfolio 数据库初始化完成")
    
    # ============ 资产快照 ============
    
    async def generate_snapshot(self, user_id: int) -> PortfolioSnapshot:
        """为用户生成资产快照
        
        每天凌晨调用，记录用户资产状态
        """
        from utils.database import get_database
        
        db = get_database()
        
        # 获取用户持仓
        with db.get_connection() as conn:
            cursor = conn.cursor()
            holdings = cursor.execute(
                "SELECT * FROM holdings WHERE user_id = ?", (user_id,)
            ).fetchall()
        
        if not holdings:
            return PortfolioSnapshot(user_id=user_id, date=datetime.now())
        
        # 计算总资产
        total_value = 0.0
        total_cost = 0.0
        positions = []
        
        for h in holdings:
            fund_code = h["fund_code"]
            shares = float(h["shares"])
            cost_nav = float(h["cost_nav"])
            
            # 获取最新净值
            current_nav = await self._get_current_nav(fund_code)
            
            value = shares * current_nav
            cost = shares * cost_nav
            
            total_value += value
            total_cost += cost
            
            positions.append({
                "fund_code": fund_code,
                "shares": shares,
                "value": value,
                "cost": cost
            })
        
        total_profit = total_value - total_cost
        profit_rate = (total_profit / total_cost * 100) if total_cost > 0 else 0
        
        snapshot = PortfolioSnapshot(
            user_id=user_id,
            date=datetime.now(),
            total_value=round(total_value, 2),
            total_cost=round(total_cost, 2),
            total_profit=round(total_profit, 2),
            profit_rate=round(profit_rate, 2),
            positions_count=len(positions),
            positions_json=json.dumps(positions, ensure_ascii=False)
        )
        
        # 保存快照
        self._save_snapshot(snapshot)
        
        # 检查成就
        await self._check_achievements(user_id, snapshot)
        
        return snapshot
    
    async def _get_current_nav(self, fund_code: str) -> float:
        """获取当前净值"""
        try:
            from data_ingestion.collectors import NavCollector
            collector = NavCollector()
            history = collector.get_history(fund_code, limit=1)
            if history:
                return history[0].nav
        except Exception as e:
            logger.warning(f"获取净值失败 {fund_code}: {e}")
        return 1.0
    
    def _save_snapshot(self, snapshot: PortfolioSnapshot):
        """保存快照"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        date_str = snapshot.date.strftime("%Y-%m-%d")
        cursor.execute("""
            INSERT OR REPLACE INTO portfolio_snapshots 
            (user_id, date, total_value, total_cost, total_profit, 
             profit_rate, positions_count, positions_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            snapshot.user_id, date_str, snapshot.total_value,
            snapshot.total_cost, snapshot.total_profit, snapshot.profit_rate,
            snapshot.positions_count, snapshot.positions_json
        ))
        
        conn.commit()
        conn.close()
    
    def get_snapshots(
        self, 
        user_id: int, 
        days: int = 30
    ) -> List[PortfolioSnapshot]:
        """获取历史快照"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        cursor.execute("""
            SELECT * FROM portfolio_snapshots 
            WHERE user_id = ? AND date >= ?
            ORDER BY date ASC
        """, (user_id, start_date))
        
        snapshots = []
        for row in cursor.fetchall():
            snapshots.append(PortfolioSnapshot(
                id=row[0],
                user_id=row[1],
                date=datetime.strptime(row[2], "%Y-%m-%d"),
                total_value=row[3],
                total_cost=row[4],
                total_profit=row[5],
                profit_rate=row[6],
                positions_count=row[7],
                positions_json=row[8]
            ))
        
        conn.close()
        return snapshots
    
    # ============ 里程碑引擎 ============
    
    async def _check_achievements(self, user_id: int, snapshot: PortfolioSnapshot):
        """检查并授予成就"""
        # 总资产成就
        if snapshot.total_value >= 1000000:
            self._grant_achievement(user_id, AchievementType.AUM_1M, snapshot.total_value)
        elif snapshot.total_value >= 100000:
            self._grant_achievement(user_id, AchievementType.AUM_100K, snapshot.total_value)
        elif snapshot.total_value >= 10000:
            self._grant_achievement(user_id, AchievementType.AUM_10K, snapshot.total_value)
        
        # 收益率成就
        if snapshot.profit_rate >= 50:
            self._grant_achievement(user_id, AchievementType.GAIN_50PCT, snapshot.profit_rate)
        elif snapshot.profit_rate >= 10:
            self._grant_achievement(user_id, AchievementType.GAIN_10PCT, snapshot.profit_rate)
        elif snapshot.profit_rate >= 5:
            self._grant_achievement(user_id, AchievementType.GAIN_5PCT, snapshot.profit_rate)
        
        # 分散投资成就
        if snapshot.positions_count >= 5:
            self._grant_achievement(user_id, AchievementType.DIVERSIFIED, snapshot.positions_count)
    
    def _grant_achievement(
        self, 
        user_id: int, 
        achievement_type: AchievementType,
        value: float = 0
    ):
        """授予成就"""
        config = ACHIEVEMENT_CONFIG.get(achievement_type, {})
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR IGNORE INTO achievements 
            (user_id, achievement_type, title, description, icon, achieved_at, value)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            achievement_type.value,
            config.get("title", "成就"),
            config.get("description", ""),
            config.get("icon", "🏆"),
            datetime.now().isoformat(),
            value
        ))
        
        if cursor.rowcount > 0:
            logger.info(f"🏆 用户 {user_id} 获得成就: {config.get('title')}")
        
        conn.commit()
        conn.close()
    
    def grant_first_buy(self, user_id: int, fund_code: str):
        """授予首次买入成就"""
        self._grant_achievement(user_id, AchievementType.FIRST_BUY)
    
    def get_achievements(self, user_id: int) -> List[Achievement]:
        """获取用户成就列表"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM achievements 
            WHERE user_id = ?
            ORDER BY achieved_at DESC
        """, (user_id,))
        
        achievements = []
        for row in cursor.fetchall():
            achievements.append(Achievement(
                id=row[0],
                user_id=row[1],
                achievement_type=row[2],
                title=row[3],
                description=row[4],
                icon=row[5],
                achieved_at=datetime.fromisoformat(row[6]) if row[6] else None,
                value=row[7]
            ))
        
        conn.close()
        return achievements
    
    def get_pending_achievements(self, user_id: int) -> List[Dict]:
        """获取未完成的成就（进度）"""
        earned = set(a.achievement_type for a in self.get_achievements(user_id))
        pending = []
        
        for atype, config in ACHIEVEMENT_CONFIG.items():
            if atype.value not in earned:
                pending.append({
                    "type": atype.value,
                    "title": config["title"],
                    "description": config["description"],
                    "icon": config["icon"],
                    "progress": 0  # TODO: 计算进度
                })
        
        return pending
    
    # ============ Portfolio Summary ============
    
    async def get_summary(self, user_id: int) -> PortfolioSummary:
        """获取持仓摘要 (Robinhood 风格)"""
        # 获取最新两天的快照
        snapshots = self.get_snapshots(user_id, days=2)
        
        today_str = datetime.now().strftime("%Y-%m-%d")
        
        # 如果没有快照，或者最新的快照不是今天的，则强制生成一个
        # 总是重新生成今日快照，以确保数据实时性（例如用户刚删除了持仓）
        # 虽然这会增加计算开销，但对于准确性是必须的
        logger.info(f"🔄 为用户 {user_id} 更新今日实时快照")
        new_snapshot = await self.generate_snapshot(user_id)
        
        # 如果列表中已经包含了今天的旧快照（因为 get_snapshots 可能返回了旧的），则替换它
        if snapshots and snapshots[-1].date.strftime("%Y-%m-%d") == today_str:
            snapshots[-1] = new_snapshot
        else:
            snapshots.append(new_snapshot)
        
        today = snapshots[-1]
        yesterday = snapshots[-2] if len(snapshots) >= 2 else today
        
        # 计算日涨跌
        day_change = today.total_value - yesterday.total_value
        day_change_pct = (day_change / yesterday.total_value * 100) if yesterday.total_value > 0 else 0
        
        # 获取 24h Sparkline 数据
        sparkline = self._generate_sparkline(user_id, today.total_value)
        
        return PortfolioSummary(
            total_value=today.total_value,
            day_change=round(day_change, 2),
            day_change_pct=round(day_change_pct, 2),
            total_profit=today.total_profit,
            total_profit_pct=today.profit_rate,
            sparkline_24h=sparkline,
            positions_count=today.positions_count
        )
    
    def _generate_sparkline(self, user_id: int, current_value: float) -> List[float]:
        """生成 24h Sparkline 数据
        
        返回24个点，每点代表1小时
        """
        import random
        
        # 模拟 24 小时数据波动
        sparkline = []
        base = current_value * 0.995  # 假设日内波动 ±0.5%
        
        for i in range(24):
            volatility = random.uniform(-0.002, 0.002)
            trend = (current_value - base) / 24 * i
            point = base + trend + (current_value * volatility)
            sparkline.append(round(point, 2))
        
        # 确保最后一个点是当前值
        sparkline[-1] = current_value
        
        return sparkline


# 单例
_portfolio_service: Optional[PortfolioService] = None

def get_portfolio_service() -> PortfolioService:
    global _portfolio_service
    if _portfolio_service is None:
        _portfolio_service = PortfolioService()
    return _portfolio_service
