"""代码解释器工具 - Julius AI 风格

提供：
- 沙盒 Python 执行 (subprocess/Docker)
- 数据可视化生成
- 代码自审功能
"""

import os
import sys
import json
import subprocess
import tempfile
import base64
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from tools.base_shim import Tool, tool_action, ToolParameter


# ============ 代码执行结果 ============

@dataclass
class ExecutionResult:
    """代码执行结果"""
    success: bool
    output: str
    error: str = ""
    execution_time: float = 0.0
    charts: List[str] = None  # Base64 编码的图表
    
    def to_dict(self) -> Dict:
        return {
            "success": self.success,
            "output": self.output,
            "error": self.error,
            "execution_time": self.execution_time,
            "charts": self.charts or []
        }


# ============ 代码验证器 ============

class CodeVerifier:
    """代码安全验证器"""
    
    # 禁止的模块/函数
    FORBIDDEN_IMPORTS = [
        "os.system", "subprocess", "eval", "exec", "compile",
        "open", "__import__", "importlib", "shutil",
        "socket", "requests", "urllib", "http"
    ]
    
    # 允许的模块
    ALLOWED_MODULES = [
        "numpy", "pandas", "scipy", "sklearn", "math", "statistics",
        "matplotlib", "plotly", "json", "datetime", "re", "collections"
    ]
    
    def verify(self, code: str) -> Dict[str, Any]:
        """验证代码安全性
        
        Returns:
            {
                "safe": bool,
                "warnings": List[str],
                "errors": List[str]
            }
        """
        warnings = []
        errors = []
        
        # 检查禁止的调用
        for forbidden in self.FORBIDDEN_IMPORTS:
            if forbidden in code:
                errors.append(f"禁止使用: {forbidden}")
        
        # 检查文件操作
        if "open(" in code and "open(" not in ["json.loads"]:
            if "'w'" in code or '"w"' in code:
                errors.append("禁止文件写入操作")
        
        # 检查无限循环风险
        if "while True" in code:
            warnings.append("发现 while True，确保有退出条件")
        
        # 检查资源密集操作
        if "10**" in code or "**10" in code:
            warnings.append("大数运算可能消耗大量资源")
        
        return {
            "safe": len(errors) == 0,
            "warnings": warnings,
            "errors": errors
        }


# ============ 沙盒执行器 ============

class SandboxExecutor:
    """沙盒代码执行器"""
    
    TIMEOUT = 30  # 秒
    MAX_OUTPUT_SIZE = 10000  # 字符
    
    def __init__(self, use_docker: bool = False):
        self.use_docker = use_docker
        self.verifier = CodeVerifier()
    
    def execute(self, code: str, verify: bool = True) -> ExecutionResult:
        """执行 Python 代码
        
        Args:
            code: Python 代码
            verify: 是否进行安全验证
        
        Returns:
            ExecutionResult
        """
        import time
        start_time = time.time()
        
        # 安全验证
        if verify:
            check = self.verifier.verify(code)
            if not check["safe"]:
                return ExecutionResult(
                    success=False,
                    output="",
                    error=f"代码安全检查失败: {'; '.join(check['errors'])}"
                )
        
        # 包装代码以捕获输出
        wrapped_code = self._wrap_code(code)
        
        try:
            if self.use_docker:
                result = self._execute_docker(wrapped_code)
            else:
                result = self._execute_subprocess(wrapped_code)
            
            execution_time = time.time() - start_time
            result.execution_time = execution_time
            return result
            
        except Exception as e:
            return ExecutionResult(
                success=False,
                output="",
                error=str(e),
                execution_time=time.time() - start_time
            )
    
    def _wrap_code(self, code: str) -> str:
        """包装代码以支持图表输出"""
        wrapper = '''
import sys
import json
import io

# 重定向 matplotlib 输出
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# 存储图表
_charts = []

def _save_chart():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    buf.seek(0)
    import base64
    _charts.append(base64.b64encode(buf.read()).decode('utf-8'))
    plt.close()

# 用户代码
{code}

# 如果有图表，保存
if plt.get_fignums():
    _save_chart()

# 输出图表信息
if _charts:
    print("__CHARTS__:" + json.dumps(_charts))
'''
        return wrapper.format(code=code)
    
    def _execute_subprocess(self, code: str) -> ExecutionResult:
        """使用 subprocess 执行"""
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.py', delete=False
        ) as f:
            f.write(code)
            temp_path = f.name
        
        try:
            result = subprocess.run(
                [sys.executable, temp_path],
                capture_output=True,
                text=True,
                timeout=self.TIMEOUT,
                env={
                    **os.environ,
                    "PYTHONPATH": os.getcwd()
                }
            )
            
            output = result.stdout[:self.MAX_OUTPUT_SIZE]
            error = result.stderr[:self.MAX_OUTPUT_SIZE]
            
            # 解析图表
            charts = []
            if "__CHARTS__:" in output:
                parts = output.split("__CHARTS__:")
                output = parts[0]
                try:
                    charts = json.loads(parts[1].strip())
                except:
                    pass
            
            return ExecutionResult(
                success=result.returncode == 0,
                output=output.strip(),
                error=error.strip(),
                charts=charts
            )
            
        finally:
            os.unlink(temp_path)
    
    def _execute_docker(self, code: str) -> ExecutionResult:
        """使用 Docker 执行 (更安全)"""
        # Docker 执行模式 - 未来实现
        return ExecutionResult(
            success=False,
            output="",
            error="Docker 模式尚未实现，请使用 subprocess 模式"
        )


