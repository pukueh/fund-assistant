"""StrategistAgent - 增强版首席策略师

使用 HelloAgents ReActAgent + CoT + Persona
参考: 桥水全天候策略 + Wealthfront

增强功能：
- Chain-of-Thought (决策链条)
- Persona Customization (用户画像)
- Plan-and-Solve (目标拆解)
"""

from typing import Optional, Dict, Any, List
from hello_agents import HelloAgentsLLM, ReActAgent, ToolRegistry
from dataclasses import dataclass
from enum import Enum


# ============ 用户画像系统 ============

class RiskProfile(Enum):
    """风险偏好"""
    AGGRESSIVE = "aggressive"      # 激进型
    BALANCED = "balanced"          # 平衡型
    CONSERVATIVE = "conservative"  # 保守型


@dataclass
class UserPersona:
    """用户画像"""
    risk_profile: RiskProfile
    investment_horizon: str  # 短期/中期/长期
    age_group: str           # 青年/中年/退休
    investment_goal: str     # 增值/保值/养老
    preference_tags: List[str]  # 偏好标签
    
    def to_prompt_context(self) -> str:
        """转换为 Prompt 上下文"""
        profile_desc = {
            RiskProfile.AGGRESSIVE: "追求高收益，可承受高波动，偏好成长股和新兴行业",
            RiskProfile.BALANCED: "平衡收益与风险，偏好蓝筹股和混合配置",
            RiskProfile.CONSERVATIVE: "保本优先，低风险偏好，偏好债券和货币基金"
        }
        
        return f"""
## 用户画像
- **风险偏好**: {self.risk_profile.value} - {profile_desc.get(self.risk_profile, '')}
- **投资期限**: {self.investment_horizon}
- **年龄阶段**: {self.age_group}
- **投资目标**: {self.investment_goal}
- **偏好标签**: {', '.join(self.preference_tags)}
"""


# 预设用户画像模板
USER_PERSONAS = {
    "aggressive": UserPersona(
        risk_profile=RiskProfile.AGGRESSIVE,
        investment_horizon="长期(5年+)",
        age_group="青年",
        investment_goal="财富增值",
        preference_tags=["科技", "成长", "港美股", "主题基金"]
    ),
    "balanced": UserPersona(
        risk_profile=RiskProfile.BALANCED,
        investment_horizon="中期(2-5年)",
        age_group="中年",
        investment_goal="稳健增值",
        preference_tags=["蓝筹", "混合型", "指数增强"]
    ),
    "conservative": UserPersona(
        risk_profile=RiskProfile.CONSERVATIVE,
        investment_horizon="短期(1年内)",
        age_group="退休",
        investment_goal="保本理财",
        preference_tags=["债券", "货币基金", "固收+"]
    )
}


# ============ Chain-of-Thought 决策框架 ============

COT_DECISION_FRAMEWORK = """
## 决策链条 (Chain-of-Thought)

⚠️ **强制要求**: 给出任何建议前，必须完成以下决策链条：

### Step 1: 市场环境判断
- 当前宏观经济周期（扩张/衰退/滞胀/复苏）
- 货币政策方向（宽松/紧缩/观望）
- 市场估值水平（高估/合理/低估）

### Step 2: 用户风险匹配
- 用户风险承受能力 vs 当前市场波动
- 用户投资期限 vs 建议持仓周期
- 用户偏好 vs 推荐产品类型

### Step 3: 策略形成
格式:
```
市场环境 [X] + 用户画像 [Y] → 策略建议 [Z]
```
示例:
```
市场下跌 + 保守型用户 → 增加债券配置，减少股票仓位
市场上涨 + 激进型用户 → 维持高仓位，关注成长板块
```

### Step 4: 具体建议
- 资产配置比例调整
- 具体基金推荐
- 操作时机建议

### Step 5: 风险提示
- 主要风险点
- 止损/止盈建议
- 替代方案
"""


# ============ 策略师 Prompt ============

STRATEGIST_PROMPT = """你是首席投资策略师(CIO)，负责综合各方意见做出最终投资决策。

{persona_context}

{cot_framework}

## 可用工具
{tools}

## 决策原则
1. **数据驱动**: 基于量化分析和市场数据
2. **因人而异**: 根据用户画像定制建议
3. **链条清晰**: 每个建议都有明确的推理过程
4. **风险可控**: 永远将风险提示放在首位

## 当前任务
**用户问题:** {question}

## 已收集信息
{history}

请按以下格式推理：

Thought: [决策链条 Step 1-5]
Action: 
- `{{tool_name}}[{{参数}}]`：获取更多信息
- `Finish[投资建议报告]`：给出综合建议
"""


# ============ Enhanced Strategist Agent ============

