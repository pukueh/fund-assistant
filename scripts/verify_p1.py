import sys
import os
import time
import requests
import subprocess
import signal

# Add parent directory to path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_verification():
    print("Starting verification...")
    
    # Start server
    server_process = subprocess.Popen(
        [sys.executable, "server.py"],
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    print(f"Server started with PID {server_process.pid}")
    
    # Wait for server to be ready
    base_url = "http://localhost:8000"
    max_retries = 30
    for i in range(max_retries):
        try:
            resp = requests.get(f"{base_url}/api/health")
            if resp.status_code == 200:
                print("Server is ready!")
                break
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(1)
        print(f"Waiting for server... ({i+1}/{max_retries})")
    else:
        print("Server failed to start.")
        stdout, stderr = server_process.communicate(timeout=5)
        print("--- Server STDOUT ---")
        print(stdout.decode())
        print("--- Server STDERR ---")
        print(stderr.decode())
        
        server_process.kill()
        sys.exit(1)

    try:
        # 1. Test Async I/O (Public Endpoint)
        print("\nTesting Async I/O (Public Endpoint)...")
        start_time = time.time()
        resp = requests.get(f"{base_url}/api/fund/110011")
        duration = time.time() - start_time
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ /api/fund/110011 succeeded in {duration:.2f}s")
            # print(data)
        else:
            print(f"❌ /api/fund/110011 failed: {resp.status_code} {resp.text}")

        # 2. Test Auth (Strict Endpoint)
        print("\nTesting Auth (Strict Endpoint - No Token)...")
        resp = requests.get(f"{base_url}/api/portfolio/summary")
        if resp.status_code == 401:
            print("✅ /api/portfolio/summary correctly returned 401 Unauthorized")
        else:
            print(f"❌ /api/portfolio/summary returned {resp.status_code} (Expected 401)")
            
        # 3. Test Auth (Optional Endpoint - Guest)
        print("\nTesting Auth (Optional Endpoint - Guest)...")
        resp = requests.get(f"{base_url}/api/valuation")
        if resp.status_code == 200:
            print("✅ /api/valuation succeeded for guest")
        else:
            print(f"❌ /api/valuation failed for guest: {resp.status_code}")

    finally:
        print("\nStopping server...")
        server_process.send_signal(signal.SIGTERM)
        server_process.wait()
        print("Server stopped.")

if __name__ == "__main__":
    run_verification()
