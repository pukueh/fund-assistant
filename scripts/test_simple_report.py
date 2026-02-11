
import asyncio
import json
from agents.daily_report_agent import DailyReportAgent
from dotenv import load_dotenv
load_dotenv()

async def test():
    # Only import what we need
    from hello_agents import HelloAgentsLLM
    from tools.market_data import get_market_service
    
    llm = HelloAgentsLLM()
    market_service = get_market_service()
    agent = DailyReportAgent(llm, market_service)
    
    summary = {
        "total_value": 0.0,
        "total_profit": 0.0,
        "total_profit_rate": 0.0,
        "holdings": []
    }
    
    print("Generating report...")
    report = await agent.generate_report(summary, "test_user")
    print("Report result size:", len(report))
    print(report)

if __name__ == "__main__":
    asyncio.run(test())
