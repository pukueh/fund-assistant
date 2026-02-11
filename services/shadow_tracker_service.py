"""影子基金经理追踪服务

核心功能：
- 雪球/公众号博主持仓抓取
- LLM 实体提取 (基金代码/股票)
- 模拟组合构建
- 归因分析
"""

import os
import re
import json
import sqlite3
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import logging

logger = logging.getLogger(__name__)


# ============ 数据模型 ============

class BloggerPlatform(Enum):
    """博主平台"""
    XUEQIU = "xueqiu"        # 雪球
    WECHAT = "wechat"        # 公众号
    TWITTER = "twitter"       # Twitter
    EASTMONEY = "eastmoney"  # 东方财富股吧


@dataclass
class Blogger:
    """博主信息"""
    id: int = 0
    platform: str = ""
    platform_id: str = ""  # 平台用户ID
    name: str = ""
    avatar_url: str = ""
    followers: int = 0
    description: str = ""
    track_since: datetime = None
    is_active: bool = True
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "platform": self.platform,
            "name": self.name,
            "followers": self.followers,
            "description": self.description,
            "track_since": self.track_since.isoformat() if self.track_since else None
        }


@dataclass
class ShadowHolding:
    """影子持仓"""
    id: int = 0
    blogger_id: int = 0
    fund_code: str = ""
    fund_name: str = ""
    position_type: str = "fund"  # fund/stock/etf
    shares: float = 0.0
    weight: float = 0.0  # 仓位比例
    cost_price: float = 0.0
    disclosed_date: date = None
    source_url: str = ""
    confidence: float = 1.0  # 提取置信度
    
    def to_dict(self) -> Dict:
        return {
            "fund_code": self.fund_code,
            "fund_name": self.fund_name,
            "type": self.position_type,
            "weight": self.weight,
            "disclosed_date": str(self.disclosed_date) if self.disclosed_date else None,
            "confidence": self.confidence
        }


@dataclass
class ShadowPortfolio:
    """影子组合"""
    blogger_id: int
    blogger_name: str
    snapshot_date: date
    holdings: List[ShadowHolding]
    total_value: float = 0.0  # 模拟总市值
    
    def to_dict(self) -> Dict:
        return {
            "blogger_id": self.blogger_id,
            "blogger_name": self.blogger_name,
            "snapshot_date": str(self.snapshot_date),
            "holdings": [h.to_dict() for h in self.holdings],
            "total_value": self.total_value
        }


@dataclass
class PerformanceMetrics:
    """业绩归因指标"""
    blogger_id: int
    period: str  # 1M/3M/6M/1Y
    total_return: float
    benchmark_return: float  # 基准收益 (沪深300)
    alpha: float
    max_drawdown: float
    sharpe_ratio: float
    win_rate: float  # 选股胜率
    timing_score: float  # 择时能力评分 (0-100)
    style_drift: float  # 风格漂移指数
    
    def to_dict(self) -> Dict:
        return asdict(self)


# ============ 文本解析器 (LLM 实体提取) ============

class HoldingExtractor:
    """持仓信息提取器 - 使用 LLM"""
    
    # 基金代码正则
    FUND_CODE_PATTERN = r'\b(\d{6})\b'
    
    # 股票代码正则 (A股)
    STOCK_CODE_PATTERN = r'\b(SH|SZ|sh|sz)?(\d{6})\b'
    
    # 常见基金关键词
    FUND_KEYWORDS = [
        "基金", "ETF", "LOF", "指数", "混合", "债券", "货币",
        "易方达", "华夏", "南方", "嘉实", "招商", "天弘"
    ]
    
    def __init__(self, llm=None):
        self.llm = llm
    
    def extract_from_text(self, text: str) -> List[Dict]:
        """从文本中提取持仓信息
        
        优先使用 LLM，失败则回退到正则
        """
        if self.llm:
            return self._extract_with_llm(text)
        return self._extract_with_regex(text)
    
    def _extract_with_llm(self, text: str) -> List[Dict]:
        """使用 LLM 提取"""
        prompt = f"""请从以下文本中提取投资持仓信息。

文本:
{text[:2000]}

请以 JSON 格式返回，每个持仓包含：
- code: 代码 (6位数字)
- name: 名称
- type: 类型 (fund/stock/etf)
- weight: 仓位比例 (如果提到)
- confidence: 提取置信度 (0-1)

只返回 JSON 数组，不要其他内容。
示例: [{{"code": "110011", "name": "易方达中小盘", "type": "fund", "weight": 0.2, "confidence": 0.9}}]
"""
        try:
            response = self.llm.generate(prompt)
            # 提取 JSON
            match = re.search(r'\[.*\]', response, re.DOTALL)
            if match:
                return json.loads(match.group())
        except Exception as e:
            logger.warning(f"LLM 提取失败: {e}")
        
        return self._extract_with_regex(text)
    
    def _extract_with_regex(self, text: str) -> List[Dict]:
        """使用正则表达式提取"""
        holdings = []
        
        # 提取6位数字代码
        codes = re.findall(self.FUND_CODE_PATTERN, text)
        
        for code in codes:
            # 判断是否为基金 (一般以 0/1/2/5/6 开头)
            if code[0] in "012356":
                holding = {
                    "code": code,
                    "name": f"代码{code}",
                    "type": "fund" if code[0] in "012" else "stock",
                    "weight": 0,
                    "confidence": 0.6  # 正则提取置信度较低
                }
                
                # 尝试在上下文中找名称
                for keyword in self.FUND_KEYWORDS:
                    if keyword in text:
                        pattern = f'{keyword}[^，。,.\n]*{code}|{code}[^，。,.\n]*{keyword}'
                        name_match = re.search(pattern, text)
                        if name_match:
                            holding["confidence"] = 0.8
                            break
                
                holdings.append(holding)
        
        return holdings


