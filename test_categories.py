
import asyncio
import sys
import os

sys.path.insert(0, os.getcwd())

from services.category_service import get_category_service

async def test_categories():
    print("Testing CategoryService...")
    service = get_category_service()
    categories = service.get_all_categories()
    print(f"Total categories: {len(categories)}")
    for c in categories[:5]:
        print(f"{c.name} ({c.slug}): {c.day_change}%")

if __name__ == "__main__":
    asyncio.run(test_categories())
