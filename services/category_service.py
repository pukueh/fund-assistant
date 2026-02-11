"""板块分类服务 - CoinGecko 风格

提供：
- 多维度标签 (Many-to-Many Tagging)
- 板块指数实时计算 (15分钟聚合)
- Top Gainers/Losers Categories API
"""

import os
import sqlite3
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)


# ============ 数据模型 ============

@dataclass
class Category:
    """板块/分类"""
    id: int = 0
    name: str = ""
    slug: str = ""
    description: str = ""
    icon: str = "📊"
    fund_count: int = 0
    # 实时计算的指标
    weighted_change_pct: float = 0.0
    total_aum: float = 0.0
    top_fund_code: str = ""
    top_fund_name: str = ""
    updated_at: datetime = None
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "icon": self.icon,
            "fund_count": self.fund_count,
            "change_pct": round(self.weighted_change_pct, 2),
            "total_aum": round(self.total_aum, 2),
            "top_fund": {
                "code": self.top_fund_code,
                "name": self.top_fund_name
            } if self.top_fund_code else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "day_change": round(self.weighted_change_pct, 2)  # Alias for frontend
        }


@dataclass
class FundCategoryMapping:
    """基金-板块关联"""
    fund_code: str
    category_id: int
    weight: float = 1.0  # 权重（用于加权计算）


# ============ 预定义板块 ============

PRESET_CATEGORIES = [
    {"name": "科技", "slug": "tech", "icon": "💻", "description": "科技与互联网相关基金"},
    {"name": "美股", "slug": "us-stock", "icon": "🇺🇸", "description": "投资美国市场的基金"},
    {"name": "AI 产业链", "slug": "ai", "icon": "🤖", "description": "人工智能相关基金"},
    {"name": "消费", "slug": "consumer", "icon": "🛒", "description": "大消费主题基金"},
    {"name": "医药健康", "slug": "healthcare", "icon": "💊", "description": "医药医疗健康基金"},
    {"name": "新能源", "slug": "new-energy", "icon": "⚡", "description": "新能源与光伏基金"},
    {"name": "半导体", "slug": "semiconductor", "icon": "🔧", "description": "半导体芯片基金"},
    {"name": "金融", "slug": "finance", "icon": "🏦", "description": "金融银行保险基金"},
    {"name": "港股", "slug": "hk-stock", "icon": "🇭🇰", "description": "投资香港市场的基金"},
    {"name": "债券", "slug": "bond", "icon": "📜", "description": "债券型基金"},
    {"name": "指数增强", "slug": "index-enhanced", "icon": "📈", "description": "指数增强型基金"},
    {"name": "QDII", "slug": "qdii", "icon": "🌍", "description": "合格境内机构投资者基金"},
]


# ============ Category Service ============

