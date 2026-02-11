"""AnalystAgent - 使用 HelloAgents ReflectionAgent"""

from typing import Optional
from hello_agents import HelloAgentsLLM, ReflectionAgent

# 自定义反思 Prompt
ANALYST_PROMPTS = {
    "initial": """你是一位资深的基金技术分析师。请分析以下基金或市场情况：

分析任务: {task}

请提供详细的技术分析报告，包括：
1. **趋势分析**: 判断当前趋势方向
2. **关键点位**: 支撑位和阻力位
3. **技术指标**: MA、RSI、MACD 等指标解读
4. **量能分析**: 成交量配合情况
5. **综合判断**: 短期和中期走势预判
""",
    
    "reflect": """请审查以下技术分析报告的质量：

# 原始任务: {task}
# 分析报告: {content}

请从以下角度评估：
- 分析逻辑是否清晰
- 关键指标是否覆盖
- 结论是否有依据
- 风险提示是否充分

如果分析已经很完善，请回答"无需改进"。
否则请提出具体的改进建议。
""",
    
    "refine": """请根据审查意见优化技术分析报告：

# 原始任务: {task}
# 上一轮报告: {last_attempt}
# 审查意见: {feedback}

请提供优化后的分析报告。
"""
}


def create_analyst_agent(llm: Optional[HelloAgentsLLM] = None) -> ReflectionAgent:
    """创建技术分析 Agent（使用反思范式）
    
    Args:
        llm: LLM 实例
    
    Returns:
        配置好的 ReflectionAgent 实例
    """
    if llm is None:
        llm = HelloAgentsLLM()
    
    # 创建 ReflectionAgent
    agent = ReflectionAgent(
        name="技术分析师",
        llm=llm,
        custom_prompts=ANALYST_PROMPTS,
        max_iterations=2  # 最多反思2轮
    )
    
    return agent


if __name__ == "__main__":
    agent = create_analyst_agent()
    response = agent.run("分析一下白酒板块近期的技术走势")
    print(response)
