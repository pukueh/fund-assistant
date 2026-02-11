"""净值数据采集器

从多数据源采集基金净值历史数据：
- 天天基金 (EastMoney)
- AKShare
- Mock 数据（开发环境）
"""

import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import logging
import sqlite3
import os

from ..models import FundNavHistory

logger = logging.getLogger(__name__)


class NavCollector:
    """净值数据采集器"""
    
    # 关注的基金列表
    DEFAULT_FUNDS = [
        "110011",  # 易方达中小盘混合
        "161725",  # 招商中证白酒指数
        "000001",  # 华夏成长混合
        "519068",  # 汇添富成长焦点混合
        "163406",  # 兴全合润混合
        "003834",  # 华夏能源革新股票
        "005827",  # 易方达蓝筹精选混合
        "260108",  # 景顺长城新兴成长
    ]
    
    def __init__(self, db_path: str = "./data/fund_history.db"):
        self.db_path = db_path
        self._ensure_db()
        self._akshare = None
        try:
            import akshare as ak
            self._akshare = ak
        except ImportError:
            logger.info("AKShare 未安装，将使用备用数据源")
    
    def _ensure_db(self):
        """确保数据库表存在"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 净值历史表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fund_nav_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fund_code TEXT NOT NULL,
                date TEXT NOT NULL,
                nav REAL NOT NULL,
                acc_nav REAL,
                change_percent REAL,
                volume REAL,
                source TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(fund_code, date)
            )
        """)
        
        # 创建索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_nav_fund_date 
            ON fund_nav_history(fund_code, date DESC)
        """)
        
        conn.commit()
        conn.close()
        logger.info(f"✅ 数据库初始化完成: {self.db_path}")
    
    def collect(self, fund_code: str, days: int = 365) -> List[FundNavHistory]:
        """采集单个基金的历史净值
        
        Args:
            fund_code: 基金代码
            days: 采集天数
            
        Returns:
            净值历史列表
        """
        logger.info(f"📊 开始采集基金 {fund_code} 净值...")
        
        # 尝试 AKShare
        if self._akshare:
            try:
                df = self._akshare.fund_open_fund_info_em(
                    symbol=fund_code, 
                    indicator="单位净值走势"
                )
                if df is not None and len(df) > 0:
                    return self._parse_akshare_data(fund_code, df)
            except Exception as e:
                logger.warning(f"AKShare 获取失败: {e}")
        
        # 降级到天天基金 API
        try:
            results = self._fetch_from_eastmoney(fund_code, days)
            if results:
                return results
            logger.warning(f"天天基金返回空数据: {fund_code}")
        except Exception as e:
            logger.warning(f"天天基金获取失败: {e}")
        
        # 最后使用模拟数据
        logger.info(f"使用模拟数据: {fund_code}")
        return self._generate_mock_data(fund_code, days)
    
    def _parse_akshare_data(self, fund_code: str, df) -> List[FundNavHistory]:
        """解析 AKShare 返回的数据"""
        results = []
        for _, row in df.iterrows():
            try:
                nav_record = FundNavHistory(
                    fund_code=fund_code,
                    date=row['净值日期'],
                    nav=float(row['单位净值']),
                    acc_nav=float(row.get('累计净值', row['单位净值'])),
                    change_percent=float(row.get('日增长率', 0)) if row.get('日增长率') else 0,
                    source="akshare"
                )
                results.append(nav_record)
            except Exception as e:
                logger.warning(f"解析行失败: {e}")
        return results
    
    def _fetch_from_eastmoney(self, fund_code: str, days: int) -> List[FundNavHistory]:
        """从天天基金获取历史净值"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        url = f"https://fund.eastmoney.com/f10/F10DataApi.aspx?type=lsjz&code={fund_code}&page=1&per=500"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Referer": f"https://fund.eastmoney.com/{fund_code}.html"
        }
        
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
        
        # 解析返回的 HTML 表格
        return self._parse_eastmoney_html(fund_code, html)
    
    def _parse_eastmoney_html(self, fund_code: str, html: str) -> List[FundNavHistory]:
        """解析天天基金返回的 HTML"""
        import re
        results = []
        
        # 提取表格行
        pattern = r'<tr><td>(\d{4}-\d{2}-\d{2})</td><td[^>]*>([^<]+)</td><td[^>]*>([^<]*)</td><td[^>]*>([^<]*)</td>'
        matches = re.findall(pattern, html)
        
        for match in matches:
            try:
                date_str, nav_str, acc_nav_str, change_str = match
                nav_record = FundNavHistory(
                    fund_code=fund_code,
                    date=datetime.strptime(date_str, "%Y-%m-%d"),
                    nav=float(nav_str),
                    acc_nav=float(acc_nav_str) if acc_nav_str else float(nav_str),
                    change_percent=float(change_str.replace('%', '')) if change_str and '%' in change_str else 0,
                    source="eastmoney"
                )
                results.append(nav_record)
            except Exception as e:
                continue
        
        return results
    
    def _generate_mock_data(self, fund_code: str, days: int) -> List[FundNavHistory]:
        """生成模拟数据（开发环境）"""
        import random
        results = []
        
        base_nav = random.uniform(1.0, 5.0)
        current_nav = base_nav
        
        for i in range(days, 0, -1):
            date = datetime.now() - timedelta(days=i)
            # 模拟每日涨跌
            change = random.gauss(0.0005, 0.015)  # 均值0.05%, 标准差1.5%
            current_nav *= (1 + change)
            
            results.append(FundNavHistory(
                fund_code=fund_code,
                date=date,
                nav=round(current_nav, 4),
                acc_nav=round(current_nav * random.uniform(1.0, 1.5), 4),
                change_percent=round(change * 100, 2),
                source="mock"
            ))
        
        logger.info(f"📊 生成 {len(results)} 条模拟数据")
        return results
    
    def collect_all(self, fund_codes: List[str] = None) -> List[FundNavHistory]:
        """采集所有关注基金的净值"""
        codes = fund_codes or self.DEFAULT_FUNDS
        all_results = []
        
        for code in codes:
            try:
                results = self.collect(code)
                self.save(results)
                all_results.extend(results)
            except Exception as e:
                logger.error(f"采集 {code} 失败: {e}")
        
        logger.info(f"✅ 共采集 {len(all_results)} 条净值数据")
        return all_results
    
    def collect_realtime(self) -> List[Dict]:
        """采集实时估值"""
        from tools.market_data import get_market_service
        
        service = get_market_service()
        results = []
        
        for code in self.DEFAULT_FUNDS:
            try:
                nav_data = service.get_fund_nav(code)
                results.append(nav_data.to_dict())
            except Exception as e:
                logger.warning(f"获取 {code} 实时估值失败: {e}")
        
        return results
    
    def save(self, records: List[FundNavHistory]):
        """保存到数据库"""
        if not records:
            return
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for record in records:
            try:
                date_str = record.date.strftime("%Y-%m-%d") if isinstance(record.date, datetime) else str(record.date)
                cursor.execute("""
                    INSERT OR REPLACE INTO fund_nav_history 
                    (fund_code, date, nav, acc_nav, change_percent, volume, source)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    record.fund_code,
                    date_str,
                    record.nav,
                    record.acc_nav,
                    record.change_percent,
                    record.volume,
                    record.source
                ))
            except Exception as e:
                logger.warning(f"保存记录失败: {e}")
        
        conn.commit()
        conn.close()
        logger.info(f"✅ 保存 {len(records)} 条记录到数据库")
    
    def get_history(
        self, 
        fund_code: str, 
        start_date: datetime = None,
        end_date: datetime = None,
        limit: int = 365
    ) -> List[FundNavHistory]:
        """获取历史净值数据
        
        Args:
            fund_code: 基金代码
            start_date: 开始日期
            end_date: 结束日期
            limit: 最大记录数
            
        Returns:
            净值历史列表
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = "SELECT * FROM fund_nav_history WHERE fund_code = ?"
        params = [fund_code]
        
        if start_date:
            query += " AND date >= ?"
            params.append(start_date.strftime("%Y-%m-%d"))
        
        if end_date:
            query += " AND date <= ?"
            params.append(end_date.strftime("%Y-%m-%d"))
        
        query += " ORDER BY date DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        results = []
        for row in rows:
            results.append(FundNavHistory(
                fund_code=row[1],
                date=datetime.strptime(row[2], "%Y-%m-%d"),
                nav=row[3],
                acc_nav=row[4] or row[3],
                change_percent=row[5] or 0,
                volume=row[6] or 0,
                source=row[7] or "db"
            ))
        
        return results
    
    def get_chart_data(
        self, 
        fund_code: str, 
        period: str = "1Y"
    ) -> List[Dict]:
        """获取图表数据
        
        Args:
            fund_code: 基金代码
            period: 时间周期 (1D/1W/1M/3M/1Y/MAX)
            
        Returns:
            Lightweight Charts 兼容的数据点列表
        """
        # 计算日期范围
        period_days = {
            "1D": 1,
            "1W": 7,
            "1M": 30,
            "3M": 90,
            "6M": 180,
            "1Y": 365,
            "3Y": 1095,
            "MAX": 3650
        }
        days = period_days.get(period, 365)
        
        start_date = datetime.now() - timedelta(days=days)
        history = self.get_history(fund_code, start_date=start_date, limit=days)
        
        # 如果数据库没有足够数据，尝试采集
        if len(history) < days * 0.5:
            logger.info(f"数据不足，尝试采集...")
            new_data = self.collect(fund_code, days)
            self.save(new_data)
            history = self.get_history(fund_code, start_date=start_date, limit=days)
        
        # 转换为图表格式（按时间升序）
        history.reverse()
        return [h.to_chart_point() for h in history]
