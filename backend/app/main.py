from __future__ import annotations

import asyncio
import ipaddress
import json
import logging
import re
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional, Set
from uuid import uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    FastAPI,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import OAuth2PasswordRequestForm
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session, selectinload

from .config import get_settings
from .database import (
    SessionLocal,
    check_database_connection,
    get_database_statistics,
    get_session,
    init_db,
)
from .email_utils import create_email_message, send_email
from .models import (
    AbuseReport,
    AbuseReportStatus,
    SessionParticipant,
    SessionStatus,
    TokenRequestLog,
    TokenSession,
)
from .schemas import (
    AdminAbuseReport,
    AdminAbuseReportListResponse,
    AdminAbuseReportParticipant,
    AdminRateLimitListResponse,
    AdminRateLimitLock,
    AdminSessionListResponse,
    AdminSessionParticipant,
    AdminSessionSummary,
    AdminTokenResponse,
    AdminUpdateAbuseReportRequest,
    AdminResetRateLimitRequest,
    AdminResetRateLimitResponse,
    CreateTokenRequest,
    JoinSessionRequest,
    JoinSessionResponse,
    ParticipantPublic,
    ReportAbuseRequest,
    ReportAbuseResponse,
    SessionStatusResponse,
    TokenResponse,
)
from .security import authenticate_admin, create_access_token, get_current_admin

settings = get_settings()
logger = logging.getLogger(__name__)
app = FastAPI(
    title="ChatOrbit Minimal API",
    version="0.1.0",
    docs_url="/docs" if settings.enable_docs else None,
    redoc_url="/redoc" if settings.enable_docs else None,
    openapi_url="/openapi.json" if settings.enable_docs else None,
)

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
    init_db()
    if not check_database_connection():
        raise RuntimeError("Database connection check failed during startup.")


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


@router.get("/health/database")
def database_healthcheck() -> Dict[str, Any]:
    if not check_database_connection():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
    return {"status": "ok", "statistics": get_database_statistics()}


def _normalize_ip(candidate: Optional[str]) -> Optional[str]:
    if not candidate:
        return None

    value = candidate.strip().strip("\"'")
    if not value or value.lower() == "unknown":
        return None

    if value.startswith("[") and value.endswith("]"):
        value = value[1:-1]

    if value.lower().startswith("ipv6:"):
        value = value[5:]

    if value.startswith("::ffff:"):
        value = value[7:]

    if "%" in value:
        value = value.split("%", 1)[0]

    host_part = value

    try:
        ipaddress.ip_address(host_part)
    except ValueError:
        stripped_host: Optional[str] = None
        if host_part.count(":") == 1 and host_part.replace(":", "").replace(".", "").isdigit():
            stripped_host = host_part.split(":", 1)[0]
        elif host_part.count(":") > 1 and host_part.rsplit(":", 1)[-1].isdigit():
            stripped_host = host_part.rsplit(":", 1)[0]

        if not stripped_host:
            return None

        try:
            ipaddress.ip_address(stripped_host)
        except ValueError:
            return None
        return stripped_host

    return host_part


_FORWARDED_FOR_PATTERN = re.compile(
    r"for=(?:[\"']?)(\[[^;,\s\"']+\]|[^;,\s\"']+)", re.IGNORECASE
)


def _iter_forwarded_for_values(header_value: str) -> Iterable[str]:
    for match in _FORWARDED_FOR_PATTERN.finditer(header_value):
        yield match.group(1)


def _candidate_ip_addresses(request: Request) -> Iterable[str]:
    seen: Set[str] = set()

    for header_value in request.headers.getlist("x-forwarded-for"):
        for part in header_value.split(","):
            normalized = _normalize_ip(part)
            if normalized and normalized not in seen:
                seen.add(normalized)
                yield normalized

    real_ip = _normalize_ip(request.headers.get("x-real-ip"))
    if real_ip and real_ip not in seen:
        seen.add(real_ip)
        yield real_ip

    forwarded_header = request.headers.get("forwarded")
    if forwarded_header:
        for raw_value in _iter_forwarded_for_values(forwarded_header):
            normalized = _normalize_ip(raw_value)
            if normalized and normalized not in seen:
                seen.add(normalized)
                yield normalized

    host = _normalize_ip(request.client.host if request.client else None)
    if host and host not in seen:
        seen.add(host)
        yield host


