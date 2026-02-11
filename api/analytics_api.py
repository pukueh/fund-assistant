from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/api/fund", tags=["analytics"])

class FundScore(BaseModel):
    total: float
    dimensions: Dict[str, float]

class FundMetrics(BaseModel):
    sharpe_ratio: float
    max_drawdown: float
    volatility: float
    total_return: float
    consecutive_up: int
    consecutive_down: int
    max_consecutive_up: int
    max_consecutive_down: int

class FundAnalyticsResponse(BaseModel):
    fund_code: str
    score: FundScore
    metrics: FundMetrics
    analysis: str

@router.get("/{fund_code}/analytics")
async def get_fund_analytics(fund_code: str):
    """Get comprehensive analytics for a fund"""
    from tools.fund_tools import FundDataTool
    from tools.statistics import StatisticsTool
    
    try:
        # 1. Fetch History Data via FundDataTool (which uses MarketDataService)
        # We need data to calculate metrics
        # FundDataTool doesn't have get_history directly exposed in all versions, 
        # but server.py uses service.get_historical_nav. 
        # Let's use get_market_service directly for consistency with server.py
        from tools.market_data import get_market_service
        market_service = get_market_service()
        
        # Get 1 year history for metrics
        history = market_service.get_historical_nav(fund_code, range_type="y")
        
        if not history or not history.points:
            # Fallback or empty
            return {
                "fund_code": fund_code,
                "score": {"total": 60, "dimensions": {"revenue": 60, "risk": 60, "manager": 60, "company": 60, "cost": 60}},
                "metrics": {
                    "sharpe_ratio": 0, "max_drawdown": 0, "volatility": 0, "total_return": 0,
                    "consecutive_up": 0, "consecutive_down": 0,
                    "max_consecutive_up": 0, "max_consecutive_down": 0
                },
                "analysis": "暂无足够数据进行分析"
            }

        # Extract daily returns
        # Points are usually sorted by date? HistoryPoint has 'change_percent'
        # Check point order. Usually API returns sorted.
        points = history.points
        # Sort just in case
        points.sort(key=lambda x: x.date)
        
        returns = [(p.change_percent or 0.0) / 100.0 for p in points] # convert percent to decimal for stats
        # StatisticsTool expects decimal or percent? 
        # calculate_indicators: "0.01 for 1%" -> Decimal.
        # point.change_percent is usually e.g. 1.23 for 1.23%. 
        # Let's use decimal.
        
        stats_tool = StatisticsTool()
        
        # 2. Calculate Indicators
        indicators = stats_tool.calculate_indicators(returns)
        
        # 3. Calculate Consecutive Stats
        # consecutive stats logic expects returns ordered oldest to newest?
        # Yes, calculate_consecutive_stats iterates reversed for current, and normal for max.
        # We pass PERCENTAGE values to calculate_consecutive_stats because it checks > 0 or < 0.
        # So passing decimal is fine too.
        consecutive = stats_tool.calculate_consecutive_stats(returns)
        
        # 4. Calculate Score
        # derived from performance data
        perf_data = {
            "year_return": indicators.get("total_return", 0),
            "max_drawdown": indicators.get("max_drawdown", 0),
            "manager_years": 3 # Placeholder or fetch from details
        }
        score = stats_tool.calculate_fund_score(perf_data)
        
        # 5. Analysis Text (Rule based or LLM)
        analysis = f"该基金近一年收益率 {indicators.get('total_return')}%，最大回撤 {indicators.get('max_drawdown')}%。"
        if consecutive["type"] == "up":
            analysis += f" 近期连续上涨 {consecutive['days']} 天。"
        elif consecutive["type"] == "down":
            analysis += f" 近期连续下跌 {consecutive['days']} 天。"
            
        return {
            "fund_code": fund_code,
            "score": score,
            "metrics": {
                "sharpe_ratio": indicators.get("sharpe_ratio", 0),
                "max_drawdown": indicators.get("max_drawdown", 0),
                "volatility": indicators.get("volatility", 0),
                "total_return": indicators.get("total_return", 0),
                "consecutive_up": consecutive["days"] if consecutive["type"] == "up" else 0,
                "consecutive_down": consecutive["days"] if consecutive["type"] == "down" else 0,
                "max_consecutive_up": consecutive["max_up"],
                "max_consecutive_down": consecutive["max_down"]
            },
            "analysis": analysis
        }
        
    except Exception as e:
        print(f"Error in analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{fund_code}/backtest")
async def get_fund_backtest(
    fund_code: str, 
    amount: float = 1000, 
    frequency: str = "monthly"
):
    """
    Run DIP (Dollar-Cost Averaging) backtest simulation
    
    Args:
        fund_code: Fund code
        amount: Investment amount per period (default 1000)
        frequency: weekly, biweekly, monthly (default monthly)
    """
    from tools.market_data import get_market_service
    
    try:
        market_service = get_market_service()
        
        # Get 3 years of history for backtest
        history = market_service.get_historical_nav(fund_code, range_type="3y")
        
        if not history or not history.points or len(history.points) < 12:
            return {
                "fund_code": fund_code,
                "periods": 0,
                "total_invested": 0,
                "current_value": 0,
                "total_shares": 0,
                "avg_cost": 0,
                "profit": 0,
                "profit_rate": 0,
                "message": "历史数据不足，无法进行回测"
            }
        
        points = history.points
        points.sort(key=lambda x: x.date)
        
        # Determine interval based on frequency
        if frequency == "weekly":
            interval = 5  # ~5 trading days
        elif frequency == "biweekly":
            interval = 10
        else:  # monthly
            interval = 22  # ~22 trading days
        
        # Simulate DIP
        total_invested = 0.0
        total_shares = 0.0
        investments = []
        
        for i in range(0, len(points), interval):
            point = points[i]
            nav = point.nav
            if nav and nav > 0:
                shares = amount / nav
                total_shares += shares
                total_invested += amount
                investments.append({
                    "date": point.date,
                    "nav": nav,
                    "shares": round(shares, 4),
                    "amount": amount
                })
        
        # Calculate final value using latest NAV
        latest_nav = points[-1].nav if points[-1].nav else 1
        current_value = total_shares * latest_nav
        profit = current_value - total_invested
        profit_rate = (profit / total_invested * 100) if total_invested > 0 else 0
        avg_cost = total_invested / total_shares if total_shares > 0 else 0
        
        return {
            "fund_code": fund_code,
            "frequency": frequency,
            "amount_per_period": amount,
            "periods": len(investments),
            "total_invested": round(total_invested, 2),
            "current_value": round(current_value, 2),
            "total_shares": round(total_shares, 4),
            "avg_cost": round(avg_cost, 4),
            "latest_nav": latest_nav,
            "profit": round(profit, 2),
            "profit_rate": round(profit_rate, 2),
            "investments": investments[-12:],  # Last 12 investments only
            "start_date": investments[0]["date"] if investments else None,
            "end_date": investments[-1]["date"] if investments else None
        }
        
    except Exception as e:
        print(f"Error in backtest: {e}")
        raise HTTPException(status_code=500, detail=str(e))

