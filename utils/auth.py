"""用户认证工具 - JWT Token 管理"""

import os
import hashlib
import secrets
import warnings
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple, List

# 环境模式检测
PRODUCTION_MODE = os.getenv("ENVIRONMENT", "development").lower() == "production"

# JWT 配置
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

_jwt_secret_from_env = os.getenv("JWT_SECRET", "")
if not _jwt_secret_from_env:
    if PRODUCTION_MODE:
        raise RuntimeError(
            "\n" + "=" * 60 + "\n"
            "❌ 生产环境必须配置 JWT_SECRET！\n"
            "请在 .env 中配置: JWT_SECRET=your-secure-secret-key\n"
            "可使用命令生成: python -c \"import secrets; print(secrets.token_hex(32))\"\n"
            + "=" * 60
        )
    warnings.warn(
        "\n" + "=" * 60 + "\n"
        "⚠️  JWT_SECRET 未配置！\n"
        "当前使用随机生成的密钥，服务重启后所有 Token 将失效。\n"
        "生产环境请在 .env 中配置: JWT_SECRET=your-secure-secret-key\n"
        + "=" * 60,
        UserWarning
    )
    JWT_SECRET = secrets.token_hex(32)
    JWT_SECRET_CONFIGURED = False
else:
    JWT_SECRET = _jwt_secret_from_env
    JWT_SECRET_CONFIGURED = True

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24


# ============ 密码强度校验 ============

class PasswordValidationError(Exception):
    """密码验证错误"""
    pass


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """验证密码强度
    
    要求:
    - 最少 8 个字符
    - 至少包含一个大写字母
    - 至少包含一个小写字母
    - 至少包含一个数字
    
    Args:
        password: 待验证的密码
    
    Returns:
        (是否有效, 错误信息)
    """
    if len(password) < 8:
        return False, "密码长度至少8个字符"
    
    if not re.search(r'[A-Z]', password):
        return False, "密码必须包含至少一个大写字母"
    
    if not re.search(r'[a-z]', password):
        return False, "密码必须包含至少一个小写字母"
    
    if not re.search(r'[0-9]', password):
        return False, "密码必须包含至少一个数字"
    
    # 可选：检查常见弱密码
    common_passwords = ['Password1', 'Qwerty123', 'Admin123', 'Welcome1']
    if password in common_passwords:
        return False, "密码过于简单，请使用更复杂的密码"
    
    return True, ""


def hash_password(password: str) -> str:
    """哈希密码 (使用 bcrypt，更安全)"""
    try:
        import bcrypt
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password_bytes, salt)
        return f"bcrypt:{hashed.decode('utf-8')}"
    except ImportError:
        # 回退到 SHA-256 (不推荐)
        salt = secrets.token_hex(16)
        hashed = hashlib.sha256((password + salt).encode()).hexdigest()
        return f"{salt}:{hashed}"


