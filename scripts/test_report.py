
import asyncio
import json
from agents.daily_report_agent import DailyReportAgent
from tools.market_data import get_market_service
from hello_agents import HelloAgentsLLM
import os

async def test():
    llm = HelloAgentsLLM()
    market_service = get_market_service()
    agent = DailyReportAgent(llm, market_service)
    
    # Mock portfolio summary
    summary = {
        "total_value": 10000.0,
        "total_profit": 500.0,
        "total_profit_rate": 5.0,
        "holdings": []
    }
    
    print("Generating report...")
    report = await agent.generate_report(summary, "test_user")
    print("--- REPORT START ---")
    print(report)
    print("--- REPORT END ---")

if __name__ == "__main__":
    asyncio.run(test())
