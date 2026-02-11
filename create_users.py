import sqlite3
from utils.auth import hash_password

db_path = "data/fund_assistant.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

pwd_hash = hash_password("admin123")
base_email = "user{}@example.com"

# Create users 2 to 10
for i in range(2, 11):
    username = f"user{i}"
    email = base_email.format(i)
    
    # Check if user exists
    cursor.execute("SELECT id FROM users WHERE id=?", (i,))
    if cursor.fetchone():
        print(f"User {i} already exists, skipping.")
        continue
        
    try:
        cursor.execute("""
            INSERT INTO users (id, username, password_hash, email, status, risk_level)
            VALUES (?, ?, ?, ?, 'active', 'moderate')
        """, (i, username, pwd_hash, email))
        print(f"Created user {username} (ID {i}) - Active")
    except sqlite3.IntegrityError as e:
        print(f"Error creating user {i}: {e}")

conn.commit()
conn.close()
