"""数据模型 - 基金净值、指标、事件

定义数据采集和存储的核心数据结构。
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import json


class EventType(Enum):
    """基金事件类型"""
    DIVIDEND = "dividend"           # 分红
    SPLIT = "split"                 # 拆分
    MANAGER_CHANGE = "manager_change"  # 基金经理变动
    MARKET_EVENT = "market_event"   # 市场事件


@dataclass
class FundNavHistory:
    """基金净值历史数据"""
    fund_code: str
    date: datetime
    nav: float                      # 单位净值
    acc_nav: float                  # 累计净值
    change_percent: float = 0.0     # 涨跌幅
    volume: float = 0.0             # 成交量（ETF）
    source: str = "eastmoney"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "fund_code": self.fund_code,
            "date": self.date.isoformat() if isinstance(self.date, datetime) else self.date,
            "nav": self.nav,
            "acc_nav": self.acc_nav,
            "change_percent": self.change_percent,
            "volume": self.volume,
            "source": self.source
        }
    
    def to_chart_point(self) -> Dict[str, Any]:
        """转换为 Lightweight Charts 数据点"""
        timestamp = int(self.date.timestamp()) if isinstance(self.date, datetime) else self.date
        return {
            "time": timestamp,
            "value": self.nav
        }
    
    def to_candlestick_point(self) -> Dict[str, Any]:
        """转换为 K线数据点（需要 OHLC 数据）"""
        timestamp = int(self.date.timestamp()) if isinstance(self.date, datetime) else self.date
        return {
            "time": timestamp,
            "open": self.nav,
            "high": self.nav,
            "low": self.nav,
            "close": self.nav
        }


@dataclass
class FundMetrics:
    """基金量化指标"""
    fund_code: str
    date: datetime
    # 风险指标
    sharpe_ratio: float = 0.0       # 夏普比率
    max_drawdown: float = 0.0       # 最大回撤 (%)
    volatility: float = 0.0         # 年化波动率 (%)
    # 相对指标
    beta: float = 1.0               # Beta系数
    alpha: float = 0.0              # 超额收益 (%)
    information_ratio: float = 0.0  # 信息比率
    # 收益指标
    return_1m: float = 0.0          # 近1月收益 (%)
    return_3m: float = 0.0          # 近3月收益 (%)
    return_6m: float = 0.0          # 近6月收益 (%)
    return_1y: float = 0.0          # 近1年收益 (%)
    return_3y: float = 0.0          # 近3年收益 (%)
    # 晨星评级
    morningstar_rating: int = 0     # 1-5星
    source: str = "calculated"
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class FundEvent:
    """基金事件"""
    fund_code: str
    date: datetime
    event_type: EventType
    title: str
    description: str = ""
    value: float = 0.0              # 分红金额/拆分比例等
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "fund_code": self.fund_code,
            "date": self.date.isoformat() if isinstance(self.date, datetime) else self.date,
            "event_type": self.event_type.value,
            "title": self.title,
            "description": self.description,
            "value": self.value,
            "metadata": self.metadata
        }
    
    def to_chart_marker(self) -> Dict[str, Any]:
        """转换为 Lightweight Charts 标记"""
        timestamp = int(self.date.timestamp()) if isinstance(self.date, datetime) else self.date
        
        # 根据事件类型设置样式
        styles = {
            EventType.DIVIDEND: {"color": "#10b981", "shape": "arrowDown", "text": "💰"},
            EventType.SPLIT: {"color": "#3b82f6", "shape": "circle", "text": "📊"},
            EventType.MANAGER_CHANGE: {"color": "#f59e0b", "shape": "square", "text": "👤"},
            EventType.MARKET_EVENT: {"color": "#ef4444", "shape": "arrowUp", "text": "⚠️"}
        }
        style = styles.get(self.event_type, styles[EventType.MARKET_EVENT])
        
        return {
            "time": timestamp,
            "position": "aboveBar",
            "color": style["color"],
            "shape": style["shape"],
            "text": style["text"],
            "title": self.title
        }


@dataclass
class FundHolding:
    """基金持仓"""
    fund_code: str
    date: datetime
    stock_code: str
    stock_name: str
    weight: float                   # 持仓比例 (%)
    shares: float = 0.0             # 持股数量
    market_value: float = 0.0       # 市值
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass 
class FundSectorAllocation:
    """基金行业配置"""
    fund_code: str
    date: datetime
    sector: str                     # 行业名称
    weight: float                   # 配置比例 (%)
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ChartDataResponse:
    """图表数据响应"""
    fund_code: str
    fund_name: str
    period: str                     # 时间周期
    nav_data: List[Dict]            # 净值序列
    benchmark_data: List[Dict]      # 基准数据
    events: List[Dict]              # 事件标注
    metrics: Dict                   # 量化指标
    indicators: Dict = field(default_factory=dict)  # 技术指标
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)