def get_client_ip(request: Optional[Request]) -> str:
    if not request:
        return "unknown"

    for candidate in _candidate_ip_addresses(request):
        return candidate

    return "unknown"


def get_internal_client_ip(request: Optional[Request]) -> str:
    if not request or not request.client:
        return "unknown"

    normalized = _normalize_ip(request.client.host)
    return normalized or request.client.host or "unknown"


def snapshot_request_headers(request: Optional[Request]) -> Optional[str]:
    if not request:
        return None

    headers_payload: Dict[str, Any] = {
        "client_host": request.client.host if request.client else None,
        "x_forwarded_for": request.headers.get("x-forwarded-for"),
        "x_real_ip": request.headers.get("x-real-ip"),
        "x_forwarded_proto": request.headers.get("x-forwarded-proto"),
        "host": request.headers.get("host"),
        "all_headers": {key: value for key, value in request.headers.items()},
    }

    try:
        return json.dumps(headers_payload, sort_keys=True)
    except (TypeError, ValueError):
        logger.warning("Unable to serialize request headers snapshot", exc_info=True)
        return None


def enforce_rate_limit(db: Session, *, ip: str, client_identity: Optional[str]) -> None:
    window_start = utcnow() - timedelta(hours=1)
    if client_identity:
        stmt = (
            select(func.count())
            .select_from(TokenRequestLog)
            .where(
                TokenRequestLog.client_identity == client_identity,
                TokenRequestLog.created_at >= window_start,
            )
        )
    else:
        stmt = (
            select(func.count())
            .select_from(TokenRequestLog)
            .where(TokenRequestLog.ip_address == ip, TokenRequestLog.created_at >= window_start)
        )
    count = db.execute(stmt).scalar() or 0
    if count >= settings.token_rate_limit_per_hour:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Token request limit reached for this identifier. Please try again later.",
        )


def ensure_session_state(session_model: TokenSession) -> None:
    now = utcnow()
    if session_model.status in {SessionStatus.CLOSED, SessionStatus.EXPIRED, SessionStatus.DELETED}:
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


def _not_found(detail: str) -> HTTPException:
    """Create a standardized 404 response with an application-specific header."""

    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=detail,
        headers={"msg-app": detail},
    )


def _serialize_admin_participant(participant: SessionParticipant) -> AdminSessionParticipant:
    return AdminSessionParticipant(
        participant_id=participant.id,
        role=participant.role,
        ip_address=participant.ip_address,
        internal_ip_address=participant.internal_ip_address,
        client_identity=participant.client_identity,
        request_headers=_deserialize_json(participant.request_headers),
        joined_at=participant.joined_at,
    )


def _serialize_admin_session(session_model: TokenSession) -> AdminSessionSummary:
    ensure_session_state(session_model)
    return AdminSessionSummary(
        token=session_model.token,
        status=session_model.status.value,
        validity_expires_at=session_model.validity_expires_at,
        session_started_at=session_model.started_at,
        session_expires_at=session_model.ended_at,
        message_char_limit=session_model.message_char_limit,
        participants=[_serialize_admin_participant(participant) for participant in session_model.participants],
    )


def _deserialize_json(value: Optional[str]) -> Optional[Any]:
    if not value:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        logger.warning("Failed to decode stored JSON payload", exc_info=True)
        return None


