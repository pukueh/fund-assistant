
import asyncio
import sys
import os

# Add project root to path
sys.path.insert(0, os.getcwd())

from services.discovery_service import get_discovery_service

async def test_discovery():
    print("Testing DiscoveryService...")
    service = get_discovery_service()
    
    try:
        print("Calling get_daily_movers...")
        movers = await service.get_daily_movers(limit=5)
        
        print("\n--- Top Gainers ---")
        if not movers["top_gainers"]:
            print("EMPTY")
        for m in movers["top_gainers"]:
            print(f"{m['fund_name']} ({m['fund_code']}): {m['change_pct']}%")
            
        print("\n--- Top Losers ---")
        if not movers["top_losers"]:
            print("EMPTY")
        for m in movers["top_losers"]:
            print(f"{m['fund_name']} ({m['fund_code']}): {m['change_pct']}%")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_discovery())
