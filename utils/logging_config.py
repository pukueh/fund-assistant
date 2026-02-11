"""日志配置模块 - 结构化日志"""

import os
import sys
import logging
from datetime import datetime
from typing import Optional


class ColoredFormatter(logging.Formatter):
    """彩色日志格式化器"""
    
    COLORS = {
        'DEBUG': '\033[36m',    # 青色
        'INFO': '\033[32m',     # 绿色
        'WARNING': '\033[33m',  # 黄色
        'ERROR': '\033[31m',    # 红色
        'CRITICAL': '\033[35m', # 紫色
    }
    RESET = '\033[0m'
    
    def format(self, record):
        levelname = record.levelname
        if levelname in self.COLORS:
            record.levelname = f"{self.COLORS[levelname]}{levelname}{self.RESET}"
        return super().format(record)


class StructuredFormatter(logging.Formatter):
    """结构化日志格式化器 (JSON-like)"""
    
    def format(self, record):
        log_data = {
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # 添加额外字段
        if hasattr(record, 'extra_data'):
            log_data.update(record.extra_data)
        
        # 添加异常信息
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # 格式化为单行 JSON-like 格式
        parts = [f"{k}={v}" for k, v in log_data.items()]
        return " | ".join(parts)


def setup_logging(
    level: str = "INFO",
    log_file: Optional[str] = None,
    structured: bool = False
) -> logging.Logger:
    """配置应用日志
    
    Args:
        level: 日志级别 (DEBUG/INFO/WARNING/ERROR)
        log_file: 日志文件路径 (可选)
        structured: 是否使用结构化格式
    
    Returns:
        主日志记录器
    """
    # 获取根日志记录器
    logger = logging.getLogger("fund_assistant")
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    
    # 清除现有处理器
    logger.handlers.clear()
    
    # 控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    
    if structured:
        console_format = StructuredFormatter()
    else:
        console_format = ColoredFormatter(
            '%(asctime)s | %(levelname)s | %(name)s | %(message)s',
            datefmt='%H:%M:%S'
        )
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)
    
    # 文件处理器 (如果指定)
    if log_file:
        os.makedirs(os.path.dirname(log_file) or '.', exist_ok=True)
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        file_format = StructuredFormatter()
        file_handler.setFormatter(file_format)
        logger.addHandler(file_handler)
    
    return logger


def get_logger(name: str = "fund_assistant") -> logging.Logger:
    """获取日志记录器"""
    return logging.getLogger(name)


# 便捷函数
def log_info(message: str, **extra):
    """记录信息日志"""
    logger = get_logger()
    if extra:
        record = logger.makeRecord(
            logger.name, logging.INFO, "", 0, message, (), None
        )
        record.extra_data = extra
        logger.handle(record)
    else:
        logger.info(message)


def log_error(message: str, exc: Exception = None, **extra):
    """记录错误日志"""
    logger = get_logger()
    logger.error(message, exc_info=exc is not None)


def log_warning(message: str, **extra):
    """记录警告日志"""
    logger = get_logger()
    logger.warning(message)


# 初始化默认日志配置
_initialized = False

def init_logging():
    """初始化日志配置 (启动时调用一次)"""
    global _initialized
    if not _initialized:
        import os
        from logging.handlers import RotatingFileHandler
        from utils.config import get_config
        
        config = get_config()
        production_mode = os.getenv("ENVIRONMENT", "development").lower() == "production"
        
        # 根据环境确定日志级别
        level = "DEBUG" if config.server.debug else "INFO"
        
        # 生产环境始终启用文件日志
        if production_mode or not config.server.debug:
            log_dir = os.getenv("LOG_DIR", "./data/logs")
            os.makedirs(log_dir, exist_ok=True)
            log_file = os.path.join(log_dir, "app.log")
        else:
            log_file = None
        
        # 设置基础日志
        logger = setup_logging(level=level, log_file=None, structured=production_mode)
        
        # 生产环境添加带轮转的文件处理器
        if log_file:
            # 每个文件最大 10MB，保留 5 个备份
            rotating_handler = RotatingFileHandler(
                log_file,
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=5,
                encoding='utf-8'
            )
            rotating_handler.setLevel(logging.DEBUG)
            rotating_handler.setFormatter(StructuredFormatter())
            logger.addHandler(rotating_handler)
            
            # 同时添加错误日志文件
            error_log_file = os.path.join(log_dir, "error.log")
            error_handler = RotatingFileHandler(
                error_log_file,
                maxBytes=10 * 1024 * 1024,
                backupCount=3,
                encoding='utf-8'
            )
            error_handler.setLevel(logging.ERROR)
            error_handler.setFormatter(StructuredFormatter())
            logger.addHandler(error_handler)
        
        _initialized = True
        
        if production_mode:
            logger.info("日志系统已初始化 (生产模式)")
        else:
            logger.info("日志系统已初始化 (开发模式)")


if __name__ == "__main__":
    # 测试日志
    setup_logging(level="DEBUG")
    logger = get_logger()
    
    logger.debug("这是调试信息")
    logger.info("这是普通信息")
    logger.warning("这是警告信息")
    logger.error("这是错误信息")
    
    log_info("带额外数据的日志", user_id=1, action="test")
