from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user_id
from app.core.db import SessionLocal
from app.models.match import Match, Room
from sqlalchemy import select
import redis, os, time

router = APIRouter(prefix="/match", tags=["match"])
r = redis.from_url(os.environ.get("REDIS_URL", "redis://redis:6379/0"))

QUEUE_KEY = "waiting_room"

@router.post("/accept/{match_id}")
def accept(match_id: str, current=Depends(get_current_user_id)):
    # For MVP: auto-accept by creating a room if both present
    db = SessionLocal()
    try:
        m = db.get(Match, match_id)
        if not m:
            raise HTTPException(404, "No such match")
        room = Room(match_id=m.id)
        db.add(room); db.commit()
        return {"room_id": str(room.id)}
    finally:
        db.close()

@router.post("/find")
def find(current=Depends(get_current_user_id)):
    # naive: pop two earliest users
    ids = r.zrange(QUEUE_KEY, 0, 1)
    if len(ids) < 2:
        return {"status": "waiting"}
    a, b = ids[0].decode(), ids[1].decode()
    if current not in (a, b):
        return {"status": "waiting"}
    r.zrem(QUEUE_KEY, a); r.zrem(QUEUE_KEY, b)
    db = SessionLocal()
    try:
        match = Match(a=a, b=b, status="accepted")
        db.add(match); db.commit()
        room = Room(match_id=match.id)
        db.add(room); db.commit()
        return {"status": "matched", "room_id": str(room.id)}
    finally:
        db.close()
