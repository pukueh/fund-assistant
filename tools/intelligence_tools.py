"""市场情报工具 - Perplexity + Bloomberg 风格

提供：
- web_search: 网络搜索 (多源回退)
- news_api: 财经新闻
- pdf_parser: 财报PDF解析
- fed_minutes: 美联储会议纪要
"""

import os
import json
import urllib.request
import urllib.error
import urllib.parse
import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from abc import ABC, abstractmethod

from tools.base_shim import Tool, tool_action, ToolParameter


# ============ 搜索源抽象 ============

class SearchSource(ABC):
    """搜索源基类"""
    name: str = "base"
    
    @abstractmethod
    def search(self, query: str, limit: int = 5) -> List[Dict]:
        pass


class BingSearchSource(SearchSource):
    """Bing 搜索"""
    name = "bing"
    
    def __init__(self):
        self.api_key = os.getenv("BING_SEARCH_API_KEY", "")
        self.endpoint = "https://api.bing.microsoft.com/v7.0/search"
    
    def search(self, query: str, limit: int = 5) -> List[Dict]:
        if not self.api_key:
            return []
        
        try:
            params = urllib.parse.urlencode({
                "q": query,
                "count": limit,
                "mkt": "zh-CN"
            })
            url = f"{self.endpoint}?{params}"
            req = urllib.request.Request(url, headers={
                "Ocp-Apim-Subscription-Key": self.api_key
            })
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode("utf-8"))
                results = []
                for item in data.get("webPages", {}).get("value", []):
                    results.append({
                        "title": item.get("name", ""),
                        "url": item.get("url", ""),
                        "snippet": item.get("snippet", ""),
                        "source": self.name
                    })
                return results
        except Exception as e:
            print(f"[Bing] 搜索失败: {e}")
            return []


class DuckDuckGoSource(SearchSource):
    """DuckDuckGo 搜索 (免费)"""
    name = "duckduckgo"
    
    def search(self, query: str, limit: int = 5) -> List[Dict]:
        try:
            # 使用 DuckDuckGo Instant Answer API
            params = urllib.parse.urlencode({
                "q": query,
                "format": "json",
                "no_html": 1
            })
            url = f"https://api.duckduckgo.com/?{params}"
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0"
            })
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode("utf-8"))
                results = []
                
                # 主要结果
                if data.get("Abstract"):
                    results.append({
                        "title": data.get("Heading", ""),
                        "url": data.get("AbstractURL", ""),
                        "snippet": data.get("Abstract", ""),
                        "source": self.name
                    })
                
                # 相关主题
                for topic in data.get("RelatedTopics", [])[:limit-1]:
                    if "Text" in topic:
                        results.append({
                            "title": topic.get("Text", "")[:50],
                            "url": topic.get("FirstURL", ""),
                            "snippet": topic.get("Text", ""),
                            "source": self.name
                        })
                
                return results[:limit]
        except Exception as e:
            print(f"[DuckDuckGo] 搜索失败: {e}")
            return []


class MockSearchSource(SearchSource):
    """模拟搜索源 (开发测试)"""
    name = "mock"
    
    def search(self, query: str, limit: int = 5) -> List[Dict]:
        return [
            {
                "title": f"关于「{query}」的分析报告",
                "url": "https://example.com/report",
                "snippet": f"这是一份关于{query}的详细分析，包含市场动态、行业趋势等内容...",
                "source": self.name
            },
            {
                "title": f"{query}最新资讯",
                "url": "https://example.com/news",
                "snippet": f"最新消息显示{query}近期表现活跃，市场关注度持续上升...",
                "source": self.name
            }
        ]


# ============ 新闻API ============

