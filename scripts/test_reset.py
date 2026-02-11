import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.auth import get_user_repo

def test_reset():
    repo = get_user_repo()
    # Try to reset a non-existent user
    result = repo.reset_password("nonexistent_user_123", "NewPass123")
    print(f"Result for nonexistent: {result}")
    
    # Try to create a user and reset
    repo.create_user("test_reset_user", "OldPass123", "test@example.com")
    result = repo.reset_password("test_reset_user", "NewPass123_New")
    print(f"Result for existent: {result}")

if __name__ == "__main__":
    test_reset()
