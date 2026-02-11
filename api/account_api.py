"""
Account API - Multi-Account System
P3 Feature: Create/manage multiple portfolio accounts
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
import sqlite3
import os
import uuid
from fastapi import APIRouter, HTTPException, Depends
from utils.auth import get_current_user

# Use the shared database instead of a separate portfolio.db
from utils.database import get_database

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


# Pydantic Models
class AccountCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class Account(BaseModel):
    id: str
    user_id: str
    name: str
    description: str
    created_at: str
    is_default: bool = False


class HoldingTransfer(BaseModel):
    fund_code: str
    shares: float
    cost: float


# Tables are now initialized by Database._init_tables() in utils/database.py
# No separate init_accounts_table() needed


# Helper function
def get_db():
    """Get a database connection from the shared database"""
    db = get_database()
    import sqlite3
    conn = sqlite3.connect(db.db_path)
    conn.row_factory = sqlite3.Row
    return conn


@router.get("")
async def list_accounts(current_user: Dict = Depends(get_current_user)):
    """List all accounts for a user"""
    user_id = str(current_user["user_id"])
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT * FROM accounts WHERE user_id = ? ORDER BY is_default DESC, created_at ASC",
        (user_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    
    # If no accounts, create default account
    if not rows:
        default_account = await create_account(
            AccountCreate(name="我的持仓", description="默认账户"),
            current_user=current_user
        )
        return [default_account]
    
    return [dict(row) for row in rows]


@router.post("")
async def create_account(account: AccountCreate, current_user: Dict = Depends(get_current_user)):
    """Create a new account"""
    user_id = str(current_user["user_id"])
    conn = get_db()
    cursor = conn.cursor()
    
    account_id = str(uuid.uuid4())[:8]
    created_at = datetime.now().isoformat()
    
    # Check if this is the first account (make it default)
    cursor.execute("SELECT COUNT(*) FROM accounts WHERE user_id = ?", (user_id,))
    count = cursor.fetchone()[0]
    is_default = 1 if count == 0 else 0
    
    cursor.execute(
        """INSERT INTO accounts (id, user_id, name, description, is_default, created_at)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (account_id, user_id, account.name, account.description or "", is_default, created_at)
    )
    conn.commit()
    conn.close()
    
    return {
        "id": account_id,
        "user_id": user_id,
        "name": account.name,
        "description": account.description or "",
        "is_default": bool(is_default),
        "created_at": created_at
    }


@router.get("/{account_id}")
async def get_account(account_id: str, current_user: Dict = Depends(get_current_user)):
    """Get account details"""
    user_id = str(current_user["user_id"])
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM accounts WHERE id = ? AND user_id = ?", (account_id, user_id))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return dict(row)


@router.put("/{account_id}")
async def update_account(account_id: str, update: AccountUpdate, current_user: Dict = Depends(get_current_user)):
    """Update account details"""
    user_id = str(current_user["user_id"])
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify ownership
    cursor.execute("SELECT id FROM accounts WHERE id = ? AND user_id = ?", (account_id, user_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Build update query dynamically
    updates = []
    values = []
    
    if update.name is not None:
        updates.append("name = ?")
        values.append(update.name)
    if update.description is not None:
        updates.append("description = ?")
        values.append(update.description)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    values.append(account_id)
    
    cursor.execute(
        f"UPDATE accounts SET {', '.join(updates)} WHERE id = ?",
        values
    )
    conn.commit()
    conn.close()
    
    return await get_account(account_id, current_user)


@router.delete("/{account_id}")
async def delete_account(account_id: str, current_user: Dict = Depends(get_current_user)):
    """Delete an account (holdings will be orphaned)"""
    user_id = str(current_user["user_id"])
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if it's the default account and ownership
    cursor.execute("SELECT is_default FROM accounts WHERE id = ? AND user_id = ?", (account_id, user_id))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Account not found")
    
    if row["is_default"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot delete default account")
    
    cursor.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
    conn.commit()
    conn.close()
    
    return {"deleted": account_id}


@router.post("/{account_id}/set-default")
async def set_default_account(account_id: str, current_user: Dict = Depends(get_current_user)):
    """Set an account as the default"""
    user_id = str(current_user["user_id"])
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify ownership
    cursor.execute("SELECT id FROM accounts WHERE id = ? AND user_id = ?", (account_id, user_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Unset current default
    cursor.execute(
        "UPDATE accounts SET is_default = 0 WHERE user_id = ?",
        (user_id,)
    )
    
    # Set new default
    cursor.execute(
        "UPDATE accounts SET is_default = 1 WHERE id = ? AND user_id = ?",
        (account_id, user_id)
    )
    
    conn.commit()
    conn.close()
    
    return {"default_account": account_id}


@router.get("/{account_id}/holdings")
async def get_account_holdings(account_id: str, current_user: Dict = Depends(get_current_user)):
    """Get holdings for a specific account"""
    user_id = str(current_user["user_id"])
    conn = get_db()
    cursor = conn.cursor()

    # Verify ownership
    cursor.execute("SELECT 1 FROM accounts WHERE id = ? AND user_id = ?", (account_id, user_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Account not found")
    
    cursor.execute(
        "SELECT * FROM holdings WHERE account_id = ? AND user_id = ?",
        (account_id, user_id)
    )
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


@router.get("/{account_id}/summary")
async def get_account_summary(account_id: str, current_user: Dict = Depends(get_current_user)):
    """Get portfolio summary for a specific account"""
    from tools.portfolio_tools import PortfolioTool
    from tools.market_data import get_market_service

    user_id = str(current_user["user_id"])
    conn = get_db()
    cursor = conn.cursor()

    # Verify ownership
    cursor.execute("SELECT 1 FROM accounts WHERE id = ? AND user_id = ?", (account_id, user_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Get holdings for this account
    cursor.execute(
        "SELECT fund_code, fund_name, shares, cost_nav FROM holdings WHERE account_id = ? AND user_id = ?",
        (account_id, user_id)
    )
    holdings = cursor.fetchall()
    conn.close()
    
    if not holdings:
        return {
            "account_id": account_id,
            "holdings_count": 0,
            "total_cost": 0,
            "total_value": 0,
            "total_profit": 0,
            "total_profit_rate": 0,
            "holdings": []
        }
    
    # Calculate values using market data
    market_service = get_market_service()
    fund_codes = [h["fund_code"] for h in holdings]
    navs = market_service.get_funds_nav(fund_codes)
    
    total_cost = 0
    total_value = 0
    holdings_data = []
    
    for h in holdings:
        fund_code = h["fund_code"]
        shares = float(h["shares"])
        cost_nav = float(h["cost_nav"])
        cost = shares * cost_nav
        
        nav = navs.get(fund_code)
        current_nav = nav.nav if nav else cost_nav
        
        value = shares * current_nav
        profit = value - cost
        profit_rate = (profit / cost * 100) if cost > 0 else 0
        
        total_cost += cost
        total_value += value
        
        holdings_data.append({
            "fund_code": fund_code,
            "fund_name": nav.fund_name if nav else fund_code,
            "shares": shares,
            "cost": cost,
            "nav": current_nav,
            "value": value,
            "profit": profit,
            "profit_rate": profit_rate
        })
    
    total_profit = total_value - total_cost
    total_profit_rate = (total_profit / total_cost * 100) if total_cost > 0 else 0
    
    return {
        "account_id": account_id,
        "holdings_count": len(holdings_data),
        "total_cost": round(total_cost, 2),
        "total_value": round(total_value, 2),
        "total_profit": round(total_profit, 2),
        "total_profit_rate": round(total_profit_rate, 2),
        "holdings": holdings_data
    }
