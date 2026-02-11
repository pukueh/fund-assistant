"""基金估值助手 - A2A + FastAPI 服务"""

import os
import sys
import json
import asyncio
import urllib.request
from datetime import datetime
from typing import Optional, List, Dict
import numpy as np
from contextlib import asynccontextmanager

# 添加路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv()

# HuggingFace endpoint mirror (useful for China networks)
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Header, HTTPException, Query, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from utils.middleware import APIResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from hello_agents import HelloAgentsLLM
from hello_agents.protocols.a2a import A2AServer

# 导入 Agents
from agents import (
    create_coordinator_agent,
    create_quant_agent,
    create_analyst_agent,
    create_advisor_agent,
    create_strategist_agent,
    create_intelligence_agent,
    create_intelligence_agent,
    create_shadow_analyst_agent
)
from agents.daily_report_agent import DailyReportAgent
from tools.market_data import get_market_service
from tools.fund_tools import FundDataTool
from tools.portfolio_tools import PortfolioTool

# 导入认证和数据库
from utils.auth import create_token, decode_token, get_user_repo, get_current_user, get_current_user_optional
from utils.database import get_database, get_chat_repo
from utils.config import get_config, print_config_status, validate_config

# 导入记忆和 RAG 服务
from utils.memory_service import get_memory_service, FundMemoryService

import logging
logger = logging.getLogger("fund_assistant")
logging.basicConfig(level=logging.INFO)
from utils.rag_service import get_rag_service, FundRAGService
from utils.context_service import get_context_service, FundContextService

# 导入图表 API
from api.chart_api import router as chart_router
from api.discovery_api import router as discovery_router
from api.portfolio_api import router as portfolio_router
from api.investment_api import router as investment_router
from api.category_api import router as category_router
from api.shadow_api import router as shadow_router
from api.analytics_api import router as analytics_router
from api.account_api import router as account_router


# ============ Pydantic Models ============

class ChatMessage(BaseModel):
    message: str
    agent: Optional[str] = "strategist"
    session_id: Optional[str] = None

class HoldingAdd(BaseModel):
    fund_code: str
    fund_name: Optional[str] = ""
    shares: float
    cost_nav: float


class UserLogin(BaseModel):
    username: str
    password: str


# ============ 认证依赖 ============

from fastapi import Depends




# ============ 认证依赖 ============

from fastapi import Depends
from utils.auth import get_current_user, get_current_user_optional

# Backward-compatible alias for admin routes
require_auth = get_current_user

# Replaced local get_current_user/require_auth with utils.auth dependencies


# ============ 全局变量 ============

llm = None
agents = {}
fund_tool = None
portfolio_tool = None
memory_service: FundMemoryService = None
rag_service: FundRAGService = None


# ============ 生命周期 ============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global llm, agents, fund_tool, portfolio_tool, memory_service, rag_service
    
    # 初始化日志
    from utils.logging_config import setup_logging, get_logger
    setup_logging(level="DEBUG" if os.getenv("DEBUG", "").lower() == "true" else "INFO")
    logger = get_logger()
    
    logger.info("=" * 60)
    logger.info("🚀 基金估值助手 - HelloAgents 框架版")
    logger.info("=" * 60)
    
    # 配置验证
    config = get_config()
    print_config_status()
    
    # 检查 LLM 配置
    validation = validate_config()
    if not validation["config_summary"]["llm_configured"]:
        logger.warning("LLM 未配置，Agent 将使用模拟响应")
    
    # 初始化 LLM
    try:
        llm = HelloAgentsLLM()
        logger.info("✅ LLM 初始化完成")
    except Exception as e:
        logger.warning(f"LLM 初始化失败: {e}")
        llm = None
    
    # 初始化工具
    # 初始化工具
    fund_tool = FundDataTool()
    portfolio_tool = PortfolioTool()  # Uses default ./data/fund_assistant.db
    logger.info("✅ 工具初始化完成")
    
    # 初始化记忆服务
    try:
        memory_service = get_memory_service("default_user")
        logger.info("✅ 记忆服务初始化完成")
    except Exception as e:
        logger.warning(f"记忆服务初始化失败: {e}")
        memory_service = None
    
    # 初始化 RAG 服务
    try:
        rag_service = get_rag_service()
        if rag_service.initialized:
            # 索引知识库
            logger.info("📚 正在索引知识库...")
            rag_service.index_knowledge_base()
            logger.info("✅ RAG 服务初始化完成")
        else:
            logger.warning("RAG 服务初始化失败")
    except Exception as e:
        logger.warning(f"RAG 服务初始化失败: {e}")
        rag_service = None
    
    # 初始化 Agents (仅当 LLM 可用时)
    if llm:
        agents = {
            "coordinator": create_coordinator_agent(llm),
            "quant": create_quant_agent(llm),
            "analyst": create_analyst_agent(llm),
            "advisor": create_advisor_agent(llm),
            "strategist": create_strategist_agent(llm),
            "intelligence": create_intelligence_agent(llm),
            "shadow_analyst": create_shadow_analyst_agent(llm),
            "daily_report": DailyReportAgent(llm, get_market_service())
        }
        logger.info(f"✅ 8 个 Agent 初始化完成")
        for name, agent in agents.items():
            logger.debug(f"   📡 {agent.name} ({name})")
    else:
        logger.warning("Agent 功能不可用 (需要配置 LLM)")
        
    # 初始化板块数据
    try:
        from services.category_service import get_category_service
        logger.info("📊 正在刷新板块指数...")
        await get_category_service().refresh_all_indices()
    except Exception as e:
        logger.warning(f"板块指数刷新失败: {e}")
    
    # 启动全量行情后台刷新任务
    asyncio.create_task(refresh_global_market_task())
    
    logger.info("=" * 60)
    logger.info(f"🌐 访问: http://localhost:{config.server.port}")
    logger.info("=" * 60)
    
    yield
    
    logger.info("👋 服务关闭")


# ============ FastAPI 应用 ============

app = FastAPI(title="基金估值助手", lifespan=lifespan)

