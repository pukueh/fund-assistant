"""图表 API 端点

提供专业图表所需的数据接口
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/chart", tags=["chart"])


@router.get("/data/{fund_code}")
async def get_chart_data(
    fund_code: str,
    period: str = Query("1Y", description="时间周期: 1W/1M/3M/6M/1Y/3Y/MAX"),
    benchmark: str = Query("000300", description="对比基准代码")
):
    """获取图表数据
    
    Returns:
        - nav_data: 净值序列 (Lightweight Charts 格式)
        - benchmark_data: 基准数据
        - events: 事件标记
        - metrics: 量化指标
        - indicators: 技术指标
    """
    from data_ingestion.collectors import NavCollector, MetricsCollector, EventsCollector
    from data_ingestion.models import ChartDataResponse
    
    # 计算时间范围
    period_days = {
        "1W": 7, "1M": 30, "3M": 90, "6M": 180,
        "1Y": 365, "3Y": 1095, "MAX": 3650
    }
    days = period_days.get(period, 365)
    start_date = datetime.now() - timedelta(days=days)
    
    try:
        # 获取净值数据
        nav_collector = NavCollector()
        nav_data = nav_collector.get_chart_data(fund_code, period)
        
        # 如果数据为空，尝试采集
        if not nav_data:
            nav_collector.collect(fund_code, days)
            nav_data = nav_collector.get_chart_data(fund_code, period)
        
        # 获取事件标记
        events_collector = EventsCollector()
        events = events_collector.get_chart_markers(fund_code, start_date)
        
        # 获取量化指标
        metrics_collector = MetricsCollector()
        metrics = metrics_collector.get_latest(fund_code)
        metrics_dict = metrics.to_dict() if metrics else {}
        
        # 计算技术指标
        if nav_data:
            navs = [d['value'] for d in nav_data]
            indicators = {
                "ma5": metrics_collector.calculate_moving_average(navs, 5),
                "ma10": metrics_collector.calculate_moving_average(navs, 10),
                "ma20": metrics_collector.calculate_moving_average(navs, 20),
            }
            
            # 将 MA 转换为图表格式
            for key in indicators:
                indicators[key] = [
                    {"time": nav_data[i]["time"], "value": v}
                    for i, v in enumerate(indicators[key])
                    if v is not None
                ]
        else:
            indicators = {}
        
        # 获取基金名称
        from tools.market_data import get_market_service
        market_service = get_market_service()
        details = market_service.get_fund_details(fund_code)
        fund_name = details.fund_name if details else f"基金{fund_code}"
        
        return {
            "fund_code": fund_code,
            "fund_name": fund_name,
            "period": period,
            "nav_data": nav_data,
            "benchmark_data": [],  # TODO: 单独接口获取基准
            "events": events,
            "metrics": metrics_dict,
            "indicators": indicators
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/benchmark/{index_code}")
async def get_benchmark_data(
    index_code: str,
    period: str = Query("1Y", description="时间周期")
):
    """获取基准指数数据
    
    常用基准:
    - 000300: 沪深300
    - 000905: 中证500
    - 000001: 上证指数
    """
    # TODO: 实现指数数据采集
    # 目前返回模拟数据
    import random
    
    period_days = {"1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "3Y": 1095, "MAX": 3650}
    days = period_days.get(period, 365)
    
    nav_data = []
    base_value = 1.0
    current_value = base_value
    
    for i in range(days, 0, -1):
        date = datetime.now() - timedelta(days=i)
        change = random.gauss(0.0003, 0.012)
        current_value *= (1 + change)
        nav_data.append({
            "time": int(date.timestamp()),
            "value": round(current_value, 4)
        })
    
    return {
        "index_code": index_code,
        "period": period,
        "nav_data": nav_data
    }


@router.get("/events/{fund_code}")
async def get_fund_events(
    fund_code: str,
    event_types: Optional[List[str]] = Query(None, description="事件类型过滤")
):
    """获取基金事件"""
    from data_ingestion.collectors import EventsCollector
    from data_ingestion.models import EventType
    
    events_collector = EventsCollector()
    
    # 转换事件类型
    types = None
    if event_types:
        types = [EventType(t) for t in event_types if t in EventType.__members__]
    
    events = events_collector.get_events(fund_code, event_types=types)
    
    return {
        "fund_code": fund_code,
        "events": [e.to_dict() for e in events]
    }


@router.get("/metrics/{fund_code}")
async def get_fund_metrics(fund_code: str):
    """获取基金量化指标"""
    from data_ingestion.collectors import MetricsCollector, NavCollector
    
    metrics_collector = MetricsCollector()
    metrics = metrics_collector.get_latest(fund_code)
    
    # 如果没有指标，尝试计算
    if not metrics:
        nav_collector = NavCollector()
        history = nav_collector.get_history(fund_code, limit=365)
        if history:
            metrics = metrics_collector.calculate(fund_code, history)
            metrics_collector.save(metrics)
    
    return metrics.to_dict() if metrics else {}


@router.get("/holdings/{fund_code}")
async def get_fund_holdings(fund_code: str):
    """获取基金持仓"""
    from data_ingestion.collectors import EventsCollector
    
    events_collector = EventsCollector()
    holdings = events_collector.collect_holdings(fund_code)
    
    return {
        "fund_code": fund_code,
        "holdings": [h.to_dict() for h in holdings]
    }


@router.post("/collect/{fund_code}")
async def trigger_collection(fund_code: str, days: int = 365):
    """手动触发数据采集"""
    from data_ingestion.collectors import NavCollector, EventsCollector
    
    nav_collector = NavCollector()
    events_collector = EventsCollector()
    
    # 采集净值
    nav_results = nav_collector.collect(fund_code, days)
    nav_collector.save(nav_results)
    
    # 采集事件
    events = events_collector.collect(fund_code)
    
    return {
        "status": "success",
        "nav_count": len(nav_results),
        "events_count": len(events)
    }


@router.get("/compare")
async def compare_funds(
    fund_codes: List[str] = Query(..., description="基金代码列表"),
    period: str = Query("1Y", description="时间周期")
):
    """多基金对比"""
    from data_ingestion.collectors import NavCollector, MetricsCollector
    
    nav_collector = NavCollector()
    metrics_collector = MetricsCollector()
    
    results = []
    for code in fund_codes[:5]:  # 最多对比5个
        nav_data = nav_collector.get_chart_data(code, period)
        metrics = metrics_collector.get_latest(code)
        
        results.append({
            "fund_code": code,
            "nav_data": nav_data,
            "metrics": metrics.to_dict() if metrics else {}
        })
    
    return {
        "period": period,
        "funds": results
    }