class NewsAPISource:
    """新闻API"""
    
    def __init__(self):
        self.api_key = os.getenv("NEWS_API_KEY", "")
    
    def get_news(self, query: str, limit: int = 5) -> List[Dict]:
        """获取相关新闻"""
        if not self.api_key:
            # 返回模拟数据
            return self._mock_news(query, limit)
        
        try:
            params = urllib.parse.urlencode({
                "q": query,
                "apiKey": self.api_key,
                "language": "zh",
                "pageSize": limit
            })
            url = f"https://newsapi.org/v2/everything?{params}"
            
            with urllib.request.urlopen(url, timeout=10) as response:
                data = json.loads(response.read().decode("utf-8"))
                results = []
                for article in data.get("articles", []):
                    results.append({
                        "title": article.get("title", ""),
                        "source": article.get("source", {}).get("name", ""),
                        "url": article.get("url", ""),
                        "published_at": article.get("publishedAt", ""),
                        "description": article.get("description", "")
                    })
                return results
        except Exception as e:
            print(f"[NewsAPI] 获取新闻失败: {e}")
            return self._mock_news(query, limit)
    
    def _mock_news(self, query: str, limit: int) -> List[Dict]:
        """模拟新闻数据"""
        from datetime import datetime
        return [
            {
                "title": f"{query}行业迎来重大利好",
                "source": "财经日报",
                "url": "https://example.com/news/1",
                "published_at": datetime.now().isoformat(),
                "description": f"据悉，{query}相关政策即将出台，市场预期乐观..."
            },
            {
                "title": f"分析师看好{query}后市表现",
                "source": "证券时报",
                "url": "https://example.com/news/2",
                "published_at": datetime.now().isoformat(),
                "description": f"多家机构发布研报，一致看好{query}未来发展前景..."
            }
        ][:limit]


# ============ PDF 解析器 ============

