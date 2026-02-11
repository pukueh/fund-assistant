"""ReAct Agent实现 - 推理与行动结合的智能体"""

import re
from typing import Optional, List, Tuple
from ..core.agent import Agent
from ..core.llm import HelloAgentsLLM
from ..core.config import Config
from ..core.message import Message
from ..tools.registry import ToolRegistry

# 默认ReAct提示词模板
DEFAULT_REACT_PROMPT = """你是一个具备推理和行动能力的AI助手。你可以通过思考分析问题，然后调用合适的工具来获取信息，最终给出准确的答案。

## 可用工具
{tools}

## 工作流程
请严格按照以下格式进行回应，每次只能执行一个步骤：

Thought: 分析问题，确定需要什么信息，制定研究策略。
Action: 选择合适的工具获取信息，格式为：
- `{{tool_name}}[{{tool_input}}]`：调用工具获取信息。
- `Finish[研究结论]`：当你有足够信息得出结论时。

## 重要提醒
1. 每次回应必须包含Thought和Action两部分
2. 工具调用的格式必须严格遵循：工具名[参数]
3. 只有当你确信有足够信息回答问题时，才使用Finish
4. 如果工具返回的信息不够，继续使用其他工具或相同工具的不同参数

## 当前任务
**Question:** {question}

## 执行历史
{history}

现在开始你的推理和行动："""

