"""数据库工具 - SQLite 数据持久化"""

import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from contextlib import contextmanager


class Database:
    """SQLite 数据库管理器"""
    
    def __init__(self, db_path: str = "./data/fund_assistant.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path) or '.', exist_ok=True)
        self._init_tables()
    
    @contextmanager
    def get_connection(self):
        """获取数据库连接（上下文管理器）"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def _init_tables(self):
        """初始化数据库表"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 用户表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT,
                    email TEXT,
                    risk_level TEXT DEFAULT '中等',
                    status TEXT DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 持仓表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS holdings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER DEFAULT 1,
                    fund_code TEXT NOT NULL,
                    fund_name TEXT,
                    shares REAL NOT NULL,
                    cost_nav REAL NOT NULL,
                    cost_amount REAL,
                    buy_date TEXT,
                    tags TEXT DEFAULT '[]',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, fund_code)
                )
            """)
            try:
                cursor.execute("ALTER TABLE holdings ADD COLUMN tags TEXT DEFAULT '[]'")
            except sqlite3.OperationalError:
                pass


            # 聊天历史表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER DEFAULT 1,
                    session_id TEXT,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    agent_name TEXT,
                    metadata TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 创建默认用户
            cursor.execute("""
                INSERT OR IGNORE INTO users (id, username, risk_level, status) 
                VALUES (1, 'default', '中等', 'active')
            """)
            
            # 多账户表 (从 account_api 统一到此处)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS accounts (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    is_default INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL
                )
            """)
            
            # 为 holdings 添加 account_id 列 (多账户支持)
            try:
                cursor.execute("ALTER TABLE holdings ADD COLUMN account_id TEXT DEFAULT 'default'")
            except sqlite3.OperationalError:
                pass
            
            # 资产快照表 (从 portfolio_service 统一到此处)
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
            
            # 成就表 (从 portfolio_service 统一到此处)
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
            
            # 快照索引
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_snapshots_user_date 
                ON portfolio_snapshots(user_id, date DESC)
            """)


class HoldingsRepository:
    """持仓数据仓库"""
    
    def __init__(self, db: Database):
        self.db = db
    
    def list_holdings(self, user_id: int = 1) -> List[Dict]:
        """获取用户持仓列表"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT fund_code, fund_name, shares, cost_nav, cost_amount, buy_date, tags, updated_at
                FROM holdings WHERE user_id = ?
            """, (user_id,))
            return [dict(row) for row in cursor.fetchall()]
    
    def add_holding(self, fund_code: str, fund_name: str, shares: float, 
                    cost_nav: float, buy_date: str = None, tags: List[str] = None, user_id: int = 1) -> Dict:
        """添加或更新持仓"""
        cost_amount = shares * cost_nav
        buy_date = buy_date or datetime.now().strftime("%Y-%m-%d")
        tags_json = json.dumps(tags if tags else [], ensure_ascii=False)
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO holdings (user_id, fund_code, fund_name, shares, cost_nav, cost_amount, buy_date, tags, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, fund_code) DO UPDATE SET
                    fund_name = excluded.fund_name,
                    shares = excluded.shares,
                    cost_nav = excluded.cost_nav,
                    cost_amount = excluded.cost_amount,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id, fund_code, fund_name, shares, cost_nav, cost_amount, buy_date, tags_json))
            
            return {"status": "success", "fund_code": fund_code}
            
    def update_tags(self, fund_code: str, tags: List[str], user_id: int = 1) -> Dict:
        """更新持仓标签"""
        tags_json = json.dumps(tags, ensure_ascii=False)
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE holdings SET tags = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND fund_code = ?
            """, (tags_json, user_id, fund_code))
            
            if cursor.rowcount > 0:
                return {"status": "success", "fund_code": fund_code, "tags": tags}
            return {"status": "not_found", "fund_code": fund_code}
    
    def remove_holding(self, fund_code: str, user_id: int = 1) -> Dict:
        """删除持仓"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM holdings WHERE user_id = ? AND fund_code = ?
            """, (user_id, fund_code))
            
            if cursor.rowcount > 0:
                return {"status": "deleted", "fund_code": fund_code}
            return {"status": "not_found", "fund_code": fund_code}
    
    def import_holdings(self, holdings: List[Dict], user_id: int = 1) -> Dict:
        """批量导入持仓"""
        imported = 0
        for h in holdings:
            self.add_holding(
                fund_code=h.get("fund_code"),
                fund_name=h.get("fund_name", h.get("fund_code")),
                shares=h.get("shares", 0),
                cost_nav=h.get("cost_nav", 1.0),
                buy_date=h.get("buy_date"),
                user_id=user_id
            )
            imported += 1
        return {"status": "imported", "count": imported}


class ChatRepository:
    """聊天历史仓库"""
    
    def __init__(self, db: Database):
        self.db = db
    
    def save_message(self, role: str, content: str, agent_name: str = None,
                     session_id: str = None, user_id: int = 1, metadata: Dict = None) -> int:
        """保存聊天消息"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_history (user_id, session_id, role, content, agent_name, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (user_id, session_id, role, content, agent_name, json.dumps(metadata) if metadata else None))
            return cursor.lastrowid
    
    def get_history(self, user_id: int = 1, session_id: str = None, limit: int = 50) -> List[Dict]:
        """获取聊天历史"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            if session_id:
                cursor.execute("""
                    SELECT role, content, agent_name, created_at FROM chat_history
                    WHERE user_id = ? AND session_id = ?
                    ORDER BY created_at DESC LIMIT ?
                """, (user_id, session_id, limit))
            else:
                cursor.execute("""
                    SELECT role, content, agent_name, created_at FROM chat_history
                    WHERE user_id = ?
                    ORDER BY created_at DESC LIMIT ?
                """, (user_id, limit))
            
            return [dict(row) for row in cursor.fetchall()][::-1]  # Reverse for chronological order
    
    def clear_history(self, user_id: int = 1, session_id: str = None) -> Dict:
        """清空聊天历史"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            if session_id:
                cursor.execute("DELETE FROM chat_history WHERE user_id = ? AND session_id = ?", (user_id, session_id))
            else:
                cursor.execute("DELETE FROM chat_history WHERE user_id = ?", (user_id,))
            return {"status": "cleared", "count": cursor.rowcount}


# 单例数据库实例
_db_instance: Optional[Database] = None

def get_database() -> Database:
    """获取数据库单例"""
    global _db_instance
    if _db_instance is None:
        db_path = os.getenv("DATABASE_PATH", "./data/fund_assistant.db")
        _db_instance = Database(db_path)
    return _db_instance

def get_holdings_repo() -> HoldingsRepository:
    """获取持仓仓库"""
    return HoldingsRepository(get_database())

def get_chat_repo() -> ChatRepository:
    """获取聊天历史仓库"""
    return ChatRepository(get_database())



