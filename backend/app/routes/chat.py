from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.adapters.translation import translate_text
from app.adapters.moderation import prefilter_text, postfilter_text
from app.core.auth import decode_token
from typing import Dict, Set
from http.cookies import SimpleCookie
from app.core.config import settings
from app.core.db import SessionLocal
from app.models.user import User

router = APIRouter(prefix="/rooms", tags=["chat"])

class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, Set[WebSocket]] = {}

    async def connect(self, room_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(room_id, set()).add(ws)

    def disconnect(self, room_id: str, ws: WebSocket):
        self.active.get(room_id, set()).discard(ws)

    async def broadcast(self, room_id: str, message: dict):
        for ws in list(self.active.get(room_id, set())):
            await ws.send_json(message)

manager = ConnectionManager()

@router.websocket("/{room_id}/ws")
async def ws_chat(websocket: WebSocket, room_id: str):
    origin = websocket.headers.get("origin")
    if origin not in {settings.frontend_url, "http://localhost:3000"}:
        await websocket.close(code=4403); return
    
    token = None
    # Cookie
    ck = SimpleCookie(websocket.headers.get("cookie", ""))
    if settings.cookie_name in ck:
        token = ck[settings.cookie_name].value
    # Query
    if not token:
        token = websocket.query_params.get("token")
    # Authorization header
    if not token:
        auth_header = websocket.headers.get("authorization") or websocket.headers.get("Authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1]

    if not token:
        await websocket.close(code=4401); return

    try:
        payload = decode_token(token)
        user_id = payload["sub"]
    except Exception:
        await websocket.close(code=4401); return

    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if not user or (user.is_minor and not user.consent_ok):
            await websocket.close(code=4403); return
    finally:
        db.close()

    # await manager.connect(room_id, websocket)
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "chat.send":
                text = (data.get("text") or "").strip()
                ok, reason = prefilter_text(text)
                if not ok:
                    await websocket.send_json({"type": "system.warn", "code": reason})
                    continue
                translated = translate_text(text, data.get("lang"), "en")
                ok2, reason2 = postfilter_text(translated)
                if not ok2:
                    await websocket.send_json({"type": "system.warn", "code": reason2})
                    continue
                await manager.broadcast(room_id, {
                    "type": "chat.recv",
                    "from": user_id,
                    "text_original": text,
                    "text_translated": translated
                })
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
