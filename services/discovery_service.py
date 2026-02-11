"""基金发现服务 - Robinhood 风格

提供：
- Daily Movers (涨跌幅榜/热度榜/资金流向)
- AI 简报 (LLM 总结涨跌原因)
- 个性化标签
"""

import os
import sqlite3
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
import logging
import time

logger = logging.getLogger(__name__)


# ============ 数据模型 ============

@dataclass
class FundMover:
    """基金涨跌数据"""
    fund_code: str
    fund_name: str
    nav: float
    change_pct: float
    change_amount: float = 0.0
    volume: float = 0.0
    popularity_score: float = 0.0  # 热度分
    fund_flow: float = 0.0  # 资金流向
    tags: List[str] = None
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d['tags'] = self.tags or []
        d['day_change'] = self.change_pct  # Alias for frontend
        # Frontend expects 'code' and 'name'
        d['code'] = self.fund_code
        d['name'] = self.fund_name
        return d


@dataclass
class FundBrief:
    """AI 简报"""
    fund_code: str
    fund_name: str
    trend: str  # up / down / neutral
    change_pct: float
    reasons: List[str]  # 3条涨跌原因
    generated_at: datetime = None
    
    def to_dict(self) -> Dict:
        return {
            "fund_code": self.fund_code,
            "fund_name": self.fund_name,
            "trend": self.trend,
            "change_pct": self.change_pct,
            "reasons": self.reasons,
            "generated_at": (self.generated_at or datetime.now()).isoformat()
        }


@dataclass
class FundTag:
    """基金标签"""
    tag_id: int
    name: str  # #AI巨头、#抗通胀
    slug: str  # ai-giants, anti-inflation
    color: str  # 标签颜色
    fund_count: int = 0


# ============ Discovery Service ============

