"""RAG 服务 - 基于 HelloAgents 框架的知识库检索

为基金助手提供知识库 RAG 能力：
- 索引基金知识文档
- 智能检索相关内容
- 支持问答增强
"""

import os
from typing import Dict, Any, List, Optional

from hello_agents.tools import RAGTool


class FundRAGService:
    """基金知识库 RAG 服务
    
    提供知识库管理和检索接口，支持：
    - 索引本地知识文档（Markdown、PDF等）
    - 向量检索相关内容
    - 智能问答
    """
    
    def __init__(
        self,
        knowledge_base_path: str = "./knowledge",
        collection_name: str = "fund_knowledge",
        namespace: str = "fund_assistant",
        qdrant_url: str = None,
        qdrant_api_key: str = None
    ):
        """初始化 RAG 服务
        
        Args:
            knowledge_base_path: 知识库目录路径
            collection_name: 向量集合名称
            namespace: 命名空间
            qdrant_url: Qdrant URL（可选，不提供则使用内存存储）
            qdrant_api_key: Qdrant API Key
        """
        self.knowledge_base_path = knowledge_base_path
        self.collection_name = collection_name
        self.namespace = namespace
        
        # 确保知识库目录存在
        os.makedirs(knowledge_base_path, exist_ok=True)
        
        # 从环境变量获取 Qdrant 配置
        self.qdrant_url = qdrant_url or os.getenv("QDRANT_URL")
        self.qdrant_api_key = qdrant_api_key or os.getenv("QDRANT_API_KEY")
        
        # 初始化 RAGTool
        try:
            self.rag_tool = RAGTool(
                knowledge_base_path=knowledge_base_path,
                qdrant_url=self.qdrant_url,
                qdrant_api_key=self.qdrant_api_key,
                collection_name=collection_name,
                rag_namespace=namespace,
                expandable=False
            )
            self.initialized = True
            print(f"✅ RAG服务初始化成功: namespace={namespace}")
        except Exception as e:
            self.initialized = False
            self.init_error = str(e)
            print(f"⚠️ RAG服务初始化失败: {e}")
            self.rag_tool = None
    
    def index_knowledge_base(self, chunk_size: int = 800, chunk_overlap: int = 100) -> str:
        """索引知识库目录中的所有文档
        
        Args:
            chunk_size: 分块大小
            chunk_overlap: 分块重叠大小
            
        Returns:
            索引结果
        """
        if not self.initialized or not self.rag_tool:
            return f"❌ RAG服务未初始化: {getattr(self, 'init_error', '未知错误')}"
        
        results = []
        indexed_count = 0
        
        # 遍历知识库目录
        for root, dirs, files in os.walk(self.knowledge_base_path):
            for file in files:
                # 支持的文件类型
                if file.endswith(('.md', '.txt', '.pdf', '.docx')):
                    file_path = os.path.join(root, file)
                    try:
                        result = self.rag_tool.run({
                            "action": "add_document",
                            "file_path": file_path,
                            "namespace": self.namespace,
                            "chunk_size": chunk_size,
                            "chunk_overlap": chunk_overlap
                        })
                        results.append(f"✅ {file}: 索引成功")
                        indexed_count += 1
                    except Exception as e:
                        results.append(f"❌ {file}: {str(e)}")
        
        if indexed_count == 0:
            return f"⚠️ 未找到可索引的文档。请确保 {self.knowledge_base_path} 目录下有 .md, .txt, .pdf, .docx 文件"
        
        return f"📚 知识库索引完成: 成功索引 {indexed_count} 个文档\n" + "\n".join(results)
    
    def add_document(self, file_path: str, chunk_size: int = 800) -> str:
        """添加单个文档到知识库
        
        Args:
            file_path: 文档路径
            chunk_size: 分块大小
            
        Returns:
            添加结果
        """
        if not self.initialized or not self.rag_tool:
            return f"❌ RAG服务未初始化"
        
        return self.rag_tool.run({
            "action": "add_document",
            "file_path": file_path,
            "namespace": self.namespace,
            "chunk_size": chunk_size
        })
    
    def add_text(self, text: str, document_id: str = None) -> str:
        """添加文本到知识库
        
        Args:
            text: 文本内容
            document_id: 文档ID
            
        Returns:
            添加结果
        """
        if not self.initialized or not self.rag_tool:
            return f"❌ RAG服务未初始化"
        
        return self.rag_tool.run({
            "action": "add_text",
            "text": text,
            "document_id": document_id,
            "namespace": self.namespace
        })
    
    def search(
        self,
        query: str,
        limit: int = 5,
        enable_advanced: bool = True
    ) -> str:
        """搜索知识库
        
        Args:
            query: 搜索查询
            limit: 返回数量
            enable_advanced: 是否启用高级搜索
            
        Returns:
            搜索结果
        """
        if not self.initialized or not self.rag_tool:
            return f"❌ RAG服务未初始化"
        
        return self.rag_tool.run({
            "action": "search",
            "query": query,
            "limit": limit,
            "enable_advanced_search": enable_advanced,
            "namespace": self.namespace
        })
    
    def ask(
        self,
        question: str,
        limit: int = 5,
        include_citations: bool = True
    ) -> str:
        """基于知识库进行智能问答
        
        Args:
            question: 用户问题
            limit: 检索数量
            include_citations: 是否包含引用
            
        Returns:
            问答结果
        """
        if not self.initialized or not self.rag_tool:
            return f"❌ RAG服务未初始化"
        
        return self.rag_tool.run({
            "action": "ask",
            "question": question,
            "limit": limit,
            "include_citations": include_citations,
            "namespace": self.namespace
        })
    
    def get_relevant_context(self, query: str, limit: int = 3, max_chars: int = 1200) -> str:
        """获取与查询相关的上下文（供 Agent 使用）
        
        Args:
            query: 查询内容
            limit: 返回数量
            max_chars: 最大字符数
            
        Returns:
            相关上下文
        """
        if not self.initialized or not self.rag_tool:
            return ""
        
        return self.rag_tool.get_relevant_context(
            query=query,
            limit=limit,
            max_chars=max_chars,
            namespace=self.namespace
        )
    
    def get_stats(self) -> str:
        """获取知识库统计信息
        
        Returns:
            统计信息
        """
        if not self.initialized or not self.rag_tool:
            return f"❌ RAG服务未初始化"
        
        return self.rag_tool.run({
            "action": "stats",
            "namespace": self.namespace
        })
    
    def clear(self, confirm: bool = False) -> str:
        """清空知识库
        
        Args:
            confirm: 确认删除
            
        Returns:
            清空结果
        """
        if not self.initialized or not self.rag_tool:
            return f"❌ RAG服务未初始化"
        
        return self.rag_tool.run({
            "action": "clear",
            "confirm": confirm,
            "namespace": self.namespace
        })
    
    def get_rag_tool(self) -> Optional[RAGTool]:
        """获取 RAGTool 实例（供 Agent 使用）
        
        Returns:
            RAGTool 实例
        """
        return self.rag_tool


# 单例实例
_rag_service: Optional[FundRAGService] = None


def get_rag_service() -> FundRAGService:
    """获取 RAG 服务单例
    
    Returns:
        FundRAGService 实例
    """
    global _rag_service
    
    if _rag_service is None:
        _rag_service = FundRAGService(
            knowledge_base_path="./knowledge",
            collection_name="fund_knowledge",
            namespace="fund_assistant"
        )
    
    return _rag_service
