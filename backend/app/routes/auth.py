from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, HTTPException, Response, Request
from app.core.auth import (
    create_access_token,
    set_session_cookie,
    clear_session_cookie,
    token_from_request,
)
from app.core.db import SessionLocal
from app.models.user import User
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from app.core.security import hash_password, verify_password
from app.core.email import send_email
import uuid, secrets

router = APIRouter(prefix="/auth", tags=["auth"])

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    code: str

@router.post("/otp/request")
def otp_request(data: OTPRequest):
    code = f"{secrets.randbelow(1000000):06d}"
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == data.email))
        if not user:
            user = User(email=str(data.email), is_minor=False)
            db.add(user)
            db.flush()
        user.otp_code = code
        user.otp_code_expires = datetime.now(timezone.utc) + timedelta(minutes=10)
        db.commit()
        send_email(to=str(data.email), subject="Your OTP Code", body=f"Your code is {code}")
        return {"ok": True, "note": "OTP sent", "dev_code": code}
    finally:
        db.close()

@router.post("/otp/verify")
def otp_verify(data: OTPVerify, response: Response):
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == data.email))
        if not user or user.otp_code != data.code:
            raise HTTPException(status_code=400, detail="Invalid code")
        if not user.otp_code_expires or user.otp_code_expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Code expired")
        user.otp_code = None
        user.otp_code_expires = None
        db.commit()
        token = create_access_token(str(user.id))
        set_session_cookie(response, token)
        return {"access_token": token, "token_type": "bearer", "user_id": str(user.id)}
    finally:
        db.close()


class RegisterIn(BaseModel):
    email: EmailStr
    password: str

@router.post("/register")
def register(data: RegisterIn, response: Response):
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == data.email))
        if existing and existing.password_hash:
            raise HTTPException(status_code=400, detail="Email already registered.")
        if not existing:
            existing = User(email=str(data.email), is_minor=False)
            db.add(existing); db.flush()
        existing.password_hash = hash_password(data.password)
        db.commit()
        token = create_access_token(str(existing.id))
        set_session_cookie(response, token)
        return {"access_token": token, "token_type": "bearer", "user_id": str(existing.id)}
    finally:
        db.close()

class LoginIn(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
def login(data: LoginIn, response: Response):
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == data.email))
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials.")
        token = create_access_token(str(user.id))
        set_session_cookie(response, token)
        return {"access_token": token, "token_type": "bearer", "user_id": str(user.id)}
    finally:
        db.close()

class ForgotIn(BaseModel):
    email: EmailStr

@router.post("/password/forgot")
def password_forgot(data: ForgotIn):
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == data.email))
        if user:
            user.reset_token = uuid.uuid4().hex
            user.reset_token_expires = datetime.now(timezone.utc) + timedelta(minutes=30)
            db.commit()
            send_email(
                to=str(data.email),
                subject="Password reset",
                body=f"Your reset token is {user.reset_token}",
            )
            return {"ok": True, "dev_token": user.reset_token}
        return {"ok": True}
    finally:
        db.close()

class ResetIn(BaseModel):
    email: EmailStr
    token: str
    new_password: str

@router.post("/password/reset")
def password_reset(data: ResetIn):
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == data.email))
        if not user or not user.reset_token or user.reset_token != data.token:
            raise HTTPException(status_code=400, detail="Invalid token.")
        if not user.reset_token_expires or user.reset_token_expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Token expired.")
        user.password_hash = hash_password(data.new_password)
        user.reset_token = None
        user.reset_token_expires = None
        db.commit()
        return {"ok": True}
    finally:
        db.close()

@router.post("/logout")
def logout(response: Response):
    clear_session_cookie(response)
    return {"ok": True}
