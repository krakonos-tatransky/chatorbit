from fastapi import HTTPException, Request
from app.core.auth import decode_token, token_from_request
from app.core.db import SessionLocal
from app.models.user import User
from sqlalchemy import select

def get_current_user(request: Request):
    token = token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.id == user_id))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    finally:
        db.close()


def get_current_user_id(request: Request):
    token = token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    db = SessionLocal()
    try:
        existing = db.scalar(select(User.id).where(User.id == user_id))
        if not existing:
            raise HTTPException(status_code=401, detail="User not found")
        return str(existing)
    finally:
        db.close()
