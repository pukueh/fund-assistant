"""Celery 任务定义

异步任务函数，由 Celery Worker 执行
"""

from celery import shared_task
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def collect_fund_nav(self, fund_code: str) -> dict:
    """采集单个基金净值
    
    Args:
        fund_code: 基金代码
        
    Returns:
        采集结果
    """
    try:
        from .collectors import NavCollector
        collector = NavCollector()
        result = collector.collect(fund_code)
        return {"status": "success", "fund_code": fund_code, "data": result}
    except Exception as e:
        logger.error(f"采集净值失败 {fund_code}: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=2)
def collect_all_nav(self) -> dict:
    """采集所有关注基金的净值"""
    try:
        from .collectors import NavCollector
        collector = NavCollector()
        results = collector.collect_all()
        return {
            "status": "success",
            "collected": len(results),
            "timestamp": str(results[0].date) if results else None
        }
    except Exception as e:
        logger.error(f"批量采集净值失败: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=2)
def collect_all_holdings(self) -> dict:
    """采集所有基金持仓"""
    try:
        from .collectors import EventsCollector
        collector = EventsCollector()
        results = collector.collect_holdings_for_all()
        return {
            "status": "success",
            "collected": len(results)
        }
    except Exception as e:
        logger.error(f"批量采集持仓失败: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=2)
def update_all_metrics(self) -> dict:
    """更新所有基金量化指标"""
    try:
        from .collectors import MetricsCollector
        collector = MetricsCollector()
        results = collector.update_all()
        return {
            "status": "success",
            "updated": len(results)
        }
    except Exception as e:
        logger.error(f"更新指标失败: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True)
def update_realtime_nav(self) -> dict:
    """更新实时估值（交易时间）"""
    try:
        from .collectors import NavCollector
        collector = NavCollector()
        results = collector.collect_realtime()
        return {
            "status": "success",
            "updated": len(results)
        }
    except Exception as e:
        logger.warning(f"更新实时估值失败: {e}")
        return {"status": "error", "message": str(e)}


@shared_task
def collect_fund_events(fund_code: str) -> dict:
    """采集基金事件（分红、拆分等）"""
    try:
        from .collectors import EventsCollector
        collector = EventsCollector()
        results = collector.collect(fund_code)
        return {
            "status": "success",
            "fund_code": fund_code,
            "events": len(results)
        }
    except Exception as e:
        logger.error(f"采集事件失败 {fund_code}: {e}")
        return {"status": "error", "message": str(e)}
