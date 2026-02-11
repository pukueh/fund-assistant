
import sqlite3
import random

DB_PATH = "./data/category.db"

def populate():
    print(f"Connecting to {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all categories
    cursor.execute("SELECT id, slug FROM categories")
    categories = cursor.fetchall()
    
    if not categories:
        print("No categories found! Run the service first to initialize DB.")
        return

    print(f"Found {len(categories)} categories.")
    
    # Mock funds
    funds = [
        "110011", "161725", "000001", "519068", "003834", 
        "005827", "260108", "163406", "001838", "001632",
        "002190", "005911", "008888", "320007", "110022"
    ]
    
    # Map each fund to 1-2 categories
    for fund_code in funds:
        cats = random.sample(categories, k=random.randint(1, 2))
        for cat_id, cat_slug in cats:
            print(f"Mapping {fund_code} to {cat_slug} ({cat_id})")
            cursor.execute("""
                INSERT OR IGNORE INTO fund_categories (fund_code, category_id, weight)
                VALUES (?, ?, ?)
            """, (fund_code, cat_id, round(random.uniform(0.5, 1.0), 2)))
            
    conn.commit()
    conn.close()
    print("Done!")

if __name__ == "__main__":
    populate()
