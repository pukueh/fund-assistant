from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any

from utils.auth import (
    get_user_repo,
    create_token,
    get_current_user,
    UserRepository
)

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# Models
class UserRegisterModel(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    risk_level: Optional[str] = "中等"
    invite_code: str

class UserLoginModel(BaseModel):
    username: str
    password: str

class PasswordResetModel(BaseModel):
    username: str
    new_password: str
    invite_code: str

# Routes

@router.post("/register")
async def register(user: UserRegisterModel):
    """用户注册"""
    if user.invite_code != "pukueh":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邀请码错误，请联系管理员获取"
        )
    try:
        user_repo = get_user_repo()
        # create_user returns dict with status/message or user_id
        result = user_repo.create_user(
            username=user.username,
            password=user.password,
            email=user.email,
            risk_level=user.risk_level or "中等"
        )
        
        if result.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("message")
            )
            
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/login")
async def login(user: UserLoginModel):
    """用户登录 (JSON)"""
    try:
        user_repo = get_user_repo()
        # authenticate returns dict (success) or error dict or None (fail)
        auth_result = user_repo.authenticate(user.username, user.password)
        
        if not auth_result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户名或密码错误"
            )
            
        if "error" in auth_result:
            # Account status issues (pending, banned, etc)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=auth_result["message"]
            )
            
        # Success: Generate token
        token = create_token(
            user_id=auth_result["user_id"],
            username=auth_result["username"]
        )
        
        return {
            "status": "success",
            "token": token,
            "user": {
                "id": auth_result["user_id"],
                "username": auth_result["username"],
                "risk_level": auth_result.get("risk_level", "中等"),
                "status": auth_result.get("status", "active")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/reset-password")
async def reset_password(data: PasswordResetModel):
    """重置密码 (需验证邀请码)"""
    if data.invite_code != "pukueh":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邀请码错误，无法重置密码"
        )
    
    try:
        user_repo = get_user_repo()
        result = user_repo.reset_password(data.username, data.new_password)
        
        if result["status"] == "error":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )
            
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/guest-login")
async def guest_login():
    """访客登录 (体验模式)"""
    try:
        # Create a virtual user token with ID 0
        token = create_token(
            user_id=0,
            username="Guest"
        )
        
        return {
            "status": "success",
            "token": token,
            "user": {
                "id": 0,
                "username": "Guest",
                "risk_level": "中等",
                "status": "active",
                "role": "guest"
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """获取当前用户信息"""
    try:
        user_repo = get_user_repo()
        user_id = current_user.get("user_id")
        
        # Handle Guest user
        if user_id == 0:
            return {
                "id": 0,
                "username": "Guest",
                "risk_level": "中等",
                "status": "active",
                "role": "guest"
            }
            
        user = user_repo.get_user(user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Remove sensitive data
        if "password_hash" in user:
            del user["password_hash"]
            
        return user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