def hash_password_legacy(password: str) -> str:
    """旧版密码哈希 (SHA-256 + salt)，仅用于兼容"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{hashed}"


def verify_password(password: str, hashed: str) -> bool:
    """验证密码 (支持 bcrypt 和旧版 SHA-256)"""
    try:
        if hashed.startswith("bcrypt:"):
            # bcrypt 格式
            import bcrypt
            stored_hash = hashed[7:].encode('utf-8')
            return bcrypt.checkpw(password.encode('utf-8'), stored_hash)
        else:
            # 旧版 SHA-256 格式
            salt, stored_hash = hashed.split(":")
            return hashlib.sha256((password + salt).encode()).hexdigest() == stored_hash
    except Exception:
        return False


def create_token(user_id: int, username: str) -> str:
    """创建 JWT Token (简化实现，不依赖 PyJWT)"""
    import base64
    import json
    import hmac
    
    # Header
    header = {"alg": "HS256", "typ": "JWT"}
    
    # Payload
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": (datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)).timestamp(),
        "iat": datetime.utcnow().timestamp()
    }
    
    # Encode
    def b64encode(data: dict) -> str:
        return base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip("=")
    
    header_b64 = b64encode(header)
    payload_b64 = b64encode(payload)
    
    # Signature
    message = f"{header_b64}.{payload_b64}"
    signature = hmac.new(JWT_SECRET.encode(), message.encode(), hashlib.sha256).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """解码并验证 JWT Token"""
    import base64
    import json
    import hmac
    
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        
        header_b64, payload_b64, signature_b64 = parts
        
        # Verify signature
        message = f"{header_b64}.{payload_b64}"
        expected_sig = hmac.new(JWT_SECRET.encode(), message.encode(), hashlib.sha256).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode().rstrip("=")
        
        if signature_b64 != expected_sig_b64:
            return None
        
        # Decode payload
        def b64decode(data: str) -> dict:
            padding = 4 - len(data) % 4
            data += "=" * padding
            return json.loads(base64.urlsafe_b64decode(data).decode())
        
        payload = b64decode(payload_b64)
        
        # Check expiration
        if payload.get("exp", 0) < datetime.utcnow().timestamp():
            return None
        
        return payload
    except Exception as e:
        print(f"Token decode error: {e}")
        return None


class UserRepository:
    """用户数据仓库"""
    
    def __init__(self, db):
        self.db = db
    
    def create_user(self, username: str, password: str, email: str = None, risk_level: str = "中等") -> Dict:
        """创建用户 (自动激活)"""
        # 验证密码强度
        is_valid, error_msg = validate_password_strength(password)
        if not is_valid:
            return {"status": "error", "message": error_msg}
        
        # 验证用户名
        if len(username) < 3:
            return {"status": "error", "message": "用户名至少3个字符"}
        if not re.match(r'^[a-zA-Z0-9_\u4e00-\u9fa5]+$', username):
            return {"status": "error", "message": "用户名只能包含字母、数字、下划线和中文"}
        
        password_hash = hash_password(password)
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            try:
                status = "active"
                
                cursor.execute("""
                    INSERT INTO users (username, password_hash, email, risk_level, status)
                    VALUES (?, ?, ?, ?, ?)
                """, (username, password_hash, email, risk_level, status))
                user_id = cursor.lastrowid
                
                return {
                    "status": "created", 
                    "user_id": user_id, 
                    "username": username,
                    "account_status": status
                }
            except Exception as e:
                if "UNIQUE constraint" in str(e):
                    return {"status": "error", "message": "用户名已存在"}
                return {"status": "error", "message": str(e)}
    
    def authenticate(self, username: str, password: str) -> Optional[Dict]:
        """验证用户登录"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, username, password_hash, risk_level, status FROM users WHERE username = ?
            """, (username,))
            row = cursor.fetchone()
            
            if row and verify_password(password, row["password_hash"]):
                return {
                    "user_id": row["id"],
                    "username": row["username"],
                    "risk_level": row["risk_level"],
                    "status": "active"
                }
            return None
    
    def get_user(self, user_id: int) -> Optional[Dict]:
        """获取用户信息"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, username, email, risk_level, status, created_at FROM users WHERE id = ?
            """, (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def update_risk_level(self, user_id: int, risk_level: str) -> Dict:
        """更新风险偏好"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users SET risk_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            """, (risk_level, user_id))
            return {"status": "updated", "risk_level": risk_level}

    def reset_password(self, username: str, new_password: str) -> Dict:
        """重置密码"""
        # 验证密码强度
        is_valid, error_msg = validate_password_strength(new_password)
        if not is_valid:
            return {"status": "error", "message": error_msg}
            
        password_hash = hash_password(new_password)
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET password_hash = ? WHERE username = ?", (password_hash, username))
            if cursor.rowcount == 0:
                return {"status": "error", "message": "用户不存在"}
            return {"status": "success", "message": "密码重置成功"}


def get_user_repo():
    """获取用户仓库"""
    from utils.database import get_database
    return UserRepository(get_database())

async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict:
    """FastAPI 依赖：获取当前用户 (必须认证)"""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


async def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Dict:
    """FastAPI 依赖：获取当前用户 (可选认证，支持访客)"""
    if authorization:
        try:
            token = authorization.replace("Bearer ", "")
            payload = decode_token(token)
            if payload:
                return payload
        except Exception:
            pass
    
    # Return guest user if no valid token
    return {
        "user_id": 1,
        "username": "guest",
        "role": "guest",
        "authenticated": False
    }
