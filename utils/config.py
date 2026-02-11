"""配置管理模块 - 集中管理和验证所有配置项"""

import os
import sys
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


@dataclass
class LLMConfig:
    """LLM 配置"""
    model_id: str = ""
    api_key: str = ""
    base_url: str = ""
    
    def is_valid(self) -> bool:
        """检查配置是否有效"""
        return bool(self.api_key and self.base_url)
    
    def get_missing_fields(self) -> list:
        """获取缺失的必填字段"""
        missing = []
        if not self.api_key:
            missing.append("LLM_API_KEY")
        if not self.base_url:
            missing.append("LLM_BASE_URL")
        return missing


@dataclass
class ServerConfig:
    """服务器配置"""
    host: str = "0.0.0.0"
    port: int = 8080
    debug: bool = False
    environment: str = "development"  # development / production


@dataclass
class DataSourceConfig:
    """数据源配置"""
    source: str = "auto"  # auto / mock / akshare / tushare / eastmoney
    tushare_token: str = ""
    cache_ttl_seconds: int = 300  # 缓存时间 5分钟


@dataclass
class DatabaseConfig:
    """数据库配置"""
    path: str = "./data/fund_assistant.db"


@dataclass
class AppConfig:
    """应用总配置"""
    llm: LLMConfig = field(default_factory=LLMConfig)
    server: ServerConfig = field(default_factory=ServerConfig)
    data_source: DataSourceConfig = field(default_factory=DataSourceConfig)
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    jwt_secret: str = ""
    
    @classmethod
    def from_env(cls) -> "AppConfig":
        """从环境变量加载配置"""
        return cls(
            llm=LLMConfig(
                model_id=os.getenv("LLM_MODEL_ID", ""),
                api_key=os.getenv("LLM_API_KEY", ""),
                base_url=os.getenv("LLM_BASE_URL", ""),
            ),
            server=ServerConfig(
                host=os.getenv("SERVER_HOST", "0.0.0.0"),
                port=int(os.getenv("SERVER_PORT", "8080")),
                debug=os.getenv("DEBUG", "false").lower() == "true",
                environment=os.getenv("ENVIRONMENT", "development"),
            ),
            data_source=DataSourceConfig(
                source=os.getenv("MARKET_DATA_SOURCE", "auto"),
                tushare_token=os.getenv("TUSHARE_TOKEN", ""),
                cache_ttl_seconds=int(os.getenv("CACHE_TTL_SECONDS", "300")),
            ),
            database=DatabaseConfig(
                path=os.getenv("DATABASE_PATH", "./data/fund_assistant.db"),
            ),
            jwt_secret=os.getenv("JWT_SECRET", ""),
        )


# 全局配置实例
_config: Optional[AppConfig] = None


def get_config() -> AppConfig:
    """获取配置单例"""
    global _config
    if _config is None:
        _config = AppConfig.from_env()
    return _config


def validate_config(strict: bool = False) -> Dict[str, Any]:
    """验证配置完整性
    
    Args:
        strict: 严格模式下，LLM 配置缺失会抛出异常
    
    Returns:
        验证结果字典
    """
    config = get_config()
    result = {
        "valid": True,
        "warnings": [],
        "errors": [],
        "config_summary": {}
    }
    
    # 检查 LLM 配置
    if not config.llm.is_valid():
        missing = config.llm.get_missing_fields()
        msg = f"LLM 配置不完整，缺少: {', '.join(missing)}"
        if strict:
            result["errors"].append(msg)
            result["valid"] = False
        else:
            result["warnings"].append(f"{msg} (将使用模拟响应)")
    
    # 检查数据源配置
    if config.data_source.source == "tushare" and not config.data_source.tushare_token:
        result["warnings"].append("TuShare 数据源需要 TUSHARE_TOKEN")
    
    # 检查 JWT 配置
    if not config.jwt_secret:
        result["warnings"].append("JWT_SECRET 未配置，Token 在服务重启后将失效")
    
    # 配置摘要
    result["config_summary"] = {
        "llm_configured": config.llm.is_valid(),
        "llm_model": config.llm.model_id or "(未配置)",
        "server_port": config.server.port,
        "data_source": config.data_source.source,
        "database_path": config.database.path,
        "jwt_configured": bool(config.jwt_secret),
    }
    
    return result


def print_config_status():
    """打印配置状态（启动时使用）"""
    result = validate_config()
    
    print("\n" + "=" * 50)
    print("📋 配置检查结果")
    print("=" * 50)
    
    summary = result["config_summary"]
    
    # LLM 状态
    if summary["llm_configured"]:
        print(f"✅ LLM: {summary['llm_model']}")
    else:
        print(f"⚠️  LLM: 未配置 (Agent 功能将受限)")
    
    # 其他配置
    print(f"✅ 服务端口: {summary['server_port']}")
    print(f"✅ 数据源: {summary['data_source']}")
    print(f"✅ 数据库: {summary['database_path']}")
    
    # 警告
    if result["warnings"]:
        print("\n⚠️  警告:")
        for w in result["warnings"]:
            print(f"   - {w}")
    
    # 错误
    if result["errors"]:
        print("\n❌ 错误:")
        for e in result["errors"]:
            print(f"   - {e}")
    
    print("=" * 50 + "\n")
    
    return result["valid"]


if __name__ == "__main__":
    # 直接运行时测试配置
    print_config_status()
