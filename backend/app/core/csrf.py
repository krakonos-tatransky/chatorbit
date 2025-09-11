from fastapi import Request, HTTPException
import hmac, hashlib, base64, os

SECRET = os.environ.get("CSRF_SECRET", "dev-csrf-secret").encode()

def issue_csrf_token(user_id: str) -> str:
    msg = user_id.encode()
    sig = hmac.new(SECRET, msg, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(msg + b"." + sig).decode()

def validate_csrf(token: str, user_id: str) -> bool:
    try:
        raw = base64.urlsafe_b64decode(token.encode())
        msg, sig = raw.split(b".", 1)
        if msg != user_id.encode():
            return False
        expected = hmac.new(SECRET, msg, hashlib.sha256).digest()
        return hmac.compare_digest(sig, expected)
    except Exception:
        return False

def enforce_csrf(request: Request, user_id: str):
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    header = request.headers.get("x-csrf-token")
    if not header or not validate_csrf(header, user_id):
        raise HTTPException(status_code=403, detail="CSRF check failed")