# ============ Code Interpreter Tool ============

class CodeInterpreterTool(Tool):
    """代码解释器工具"""
    
    def __init__(self, use_docker: bool = False):
        super().__init__(
            name="code_interpreter",
            description="Python 代码执行器：运行计算、生成图表",
            expandable=True
        )
        self.executor = SandboxExecutor(use_docker=use_docker)
        self.verifier = CodeVerifier()
    
    @tool_action("execute_python", "执行 Python 代码")
    def execute(self, code: str) -> str:
        """在沙盒中执行 Python 代码
        
        支持的库：numpy, pandas, scipy, sklearn, matplotlib, plotly
        
        Args:
            code: Python 代码
        
        Returns:
            执行结果 JSON
        """
        result = self.executor.execute(code)
        return json.dumps(result.to_dict(), ensure_ascii=False)
    
    @tool_action("generate_chart", "生成图表")
    def generate_chart(
        self, 
        data: str,
        chart_type: str = "line",
        title: str = "",
        x_label: str = "",
        y_label: str = ""
    ) -> str:
        """生成数据可视化图表
        
        Args:
            data: JSON 格式数据，如 {"x": [1,2,3], "y": [4,5,6]}
            chart_type: 图表类型 (line/bar/scatter/pie)
            title: 图表标题
            x_label: X轴标签
            y_label: Y轴标签
        
        Returns:
            包含 Base64 图表的 JSON
        """
        try:
            data_dict = json.loads(data) if isinstance(data, str) else data
        except:
            return json.dumps({"error": "数据格式错误，需要 JSON 格式"})
        
        # 生成绘图代码
        chart_code = f'''
import matplotlib.pyplot as plt
import json

data = {json.dumps(data_dict)}

plt.figure(figsize=(10, 6))
plt.style.use('seaborn-v0_8-darkgrid')

x = data.get('x', list(range(len(data.get('y', [])))))
y = data.get('y', [])

'''
        if chart_type == "line":
            chart_code += "plt.plot(x, y, marker='o', linewidth=2)\n"
        elif chart_type == "bar":
            chart_code += "plt.bar(x, y, color='steelblue')\n"
        elif chart_type == "scatter":
            chart_code += "plt.scatter(x, y, s=100, alpha=0.7)\n"
        elif chart_type == "pie":
            chart_code += "plt.pie(y, labels=x, autopct='%1.1f%%')\n"
        
        chart_code += f'''
plt.title("{title}", fontsize=14)
plt.xlabel("{x_label}")
plt.ylabel("{y_label}")
plt.tight_layout()
'''
        
        result = self.executor.execute(chart_code, verify=False)
        return json.dumps(result.to_dict(), ensure_ascii=False)
    
    @tool_action("calculate_metrics", "计算量化指标")
    def calculate_metrics(self, returns_json: str) -> str:
        """计算投资组合量化指标
        
        Args:
            returns_json: 收益率序列 JSON，如 [0.01, -0.02, 0.015, ...]
        
        Returns:
            量化指标 JSON
        """
        calc_code = f'''
import numpy as np
import json

returns = np.array({returns_json})

# 年化收益率 (假设日收益)
annual_return = np.mean(returns) * 252

# 年化波动率
annual_volatility = np.std(returns) * np.sqrt(252)

# 夏普比率 (无风险利率假设3%)
risk_free_rate = 0.03
sharpe_ratio = (annual_return - risk_free_rate) / annual_volatility if annual_volatility > 0 else 0

# 最大回撤
cumulative = np.cumprod(1 + returns)
peak = np.maximum.accumulate(cumulative)
drawdown = (peak - cumulative) / peak
max_drawdown = np.max(drawdown)

# 索提诺比率
downside_returns = returns[returns < 0]
downside_std = np.std(downside_returns) * np.sqrt(252) if len(downside_returns) > 0 else 0
sortino_ratio = (annual_return - risk_free_rate) / downside_std if downside_std > 0 else 0

# 卡尔玛比率
calmar_ratio = annual_return / max_drawdown if max_drawdown > 0 else 0

result = {{
    "annual_return": round(annual_return * 100, 2),
    "annual_volatility": round(annual_volatility * 100, 2),
    "sharpe_ratio": round(sharpe_ratio, 2),
    "max_drawdown": round(max_drawdown * 100, 2),
    "sortino_ratio": round(sortino_ratio, 2),
    "calmar_ratio": round(calmar_ratio, 2)
}}

print(json.dumps(result))
'''
        result = self.executor.execute(calc_code, verify=False)
        
        if result.success and result.output:
            try:
                metrics = json.loads(result.output)
                return json.dumps({
                    "success": True,
                    "metrics": metrics
                }, ensure_ascii=False)
            except:
                pass
        
        return json.dumps({
            "success": False,
            "error": result.error or "计算失败"
        })
    
    @tool_action("verify_code", "验证代码安全性")
    def verify_code(self, code: str) -> str:
        """验证代码是否安全
        
        Args:
            code: 要验证的代码
        
        Returns:
            验证结果 JSON
        """
        result = self.verifier.verify(code)
        return json.dumps(result, ensure_ascii=False)
    
    def run(self, parameters: Dict[str, Any]) -> str:
        """默认执行方法"""
        action = parameters.get("action", "execute_python")
        
        if action == "execute_python":
            return self.execute(parameters.get("code", ""))
        elif action == "generate_chart":
            return self.generate_chart(
                parameters.get("data", "{}"),
                parameters.get("chart_type", "line"),
                parameters.get("title", ""),
                parameters.get("x_label", ""),
                parameters.get("y_label", "")
            )
        elif action == "calculate_metrics":
            return self.calculate_metrics(parameters.get("returns_json", "[]"))
        elif action == "verify_code":
            return self.verify_code(parameters.get("code", ""))
        
        return json.dumps({"error": "未知操作"})
    
    def get_parameters(self) -> List[ToolParameter]:
        return [
            ToolParameter(name="action", type="string",
                         description="操作: execute_python/generate_chart/calculate_metrics/verify_code"),
            ToolParameter(name="code", type="string",
                         description="Python 代码", required=False),
            ToolParameter(name="data", type="string",
                         description="图表数据 (JSON)", required=False),
            ToolParameter(name="chart_type", type="string",
                         description="图表类型", required=False),
            ToolParameter(name="returns_json", type="string",
                         description="收益率序列", required=False),
        ]


if __name__ == "__main__":
    # 测试
    tool = CodeInterpreterTool()
    
    print("测试代码执行:")
    result = tool.execute("""
import numpy as np
data = np.array([1, 2, 3, 4, 5])
print(f"均值: {np.mean(data)}")
print(f"标准差: {np.std(data)}")
""")
    print(result)
    
    print("\n测试指标计算:")
    returns = "[0.01, -0.02, 0.015, 0.008, -0.005, 0.012]"
    print(tool.calculate_metrics(returns))
    
    print("\n测试代码验证:")
    print(tool.verify_code("import os; os.system('rm -rf /')"))