class DiscoveryService:
    """基金发现服务"""
    
    # 预定义标签
    PRESET_TAGS = [
        {"name": "#AI巨头持仓", "slug": "ai-giants", "color": "#8b5cf6"},
        {"name": "#抗通胀", "slug": "anti-inflation", "color": "#f59e0b"},
        {"name": "#绿色能源", "slug": "green-energy", "color": "#10b981"},
        {"name": "#消费龙头", "slug": "consumer-leaders", "color": "#ef4444"},
        {"name": "#科技成长", "slug": "tech-growth", "color": "#3b82f6"},
        {"name": "#高股息", "slug": "high-dividend", "color": "#ec4899"},
        {"name": "#医药健康", "slug": "healthcare", "color": "#14b8a6"},
        {"name": "#新能源车", "slug": "ev", "color": "#6366f1"},
    ]
    
    def __init__(self, db_path: str = "./data/discovery.db"):
        self.db_path = db_path
        self._llm = None
        self._movers_cache = {} # {limit: (data, timestamp)}
        self._ensure_db()
    
    def _ensure_db(self):
        """初始化数据库"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 热度记录表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fund_popularity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fund_code TEXT NOT NULL,
                search_count INTEGER DEFAULT 0,
                view_count INTEGER DEFAULT 0,
                trade_count INTEGER DEFAULT 0,
                date TEXT NOT NULL,
                UNIQUE(fund_code, date)
            )
        """)
        
        # 标签表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                slug TEXT NOT NULL UNIQUE,
                color TEXT DEFAULT '#6b7280'
            )
        """)
        
        # 基金-标签关联表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fund_tags (
                fund_code TEXT NOT NULL,
                tag_id INTEGER NOT NULL,
                confidence REAL DEFAULT 1.0,
                source TEXT DEFAULT 'manual',
                PRIMARY KEY (fund_code, tag_id)
            )
        """)
        
        # AI简报缓存表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fund_briefs (
                fund_code TEXT PRIMARY KEY,
                brief_json TEXT,
                generated_at TEXT,
                expires_at TEXT
            )
        """)
        
        # 初始化预设标签
        for tag in self.PRESET_TAGS:
            cursor.execute(
                "INSERT OR IGNORE INTO tags (name, slug, color) VALUES (?, ?, ?)",
                (tag["name"], tag["slug"], tag["color"])
            )
        
        conn.commit()
        conn.close()
        logger.info("✅ Discovery 数据库初始化完成")
    
    # ============ Daily Movers ============
    
    async def get_daily_movers(self, limit: int = 10) -> Dict[str, List[Dict]]:
        """获取 Daily Movers (Real-time from MarketDataService)"""
        # Check cache (1 minute TTL)
        now = time.time()
        if limit in self._movers_cache:
            data, timestamp = self._movers_cache[limit]
            if now - timestamp < 60:
                logger.debug(f"Returning cached movers for limit {limit}")
                return data

        try:
            from tools.market_data import get_market_service
            market_service = get_market_service()
            
            # Fetch Gainers and Losers
            gainers_nav = market_service.get_fund_rankings(sort_by="1r", limit=limit)
            losers_nav = market_service.get_fund_rankings(sort_by="1r_asc", limit=limit)
            
            # Use a single connection for the entire operation
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Helper to convert FundNavData to FundMover using the shared cursor
            def to_mover(fund_nav, cursor) -> FundMover:
                popularity = self._get_popularity(fund_nav.fund_code, cursor)
                tags = self.get_fund_tags(fund_nav.fund_code, cursor)
                
                return FundMover(
                    fund_code=fund_nav.fund_code,
                    fund_name=fund_nav.fund_name,
                    nav=fund_nav.nav,
                    change_pct=fund_nav.change_percent,
                    change_amount=fund_nav.nav * (fund_nav.change_percent / 100.0) if fund_nav.change_percent else 0.0,
                    popularity_score=popularity if popularity > 0 else 100.0, # Default popularity
                    tags=[t["name"] for t in tags]
                )
            
            top_gainers = [to_mover(f, cursor) for f in gainers_nav]
            top_losers = [to_mover(f, cursor) for f in losers_nav]
            
            conn.close()
            
            # Most Popular: Sort gainers+losers by popularity
            all_movers = top_gainers + top_losers
            # Remove duplicates
            seen = set()
            unique_movers = []
            for m in all_movers:
                if m.fund_code not in seen:
                    unique_movers.append(m)
                    seen.add(m.fund_code)
                    
            most_popular = sorted(unique_movers, key=lambda x: x.popularity_score, reverse=True)[:limit]
            
            if not gainers_nav or not losers_nav:
                raise Exception("Empty market data received")

            result = {
                "top_gainers": [f.to_dict() for f in top_gainers],
                "top_losers": [f.to_dict() for f in top_losers],
                "most_popular": [f.to_dict() for f in most_popular],
                "fund_flows": []
            }
            # Cache result
            self._movers_cache[limit] = (result, time.time())
            return result
            
        except Exception as e:
            logger.error(f"Error fetching daily movers: {e}")
            # Fallback to mock if market service fails
            funds_data = self._generate_mock_movers()
            top_gainers = sorted(funds_data, key=lambda x: x.change_pct, reverse=True)[:limit]
            top_losers = sorted(funds_data, key=lambda x: x.change_pct)[:limit]
            most_popular = sorted(funds_data, key=lambda x: x.popularity_score, reverse=True)[:limit]
            
            return {
                "top_gainers": [f.to_dict() for f in top_gainers],
                "top_losers": [f.to_dict() for f in top_losers],
                "most_popular": [f.to_dict() for f in most_popular],
                "fund_flows": []
            }
    
    def _generate_mock_movers(self) -> List[FundMover]:
        """生成模拟 Movers 数据"""
        import random
        
        mock_funds = [
            ("110011", "易方达中小盘"),
            ("161725", "招商白酒"),
            ("000001", "华夏成长"),
            ("519068", "汇添富成长"),
            ("003834", "华夏能源革新"),
            ("005827", "易方达蓝筹"),
            ("260108", "景顺长城新兴"),
            ("163406", "兴全合润"),
        ]
        
        return [
            FundMover(
                fund_code=code,
                fund_name=name,
                nav=round(random.uniform(1.0, 5.0), 4),
                change_pct=round(random.uniform(-5, 5), 2),
                popularity_score=random.randint(100, 10000),
                tags=random.sample(["#科技成长", "#消费龙头", "#AI巨头持仓"], k=random.randint(1, 2))
            )
            for code, name in mock_funds
        ]
    
    def _get_popularity(self, fund_code: str, cursor: sqlite3.Cursor = None) -> float:
        """获取基金热度分"""
        should_close = False
        if cursor is None:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            should_close = True
        
        today = datetime.now().strftime("%Y-%m-%d")
        cursor.execute("""
            SELECT search_count + view_count * 0.5 + trade_count * 2 
            FROM fund_popularity 
            WHERE fund_code = ? AND date = ?
        """, (fund_code, today))
        
        row = cursor.fetchone()
        
        if should_close:
            cursor.connection.close()
        
        return row[0] if row else 0.0
    
    def record_search(self, fund_code: str):
        """记录搜索热度"""
        self._increment_popularity(fund_code, "search_count")
    
    def record_view(self, fund_code: str):
        """记录浏览热度"""
        self._increment_popularity(fund_code, "view_count")
    
    def _increment_popularity(self, fund_code: str, field: str):
        """增加热度计数"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        today = datetime.now().strftime("%Y-%m-%d")
        cursor.execute(f"""
            INSERT INTO fund_popularity (fund_code, {field}, date)
            VALUES (?, 1, ?)
            ON CONFLICT(fund_code, date) DO UPDATE SET {field} = {field} + 1
        """, (fund_code, today))
        
        conn.commit()
        conn.close()
    
    # ============ AI 简报 ============
    
    async def generate_brief(self, fund_code: str) -> FundBrief:
        """生成 AI 简报 (Cortex Style)
        
        使用 LLM 从公告和新闻中提取涨跌原因
        """
        # 检查缓存
        cached = self._get_cached_brief(fund_code)
        if cached:
            return cached
        
        # 获取基金数据
        from tools.market_data import get_market_service
        market_service = get_market_service()
        
        # Get historical data for last 5 days (approx)
        # MarketDataService returns specific range, let's use '1m' and slice
        hist_data = market_service.get_historical_nav(fund_code, range_type="1m")
        
        if not hist_data or not hist_data.points:
            return self._generate_fallback_brief(fund_code)
            
        # Get last 5 points
        # Points are usually sorted by date ascending? Let's check HistoricalData
        # Eastmoney returns ascending usually.
        points = hist_data.points[-5:]
        points.reverse() # We want newest first for analysis logic below (today = history[0])
        history = points
        
        if not history:
            return self._generate_fallback_brief(fund_code)
        
        # 计算趋势
        today = history[0]
        change_pct = today.change_percent if today.change_percent else 0
        trend = "up" if change_pct > 0 else ("down" if change_pct < 0 else "neutral")
        
        # 尝试使用 LLM 生成原因
        reasons = await self._generate_reasons_with_llm(fund_code, trend, change_pct)
        
        brief = FundBrief(
            fund_code=fund_code,
            fund_name=f"基金{fund_code}",
            trend=trend,
            change_pct=change_pct,
            reasons=reasons,
            generated_at=datetime.now()
        )
        
        # 缓存
        self._cache_brief(brief)
        
        return brief
    
    async def _generate_reasons_with_llm(
        self, 
        fund_code: str, 
        trend: str, 
        change_pct: float
    ) -> List[str]:
        """使用 LLM 生成涨跌原因"""
        try:
            from hello_agents import HelloAgentsLLM
            
            if not self._llm:
                self._llm = HelloAgentsLLM()
            
            prompt = f"""
            基金 {fund_code} 今日{'' if trend == 'up' else '下'}涨 {abs(change_pct):.2f}%。
            请用简洁的中文给出3条可能的原因（每条不超过20字）。
            只返回JSON数组格式：["原因1", "原因2", "原因3"]
            """
            
            response = await self._llm.agenerate(prompt)
            
            # 解析 JSON
            import re
            match = re.search(r'\[.*\]', response, re.DOTALL)
            if match:
                reasons = json.loads(match.group())
                return reasons[:3]
        except Exception as e:
            logger.warning(f"LLM 生成失败: {e}")
        
        # 降级到模板
        return self._generate_template_reasons(trend, change_pct)
    
    def _generate_template_reasons(self, trend: str, change_pct: float) -> List[str]:
        """模板化原因（降级方案）"""
        if trend == "up":
            return [
                "市场情绪回暖，风险偏好提升",
                "板块轮动效应，资金流入",
                "基本面改善，业绩预期向好"
            ]
        elif trend == "down":
            return [
                "市场整体调整，避险情绪上升",
                "资金获利了结，短期回调",
                "外围市场波动，影响投资情绪"
            ]
        else:
            return [
                "市场处于震荡整理阶段",
                "多空博弈激烈，方向待明",
                "等待重要数据或政策指引"
            ]
    
    def _generate_fallback_brief(self, fund_code: str) -> FundBrief:
        """降级简报"""
        return FundBrief(
            fund_code=fund_code,
            fund_name=f"基金{fund_code}",
            trend="neutral",
            change_pct=0,
            reasons=["暂无数据", "请稍后重试", ""],
            generated_at=datetime.now()
        )
    
    def _get_cached_brief(self, fund_code: str) -> Optional[FundBrief]:
        """获取缓存的简报"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT brief_json, expires_at FROM fund_briefs WHERE fund_code = ?
        """, (fund_code,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            expires_at = datetime.fromisoformat(row[1])
            if expires_at > datetime.now():
                data = json.loads(row[0])
                return FundBrief(**data)
        
        return None
    
    def _cache_brief(self, brief: FundBrief, ttl_hours: int = 4):
        """缓存简报"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        expires_at = datetime.now() + timedelta(hours=ttl_hours)
        brief_data = {
            "fund_code": brief.fund_code,
            "fund_name": brief.fund_name,
            "trend": brief.trend,
            "change_pct": brief.change_pct,
            "reasons": brief.reasons,
            "generated_at": brief.generated_at.isoformat() if brief.generated_at else None
        }
        
        cursor.execute("""
            INSERT OR REPLACE INTO fund_briefs (fund_code, brief_json, generated_at, expires_at)
            VALUES (?, ?, ?, ?)
        """, (
            brief.fund_code,
            json.dumps(brief_data, ensure_ascii=False),
            datetime.now().isoformat(),
            expires_at.isoformat()
        ))
        
        conn.commit()
        conn.close()
    
    # ============ 个性化标签 ============
    
    def get_all_tags(self) -> List[Dict]:
        """获取所有标签"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT t.id, t.name, t.slug, t.color, COUNT(ft.fund_code) as fund_count
            FROM tags t
            LEFT JOIN fund_tags ft ON t.id = ft.tag_id
            GROUP BY t.id
            ORDER BY fund_count DESC
        """)
        
        tags = []
        for row in cursor.fetchall():
            tags.append({
                "id": row[0],
                "name": row[1],
                "slug": row[2],
                "color": row[3],
                "fund_count": row[4]
            })
        
        conn.close()
        return tags
    
    def get_fund_tags(self, fund_code: str, cursor: sqlite3.Cursor = None) -> List[Dict]:
        """获取基金的标签"""
        should_close = False
        if cursor is None:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            should_close = True
        
        cursor.execute("""
            SELECT t.id, t.name, t.slug, t.color, ft.confidence
            FROM fund_tags ft
            JOIN tags t ON ft.tag_id = t.id
            WHERE ft.fund_code = ?
            ORDER BY ft.confidence DESC
        """, (fund_code,))
        
        tags = []
        for row in cursor.fetchall():
            tags.append({
                "id": row[0],
                "name": row[1],
                "slug": row[2],
                "color": row[3],
                "confidence": row[4]
            })
        
        if should_close:
            cursor.connection.close()
            
        return tags
    
    def add_fund_tag(self, fund_code: str, tag_slug: str, confidence: float = 1.0):
        """为基金添加标签"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 获取 tag_id
        cursor.execute("SELECT id FROM tags WHERE slug = ?", (tag_slug,))
        row = cursor.fetchone()
        
        if row:
            tag_id = row[0]
            cursor.execute("""
                INSERT OR REPLACE INTO fund_tags (fund_code, tag_id, confidence, source)
                VALUES (?, ?, ?, 'manual')
            """, (fund_code, tag_id, confidence))
            conn.commit()
        
        conn.close()
    
    def get_funds_by_tag(self, tag_slug: str, limit: int = 20) -> List[Dict]:
        """通过标签发现基金"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT ft.fund_code, ft.confidence
            FROM fund_tags ft
            JOIN tags t ON ft.tag_id = t.id
            WHERE t.slug = ?
            ORDER BY ft.confidence DESC
            LIMIT ?
        """, (tag_slug, limit))
        
        funds = []
        for row in cursor.fetchall():
            funds.append({
                "fund_code": row[0],
                "confidence": row[1]
            })
        
        conn.close()
        return funds


# 单例
_discovery_service: Optional[DiscoveryService] = None

def get_discovery_service() -> DiscoveryService:
    global _discovery_service
    if _discovery_service is None:
        _discovery_service = DiscoveryService()
    return _discovery_service
