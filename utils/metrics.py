"""应用指标收集模块"""

import time
from datetime import datetime
from typing import Dict, Any
from dataclasses import dataclass, field
from collections import defaultdict


@dataclass
class RequestMetrics:
    """请求指标"""
    total_requests: int = 0
    total_errors: int = 0
    latency_sum: float = 0.0
    latency_count: int = 0
    status_codes: Dict[int, int] = field(default_factory=lambda: defaultdict(int))
    endpoints: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    
    @property
    def avg_latency_ms(self) -> float:
        if self.latency_count == 0:
            return 0.0
        return (self.latency_sum / self.latency_count) * 1000
    
    @property
    def error_rate(self) -> float:
        if self.total_requests == 0:
            return 0.0
        return self.total_errors / self.total_requests


class MetricsCollector:
    """指标收集器"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.start_time = datetime.now()
        self.request_metrics = RequestMetrics()
    
    def record_request(self, endpoint: str, status_code: int, latency: float):
        """记录请求"""
        self.request_metrics.total_requests += 1
        self.request_metrics.latency_sum += latency
        self.request_metrics.latency_count += 1
        self.request_metrics.status_codes[status_code] += 1
        self.request_metrics.endpoints[endpoint] += 1
        
        if status_code >= 400:
            self.request_metrics.total_errors += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """获取所有指标"""
        uptime = (datetime.now() - self.start_time).total_seconds()
        
        return {
            "uptime_seconds": round(uptime, 2),
            "start_time": self.start_time.isoformat(),
            "requests": {
                "total": self.request_metrics.total_requests,
                "errors": self.request_metrics.total_errors,
                "error_rate": f"{self.request_metrics.error_rate:.2%}",
                "avg_latency_ms": round(self.request_metrics.avg_latency_ms, 2),
            },
            "status_codes": dict(self.request_metrics.status_codes),
            "top_endpoints": dict(
                sorted(
                    self.request_metrics.endpoints.items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:10]
            )
        }
    
    def get_prometheus_format(self) -> str:
        """获取 Prometheus 格式指标"""
        lines = []
        m = self.request_metrics
        uptime = (datetime.now() - self.start_time).total_seconds()
        
        lines.append(f"# HELP app_uptime_seconds Application uptime in seconds")
        lines.append(f"# TYPE app_uptime_seconds gauge")
        lines.append(f"app_uptime_seconds {uptime:.2f}")
        
        lines.append(f"# HELP app_requests_total Total number of requests")
        lines.append(f"# TYPE app_requests_total counter")
        lines.append(f"app_requests_total {m.total_requests}")
        
        lines.append(f"# HELP app_errors_total Total number of errors")
        lines.append(f"# TYPE app_errors_total counter")
        lines.append(f"app_errors_total {m.total_errors}")
        
        lines.append(f"# HELP app_latency_avg_ms Average request latency in ms")
        lines.append(f"# TYPE app_latency_avg_ms gauge")
        lines.append(f"app_latency_avg_ms {m.avg_latency_ms:.2f}")
        
        return "\n".join(lines)


def get_metrics_collector() -> MetricsCollector:
    """获取指标收集器单例"""
    return MetricsCollector()
