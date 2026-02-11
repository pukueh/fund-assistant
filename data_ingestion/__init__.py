"""数据采集模块

提供基金数据的定时采集、处理和存储功能。
"""

from .models import FundNavHistory, FundMetrics, FundEvent

# Celery 调度器是可选的
try:
    from .scheduler import celery_app, start_scheduler, simple_scheduler
except ImportError:
    celery_app = None
    start_scheduler = None
    simple_scheduler = None

__all__ = [
    'FundNavHistory',
    'FundMetrics', 
    'FundEvent',
    'celery_app',
    'start_scheduler',
    'simple_scheduler'
]
