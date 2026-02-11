"""记忆服务 - 基于 HelloAgents 框架的记忆管理

为基金助手提供智能对话记忆功能：
- 短期工作记忆：当前对话上下文
- 情景记忆：历史对话事件
- 语义记忆：用户偏好和投资知识
"""

import os
from typing import Dict, Any, List, Optional
from datetime import datetime

from hello_agents.memory import MemoryManager, MemoryConfig, MemoryItem
from hello_agents.tools import MemoryTool


class FundMemoryService:
    """基金助手记忆服务
    
    提供统一的记忆管理接口，支持：
    - 用户偏好记忆（风险偏好、投资目标等）
    - 对话历史记忆
    - 投资知识记忆
    """
    
    def __init__(
        self,
        user_id: str = "default_user",
        storage_path: str = "./data/memory"
    ):
        """初始化记忆服务
        
        Args:
            user_id: 用户ID
            storage_path: 记忆存储路径
        """
        self.user_id = user_id
        self.storage_path = storage_path
        
        # 确保存储目录存在
        os.makedirs(storage_path, exist_ok=True)
        
        # 初始化记忆配置
        self.config = MemoryConfig(
            storage_path=storage_path,
            max_capacity=200,
            importance_threshold=0.1,
            decay_factor=0.95,
            working_memory_capacity=15,
            working_memory_tokens=3000,
            working_memory_ttl_minutes=180
        )
        
        # 初始化记忆管理器
        self.manager = MemoryManager(
            config=self.config,
            user_id=user_id,
            enable_working=True,     # 短期对话记忆
            enable_episodic=True,    # 历史事件记忆
            enable_semantic=True,    # 投资知识记忆
            enable_perceptual=False  # 不需要感知记忆
        )
        
        # 初始化 MemoryTool（可供 Agent 使用）
        self.memory_tool = MemoryTool(
            user_id=user_id,
            memory_config=self.config,
            memory_types=["working", "episodic", "semantic"],
            expandable=False
        )
        
        # 会话状态
        self.session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.conversation_count = 0
    
    def remember_preference(
        self,
        preference: str,
        preference_type: str = "general",
        importance: float = 0.9
    ) -> str:
        """记住用户偏好
        
        Args:
            preference: 偏好内容
            preference_type: 偏好类型（risk_level, investment_goal, etc.）
            importance: 重要性分数
            
        Returns:
            记忆ID
        """
        return self.manager.add_memory(
            content=preference,
            memory_type="semantic",
            importance=importance,
            metadata={
                "type": "user_preference",
                "preference_type": preference_type,
                "user_id": self.user_id,
                "timestamp": datetime.now().isoformat()
            },
            auto_classify=False
        )
    
    def remember_conversation(
        self,
        user_message: str,
        assistant_response: str,
        agent_name: str = None
    ):
        """记住对话内容
        
        Args:
            user_message: 用户消息
            assistant_response: 助手回复
            agent_name: Agent名称
        """
        self.conversation_count += 1
        
        # 添加到工作记忆（短期）
        conversation_content = f"用户: {user_message}\n助手: {assistant_response}"
        self.manager.add_memory(
            content=conversation_content,
            memory_type="working",
            importance=0.6,
            metadata={
                "type": "conversation",
                "session_id": self.session_id,
                "conversation_id": self.conversation_count,
                "agent_name": agent_name,
                "timestamp": datetime.now().isoformat()
            },
            auto_classify=False
        )
        
        # 如果是重要对话，同时添加到情景记忆
        important_keywords = ["记住", "重要", "偏好", "风险", "目标", "配置", "策略"]
        if any(kw in user_message for kw in important_keywords) or len(assistant_response) > 200:
            self.manager.add_memory(
                content=f"[重要对话] {conversation_content[:500]}",
                memory_type="episodic",
                importance=0.8,
                metadata={
                    "type": "important_conversation",
                    "session_id": self.session_id,
                    "conversation_id": self.conversation_count,
                    "agent_name": agent_name,
                    "timestamp": datetime.now().isoformat()
                },
                auto_classify=False
            )
    
    def remember_knowledge(
        self,
        knowledge: str,
        category: str = "investment",
        importance: float = 0.85
    ) -> str:
        """记住投资知识
        
        Args:
            knowledge: 知识内容
            category: 知识类别
            importance: 重要性分数
            
        Returns:
            记忆ID
        """
        return self.manager.add_memory(
            content=knowledge,
            memory_type="semantic",
            importance=importance,
            metadata={
                "type": "knowledge",
                "category": category,
                "source": "fund_assistant",
                "timestamp": datetime.now().isoformat()
            },
            auto_classify=False
        )
    
    def get_relevant_context(
        self,
        query: str,
        limit: int = 5,
        memory_types: List[str] = None
    ) -> str:
        """获取与查询相关的记忆上下文
        
        Args:
            query: 查询内容
            limit: 返回数量限制
            memory_types: 要检索的记忆类型
            
        Returns:
            格式化的记忆上下文
        """
        results = self.manager.retrieve_memories(
            query=query,
            memory_types=memory_types or ["semantic", "episodic", "working"],
            limit=limit,
            min_importance=0.3
        )
        
        if not results:
            return ""
        
        context_parts = ["[相关记忆]"]
        for memory in results:
            type_label = {
                "working": "近期对话",
                "episodic": "历史事件",
                "semantic": "知识/偏好"
            }.get(memory.memory_type, memory.memory_type)
            
            context_parts.append(f"- [{type_label}] {memory.content}")
        
        return "\n".join(context_parts)
    
    def get_user_preferences(self) -> List[MemoryItem]:
        """获取用户偏好记忆
        
        Returns:
            用户偏好列表
        """
        return self.manager.retrieve_memories(
            query="用户偏好 风险 目标 投资",
            memory_types=["semantic"],
            limit=10,
            min_importance=0.5
        )
    
    def consolidate_memories(self) -> int:
        """整合记忆（将重要的短期记忆转为长期记忆）
        
        Returns:
            整合的记忆数量
        """
        return self.manager.consolidate_memories(
            from_type="working",
            to_type="episodic",
            importance_threshold=0.7
        )
    
    def forget_old_memories(self, max_age_days: int = 30) -> int:
        """遗忘旧记忆
        
        Args:
            max_age_days: 最大保留天数
            
        Returns:
            遗忘的记忆数量
        """
        return self.manager.forget_memories(
            strategy="time_based",
            max_age_days=max_age_days
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """获取记忆统计信息
        
        Returns:
            统计信息字典
        """
        stats = self.manager.get_memory_stats()
        stats.update({
            "user_id": self.user_id,
            "session_id": self.session_id,
            "conversation_count": self.conversation_count
        })
        return stats
    
    def clear_session(self):
        """清除当前会话（只清除工作记忆）"""
        self.session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.conversation_count = 0
        
        # 只清除工作记忆
        if hasattr(self.manager, 'memory_types'):
            wm = self.manager.memory_types.get('working')
            if wm:
                wm.clear()
    
    def get_memory_tool(self) -> MemoryTool:
        """获取 MemoryTool 实例（供 Agent 使用）
        
        Returns:
            MemoryTool 实例
        """
        return self.memory_tool


from functools import lru_cache

# 使用 LRU 缓存管理实例，避免内存无限增长
@lru_cache(maxsize=128)
def get_memory_service(user_id: str = "default_user") -> FundMemoryService:
    """获取记忆服务实例 (由于使用了 LRU 缓存，会自动管理内存)
    
    Args:
        user_id: 用户ID
        
    Returns:
        FundMemoryService 实例
    """
    return FundMemoryService(
        user_id=user_id,
        storage_path=f"./data/memory/{user_id}"
    )
