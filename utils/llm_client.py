"""
LLM Client - 统一的大语言模型调用接口
支持 OpenAI、DeepSeek、通义千问等多个供应商
"""
import os
import asyncio
from typing import List, Dict, Optional, Any
from enum import Enum


class LLMProvider(Enum):
    """LLM 供应商枚举"""
    OPENAI = "openai"
    DEEPSEEK = "deepseek"
    QWEN = "qwen"  # 通义千问


class LLMClient:
    """统一的 LLM 客户端"""
    
    def __init__(self, provider: str = None):
        """
        初始化 LLM 客户端
        
        Args:
            provider: LLM 供应商 (openai/deepseek/qwen)，
                     如果不指定则从环境变量 LLM_PROVIDER 读取
        """
        self.provider = provider or os.getenv("LLM_PROVIDER", "openai")
        self.api_key = os.getenv("LLM_API_KEY")
        self.base_url = os.getenv("LLM_BASE_URL")
        self.model = os.getenv("LLM_MODEL_ID", self._get_default_model())
        
        if not self.api_key:
            raise ValueError("LLM_API_KEY not found in environment variables")
        
        # 初始化对应的客户端
        self._init_client()
    
    def _get_default_model(self) -> str:
        """获取默认模型"""
        defaults = {
            "openai": "gpt-4o-mini",
            "deepseek": "deepseek-chat",
            "qwen": "qwen-plus"
        }
        return defaults.get(self.provider, "gpt-4o-mini")
    
    def _init_client(self):
        """初始化具体的客户端"""
        try:
            if self.provider == "openai":
                from openai import AsyncOpenAI
                self.client = AsyncOpenAI(
                    api_key=self.api_key,
                    base_url=self.base_url
                )
            elif self.provider == "deepseek":
                from openai import AsyncOpenAI  # DeepSeek 兼容 OpenAI SDK
                self.client = AsyncOpenAI(
                    api_key=self.api_key,
                    base_url=self.base_url or "https://api.deepseek.com"
                )
            elif self.provider == "qwen":
                from openai import AsyncOpenAI  # 通义千问也兼容 OpenAI SDK
                self.client = AsyncOpenAI(
                    api_key=self.api_key,
                    base_url=self.base_url or "https://dashscope.aliyuncs.com/compatible-mode/v1"
                )
            else:
                raise ValueError(f"Unsupported LLM provider: {self.provider}")
        except ImportError:
            raise ImportError("Please install openai: pip install openai>=1.0.0")
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> str:
        """
        发送聊天请求
        
        Args:
            messages: 消息列表，格式: [{"role": "user", "content": "..."}]
            temperature: 温度参数 (0-1)
            max_tokens: 最大生成 token 数
            **kwargs: 其他参数
        
        Returns:
            LLM 生成的回复文本
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"LLM API Error: {e}")
            return f"[LLM调用失败: {str(e)}]"
    
    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ):
        """
        流式聊天请求（生成器）
        
        适用于需要实时显示生成过程的场景
        """
        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
                **kwargs
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            yield f"[LLM流式调用失败: {str(e)}]"


# 全局 LLM 客户端实例（懒加载）
_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """获取全局 LLM 客户端实例"""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client
