"""市场数据服务 - 多数据源抽象层，支持自动回退"""

import json
import urllib.request
import urllib.error
import re
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import time
import random
import functools

def rate_limit(min_delay: float = 0.1, max_delay: float = 0.3):
    """Rate limit decorator to prevent 429 errors"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            time.sleep(random.uniform(min_delay, max_delay))
            return func(*args, **kwargs)
        return wrapper
    return decorator



@dataclass
class FundHoldingData:
    """基金重仓股数据"""
    code: str
    name: str
    percent: str      # 持仓占比 e.g. "9.54%"
    current_price: float = 0.0
    change_percent: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "name": self.name,
            "percent": self.percent,
            "current_price": self.current_price,
            "change_percent": self.change_percent,
            "change_percent_str": f"{self.change_percent:+.2f}%"
        }

@dataclass
class FundNavData:
    """基金净值数据"""
    fund_code: str
    fund_name: str
    nav: float  # 当前净值
    estimated_nav: float  # 估算净值
    change_percent: float  # 涨跌幅
    update_time: str
    source: str
    success: bool = True
    error: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "fund_code": self.fund_code,
            "fund_name": self.fund_name,
            "nav": self.nav,
            "estimated_nav": self.estimated_nav,
            "change_percent": self.change_percent,
            "update_time": self.update_time,
            "source": self.source,
            # Validation fields
            "success": self.success,
            "error": self.error
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


@dataclass
class MarketIndexData:
    """市场指数数据"""
    code: str
    name: str
    price: float
    change_percent: float
    source: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "name": self.name,
            "price": self.price,
            "change": f"{self.change_percent:+.2f}%"
        }



@dataclass
class FundManagerData:
    """基金经理数据"""
    id: str
    name: str
    work_time: str  # 任职时间
    fund_size: str  # 管理规模
    term: str  # 任职期限
    return_rate: str  # 任职回报
    image_url: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "work_time": self.work_time,
            "fund_size": self.fund_size,
            "term": self.term,
            "return_rate": self.return_rate,
            "image_url": self.image_url
        }

@dataclass
class FundDetailData:
    """基金详细信息"""
    fund_code: str
    fund_name: str
    fund_type: str
    fund_size: str  # 规模 e.g. "12.34亿元"
    launch_date: str # 成立日期
    benchmark: str # 业绩比较基准
    company: str # 基金公司
    managers: List[FundManagerData]
    source: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "fund_code": self.fund_code,
            "fund_name": self.fund_name,
            "fund_type": self.fund_type,
            "fund_size": self.fund_size,
            "launch_date": self.launch_date,
            "benchmark": self.benchmark,
            "company": self.company,
            "managers": [m.to_dict() for m in self.managers],
            "source": self.source
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


@dataclass
class IntradayValuationPoint:
    """分时估值数据点"""
    time: str  # e.g. "09:30"
    value: float  # 估算涨跌幅
    nav: float  # 估算净值

@dataclass
class IntradayValuationData:
    """分时估值数据"""
    fund_code: str
    fund_name: str
    base_nav: float  # 上一日净值
    points: List[IntradayValuationPoint]
    update_time: str
    source: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "fund_code": self.fund_code,
            "fund_name": self.fund_name,
            "base_nav": self.base_nav,
            "points": [{"time": p.time, "value": p.value, "nav": p.nav} for p in self.points],
            "update_time": self.update_time,
            "source": self.source
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


@dataclass
class FundYieldPoint:
    """累计收益率数据点"""
    date: str
    fund_yield: float      # 本基金收益率 %
    index_yield: float     # 业绩基准收益率 %
    category_yield: float  # 同类平均收益率 %

@dataclass
class FundYieldData:
    """基金累计收益率数据"""
    fund_code: str
    range_type: str        # y/3y/6y/n...
    benchmark_name: str    # e.g. "沪深300"
    points: List[FundYieldPoint]
    source: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "fund_code": self.fund_code,
            "range_type": self.range_type,
            "benchmark_name": self.benchmark_name,
            "points": [
                {
                    "date": p.date,
                    "fund": p.fund_yield,
                    "index": p.index_yield,
                    "category": p.category_yield
                }
                for p in self.points
            ],
            "source": self.source
        }



@dataclass
class HistoricalPoint:
    """历史净值点"""
    date: str
    nav: float  # 单位净值
    accumulated_nav: float  # 累计净值
    change_percent: float # 日涨跌幅

@dataclass
class HistoricalData:
    """历史净值数据"""
    fund_code: str
    points: List[HistoricalPoint]
    source: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "fund_code": self.fund_code,
            "points": [
                {
                    "date": p.date,
                    "nav": p.nav,
                    "accumulated_nav": p.accumulated_nav,
                    "change_percent": p.change_percent
                } for p in self.points
            ],
            "source": self.source
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


@dataclass
class FundSearchResult:
    """基金搜索结果"""
    code: str
    name: str
    type: str
    nav: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "name": self.name,
            "type": self.type,
            "nav": self.nav
        }


@dataclass
class FundDiagnosticData:
    """基金诊断数据"""
    fund_code: str
    score: int
    summary: str
    factors: Dict[str, Any]  # e.g., {'manager': 80, 'performance': 70}
    source: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "fund_code": self.fund_code,
            "score": self.score,
            "summary": self.summary,
            "factors": self.factors,
            "source": self.source
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


import asyncio

class DataSourceBase(ABC):
    """数据源基类"""
    
    name: str = "base"
    
    @abstractmethod
    def get_fund_nav(self, fund_code: str) -> Optional[FundNavData]:
        """获取基金净值"""
        pass
    
    async def get_fund_nav_async(self, fund_code: str) -> Optional[FundNavData]:
        """异步获取基金净值"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_fund_nav, fund_code)

    @abstractmethod
    def get_market_indices(self) -> List[MarketIndexData]:
        """获取市场指数"""
        pass
        
    async def get_market_indices_async(self) -> List[MarketIndexData]:
        """异步获取市场指数"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_market_indices)

    def get_funds_nav(self, fund_codes: List[str]) -> Dict[str, Optional[FundNavData]]:
        """批量获取基金净值 (默认循环调用，子类可优化)"""
        results = {}
        for code in fund_codes:
            results[code] = self.get_fund_nav(code)
        return results
        
    async def get_funds_nav_async(self, fund_codes: List[str]) -> Dict[str, Optional[FundNavData]]:
        """异步批量获取基金净值"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_funds_nav, fund_codes)

    def get_fund_details(self, fund_code: str) -> Optional[FundDetailData]:
        """获取基金详情 (默认返回空)"""
        return None
        
    async def get_fund_details_async(self, fund_code: str) -> Optional[FundDetailData]:
        """异步获取基金详情"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_fund_details, fund_code)

    @abstractmethod
    def get_intraday_valuation(self, fund_code: str) -> Optional[IntradayValuationData]:
        """获取分时估值"""
        pass
        
    async def get_intraday_valuation_async(self, fund_code: str) -> Optional[IntradayValuationData]:
        """异步获取分时估值"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_intraday_valuation, fund_code)

    @abstractmethod
    def get_historical_nav(self, fund_code: str, range_type: str = "y") -> Optional[HistoricalData]:
        """获取历史净值"""
        pass
        
    async def get_historical_nav_async(self, fund_code: str, range_type: str = "y") -> Optional[HistoricalData]:
        """异步获取历史净值"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_historical_nav, fund_code, range_type)

    def search_fund(self, keyword: str) -> List[FundSearchResult]:
        """搜索基金"""
        return []
        
    async def search_fund_async(self, keyword: str) -> List[FundSearchResult]:
        """异步搜索基金"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.search_fund, keyword)

    def get_fund_rankings(self, sort_by: str = "1r", limit: int = 10) -> List[FundNavData]:
        """获取基金排行
        sort_by: 1r (日涨跌), 1w, 1m, 3m, 6m, 1y, 3y
        """
        return []
        
    async def get_fund_rankings_async(self, sort_by: str = "1r", limit: int = 10) -> List[FundNavData]:
        """异步获取基金排行"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_fund_rankings, sort_by, limit)

    def get_historical_yield(self, fund_code: str, range_type: str = "y") -> Optional[FundYieldData]:
        """获取累计收益率走势 (对比指数/同类)
        range_type: y(1年), 3y, 6y, n(今年以来)
        """
        return None
        
    async def get_historical_yield_async(self, fund_code: str, range_type: str = "y") -> Optional[FundYieldData]:
        """异步获取累计收益率走势"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_historical_yield, fund_code, range_type)

    def get_fund_diagnostic(self, fund_code: str) -> Optional[FundDiagnosticData]:
        """获取基金诊断"""
        return None
        
    async def get_fund_diagnostic_async(self, fund_code: str) -> Optional[FundDiagnosticData]:
        """异步获取基金诊断"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_fund_diagnostic, fund_code)

    def get_fund_holdings(self, fund_code: str) -> List[FundHoldingData]:
        """获取基金重仓股"""
        return []

    async def get_fund_holdings_async(self, fund_code: str) -> List[FundHoldingData]:
        """异步获取基金重仓股"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_fund_holdings, fund_code)


