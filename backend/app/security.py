from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from . import config


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/token")


def _to_bytes(value: str) -> bytes:
    return value.encode("utf-8")


def _get_settings() -> config.Settings:
    return config.get_settings()


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(_to_bytes(plain_password), _to_bytes(hashed_password))
    except (TypeError, ValueError):
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(_to_bytes(password), bcrypt.gensalt()).decode("utf-8")


def authenticate_admin(username: str, password: str) -> bool:
    settings = _get_settings()
    if not settings.admin_username or not settings.admin_password_hash:
        return False
    if username != settings.admin_username:
        return False
    return verify_password(password, settings.admin_password_hash)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    settings = _get_settings()
    if not settings.admin_token_secret_key:
        raise RuntimeError("Admin token secret key is not configured.")

    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.admin_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode,
        settings.admin_token_secret_key,
        algorithm=settings.admin_token_algorithm,
    )


def decode_token(token: str) -> Dict[str, Any]:
    settings = _get_settings()
    if not settings.admin_token_secret_key:
        raise RuntimeError("Admin token secret key is not configured.")
    return jwt.decode(
        token,
        settings.admin_token_secret_key,
        algorithms=[settings.admin_token_algorithm],
    )


def get_current_admin(token: str = Depends(oauth2_scheme)) -> str:
    settings = _get_settings()
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not settings.admin_username or not settings.admin_token_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin authentication is not configured.",
        )

    try:
        payload = decode_token(token)
    except JWTError:
        raise credentials_exception from None

    username: Optional[str] = payload.get("sub")
    if not username or username != settings.admin_username:
        raise credentials_exception

    return username
