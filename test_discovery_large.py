
import asyncio
from services.discovery_service import get_discovery_service
import time

async def test_large_limit():
    service = get_discovery_service()
    start = time.time()
    print("Fetching daily movers with limit=50...")
    data = await service.get_daily_movers(limit=50)
    end = time.time()
    
    print(f"Time taken: {end - start:.2f}s")
    print(f"Top Gainers: {len(data['top_gainers'])}")
    print(f"Top Losers: {len(data['top_losers'])}")
    print(f"Most Popular: {len(data['most_popular'])}")
    
    if data['top_gainers']:
        print("Sample Gainer:", data['top_gainers'][0])

if __name__ == "__main__":
    asyncio.run(test_large_limit())