class EastMoneyDataSource(DataSourceBase):
    """东方财富/天天基金数据源"""
    
    name = "eastmoney"
    
    def get_fund_nav(self, fund_code: str) -> Optional[FundNavData]:
        """从天天基金获取实时估值"""
        try:
            url = f"http://fundgz.1234567.com.cn/js/{fund_code}.js"
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                'Referer': 'http://fund.eastmoney.com/'
            })
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read().decode('utf-8')
                match = re.search(r'jsonpgz\((.*?)\)', content)
                if match:
                    data = json.loads(match.group(1))
                    return FundNavData(
                        fund_code=data.get("fundcode", fund_code),
                        fund_name=data.get("name", f"基金{fund_code}"),
                        nav=float(data.get("dwjz", 0)),
                        estimated_nav=float(data.get("gsz", 0)),
                        change_percent=float(data.get("gszzl", 0)),
                        update_time=data.get("gztime", ""),
                        source=self.name
                    )
        except Exception as e:
            return None
        return None
    
    def get_market_indices(self) -> List[MarketIndexData]:
        """从东方财富获取市场指数"""
        indices = []
        try:
            url = "http://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f12,f14&secids=1.000001,0.399001,0.399006,1.000300,1.000016"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                content = response.read().decode('utf-8')
                data = json.loads(content)
                if data.get("data", {}).get("diff"):
                    for item in data["data"]["diff"]:
                        indices.append(MarketIndexData(
                            code=item.get("f12", ""),
                            name=item.get("f14", ""),
                            price=float(item.get("f2", 0)),
                            change_percent=float(item.get("f3", 0)),
                            source=self.name
                        ))
        except Exception as e:
            pass
        return indices

    def get_intraday_valuation(self, fund_code: str) -> Optional[IntradayValuationData]:
        return None

    def get_historical_nav(self, fund_code: str, range_type: str = "y") -> Optional[HistoricalData]:
        return None


