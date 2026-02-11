import sqlite3
import os
from datetime import datetime

def init_discovery_data():
    # 1. Populate Category Mappings
    if os.path.exists("./data/category.db"):
        conn = sqlite3.connect("./data/category.db")
        cursor = conn.cursor()
        
        # Mapping common funds to categories
        mappings = [
            ("tech", ["008086", "001508", "001838"]),
            ("us-stock", ["513100", "513500", "000043"]),
            ("ai", ["008086", "012543", "004314"]),
            ("consumer", ["161725", "005827", "110011"]),
            ("healthcare", ["003095", "161726", "001631"]),
            ("new-energy", ["003834", "001508", "519068"]),
            ("semiconductor", ["001838", "513500"]),
            ("finance", ["001594", "161720"]),
            ("hk-stock", ["164701", "000043"]),
            ("bond", ["000001"]),
            ("qdii", ["513100", "513500", "164701"]),
        ]
        
        for slug, codes in mappings:
            cursor.execute("SELECT id FROM categories WHERE slug = ?", (slug,))
            row = cursor.fetchone()
            if row:
                cat_id = row[0]
                for code in codes:
                    cursor.execute(
                        "INSERT OR IGNORE INTO fund_categories (fund_code, category_id, weight) VALUES (?, ?, ?)",
                        (code, cat_id, 1.0)
                    )
        
        conn.commit()
        conn.close()
        print("✅ Category mappings initialized.")

    # 2. Populate Discovery Tags and Popularity
    if os.path.exists("./data/discovery.db"):
        conn = sqlite3.connect("./data/discovery.db")
        cursor = conn.cursor()
        
        # Fund-Tag mappings
        tag_mappings = [
            ("ai-giants", ["008086", "012543"]),
            ("anti-inflation", ["164701", "320013"]),
            ("green-energy", ["003834", "519068"]),
            ("consumer-leaders", ["161725", "005827"]),
            ("tech-growth", ["008086", "001838"]),
        ]
        
        for slug, codes in tag_mappings:
            cursor.execute("SELECT id FROM tags WHERE slug = ?", (slug,))
            row = cursor.fetchone()
            if row:
                tag_id = row[0]
                for code in codes:
                    cursor.execute(
                        "INSERT OR IGNORE INTO fund_tags (fund_code, tag_id, confidence, source) VALUES (?, ?, ?, ?)",
                        (code, tag_id, 1.0, "initial")
                    )
        
        # Add some mock popularity for today
        today = datetime.now().strftime("%Y-%m-%d")
        popular_funds = ["161725", "005827", "513100", "012543", "164701", "008086"]
        import random
        for code in popular_funds:
            cursor.execute("""
                INSERT OR REPLACE INTO fund_popularity (fund_code, search_count, view_count, date)
                VALUES (?, ?, ?, ?)
            """, (code, random.randint(50, 200), random.randint(100, 500), today))
            
        conn.commit()
        conn.close()
        print("✅ Discovery tags and popularity initialized.")

if __name__ == "__main__":
    init_discovery_data()
