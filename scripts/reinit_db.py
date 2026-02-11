import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.database import Database

def init_db():
    print("Initializing database...")
    db = Database()
    print("Database initialized successfully.")
    
    # Check if users table exists
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
        if cursor.fetchone():
            print("Verified: 'users' table exists.")
        else:
            print("Error: 'users' table was not created.")

if __name__ == "__main__":
    init_db()