class EastmoneyMobileDataSource(EastMoneyDataSource):
    """东方财富/天天基金移动端数据源 (API - 更稳定)"""
    
    name = "eastmoney_mobile"
    
    def get_fund_nav(self, fund_code: str) -> Optional[FundNavData]:
        """从天天基金移动端 API 获取实时估值"""
        try:
            # 使用固定 deviceid 模拟 App
            device_id = "HelloAgentsMobile"
            url = f"https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?pageIndex=1&pageSize=200&Fcodes={fund_code}&deviceid={device_id}&plat=Wap&product=EFund&Version=1"
            
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                'Referer': 'https://fundmobapi.eastmoney.com/'
            })
            
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read().decode('utf-8')
                data = json.loads(content)
                
                if data.get("Datas") and len(data["Datas"]) > 0:
                    fund_data = data["Datas"][0]
                    
                    # 处理可能为 null 的字段
                    nav = float(fund_data.get("NAV") or 0)
                    gsz = float(fund_data.get("GSZ") or nav) # 如果没有估值，使用净值
                    gszzl = float(fund_data.get("GSZZL") or 0)
                    gztime = fund_data.get("GZTIME") or data.get("Expansion", {}).get("GZTIME", "")
                    
                    return FundNavData(
                        fund_code=fund_data.get("FCODE", fund_code),
                        fund_name=fund_data.get("SHORTNAME", f"基金{fund_code}"),
                        nav=nav,
                        estimated_nav=gsz,
                        change_percent=gszzl,
                        update_time=gztime,
                        source=self.name
                    )
        except Exception as e:
            # print(f"Error fetching mobile data: {e}")
            return None
        return None
        
    @rate_limit(0.1, 0.3)
    def get_funds_nav(self, fund_codes: List[str]) -> Dict[str, Optional[FundNavData]]:
        """批量获取基金净值 (使用 Mobile API 批量接口)"""
        if not fund_codes:
            return {}
            
        results = {}
        # Mobile API 支持批量, 每次最多 200 个? 假设 url 长度限制，分批处理
        batch_size = 50
        
        for i in range(0, len(fund_codes), batch_size):
            batch_codes = fund_codes[i:i+batch_size]
            codes_str = ",".join(batch_codes)
            
            try:
                device_id = "HelloAgentsMobile"
                url = f"https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?pageIndex=1&pageSize=200&Fcodes={codes_str}&deviceid={device_id}&plat=Wap&product=EFund&Version=1"
                
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                    'Referer': 'https://fundmobapi.eastmoney.com/'
                })
                
                with urllib.request.urlopen(req, timeout=10) as response:
                    content = response.read().decode('utf-8')
                    data = json.loads(content)
                    
                    if data.get("Datas"):
                        for fund_data in data["Datas"]:
                            fcode = fund_data.get("FCODE")
                            if not fcode:
                                continue
                                

                            nav = float(fund_data.get("NAV") or 0)
                            gsz = float(fund_data.get("GSZ") or nav)
                            # Fallback to NAVCHGRT if GSZZL (real-time) is missing
                            gszzl = float(fund_data.get("GSZZL") or fund_data.get("NAVCHGRT") or 0)
                            # Fallback to PDATE if GZTIME is missing
                            gztime = fund_data.get("GZTIME") or data.get("Expansion", {}).get("GZTIME") or fund_data.get("PDATE", "")
                            
                            results[fcode] = FundNavData(
                                fund_code=fcode,
                                fund_name=fund_data.get("SHORTNAME", f"基金{fcode}"),
                                nav=nav,
                                estimated_nav=gsz,
                                change_percent=gszzl,
                                update_time=gztime,
                                source=self.name
                            )
            except Exception as e:
                pass
                # partial failure is acceptable for batch
                
        # Fill missing with None
        for code in fund_codes:
            if code not in results:
                results[code] = None
                
        return results

    @rate_limit(0.2, 0.5)
    def get_fund_details(self, fund_code: str) -> Optional[FundDetailData]:
        """获取基金详情和经理信息"""
        try:
            # 1. 获取基本信息
            base_url = f"https://fundmobapi.eastmoney.com/FundMApi/FundBaseTypeInformation.ashx?FCODE={fund_code}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0"
            
            req = urllib.request.Request(base_url, headers={
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                'Referer': 'https://fundmobapi.eastmoney.com/'
            })
            
            managers = []
            info = {}
            
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read().decode('utf-8')
                data = json.loads(content)
                if data.get("Datas"):
                    info = data["Datas"]

            # 2. 获取经理列表
            mgr_url = f"https://fundmobapi.eastmoney.com/FundMApi/FundManagerList.ashx?FCODE={fund_code}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0"
            req_mgr = urllib.request.Request(mgr_url, headers={
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                'Referer': 'https://fundmobapi.eastmoney.com/'
            })
            
            with urllib.request.urlopen(req_mgr, timeout=10) as response:
                content = response.read().decode('utf-8')
                data = json.loads(content)
                if data.get("Datas"):
                    for m in data["Datas"]:

                        managers.append(FundManagerData(
                            id=m.get("MGRID", "") or m.get("MCODE", ""),
                            name=m.get("MGRNAME", "") or m.get("MNAME", ""),
                            work_time=m.get("FEMPDATE", "") or m.get("WORKTIME", ""), # 任职起始日期
                            fund_size=m.get("MGMoney", ""),
                            term=str(m.get("DAYS", "")), # 任职天数
                            return_rate=str(m.get("PENAVGROWTH", "")), # 任职回报
                            image_url=m.get("PHOTOURL", "")
                        ))

            if not info:
                return None
                
            return FundDetailData(
                fund_code=fund_code,
                fund_name=info.get("SHORTNAME", ""),
                fund_type=info.get("FTYPE", ""),
                fund_size=info.get("ENDNAV", ""), # 规模? ENDNAV is usually Net Asset Value total? Or check fields.
                # Datas fields: SHORTNAME, FTYPE, RLEVEL_SZ, ESTABDATE, BENCH, JJGS
                launch_date=info.get("ESTABDATE", ""),
                benchmark=info.get("BENCH", ""),
                company=info.get("JJGS", ""),
                managers=managers,
                source=self.name
            )

        except Exception as e:
            # print(f"Error fetching fund details: {e}")
            return None

    @rate_limit(0.1, 0.3)
    def get_intraday_valuation(self, fund_code: str) -> Optional[IntradayValuationData]:
        """获取分时估值数据 (FundVarietieValuationDetail)"""
        try:
            url = f"https://fundmobapi.eastmoney.com/FundMApi/FundVarietieValuationDetail.ashx?FCODE={fund_code}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0"
            
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                'Referer': 'https://fundmobapi.eastmoney.com/'
            })
            
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read().decode('utf-8')
                data = json.loads(content)
                
                if data.get("Datas") and len(data["Datas"]) > 0:
                    points = []
                    for item in data["Datas"]:
                        # item format: "time,nav,change_pct"
                        parts = item.split(",")
                        if len(parts) >= 3:
                            points.append(IntradayValuationPoint(
                                time=parts[0],
                                value=float(parts[2]),  # 估算涨跌幅
                                nav=float(parts[1]) if parts[1] else 0  # 估算净值
                            ))
                    
                    expansion = data.get("Expansion", {})
                    base_nav = float(expansion.get("DWJZ", 1))
                    
                    return IntradayValuationData(
                        fund_code=fund_code,
                        fund_name=expansion.get("SHORTNAME", ""),
                        base_nav=base_nav,
                        points=points,
                        update_time=expansion.get("GZTIME", ""),
                        source=self.name
                    )
        except Exception as e:
            # print(f"Error fetching intraday valuation: {e}")
            return None
        return None


    @rate_limit(0.2, 0.5)
    def get_historical_nav(self, fund_code: str, range_type: str = "y") -> Optional[HistoricalData]:
        """获取历史净值 (FundNetDiagram)
        range_type: y(1年), 3y(3年), 6y(6年), n(今年以来), 3n, 5n
        """
        try:
            url = f"https://fundmobapi.eastmoney.com/FundMApi/FundNetDiagram.ashx?FCODE={fund_code}&RANGE={range_type}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0"
            print(f"DEBUG: Fetching historical nav from {url}")
            
            # Reduce timeout to 5s to fail faster
            with urllib.request.urlopen(url, timeout=5) as response:
                content = response.read().decode('utf-8')
                print(f"DEBUG: Got response length {len(content)}")
                data = json.loads(content)
                
                if data.get("ErrCode") != 0 or not data.get("Datas"):
                    return None
                    
                datas = data["Datas"]
                points = []
                
                # Examples: {'FSRQ': '2026-01-06', 'DWJZ': '5.5176', 'JZZZL': '1.39', 'LJJZ': '7.3076', ...}
                for item in datas:
                    points.append(HistoricalPoint(
                        date=item.get("FSRQ", ""),
                        nav=float(item.get("DWJZ", 0) if item.get("DWJZ") else 0),
                        accumulated_nav=float(item.get("LJJZ", 0) if item.get("LJJZ") else 0),
                        change_percent=float(item.get("JZZZL", 0) if item.get("JZZZL") else 0)
                    ))
                    
                return HistoricalData(
                    fund_code=fund_code,
                    points=points,
                    source=self.name
                )
        except Exception as e:
            print(f"Error fetching historical nav for {fund_code}: {e}")
            import traceback
            traceback.print_exc()
            return None

    def search_fund(self, keyword: str) -> List[FundSearchResult]:
        """搜索基金 (使用 Suggest API)"""
        try:
            import urllib.parse
            encoded_keyword = urllib.parse.quote(keyword)
            # Use Suggest API as it returns richer data and is more reliable for simple queries
            url = f"https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key={encoded_keyword}"
            
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                'Referer': 'https://fundmobapi.eastmoney.com/'
            })
            
            try:
                with urllib.request.urlopen(req, timeout=5) as response:
                    content = response.read().decode('utf-8')
                    data = json.loads(content)
                    
                    results = []
                    if data.get("Datas"):
                        for item in data["Datas"]:
                            # item format: {"CODE": "...", "NAME": "...", "FundBaseInfo": {...}}
                            base_info = item.get("FundBaseInfo", {})
                            
                            results.append(FundSearchResult(
                                code=item.get("CODE", ""),
                                name=item.get("NAME", ""),
                                type=base_info.get("FTYPE", item.get("CATEGORYDESC", "基金")),
                                nav=float(base_info.get("DWJZ", 0)) if base_info.get("DWJZ") else 0.0
                            ))
                    return results
            except:
                 pass
            return []
        except Exception as e:
            # print(f"Error searching fund: {e}")
            return []

    def get_fund_rankings(self, sort_by: str = "1r", limit: int = 20) -> List[FundNavData]:
        """获取基金排行 (Real API)
        sort_by: 
            1r  (日涨幅 desc)
            1r_asc (日涨幅 asc)
            1w  (周涨幅)
            1m  (月涨幅)
            3m  (3月涨幅)
            6m  (6月涨幅)
            1y  (1年涨幅)
            3y  (3年涨幅)
            n   (今年以来)
        """
        # Mapping sort_by to API parameters
        # API params: SortColumn=SYL_1N (1 Year), Sort=desc
        # Default to 1 Year if unknown? Or Day? 
        # Actually daily change is rarely used for ranking long term, but let's see.
        
        sort_map = {
            "1r": "zzf",  # 日增长率
            "1w": "1zzf", # 近1周
            "1m": "1yf",  # 近1月
            "3m": "3yf",  # 近3月
            "6m": "6yf",  # 近6月
            "1y": "1nf",  # 近1年
            "2y": "2nf",  # 近2年
            "3y": "3nf",  # 近3年
            "n":  "jnf",  # 今年来
        }
        
        # Handle _asc suffix
        base_sort = sort_by.replace("_asc", "")
        sc = sort_map.get(base_sort, "zzf") 
        # PC API st: desc=desc, asc=asc
        st = "asc" if sort_by.endswith("_asc") else "desc"
        
        try:
            # 使用 PC 端排行接口
            url = "http://fund.eastmoney.com/data/rankhandler.aspx"
            params = {
                "op": "ph",
                "dt": "kf",
                "ft": "all",
                "rs": "",
                "gs": "0",
                "sc": sc,  # Sort Column
                "st": st,  # Sort Type
                "sd": (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d"),
                "ed": datetime.now().strftime("%Y-%m-%d"),
                "qdii": "",
                "tabSubtype": ",,,,",
                "pi": 1,
                "pn": limit,
                "dx": 1
            }
            
            headers = {
                "Referer": "http://fund.eastmoney.com/data/fundranking.html",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
            }
            
            req = urllib.request.Request(f"{url}?{urllib.parse.urlencode(params)}", headers=headers)
            print(f"DEBUG: Fetching rankings from {req.full_url}")
            
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read().decode('utf-8')
                
                # Parse JSONP: var rankData = {datas:[...], ...};
                import re
                match = re.search(r'datas:\[(.*?)\]', content)
                if not match:
                    return []
                
                # Easy way: split by "",""
                data_str = match.group(1)
                if not data_str:
                    return []
                    
                # Split by "," effectively
                items = data_str.split('","')
                
                funds = []
                for item_str in items:
                    # Clean up quotes
                    item_str = item_str.replace('"', '')
                    parts = item_str.split(',')
                    
                    if len(parts) < 15: continue
                    
                    try:
                        fcode = parts[0]
                        fname = parts[1]
                        nav = float(parts[4] if parts[4] else 0)
                        acc_nav = float(parts[5] if parts[5] else 0)
                        
                        # Use daily rate for change_percent
                        daily_rate = float(parts[6] if parts[6] else 0)
                        
                        update_time = parts[3]
                        
                        funds.append(FundNavData(
                            fund_code=fcode,
                            fund_name=fname,
                            nav=nav,
                            estimated_nav=acc_nav, 
                            change_percent=daily_rate,
                            update_time=update_time,
                            source=self.name
                        ))
                    except Exception as e:
                        print(f"Error parsing fund item {parts[0]}: {e}")
                        continue
                        
                return funds
            
        except Exception as e:
            print(f"Error fetching fund rankings: {e}")
            import traceback
            traceback.print_exc()
            return []

    @rate_limit(0.2, 0.5)
    def get_historical_yield(self, fund_code: str, range_type: str = "y") -> Optional[FundYieldData]:
        """获取累计收益率走势 (FundYieldDiagramNew)"""
        try:
            url = f"https://fundmobapi.eastmoney.com/FundMApi/FundYieldDiagramNew.ashx?FCODE={fund_code}&RANGE={range_type}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0"
            
            with urllib.request.urlopen(url, timeout=10) as response:
                content = response.read().decode('utf-8')
                data = json.loads(content)
                
                if not data.get("Datas"):
                    return None
                    
                points = []
                # Datas: [{'PDATE': '2024-02-07', 'YIELD': '-1.23', 'INDEXYIED': '-0.5', 'FUNDTYPEYIED': '-0.8'}, ...]
                for item in data["Datas"]:
                    points.append(FundYieldPoint(
                        date=item.get("PDATE", ""),
                        fund_yield=float(item.get("YIELD", 0)),
                        index_yield=float(item.get("INDEXYIED", 0)),
                        category_yield=float(item.get("FUNDTYPEYIED", 0))
                    ))
                
                expansion = data.get("Expansion", {})
                benchmark = expansion.get("INDEXNAME", "业绩基准")
                
                return FundYieldData(
                    fund_code=fund_code,
                    range_type=range_type,
                    benchmark_name=benchmark,
                    points=points,
                    source=self.name
                )
        except Exception as e:
            # print(f"Error fetching historical yield: {e}")
            return None

    @rate_limit(0.1, 0.3)
    def get_fund_diagnostic(self, fund_code: str) -> Optional[FundDiagnosticData]:
        """获取基金诊断 (基于详情的简单计算)"""
        try:
            # 依赖于详情数据
            detail = self.get_fund_details(fund_code)
            if not detail:
                return None
                
            score = 60 # 基础分
            factors = {"foundation": 60, "manager": 60, "performance": 60}
            summary = "Fund performance is stable."
            
            # 1. 规模分析
            if detail.fund_size:
                try:
                    size_val = float(re.search(r'[\d\.]+', detail.fund_size).group())
                    if "亿" in detail.fund_size:
                        if size_val > 100: factors["foundation"] += 20
                        elif size_val > 50: factors["foundation"] += 15
                        elif size_val > 10: factors["foundation"] += 10
                        elif size_val < 0.5: factors["foundation"] -= 10 # 迷你基风险
                except: pass
                
            # 2. 经理分析
            if detail.managers:
                mgr = detail.managers[0]
                # 任职时间
                if mgr.work_time:
                    if "年" in mgr.work_time:
                         match = re.search(r'(\d+)年', mgr.work_time)
                         if match:
                             years = int(match.group(1))
                             if years > 5: factors["manager"] += 20
                             elif years > 3: factors["manager"] += 10
                             elif years < 1: factors["manager"] -= 5
                
                # 回报
                try:
                    ret = float(mgr.return_rate)
                    if ret > 100: factors["performance"] += 20
                    elif ret > 50: factors["performance"] += 10
                    elif ret < 0: factors["performance"] -= 10
                except: pass

            # 计算总分
            score = int((factors["foundation"] + factors["manager"] * 1.5 + factors["performance"] * 1.5) / 4)
            score = min(99, max(40, score))
            
            summary = f"综合评分 {score} 分。基金规模适中，经理经验丰富。" if score > 75 else "综合评分一般，建议谨慎关注。"
            
            return FundDiagnosticData(
                fund_code=fund_code,
                score=score,
                summary=summary,
                factors=factors,
                source=self.name
            )

        except Exception as e:
            # print(f"Error getting diagnostic: {e}")
            return None

    @rate_limit(0.1, 0.3)
    def get_fund_holdings(self, fund_code: str) -> List[FundHoldingData]:
        """获取基金重仓股 (解析 HTML + 实时行情)"""
        import re
        holdings = []
        try:
            # 1. 获取持仓 HTML
            url = f"http://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code={fund_code}&topline=10"
            req = urllib.request.Request(url, headers={
                 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                 'Referer': 'http://fund.eastmoney.com/'
            })
            
            stock_infos = [] # (secid, code, name, percent)
            
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read().decode('utf-8')
                
                # 提取 secids (用于查询实时行情)
                # Link format: //quote.eastmoney.com/unify/r/1.600519
                # Table row format is complex, but links contain the secid
                # We need to associate secid with percentage.
                
                # Approach: Parse <tbody> rows
                # <tr>...<a href='.../r/(secid)'>code</a>...<td class='toc'>percent%</td>...</tr>
                
                # Regex to capture one row's data
                # Step 1: Find valid rows
                rows = re.findall(r"<tr>(.*?)</tr>", content)
                
                for row in rows:
                    if "quote.eastmoney.com" not in row:
                        continue
                        
                    try:
                        # Extract secid
                        secid_match = re.search(r"quote\.eastmoney\.com/unify/r/([\d\.]+)", row)
                        if not secid_match: continue
                        secid = secid_match.group(1)
                        
                        # Extract code (displayed text in anchor) - optional, use f12 from API
                        
                        # Extract percent
                        # <td class='toc'>9.54%</td>
                        percent_match = re.findall(r"<td class='toc'>([\d\.]+)%</td>", row)
                        percent = f"{percent_match[0]}%" if percent_match else "--"
                        
                        stock_infos.append({"secid": secid, "percent": percent})
                    except:
                        continue
            
            if not stock_infos:
                return []
                
            # 2. 批量获取实时行情
            secids_str = ",".join([s["secid"] for s in stock_infos])
            url_quote = f"http://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f12,f14&secids={secids_str}"
            
            realtime_map = {}
            try:
                with urllib.request.urlopen(url_quote, timeout=5) as response:
                    data = json.loads(response.read().decode('utf-8'))
                    if data.get("data", {}).get("diff"):
                         for item in data["data"]["diff"]:
                             # Key by code (f12) is tricky if multiple markets have same code?
                             # secids usually distinct.
                             # But response doesn't return secid, only f12.
                             # We need to map back.
                             # Fortunately, we can map by iterating carefully or assuming order?
                             # No, order is not guaranteed.
                             # However, secid usually contains code. 1.600519 -> 600519.
                             realtime_map[item["f12"]] = item
            except:
                pass
                
            # 3. 合并数据
            for info in stock_infos:
                # Parse code from secid (e.g., 1.600519 -> 600519, 116.00700 -> 00700)
                code = info["secid"].split(".")[-1]
                
                rt_data = realtime_map.get(code, {})
                
                holdings.append(FundHoldingData(
                    code=code,
                    name=rt_data.get("f14", code), # Use real name if available
                    percent=info["percent"],
                    current_price=float(rt_data.get("f2", 0)),
                    change_percent=float(rt_data.get("f3", 0))
                ))
                
            return holdings

        except Exception as e:
            # print(f"Error fetching holdings: {e}")
            return []


class AKShareDataSource(DataSourceBase):
    """AKShare 数据源 (需要安装 akshare 库)"""
    
    name = "akshare"
    _akshare = None
    MAX_RETRIES = 3
    
    def __init__(self):
        try:
            # import akshare as ak
            # self._akshare = ak
            self._akshare = None
        except ImportError:
            self._akshare = None
    
    @property
    def available(self) -> bool:
        return self._akshare is not None
    
    def _retry(self, func, *args, **kwargs):
        """带重试的调用封装"""
        import time
        last_error = None
        for attempt in range(self.MAX_RETRIES):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_error = e
                if attempt < self.MAX_RETRIES - 1:
                    time.sleep(0.5 * (attempt + 1))  # 递增延迟
        return None
    
    def get_fund_nav(self, fund_code: str) -> Optional[FundNavData]:
        """从 AKShare 获取基金净值"""
        if not self.available:
            return None
        
        try:
            # 尝试获取开放式基金实时信息
            df = self._retry(self._akshare.fund_open_fund_info_em, symbol=fund_code, indicator="单位净值走势")
            if df is not None and len(df) > 0:
                latest = df.iloc[-1]
                nav_value = float(latest.get("单位净值", latest.iloc[1] if len(latest) > 1 else 0))
                date_value = str(latest.get("净值日期", latest.iloc[0] if len(latest) > 0 else ""))
                
                # 获取基金名称
                fund_name = f"基金{fund_code}"
                try:
                    name_df = self._akshare.fund_em_fund_name()
                    if name_df is not None:
                        match = name_df[name_df["基金代码"] == fund_code]
                        if len(match) > 0:
                            fund_name = match.iloc[0].get("基金简称", fund_name)
                except:
                    pass
                
                return FundNavData(
                    fund_code=fund_code,
                    fund_name=fund_name,
                    nav=nav_value,
                    estimated_nav=nav_value,
                    change_percent=0.0,  # 历史净值无涨跌幅
                    update_time=date_value,
                    source=self.name
                )
        except Exception as e:
            print(f"[AKShare] 获取基金 {fund_code} 净值失败: {e}")
        return None
    
    def get_market_indices(self) -> List[MarketIndexData]:
        """从 AKShare 获取市场指数"""
        if not self.available:
            return []
        
        indices = []
        try:
            df = self._retry(self._akshare.stock_zh_index_spot_em)
            if df is None:
                return []
            target_codes = ["000001", "399001", "399006", "000300", "000016"]
            for _, row in df.iterrows():
                code = str(row.get("代码", ""))
                if code in target_codes:
                    indices.append(MarketIndexData(
                        code=code,
                        name=row.get("名称", ""),
                        price=float(row.get("最新价", 0)),
                        change_percent=float(row.get("涨跌幅", 0)),
                        source=self.name
                    ))
        except Exception as e:
            print(f"[AKShare] 获取市场指数失败: {e}")
        return indices

    def get_intraday_valuation(self, fund_code: str) -> Optional[IntradayValuationData]:
        return None

    def get_historical_nav(self, fund_code: str, range_type: str = "y") -> Optional[HistoricalData]:
        return None


class MockDataSource(DataSourceBase):
    """模拟数据源 (用于开发和测试)"""
    
    name = "mock"
    
    # 模拟基金数据
    MOCK_FUNDS = {
        "110011": {"name": "易方达中小盘混合", "nav": 5.8234},
        "161725": {"name": "招商中证白酒指数", "nav": 1.7856},
        "000001": {"name": "华夏成长混合", "nav": 1.2341},
        "519068": {"name": "汇添富成长焦点混合", "nav": 3.4521},
        "163406": {"name": "兴全合润混合", "nav": 2.1234},
    }
    
    def get_fund_nav(self, fund_code: str) -> FundNavData:
        """生成模拟基金数据"""
        import random
        
        fund_info = self.MOCK_FUNDS.get(fund_code, {
            "name": f"基金{fund_code}",
            "nav": 1.0 + random.random()
        })
        
        nav = fund_info["nav"]
        change = (random.random() - 0.5) * 4  # -2% ~ +2%
        estimated = nav * (1 + change / 100)
        
        return FundNavData(
            fund_code=fund_code,
            fund_name=fund_info["name"],
            nav=round(nav, 4),
            estimated_nav=round(estimated, 4),
            change_percent=round(change, 2),
            update_time=datetime.now().strftime("%Y-%m-%d %H:%M"),
            source=self.name
        )
    
    def get_market_indices(self) -> List[MarketIndexData]:
        """生成模拟指数数据"""
        import random
        
        mock_indices = [
            ("000001", "上证指数", 3150.0),
            ("399001", "深证成指", 10200.0),
            ("399006", "创业板指", 2050.0),
            ("000300", "沪深300", 3680.0),
            ("000016", "上证50", 2450.0),
        ]
        
        return [
            MarketIndexData(
                code=code,
                name=name,
                price=round(base * (1 + (random.random() - 0.5) * 0.02), 2),
                change_percent=round((random.random() - 0.5) * 2, 2),
                source=self.name
            )
            for code, name, base in mock_indices
        ]

    def get_intraday_valuation(self, fund_code: str) -> Optional[IntradayValuationData]:
        return None

    def get_historical_nav(self, fund_code: str, range_type: str = "y") -> Optional[HistoricalData]:
        return None


class MarketDataService:
    """市场数据服务 - 多数据源管理"""
    
    # 缓存大小限制
    MAX_CACHE_SIZE = 100
    
    def __init__(self, preferred_source: str = "auto", production_mode: bool = None):
        """
        Args:
            preferred_source: 首选数据源 (auto/eastmoney/akshare/mock)
            production_mode: 生产模式（禁止 mock 回退）
        """
        import os
        self._sources = {
            "eastmoney_mobile": EastmoneyMobileDataSource(),
            "eastmoney": EastMoneyDataSource(),
            "akshare": AKShareDataSource(),
            "mock": MockDataSource(),
        }
        self._preferred = preferred_source
        self._cache: Dict[str, tuple] = {}  # {key: (data, timestamp)}
        self._cache_ttl = 300  # 5分钟缓存
        
        # 生产模式检测
        if production_mode is None:
            self._production_mode = os.getenv("ENVIRONMENT", "development").lower() == "production"
        else:
            self._production_mode = production_mode
        
        # 数据源状态追踪
        self._source_status: Dict[str, dict] = {
            "eastmoney_mobile": {"status": "unknown", "last_success": None, "last_error": None, "error_count": 0},
            "eastmoney": {"status": "unknown", "last_success": None, "last_error": None, "error_count": 0},
            "akshare": {"status": "unknown", "last_success": None, "last_error": None, "error_count": 0},
            "mock": {"status": "ok", "last_success": None, "last_error": None, "error_count": 0},
        }
    
    def get_health(self) -> Dict[str, Any]:
        """获取数据源健康状态"""
        return {
            "preferred_source": self._preferred,
            "production_mode": self._production_mode,
            "cache_size": len(self._cache),
            "cache_max_size": self.MAX_CACHE_SIZE,
            "sources": self._source_status
        }
    
    def check_source_health(self, source_name: str) -> Dict[str, Any]:
        """检查特定数据源健康状态"""
        source = self._sources.get(source_name)
        if not source:
            return {"status": "error", "message": f"未知数据源: {source_name}"}
        
        try:
            # 尝试获取一个测试基金的数据
            result = source.get_fund_nav("000001")
            if result:
                self._source_status[source_name]["status"] = "ok"
                self._source_status[source_name]["last_success"] = datetime.now().isoformat()
                self._source_status[source_name]["error_count"] = 0
                return {"status": "ok", "source": source_name}
            else:
                self._source_status[source_name]["status"] = "degraded"
                return {"status": "degraded", "source": source_name, "message": "无数据返回"}
        except Exception as e:
            self._source_status[source_name]["status"] = "error"
            self._source_status[source_name]["last_error"] = str(e)
            self._source_status[source_name]["error_count"] += 1
            return {"status": "error", "source": source_name, "message": str(e)}
    
    def _get_from_cache(self, key: str) -> Optional[Any]:
        """从缓存获取数据"""
        if key in self._cache:
            data, timestamp = self._cache[key]
            if datetime.now().timestamp() - timestamp < self._cache_ttl:
                return data
            del self._cache[key]
        return None
    
    def _set_cache(self, key: str, data: Any):
        """设置缓存 (带 LRU 限制)"""
        # 如果缓存已满，删除最旧的条目
        if len(self._cache) >= self.MAX_CACHE_SIZE:
            oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
            del self._cache[oldest_key]
        self._cache[key] = (data, datetime.now().timestamp())
    
    def clear_cache(self):
        """清空缓存"""
        self._cache.clear()
    
    def _get_source_order(self) -> List[str]:
        """获取数据源尝试顺序"""
        if self._preferred == "mock":
            if self._production_mode:
                print("[WARN] 生产环境不允许使用 mock 数据源，已切换到 auto 模式")
                return ["eastmoney", "akshare"]
            return ["mock"]
        elif self._preferred in self._sources:
            # 首选 -> 其他 -> mock (生产环境不包含 mock)
            order = [self._preferred]
            for name in ["eastmoney", "akshare"]:
                if name != self._preferred:
                    order.append(name)
            if not self._production_mode:
                order.append("mock")
            return order
        else:  # auto
            if self._production_mode:
                return ["eastmoney_mobile", "eastmoney", "akshare"]  # 生产环境不回退到 mock
            return ["eastmoney_mobile", "eastmoney", "akshare", "mock"]
    
    def get_fund_nav(self, fund_code: str) -> FundNavData:
        """获取基金净值 (自动回退)"""
        # 检查缓存
        cache_key = f"nav_{fund_code}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
            
        # 尝试各数据源
        result = None
        for source_name in self._get_source_order():
            source = self._sources.get(source_name)
            if not source:
                continue
                
            try:
                result = source.get_fund_nav(fund_code)
                if result:
                    # 记录成功
                    if source_name != "mock":
                       self._source_status[source_name]["last_success"] = datetime.now().isoformat()
                       self._source_status[source_name]["status"] = "ok"
                       self._source_status[source_name]["error_count"] = 0
                       
                    break
            except Exception as e:
                # 记录失败
                if source_name != "mock":
                    self._source_status[source_name]["last_error"] = str(e)
                    self._source_status[source_name]["error_count"] += 1
                    if self._source_status[source_name]["error_count"] >= 3:
                        self._source_status[source_name]["status"] = "error"
        
        if result:
            self._set_cache(cache_key, result)
            return result
        
        # 全部失败，返回模拟数据
        return self._sources["mock"].get_fund_nav(fund_code)
    
    def get_market_indices(self) -> List[MarketIndexData]:
        """获取市场指数 (自动回退)"""
        cache_key = "indices"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        for source_name in self._get_source_order():
            source = self._sources.get(source_name)
            if source:
                try:
                    result = source.get_market_indices()
                    if result:
                        self._set_cache(cache_key, result)
                        return result
                except Exception:
                    continue
        
        return self._sources["mock"].get_market_indices()

    async def get_fund_nav_async(self, fund_code: str) -> FundNavData:
        """异步获取基金净值"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_fund_nav, fund_code)

    async def get_market_indices_async(self) -> List[MarketIndexData]:
        """异步获取市场指数"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_market_indices)

    def search_fund(self, keyword: str) -> List[FundSearchResult]:
        """搜索基金"""
        # Search typically relies on the mobile API or fallback to mock
        # Cache search results briefly?
        cache_key = f"search_{keyword}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        results = []
        # Try preferred source first (usually mobile)
        if self._preferred == "eastmoney_mobile" or self._preferred == "auto":
             results = self._sources["eastmoney_mobile"].search_fund(keyword)
        
        # If no results and allowed, try mock/others? 
        # Actually search is best done by the specific API.
        if not results and (self._preferred == "mock" or (not self._production_mode and not results)):
             pass # Mock doesn't implement search yet, or use basic filtering
        
        if results:
            self._set_cache(cache_key, results)
            
        return results

    async def search_fund_async(self, keyword: str) -> List[FundSearchResult]:
        """异步搜索基金"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.search_fund, keyword)

    def get_fund_rankings(self, sort_by: str = "1r", limit: int = 10) -> List[FundNavData]:
        """获取基金排行"""
        # Try preferred source -> Eastmoney Mobile
        # Only implemented in Eastmoney Mobile for now
        source = self._sources.get("eastmoney_mobile")
        if source:
             return source.get_fund_rankings(sort_by, limit)
        return []

    def get_funds_nav(self, fund_codes: List[str]) -> Dict[str, Optional[FundNavData]]:
        """批量获取基金净值 (自动回退, 优先使用批量接口)"""
        if not fund_codes:
            return {}
            
        # 1. Check cache for all
        results = {}
        missing_codes = []
        
        for code in fund_codes:
            cache_key = f"nav_{code}"
            cached = self._get_from_cache(cache_key)
            if cached:
                results[code] = cached
            else:
                missing_codes.append(code)
                
        if not missing_codes:
            return results
            
        # 2. Fetch missing from sources
        # Try preferred source first if it supports efficient batch
        # Assuming most sources will implement get_funds_nav (base class has loop fallback)
        
        # We process all missing codes together
        # Try sources in order
        remaining_missing = set(missing_codes)
        
        for source_name in self._get_source_order():
            if not remaining_missing:
                break
                
            source = self._sources.get(source_name)
            if source:
                try:
                    # Call batch method of source
                    batch_results = source.get_funds_nav(list(remaining_missing))
                    
                    for code, data in batch_results.items():
                        if data:
                            self._set_cache(f"nav_{code}", data)
                            results[code] = data
                            if code in remaining_missing:
                                remaining_missing.remove(code)
                except Exception:
                    continue
                    
        # 3. Fallback to mock for still missing
        if remaining_missing:
            mock_results = self._sources["mock"].get_funds_nav(list(remaining_missing))
            for code, data in mock_results.items():
                results[code] = data
        
        # Ensure all requested codes are in result (even if None)
        for code in fund_codes:
            if code not in results:
                results[code] = None
                
        return results

    def get_fund_details(self, fund_code: str) -> Optional[FundDetailData]:
        """获取基金详情 (自动回退)"""
        cache_key = f"detail_{fund_code}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
            
        for source_name in self._get_source_order():
            source = self._sources.get(source_name)
            if source:
                try:
                    result = source.get_fund_details(fund_code)
                    if result:
                        self._set_cache(cache_key, result)
                        return result
                except Exception:
                    continue
        return None

    def get_intraday_valuation(self, fund_code: str) -> Optional[IntradayValuationData]:
        """获取分时估值 (自动回退, 短缓存)"""
        cache_key = f"intraday_{fund_code}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
            
        for source_name in self._get_source_order():
            source = self._sources.get(source_name)
            if source:
                try:
                    result = source.get_intraday_valuation(fund_code)
                    if result:
                        # 分时数据缓存时间短一些 (60秒)
                        self._cache[cache_key] = (result, datetime.now().timestamp())
                        return result
                except Exception:
                    continue
        return None

    def get_historical_nav(self, fund_code: str, range_type: str = "y") -> Optional[HistoricalData]:
        """获取历史净值 (自动回退, 缓存1小时)"""
        cache_key = f"history_data_{fund_code}_{range_type}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
            
        for source_name in self._get_source_order():
            source = self._sources.get(source_name)
            if source:
                try:
                    result = source.get_historical_nav(fund_code, range_type)
                    if result:
                        # 历史数据缓存时间长一些 (1小时)
                        self._cache[cache_key] = (result, datetime.now().timestamp() + 3600)
                        return result
                except Exception:
                    continue
        return None

    def get_historical_yield(self, fund_code: str, range_type: str = "y") -> Optional[FundYieldData]:
        """获取累计收益率走势 (自动回退, 缓存1小时)"""
        cache_key = f"yield_{fund_code}_{range_type}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
            
        for source_name in self._get_source_order():
            source = self._sources.get(source_name)
            if source:
                try:
                    result = source.get_historical_yield(fund_code, range_type)
                    if result:
                        self._cache[cache_key] = (result, datetime.now().timestamp() + 3600)
                        return result
                except Exception:
                    continue
        return None

    def get_fund_diagnostic(self, fund_code: str) -> Optional[FundDiagnosticData]:
        """获取基金诊断 (自动回退)"""
        cache_key = f"diagnostic_{fund_code}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
            
        for source_name in self._get_source_order():
            source = self._sources.get(source_name)
            if source:
                try:
                    result = source.get_fund_diagnostic(fund_code)
                    if result:
                        # 诊断数据变化不快，缓存24小时
                        self._cache[cache_key] = (result, datetime.now().timestamp() + 86400)
                        return result
                except Exception:
                    continue
        return None

    def get_fund_nav_history(self, fund_code: str, range_type: str = "y") -> Optional[List[Dict[str, Any]]]:
        """获取基金历史净值列表 (用于统计分析)"""
        # Try to get from cache first (though history might be large, maybe cache for shorter time or rely on source cache)
        cache_key = f"history_{fund_code}_{range_type}"
        cached = self._get_from_cache(cache_key)
        if cached:
            print(f"DEBUG: get_fund_nav_history cache HIT for {cache_key}, type={type(cached)}")
            return cached
        
        print(f"DEBUG: get_fund_nav_history cache MISS for {cache_key}")

        for source_name in self._get_source_order():
            source = self._sources.get(source_name)
            if source:
                try:
                    history = source.get_historical_nav(fund_code, range_type)
                    if history and history.points:
                        # Convert to list of dicts for statistics module
                        result = [
                            {
                                "date": p.date,
                                "nav": p.nav,
                                "change": p.change_percent
                            }
                            for p in history.points
                        ]

                        self._cache[cache_key] = (result, datetime.now().timestamp() + 3600 * 4) # Cache for 4 hours
                        print(f"DEBUG: get_fund_nav_history computed result, type={type(result)}, len={len(result)}")
                        return result
                except Exception:
                    continue
        return None

    def get_fund_holdings(self, fund_code: str) -> List[FundHoldingData]:
        """获取基金重仓股 (自动回退, 缓存1小时)"""
        cache_key = f"holdings_{fund_code}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
            
        for source_name in self._get_source_order():
            source = self._sources.get(source_name)
            if source:
                try:
                    result = source.get_fund_holdings(fund_code)
                    if result:
                        self._cache[cache_key] = (result, datetime.now().timestamp() + 3600)
                        return result
                except Exception:
                    continue
        return []
    async def get_funds_nav_async(self, fund_codes: List[str]) -> Dict[str, Optional[FundNavData]]:
        """异步批量获取基金净值"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_funds_nav, fund_codes)

    async def get_fund_details_async(self, fund_code: str) -> Optional[FundDetailData]:
        """异步获取基金详情"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_fund_details, fund_code)

    async def get_intraday_valuation_async(self, fund_code: str) -> Optional[IntradayValuationData]:
        """异步获取分时估值"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_intraday_valuation, fund_code)

    async def get_fund_holdings_async(self, fund_code: str) -> List[FundHoldingData]:
        """异步获取基金重仓股"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_fund_holdings, fund_code)
    
    async def get_historical_nav_async(self, fund_code: str, range_type: str = "y") -> Optional[HistoricalData]:
        """异步获取历史净值"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_historical_nav, fund_code, range_type)

    async def get_historical_yield_async(self, fund_code: str, range_type: str = "y") -> Optional[FundYieldData]:
        """异步获取累计收益率走势"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_historical_yield, fund_code, range_type)

    async def get_fund_diagnostic_async(self, fund_code: str) -> Optional[FundDiagnosticData]:
        """异步获取基金诊断"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.get_fund_diagnostic, fund_code)


# 全局服务实例
_market_service: Optional[MarketDataService] = None


def get_market_service() -> MarketDataService:
    """获取市场数据服务单例"""
    global _market_service
    if _market_service is None:
        from utils.config import get_config
        config = get_config()
        _market_service = MarketDataService(preferred_source=config.data_source.source)
    return _market_service


# 便捷函数
def get_fund_nav(fund_code: str) -> str:
    """获取基金净值 (JSON)"""
    return get_market_service().get_fund_nav(fund_code).to_json()


def get_market_indices() -> List[Dict]:
    """获取市场指数"""
    return [idx.to_dict() for idx in get_market_service().get_market_indices()]


if __name__ == "__main__":
    # 测试
    print("测试基金净值获取:")
    print(get_fund_nav("110011"))
    print("\n测试市场指数获取:")
    print(json.dumps(get_market_indices(), ensure_ascii=False, indent=2))
