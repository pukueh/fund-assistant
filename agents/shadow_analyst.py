"""影子基金经理分析 Agent

职责：
- 分析博主投资水平
- Brinson 归因分析
- 风格漂移检测
- 生成跟投建议
"""

from typing import Optional, Dict, Any, List
from hello_agents import HelloAgentsLLM, ReActAgent, ToolRegistry
from tools.base_shim import Tool, tool_action, ToolParameter
import json


# ============ Shadow Analyst Tools ============

class ShadowAnalystTool(Tool):
    """影子基金经理分析工具"""
    
    def __init__(self):
        super().__init__(
            name="shadow_analyst",
            description="分析博主投资水平：持仓获取、业绩归因、排行榜",
            expandable=True
        )
    
    @tool_action("get_portfolio", "获取博主持仓组合")
    def get_portfolio(self, blogger_id: int) -> str:
        """获取博主的影子组合"""
        from services.shadow_tracker_service import get_shadow_service
        
        service = get_shadow_service()
        portfolio = service.build_shadow_portfolio(blogger_id)
        return json.dumps(portfolio.to_dict(), ensure_ascii=False)
    
    @tool_action("analyze_performance", "分析博主业绩")
    async def analyze_performance(self, blogger_id: int, period: str = "3M") -> str:
        """分析博主投资业绩
        
        返回收益率、Alpha、夏普比率、选股胜率等
        """
        from services.shadow_tracker_service import get_shadow_service
        
        service = get_shadow_service()
        metrics = await service.analyze_performance(blogger_id, period)
        return json.dumps(metrics.to_dict(), ensure_ascii=False)
    
    @tool_action("get_ranking", "获取博主排行榜")
    def get_ranking(
        self, 
        period: str = "3M",
        sort_by: str = "alpha",
        limit: int = 10
    ) -> str:
        """获取博主排行榜"""
        from services.shadow_tracker_service import get_shadow_service
        
        service = get_shadow_service()
        ranking = service.get_blogger_ranking(period, sort_by, limit)
        return json.dumps(ranking, ensure_ascii=False)
    
    @tool_action("list_bloggers", "列出追踪的博主")
    def list_bloggers(self) -> str:
        """列出所有追踪的博主"""
        from services.shadow_tracker_service import get_shadow_service
        
        service = get_shadow_service()
        bloggers = service.list_bloggers()
        return json.dumps([b.to_dict() for b in bloggers], ensure_ascii=False)
    
    def run(self, parameters: Dict[str, Any]) -> str:
        action = parameters.get("action", "list_bloggers")
        
        if action == "get_portfolio":
            return self.get_portfolio(parameters.get("blogger_id", 0))
        elif action == "get_ranking":
            return self.get_ranking(
                parameters.get("period", "3M"),
                parameters.get("sort_by", "alpha"),
                parameters.get("limit", 10)
            )
        elif action == "list_bloggers":
            return self.list_bloggers()
        
        return json.dumps({"error": "未知操作"})
    
    def get_parameters(self) -> List[ToolParameter]:
        return [
            ToolParameter(name="action", type="string",
                         description="操作: get_portfolio/analyze_performance/get_ranking/list_bloggers"),
            ToolParameter(name="blogger_id", type="integer",
                         description="博主ID", required=False),
            ToolParameter(name="period", type="string",
                         description="分析周期 (1M/3M/6M/1Y)", required=False),
        ]


# ============ Shadow Analyst Prompt ============

SHADOW_ANALYST_PROMPT = """你是影子基金经理分析师，专门分析社交媒体上公开持仓博主的投资水平。

## 你的能力
1. **持仓分析**: 获取并解读博主的持仓组合
2. **业绩归因**: 分析收益来源（选股 vs 择时）
3. **风格识别**: 判断博主的投资风格
4. **跟投建议**: 评估博主是否值得跟投

## 可用工具
{tools}

## 分析框架

### 博主评估维度
1. **收益能力**: 
   - 绝对收益 vs 基准收益
   - Alpha (超额收益)

2. **风险控制**:
   - 最大回撤
   - 夏普比率

3. **选股能力**:
   - 选股胜率
   - Brinson 选股贡献

4. **择时能力**:
   - 仓位调整时机
   - 市场顶底判断

5. **风格稳定性**:
   - 风格漂移指数
   - 持仓集中度变化

### 跟投建议评级
⭐⭐⭐⭐⭐ 强烈推荐跟投
⭐⭐⭐⭐ 可以参考
⭐⭐⭐ 需谨慎判断
⭐⭐ 不建议跟投
⭐ 警惕风险

## 当前任务
**用户问题:** {question}

## 已收集信息
{history}

请按以下格式推理：

Thought: 分析需要获取哪些数据
Action: 
- `{{tool_name}}[{{参数}}]`：获取数据
- `Finish[博主分析报告]`：给出综合评估
"""


# ============ Shadow Analyst Agent ============

def create_shadow_analyst_agent(
    llm: Optional[HelloAgentsLLM] = None
) -> ReActAgent:
    """创建影子基金经理分析 Agent"""
    if llm is None:
        llm = HelloAgentsLLM()
    
    tool_registry = ToolRegistry()
    
    # 注册影子分析工具
    shadow_tool = ShadowAnalystTool()
    tool_registry.register_tool(shadow_tool)
    
    # 注册基金数据工具 (用于验证持仓)
    from tools.fund_tools import FundDataTool
    fund_tool = FundDataTool()
    tool_registry.register_tool(fund_tool)
    
    agent = ReActAgent(
        name="影子分析师",
        llm=llm,
        tool_registry=tool_registry,
        custom_prompt=SHADOW_ANALYST_PROMPT,
        max_steps=6
    )
    
    return agent


class ShadowAnalystWrapper:
    """影子分析师包装器"""
    
    def __init__(self, llm: Optional[HelloAgentsLLM] = None):
        self._agent = create_shadow_analyst_agent(llm)
    
    def run(self, query: str) -> str:
        """执行分析"""
        return self._agent.run(query)
    
    def should_follow(self, blogger_id: int) -> Dict[str, Any]:
        """评估是否应该跟投某博主
        
        Returns:
            {
                "recommendation": "follow/caution/avoid",
                "rating": 1-5,
                "reasons": [...],
                "risks": [...]
            }
        """
        analysis = self._agent.run(f"详细分析博主ID={blogger_id}的投资水平，给出跟投建议")
        
        # 解析结果 (简化)
        # 实际应该解析 LLM 输出
        return {
            "blogger_id": blogger_id,
            "recommendation": "caution",
            "rating": 3,
            "analysis": analysis,
            "reasons": ["有一定选股能力", "风格较稳定"],
            "risks": ["回撤控制一般", "数据样本较少"]
        }
    
    def compare_bloggers(self, blogger_ids: List[int]) -> str:
        """比较多个博主"""
        ids_str = ", ".join(map(str, blogger_ids))
        return self._agent.run(f"比较以下博主的投资水平: {ids_str}")


if __name__ == "__main__":
    agent = create_shadow_analyst_agent()
    response = agent.run("列出当前追踪的博主，并分析排名第一的博主")
    print(response)
