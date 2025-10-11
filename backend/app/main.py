from __future__ import annotations

import asyncio
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import get_settings
from .database import SessionLocal, get_session, init_db
from .models import ChatMessage, SessionParticipant, SessionStatus, TokenRequestLog, TokenSession
from .schemas import (
    CreateTokenRequest,
    JoinSessionRequest,
    JoinSessionResponse,
    ParticipantPublic,
    SessionStatusResponse,
    TokenResponse,
)

settings = get_settings()
app = FastAPI(title="ChatOrbit Minimal API", version="0.1.0")

allow_all_origins = any(origin == "*" for origin in settings.cors_allowed_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else settings.cors_allowed_origins,
    allow_credentials=settings.cors_allow_credentials and not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def utcnow() -> datetime:
    return datetime.utcnow()


@app.on_event("startup")
def on_startup() -> None:
    Path("data").mkdir(parents=True, exist_ok=True)
    init_db()


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: Dict[str, Dict[str, WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, token: str, participant_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.setdefault(token, {})[participant_id] = websocket

    async def disconnect(self, token: str, participant_id: str) -> None:
        async with self._lock:
            participants = self._connections.get(token)
            if not participants:
                return
            participants.pop(participant_id, None)
            if not participants:
                self._connections.pop(token, None)

    async def broadcast(
        self,
        token: str,
        message: Dict[str, Any],
        *,
        exclude: Optional[Iterable[str]] = None,
    ) -> None:
        skip: Set[str] = set(exclude or [])
        async with self._lock:
            websockets = list(self._connections.get(token, {}).items())
        payload = json.dumps(message)
        for participant, ws in websockets:
            if participant in skip:
                continue
            await ws.send_text(payload)

    async def send(self, token: str, participant_id: str, message: Dict[str, Any]) -> None:
        async with self._lock:
            ws = self._connections.get(token, {}).get(participant_id)
        if ws:
            await ws.send_text(json.dumps(message))

    async def connected_participants(self, token: str) -> List[str]:
        async with self._lock:
            return list(self._connections.get(token, {}).keys())


manager = ConnectionManager()
router = APIRouter(prefix="/api")


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def enforce_rate_limit(db: Session, ip: str) -> None:
    window_start = utcnow() - timedelta(hours=1)
    stmt = (
        select(func.count())
        .select_from(TokenRequestLog)
        .where(TokenRequestLog.ip_address == ip, TokenRequestLog.created_at >= window_start)
    )
    count = db.execute(stmt).scalar() or 0
    if count >= settings.token_rate_limit_per_hour:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Token request limit reached for this IP. Please try again later.",
        )


def ensure_session_state(session_model: TokenSession) -> None:
    now = utcnow()
    if session_model.status in {SessionStatus.CLOSED, SessionStatus.EXPIRED}:
        return
    if session_model.status == SessionStatus.ISSUED and now > session_model.validity_expires_at:
        session_model.status = SessionStatus.EXPIRED
    elif session_model.status == SessionStatus.ACTIVE and session_model.ended_at and now >= session_model.ended_at:
        session_model.status = SessionStatus.CLOSED


def serialize_session(session_model: TokenSession) -> SessionStatusResponse:
    ensure_session_state(session_model)
    now = utcnow()
    remaining: Optional[int] = None
    if session_model.status == SessionStatus.ACTIVE and session_model.ended_at:
        remaining = int(max(0, (session_model.ended_at - now).total_seconds()))
    participants = [
        ParticipantPublic(participant_id=p.id, role=p.role, joined_at=p.joined_at)
        for p in session_model.participants
    ]
    return SessionStatusResponse(
        token=session_model.token,
        status=session_model.status.value,
        validity_expires_at=session_model.validity_expires_at,
        session_started_at=session_model.started_at,
        session_expires_at=session_model.ended_at,
        message_char_limit=session_model.message_char_limit,
        participants=participants,
        remaining_seconds=remaining,
    )


def _get_session_by_token(db: Session, token: str) -> TokenSession:
    stmt = select(TokenSession).where(TokenSession.token == token)
    session_model = db.execute(stmt).scalar_one_or_none()
    if not session_model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found.")
    db.refresh(session_model)
    return session_model


@router.post("/tokens", response_model=TokenResponse)
def issue_token(
    request: CreateTokenRequest,
    db: Session = Depends(get_session),
    http_request: Request = None,
) -> TokenResponse:
    ip_address = get_client_ip(http_request)
    enforce_rate_limit(db, ip_address)

    message_limit = min(
        max(request.message_char_limit, settings.min_message_char_limit),
        settings.max_message_char_limit,
    )

    now = utcnow()
    token_value = uuid4().hex
    validity_expires_at = now + request.validity_period.as_timedelta()

    session_model = TokenSession(
        token=token_value,
        validity_expires_at=validity_expires_at,
        session_ttl_seconds=int(request.session_ttl_minutes) * 60,
        message_char_limit=message_limit,
    )
    db.add(session_model)
    db.flush()

    log = TokenRequestLog(session_id=session_model.id, ip_address=ip_address)
    db.add(log)
    db.commit()
    db.refresh(session_model)

    return TokenResponse(
        token=session_model.token,
        validity_expires_at=session_model.validity_expires_at,
        session_ttl_seconds=session_model.session_ttl_seconds,
        message_char_limit=session_model.message_char_limit,
        created_at=session_model.created_at,
    )


@router.post("/sessions/join", response_model=JoinSessionResponse)
def join_session(
    request: JoinSessionRequest,
    db: Session = Depends(get_session),
    http_request: Request = None,
) -> JoinSessionResponse:
    session_model = _get_session_by_token(db, request.token)
    ensure_session_state(session_model)

    if session_model.status == SessionStatus.EXPIRED:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Token expired.")
    if session_model.status == SessionStatus.CLOSED:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Session already closed.")

    ip_address = get_client_ip(http_request)

    if request.participant_id:
        participant_stmt = select(SessionParticipant).where(
            SessionParticipant.session_id == session_model.id,
            SessionParticipant.id == request.participant_id,
        )
        participant = db.execute(participant_stmt).scalar_one_or_none()
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Participant record not found for this session.",
            )
        if participant.ip_address != ip_address:
            participant.ip_address = ip_address
            db.add(participant)
        db.add(session_model)
        db.commit()
        db.refresh(participant)
        db.refresh(session_model)

        return JoinSessionResponse(
            token=session_model.token,
            participant_id=participant.id,
            role=participant.role,
            session_active=session_model.status == SessionStatus.ACTIVE,
            session_started_at=session_model.started_at,
            session_expires_at=session_model.ended_at,
            message_char_limit=session_model.message_char_limit,
        )

    existing_participant = next((p for p in session_model.participants if p.ip_address == ip_address), None)
    if existing_participant:
        db.refresh(existing_participant)
        return JoinSessionResponse(
            token=session_model.token,
            participant_id=existing_participant.id,
            role=existing_participant.role,
            session_active=session_model.status == SessionStatus.ACTIVE,
            session_started_at=session_model.started_at,
            session_expires_at=session_model.ended_at,
            message_char_limit=session_model.message_char_limit,
        )

    if len(session_model.participants) >= 2:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Session already has two participants.")

    role = "host" if not session_model.participants else "guest"
    participant = SessionParticipant(session_id=session_model.id, role=role, ip_address=ip_address)
    db.add(participant)

    now = utcnow()
    if role == "guest":
        session_model.status = SessionStatus.ACTIVE
        session_model.started_at = now
        session_model.ended_at = now + timedelta(seconds=session_model.session_ttl_seconds)
    db.add(session_model)
    db.commit()
    db.refresh(participant)
    db.refresh(session_model)

    return JoinSessionResponse(
        token=session_model.token,
        participant_id=participant.id,
        role=participant.role,
        session_active=session_model.status == SessionStatus.ACTIVE,
        session_started_at=session_model.started_at,
        session_expires_at=session_model.ended_at,
        message_char_limit=session_model.message_char_limit,
    )


@router.get("/sessions/{token}/status", response_model=SessionStatusResponse)
def session_status(token: str, db: Session = Depends(get_session)) -> SessionStatusResponse:
    session_model = _get_session_by_token(db, token)
    ensure_session_state(session_model)
    db.add(session_model)
    db.commit()
    db.refresh(session_model)
    return serialize_session(session_model)


@router.get("/sessions/{token}/messages")
def list_messages(token: str, db: Session = Depends(get_session)) -> Dict[str, Any]:
    session_model = _get_session_by_token(db, token)
    ensure_session_state(session_model)

    message_stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_model.id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = db.execute(message_stmt).scalars().all()

    items = [
        {
            "message_id": message.message_id,
            "participant_id": message.participant_id,
            "content": message.content,
            "created_at": message.created_at,
            "deleted_at": message.deleted_at,
        }
        for message in messages
    ]

    return {"items": items}


app.include_router(router)


def _get_participant(db: Session, session_id: int, participant_id: str) -> SessionParticipant:
    stmt = select(SessionParticipant).where(
        SessionParticipant.session_id == session_id, SessionParticipant.id == participant_id
    )
    participant = db.execute(stmt).scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found.")
    db.refresh(participant)
    return participant


async def broadcast_status(token: str) -> None:
    with SessionLocal() as db:
        session_model = _get_session_by_token(db, token)
        ensure_session_state(session_model)
        db.add(session_model)
        db.commit()
        db.refresh(session_model)
        payload = serialize_session(session_model).model_dump(mode="json")
    payload.update(
        {
            "type": "status",
            "connected_participants": await manager.connected_participants(token),
        }
    )
    await manager.broadcast(token, payload)


async def send_error(token: str, participant_id: str, message: str) -> None:
    await manager.send(token, participant_id, {"type": "error", "message": message})


@app.websocket("/ws/sessions/{token}")
async def websocket_session(websocket: WebSocket, token: str) -> None:
    participant_id = websocket.query_params.get("participantId")
    if not participant_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    with SessionLocal() as db:
        try:
            session_model = _get_session_by_token(db, token)
        except HTTPException:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        ensure_session_state(session_model)
        if session_model.status in {SessionStatus.EXPIRED, SessionStatus.CLOSED}:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        participant_stmt = select(SessionParticipant).where(
            SessionParticipant.session_id == session_model.id,
            SessionParticipant.id == participant_id,
        )
        participant = db.execute(participant_stmt).scalar_one_or_none()
        if not participant:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        db.refresh(participant)
        db.refresh(session_model)

    await manager.connect(token, participant_id, websocket)
    await broadcast_status(token)

    try:
        while True:
            with SessionLocal() as loop_db:
                session_model = _get_session_by_token(loop_db, token)
                ensure_session_state(session_model)
                if session_model.status in {SessionStatus.EXPIRED, SessionStatus.CLOSED}:
                    await manager.broadcast(token, {"type": "session_closed"})
                    break
                timeout: Optional[float] = None
                if session_model.status == SessionStatus.ACTIVE and session_model.ended_at:
                    timeout = max(0.1, (session_model.ended_at - utcnow()).total_seconds())
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(), timeout=timeout if timeout else None
                )
            except asyncio.TimeoutError:
                with SessionLocal() as timeout_db:
                    session_model = _get_session_by_token(timeout_db, token)
                    ensure_session_state(session_model)
                    session_model.status = SessionStatus.CLOSED
                    session_model.ended_at = session_model.ended_at or utcnow()
                    timeout_db.add(session_model)
                    timeout_db.commit()
                await manager.broadcast(token, {"type": "session_closed"})
                break
            except WebSocketDisconnect:
                break

            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                await send_error(token, participant_id, "Invalid payload format.")
                continue

            message_type = payload.get("type")
            if message_type == "signal":
                signal_type = payload.get("signalType")
                if not signal_type:
                    await send_error(token, participant_id, "signalType is required.")
                    continue
                await manager.broadcast(
                    token,
                    {
                        "type": "signal",
                        "signalType": signal_type,
                        "payload": payload.get("payload"),
                        "sender": participant_id,
                    },
                    exclude={participant_id},
                )
            else:
                await send_error(token, participant_id, "Unsupported message type.")

    finally:
        await manager.disconnect(token, participant_id)
        await broadcast_status(token)
