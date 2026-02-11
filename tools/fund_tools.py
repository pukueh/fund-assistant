"""基金数据工具 - 使用 HelloAgents Tool 基类"""

from typing import Dict, Any, List
from datetime import datetime, timedelta
import urllib.request
import json
import re
import os

from tools.base_shim import Tool, tool_action, ToolParameter


class FundDataTool(Tool):
    """基金数据工具 - 可展开为多个子工具"""
    
    # 简单内存缓存
    _cache = {}
    _cache_time = {}
    
    def __init__(self):
        super().__init__(
            name="fund_data",
            description="基金数据查询工具，支持获取实时估值、基金信息和搜索",
            expandable=True  # 标记为可展开
        )
        # 导入市场数据服务
        from tools.market_data import get_market_service
        self._market_service = get_market_service()
    
    @tool_action("get_fund_nav", "获取基金实时净值估算")
    def get_nav(self, fund_code: str) -> str:
        """获取基金实时净值
        
        Args:
            fund_code: 基金代码，如 110011
        
        Returns:
            基金净值信息的 JSON 字符串
        """
        # 使用市场数据服务 (内置缓存和多数据源回退)
        nav_data = self._market_service.get_fund_nav(fund_code)
        return nav_data.to_json()
    
    @tool_action("search_fund", "搜索基金")
    def search(self, keyword: str) -> str:
        """搜索基金
        
        Args:
            keyword: 搜索关键词（代码或名称）
        
        Returns:
            搜索结果列表的 JSON 字符串
        """
        # 使用市场数据服务搜索
        search_results = self._market_service.search_fund(keyword)
        
        # 转换为 JSON 格式
        results = [r.to_dict() for r in search_results]
        
        return json.dumps({"搜索结果": results, "数量": len(results)}, ensure_ascii=False)
    
    @tool_action("get_fund_info", "获取基金详细信息")
    def get_info(self, fund_code: str) -> str:
        """获取基金详细信息
        
        Args:
            fund_code: 基金代码
        
        Returns:
            基金信息的 JSON 字符串
        """
        details = self._market_service.get_fund_details(fund_code)
        if details:
            return details.to_json()
            
        return json.dumps({"error": "未找到基金信息", "code": fund_code}, ensure_ascii=False)
        
    @tool_action("get_fund_managers", "获取基金经理信息")
    def get_managers(self, fund_code: str) -> str:
        """获取基金经理信息
        
        Args:
            fund_code: 基金代码
            
        Returns:
            基金经理列表的 JSON 字符串
        """
        details = self._market_service.get_fund_details(fund_code)
        if details and details.managers:
            return json.dumps([m.to_dict() for m in details.managers], ensure_ascii=False)
            
        return json.dumps([], ensure_ascii=False)
    
    @tool_action("get_fund_holdings", "获取基金重仓股")
    def get_holdings(self, fund_code: str) -> str:
        """获取基金重仓股
        
        Args:
            fund_code: 基金代码
            
        Returns:
            基金重仓股列表的 JSON 字符串
        """
        holdings = self._market_service.get_fund_holdings(fund_code)
        if holdings:
            return json.dumps([h.to_dict() for h in holdings], ensure_ascii=False)
            
        return json.dumps([], ensure_ascii=False)
    
    def run(self, parameters: Dict[str, Any]) -> str:
        """默认执行方法"""
        action = parameters.get("action", "get_nav")
        if action == "get_nav":
            return self.get_nav(parameters.get("fund_code", ""))
        elif action == "search":
            return self.search(parameters.get("keyword", ""))
        elif action == "get_info":
            return self.get_info(parameters.get("fund_code", ""))
        elif action == "get_managers":
            return self.get_managers(parameters.get("fund_code", ""))
        elif action == "get_holdings":
            return self.get_holdings(parameters.get("fund_code", ""))
        return "未知操作"
    
    def get_parameters(self) -> List[ToolParameter]:
        return [
            ToolParameter(name="action", type="string", description="操作类型: get_nav/search/get_info/get_managers/get_holdings"),
            ToolParameter(name="fund_code", type="string", description="基金代码", required=False),
            ToolParameter(name="keyword", type="string", description="搜索关键词", required=False),
        ]
