"""量化指标采集器

计算和采集基金量化指标：
- 夏普比率 (Sharpe Ratio)
- 最大回撤 (Max Drawdown)
- 波动率 (Volatility)
- Alpha/Beta
"""

import math
from datetime import datetime, timedelta
from typing import List, Optional, Dict
import logging
import sqlite3
import os

from ..models import FundMetrics, FundNavHistory

logger = logging.getLogger(__name__)


class MetricsCollector:
    """量化指标采集器"""
    
    RISK_FREE_RATE = 0.02  # 无风险利率 2%
    BENCHMARK_CODE = "000300"  # 沪深300作为基准
    
    def __init__(self, db_path: str = "./data/fund_history.db"):
        self.db_path = db_path
        self._ensure_db()
    
    def _ensure_db(self):
        """确保数据库表存在"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fund_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fund_code TEXT NOT NULL,
                date TEXT NOT NULL,
                sharpe_ratio REAL,
                max_drawdown REAL,
                volatility REAL,
                beta REAL,
                alpha REAL,
                information_ratio REAL,
                return_1m REAL,
                return_3m REAL,
                return_6m REAL,
                return_1y REAL,
                return_3y REAL,
                morningstar_rating INTEGER,
                source TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(fund_code, date)
            )
        """)
        
        conn.commit()
        conn.close()
    
    def calculate(self, fund_code: str, nav_history: List[FundNavHistory]) -> FundMetrics:
        """计算基金量化指标
        
        Args:
            fund_code: 基金代码
            nav_history: 净值历史数据
            
        Returns:
            量化指标
        """
        if len(nav_history) < 30:
            logger.warning(f"数据不足，无法计算指标（需要至少30天数据）")
            return FundMetrics(fund_code=fund_code, date=datetime.now())
        
        # 按日期排序（升序）
        sorted_history = sorted(nav_history, key=lambda x: x.date)
        navs = [h.nav for h in sorted_history]
        
        # 计算日收益率
        daily_returns = []
        for i in range(1, len(navs)):
            ret = (navs[i] - navs[i-1]) / navs[i-1]
            daily_returns.append(ret)
        
        # 波动率（年化）
        volatility = self._calculate_volatility(daily_returns)
        
        # 最大回撤
        max_drawdown = self._calculate_max_drawdown(navs)
        
        # 夏普比率
        sharpe_ratio = self._calculate_sharpe_ratio(daily_returns, volatility)
        
        # 收益率
        return_1m = self._calculate_period_return(navs, 22)   # 约1个月
        return_3m = self._calculate_period_return(navs, 66)   # 约3个月
        return_6m = self._calculate_period_return(navs, 132)  # 约6个月
        return_1y = self._calculate_period_return(navs, 252)  # 约1年
        return_3y = self._calculate_period_return(navs, 756)  # 约3年
        
        return FundMetrics(
            fund_code=fund_code,
            date=datetime.now(),
            sharpe_ratio=round(sharpe_ratio, 2),
            max_drawdown=round(max_drawdown * 100, 2),
            volatility=round(volatility * 100, 2),
            beta=1.0,  # 需要基准数据计算
            alpha=0.0,
            return_1m=round(return_1m * 100, 2),
            return_3m=round(return_3m * 100, 2),
            return_6m=round(return_6m * 100, 2),
            return_1y=round(return_1y * 100, 2),
            return_3y=round(return_3y * 100, 2),
            source="calculated"
        )
    
    def _calculate_volatility(self, daily_returns: List[float]) -> float:
        """计算年化波动率"""
        if len(daily_returns) < 2:
            return 0.0
        
        mean_return = sum(daily_returns) / len(daily_returns)
        variance = sum((r - mean_return) ** 2 for r in daily_returns) / (len(daily_returns) - 1)
        std_dev = math.sqrt(variance)
        
        # 年化（假设252个交易日）
        return std_dev * math.sqrt(252)
    
    def _calculate_max_drawdown(self, navs: List[float]) -> float:
        """计算最大回撤"""
        if len(navs) < 2:
            return 0.0
        
        max_drawdown = 0.0
        peak = navs[0]
        
        for nav in navs:
            if nav > peak:
                peak = nav
            drawdown = (peak - nav) / peak
            max_drawdown = max(max_drawdown, drawdown)
        
        return max_drawdown
    
    def _calculate_sharpe_ratio(self, daily_returns: List[float], volatility: float) -> float:
        """计算夏普比率"""
        if volatility == 0 or len(daily_returns) == 0:
            return 0.0
        
        # 年化收益率
        total_return = 1.0
        for r in daily_returns:
            total_return *= (1 + r)
        annual_return = (total_return ** (252 / len(daily_returns))) - 1
        
        # 夏普比率
        return (annual_return - self.RISK_FREE_RATE) / volatility
    
    def _calculate_period_return(self, navs: List[float], days: int) -> float:
        """计算区间收益率"""
        if len(navs) < days:
            return 0.0
        
        start_nav = navs[-(days + 1)] if len(navs) > days else navs[0]
        end_nav = navs[-1]
        
        return (end_nav - start_nav) / start_nav
    
    def calculate_drawdown_series(self, navs: List[float]) -> List[float]:
        """计算回撤序列（用于图表阴影）
        
        Returns:
            回撤序列（负值）
        """
        if len(navs) < 2:
            return []
        
        drawdowns = []
        peak = navs[0]
        
        for nav in navs:
            if nav > peak:
                peak = nav
            drawdown = (nav - peak) / peak  # 负值
            drawdowns.append(round(drawdown * 100, 2))
        
        return drawdowns
    
    def calculate_moving_average(self, navs: List[float], window: int = 20) -> List[Optional[float]]:
        """计算移动平均线
        
        Args:
            navs: 净值序列
            window: 窗口大小
            
        Returns:
            移动平均序列
        """
        ma = []
        for i in range(len(navs)):
            if i < window - 1:
                ma.append(None)
            else:
                window_navs = navs[i - window + 1:i + 1]
                ma.append(round(sum(window_navs) / window, 4))
        return ma
    
    def calculate_bollinger_bands(
        self, 
        navs: List[float], 
        window: int = 20, 
        num_std: float = 2.0
    ) -> Dict[str, List[Optional[float]]]:
        """计算布林带
        
        Returns:
            {"upper": [...], "middle": [...], "lower": [...]}
        """
        middle = self.calculate_moving_average(navs, window)
        upper = []
        lower = []
        
        for i in range(len(navs)):
            if i < window - 1:
                upper.append(None)
                lower.append(None)
            else:
                window_navs = navs[i - window + 1:i + 1]
                mean = middle[i]
                variance = sum((n - mean) ** 2 for n in window_navs) / window
                std = math.sqrt(variance)
                upper.append(round(mean + num_std * std, 4))
                lower.append(round(mean - num_std * std, 4))
        
        return {
            "upper": upper,
            "middle": middle,
            "lower": lower
        }
    
    def save(self, metrics: FundMetrics):
        """保存指标到数据库"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        date_str = metrics.date.strftime("%Y-%m-%d")
        cursor.execute("""
            INSERT OR REPLACE INTO fund_metrics 
            (fund_code, date, sharpe_ratio, max_drawdown, volatility, beta, alpha,
             information_ratio, return_1m, return_3m, return_6m, return_1y, return_3y,
             morningstar_rating, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            metrics.fund_code, date_str, metrics.sharpe_ratio, metrics.max_drawdown,
            metrics.volatility, metrics.beta, metrics.alpha, metrics.information_ratio,
            metrics.return_1m, metrics.return_3m, metrics.return_6m, metrics.return_1y,
            metrics.return_3y, metrics.morningstar_rating, metrics.source
        ))
        
        conn.commit()
        conn.close()
    
    def update_all(self, fund_codes: List[str] = None) -> List[FundMetrics]:
        """更新所有基金的指标"""
        from .nav_collector import NavCollector
        
        nav_collector = NavCollector(self.db_path)
        codes = fund_codes or nav_collector.DEFAULT_FUNDS
        results = []
        
        for code in codes:
            try:
                # 获取历史净值
                history = nav_collector.get_history(code, limit=756)
                if history:
                    metrics = self.calculate(code, history)
                    self.save(metrics)
                    results.append(metrics)
                    logger.info(f"✅ {code} 指标更新完成: 夏普={metrics.sharpe_ratio}, 最大回撤={metrics.max_drawdown}%")
            except Exception as e:
                logger.error(f"更新 {code} 指标失败: {e}")
        
        return results
    
    def get_latest(self, fund_code: str) -> Optional[FundMetrics]:
        """获取最新指标"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM fund_metrics 
            WHERE fund_code = ? 
            ORDER BY date DESC LIMIT 1
        """, (fund_code,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        return FundMetrics(
            fund_code=row[1],
            date=datetime.strptime(row[2], "%Y-%m-%d"),
            sharpe_ratio=row[3] or 0,
            max_drawdown=row[4] or 0,
            volatility=row[5] or 0,
            beta=row[6] or 1,
            alpha=row[7] or 0,
            information_ratio=row[8] or 0,
            return_1m=row[9] or 0,
            return_3m=row[10] or 0,
            return_6m=row[11] or 0,
            return_1y=row[12] or 0,
            return_3y=row[13] or 0,
            morningstar_rating=row[14] or 0,
            source=row[15] or "db"
        )
