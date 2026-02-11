import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

class StatisticsTool:
    """
    Quantitative Analysis Tool for Fund Portfolio.
    Handles Sharpe Ratio, Max Drawdown, Correlation Matrix, and Backtesting.
    """
    
    def calculate_indicators(self, returns: List[float], risk_free_rate: float = 0.02) -> Dict[str, float]:
        """
        Calculate key risk-adjusted performance metrics.
        
        Args:
            returns: Daily returns (percentage, e.g., 0.01 for 1%)
            risk_free_rate: Annualized risk-free rate (default 2%)
            
        Returns:
            Dict containing sharpe_ratio, max_drawdown, volatility, total_return
        """
        if not returns or len(returns) < 2:
            return {
                "sharpe_ratio": 0,
                "max_drawdown": 0,
                "volatility": 0,
                "total_return": 0
            }
            
        returns_arr = np.array(returns)
        
        # Annualization factor (assuming 252 trading days)
        annual_factor = 252
        
        # 1. Total Cumulative Return
        total_return = (np.prod(1 + returns_arr) - 1) * 100
        
        # 2. Volatility (Annualized Standard Deviation)
        volatility = np.std(returns_arr, ddof=1) * np.sqrt(annual_factor) * 100
        
        # 3. Max Drawdown
        cumulative_returns = np.cumprod(1 + returns_arr)
        peak = np.maximum.accumulate(cumulative_returns)
        drawdown = (cumulative_returns - peak) / peak
        max_drawdown = np.min(drawdown) * 100
        
        # 4. Sharpe Ratio
        # R_p - R_f / sigma_p
        # Daily risk free rate
        daily_rf = (1 + risk_free_rate) ** (1/annual_factor) - 1
        excess_returns = returns_arr - daily_rf
        
        if np.std(excess_returns, ddof=1) == 0:
            sharpe_ratio = 0
        else:
            sharpe_ratio = (np.mean(excess_returns) / np.std(excess_returns, ddof=1)) * np.sqrt(annual_factor)
            
        return {
            "sharpe_ratio": round(sharpe_ratio, 2),
            "max_drawdown": round(absolute(max_drawdown), 2), # Return as positive number usually displayed
            "volatility": round(volatility, 2),
            "total_return": round(total_return, 2)
        }

    def calculate_correlation_matrix(self, fund_data: Dict[str, List[float]]) -> Dict[str, Any]:
        """
        Calculate Pearson correlation matrix for multiple funds.
        
        Args:
            fund_data: Dict where key is fund code and value is list of daily NAVs (or returns)
                       It is better to use daily percentage changes for correlation.
        """
        if not fund_data or len(fund_data) < 2:
            return {"matrix": [], "funds": list(fund_data.keys())}
            
        df = pd.DataFrame(fund_data)
        
        # Ensure we are using returns (pct_change) if raw NAVs provided
        # For simplicity, assuming input is already returns or normalized enough
        # Actually, let's calculate returns just in case
        returns_df = df.pct_change().dropna()
        
        if returns_df.empty:
             # Fallback if data is insufficient for pct_change
             returns_df = df
             
        correlation_matrix = returns_df.corr(method='pearson')
        
        # Format for frontend (heatmap)
        # x: fund_codes, y: fund_codes, value: correlation
        funds = list(correlation_matrix.columns)
        matrix = []
        
        for i, row_fund in enumerate(funds):
            row_data = []
            for j, col_fund in enumerate(funds):
                val = correlation_matrix.iloc[i, j]
                # Handle NaN
                if np.isnan(val):
                    val = 0
                row_data.append(round(val, 2))
            matrix.append(row_data)
            
        return {
            "funds": funds,
            "matrix": matrix
        }

    def calculate_fund_score(self, performance_data: Dict[str, float]) -> Dict[str, Any]:
        """
        Calculate a 5-dimensional score (0-100) for a fund.
        Dimensions:
        - Returns (Benefit): Short/Long term returns
        - Risk (Cost): Volatility, Max Drawdown (Inverse)
        - Manager (Stability): Tenure, consistency
        - Company (Strength): AUM, team size
        - Market (Moats): Sector outlook
        """
        # Mocking sophisticated logic with simple normalization for now
        
        # 1. Profit Score (0-100)
        # Assuming r_1y is passed, normalize against 20% benchmark
        r_1y = performance_data.get('year_return', 0)
        profit_score = min(100, max(0, (r_1y + 10) * 2.5)) # -10% -> 0, +30% -> 100
        
        # 2. Risk Control Score (Inverse of Volatility/Drawdown)
        # Max drawdown 30% -> 0 score, 0% -> 100 score
        mdd = abs(performance_data.get('max_drawdown', 20))
        risk_score = min(100, max(0, 100 - mdd * 3))
        
        # 3. Manager
        tenure = performance_data.get('manager_years', 2)
        manager_score = min(100, max(40, tenure * 15))
        
        # 4. Company (Strength) -> stability
        # Randomize slightly for demo or use fixed logic
        company_score = 85 
        
        # 5. Cost/Value
        cost_score = 80
        
        total_score = (profit_score * 0.3 + risk_score * 0.3 + manager_score * 0.15 + company_score * 0.15 + cost_score * 0.1)
        
        return {
            "total": round(total_score, 1),
            "dimensions": {
                "revenue": round(profit_score, 1),
                "risk": round(risk_score, 1),
                "manager": round(manager_score, 1),
                "company": round(company_score, 1),
                "cost": round(cost_score, 1)
            }
        }

    def calculate_consecutive_stats(self, returns: List[float]) -> Dict[str, Any]:
        """
        Calculate consecutive up/down days stats.
        
        Args:
            returns: Daily returns (percentage), ordered from oldest to newest.
        """
        if not returns:
            return {"type": "flat", "days": 0, "max_up": 0, "max_down": 0}
            
        # 1. Current Consecutive
        # Iterate backwards
        current_type = "flat"
        current_days = 0
        
        # Check last day to determine direction
        last_ret = returns[-1]
        if last_ret > 0:
            current_type = "up"
        elif last_ret < 0:
            current_type = "down"
            
        if current_type != "flat":
            for r in reversed(returns):
                if (current_type == "up" and r > 0) or (current_type == "down" and r < 0):
                    current_days += 1
                else:
                    break
        
        # 2. Max Consecutive (Up/Down) in period
        max_up = 0
        max_down = 0
        cur_up = 0
        cur_down = 0
        
        for r in returns:
            if r > 0:
                cur_up += 1
                cur_down = 0
                max_up = max(max_up, cur_up)
            elif r < 0:
                cur_down += 1
                cur_up = 0
                max_down = max(max_down, cur_down)
            else:
                cur_up = 0
                cur_down = 0
                
        return {
            "type": current_type,
            "days": current_days,
            "max_up": max_up,
            "max_down": max_down
        }

def absolute(val):
    return abs(val) if val is not None else 0
