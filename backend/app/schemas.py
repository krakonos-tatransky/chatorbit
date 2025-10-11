from __future__ import annotations

from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, conint


class ValidityPeriod(str, Enum):
    ONE_DAY = "1_day"
    ONE_WEEK = "1_week"
    ONE_MONTH = "1_month"
    ONE_YEAR = "1_year"

    def as_timedelta(self) -> timedelta:
        mapping = {
            ValidityPeriod.ONE_DAY: timedelta(days=1),
            ValidityPeriod.ONE_WEEK: timedelta(weeks=1),
            ValidityPeriod.ONE_MONTH: timedelta(days=30),
            ValidityPeriod.ONE_YEAR: timedelta(days=365),
        }
        return mapping[self]


class CreateTokenRequest(BaseModel):
    validity_period: ValidityPeriod = Field(description="How long the token can remain claimable.")
    session_ttl_minutes: conint(ge=1, le=24 * 60) = Field(
        description="How long the live chat session stays active once both users connect."
    )
    message_char_limit: conint(ge=200, le=16000) = Field(
        default=2000,
        description="Maximum characters allowed per message.",
    )


class TokenResponse(BaseModel):
    token: str
    validity_expires_at: datetime
    session_ttl_seconds: int
    message_char_limit: int
    created_at: datetime


class JoinSessionRequest(BaseModel):
    token: str
    participant_id: Optional[str] = Field(
        default=None,
        description="Existing participant identifier when reclaiming a session slot.",
    )


class JoinSessionResponse(BaseModel):
    token: str
    participant_id: str
    role: str
    session_active: bool
    session_started_at: Optional[datetime] = None
    session_expires_at: Optional[datetime] = None
    message_char_limit: int


class ParticipantPublic(BaseModel):
    participant_id: str
    role: str
    joined_at: datetime


class SessionStatusResponse(BaseModel):
    token: str
    status: str
    validity_expires_at: datetime
    session_started_at: Optional[datetime]
    session_expires_at: Optional[datetime]
    message_char_limit: int
    participants: List[ParticipantPublic]
    remaining_seconds: Optional[int]


