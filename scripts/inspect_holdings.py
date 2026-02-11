import sys
import os
import sqlite3
sys.path.insert(0, os.getcwd())

from utils.database import get_database

def inspect_holdings():
    print("Inspecting holdings...")
    db_path = "./data/fund_assistant.db"
    
    if not os.path.exists(db_path):
        print(f"DB not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, user_id, fund_code, fund_name FROM holdings")
    rows = cursor.fetchall()
    
    print(f"Total holdings: {len(rows)}")
    for row in rows:
        print(f"ID: {row['id']}, User: {row['user_id']}, Code: '{row['fund_code']}', Name: {row['fund_name']}")
        
    conn.close()

if __name__ == "__main__":
    inspect_holdings()
