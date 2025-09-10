from datetime import datetime, timedelta
import jwt
from fastapi import Response, Request
from app.core.config import settings

def create_access_token(sub: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": sub, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_alg)

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])

def set_session_cookie(resp: Response, token: str):
    resp.set_cookie(
        key=settings.cookie_name,
        value=token,
        httponly=True,
        secure=bool(settings.cookie_secure),
        samesite=settings.cookie_samesite.lower(),  # "lax" | "strict" | "none"
        domain=settings.cookie_domain or None,
        path="/",
        max_age=60 * 60,  # match ACCESS_TOKEN_EXPIRE_MINUTES if you like
    )

def clear_session_cookie(resp: Response):
    resp.delete_cookie(
        key=settings.cookie_name,
        domain=settings.cookie_domain or None,
        path="/",
    )

def token_from_request(request: Request) -> str | None:
    # 1) Authorization Bearer
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    # 2) Cookie
    return request.cookies.get(settings.cookie_name)