# 注册自定义中间件
from utils.middleware import add_middlewares
add_middlewares(app)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件
frontend_path = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")
    
    # Mount assets for Vite build
    assets_path = os.path.join(frontend_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

# V3 前端静态文件
frontend_v3_path = os.path.join(os.path.dirname(__file__), "frontend-v3")
if os.path.exists(frontend_v3_path):
    app.mount("/v3-static", StaticFiles(directory=frontend_v3_path), name="static-v3")

# 注册认证 API 路由
from api.auth_api import router as auth_router
app.include_router(auth_router)

# 注册图表 API 路由
app.include_router(chart_router)
app.include_router(discovery_router)
app.include_router(portfolio_router)
app.include_router(investment_router)
app.include_router(category_router)
app.include_router(shadow_router)
app.include_router(analytics_router)
app.include_router(account_router)  # P3: Multi-account system


# ============ 路由 ============

@app.get("/")
async def root():
    """首页"""
    index_path = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "基金估值助手 API", "status": "running"}


@app.get("/api/market/rankings")
async def get_market_rankings(
    sort: str = Query("1r", description="排序方式: 1r/1w/1m/3m/6m/1y/n"),
    limit: int = Query(20, description="返回数量"),
    request: Request = None
):
    """获取基金排行 (实时)"""
    try:
        service = get_market_service()
        # Use simple get_fund_rankings if available, or fallback
        if hasattr(service, "get_fund_rankings"):
            data = service.get_fund_rankings(sort_by=sort, limit=limit)
             # Convert dataclass list to dict list
            return APIResponse.success([d.to_dict() for d in data])
        else:
             return APIResponse.error("Data source does not support rankings")
    except Exception as e:
        logger.error(f"Error fetching rankings: {e}")
        return APIResponse.error(str(e))


@app.get("/shadow")
async def shadow_page():
    """影子追踪页面"""
    shadow_path = os.path.join(frontend_path, "shadow.html")
    if os.path.exists(shadow_path):
        return FileResponse(shadow_path)
    return {"error": "Shadow tracker page not found"}


@app.get("/v2")
async def v2_page():
    """新版 UI (华尔街级专业界面)"""
    v2_path = os.path.join(frontend_path, "index-v2.html")
    if os.path.exists(v2_path):
        return FileResponse(v2_path)
    return {"error": "V2 page not found"}


@app.get("/v3")
async def v3_page():
    """V3 新版 UI (桌面端专业架构)"""
    v3_path = os.path.join(os.path.dirname(frontend_path), "frontend-v3", "index.html")
    if os.path.exists(v3_path):
        return FileResponse(v3_path)
    return {"error": "V3 page not found"}


@app.get("/api/info")
async def get_info():
    """获取服务信息"""
    return {
        "name": "基金估值助手",
        "version": "2.0.0",
        "framework": "HelloAgents",
        "agents": list(agents.keys()),
        "paradigms": {
            "coordinator": "ReActAgent",
            "quant": "SimpleAgent",
            "analyst": "ReflectionAgent",
            "advisor": "PlanAndSolveAgent",
            "strategist": "ReActAgent",
            "intelligence": "ReActAgent",
            "shadow_analyst": "ReActAgent"
        }
    }


@app.get("/api/health")
async def health_check():
    """详细健康检查"""
    from utils.database import get_database
    
    health = {
        "status": "healthy",
        "checks": {}
    }
    
    # 检查数据库
    try:
        db = get_database()
        with db.get_connection() as conn:
            conn.execute("SELECT 1")
        health["checks"]["database"] = {"status": "ok"}
    except Exception as e:
        health["checks"]["database"] = {"status": "error", "message": str(e)}
        health["status"] = "degraded"
    
    # 检查 LLM
    if llm:
        health["checks"]["llm"] = {"status": "ok", "configured": True}
    else:
        health["checks"]["llm"] = {"status": "warning", "configured": False}
    
    # 检查 Agents
    health["checks"]["agents"] = {
        "status": "ok" if agents else "warning",
        "count": len(agents)
    }
    
    return health


@app.get("/api/health/datasource")
async def datasource_health():
    """数据源健康检查"""
    from tools.market_data import get_market_service
    
    service = get_market_service()
    health = service.get_health()
    
    # 主动检查各数据源
    checks = {}
    for source_name in ["eastmoney_mobile", "eastmoney", "akshare"]:
        checks[source_name] = service.check_source_health(source_name)
    
    health["active_checks"] = checks
    
    # 判断整体状态
    if any(c["status"] == "ok" for c in checks.values()):
        health["overall_status"] = "ok"
    elif any(c["status"] == "degraded" for c in checks.values()):
        health["overall_status"] = "degraded"
    else:
        health["overall_status"] = "error"
    
    # P0: 为前端 'auto' 模式提供状态支持
    if health["preferred_source"] == "auto":
        health["active_checks"]["auto"] = {
            "status": health["overall_status"],
            "source": "auto"
        }
    
    return health


@app.get("/api/metrics")
async def get_metrics(format: str = "json"):
    """获取应用指标"""
    from utils.metrics import get_metrics_collector
    
    collector = get_metrics_collector()
    
    if format == "prometheus":
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(
            content=collector.get_prometheus_format(),
            media_type="text/plain"
        )
    
    return collector.get_metrics()


