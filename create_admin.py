import sqlite3
import sys
from utils.auth import hash_password

db_path = "data/fund_assistant.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# 1. Check and migrate schema if needed
try:
    cursor.execute("SELECT status FROM users LIMIT 1")
except sqlite3.OperationalError:
    print("Migrating schema: Adding 'status' column...")
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'")
        conn.commit()
    except Exception as e:
        print(f"Error adding column: {e}")

# 2. Check/Create Admin User
cursor.execute("SELECT * FROM users WHERE id=1")
user = cursor.fetchone()

pwd_hash = hash_password("admin123")

if user:
    print(f"User 1 exists: {dict(user)}")
    # Force update to ensure access
    cursor.execute("UPDATE users SET password_hash=?, status='active', username='admin' WHERE id=1", (pwd_hash,))
    print("RESET User 1 password to 'admin123' and status to 'active'")
else:
    print("User 1 does not exist. Creating...")
    # Using specific ID requires disabling autoincrement temporarily or just inserting
    try:
        cursor.execute("""
            INSERT INTO users (id, username, password_hash, email, status, risk_level)
            VALUES (1, 'admin', ?, 'admin@example.com', 'active', 'conservative')
        """, (pwd_hash,))
        print("CREATED User 1 (admin) with password 'admin123'")
    except sqlite3.IntegrityError as e:
        print(f"Error creating user: {e}")

conn.commit()
conn.close()