def create_strategist_agent(
    llm: Optional[HelloAgentsLLM] = None,
    memory_tool=None,
    rag_tool=None,
    user_persona: str = "balanced"  # 新增：用户画像
) -> ReActAgent:
    """创建增强版策略师 Agent
    
    Args:
        llm: LLM 实例
        memory_tool: 可选的记忆工具
        rag_tool: 可选的 RAG 工具
        user_persona: 用户画像类型 (aggressive/balanced/conservative)
    
    Returns:
        配置好的 ReActAgent 实例
    """
    if llm is None:
        llm = HelloAgentsLLM()
    
    # 创建工具注册表
    tool_registry = ToolRegistry()
    
    # 注册基础工具
    from tools.fund_tools import FundDataTool
    from tools.portfolio_tools import PortfolioTool
    
    fund_tool = FundDataTool()
    portfolio_tool = PortfolioTool()
    
    tool_registry.register_tool(fund_tool)
    tool_registry.register_tool(portfolio_tool)
    
    # 注册记忆工具（如果提供）
    if memory_tool:
        tool_registry.register_tool(memory_tool)
    
    # 注册 RAG 工具（如果提供）
    if rag_tool:
        tool_registry.register_tool(rag_tool)
    
    # 获取用户画像上下文
    persona = USER_PERSONAS.get(user_persona, USER_PERSONAS["balanced"])
    persona_context = persona.to_prompt_context()
    
    # 构建完整 Prompt
    full_prompt = STRATEGIST_PROMPT.replace("{persona_context}", persona_context)
    full_prompt = full_prompt.replace("{cot_framework}", COT_DECISION_FRAMEWORK)
    
    # 创建 ReActAgent
    agent = ReActAgent(
        name="首席策略师",
        llm=llm,
        tool_registry=tool_registry,
        custom_prompt=full_prompt,
        max_steps=6
    )
    
    # 附加用户画像信息
    agent._user_persona = persona
    
    return agent


class StrategistAgentWrapper:
    """策略师 Agent 包装器 - 支持动态画像切换"""
    
    def __init__(
        self, 
        llm: Optional[HelloAgentsLLM] = None,
        default_persona: str = "balanced"
    ):
        self._llm = llm
        self._current_persona = default_persona
        self._agent = create_strategist_agent(llm, user_persona=default_persona)
    
    def set_persona(self, persona_type: str):
        """切换用户画像
        
        Args:
            persona_type: aggressive/balanced/conservative
        """
        if persona_type in USER_PERSONAS:
            self._current_persona = persona_type
            self._agent = create_strategist_agent(
                self._llm, 
                user_persona=persona_type
            )
    
    def run(self, query: str) -> str:
        """执行策略分析"""
        return self._agent.run(query)
    
    def run_with_context(
        self, 
        query: str,
        market_context: Dict[str, Any] = None,
        portfolio_context: Dict[str, Any] = None
    ) -> str:
        """带上下文的策略分析
        
        Args:
            query: 用户查询
            market_context: 市场环境信息
            portfolio_context: 持仓信息
        
        Returns:
            策略建议
        """
        enhanced_query = query
        
        if market_context:
            enhanced_query += f"\n\n[当前市场环境]\n"
            for key, value in market_context.items():
                enhanced_query += f"- {key}: {value}\n"
        
        if portfolio_context:
            enhanced_query += f"\n[当前持仓情况]\n"
            for key, value in portfolio_context.items():
                enhanced_query += f"- {key}: {value}\n"
        
        return self._agent.run(enhanced_query)
    
    def get_current_persona(self) -> UserPersona:
        """获取当前用户画像"""
        return USER_PERSONAS.get(self._current_persona)
    
    def plan_and_solve(self, complex_goal: str) -> Dict[str, Any]:
        """Plan-and-Solve: 复杂目标拆解
        
        Args:
            complex_goal: 复杂投资目标
        
        Returns:
            拆解后的子目标和执行计划
        """
        plan_prompt = f"""
请将以下复杂投资目标拆解为可执行的子任务：

**目标**: {complex_goal}

请按以下格式输出：

## 子目标拆解
1. [子目标1] - 预计完成时间
2. [子目标2] - 预计完成时间
...

## 依赖关系
- 子目标2 依赖 子目标1

## 执行计划
Week 1: ...
Week 2: ...
...

## 风险点
- ...
"""
        
        result = self._agent.run(plan_prompt)
        
        return {
            "goal": complex_goal,
            "plan": result,
            "persona": self._current_persona
        }


if __name__ == "__main__":
    # 测试
    wrapper = StrategistAgentWrapper(default_persona="aggressive")
    
    print("当前画像:", wrapper.get_current_persona())
    
    # 测试 Plan-and-Solve
    plan = wrapper.plan_and_solve("我想在3年内积累50万投资基金作为买房首付")
    print("\n目标拆解:")
    print(plan["plan"])