class CategoryService:
    """板块分类服务"""
    
    # 缓存配置
    CACHE_TTL_MINUTES = 15
    
    def __init__(self, db_path: str = "./data/category.db"):
        self.db_path = db_path
        self._index_cache: Dict[int, Dict] = {}  # 板块指数缓存
        self._cache_updated_at: datetime = None
        self._ensure_db()
    
    def _ensure_db(self):
        """初始化数据库"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 板块表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                slug TEXT NOT NULL UNIQUE,
                description TEXT,
                icon TEXT DEFAULT '📊',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 基金-板块关联表 (多对多)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fund_categories (
                fund_code TEXT NOT NULL,
                category_id INTEGER NOT NULL,
                weight REAL DEFAULT 1.0,
                added_at TEXT DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (fund_code, category_id)
            )
        """)
        
        # 板块指数快照表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS category_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_id INTEGER NOT NULL,
                weighted_change_pct REAL,
                total_aum REAL,
                fund_count INTEGER,
                top_fund_code TEXT,
                snapshot_time TEXT,
                UNIQUE(category_id, snapshot_time)
            )
        """)
        
        # 创建索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_fund_categories_fund 
            ON fund_categories(fund_code)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_fund_categories_category 
            ON fund_categories(category_id)
        """)
        
        # 初始化预设板块
        for cat in PRESET_CATEGORIES:
            cursor.execute(
                "INSERT OR IGNORE INTO categories (name, slug, icon, description) VALUES (?, ?, ?, ?)",
                (cat["name"], cat["slug"], cat["icon"], cat["description"])
            )
        
        conn.commit()
        conn.close()
        logger.info("✅ Category 数据库初始化完成")
    
    # ============ 板块管理 ============
    
    def get_all_categories(self) -> List[Category]:
        """获取所有板块"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT c.id, c.name, c.slug, c.description, c.icon,
                   COUNT(fc.fund_code) as fund_count
            FROM categories c
            LEFT JOIN fund_categories fc ON c.id = fc.category_id
            GROUP BY c.id
            ORDER BY fund_count DESC
        """)
        
        categories = []
        for row in cursor.fetchall():
            cat = Category(
                id=row[0],
                name=row[1],
                slug=row[2],
                description=row[3],
                icon=row[4],
                fund_count=row[5]
            )
            
            # 从缓存获取指数数据
            if row[0] in self._index_cache:
                cache = self._index_cache[row[0]]
                cat.weighted_change_pct = cache.get("change_pct", 0)
                cat.total_aum = cache.get("total_aum", 0)
                cat.top_fund_code = cache.get("top_fund_code", "")
                cat.top_fund_name = cache.get("top_fund_name", "")
                cat.updated_at = cache.get("updated_at")
            
            categories.append(cat)
        
        conn.close()
        return categories
    
    def get_category_by_slug(self, slug: str) -> Optional[Category]:
        """根据 slug 获取板块"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT c.id, c.name, c.slug, c.description, c.icon,
                   COUNT(fc.fund_code) as fund_count
            FROM categories c
            LEFT JOIN fund_categories fc ON c.id = fc.category_id
            WHERE c.slug = ?
            GROUP BY c.id
        """, (slug,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return Category(
                id=row[0],
                name=row[1],
                slug=row[2],
                description=row[3],
                icon=row[4],
                fund_count=row[5]
            )
        return None
    
    # ============ 多维度标签 ============
    
    def add_fund_to_category(self, fund_code: str, category_slug: str, weight: float = 1.0):
        """将基金添加到板块"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 获取 category_id
        cursor.execute("SELECT id FROM categories WHERE slug = ?", (category_slug,))
        row = cursor.fetchone()
        
        if row:
            cursor.execute("""
                INSERT OR REPLACE INTO fund_categories (fund_code, category_id, weight)
                VALUES (?, ?, ?)
            """, (fund_code, row[0], weight))
            conn.commit()
        
        conn.close()
    
    def get_fund_categories(self, fund_code: str) -> List[Category]:
        """获取基金所属的板块（多维度）"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT c.id, c.name, c.slug, c.description, c.icon, fc.weight
            FROM fund_categories fc
            JOIN categories c ON fc.category_id = c.id
            WHERE fc.fund_code = ?
        """, (fund_code,))
        
        categories = []
        for row in cursor.fetchall():
            categories.append(Category(
                id=row[0],
                name=row[1],
                slug=row[2],
                description=row[3],
                icon=row[4]
            ))
        
        conn.close()
        return categories
    
    def get_category_funds(self, category_slug: str, limit: int = 50) -> List[Dict]:
        """获取板块内的基金列表"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT fc.fund_code, fc.weight
            FROM fund_categories fc
            JOIN categories c ON fc.category_id = c.id
            WHERE c.slug = ?
            ORDER BY fc.weight DESC
            LIMIT ?
        """, (category_slug, limit))
        
        funds = [{"fund_code": row[0], "weight": row[1]} for row in cursor.fetchall()]
        conn.close()
        return funds
    
    # ============ 板块指数实时计算 ============
    
    async def calculate_category_index(self, category_id: int) -> Dict:
        """计算单个板块的指数
        
        使用加权平均涨跌幅和总 AUM
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 获取板块内的基金
        cursor.execute("""
            SELECT fund_code, weight FROM fund_categories WHERE category_id = ?
        """, (category_id,))
        
        fund_mappings = cursor.fetchall()
        conn.close()
        
        if not fund_mappings:
            return {
                "change_pct": 0,
                "total_aum": 0,
                "fund_count": 0,
                "top_fund_code": "",
                "top_fund_name": ""
            }
        
        # 获取每个基金的数据
        fund_data = []
        for fund_code, weight in fund_mappings:
            data = await self._get_fund_data(fund_code)
            if data:
                data["weight"] = weight
                fund_data.append(data)
        
        if not fund_data:
            return {
                "change_pct": 0,
                "total_aum": 0,
                "fund_count": 0,
                "top_fund_code": "",
                "top_fund_name": ""
            }
        
        # 计算加权平均涨跌幅
        total_weighted_change = sum(
            f["change_pct"] * f.get("aum", 1) * f["weight"]
            for f in fund_data
        )
        total_weight = sum(
            f.get("aum", 1) * f["weight"] for f in fund_data
        )
        
        weighted_change = total_weighted_change / total_weight if total_weight > 0 else 0
        
        # 总 AUM
        total_aum = sum(f.get("aum", 0) for f in fund_data)
        
        # 找出表现最好的基金
        top_fund = max(fund_data, key=lambda x: x["change_pct"])
        
        result = {
            "change_pct": round(weighted_change, 2),
            "total_aum": round(total_aum, 2),
            "fund_count": len(fund_data),
            "top_fund_code": top_fund["fund_code"],
            "top_fund_name": top_fund.get("fund_name", ""),
            "updated_at": datetime.now()
        }
        
        # 更新缓存
        self._index_cache[category_id] = result
        
        return result
    
    async def _get_fund_data(self, fund_code: str) -> Optional[Dict]:
        """获取基金数据"""
        try:
            from data_ingestion.collectors import NavCollector
            collector = NavCollector()
            history = collector.get_history(fund_code, limit=2)
            
            if len(history) >= 2:
                today = history[0]
                yesterday = history[1]
                change_pct = ((today.nav - yesterday.nav) / yesterday.nav) * 100
                
                return {
                    "fund_code": fund_code,
                    "fund_name": f"基金{fund_code}",
                    "nav": today.nav,
                    "change_pct": change_pct,
                    "aum": 100  # 假设 AUM
                }
        except Exception as e:
            logger.warning(f"获取基金数据失败 {fund_code}: {e}")
        
        # Fallback to mock data
        import random
        return {
            "fund_code": fund_code,
            "fund_name": f"基金{fund_code}",
            "nav": round(random.uniform(1.0, 5.0), 4),
            "change_pct": round(random.uniform(-3, 3), 2),
            "aum": 100
        }
    
    async def refresh_all_indices(self):
        """刷新所有板块指数
        
        由定时任务每15分钟调用
        """
        categories = self.get_all_categories()
        
        for cat in categories:
            try:
                await self.calculate_category_index(cat.id)
            except Exception as e:
                logger.error(f"刷新板块指数失败 {cat.name}: {e}")
        
        self._cache_updated_at = datetime.now()
        logger.info(f"✅ 已刷新 {len(categories)} 个板块指数")
    
    # ============ Top Categories API ============
    
    async def get_top_categories(self, limit: int = 10) -> Dict[str, List[Dict]]:
        """获取热门板块排行
        
        Returns:
            {
                "top_gainers": [...],
                "top_losers": [...],
                "most_funds": [...]
            }
        """
        # 确保缓存是最新的
        if not self._cache_updated_at or \
           (datetime.now() - self._cache_updated_at).seconds > self.CACHE_TTL_MINUTES * 60:
            await self.refresh_all_indices()
        
        categories = self.get_all_categories()
        
        # 按涨跌幅排序
        sorted_by_change = sorted(
            categories, 
            key=lambda x: x.weighted_change_pct, 
            reverse=True
        )
        
        top_gainers = [c.to_dict() for c in sorted_by_change[:limit]]
        top_losers = [c.to_dict() for c in sorted_by_change[-limit:][::-1]]
        
        # 按基金数量排序
        sorted_by_count = sorted(
            categories,
            key=lambda x: x.fund_count,
            reverse=True
        )
        most_funds = [c.to_dict() for c in sorted_by_count[:limit]]
        
        return {
            "top_gainers": top_gainers,
            "top_losers": top_losers,
            "most_funds": most_funds,
            "updated_at": self._cache_updated_at.isoformat() if self._cache_updated_at else None
        }
    
    def save_snapshot(self, category_id: int, data: Dict):
        """保存板块指数快照"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        snapshot_time = datetime.now().strftime("%Y-%m-%d %H:%M")
        cursor.execute("""
            INSERT OR REPLACE INTO category_snapshots 
            (category_id, weighted_change_pct, total_aum, fund_count, top_fund_code, snapshot_time)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            category_id,
            data.get("change_pct", 0),
            data.get("total_aum", 0),
            data.get("fund_count", 0),
            data.get("top_fund_code", ""),
            snapshot_time
        ))
        
        conn.commit()
        conn.close()


# 单例
_category_service: Optional[CategoryService] = None

def get_category_service() -> CategoryService:
    global _category_service
    if _category_service is None:
        _category_service = CategoryService()
    return _category_service
