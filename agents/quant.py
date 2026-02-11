"""QuantAgent - 增强版量化分析师

使用 HelloAgents SimpleAgent + Code Interpreter
参考: Julius AI + WolframAlpha

增强功能：
- 沙盒代码执行
- 数据可视化
- 代码自我审查
"""

from typing import Optional, Dict, Any
from hello_agents import HelloAgentsLLM, SimpleAgent, ToolRegistry

# 量化分析系统提示词 (增强版)
QUANT_SYSTEM_PROMPT = """你是一位专业的量化分析师，负责分析基金的量化指标和收益归因。

## 你的能力
1. **代码执行**: 可以编写并执行 Python 代码进行精确计算
2. **风险指标**: 计算夏普比率、最大回撤、波动率、索提诺比率等
3. **因子分析**: 分析基金的风格因子暴露
4. **蒙特卡洛模拟**: 预测未来收益概率分布

## 可用工具
- `execute_python`: 执行 Python 代码（支持 numpy, pandas, scipy）
- `generate_chart`: 生成数据可视化图表
- `calculate_metrics`: 快速计算常用量化指标
- `get_fund_nav`: 获取基金净值数据

## 计算规范
⚠️ **绝不胡乱生成数字！** 所有计算必须通过代码执行获得真实结果。

## 分析流程
1. **获取数据**: 使用工具获取基金历史净值
2. **计算指标**: 使用 code_interpreter 执行精确计算
3. **可视化**: 生成图表辅助分析
4. **自我审查**: 检查计算逻辑是否正确
5. **输出报告**: 给出量化分析结论

## 输出格式

### 风险指标
| 指标 | 数值 | 评级 |
|-----|------|-----|
| 夏普比率 | X.XX | 良/差 |
| 最大回撤 | X.XX% | 可控/较大 |
| 年化波动率 | X.XX% | 低/中/高 |

### 收益归因
- 选股贡献: XX%
- 配置贡献: XX%
- 交互效应: XX%

### 代码验证
✅ 计算逻辑已验证
✅ 数据完整性检查通过

请用专业但清晰的语言回答用户的问题。"""


# ============ 代码审查器 ============

class CodeReviewer:
    """代码自我审查"""
    
    REVIEW_PROMPTS = {
        "logic": "检查计算公式是否正确（如夏普比率 = (收益-无风险) / 波动率）",
        "data": "检查是否正确处理了缺失值和异常值",
        "edge_case": "检查边界情况（如除零、负数开方等）"
    }
    
    def review(self, code: str, result: str) -> Dict[str, Any]:
        """审查代码和结果"""
        issues = []
        
        # 检查常见问题
        if "/ 0" in code or "/0" in code:
            issues.append("可能存在除零错误")
        
        if "np.nan" not in code and "dropna" not in code:
            if "mean" in code or "std" in code:
                issues.append("未处理缺失值，可能影响均值/标准差计算")
        
        if "sqrt" in code and "-" in code:
            issues.append("注意负数开方问题")
        
        # 检查结果合理性
        try:
            import json
            result_data = json.loads(result) if isinstance(result, str) else result
            
            if isinstance(result_data, dict):
                # 检查夏普比率范围
                if "sharpe_ratio" in result_data:
                    sr = result_data["sharpe_ratio"]
                    if sr > 5 or sr < -5:
                        issues.append(f"夏普比率 {sr} 超出正常范围 [-5, 5]")
                
                # 检查回撤范围
                if "max_drawdown" in result_data:
                    md = result_data["max_drawdown"]
                    if md > 100 or md < 0:
                        issues.append(f"最大回撤 {md}% 超出正常范围 [0, 100]")
        except:
            pass
        
        return {
            "passed": len(issues) == 0,
            "issues": issues,
            "suggestions": [
                "建议添加数据有效性检查",
                "建议处理边界情况"
            ] if issues else ["代码逻辑正确"]
        }


# ============ Enhanced Quant Agent ============

def create_quant_agent(llm: Optional[HelloAgentsLLM] = None) -> SimpleAgent:
    """创建增强版量化分析 Agent
    
    Args:
        llm: LLM 实例
    
    Returns:
        配置好的 SimpleAgent 实例
    """
    if llm is None:
        llm = HelloAgentsLLM()
    
    # 创建工具注册表
    tool_registry = ToolRegistry()
    
    # 注册基金数据工具
    from tools.fund_tools import FundDataTool
    fund_tool = FundDataTool()
    tool_registry.register_tool(fund_tool)
    
    # 注册代码解释器 (核心增强)
    from tools.code_interpreter import CodeInterpreterTool
    code_tool = CodeInterpreterTool()
    tool_registry.register_tool(code_tool)
    
    # 创建 SimpleAgent
    agent = SimpleAgent(
        name="量化分析师",
        llm=llm,
        system_prompt=QUANT_SYSTEM_PROMPT,
        tool_registry=tool_registry,
        enable_tool_calling=True
    )
    
    return agent


class QuantAgentWrapper:
    """量化 Agent 包装器 - 支持代码审查"""
    
    def __init__(self, llm: Optional[HelloAgentsLLM] = None):
        self._agent = create_quant_agent(llm)
        self._reviewer = CodeReviewer()
        self._last_code = ""
        self._last_result = ""
    
    def run(self, query: str, auto_review: bool = True) -> str:
        """执行量化分析
        
        Args:
            query: 用户查询
            auto_review: 是否自动审查代码
        
        Returns:
            分析报告
        """
        result = self._agent.run(query)
        
        # 如果启用自动审查且有代码执行
        if auto_review and self._last_code:
            review = self._reviewer.review(self._last_code, self._last_result)
            if not review["passed"]:
                result += f"\n\n⚠️ **代码审查警告**:\n"
                for issue in review["issues"]:
                    result += f"- {issue}\n"
        
        return result
    
    def calculate_with_verification(
        self, 
        returns: list,
        verify: bool = True
    ) -> Dict[str, Any]:
        """计算量化指标（带验证）"""
        from tools.code_interpreter import CodeInterpreterTool
        
        code_tool = CodeInterpreterTool()
        
        # 执行计算
        import json
        result = code_tool.calculate_metrics(json.dumps(returns))
        result_data = json.loads(result)
        
        if verify and result_data.get("success"):
            # 验证结果合理性
            metrics = result_data.get("metrics", {})
            review = self._reviewer.review("", metrics)
            result_data["review"] = review
        
        return result_data


if __name__ == "__main__":
    agent = create_quant_agent()
    response = agent.run("计算这组日收益率的风险指标: [0.01, -0.02, 0.015, 0.008, -0.005, 0.012, 0.003, -0.01]")
    print(response)
