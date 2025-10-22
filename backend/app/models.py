from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import uuid4

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _utcnow() -> datetime:
    return datetime.utcnow()


class SessionStatus(str, Enum):
    ISSUED = "issued"
    ACTIVE = "active"
    CLOSED = "closed"
    EXPIRED = "expired"
    DELETED = "deleted"


class TokenSession(Base):
    __tablename__ = "tokensession"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    validity_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=False))
    session_ttl_seconds: Mapped[int] = mapped_column(Integer)
    message_char_limit: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=_utcnow)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    status: Mapped[SessionStatus] = mapped_column(SqlEnum(SessionStatus), default=SessionStatus.ISSUED)

    participants: Mapped[List["SessionParticipant"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
    abuse_reports: Mapped[List["AbuseReport"]] = relationship(back_populates="session")
    request_logs: Mapped[List["TokenRequestLog"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class TokenRequestLog(Base):
    __tablename__ = "tokenrequestlog"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("tokensession.id", ondelete="CASCADE"))
    ip_address: Mapped[str] = mapped_column(String(64))
    client_identity: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=_utcnow)

    session: Mapped[TokenSession] = relationship(back_populates="request_logs")


class SessionParticipant(Base):
    __tablename__ = "sessionparticipant"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    session_id: Mapped[int] = mapped_column(ForeignKey("tokensession.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(16))
    ip_address: Mapped[str] = mapped_column(String(64))
    client_identity: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=_utcnow)

    session: Mapped[TokenSession] = relationship(back_populates="participants")


class AbuseReportStatus(str, Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    CLOSED = "closed"


class AbuseReport(Base):
    __tablename__ = "abusereport"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tokensession.id", ondelete="SET NULL"), nullable=True
    )
    session_token: Mapped[str] = mapped_column(String(64), index=True)
    reporter_email: Mapped[str] = mapped_column(String(255))
    reporter_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    participant_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    remote_participants: Mapped[str] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text)
    questionnaire: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[AbuseReportStatus] = mapped_column(
        SqlEnum(AbuseReportStatus), default=AbuseReportStatus.OPEN
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=_utcnow, onupdate=_utcnow
    )

    session: Mapped[Optional[TokenSession]] = relationship(back_populates="abuse_reports")