class ReActAgent(Agent):
    """
    ReAct (Reasoning and Acting) Agent
    
    结合推理和行动的智能体，能够：
    1. 分析问题并制定行动计划
    2. 调用外部工具获取信息
    3. 基于观察结果进行推理
    4. 迭代执行直到得出最终答案
    
    这是一个经典的Agent范式，特别适合需要外部信息的任务。
    """
    
    def __init__(
        self,
        name: str,
        llm: HelloAgentsLLM,
        tool_registry: Optional[ToolRegistry] = None,
        system_prompt: Optional[str] = None,
        config: Optional[Config] = None,
        max_steps: int = 5,
        custom_prompt: Optional[str] = None
    ):
        """
        初始化ReActAgent

        Args:
            name: Agent名称
            llm: LLM实例
            tool_registry: 工具注册表（可选，如果不提供则创建空的工具注册表）
            system_prompt: 系统提示词
            config: 配置对象
            max_steps: 最大执行步数
            custom_prompt: 自定义提示词模板
        """
        super().__init__(name, llm, system_prompt, config)

        # 如果没有提供tool_registry，创建一个空的
        if tool_registry is None:
            self.tool_registry = ToolRegistry()
        else:
            self.tool_registry = tool_registry

        self.max_steps = max_steps
        self.current_history: List[str] = []

        # 设置提示词模板：用户自定义优先，否则使用默认模板
        self.prompt_template = custom_prompt if custom_prompt else DEFAULT_REACT_PROMPT

    def add_tool(self, tool):
        """
        添加工具到工具注册表
        支持MCP工具的自动展开

        Args:
            tool: 工具实例(可以是普通Tool或MCPTool)
        """
        # 检查是否是MCP工具
        if hasattr(tool, 'auto_expand') and tool.auto_expand:
            # MCP工具会自动展开为多个工具
            if hasattr(tool, '_available_tools') and tool._available_tools:
                for mcp_tool in tool._available_tools:
                    # 创建包装工具
                    from ..tools.base import Tool
                    wrapped_tool = Tool(
                        name=f"{tool.name}_{mcp_tool['name']}",
                        description=mcp_tool.get('description', ''),
                        func=lambda input_text, t=tool, tn=mcp_tool['name']: t.run({
                            "action": "call_tool",
                            "tool_name": tn,
                            "arguments": {"input": input_text}
                        })
                    )
                    self.tool_registry.register_tool(wrapped_tool)
                print(f"✅ MCP工具 '{tool.name}' 已展开为 {len(tool._available_tools)} 个独立工具")
            else:
                self.tool_registry.register_tool(tool)
        else:
            self.tool_registry.register_tool(tool)

    async def stream_run(self, input_text: str, **kwargs):
        """
        异步流式运行 ReAct Agent
        """
        self.current_history = []
        current_step = 0
        
        yield f"🤖 {self.name} 开始处理问题: {input_text}\n"
        
        while current_step < self.max_steps:
            current_step += 1
            yield f"\n--- 第 {current_step} 步 ---\n"
            
            # 构建提示词
            tools_desc = self.tool_registry.get_tools_description()
            history_str = "\n".join(self.current_history)
            prompt = self.prompt_template.format(
                tools=tools_desc,
                question=input_text,
                history=history_str
            )
            
            # 调用LLM流式生成
            messages = [{"role": "user", "content": prompt}]
            full_response = ""
            
            # 使用 self.llm.async_think 获取真实异步流式输出
            async for chunk in self.llm.async_think(messages, **kwargs):
                full_response += chunk
                yield chunk

            
            if not full_response:
                yield "❌ 错误：LLM未能返回有效响应。\n"
                break
            
            # 解析输出
            thought, action = self._parse_output(full_response)
            
            if not action:
                yield "\n⚠️ 警告：未能解析出有效的Action，流程终止。\n"
                break
            
            # 检查是否完成
            if action.startswith("Finish"):
                final_answer = self._parse_action_input(action)
                # 保存到历史记录
                self.add_message(Message(input_text, "user"))
                self.add_message(Message(final_answer, "assistant"))
                return
            
            # 执行工具调用
            tool_name, tool_input = self._parse_action(action)
            if not tool_name or tool_input is None:
                obs = "Observation: 无效的Action格式，请检查。"
                self.current_history.append(obs)
                yield f"\n{obs}\n"
                continue
            
            yield f"\n🎬 执行工具: {tool_name}\n"
            
            # 调用工具 (同步执行，以后可以考虑异步工具)
            observation = self.tool_registry.execute_tool(tool_name, tool_input)
            yield f"👀 观察结果: {observation}\n"
            
            # 更新历史
            self.current_history.append(f"Action: {action}")
            self.current_history.append(f"Observation: {observation}")
        
        if current_step >= self.max_steps:
            yield "\n⏰ 已达到最大步数，流程终止。\n"
            final_answer = "抱歉，我无法在限定步数内完成这个任务。"
            self.add_message(Message(input_text, "user"))
            self.add_message(Message(final_answer, "assistant"))

    async def _async_generator_wrapper(self, sync_gen):
        """将同步生成器包装为异步生成器"""
        for item in sync_gen:
            yield item
            import asyncio
            await asyncio.sleep(0) # 释放控制权

    def run(self, input_text: str, **kwargs) -> str:
        """
        同步运行 ReAct Agent
        """
        self.current_history = []
        current_step = 0
        
        print(f"\n🤖 {self.name} 开始处理问题: {input_text}")
        
        while current_step < self.max_steps:
            current_step += 1
            print(f"\n--- 第 {current_step} 步 ---")
            
            # 构建提示词
            tools_desc = self.tool_registry.get_tools_description()
            history_str = "\n".join(self.current_history)
            prompt = self.prompt_template.format(
                tools=tools_desc,
                question=input_text,
                history=history_str
            )
            
            # 调用LLM
            messages = [{"role": "user", "content": prompt}]
            response_text = self.llm.invoke(messages, **kwargs)
            
            if not response_text:
                print("❌ 错误：LLM未能返回有效响应。")
                break
            
            # 打印 LLM 输出的 Thought 和 Action (如果有的化)
            print(response_text)
            
            # 解析输出
            thought, action = self._parse_output(response_text)
            
            if not action:
                print("⚠️ 警告：未能解析出有效的Action，流程终止。")
                break
            
            # 检查是否完成
            if action.startswith("Finish"):
                final_answer = self._parse_action_input(action)
                print(f"🎉 最终答案: {final_answer}")
                # 保存到历史记录
                self.add_message(Message(input_text, "user"))
                self.add_message(Message(final_answer, "assistant"))
                return final_answer
            
            # 执行工具调用
            tool_name, tool_input = self._parse_action(action)
            if not tool_name or tool_input is None:
                self.current_history.append("Observation: 无效的Action格式，请检查。")
                continue
            
            print(f"🎬 行动: {tool_name}[{tool_input}]")
            
            # 调用工具
            observation = self.tool_registry.execute_tool(tool_name, tool_input)
            print(f"👀 观察: {observation}")
            
            # 更新历史
            self.current_history.append(f"Action: {action}")
            self.current_history.append(f"Observation: {observation}")
        
        print("⏰ 已达到最大步数，流程终止。")
        final_answer = "抱歉，我无法在限定步数内完成这个任务。"
        self.add_message(Message(input_text, "user"))
        self.add_message(Message(final_answer, "assistant"))
        return final_answer

    
    def _parse_output(self, text: str) -> Tuple[Optional[str], Optional[str]]:
        """
        增强版解析逻辑：提取思考和行动
        能够处理加粗标记、多行文本以及不规范的空格。
        """
        # 预处理：移除 Markdown 加粗标记以便匹配
        clean_text = re.sub(r'\*\*(Thought|Action|Observation|Finish)\*\*:', r'\1:', text)
        
        thought = None
        action = None
        
        # 匹配 Thought：提取 Thought: 到 Action: 之前的所有内容
        thought_match = re.search(r"Thought:\s*(.*?)(?=\s*Action:|$)", clean_text, re.DOTALL | re.IGNORECASE)
        if thought_match:
            thought = thought_match.group(1).strip()
            
        # 匹配 Action：提取 Action: 之后的所有内容
        action_match = re.search(r"Action:\s*(.*)", clean_text, re.DOTALL | re.IGNORECASE)
        if action_match:
            action = action_match.group(1).strip()
            
        return thought, action
    
    def _parse_action(self, action_text: str) -> Tuple[Optional[str], Optional[str]]:
        """
        解析行动文本，提取工具名称和输入。
        支持：tool_name[tool_input] 格式
        """
        if not action_text:
            return None, None
            
        # 兼容处理：有些 LLM 可能会输出 Action: `tool_name[input]`
        action_text = action_text.strip('`').strip()
        
        # 匹配工具名和方括号内的参数
        match = re.match(r"(\w+)\s*\[(.*)\]", action_text, re.DOTALL)
        if match:
            return match.group(1), match.group(2).strip()
            
        return None, None
    
    def _parse_action_input(self, action_text: str) -> str:
        """解析行动输入值"""
        _, tool_input = self._parse_action(action_text)
        return tool_input if tool_input is not None else ""