def _parse_datetime(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            logger.debug("Invalid datetime format encountered while parsing JSON payload.")
            return None
    return None


def _normalize_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _serialize_admin_report(report: AbuseReport) -> AdminAbuseReport:
    questionnaire_raw = _deserialize_json(report.questionnaire)
    questionnaire = questionnaire_raw if isinstance(questionnaire_raw, dict) else None
    remote_participants_raw = _deserialize_json(report.remote_participants)
    remote_participants: List[AdminAbuseReportParticipant] = []
    if isinstance(remote_participants_raw, list):
        for entry in remote_participants_raw:
            if not isinstance(entry, dict):
                continue
            remote_participants.append(
                AdminAbuseReportParticipant(
                    participant_id=entry.get("participant_id"),
                    role=entry.get("role"),
                    ip_address=entry.get("ip_address"),
                    internal_ip_address=entry.get("internal_ip_address"),
                    client_identity=entry.get("client_identity"),
                    joined_at=_parse_datetime(entry.get("joined_at")),
                )
            )
    return AdminAbuseReport(
        id=report.id,
        status=report.status,
        created_at=report.created_at,
        updated_at=report.updated_at,
        session_token=report.session_token,
        reporter_email=report.reporter_email,
        reporter_ip=report.reporter_ip,
        participant_id=report.participant_id,
        summary=report.summary,
        questionnaire=questionnaire,
        escalation_step=report.escalation_step,
        admin_notes=report.admin_notes,
        remote_participants=remote_participants,
    )


def _collect_remote_participants(
    session_model: TokenSession,
    reporter_id: Optional[str],
) -> List[Dict[str, Any]]:
    participants: List[Dict[str, Any]] = []
    for participant in session_model.participants:
        if reporter_id and participant.id == reporter_id:
            continue
        participants.append(
            {
                "participant_id": participant.id,
                "role": participant.role,
                "ip_address": participant.ip_address,
                "internal_ip_address": participant.internal_ip_address,
                "client_identity": participant.client_identity,
                "joined_at": participant.joined_at.isoformat(),
            }
        )
    return participants


def _collect_rate_limit_locks(db: Session) -> List[AdminRateLimitLock]:
    window_seconds = int(timedelta(hours=1).total_seconds())
    window_start = utcnow() - timedelta(seconds=window_seconds)
    threshold = settings.token_rate_limit_per_hour
    locks: List[AdminRateLimitLock] = []

    identity_rows = db.execute(
        select(
            TokenRequestLog.client_identity,
            func.count().label("request_count"),
            func.max(TokenRequestLog.created_at).label("last_request_at"),
        )
        .where(
            TokenRequestLog.client_identity.is_not(None),
            TokenRequestLog.created_at >= window_start,
        )
        .group_by(TokenRequestLog.client_identity)
    ).all()

    for identity, count, last_request_at in identity_rows:
        if count >= threshold and identity:
            locks.append(
                AdminRateLimitLock(
                    identifier_type="client_identity",
                    identifier=identity,
                    request_count=int(count),
                    window_seconds=window_seconds,
                    last_request_at=last_request_at,
                )
            )

    ip_rows = db.execute(
        select(
            TokenRequestLog.ip_address,
            func.count().label("request_count"),
            func.max(TokenRequestLog.created_at).label("last_request_at"),
        )
        .where(
            TokenRequestLog.client_identity.is_(None),
            TokenRequestLog.created_at >= window_start,
        )
        .group_by(TokenRequestLog.ip_address)
    ).all()

    for ip_address, count, last_request_at in ip_rows:
        if count >= threshold and ip_address:
            locks.append(
                AdminRateLimitLock(
                    identifier_type="ip_address",
                    identifier=ip_address,
                    request_count=int(count),
                    window_seconds=window_seconds,
                    last_request_at=last_request_at,
                )
            )

    locks.sort(key=lambda lock: lock.last_request_at, reverse=True)
    return locks


def _get_session_by_token(db: Session, token: str) -> TokenSession:
    stmt = select(TokenSession).where(TokenSession.token == token)
    session_model = db.execute(stmt).scalar_one_or_none()
    if not session_model:
        raise _not_found("Token not found in database.")
    db.refresh(session_model)
    return session_model


@router.post("/tokens", response_model=TokenResponse)
def issue_token(
    request: CreateTokenRequest,
    db: Session = Depends(get_session),
    http_request: Request = None,
) -> TokenResponse:
    ip_address = get_client_ip(http_request)
    internal_ip_address = get_internal_client_ip(http_request)
    enforce_rate_limit(db, ip=ip_address, client_identity=request.client_identity)

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

    log = TokenRequestLog(
        session_id=session_model.id,
        ip_address=ip_address,
        internal_ip_address=internal_ip_address,
        client_identity=request.client_identity,
    )
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
    if session_model.status == SessionStatus.DELETED:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Session has been deleted.")

    ip_address = get_client_ip(http_request)
    internal_ip_address = get_internal_client_ip(http_request)
    client_identity = request.client_identity
    headers_snapshot = snapshot_request_headers(http_request)

    if request.participant_id:
        participant_stmt = select(SessionParticipant).where(
            SessionParticipant.session_id == session_model.id,
            SessionParticipant.id == request.participant_id,
        )
        participant = db.execute(participant_stmt).scalar_one_or_none()
        if not participant:
            raise _not_found("Participant record not found for this session.")
        updated = False
        if participant.ip_address != ip_address:
            participant.ip_address = ip_address
            updated = True
        if participant.internal_ip_address != internal_ip_address:
            participant.internal_ip_address = internal_ip_address
            updated = True
        if participant.client_identity != client_identity:
            participant.client_identity = client_identity
            updated = True
        if headers_snapshot is not None and participant.request_headers != headers_snapshot:
            participant.request_headers = headers_snapshot
            updated = True
        if updated:
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

    existing_participant: Optional[SessionParticipant] = None
    if client_identity:
        existing_participant = next(
            (p for p in session_model.participants if p.client_identity == client_identity),
            None,
        )
    if not client_identity and not existing_participant:
        existing_participant = next(
            (p for p in session_model.participants if p.ip_address == ip_address),
            None,
        )
    if existing_participant:
        updated = False
        if existing_participant.ip_address != ip_address:
            existing_participant.ip_address = ip_address
            updated = True
        if existing_participant.internal_ip_address != internal_ip_address:
            existing_participant.internal_ip_address = internal_ip_address
            updated = True
        if existing_participant.client_identity != client_identity:
            existing_participant.client_identity = client_identity
            updated = True
        if headers_snapshot is not None and existing_participant.request_headers != headers_snapshot:
            existing_participant.request_headers = headers_snapshot
            updated = True
        if updated:
            db.add(existing_participant)
            db.commit()
            db.refresh(existing_participant)
            db.refresh(session_model)
        else:
            db.refresh(existing_participant)
            db.refresh(session_model)
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
    participant = SessionParticipant(
        session_id=session_model.id,
        role=role,
        ip_address=ip_address,
        internal_ip_address=internal_ip_address,
        client_identity=client_identity,
        request_headers=headers_snapshot,
    )
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


@router.post("/sessions/{token}/report-abuse", response_model=ReportAbuseResponse)
def report_abuse(
    token: str,
    report: ReportAbuseRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session),
    http_request: Request = None,
) -> ReportAbuseResponse:
    session_model = _get_session_by_token(db, token)
    ensure_session_state(session_model)

    reporter_id = report.participant_id
    if reporter_id and not any(p.id == reporter_id for p in session_model.participants):
        logger.warning("Participant %s not found in session %s during abuse report.", reporter_id, token)
        reporter_id = None

    remote_participants = _collect_remote_participants(session_model, reporter_id)
    questionnaire_payload = report.questionnaire.model_dump()
    reporter_ip = get_client_ip(http_request) if http_request else None

    abuse_record = AbuseReport(
        session_id=session_model.id,
        session_token=session_model.token,
        reporter_email=str(report.reporter_email),
        reporter_ip=reporter_ip,
        participant_id=reporter_id,
        remote_participants=json.dumps(remote_participants),
        summary=report.summary,
        questionnaire=json.dumps(questionnaire_payload),
        status=AbuseReportStatus.OPEN,
    )
    db.add(abuse_record)

    now = utcnow()
    if session_model.status not in {SessionStatus.CLOSED, SessionStatus.EXPIRED, SessionStatus.DELETED}:
        if session_model.started_at is None:
            session_model.started_at = now
        session_model.ended_at = now
        session_model.status = SessionStatus.DELETED
        db.add(session_model)

    db.commit()
    db.refresh(abuse_record)
    db.refresh(session_model)

    sender = settings.smtp_sender or settings.smtp_username or "no-reply@chatorbit"

    if settings.smtp_host:
        acknowledgement_body = (
            "Thank you for letting us know.\n\n"
            "We received your abuse report for session {token} and our team will review it shortly. "
            "The session has been terminated and you will receive further communication "
            "if additional information is required."
        ).format(token=session_model.token)
        acknowledgement = create_email_message(
            subject="We have received your abuse report",
            body=acknowledgement_body,
            recipients=str(report.reporter_email),
            sender=sender,
        )
        background_tasks.add_task(send_email, acknowledgement)

        admin_recipient = settings.abuse_notifications_email or settings.smtp_username
        if admin_recipient:
            admin_body = (
                "A new abuse report has been submitted.\n\n"
                f"Session token: {session_model.token}\n"
                f"Report ID: {abuse_record.id}\n"
                f"Reporter email: {report.reporter_email}\n"
                f"Reporter IP: {reporter_ip or 'unknown'}\n"
                f"Participant ID: {reporter_id or 'not provided'}\n"
                f"Summary:\n{report.summary}\n\n"
                f"Questionnaire:\n{json.dumps(questionnaire_payload, indent=2)}\n"
            )
            admin_message = create_email_message(
                subject=f"Abuse report {abuse_record.id} for session {session_model.token}",
                body=admin_body,
                recipients=admin_recipient,
                sender=sender,
            )
            background_tasks.add_task(send_email, admin_message)
        else:
            logger.warning("Abuse notification email is not configured; skipping admin alert.")
    else:
        logger.warning("SMTP host is not configured; skipping abuse report email notifications.")

    background_tasks.add_task(manager.broadcast, token, {"type": "abuse_reported"})
    background_tasks.add_task(broadcast_status, token)

    return ReportAbuseResponse(
        report_id=abuse_record.id,
        status=abuse_record.status.value,
        session_status=session_model.status.value,
    )