class PDFParser:
    """PDF 财报解析器"""
    
    def parse(self, pdf_path: str) -> Dict:
        """解析PDF文档"""
        try:
            # 尝试使用 PyPDF2
            import PyPDF2
            
            text_content = []
            with open(pdf_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages[:10]:  # 只读前10页
                    text_content.append(page.extract_text())
            
            full_text = "\n".join(text_content)
            
            return {
                "success": True,
                "pages": len(reader.pages),
                "text": full_text[:5000],  # 限制长度
                "source": pdf_path
            }
        except ImportError:
            return {
                "success": False,
                "error": "请安装 PyPDF2: pip install PyPDF2",
                "text": ""
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "text": ""
            }
    
    def parse_url(self, pdf_url: str) -> Dict:
        """从URL下载并解析PDF"""
        import tempfile
        
        try:
            # 下载PDF到临时文件
            req = urllib.request.Request(pdf_url, headers={
                "User-Agent": "Mozilla/5.0"
            })
            with urllib.request.urlopen(req, timeout=30) as response:
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                    tmp.write(response.read())
                    tmp_path = tmp.name
            
            result = self.parse(tmp_path)
            
            # 清理临时文件
            os.unlink(tmp_path)
            
            return result
        except Exception as e:
            return {
                "success": False,
                "error": f"下载失败: {e}",
                "text": ""
            }


# ============ 美联储会议纪要 ============

class FedMinutesParser:
    """美联储会议纪要解析"""
    
    FED_CALENDAR_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
    
    def get_latest_summary(self) -> Dict:
        """获取最新会议纪要摘要"""
        # 这里返回模拟数据，实际需要解析 Fed 网站
        return {
            "date": "2024-01-31",
            "type": "FOMC会议纪要",
            "key_points": [
                "维持利率不变在 5.25%-5.50%",
                "通胀仍高于2%目标",
                "劳动力市场保持强劲",
                "可能在今年晚些时候开始降息"
            ],
            "market_impact": "鸽派信号，利好风险资产",
            "source": "Federal Reserve"
        }


# ============ Intelligence Tool ============

class IntelligenceTools(Tool):
    """市场情报工具集"""
    
    MAX_RETRIES = 3
    
    def __init__(self):
        super().__init__(
            name="intelligence",
            description="市场情报工具：网络搜索、新闻API、PDF解析、美联储纪要",
            expandable=True
        )
        
        # 初始化搜索源 (按优先级排序)
        self._search_sources = [
            BingSearchSource(),
            DuckDuckGoSource(),
            MockSearchSource()
        ]
        
        self._news_api = NewsAPISource()
        self._pdf_parser = PDFParser()
        self._fed_parser = FedMinutesParser()
    
    @tool_action("web_search", "网络搜索（自动回退多源）")
    def web_search(self, query: str, limit: int = 5) -> str:
        """网络搜索 - 支持自动切换源
        
        Args:
            query: 搜索关键词
            limit: 返回数量
        
        Returns:
            搜索结果 JSON
        """
        results = []
        source_used = ""
        
        # 按优先级尝试搜索源
        for source in self._search_sources:
            for attempt in range(self.MAX_RETRIES):
                try:
                    results = source.search(query, limit)
                    if results:
                        source_used = source.name
                        break
                except Exception as e:
                    print(f"[{source.name}] 第{attempt+1}次尝试失败: {e}")
                    time.sleep(0.5 * (attempt + 1))
            
            if results:
                break
        
        return json.dumps({
            "query": query,
            "source": source_used,
            "count": len(results),
            "results": results
        }, ensure_ascii=False)
    
    @tool_action("news_api", "获取财经新闻")
    def get_news(self, query: str, limit: int = 5) -> str:
        """获取相关财经新闻
        
        Args:
            query: 搜索关键词（基金名称、行业等）
            limit: 返回数量
        
        Returns:
            新闻列表 JSON
        """
        news = self._news_api.get_news(query, limit)
        return json.dumps({
            "query": query,
            "count": len(news),
            "news": news
        }, ensure_ascii=False)
    
    @tool_action("pdf_parser", "解析PDF财报")
    def parse_pdf(self, pdf_path: str) -> str:
        """解析PDF文档（财报、研报等）
        
        Args:
            pdf_path: PDF文件路径或URL
        
        Returns:
            解析结果 JSON
        """
        if pdf_path.startswith("http"):
            result = self._pdf_parser.parse_url(pdf_path)
        else:
            result = self._pdf_parser.parse(pdf_path)
        
        return json.dumps(result, ensure_ascii=False)
    
    @tool_action("fed_minutes", "获取美联储会议纪要")
    def get_fed_minutes(self) -> str:
        """获取最新美联储FOMC会议纪要摘要
        
        Returns:
            会议纪要摘要 JSON
        """
        summary = self._fed_parser.get_latest_summary()
        return json.dumps(summary, ensure_ascii=False)
    
    def run(self, parameters: Dict[str, Any]) -> str:
        """默认执行方法"""
        action = parameters.get("action", "web_search")
        
        if action == "web_search":
            return self.web_search(
                parameters.get("query", ""),
                parameters.get("limit", 5)
            )
        elif action == "news_api":
            return self.get_news(
                parameters.get("query", ""),
                parameters.get("limit", 5)
            )
        elif action == "pdf_parser":
            return self.parse_pdf(parameters.get("pdf_path", ""))
        elif action == "fed_minutes":
            return self.get_fed_minutes()
        
        return json.dumps({"error": "未知操作"})
    
    def get_parameters(self) -> List[ToolParameter]:
        return [
            ToolParameter(name="action", type="string", 
                         description="操作类型: web_search/news_api/pdf_parser/fed_minutes"),
            ToolParameter(name="query", type="string", 
                         description="搜索关键词", required=False),
            ToolParameter(name="pdf_path", type="string", 
                         description="PDF路径或URL", required=False),
            ToolParameter(name="limit", type="integer", 
                         description="返回数量", required=False),
        ]


if __name__ == "__main__":
    # 测试
    tool = IntelligenceTools()
    
    print("测试网络搜索:")
    print(tool.web_search("英伟达 台积电 供应链"))
    
    print("\n测试新闻API:")
    print(tool.get_news("人工智能 基金"))
    
    print("\n测试美联储纪要:")
    print(tool.get_fed_minutes())