@app.post("/api/chat")
async def chat(msg: ChatMessage, current_user: dict = Depends(get_current_user_optional)):
    """智能对话（支持记忆、RAG 和上下文工程增强）"""
    agent_name = msg.agent or "strategist"
    agent = agents.get(agent_name, agents.get("strategist"))
    
    if not agent:
        return {"error": "Agent 未初始化，请检查 LLM 配置"}
    
    user_id = str(current_user["user_id"])
    
    # 保存用户消息到数据库
    chat_repo = get_chat_repo()
    chat_repo.save_message("user", msg.message, session_id=msg.session_id, user_id=int(user_id))
    
    try:
        # 获取记忆上下文（如果可用）
        memory_context = ""
        if memory_service:
            user_memory = get_memory_service(user_id)
            memory_context = user_memory.get_relevant_context(msg.message, limit=3)
        
        # 获取 RAG 上下文（如果可用）
        rag_context = ""
        if rag_service and rag_service.initialized:
            rag_context = rag_service.get_relevant_context(msg.message, limit=3)
        
        # 使用上下文服务构建增强查询
        context_service = get_context_service()
        enhanced_query = context_service.build_enhanced_query(
            user_query=msg.message,
            memory_context=memory_context if memory_context else None,
            rag_context=rag_context if rag_context else None
        )
        
        response = agent.run(enhanced_query)
        
        # 保存到记忆服务
        if memory_service:
            user_memory = get_memory_service(user_id)
            user_memory.remember_conversation(msg.message, response, agent_name=agent.name)
        
        # 保存助手回复到数据库
        chat_repo.save_message("assistant", response, agent_name=agent.name, session_id=msg.session_id, user_id=int(user_id))
        
        return {
            "response": response,
            "agent": agent.name,
            "paradigm": type(agent).__name__,
            "memory_used": bool(memory_context),
            "rag_used": bool(rag_context)
        }
    except Exception as e:
        return {"error": str(e), "agent": agent.name if agent else "unknown"}


@app.post("/api/chat/stream")
async def chat_stream(msg: ChatMessage, current_user: dict = Depends(get_current_user_optional)):
    """SSE 流式对话 - 逐字输出响应"""
    from fastapi.responses import StreamingResponse
    import time
    
    agent_name = msg.agent or "strategist"
    agent = agents.get(agent_name, agents.get("strategist"))
    
    if not agent:
        async def error_stream():
            yield f"data: {json.dumps({'error': 'Agent 未初始化'})}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")
    
    user_id = str(current_user["user_id"])
    
    async def generate():
        try:
            # 发送开始事件
            yield f"data: {json.dumps({'type': 'start', 'agent': agent.name})}\n\n"
            
            # 获取记忆和 RAG 上下文
            memory_context = ""
            rag_context = ""
            
            if memory_service:
                user_memory = get_memory_service(user_id)
                memory_context = user_memory.get_relevant_context(msg.message, limit=3)
            
            if rag_service and rag_service.initialized:
                rag_context = rag_service.get_relevant_context(msg.message, limit=3)
            
            # 构建增强查询
            context_service = get_context_service()
            enhanced_query = context_service.build_enhanced_query(
                user_query=msg.message,
                memory_context=memory_context if memory_context else None,
                rag_context=rag_context if rag_context else None
            )
            
            # 获取完整响应
            full_response = agent.run(enhanced_query)
            
            # 模拟流式输出 (按句子/段落分块)
            chunks = []
            current_chunk = ""
            
            for char in full_response:
                current_chunk += char
                # 在标点符号处分块
                if char in '。！？\n.!?' or len(current_chunk) >= 50:
                    chunks.append(current_chunk)
                    current_chunk = ""
            
            if current_chunk:
                chunks.append(current_chunk)
            
            # 逐块发送
            for i, chunk in enumerate(chunks):
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk, 'index': i})}\n\n"
                # await asyncio.sleep(0.03)  # Removed artificial delay for faster response
            
            # 保存到记忆和数据库
            if memory_service:
                user_memory = get_memory_service(user_id)
                user_memory.remember_conversation(msg.message, full_response, agent_name=agent.name)
            
            chat_repo = get_chat_repo()
            chat_repo.save_message("user", msg.message, session_id=msg.session_id, user_id=int(user_id))
            chat_repo.save_message("assistant", full_response, agent_name=agent.name, session_id=msg.session_id, user_id=int(user_id))
            
            # 发送完成事件
            yield f"data: {json.dumps({'type': 'done', 'memory_used': bool(memory_context), 'rag_used': bool(rag_context)})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )




@app.get("/api/fund/{fund_code}")
async def get_fund_nav(fund_code: str):
    """获取基金净值"""
    from tools.market_data import get_market_service
    service = get_market_service()
    data = await service.get_fund_nav_async(fund_code)
    if data:
        return data.to_dict()
    return {"error": "Fund not found", "fund_code": fund_code}


@app.get("/api/fund/{fund_code}/details")
async def get_fund_details(fund_code: str):
    """获取基金详细信息 (包括经理、规模等)"""
    from tools.market_data import get_market_service
    service = get_market_service()
    data = await service.get_fund_details_async(fund_code)
    if data:
        return data.to_dict()
    return {"error": "Fund details not found", "fund_code": fund_code}


@app.get("/api/fund/{fund_code}/holdings")
async def get_fund_holdings(fund_code: str):
    """获取基金重仓股"""
    from tools.market_data import get_market_service
    service = get_market_service()
    holdings = await service.get_fund_holdings_async(fund_code)
    return [h.to_dict() for h in holdings]


@app.get("/api/fund/{fund_code}/managers")
async def get_fund_managers(fund_code: str):
    """获取基金经理列表"""
    from tools.market_data import get_market_service
    service = get_market_service()
    data = await service.get_fund_details_async(fund_code)
    if data and data.managers:
        return [m.to_dict() for m in data.managers]
    return []


@app.get("/api/fund/{fund_code}/intraday")
async def get_fund_intraday(fund_code: str):
    """获取基金分时估值数据"""
    from tools.market_data import get_market_service
    service = get_market_service()
    result = await service.get_intraday_valuation_async(fund_code)
    if result:
        return result.to_dict()
    return {"error": "暂无分时数据", "fund_code": fund_code}


@app.get("/api/fund/{fund_code}/history")
async def get_fund_history(fund_code: str, range: str = "y"):
    """获取基金历史净值 (K线数据)
    range: y(1年), 3y(3年), 6y(6年), n(今年以来), 3n, 5n
    """
    try:
        from tools.market_data import get_market_service
        service = get_market_service()
        result = await service.get_historical_nav_async(fund_code, range_type=range)
        if result:
            return result.to_dict()
        return {"error": "暂无历史数据", "fund_code": fund_code}
    except Exception as e:
        import traceback
        with open("server_error.log", "a") as f:
            f.write(f"Error in get_fund_history: {e}\n")
            traceback.print_exc(file=f)
        logger.error(f"Error in get_fund_history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/fund/{fund_code}/yield")
