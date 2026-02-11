"""RAG 知识库管理 - 使用 HelloAgents RAG Pipeline"""

import os
from typing import List, Dict, Optional

# 尝试导入 HelloAgents RAG 模块
try:
    from hello_agents.memory.rag import (
        load_and_chunk_texts,
        index_chunks,
        search_vectors,
        embed_query
    )
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False
    print("⚠️ RAG 模块不可用，将使用简单关键词搜索")


class FundKnowledgeBase:
    """基金知识库 - 使用 HelloAgents RAG"""
    
    def __init__(self, knowledge_dir: str = "./knowledge"):
        self.knowledge_dir = knowledge_dir
        self.namespace = "fund_knowledge"
        self.indexed = False
        
        # 简单的关键词索引作为后备
        self._simple_index = {}
        
    def build_index(self) -> bool:
        """构建知识库索引"""
        # 获取知识文件
        knowledge_files = []
        if os.path.exists(self.knowledge_dir):
            for f in os.listdir(self.knowledge_dir):
                if f.endswith(('.md', '.txt', '.pdf')):
                    knowledge_files.append(os.path.join(self.knowledge_dir, f))
        
        if not knowledge_files:
            print(f"⚠️ 未找到知识文件: {self.knowledge_dir}")
            return False
        
        print(f"📚 找到 {len(knowledge_files)} 个知识文件")
        
        if RAG_AVAILABLE:
            try:
                # 使用 HelloAgents RAG Pipeline
                chunks = load_and_chunk_texts(
                    paths=knowledge_files,
                    chunk_size=800,
                    chunk_overlap=100,
                    namespace=self.namespace
                )
                print(f"📄 切分为 {len(chunks)} 个文本块")
                
                # 索引
                index_chunks(chunks=chunks, rag_namespace=self.namespace)
                print("✅ RAG 索引构建完成")
                self.indexed = True
                return True
            except Exception as e:
                print(f"⚠️ RAG 索引失败: {e}")
        
        # 后备: 简单关键词索引
        self._build_simple_index(knowledge_files)
        self.indexed = True
        return True
    
    def _build_simple_index(self, files: List[str]):
        """构建简单的关键词索引"""
        for file_path in files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # 按段落切分
                paragraphs = content.split('\n\n')
                for i, para in enumerate(paragraphs):
                    if para.strip():
                        # 提取关键词
                        words = set(para.lower().split())
                        self._simple_index[f"{file_path}:{i}"] = {
                            "content": para.strip(),
                            "keywords": words,
                            "source": os.path.basename(file_path)
                        }
            except Exception as e:
                print(f"⚠️ 读取文件失败 {file_path}: {e}")
        
        print(f"✅ 简单索引构建完成，共 {len(self._simple_index)} 个段落")
    
    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """搜索知识库"""
        if not self.indexed:
            self.build_index()
        
        if RAG_AVAILABLE:
            try:
                results = search_vectors(
                    query=query,
                    top_k=top_k,
                    rag_namespace=self.namespace
                )
                return [
                    {"content": r.get("text", ""), "score": r.get("score", 0)}
                    for r in results
                ]
            except Exception as e:
                print(f"⚠️ RAG 搜索失败: {e}")
        
        # 后备: 简单关键词搜索
        return self._simple_search(query, top_k)
    
    def _simple_search(self, query: str, top_k: int) -> List[Dict]:
        """简单关键词搜索"""
        query_words = set(query.lower().split())
        
        scored_results = []
        for key, item in self._simple_index.items():
            # 计算关键词重叠
            overlap = len(query_words & item["keywords"])
            if overlap > 0:
                scored_results.append({
                    "content": item["content"],
                    "score": overlap / len(query_words),
                    "source": item["source"]
                })
        
        # 排序
        scored_results.sort(key=lambda x: x["score"], reverse=True)
        return scored_results[:top_k]
    
    def get_context(self, query: str, max_chars: int = 2000) -> str:
        """获取与查询相关的上下文"""
        results = self.search(query, top_k=5)
        
        context_parts = []
        total_chars = 0
        for r in results:
            content = r["content"]
            if total_chars + len(content) < max_chars:
                context_parts.append(content)
                total_chars += len(content)
            else:
                break
        
        return "\n\n---\n\n".join(context_parts)


# 单例
_knowledge_base = None

def get_knowledge_base() -> FundKnowledgeBase:
    """获取知识库单例"""
    global _knowledge_base
    if _knowledge_base is None:
        kb_path = os.path.join(os.path.dirname(__file__), "..", "knowledge")
        _knowledge_base = FundKnowledgeBase(kb_path)
    return _knowledge_base


if __name__ == "__main__":
    # 测试
    kb = get_knowledge_base()
    kb.build_index()
    
    results = kb.search("定投策略")
    for r in results:
        print(f"Score: {r['score']:.2f}")
        print(f"Content: {r['content'][:100]}...")
        print("-" * 40)
