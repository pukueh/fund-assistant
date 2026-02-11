"""上下文工程服务 - 基于 HelloAgents GSSC 流水线

为基金助手提供智能上下文管理：
- Gather: 收集多源信息（记忆、RAG、历史）
- Select: 基于相关性和重要性筛选
- Structure: 组织成结构化模板
- Compress: Token 预算内压缩
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass

from hello_agents.context import ContextBuilder, ContextConfig
from hello_agents.context.builder import ContextPacket
from hello_agents.core.message import Message


@dataclass
class FundContextConfig:
    """基金助手上下文配置"""
    max_tokens: int = 6000  # 总预算
    reserve_ratio: float = 0.2  # 生成余量
    min_relevance: float = 0.25  # 最小相关性
    enable_compression: bool = True
    
    def to_context_config(self) -> ContextConfig:
        return ContextConfig(
            max_tokens=self.max_tokens,
            reserve_ratio=self.reserve_ratio,
            min_relevance=self.min_relevance,
            enable_compression=self.enable_compression,
            enable_mmr=True,
            mmr_lambda=0.7
        )


class FundContextService:
    """基金助手上下文构建服务
    
    使用 GSSC 流水线优化 Agent 输入上下文：
    - 整合记忆上下文
    - 整合 RAG 知识
    - 管理 Token 预算
    - 结构化输出
    """
    
    def __init__(
        self,
        memory_tool=None,
        rag_tool=None,
        config: Optional[FundContextConfig] = None
    ):
        """初始化上下文服务
        
        Args:
            memory_tool: MemoryTool 实例
            rag_tool: RAGTool 实例
            config: 上下文配置
        """
        self.memory_tool = memory_tool
        self.rag_tool = rag_tool
        self.config = config or FundContextConfig()
        
        # 创建 ContextBuilder
        self.builder = ContextBuilder(
            memory_tool=memory_tool,
            rag_tool=rag_tool,
            config=self.config.to_context_config()
        )
        
        # 系统指令模板
        self.system_template = """你是一个专业的基金投资顾问，具备以下能力：
1. 深入理解用户的投资需求和风险偏好
2. 基于市场数据和专业知识提供投资建议
3. 解答基金相关的各类问题
4. 提供个性化的资产配置方案

请基于提供的上下文信息，给出专业、准确、有帮助的回答。"""
    
    def build_context(
        self,
        user_query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        additional_context: Optional[str] = None
    ) -> str:
        """构建优化的上下文
        
        Args:
            user_query: 用户问题
            conversation_history: 对话历史 [{"role": "user/assistant", "content": "..."}]
            additional_context: 额外上下文信息
            
        Returns:
            结构化的上下文字符串
        """
        # 转换历史格式
        history_messages = []
        if conversation_history:
            for msg in conversation_history[-10:]:  # 最近10条
                history_messages.append(
                    Message(role=msg.get("role", "user"), content=msg.get("content", ""))
                )
        
        # 额外上下文包
        additional_packets = []
        if additional_context:
            additional_packets.append(
                ContextPacket(
                    content=additional_context,
                    metadata={"type": "additional_context"}
                )
            )
        
        # 构建上下文
        try:
            context = self.builder.build(
                user_query=user_query,
                conversation_history=history_messages,
                system_instructions=self.system_template,
                additional_packets=additional_packets
            )
            return context
        except Exception as e:
            # 降级：返回简单上下文
            return self._build_simple_context(user_query, conversation_history, additional_context)
    
    def _build_simple_context(
        self,
        user_query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        additional_context: Optional[str] = None
    ) -> str:
        """降级的简单上下文构建"""
        parts = [
            "[Role & Policies]",
            self.system_template,
            "",
            "[Task]",
            f"用户问题：{user_query}"
        ]
        
        if additional_context:
            parts.extend([
                "",
                "[Evidence]",
                additional_context
            ])
        
        if conversation_history:
            recent = conversation_history[-5:]
            history_text = "\n".join([
                f"[{msg.get('role', 'user')}] {msg.get('content', '')}"
                for msg in recent
            ])
            parts.extend([
                "",
                "[Context]",
                "对话历史：",
                history_text
            ])
        
        parts.extend([
            "",
            "[Output]",
            "请按以下格式回答：",
            "1. 结论（简洁明确）",
            "2. 依据（列出支撑证据）",
            "3. 下一步建议（如适用）"
        ])
        
        return "\n".join(parts)
    
    def build_enhanced_query(
        self,
        user_query: str,
        memory_context: Optional[str] = None,
        rag_context: Optional[str] = None
    ) -> str:
        """构建增强的查询（简化版本）
        
        适用于不需要完整 GSSC 流水线的场景
        
        Args:
            user_query: 原始用户问题
            memory_context: 记忆上下文
            rag_context: RAG 上下文
            
        Returns:
            增强后的查询字符串
        """
        if not memory_context and not rag_context:
            return user_query
        
        parts = []
        
        if memory_context:
            parts.append(f"[用户记忆]\n{memory_context}")
        
        if rag_context:
            parts.append(f"[知识库]\n{rag_context}")
        
        parts.append(f"[用户问题]\n{user_query}")
        
        return "\n\n".join(parts)
    
    def estimate_tokens(self, text: str) -> int:
        """估算文本的 Token 数量
        
        Args:
            text: 文本内容
            
        Returns:
            估算的 Token 数量
        """
        try:
            import tiktoken
            encoding = tiktoken.get_encoding("cl100k_base")
            return len(encoding.encode(text))
        except Exception:
            # 降级估算：约 4 字符 = 1 token
            return len(text) // 4
    
    def get_available_budget(self) -> int:
        """获取可用的 Token 预算
        
        Returns:
            可用 Token 数量
        """
        return int(self.config.max_tokens * (1 - self.config.reserve_ratio))


# 单例实例
_context_service: Optional[FundContextService] = None


def get_context_service(
    memory_tool=None,
    rag_tool=None
) -> FundContextService:
    """获取上下文服务单例
    
    Args:
        memory_tool: 可选的 MemoryTool
        rag_tool: 可选的 RAGTool
        
    Returns:
        FundContextService 实例
    """
    global _context_service
    
    if _context_service is None:
        _context_service = FundContextService(
            memory_tool=memory_tool,
            rag_tool=rag_tool
        )
    
    return _context_service
