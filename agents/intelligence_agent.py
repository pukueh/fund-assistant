"""市场情报侦察兵 Agent - Perplexity + Bloomberg 风格

职责：
- 外部信息获取与清洗
- 财报PDF解析
- 美联储会议纪要分析
- 知识图谱增强检索 (GraphRAG)
"""

from typing import Optional, Dict, List
from hello_agents import HelloAgentsLLM, ReActAgent, ToolRegistry

# 情报分析 Prompt
INTELLIGENCE_PROMPT = """你是市场情报侦察兵（Market Intelligence Agent），负责收集和分析市场信息。

## 你的能力
1. **实时搜索**: 从网络获取最新资讯
2. **新闻分析**: 解读财经新闻对市场的影响
3. **财报解读**: 解析PDF财报关键数据
4. **政策跟踪**: 分析美联储等机构政策影响

## 可用工具
{tools}

## 分析框架

### 信息收集
首先使用工具收集足够的信息：
- web_search: 搜索相关背景信息
- news_api: 获取最新新闻动态
- pdf_parser: 解析研报或财报
- fed_minutes: 获取货币政策动向

### 实体关系分析
识别关键实体及其关系：
- 供应链关系 (如: 英伟达 → 台积电)
- 竞争关系
- 政策影响链条

### 综合研判
整合信息给出市场洞察：
- 短期影响
- 中长期趋势
- 风险提示

## 当前任务
**用户问题:** {question}

## 已收集信息
{history}

请按以下格式推理：

Thought: 分析需要什么信息，选择合适的工具
Action: 
- `{{tool_name}}[{{参数}}]`：调用工具获取信息
- `Finish[情报分析报告]`：当信息充足时给出综合分析
"""


# ============ 实体关系提取 (简化版 GraphRAG) ============

class EntityRelationExtractor:
    """实体关系提取器 - 简化版知识图谱"""
    
    # 预定义的供应链关系
    SUPPLY_CHAIN = {
        "英伟达": ["台积电", "三星电子", "SK海力士"],
        "苹果": ["台积电", "富士康", "三星SDI"],
        "特斯拉": ["宁德时代", "松下", "LG新能源"],
        "比亚迪": ["宁德时代", "亿纬锂能"],
        "台积电": ["ASML", "应用材料", "科磊"],
    }
    
    # 竞争关系
    COMPETITORS = {
        "英伟达": ["AMD", "Intel"],
        "特斯拉": ["比亚迪", "蔚来", "小鹏"],
        "苹果": ["三星", "华为", "小米"],
        "阿里巴巴": ["京东", "拼多多"],
        "腾讯": ["字节跳动", "网易"],
    }
    
    def extract_entities(self, text: str) -> List[str]:
        """从文本提取实体"""
        entities = []
        all_entities = set(self.SUPPLY_CHAIN.keys()) | set(self.COMPETITORS.keys())
        for key in all_entities:
            for related in self.SUPPLY_CHAIN.get(key, []) + self.COMPETITORS.get(key, []):
                all_entities.add(related)
        
        for entity in all_entities:
            if entity in text:
                entities.append(entity)
        
        return entities
    
    def get_relations(self, entity: str) -> Dict:
        """获取实体的关系网络"""
        return {
            "entity": entity,
            "supply_chain": self.SUPPLY_CHAIN.get(entity, []),
            "competitors": self.COMPETITORS.get(entity, []),
            "upstream": [k for k, v in self.SUPPLY_CHAIN.items() if entity in v]
        }
    
    def expand_query(self, query: str) -> str:
        """基于知识图谱扩展查询"""
        entities = self.extract_entities(query)
        expanded_terms = []
        
        for entity in entities:
            relations = self.get_relations(entity)
            expanded_terms.extend(relations["supply_chain"][:2])
            expanded_terms.extend(relations["competitors"][:1])
        
        if expanded_terms:
            return f"{query} {' '.join(set(expanded_terms))}"
        return query


# ============ Intelligence Agent ============

def create_intelligence_agent(
    llm: Optional[HelloAgentsLLM] = None,
    rag_tool=None,
    enable_graph_rag: bool = True
) -> ReActAgent:
    """创建市场情报侦察兵 Agent
    
    Args:
        llm: LLM 实例
        rag_tool: 可选的 RAG 工具
        enable_graph_rag: 是否启用知识图谱增强
    
    Returns:
        配置好的 ReActAgent 实例
    """
    if llm is None:
        llm = HelloAgentsLLM()
    
    # 创建工具注册表
    tool_registry = ToolRegistry()
    
    # 注册情报工具
    from tools.intelligence_tools import IntelligenceTools
    intel_tool = IntelligenceTools()
    tool_registry.register_tool(intel_tool)
    
    # 注册基金数据工具（用于交叉验证）
    from tools.fund_tools import FundDataTool
    fund_tool = FundDataTool()
    tool_registry.register_tool(fund_tool)
    
    # 注册 RAG 工具
    if rag_tool:
        tool_registry.register_tool(rag_tool)
    
    # 创建 ReActAgent
    agent = ReActAgent(
        name="市场情报侦察兵",
        llm=llm,
        tool_registry=tool_registry,
        custom_prompt=INTELLIGENCE_PROMPT,
        max_steps=8  # 允许更多步骤收集信息
    )
    
    # 附加知识图谱扩展器
    if enable_graph_rag:
        agent._entity_extractor = EntityRelationExtractor()
    
    return agent


class IntelligenceAgentWrapper:
    """情报 Agent 包装器 - 支持预处理和后处理"""
    
    def __init__(self, llm: Optional[HelloAgentsLLM] = None):
        self._agent = create_intelligence_agent(llm)
        self._entity_extractor = EntityRelationExtractor()
    
    def run(self, query: str, expand_with_graph: bool = True) -> str:
        """执行情报分析
        
        Args:
            query: 用户查询
            expand_with_graph: 是否使用知识图谱扩展查询
        
        Returns:
            情报分析报告
        """
        # 预处理：知识图谱扩展
        if expand_with_graph:
            entities = self._entity_extractor.extract_entities(query)
            if entities:
                # 添加关系上下文
                context = []
                for entity in entities[:2]:  # 最多处理2个实体
                    relations = self._entity_extractor.get_relations(entity)
                    if relations["supply_chain"]:
                        context.append(f"{entity}的供应商包括: {', '.join(relations['supply_chain'][:3])}")
                    if relations["competitors"]:
                        context.append(f"{entity}的竞争对手包括: {', '.join(relations['competitors'][:2])}")
                
                if context:
                    query = f"{query}\n\n[知识图谱上下文]\n" + "\n".join(context)
        
        # 执行 Agent
        return self._agent.run(query)
    
    def analyze_entity(self, entity: str) -> Dict:
        """分析特定实体的市场情报"""
        relations = self._entity_extractor.get_relations(entity)
        
        # 搜索实体相关信息
        from tools.intelligence_tools import IntelligenceTools
        intel_tool = IntelligenceTools()
        
        search_result = intel_tool.web_search(entity, limit=3)
        news_result = intel_tool.get_news(entity, limit=3)
        
        return {
            "entity": entity,
            "relations": relations,
            "search": search_result,
            "news": news_result
        }


if __name__ == "__main__":
    # 测试
    wrapper = IntelligenceAgentWrapper()
    
    # 测试实体提取
    print("测试实体关系:")
    extractor = EntityRelationExtractor()
    print(extractor.get_relations("英伟达"))
    
    # 测试查询扩展
    print("\n测试查询扩展:")
    expanded = extractor.expand_query("分析英伟达的投资价值")
    print(expanded)
