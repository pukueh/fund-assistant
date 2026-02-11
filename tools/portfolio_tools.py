"""持仓管理工具 - 使用 HelloAgents Tool 基类"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import os
import sqlite3
from contextlib import contextmanager

from tools.base_shim import Tool, tool_action, ToolParameter


class PortfolioTool(Tool):
    """持仓管理工具 - 可展开为多个子工具
    
    支持用户上下文隔离，确保不同用户数据独立。
    """
    
    def __init__(self, db_path: str = "./data/fund_assistant.db", user_id: Optional[int] = None):
        super().__init__(
            name="portfolio",
            description="持仓管理工具，支持添加、删除、查询持仓和计算估值",
            expandable=True
        )
        self.db_path = db_path
        self._user_id = user_id  # 可选的用户上下文
        self._init_db()
    
    def set_user_context(self, user_id: int):
        """设置用户上下文（在 API 调用时使用）"""
        self._user_id = user_id
    
    def get_current_user_id(self, override_user_id: Optional[int] = None) -> int:
        """获取当前用户 ID
        
        优先级: 方法参数 > 实例上下文 > 默认值 1（仅用于匿名/演示）
        """
        if override_user_id is not None:
            return override_user_id
        if self._user_id is not None:
            return self._user_id
        # 返回默认值 1（用于未登录用户/演示模式）
        return 1
    
    def _init_db(self):
        """初始化数据库"""
        os.makedirs(os.path.dirname(self.db_path) or '.', exist_ok=True)
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS holdings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER DEFAULT 1,
                    fund_code TEXT NOT NULL,
                    fund_name TEXT,
                    shares REAL NOT NULL,
                    cost_nav REAL NOT NULL,
                    buy_date TEXT,
                    tags TEXT DEFAULT '[]',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, fund_code)
                )
            """)
            
            # Migration for existing databases
            try:
                conn.execute("SELECT tags FROM holdings LIMIT 1")
            except sqlite3.OperationalError:
                try:
                    conn.execute("ALTER TABLE holdings ADD COLUMN tags TEXT DEFAULT '[]'")
                    conn.commit()
                except Exception as e:
                    print(f"Migration warning: {e}")
    
    @contextmanager
    def _get_conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()
    
    @tool_action("list_holdings", "查看持仓列表")
    def list_holdings(self, user_id: int = None) -> str:
        """查看持仓列表
        
        Args:
            user_id: 用户ID，如枚不提供则使用上下文中的用户
        
        Returns:
            持仓列表的 JSON 字符串
        """
        effective_user_id = self.get_current_user_id(user_id)
        with self._get_conn() as conn:
            # Check if tags column exists (backward compatibility or if _init_db didn't run)
            try:
                conn.execute("SELECT tags FROM holdings LIMIT 1")
            except sqlite3.OperationalError:
                try:
                    conn.execute("ALTER TABLE holdings ADD COLUMN tags TEXT DEFAULT '[]'")
                    conn.commit()
                except:
                    pass

            cursor = conn.execute(
                "SELECT fund_code, fund_name, shares, cost_nav, buy_date, tags FROM holdings WHERE user_id = ?",
                (effective_user_id,)
            )
            holdings = [dict(row) for row in cursor.fetchall()]
            
            # Parse tags JSON
            for h in holdings:
                try:
                    if h.get("tags"):
                        h["tags"] = json.loads(h["tags"])
                    else:
                        h["tags"] = []
                except:
                    h["tags"] = []
        
        return json.dumps({
            "持仓数量": len(holdings),
            "持仓列表": holdings,
            "更新时间": datetime.now().isoformat()
        }, ensure_ascii=False)
    
    @tool_action("add_holding", "添加持仓")
    def add_holding(self, fund_code: str, fund_name: str = None, shares: float = 0, cost_nav: float = 0, tags: List[str] = None, user_id: int = None) -> str:
        """添加或更新持仓
        
        Args:
            fund_code: 基金代码
            fund_name: 基金名称
            shares: 持有份额
            cost_nav: 成本净值
            tags: 标签列表
            user_id: 用户ID
        """
        effective_user_id = self.get_current_user_id(user_id)
        fund_code = fund_code.strip()
        
        # 尝试自动补全名称
        if not fund_name or fund_name == fund_code:
            from tools.fund_tools import FundDataTool
            try:
                fund_tool = FundDataTool()
                nav_data = json.loads(fund_tool.get_nav(fund_code))
                if nav_data.get("fund_name"):
                    fund_name = nav_data["fund_name"]
            except Exception:
                pass
        
        if not fund_name:
            fund_name = f"基金 {fund_code}"

        buy_date = datetime.now().strftime("%Y-%m-%d")
        tags_json = json.dumps(tags if tags else [], ensure_ascii=False)
        
        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO holdings (user_id, fund_code, fund_name, shares, cost_nav, buy_date, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, fund_code) DO UPDATE SET
                    fund_name = excluded.fund_name,
                    shares = excluded.shares,
                    cost_nav = excluded.cost_nav,
                    tags = excluded.tags
            """, (effective_user_id, fund_code, fund_name, shares, cost_nav, buy_date, tags_json))
        

        return json.dumps({"状态": "成功", "操作": "添加持仓", "基金代码": fund_code}, ensure_ascii=False)

    @tool_action("batch_add_holdings", "批量添加持仓")
    def batch_add_holdings(self, holdings: List[Dict], user_id: int = None) -> str:
        """批量添加持仓
        
        Args:
            holdings: 持仓列表，每项包含 fund_code, fund_name, shares, cost_nav
            user_id: 用户ID
        """
        effective_user_id = self.get_current_user_id(user_id)
        buy_date = datetime.now().strftime("%Y-%m-%d")
        
        added_count = 0
        with self._get_conn() as conn:
            for h in holdings:
                fund_code = h.get("fund_code")
                if not fund_code: continue
                
                tags_json = json.dumps(h.get("tags", []), ensure_ascii=False)
                conn.execute("""
                    INSERT INTO holdings (user_id, fund_code, fund_name, shares, cost_nav, buy_date, tags)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(user_id, fund_code) DO UPDATE SET
                        fund_name = excluded.fund_name,
                        shares = excluded.shares,
                        cost_nav = excluded.cost_nav
                """, (effective_user_id, fund_code, h.get("fund_name", ""), 
                      h.get("shares", 0), h.get("cost_nav", 1.0), buy_date, tags_json))
                added_count += 1
        
        return json.dumps({"状态": "成功", "操作": "批量添加", "数量": added_count}, ensure_ascii=False)
        
    @tool_action("update_tags", "更新持仓标签")
    def update_tags(self, fund_code: str, tags: List[str], user_id: int = None) -> str:
        """更新持仓标签"""
        effective_user_id = self.get_current_user_id(user_id)
        tags_json = json.dumps(tags, ensure_ascii=False)
        
        with self._get_conn() as conn:
            cursor = conn.execute(
                "UPDATE holdings SET tags = ? WHERE user_id = ? AND fund_code = ?",
                (tags_json, effective_user_id, fund_code)
            )
            if cursor.rowcount > 0:
                return json.dumps({"状态": "成功", "操作": "更新标签", "基金代码": fund_code}, ensure_ascii=False)
        
        return json.dumps({"状态": "失败", "原因": "未找到持仓"}, ensure_ascii=False)
    
    @tool_action("remove_holding", "删除持仓")
    def remove_holding(self, fund_code: str, user_id: int = None) -> str:
        """删除持仓
        
        Args:
            fund_code: 基金代码
            user_id: 用户ID，如枚不提供则使用上下文中的用户
        
        Returns:
            操作结果
        """
        effective_user_id = self.get_current_user_id(user_id)
        fund_code = fund_code.strip()
        with self._get_conn() as conn:
            cursor = conn.execute(
                "DELETE FROM holdings WHERE user_id = ? AND fund_code = ?",
                (effective_user_id, fund_code)
            )
            if cursor.rowcount > 0:
                return json.dumps({"状态": "已删除", "基金代码": fund_code}, ensure_ascii=False)
        
        return json.dumps({"状态": "未找到", "基金代码": fund_code}, ensure_ascii=False)
    
    @tool_action("calculate_valuation", "计算持仓估值")
    def calculate_valuation(self, user_id: int = None) -> str:
        """计算持仓估值（结合实时净值）
        
        Args:
            user_id: 用户ID，如枚不提供则使用上下文中的用户
        
        Returns:
            估值结果的 JSON 字符串
        """
        effective_user_id = self.get_current_user_id(user_id)
        from tools.fund_tools import FundDataTool
        fund_tool = FundDataTool()
        
        with self._get_conn() as conn:
            cursor = conn.execute(
                "SELECT fund_code, fund_name, shares, cost_nav FROM holdings WHERE user_id = ?",
                (effective_user_id,)
            )
            holdings = [dict(row) for row in cursor.fetchall()]
        
        total_cost = 0
        total_value = 0
        details = []
        
        for h in holdings:
            fund_code = h["fund_code"]
            shares = h["shares"]
            cost_nav = h["cost_nav"]
            fund_name = h["fund_name"]
            
            # 获取实时净值
            nav_data = json.loads(fund_tool.get_nav(fund_code))
            current_nav = float(nav_data.get("estimated_nav", nav_data.get("nav", cost_nav)))
            
            # 如果名称不完整，尝试补全并存回数据库
            real_name = nav_data.get("fund_name")
            if real_name and (not fund_name or fund_name == fund_code or fund_name.startswith("基金 ")):
                fund_name = real_name
                # 异步更新数据库（由于在循环中，这里简单同步更新）
                try:
                    with self._get_conn() as conn:
                        conn.execute("UPDATE holdings SET fund_name = ? WHERE user_id = ? AND fund_code = ?",
                                   (real_name, effective_user_id, fund_code))
                except:
                    pass

            cost = shares * cost_nav
            value = shares * current_nav
            profit = value - cost
            
            # Calculate day change for this holding
            change_percent_raw = nav_data.get("change_percent", 0)
            try:
                if isinstance(change_percent_raw, str):
                    change_rate = float(change_percent_raw.replace("%", "").replace("+", ""))
                else:
                    change_rate = float(change_percent_raw)
            except (ValueError, TypeError):
                change_rate = 0.0
                
            if 1 + change_rate/100 != 0:
                yesterday_value = value / (1 + change_rate/100)
                day_profit = value - yesterday_value
            else:
                day_profit = 0
            
            total_cost += cost
            total_value += value
            
            details.append({
                "fund_code": fund_code,
                "fund_name": fund_name,
                "shares": shares,
                "cost_nav": cost_nav,
                "estimated_nav": current_nav,
                "day_change": round(day_profit, 2),
                "day_change_rate": change_rate,
                "update_time": nav_data.get("update_time", ""),
                "cost_value": round(cost, 2),
                "current_value": round(value, 2),
                "profit": round(profit, 2),
                "profit_rate": round(profit / cost * 100, 2) if cost > 0 else 0
            })
        
        total_profit = total_value - total_cost
        
        # Calculate total day change
        total_day_change = sum(d["day_change"] for d in details)
        total_day_change_pct = total_day_change / total_value * 100 if total_value > 0 else 0

        return json.dumps({
            "update_time": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "total_cost": round(total_cost, 2),
            "total_value": round(total_value, 2),
            "total_profit": round(total_profit, 2),
            "total_profit_rate": round(total_profit / total_cost * 100, 2) if total_cost > 0 else 0,
            "day_change": round(total_day_change, 2),
            "day_change_pct": round(total_day_change_pct, 2),
            "holdings": details
        }, ensure_ascii=False, indent=2)
    
    def run(self, parameters: Dict[str, Any]) -> str:
        """默认执行方法"""
        action = parameters.get("action", "list_holdings")
        user_id = parameters.get("user_id", 1)
        
        if action == "list_holdings":
            return self.list_holdings(user_id)
        elif action == "add_holding":
            return self.add_holding(
                parameters.get("fund_code"),
                parameters.get("fund_name", ""),
                parameters.get("shares", 0),
                parameters.get("cost_nav", 1.0),
                user_id
            )
        elif action == "remove_holding":
            return self.remove_holding(parameters.get("fund_code"), user_id)
        elif action == "calculate_valuation":
            return self.calculate_valuation(user_id)
        return "未知操作"
    
    def get_parameters(self) -> List[ToolParameter]:
        return [
            ToolParameter(name="action", type="string", description="操作: list_holdings/add_holding/remove_holding/calculate_valuation"),
            ToolParameter(name="fund_code", type="string", description="基金代码", required=False),
            ToolParameter(name="fund_name", type="string", description="基金名称", required=False),
            ToolParameter(name="shares", type="number", description="持有份额", required=False),
            ToolParameter(name="cost_nav", type="number", description="成本净值", required=False),
            ToolParameter(name="user_id", type="integer", description="用户ID", required=False, default=1),
        ]
