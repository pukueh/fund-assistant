"""Celery 分布式任务调度器

使用 Celery + Redis 实现分布式定时任务：
- 每日 17:00 抓取基金净值
- 每周日 抓取基金持仓配置  
- 每月初 更新量化指标
"""

import os
from datetime import datetime
from typing import List, Optional

# Celery 是可选依赖
try:
    from celery import Celery
    from celery.schedules import crontab
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False
    Celery = None
    crontab = None

# Celery 配置
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# 创建 Celery 应用（仅在 Celery 可用时）
celery_app = None
if CELERY_AVAILABLE:
    celery_app = Celery(
        "fund_assistant",
        broker=REDIS_URL,
        backend=REDIS_URL,
        include=[
            "data_ingestion.tasks"
        ]
    )
    
    # Celery 配置
    celery_app.conf.update(
        # 时区
        timezone="Asia/Shanghai",
        enable_utc=False,
        
        # 任务序列化
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        
        # 任务执行
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        worker_prefetch_multiplier=1,
        
        # 结果过期
        result_expires=3600,
        
        # 定时任务
        beat_schedule={
            # 每日 17:00 采集净值
            "collect-nav-daily": {
                "task": "data_ingestion.tasks.collect_all_nav",
                "schedule": crontab(hour=17, minute=0),
                "options": {"queue": "data_ingestion"}
            },
            # 每周日 10:00 采集持仓
            "collect-holdings-weekly": {
                "task": "data_ingestion.tasks.collect_all_holdings",
                "schedule": crontab(hour=10, minute=0, day_of_week=0),
                "options": {"queue": "data_ingestion"}
            },
            # 每月1日 10:00 更新指标
            "update-metrics-monthly": {
                "task": "data_ingestion.tasks.update_all_metrics",
                "schedule": crontab(hour=10, minute=0, day_of_month=1),
                "options": {"queue": "data_ingestion"}
            },
            # 每5分钟更新实时估值（交易时间）
            "update-realtime-nav": {
                "task": "data_ingestion.tasks.update_realtime_nav",
                "schedule": crontab(minute="*/5", hour="9-15", day_of_week="1-5"),
                "options": {"queue": "realtime"}
            }
        },
        
        # 任务路由
        task_routes={
            "data_ingestion.tasks.collect_*": {"queue": "data_ingestion"},
            "data_ingestion.tasks.update_realtime_*": {"queue": "realtime"}
        }
    )


def start_scheduler():
    """启动调度器（开发模式）
    
    生产环境应使用:
    celery -A data_ingestion.scheduler beat --loglevel=info
    celery -A data_ingestion.scheduler worker --loglevel=info -Q data_ingestion,realtime
    """
    print("📅 Celery Beat 调度器配置完成")
    print("=" * 50)
    print("定时任务:")
    for name, config in celery_app.conf.beat_schedule.items():
        print(f"  - {name}: {config['schedule']}")
    print("=" * 50)
    print("\n启动命令:")
    print("  celery -A data_ingestion.scheduler beat --loglevel=info")
    print("  celery -A data_ingestion.scheduler worker --loglevel=info -Q data_ingestion,realtime")


# 简易的 APScheduler 备用方案（不需要 Redis）
class SimpleScheduler:
    """简易调度器（无 Redis 依赖）
    
    用于开发和单机部署场景
    """
    
    def __init__(self):
        self._jobs = {}
        self._running = False
        self._scheduler = None
    
    def start(self):
        """启动调度器"""
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from apscheduler.triggers.cron import CronTrigger
            
            self._scheduler = BackgroundScheduler(timezone="Asia/Shanghai")
            
            # 添加任务
            self._scheduler.add_job(
                self._collect_nav_task,
                CronTrigger(hour=17, minute=0),
                id="collect_nav_daily",
                name="每日净值采集"
            )
            
            self._scheduler.add_job(
                self._collect_holdings_task,
                CronTrigger(hour=10, minute=0, day_of_week=6),
                id="collect_holdings_weekly",
                name="每周持仓采集"
            )
            
            self._scheduler.add_job(
                self._update_metrics_task,
                CronTrigger(hour=10, minute=0, day=1),
                id="update_metrics_monthly",
                name="每月指标更新"
            )
            
            self._scheduler.start()
            self._running = True
            print("📅 APScheduler 调度器已启动")
            
        except ImportError:
            print("⚠️ APScheduler 未安装，请使用 Celery 或手动执行任务")
    
    def stop(self):
        """停止调度器"""
        if self._scheduler:
            self._scheduler.shutdown()
            self._running = False
            print("📅 调度器已停止")
    
    def _collect_nav_task(self):
        """净值采集任务"""
        from .collectors import NavCollector
        collector = NavCollector()
        collector.collect_all()
    
    def _collect_holdings_task(self):
        """持仓采集任务"""
        from .collectors import EventsCollector
        collector = EventsCollector()
        collector.collect_all()
    
    def _update_metrics_task(self):
        """指标更新任务"""
        from .collectors import MetricsCollector
        collector = MetricsCollector()
        collector.update_all()


# 导出简易调度器实例
simple_scheduler = SimpleScheduler()