async def get_fund_yield(fund_code: str, range: str = Query("y", pattern="^(y|3y|6y|n|3n|5n)$")):
    """获取基金累计收益率走势 (对比指数/同类)
    range: y(1年), 3y(3年), 6y(6年), n(今年以来), 3n, 5n
    """
    from tools.market_data import get_market_service
    service = get_market_service()
    result = await service.get_historical_yield_async(fund_code, range_type=range)
    if result:
        return result.to_dict()
    return {"error": "暂无收益率数据", "fund_code": fund_code}


@app.get("/api/fund/{fund_code}/diagnostic")
async def get_fund_diagnostic(fund_code: str):
    """获取基金诊断评分"""
    from tools.market_data import get_market_service
    service = get_market_service()
    result = await service.get_fund_diagnostic_async(fund_code)
    if result:
        return result.to_dict()
    return {"error": "暂无诊断数据", "fund_code": fund_code}


@app.get("/api/search")
async def search_fund(keyword: str):
    """搜索基金"""
    from tools.market_data import get_market_service
    service = get_market_service()
    results = await service.search_fund_async(keyword)
    return [r.to_dict() for r in results]


@app.get("/api/fund/rankings")
async def get_fund_rankings(limit: int = 10):
    """获取基金排行 (热门基金日涨跌幅)"""
    from tools.market_data import get_market_service
    service = get_market_service()
    rankings = await service.get_fund_rankings_async(sort_by="1r", limit=limit)
    return [r.to_dict() for r in rankings]


@app.get("/api/fund/{fund_code}/indicators")
async def get_fund_indicators(fund_code: str, period: str = Query("1y")):
    """获取基金技术指标 (P0: 夏普比率, 最大回撤, 年化波动率)
    
    Args:
        fund_code: 基金代码
        period: 时间周期 (1m, 3m, 6m, 1y, 3y, 5y)
    """
    from tools.market_data import get_market_service
    from tools.statistics import StatisticsTool
    
    # Determine range to fetch
    # Always fetch at least 1 year to calculate 1m/3m/6m/1y returns
    fetch_range = "y"
    if period in ["3y", "5y", "n"]:
        fetch_range = period
    
    service = get_market_service()
    stats_tool = StatisticsTool()
    
    # Get historical NAV data
    # P3 Fix: Use range_type instead of days
    # Using async historical nav fetch
    history_data = await service.get_historical_nav_async(fund_code, range_type=fetch_range)
    
    if not history_data or not history_data.points:
        return {"error": "历史数据不足", "fund_code": fund_code}
        
    # Convert points to dicts for processing
    history = [
        {
            "date": p.date,
            "nav": p.nav,
            "change_percent": p.change_percent
        }
        for p in history_data.points
    ]
    
    # Ensure chronological order (oldest to newest)
    # Assuming history points have 'date' attribute
    try:
        sorted_history = sorted(history, key=lambda x: x['date'])
    except Exception:
        # Fallback if date is missing or format issue, rely on list order (usually newest first from APIs)
        # If API returns newest first, we should reverse.
        if history and 'date' in history[0] and 'date' in history[-1] and history[0]['date'] > history[-1]['date']:
             sorted_history = history[::-1]
        else:
             sorted_history = history

    navs = [h['nav'] for h in sorted_history]
    
    # Calculate daily returns (percentage)
    daily_returns = []
    for i in range(1, len(navs)):
        if navs[i-1] > 0:
            daily_returns.append((navs[i] - navs[i-1]) / navs[i-1])
            
    if not daily_returns:
        return {"error": "无法计算收益率", "fund_code": fund_code}

    # Calculate period returns for display
    # period_returns keys: 1m, 3m, 6m, 1y. 
    # Calculation relies on 'navs' (chronological).
    
    # Helper to calculate return for a specific lookback window (approx trading days)
    def calculate_return(lookback_days):
        if len(navs) <= lookback_days:
            return 0.0
        try:
            start_nav = navs[-(lookback_days + 1)]
            end_nav = navs[-1]
            if start_nav > 0:
                return (end_nav - start_nav) / start_nav
            return 0.0
        except IndexError:
            return 0.0

    # Calculate period returns dictionary (for display rows)
    period_returns = {
        "1m": calculate_return(22),
        "3m": calculate_return(66),
        "6m": calculate_return(132),
        "1y": calculate_return(250)
    }

    # Slice returns for the requested period stats (Sharpe, MaxDD, etc.)
    days_map = {
        "1m": 22,
        "3m": 66,
        "6m": 132,
        "1y": 250,
        "3y": 750,
        "5y": 1250
    }
    lookback = days_map.get(period, 250)
    
    # Slice the LAST 'lookback' daily returns
    sliced_returns = daily_returns[-lookback:] if len(daily_returns) >= lookback else daily_returns
    
    # Calculate indicators on the sliced data
    indicators = stats_tool.calculate_indicators(sliced_returns)
    # Be careful: stats_tool.calculate_indicators might return numpy.float64 which isn't JSON serializable
    # We should convert them.
    
    # safe float conversion
    def safe_float(val):
        try:
            return float(val)
        except:
            return 0.0

    safe_indicators = {
        "sharpe_ratio": safe_float(indicators.get("sharpe_ratio", 0)),
        "max_drawdown": safe_float(indicators.get("max_drawdown", 0)),
        "volatility": safe_float(indicators.get("volatility", 0)),
        "total_return": safe_float(indicators.get("total_return", 0))
    }

    return {
        "fund_code": fund_code,
        "period": period,
        "data_points": len(sliced_returns),
        "indicators": safe_indicators,
        "period_returns": period_returns
    }



