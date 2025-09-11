from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user
import time
import redis
import os

router = APIRouter(prefix="/queue", tags=["queue"])
r = redis.from_url(os.environ.get("REDIS_URL", "redis://redis:6379/0"))

QUEUE_KEY = "waiting_room"

def score_for(user_id: str) -> float:
    # simple: wait time based score; extend with interests, geo, etc.
    return time.time()

@router.post("/join")
def join(current=Depends(get_current_user)):
    if current.is_minor and not current.consent_ok:
        raise HTTPException(403, "Parental consent required")
    uid = str(current.id)
    r.zadd(QUEUE_KEY, {uid: score_for(uid)})
    return {"status": "waiting"}

@router.post("/leave")
def leave(current=Depends(get_current_user)):
    if current.is_minor and not current.consent_ok:
        raise HTTPException(403, "Parental consent required")
    uid = str(current.id)
    r.zrem(QUEUE_KEY, uid)
    return {"status": "left"}

@router.get("/status")
def status(current=Depends(get_current_user)):
    if current.is_minor and not current.consent_ok:
        raise HTTPException(403, "Parental consent required")
    uid = str(current.id)
    rank = r.zrank(QUEUE_KEY, uid)
    size = r.zcard(QUEUE_KEY)
    return {"rank": rank, "queue_size": size}