@router.delete("/sessions/{token}", response_model=SessionStatusResponse)
def delete_session(
    token: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session),
) -> SessionStatusResponse:
    session_model = _get_session_by_token(db, token)
    ensure_session_state(session_model)
    if session_model.status != SessionStatus.DELETED:
        now = utcnow()
        if session_model.started_at is None:
            session_model.started_at = now
        session_model.ended_at = now
        session_model.status = SessionStatus.DELETED
        db.add(session_model)
        db.commit()
        db.refresh(session_model)
    response = serialize_session(session_model)
    background_tasks.add_task(manager.broadcast, token, {"type": "session_deleted"})
    background_tasks.add_task(broadcast_status, token)
    return response


@router.post("/admin/token", response_model=AdminTokenResponse)
def issue_admin_token(form_data: OAuth2PasswordRequestForm = Depends()) -> AdminTokenResponse:
    if not settings.admin_username or not settings.admin_password_hash:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin authentication is not configured.",
        )
    if not settings.admin_token_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin token secret is not configured.",
        )
    if not authenticate_admin(form_data.username, form_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": settings.admin_username})
    return AdminTokenResponse(access_token=token)


@router.get("/admin/sessions", response_model=AdminSessionListResponse)
def list_admin_sessions(
    status_filter: Optional[str] = None,
    token_query: Optional[str] = None,
    ip: Optional[str] = None,
    db: Session = Depends(get_session),
    _: str = Depends(get_current_admin),
) -> AdminSessionListResponse:
    stmt = (
        select(TokenSession)
        .options(selectinload(TokenSession.participants))
        .order_by(TokenSession.created_at.desc())
    )

    if status_filter == "active":
        stmt = stmt.where(TokenSession.status == SessionStatus.ACTIVE)
    elif status_filter == "inactive":
        stmt = stmt.where(
            TokenSession.status.in_(
                [SessionStatus.CLOSED, SessionStatus.EXPIRED, SessionStatus.DELETED]
            )
        )

    if token_query:
        stmt = stmt.where(TokenSession.token.ilike(f"%{token_query}%"))

    if ip:
        stmt = (
            stmt.join(SessionParticipant)
            .where(
                or_(
                    SessionParticipant.ip_address.ilike(f"%{ip}%"),
                    SessionParticipant.internal_ip_address.ilike(f"%{ip}%"),
                )
            )
            .distinct()
        )

    stmt = stmt.limit(200)
    sessions = db.execute(stmt).scalars().unique().all()
    return AdminSessionListResponse(sessions=[_serialize_admin_session(session) for session in sessions])


@router.get("/admin/rate-limits", response_model=AdminRateLimitListResponse)
def list_admin_rate_limits(
    db: Session = Depends(get_session),
    _: str = Depends(get_current_admin),
) -> AdminRateLimitListResponse:
    locks = _collect_rate_limit_locks(db)
    return AdminRateLimitListResponse(locks=locks)


@router.post("/admin/rate-limits/reset", response_model=AdminResetRateLimitResponse)
def reset_admin_rate_limit(
    request: AdminResetRateLimitRequest,
    db: Session = Depends(get_session),
    _: str = Depends(get_current_admin),
) -> AdminResetRateLimitResponse:
    window_seconds = int(timedelta(hours=1).total_seconds())
    window_start = utcnow() - timedelta(seconds=window_seconds)

    if request.identifier_type == "client_identity":
        stmt = delete(TokenRequestLog).where(
            TokenRequestLog.client_identity == request.identifier,
            TokenRequestLog.created_at >= window_start,
        )
    else:
        stmt = delete(TokenRequestLog).where(
            TokenRequestLog.client_identity.is_(None),
            TokenRequestLog.ip_address == request.identifier,
            TokenRequestLog.created_at >= window_start,
        )

    result = db.execute(stmt)
    db.commit()

    return AdminResetRateLimitResponse(removed_entries=result.rowcount or 0)


@router.get("/admin/reports", response_model=AdminAbuseReportListResponse)
def list_admin_reports(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_session),
    _: str = Depends(get_current_admin),
) -> AdminAbuseReportListResponse:
    stmt = select(AbuseReport).order_by(AbuseReport.created_at.desc()).limit(200)

    if status_filter:
        normalized = status_filter.lower()
        if normalized in {"unresolved"}:
            stmt = stmt.where(
                AbuseReport.status.in_(
                    [
                        AbuseReportStatus.OPEN,
                        AbuseReportStatus.ACKNOWLEDGED,
                        AbuseReportStatus.INVESTIGATING,
                    ]
                )
            )
        else:
            try:
                status_value = AbuseReportStatus(normalized)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter."
                ) from exc
            stmt = stmt.where(AbuseReport.status == status_value)

    reports = db.execute(stmt).scalars().all()
    return AdminAbuseReportListResponse(reports=[_serialize_admin_report(report) for report in reports])