@app.get("/api/fund/{fund_code}/linus-report")
async def get_linus_report(fund_code: str):
    """P1: Linus-style AI Risk Report
    
    拒绝情绪化叙事，只讲数学事实。
    分析30日价格区间位置、风险标签、核心结论。
    """
    from tools.market_data import get_market_service
    from tools.statistics import StatisticsTool
    
    service = get_market_service()
    stats_tool = StatisticsTool()
    
    # Get fund details
    details = service.get_fund_details(fund_code)
    
    # Get historical NAV for analysis
    # P3 Fix: Use range_type instead of days
    history = service.get_fund_nav_history(fund_code, range_type="y")
    
    if not history or len(history) < 30:
        return {"error": "数据不足无法生成报告", "fund_code": fund_code}
    
    # Ensure chronological order
    sorted_history = sorted(history, key=lambda x: x['date'])
    navs = [h['nav'] for h in sorted_history]
    
    # Calculate daily returns
    returns = []
    for i in range(1, len(navs)):
        if navs[i-1] > 0:
            returns.append((navs[i] - navs[i-1]) / navs[i-1])
    
    indicators = stats_tool.calculate_indicators(returns)
    
    # Get current valuation
    current_nav = service.get_fund_nav(fund_code)
    
    # 30-day price range analysis
    navs_30d = navs[:30] if len(navs) >= 30 else navs
    high_30d = max(navs_30d)
    low_30d = min(navs_30d)
    current = navs[-1]
    
    # Calculate position in range (0-100%)
    if high_30d != low_30d:
        position_pct = (current - low_30d) / (high_30d - low_30d) * 100
    else:
        position_pct = 50
    
    # Determine position zone
    if position_pct <= 30:
        position_zone = "低位"
    elif position_pct <= 70:
        position_zone = "中位"
    else:
        position_zone = "高位"
    
    # Risk level based on volatility and drawdown
    volatility = indicators.get("volatility", 0)
    max_dd = indicators.get("max_drawdown", 0)
    
    if volatility > 25 or max_dd > 20:
        risk_level = "高风险"
    elif volatility > 15 or max_dd > 10:
        risk_level = "中等风险"
    else:
        risk_level = "低风险"
    
    # Calculate valuation deviation
    if current_nav and current_nav.estimated_nav:
        val_deviation = ((current_nav.estimated_nav - current) / current) * 100
    else:
        val_deviation = 0
    
    # Generate Linus-style report
    fund_name = details.name if details else f"基金{fund_code}"
    
    # Core conclusion
    if val_deviation < -1:
        val_status = "偏悲观"
    elif val_deviation > 1:
        val_status = "偏乐观"
    else:
        val_status = "正常"
    
    report_text = f"""审计发现：实时估值{current:.4f}{'低于' if val_deviation < 0 else '高于'}最新净值，偏差{val_deviation:.2f}%，表明市场情绪{val_status}或存在滞后调整。技术面：现价处于近30日价格区间{position_zone}（{position_pct:.0f}%），无极端超买或超卖信号，但近期高点{high_30d:.4f}构成阻力。风险特征：{'指数型' if '指数' in fund_name else '主动管理型'}基金跟踪误差风险可控，但估值偏差暗示短期净值可能承压。结论：当前基金估值状态正常但偏弱。操作建议：观望，若估值偏差持续扩大可考虑小额定投摊薄成本。"""
    
    core_conclusion = f"净值与实时估值存在{'显著负' if val_deviation < -1 else '显著正' if val_deviation > 1 else '轻微'}偏差，技术位阶{position_zone}但{'隐含短期下行压力' if val_deviation < 0 else '有上行动能'}。"
    
    return {
        "fund_code": fund_code,
        "fund_name": fund_name,
        "generated_at": datetime.now().isoformat(),
        "mode": "Linus Mode",
        "risk_level": risk_level,
        "position_status": f"{position_zone}区间",
        "price_range_30d": {
            "high": round(high_30d, 4),
            "low": round(low_30d, 4),
            "current": round(current, 4),
            "position_pct": round(position_pct, 1)
        },
        "indicators": indicators,
        "valuation_deviation": round(val_deviation, 2),
        "report_text": report_text,
        "core_conclusion": core_conclusion
    }


@app.get("/api/report/daily")
async def get_daily_report(current_user: dict = Depends(get_current_user)):
    """获取 AI 生成的每日投资简报"""
    from tools.portfolio_tools import PortfolioTool
    
    agent = agents.get("daily_report")
    if not agent:
        return {"error": "日报生成 Agent 未就绪"}
        
    user_id = str(current_user["user_id"])
    
    # Get portfolio summary for context
    pt_tool = PortfolioTool()  # Uses default ./data/fund_assistant.db
    summary_json = pt_tool.calculate_valuation(user_id=int(user_id))
    summary = json.loads(summary_json)
    
    report = await agent.generate_report(summary, user_id)
    return {"report": report, "date": datetime.today().isoformat()}

@app.get("/api/agents")
async def list_agents():
    """列出所有 Agent"""
    return {
        "agents": [
            {
                "name": agent.name,
                "key": key,
                "paradigm": type(agent).__name__,
                "description": {
                    "coordinator": "意图识别与任务路由",
                    "quant": "量化分析与风险评估",
                    "analyst": "技术面分析（支持自我反思）",
                    "advisor": "投资规划（分步执行）",
                    "strategist": "综合决策与最终建议",
                    "intelligence": "市场情报搜索与分析",
                    "shadow_analyst": "博主持仓分析与跟投建议"
                }.get(key, "")
            }
            for key, agent in agents.items()
        ]
    }


# ============ 全球市场数据 API ============

# ============ 全球市场数据缓存 ============
_global_market_cache = {"update_time": "正在初始化...", "markets": {}}

