
from dotenv import load_dotenv
load_dotenv()
import requests
from utils.auth import create_token
import json

def test_guest_report():
    base_url = "http://127.0.0.1:8080"
    # Guest user_id is 0
    token = create_token(0, "Guest")
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"Requesting /api/report/daily as Guest...")
    response = requests.get(f"{base_url}/api/report/daily", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        report = data.get("report", "")
        print(f"Report length: {len(report)}")
        print("--- REPORT CONTENT ---")
        print(report)
        print("--- END ---")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    test_guest_report()
