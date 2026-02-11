"""AdvisorAgent - 使用 HelloAgents PlanAndSolveAgent"""

from typing import Optional
from hello_agents import HelloAgentsLLM, PlanAndSolveAgent

# 自定义规划 Prompt
ADVISOR_PROMPTS = {
    "planner": """你是一位专业的投资顾问，擅长制定投资计划。

请将以下投资规划任务分解为清晰的执行步骤：

投资规划任务: {question}

请按以下格式输出规划方案：
```python
["步骤1: 具体任务", "步骤2: 具体任务", "步骤3: 具体任务", ...]
```

规划时请考虑：
1. 了解用户风险偏好
2. 分析当前市场环境
3. 制定资产配置方案
4. 给出具体的基金推荐
5. 提供风险提示
""",
    
    "executor": """你是一位投资顾问，请执行投资规划的具体步骤。

# 原始任务: {question}
# 完整规划: {plan}
# 已完成步骤: {history}
# 当前步骤: {current_step}

请执行当前步骤，给出详细的分析或建议：
"""
}


def create_advisor_agent(llm: Optional[HelloAgentsLLM] = None) -> PlanAndSolveAgent:
    """创建投资顾问 Agent（使用规划执行范式）
    
    Args:
        llm: LLM 实例
    
    Returns:
        配置好的 PlanAndSolveAgent 实例
    """
    if llm is None:
        llm = HelloAgentsLLM()
    
    # 创建 PlanAndSolveAgent
    agent = PlanAndSolveAgent(
        name="投资顾问",
        llm=llm,
        custom_prompts=ADVISOR_PROMPTS
    )
    
    return agent


if __name__ == "__main__":
    agent = create_advisor_agent()
    response = agent.run("我有10万闲钱，风险承受能力中等，请帮我制定一个基金投资计划")
    print(response)