@router.patch("/admin/reports/{report_id}", response_model=AdminAbuseReport)
def update_admin_report(
    report_id: int,
    updates: AdminUpdateAbuseReportRequest,
    db: Session = Depends(get_session),
    _: str = Depends(get_current_admin),
) -> AdminAbuseReport:
    if (
        updates.status is None
        and updates.escalation_step is None
        and updates.admin_notes is None
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one field must be provided to update the report.",
        )

    report = db.get(AbuseReport, report_id)
    if not report:
        raise _not_found("Abuse report not found.")

    updated = False

    if updates.status is not None and updates.status != report.status:
        report.status = updates.status
        updated = True

    if updates.escalation_step is not None:
        normalized_step = _normalize_optional_text(updates.escalation_step)
        if normalized_step != (report.escalation_step or None):
            report.escalation_step = normalized_step
            updated = True

    if updates.admin_notes is not None:
        normalized_notes = _normalize_optional_text(updates.admin_notes)
        if normalized_notes != (report.admin_notes or None):
            report.admin_notes = normalized_notes
            updated = True

    if updated:
        db.add(report)
        db.commit()
        db.refresh(report)
    else:
        db.refresh(report)

    return _serialize_admin_report(report)


app.include_router(router)


async def _handle_http_exception(request: Request, exc: HTTPException) -> Response:
    if (
        exc.status_code == status.HTTP_404_NOT_FOUND
        and request.scope.get("route") is None
    ):
        return Response(status_code=status.HTTP_404_NOT_FOUND)

    return await http_exception_handler(request, exc)


@app.exception_handler(HTTPException)
async def fastapi_http_exception_handler(request: Request, exc: HTTPException) -> Response:
    return await _handle_http_exception(request, exc)


@app.exception_handler(StarletteHTTPException)
async def starlette_http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> Response:
    return await _handle_http_exception(request, exc)


def _get_participant(db: Session, session_id: int, participant_id: str) -> SessionParticipant:
    stmt = select(SessionParticipant).where(
        SessionParticipant.session_id == session_id, SessionParticipant.id == participant_id
    )
    participant = db.execute(stmt).scalar_one_or_none()
    if not participant:
        raise _not_found("Participant not found in session.")
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
        if session_model.status in {SessionStatus.EXPIRED, SessionStatus.CLOSED, SessionStatus.DELETED}:
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
                if session_model.status in {
                    SessionStatus.EXPIRED,
                    SessionStatus.CLOSED,
                    SessionStatus.DELETED,
                }:
                    message_type = (
                        "session_expired"
                        if session_model.status == SessionStatus.EXPIRED
                        else "session_deleted"
                        if session_model.status == SessionStatus.DELETED
                        else "session_closed"
                    )
                    await manager.broadcast(token, {"type": message_type})
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
