"""中间件模块 - 全局异常处理和请求处理"""

import time
import traceback
from typing import Callable, Any, Dict
from datetime import datetime

from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class ErrorResponse:
    """统一错误响应格式"""
    
    @staticmethod
    def create(
        status_code: int,
        message: str,
        error_type: str = "error",
        details: Any = None
    ) -> JSONResponse:
        """创建标准错误响应"""
        content = {
            "status": "error",
            "error": {
                "type": error_type,
                "message": message,
                "timestamp": datetime.now().isoformat()
            }
        }
        if details:
            content["error"]["details"] = details
        
        return JSONResponse(status_code=status_code, content=content)


class ExceptionMiddleware(BaseHTTPMiddleware):
    """全局异常处理中间件"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
        except HTTPException as e:
            return ErrorResponse.create(
                status_code=e.status_code,
                message=e.detail,
                error_type="http_error"
            )
        except ValueError as e:
            return ErrorResponse.create(
                status_code=400,
                message=str(e),
                error_type="validation_error"
            )
        except Exception as e:
            # 获取请求 ID（如果可用）
            request_id = getattr(request.state, 'request_id', 'unknown')
            
            # 使用 logging 模块记录错误
            import logging
            logger = logging.getLogger("fund_assistant")
            logger.error(
                f"Unhandled exception | request_id={request_id} | "
                f"path={request.url.path} | method={request.method} | "
                f"error={type(e).__name__}: {e}",
                exc_info=True
            )
            
            # 返回错误响应（包含请求 ID 便于追踪）
            response = ErrorResponse.create(
                status_code=500,
                message="服务器内部错误",
                error_type="internal_error",
                details={"request_id": request_id}
            )
            return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """请求日志中间件"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # 处理请求
        response = await call_next(request)
        
        # 计算耗时
        process_time = time.time() - start_time
        
        # 记录请求日志
        if not request.url.path.startswith("/static"):
            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] "
                f"{request.method} {request.url.path} "
                f"- {response.status_code} "
                f"({process_time*1000:.1f}ms)"
            )
        
        # 添加处理时间头
        response.headers["X-Process-Time"] = f"{process_time:.4f}"
        
        return response


class TimeoutMiddleware(BaseHTTPMiddleware):
    """请求超时中间件 (简化版)"""
    
    def __init__(self, app, timeout_seconds: float = 30.0):
        super().__init__(app)
        self.timeout = timeout_seconds
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 注意: 真正的异步超时需要使用 asyncio.wait_for
        # 这里只是添加超时警告
        start_time = time.time()
        response = await call_next(request)
        elapsed = time.time() - start_time
        
        if elapsed > self.timeout:
            print(f"[WARN] Request to {request.url.path} took {elapsed:.2f}s (timeout: {self.timeout}s)")
        
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """安全响应头中间件"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # 安全响应头
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # CSP - 允许同源资源和必要的外部资源
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://fonts.googleapis.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "font-src 'self' data: https://fonts.gstatic.com; "
            "connect-src 'self' ws: wss:"
        )
        
        return response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """请求 ID 中间件 - 用于请求追踪"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        import uuid
        
        # 生成或使用已有的请求 ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
        
        # 存储到请求状态
        request.state.request_id = request_id
        
        response = await call_next(request)
        
        # 在响应中返回请求 ID
        response.headers["X-Request-ID"] = request_id
        
        return response


def add_middlewares(app):
    """注册所有中间件"""
    # 注意: 中间件的添加顺序会影响执行顺序 (后添加的先执行)
    app.add_middleware(TimeoutMiddleware, timeout_seconds=30.0)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(ExceptionMiddleware)


# API 响应包装器
class APIResponse:
    """统一 API 响应格式"""
    
    @staticmethod
    def success(data: Any = None, message: str = "操作成功") -> dict:
        """成功响应"""
        response = {
            "status": "success",
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        if data is not None:
            response["data"] = data
        return response
    
    @staticmethod
    def error(message: str, error_type: str = "error", details: Any = None) -> dict:
        """错误响应"""
        response = {
            "status": "error",
            "error": {
                "type": error_type,
                "message": message
            },
            "timestamp": datetime.now().isoformat()
        }
        if details:
            response["error"]["details"] = details
        return response