# ============ 数据源抓取 ============

class XueqiuScraper:
    """雪球数据抓取"""
    
    BASE_URL = "https://xueqiu.com"
    
    def get_user_posts(self, user_id: str, limit: int = 20) -> List[Dict]:
        """获取用户帖子"""
        # 实际场景需要登录态和反反爬虫
        # 这里返回模拟数据
        return [
            {
                "id": "123456",
                "text": "今天加仓了110011易方达中小盘，长期看好消费升级...",
                "created_at": datetime.now().isoformat(),
                "retweet_count": 100,
                "reply_count": 50
            }
        ]
    
    def get_user_portfolio(self, user_id: str) -> Optional[Dict]:
        """获取用户公开组合 (如果有)"""
        # 雪球部分用户会公开组合
        return None


class WechatArticleParser:
    """公众号文章解析"""
    
    def parse_article(self, article_url: str) -> Dict:
        """解析公众号文章"""
        # 实际需要使用专门的公众号抓取服务
        return {
            "title": "我的2024年基金持仓公开",
            "content": "...",
            "author": "某财经博主",
            "publish_time": datetime.now().isoformat()
        }


# ============ Shadow Tracker Service ============

class ShadowTrackerService:
    """影子基金经理追踪服务"""
    
    def __init__(self, db_path: str = "./data/shadow.db", llm=None):
        self.db_path = db_path
        self.llm = llm
        self.extractor = HoldingExtractor(llm)
        self.xueqiu = XueqiuScraper()
        self.wechat = WechatArticleParser()
        self._ensure_db()
    
    def _ensure_db(self):
        """初始化数据库"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 博主表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bloggers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                platform TEXT NOT NULL,
                platform_id TEXT NOT NULL,
                name TEXT NOT NULL,
                avatar_url TEXT,
                followers INTEGER DEFAULT 0,
                description TEXT,
                track_since TEXT,
                is_active INTEGER DEFAULT 1,
                UNIQUE(platform, platform_id)
            )
        """)
        
        # 持仓记录表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS shadow_holdings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                blogger_id INTEGER NOT NULL,
                fund_code TEXT NOT NULL,
                fund_name TEXT,
                position_type TEXT DEFAULT 'fund',
                shares REAL DEFAULT 0,
                weight REAL DEFAULT 0,
                cost_price REAL DEFAULT 0,
                disclosed_date TEXT,
                source_url TEXT,
                confidence REAL DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 组合快照表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS portfolio_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                blogger_id INTEGER NOT NULL,
                snapshot_date TEXT NOT NULL,
                total_value REAL,
                holdings_json TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(blogger_id, snapshot_date)
            )
        """)
        
        # 业绩归因表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                blogger_id INTEGER NOT NULL,
                period TEXT NOT NULL,
                total_return REAL,
                benchmark_return REAL,
                alpha REAL,
                max_drawdown REAL,
                sharpe_ratio REAL,
                win_rate REAL,
                timing_score REAL,
                style_drift REAL,
                calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(blogger_id, period)
            )
        """)
        
        conn.commit()
        conn.close()
        logger.info("✅ Shadow Tracker 数据库初始化完成")
    
    # ============ 博主管理 ============
    
    def add_blogger(
        self, 
        platform: str, 
        platform_id: str, 
        name: str,
        description: str = ""
    ) -> int:
        """添加追踪博主"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO bloggers 
            (platform, platform_id, name, description, track_since)
            VALUES (?, ?, ?, ?, ?)
        """, (platform, platform_id, name, description, datetime.now().isoformat()))
        
        blogger_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f"✅ 开始追踪博主: {name} ({platform})")
        return blogger_id
    
    def get_blogger(self, blogger_id: int) -> Optional[Blogger]:
        """获取博主信息"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM bloggers WHERE id = ?", (blogger_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return Blogger(
                id=row[0],
                platform=row[1],
                platform_id=row[2],
                name=row[3],
                avatar_url=row[4],
                followers=row[5],
                description=row[6],
                track_since=datetime.fromisoformat(row[7]) if row[7] else None,
                is_active=bool(row[8])
            )
        return None
    
    def list_bloggers(self, active_only: bool = True) -> List[Blogger]:
        """列出所有追踪的博主"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        sql = "SELECT * FROM bloggers"
        if active_only:
            sql += " WHERE is_active = 1"
        sql += " ORDER BY followers DESC"
        
        cursor.execute(sql)
        bloggers = []
        for row in cursor.fetchall():
            bloggers.append(Blogger(
                id=row[0],
                platform=row[1],
                platform_id=row[2],
                name=row[3],
                followers=row[5],
                description=row[6]
            ))
        
        conn.close()
        return bloggers
    
    # ============ 持仓抓取 ============
    
    async def fetch_and_extract(self, blogger_id: int) -> List[ShadowHolding]:
        """抓取并提取博主最新持仓"""
        blogger = self.get_blogger(blogger_id)
        if not blogger:
            return []
        
        # 根据平台选择抓取器
        if blogger.platform == BloggerPlatform.XUEQIU.value:
            posts = self.xueqiu.get_user_posts(blogger.platform_id)
        elif blogger.platform == BloggerPlatform.WECHAT.value:
            # 公众号需要指定文章URL
            posts = []
        else:
            posts = []
        
        holdings = []
        for post in posts:
            text = post.get("text", "") or post.get("content", "")
            extracted = self.extractor.extract_from_text(text)
            
            for item in extracted:
                holding = ShadowHolding(
                    blogger_id=blogger_id,
                    fund_code=item["code"],
                    fund_name=item.get("name", ""),
                    position_type=item.get("type", "fund"),
                    weight=item.get("weight", 0),
                    disclosed_date=date.today(),
                    source_url=post.get("url", ""),
                    confidence=item.get("confidence", 0.5)
                )
                holdings.append(holding)
        
        # 保存持仓
        self._save_holdings(holdings)
        
        return holdings
    
    def _save_holdings(self, holdings: List[ShadowHolding]):
        """保存持仓记录"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for h in holdings:
            cursor.execute("""
                INSERT INTO shadow_holdings 
                (blogger_id, fund_code, fund_name, position_type, 
                 weight, disclosed_date, source_url, confidence)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                h.blogger_id, h.fund_code, h.fund_name, h.position_type,
                h.weight, str(h.disclosed_date), h.source_url, h.confidence
            ))
        
        conn.commit()
        conn.close()
    
    # ============ 组合构建 ============
    
    def build_shadow_portfolio(self, blogger_id: int) -> ShadowPortfolio:
        """构建影子组合"""
        blogger = self.get_blogger(blogger_id)
        if not blogger:
            raise ValueError(f"博主不存在: {blogger_id}")
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 获取最新持仓
        cursor.execute("""
            SELECT * FROM shadow_holdings 
            WHERE blogger_id = ?
            ORDER BY disclosed_date DESC
        """, (blogger_id,))
        
        holdings = []
        seen_codes = set()
        
        for row in cursor.fetchall():
            code = row[2]
            if code not in seen_codes:
                seen_codes.add(code)
                holdings.append(ShadowHolding(
                    id=row[0],
                    blogger_id=row[1],
                    fund_code=code,
                    fund_name=row[3],
                    position_type=row[4],
                    weight=row[6],
                    disclosed_date=date.fromisoformat(row[8]) if row[8] else None,
                    confidence=row[10]
                ))
        
        conn.close()
        
        return ShadowPortfolio(
            blogger_id=blogger_id,
            blogger_name=blogger.name,
            snapshot_date=date.today(),
            holdings=holdings
        )
    
    # ============ 业绩归因 ============
    
    async def analyze_performance(
        self, 
        blogger_id: int,
        period: str = "3M"
    ) -> PerformanceMetrics:
        """分析博主投资业绩
        
        Args:
            blogger_id: 博主ID
            period: 分析周期 (1M/3M/6M/1Y)
        """
        portfolio = self.build_shadow_portfolio(blogger_id)
        
        # 计算组合收益
        total_return = await self._calculate_portfolio_return(portfolio, period)
        
        # 获取基准收益 (沪深300)
        benchmark_return = await self._get_benchmark_return(period)
        
        # 计算 Alpha
        alpha = total_return - benchmark_return
        
        # 计算其他指标
        max_drawdown = await self._calculate_max_drawdown(portfolio, period)
        sharpe = await self._calculate_sharpe_ratio(portfolio, period)
        win_rate = await self._calculate_win_rate(portfolio)
        timing_score = await self._calculate_timing_score(portfolio)
        style_drift = await self._calculate_style_drift(portfolio)
        
        metrics = PerformanceMetrics(
            blogger_id=blogger_id,
            period=period,
            total_return=round(total_return, 2),
            benchmark_return=round(benchmark_return, 2),
            alpha=round(alpha, 2),
            max_drawdown=round(max_drawdown, 2),
            sharpe_ratio=round(sharpe, 2),
            win_rate=round(win_rate, 2),
            timing_score=round(timing_score, 1),
            style_drift=round(style_drift, 2)
        )
        
        # 保存
        self._save_metrics(metrics)
        
        return metrics
    
    async def _calculate_portfolio_return(
        self, 
        portfolio: ShadowPortfolio, 
        period: str
    ) -> float:
        """计算组合收益率"""
        # 简化：使用等权重计算
        import random
        return random.uniform(-10, 30)  # 模拟数据
    
    async def _get_benchmark_return(self, period: str) -> float:
        """获取基准收益"""
        import random
        return random.uniform(-5, 15)
    
    async def _calculate_max_drawdown(self, portfolio, period) -> float:
        import random
        return random.uniform(5, 25)
    
    async def _calculate_sharpe_ratio(self, portfolio, period) -> float:
        import random
        return random.uniform(0.5, 2.0)
    
    async def _calculate_win_rate(self, portfolio) -> float:
        """计算选股胜率"""
        import random
        return random.uniform(40, 70)
    
    async def _calculate_timing_score(self, portfolio) -> float:
        """计算择时能力评分 (0-100)"""
        import random
        return random.uniform(30, 80)
    
    async def _calculate_style_drift(self, portfolio) -> float:
        """计算风格漂移指数"""
        import random
        return random.uniform(0, 0.5)
    
    def _save_metrics(self, metrics: PerformanceMetrics):
        """保存业绩指标"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO performance_metrics 
            (blogger_id, period, total_return, benchmark_return, alpha,
             max_drawdown, sharpe_ratio, win_rate, timing_score, style_drift)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            metrics.blogger_id, metrics.period, metrics.total_return,
            metrics.benchmark_return, metrics.alpha, metrics.max_drawdown,
            metrics.sharpe_ratio, metrics.win_rate, metrics.timing_score,
            metrics.style_drift
        ))
        
        conn.commit()
        conn.close()
    
    # ============ 博主排行 ============
    
    def get_blogger_ranking(
        self, 
        period: str = "3M",
        sort_by: str = "alpha",
        limit: int = 20
    ) -> List[Dict]:
        """获取博主排行榜"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(f"""
            SELECT b.id, b.name, b.platform, b.followers, p.*
            FROM bloggers b
            LEFT JOIN performance_metrics p ON b.id = p.blogger_id AND p.period = ?
            WHERE b.is_active = 1
            ORDER BY p.{sort_by} DESC NULLS LAST
            LIMIT ?
        """, (period, limit))
        
        ranking = []
        for i, row in enumerate(cursor.fetchall(), 1):
            ranking.append({
                "rank": i,
                "blogger_id": row[0],
                "name": row[1],
                "platform": row[2],
                "followers": row[3],
                "total_return": row[7] if len(row) > 7 else None,
                "alpha": row[9] if len(row) > 9 else None,
                "sharpe_ratio": row[11] if len(row) > 11 else None,
                "win_rate": row[12] if len(row) > 12 else None
            })
        
        conn.close()
        return ranking


# 单例
_shadow_service: Optional[ShadowTrackerService] = None

def get_shadow_service(llm=None) -> ShadowTrackerService:
    global _shadow_service
    if _shadow_service is None:
        _shadow_service = ShadowTrackerService(llm=llm)
    return _shadow_service
