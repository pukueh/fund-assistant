
import requests
import os
from dotenv import load_dotenv
from utils.auth import create_token
load_dotenv()

def test_api():
    base_url = "http://127.0.0.1:8080"
    token = create_token(2, "admin")
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"Requesting /api/report/daily...")
    response = requests.get(f"{base_url}/api/report/daily", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}...") # Print first 500 chars

if __name__ == "__main__":
    test_api()
