import requests
import json

url = "http://localhost:8080/api/chat"
payload = {
    "message": "你好，你是谁？",
    "agent": "coordinator"
}
headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
except Exception as e:
    print(f"Error: {e}")
