"""CoordinatorAgent - 使用 HelloAgents ReActAgent"""

from typing import Optional
from hello_agents import HelloAgentsLLM, ReActAgent, ToolRegistry

# 自定义 Prompt 模板
COORDINATOR_PROMPT = """你是基金估值助手的协调员，负责理解用户意图并调用合适的工具。

## 可用工具
{tools}

## 职责
1. 分析用户问题的意图
2. 选择合适的工具获取信息
3. 综合信息给出清晰的回答

## 意图分类
- **查询估值**: 用户想了解持仓市值、盈亏情况
- **基金搜索**: 用户想查找或了解某个基金
- **持仓管理**: 用户想添加、删除持仓
- **投资建议**: 用户询问投资策略、建议

## 当前任务
**用户问题:** {question}

## 执行历史
{history}

请按以下格式推理和行动：

Thought: 分析用户意图，确定需要什么信息
Action: 调用工具获取信息
- `{{tool_name}}[{{参数}}]`：调用工具
- `Finish[最终回答]`：当你有足够信息回答时
"""


def create_coordinator_agent(llm: Optional[HelloAgentsLLM] = None) -> ReActAgent:
    """创建协调员 Agent
    
    Args:
        llm: LLM 实例，如果不提供则自动创建
    
    Returns:
        配置好的 ReActAgent 实例
    """
    if llm is None:
        llm = HelloAgentsLLM()
    
    # 创建工具注册表
    tool_registry = ToolRegistry()
    
    # 注册基金数据工具
    from tools.fund_tools import FundDataTool
    from tools.portfolio_tools import PortfolioTool
    
    fund_tool = FundDataTool()
    portfolio_tool = PortfolioTool()
    
    # 使用 add_tool 自动展开可展开的工具
    tool_registry.register_tool(fund_tool)
    tool_registry.register_tool(portfolio_tool)
    
    # 创建 ReActAgent
    agent = ReActAgent(
        name="协调员",
        llm=llm,
        tool_registry=tool_registry,
        custom_prompt=COORDINATOR_PROMPT,
        max_steps=5
    )
    
    return agent


if __name__ == "__main__":
    # 测试
    agent = create_coordinator_agent()
    response = agent.run("查看我的持仓")
    print(response)
