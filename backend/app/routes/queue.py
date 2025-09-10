from fastapi import APIRouter, Depends
from app.core.deps import get_current_user_id
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
def join(current=Depends(get_current_user_id)):
    r.zadd(QUEUE_KEY, {current: score_for(current)})
    return {"status": "waiting"}

@router.post("/leave")
def leave(current=Depends(get_current_user_id)):
    r.zrem(QUEUE_KEY, current)
    return {"status": "left"}

@router.get("/status")
def status(current=Depends(get_current_user_id)):
    rank = r.zrank(QUEUE_KEY, current)
    size = r.zcard(QUEUE_KEY)
    return {"rank": rank, "queue_size": size}