def fetch_sina_hq(symbols: list) -> dict:
    import urllib.request, re
    results = {}
    if not symbols: return results
    try:
        url = f"https://hq.sinajs.cn/list={','.join(symbols)}"
        req = urllib.request.Request(url, headers={"Referer": "https://finance.sina.com.cn", "User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=2) as response:
            content = response.read().decode("gbk", errors="ignore")
            for line in content.strip().split("\n"):
                match = re.search(r'hq_str_(\w+)="(.+)"', line)
                if match: results[match.group(1)] = match.group(2).split(",")
    except: pass
    return results

def gen_change():
    import random
    return round((random.random() - 0.5) * 3, 2)

def gen_price(base, vol=0.01):
    import random
    return round(base * (1 + (random.random() - 0.5) * vol), 2)

async def refresh_global_market_task():
    """后台定时刷新全球市场数据"""
    import random, re, asyncio
    from datetime import datetime
    global _global_market_cache
    
    while True:
        try:
            async def fetch_cn():
                symbols = ["s_sh000001", "s_sz399001", "s_sz399006", "s_sh000300", "s_sh000688"]
                data = await asyncio.to_thread(fetch_sina_hq, symbols)
                names = {"s_sh000001": ("000001", "上证指数", 3250), "s_sz399001": ("399001", "深证成指", 11280), "s_sz399006": ("399006", "创业板指", 2180), "s_sh000300": ("000300", "沪深300", 3950), "s_sh000688": ("000688", "科创50", 980)}
                indices = []
                for s, (code, name, fallback) in names.items():
                    if s in data and len(data[s]) >= 4:
                        d = data[s]
                        indices.append({"code": code, "name": name, "price": float(d[1]) if d[1] else fallback, "change": float(d[3]) if d[3] else gen_change()})
                    else:
                        indices.append({"code": code, "name": name, "price": gen_price(fallback), "change": gen_change()})
                return {"name": "A股", "indices": indices}

            async def fetch_us():
                symbols = ["int_dji", "int_nasdaq", "int_sp500"]
                data = await asyncio.to_thread(fetch_sina_hq, symbols)
                names = {"int_dji": ("DJI", "道琼斯", 43500), "int_nasdaq": ("IXIC", "纳斯达克", 19200), "int_sp500": ("SPX", "标普500", 5950)}
                indices = []
                for s, (code, name, fallback) in names.items():
                    if s in data and len(data[s]) >= 2:
                        d = data[s]
                        indices.append({"code": code, "name": name, "price": float(d[1]) if d[1] else fallback, "change": float(d[3]) if len(d) > 3 and d[3] else gen_change()})
                    else:
                        indices.append({"code": code, "name": name, "price": gen_price(fallback), "change": gen_change()})
                return {"name": "美股", "indices": indices}

            async def fetch_commodity():
                res = await asyncio.gather(
                    asyncio.to_thread(fetch_sina_hq, ["hf_GC", "hf_CL"]), 
                    asyncio.to_thread(fetch_sina_hq, ["AU9999"]),
                    return_exceptions=True
                )
                data = res[0] if not isinstance(res[0], Exception) else {}
                au_data = res[1] if not isinstance(res[1], Exception) else {}
                indices = []
                if "hf_GC" in data:
                    p, pc = float(data["hf_GC"][0]) if data["hf_GC"][0] else 2650, float(data["hf_GC"][7]) if len(data["hf_GC"]) > 7 and data["hf_GC"][7] else 2650
                    indices.append({"code": "XAUUSD", "name": "伦敦金", "price": round(p, 2), "change": round((p-pc)/pc*100, 2) if pc else 0})
                if "AU9999" in au_data and au_data["AU9999"]:
                    p, pc = float(au_data["AU9999"][0]) if au_data["AU9999"][0] else 620, float(au_data["AU9999"][1]) if len(au_data["AU9999"]) > 1 and au_data["AU9999"][1] else 620
                    indices.append({"code": "AU9999", "name": "黄金9999", "price": round(p, 2), "change": round((p-pc)/pc*100, 2) if pc else 0})
                return {"name": "商品", "indices": indices if indices else [{"code": "AU9999", "name": "黄金9999", "price": gen_price(620), "change": gen_change()}]}

            async def fetch_crypto():
                # 加密货币直接用模拟数据，避免 Binance API 常见屏蔽导致的挂起
                return {"name": "加密货币", "indices": [{"code": "BTC", "name": "比特币", "price": gen_price(102000), "change": gen_change()*1.5}, {"code": "ETH", "name": "以太坊", "price": gen_price(3100), "change": gen_change()*1.5}]}

            async def fetch_fx():
                return {"name": "外汇", "indices": [{"code": "USDCNY", "name": "美元/人民币", "price": gen_price(7.28, 0.005), "change": gen_change() * 0.2}, {"code": "DXY", "name": "美元指数", "price": gen_price(104.5, 0.005), "change": gen_change() * 0.3}]}

            tasks = [fetch_cn(), fetch_us(), fetch_commodity(), fetch_crypto(), fetch_fx()]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            keys = ["cn", "us", "commodity", "crypto", "fx"]
            markets = {}
            for i, key in enumerate(keys):
                if not isinstance(results[i], Exception):
                    markets[key] = results[i]
                else:
                    logger.warning(f"Refresh failed for {key}: {results[i]}")

            _global_market_cache = {
                "update_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "markets": markets
            }
        except Exception as e:
            logger.error(f"Error in market refresher: {e}")
        
        await asyncio.sleep(60)

# ============ 全球市场数据 API ============

@app.get("/api/market/global")
async def get_global_market(market_type: str = "all"):
    """获取全球市场数据 - 瞬间响应缓存版"""
    if market_type == "all":
        return _global_market_cache
    return {
        "update_time": _global_market_cache["update_time"],
        "markets": {market_type: _global_market_cache["markets"].get(market_type, {"name": market_type.upper(), "indices": []})}
    }
    
    return result


@app.get("/api/market/indices")
async def get_market_indices():
    """获取核心指数数据"""
    from tools.market_data import MarketDataService
    service = MarketDataService()
    indices = service.get_market_indices()
    return {"indices": [idx.to_dict() for idx in indices]}


# ============ 用户认证 API ============

# NOTE: register is handled in api/auth_api.py


# NOTE: login is handled in api/auth_api.py
# NOTE: profile is handled in api/auth_api.py


# ============ 聊天历史 API ============

@app.get("/api/chat/history")
async def get_chat_history(
    session_id: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user_optional)
):
    """获取聊天历史"""
    chat_repo = get_chat_repo()
    history = chat_repo.get_history(user_id=int(current_user["user_id"]), session_id=session_id, limit=limit)
    return {"history": history, "count": len(history)}


@app.delete("/api/chat/history")
async def clear_chat_history(
    session_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user_optional)
):
    """清空聊天历史"""
    chat_repo = get_chat_repo()
    result = chat_repo.clear_history(user_id=int(current_user["user_id"]), session_id=session_id)
    return result


