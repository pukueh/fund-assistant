"""HelloAgents统一LLM接口 - 基于OpenAI原生API"""

import os
import json
from typing import Literal, Optional, Iterator, AsyncGenerator
from openai import OpenAI, AsyncOpenAI

from .exceptions import HelloAgentsException

# 支持的LLM提供商
SUPPORTED_PROVIDERS = Literal[
    "openai",
    "deepseek",
    "qwen",
    "modelscope",
    "kimi",
    "zhipu",
    "ollama",
    "vllm",
    "local",
    "auto",
    "custom",
]

class HelloAgentsLLM:
    """
    为HelloAgents定制的LLM客户端。
    它用于调用任何兼容OpenAI接口的服务，并默认使用流式响应。
    """

    def __init__(
        self,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        provider: Optional[SUPPORTED_PROVIDERS] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        timeout: Optional[int] = None,
        **kwargs
    ):
        self.model = model or os.getenv("LLM_MODEL_ID")
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.timeout = timeout or int(os.getenv("LLM_TIMEOUT", "60"))
        self.kwargs = kwargs

        requested_provider = (provider or "").lower() if provider else None
        self.provider = provider or self._auto_detect_provider(api_key, base_url)

        if requested_provider == "custom":
            self.provider = "custom"
            self.api_key = api_key or os.getenv("LLM_API_KEY")
            self.base_url = base_url or os.getenv("LLM_BASE_URL")
        else:
            self.api_key, self.base_url = self._resolve_credentials(api_key, base_url)

        if not self.model:
            self.model = self._get_default_model()
        if not all([self.api_key, self.base_url]):
            raise HelloAgentsException("API密钥和服务地址必须被提供或在.env文件中定义。")

        self._client = self._create_client()
        self._async_client = self._create_async_client()

    def _auto_detect_provider(self, api_key: Optional[str], base_url: Optional[str]) -> str:
        # 简化版自动检测
        actual_api_key = api_key or os.getenv("LLM_API_KEY") or ""
        if actual_api_key.startswith("ms-") or "modelscope" in (base_url or "").lower():
            return "modelscope"
        return "openai"

    def _resolve_credentials(self, api_key: Optional[str], base_url: Optional[str]) -> tuple[str, str]:
        actual_api_key = api_key or os.getenv("LLM_API_KEY")
        actual_base_url = base_url or os.getenv("LLM_BASE_URL")
        return actual_api_key, actual_base_url

    def _create_client(self) -> OpenAI:
        return OpenAI(api_key=self.api_key, base_url=self.base_url, timeout=self.timeout)

    def _create_async_client(self) -> AsyncOpenAI:
        return AsyncOpenAI(api_key=self.api_key, base_url=self.base_url, timeout=self.timeout)

    def _get_default_model(self) -> str:
        return "gpt-3.5-turbo"

    def think(self, messages: list[dict[str, str]], temperature: Optional[float] = None) -> Iterator[str]:
        response = self._client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature if temperature is not None else self.temperature,
            max_tokens=self.max_tokens,
            stream=True,
        )
        for chunk in response:
            content = chunk.choices[0].delta.content or ""
            if content:
                yield content

    async def async_think(self, messages: list[dict[str, str]], temperature: Optional[float] = None) -> AsyncGenerator[str, None]:
        response = await self._async_client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature if temperature is not None else self.temperature,
            max_tokens=self.max_tokens,
            stream=True,
        )
        async for chunk in response:
            content = chunk.choices[0].delta.content or ""
            if content:
                yield content

    def invoke(self, messages: list[dict[str, str]], **kwargs) -> str:
        response = self._client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=kwargs.get('temperature', self.temperature),
            max_tokens=kwargs.get('max_tokens', self.max_tokens),
        )
        return response.choices[0].message.content

    def stream_invoke(self, messages: list[dict[str, str]], **kwargs) -> Iterator[str]:
        yield from self.think(messages, kwargs.get('temperature'))