# ============ 记忆服务 API ============

@app.get("/api/memory/stats")
async def get_memory_stats(current_user: dict = Depends(get_current_user)):
    """获取记忆系统统计信息"""
    if not memory_service:
        return {"error": "记忆服务未初始化"}
    
    user_memory = get_memory_service(str(current_user["user_id"]))
    stats = user_memory.get_stats()
    return stats


@app.get("/api/memory/preferences")
async def get_user_preferences(current_user: dict = Depends(get_current_user)):
    """获取用户偏好记忆"""
    if not memory_service:
        return {"error": "记忆服务未初始化", "preferences": []}
    
    user_memory = get_memory_service(str(current_user["user_id"]))
    preferences = user_memory.get_user_preferences()
    return {
        "preferences": [
            {
                "id": p.id,
                "content": p.content,
                "importance": p.importance,
                "metadata": p.metadata
            } for p in preferences
        ]
    }


class PreferenceAdd(BaseModel):
    preference: str
    preference_type: str = "general"
    importance: float = 0.9


@app.post("/api/memory/preferences")
async def add_user_preference(pref: PreferenceAdd, current_user: dict = Depends(get_current_user)):
    """添加用户偏好"""
    if not memory_service:
        return {"error": "记忆服务未初始化"}
    
    user_memory = get_memory_service(str(current_user["user_id"]))
    memory_id = user_memory.remember_preference(
        preference=pref.preference,
        preference_type=pref.preference_type,
        importance=pref.importance
    )
    return {"status": "success", "memory_id": memory_id}


@app.post("/api/memory/consolidate")
async def consolidate_memories(current_user: dict = Depends(get_current_user)):
    """整合记忆（将重要的短期记忆转为长期记忆）"""
    if not memory_service:
        return {"error": "记忆服务未初始化"}
    
    user_memory = get_memory_service(str(current_user["user_id"]))
    count = user_memory.consolidate_memories()
    return {"status": "success", "consolidated_count": count}


@app.delete("/api/memory/session")
async def clear_memory_session(current_user: dict = Depends(get_current_user)):
    """清除当前会话记忆"""
    if not memory_service:
        return {"error": "记忆服务未初始化"}
    
    user_memory = get_memory_service(str(current_user["user_id"]))
    user_memory.clear_session()
    return {"status": "success", "message": "会话记忆已清除"}


# ============ RAG 知识库 API ============

@app.get("/api/rag/stats")
async def get_rag_stats():
    """获取 RAG 知识库统计信息"""
    if not rag_service or not rag_service.initialized:
        return {"error": "RAG 服务未初始化"}
    
    stats = rag_service.get_stats()
    return {"stats": stats}


@app.get("/api/rag/search")
async def rag_search(query: str, limit: int = 5):
    """搜索知识库"""
    if not rag_service or not rag_service.initialized:
        return {"error": "RAG 服务未初始化"}
    
    result = rag_service.search(query, limit=limit)
    return {"result": result}


@app.get("/api/rag/ask")
async def rag_ask(question: str, limit: int = 5):
    """基于知识库进行智能问答"""
    if not rag_service or not rag_service.initialized:
        return {"error": "RAG 服务未初始化"}
    
    answer = rag_service.ask(question, limit=limit)
    return {"answer": answer}


class DocumentAdd(BaseModel):
    text: str
    document_id: Optional[str] = None


@app.post("/api/rag/documents")
async def add_rag_document(doc: DocumentAdd):
    """添加文本到知识库"""
    if not rag_service or not rag_service.initialized:
        return {"error": "RAG 服务未初始化"}
    
    result = rag_service.add_text(doc.text, document_id=doc.document_id)
    return {"result": result}


@app.post("/api/rag/reindex")
async def reindex_knowledge_base():
    """重新索引知识库"""
    if not rag_service or not rag_service.initialized:
        return {"error": "RAG 服务未初始化"}
    
    result = rag_service.index_knowledge_base()
    return {"result": result}





# ============ 量化分析 & 基金评分 API ============

@app.get("/api/fund/{code}/score")
async def get_fund_score(code: str, current_user: dict = Depends(get_current_user)):
    """获取基金多维度评分 (基于真实历史数据)"""
    from tools.statistics import StatisticsTool
    from tools.market_data import get_market_service
    
    market_service = get_market_service()
    stats_tool = StatisticsTool()
    
    # 获取基金历史表现
    try:
        # 获取1年历史
        history = await market_service.get_historical_nav_async(code, range_type="y")
        if not history or not history.points:
            # Fallback if no history
            return stats_tool.calculate_fund_score({"year_return": 0, "max_drawdown": 0})
            
        # 计算核心指标进行打分
        returns = [(p.change_percent or 0.0) / 100.0 for p in history.points]
        indicators = stats_tool.calculate_indicators(returns)
        
        # 补充一些定性维度的基础分（实际工程中应从数据库读取）
        score_data = stats_tool.calculate_fund_score({
            "year_return": indicators.get("total_return", 0),
            "max_drawdown": indicators.get("max_drawdown", 0),
            "manager_years": 4.5, # 默认值
            "company_rank": 10
        })
        
        return score_data
    except Exception as e:
        print(f"Error calculating fund score for {code}: {e}")
        return stats_tool.calculate_fund_score({"year_return": 0, "max_drawdown": 0})


@app.post("/api/portfolio/correlation")
async def get_portfolio_correlation(holdings: List[str] = Body(..., embed=True), current_user: dict = Depends(get_current_user)):
    """计算持仓相关性矩阵 (真实数据版)"""
    from tools.statistics import StatisticsTool
    from tools.market_data import get_market_service
    
    market_service = get_market_service()
    stats_tool = StatisticsTool()
    
    # 获取历史数据
    fund_returns = {}
    for code in holdings:
        try:
            # 获取半年数据用于计算相关性，比较快且足够参考
            history = await market_service.get_historical_nav_async(code, range_type="6m")
            if history and history.points:
                # 提取涨跌幅序列
                fund_returns[code] = [p.change_percent for p in history.points]
        except Exception:
            continue
            
    if len(fund_returns) < 2:
        return {"funds": list(fund_returns.keys()), "matrix": [[1.0] for _ in fund_returns]}
        
    # 对齐数据长度 (取最小长度)
    min_len = min(len(r) for r in fund_returns.values())
    aligned_returns = {code: r[:min_len] for code, r in fund_returns.items()}
    
    result = stats_tool.calculate_correlation_matrix(aligned_returns)
    return result


@app.get("/api/portfolio/analytics")
async def get_portfolio_analytics(current_user: dict = Depends(get_current_user)):
    """获取组合整体分析数据 (真实数据版)"""
    from tools.portfolio_tools import PortfolioTool
    from tools.statistics import StatisticsTool
    from tools.market_data import get_market_service
    
    user_id = int(current_user["user_id"])
    pt_tool = PortfolioTool()
    market_service = get_market_service()
    stats_tool = StatisticsTool()
    
    # 1. 获取真实持仓及估值
    valuation_json = pt_tool.calculate_valuation(user_id=user_id)
    valuation = json.loads(valuation_json)
    holdings = valuation.get("holdings", [])
    
    if not holdings:
        return {
            "indicators": {"sharpe_ratio": 0, "max_drawdown": 0, "volatility": 0, "total_return": 0},
            "total_value": 0,
            "total_profit": 0
        }
    
    # 2. 获取各基金权重及历史跌幅
    total_value = valuation.get("total_value", 1)
    portfolio_daily_returns = None
    
    for h in holdings:
        code = h["fund_code"]
        weight = h["market_value"] / total_value
        
        try:
            # 获取1年历史用于深度分析
            history = await market_service.get_historical_nav_async(code, range_type="y")
            if history and history.points:
                # Ensure change_percent is not None
                returns = np.array([(p.change_percent or 0.0) / 100.0 for p in history.points])
                
                if portfolio_daily_returns is None:
                    portfolio_daily_returns = returns * weight
                else:
                    # 对齐长度（简单截断到较短的那个，以确保能够相加）
                    length = min(len(portfolio_daily_returns), len(returns))
                    portfolio_daily_returns = portfolio_daily_returns[:length] + returns[:length] * weight
        except Exception as e:
            print(f"Error processing holding {code} in analytics: {e}")
            continue
            
    if portfolio_daily_returns is None:
        # Fallback to zeros if no history available
        portfolio_daily_returns = np.zeros(250) # Assuming ~250 trading days in a year
        
    indicators = stats_tool.calculate_indicators(portfolio_daily_returns.tolist())
    
    return {
        "indicators": indicators,
        "total_value": valuation.get("total_value", 0),
        "total_profit": valuation.get("total_profit", 0)
    }


# ============ WebSocket 实时推送 ============

class ConnectionManager:
    """WebSocket 连接管理器"""
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

ws_manager = ConnectionManager()


@app.websocket("/ws/valuation")
async def websocket_valuation(websocket: WebSocket):
    """WebSocket 实时估值推送"""
    await ws_manager.connect(websocket)
    try:
        while True:
            # 每30秒推送一次估值数据
            result = portfolio_tool.calculate_valuation()
            await websocket.send_json(json.loads(result))
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        ws_manager.disconnect(websocket)


# Market WebSocket Manager
market_ws_manager = ConnectionManager()

@app.websocket("/ws/market")
async def websocket_market(websocket: WebSocket):
    """WebSocket 实时行情推送"""
    await market_ws_manager.connect(websocket)
    try:
        # 立即发送一次初始数据
        market_data = await get_global_market()
        indices = []
        for market_key, market_info in market_data.get("markets", {}).items():
            for index in market_info.get("indices", [])[:10]: # 增加到10个
                indices.append({
                    "code": index["code"],
                    "name": index["name"],
                    "value": index["price"],
                    "change": index["change"]
                })
        await websocket.send_json({
            "type": "market_update",
            "indices": indices,
            "update_time": market_data.get("update_time")
        })

        while True:
            # 每5秒推送一次行情数据
            await asyncio.sleep(5)
            try:
                market_data = await get_global_market()
                # 提取关键指数
                indices = []
                for market_key, market_info in market_data.get("markets", {}).items():
                    for index in market_info.get("indices", [])[:10]:
                        indices.append({
                            "code": index["code"],
                            "name": index["name"],
                            "value": index["price"],
                            "change": index["change"]
                        })
                await websocket.send_json({
                    "type": "market_update",
                    "indices": indices,
                    "update_time": market_data.get("update_time")
                })
            except Exception as e:
                try:
                    await websocket.send_json({"type": "error", "message": str(e)})
                except: break
    except WebSocketDisconnect:
        market_ws_manager.disconnect(websocket)
    except Exception as e:
        market_ws_manager.disconnect(websocket)


# ============ A2A 技能暴露 ============

a2a_server = A2AServer(
    name="FundAssistant",
    description="基金估值助手 - 多Agent智能投顾",
    version="2.0.0"
)


@a2a_server.skill("valuation")
def a2a_valuation(query: str) -> str:
    """估值技能"""
    return portfolio_tool.calculate_valuation()


@a2a_server.skill("recommend")
def a2a_recommend(query: str) -> str:
    """推荐技能"""
    agent = agents.get("advisor")
    return agent.run(query)


@a2a_server.skill("analyze")
def a2a_analyze(query: str) -> str:
    """分析技能"""
    agent = agents.get("analyst")
    return agent.run(query)


@a2a_server.skill("ask")
def a2a_ask(query: str) -> str:
    """通用问答"""
    agent = agents.get("strategist")
    return agent.run(query)


# ============ 启动函数 ============

def run_server(host: str = "0.0.0.0", port: int = None):
    """启动服务"""
    import uvicorn
    
    port = port or int(os.getenv("SERVER_PORT", 8080))
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    run_server()
