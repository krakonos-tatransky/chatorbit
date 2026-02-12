from __future__ import annotations

from datetime import datetime, timedelta
from enum import Enum
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field, conint

from .models import AbuseReportStatus


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
    client_identity: Optional[str] = Field(
        default=None,
        description="Optional unique identifier provided by the client instead of an IP address.",
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
    client_identity: Optional[str] = Field(
        default=None,
        description="Optional unique identifier provided by the client instead of an IP address.",
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


class ReportAbuseQuestionnaire(BaseModel):
    immediate_threat: bool = Field(
        default=False,
        description="Set to true if you or anyone else is in immediate danger.",
    )
    involves_criminal_activity: bool = Field(
        default=False,
        description="Indicates whether the behavior may involve criminal activity.",
    )
    requires_follow_up: bool = Field(
        default=False,
        description="Let us know if you are willing to participate in a follow-up investigation.",
    )
    additional_details: Optional[str] = Field(
        default=None,
        max_length=4000,
        description="Optional additional context you wish to share.",
    )


class ReportAbuseRequest(BaseModel):
    participant_id: Optional[str] = Field(
        default=None,
        description="Identifier of the participant submitting the report.",
    )
    reporter_email: EmailStr = Field(description="Contact email for follow-up communication.")
    summary: str = Field(
        min_length=10,
        max_length=2000,
        description="A concise description of the abusive behavior.",
    )
    questionnaire: ReportAbuseQuestionnaire


class ReportAbuseResponse(BaseModel):
    report_id: int
    status: str
    session_status: str


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminSessionParticipant(BaseModel):
    participant_id: str
    role: str
    ip_address: str
    internal_ip_address: Optional[str]
    client_identity: Optional[str]
    request_headers: Optional[dict[str, Any]]
    joined_at: datetime


class AdminSessionSummary(BaseModel):
    token: str
    status: str
    validity_expires_at: datetime
    session_started_at: Optional[datetime]
    session_expires_at: Optional[datetime]
    message_char_limit: int
    participants: List[AdminSessionParticipant]


class AdminSessionListResponse(BaseModel):
    sessions: List[AdminSessionSummary]


class AdminRateLimitLock(BaseModel):
    identifier_type: Literal["client_identity", "ip_address"]
    identifier: str
    request_count: int
    window_seconds: int
    last_request_at: datetime


class AdminRateLimitListResponse(BaseModel):
    locks: List[AdminRateLimitLock]


class AdminResetRateLimitRequest(BaseModel):
    identifier_type: Literal["client_identity", "ip_address"]
    identifier: str


class AdminResetRateLimitResponse(BaseModel):
    removed_entries: int


class AdminAbuseReportParticipant(BaseModel):
    participant_id: Optional[str]
    role: Optional[str]
    ip_address: Optional[str]
    internal_ip_address: Optional[str]
    client_identity: Optional[str]
    joined_at: Optional[datetime]


class AdminAbuseReport(BaseModel):
    id: int
    status: AbuseReportStatus
    created_at: datetime
    updated_at: datetime
    session_token: str
    reporter_email: EmailStr
    reporter_ip: Optional[str]
    participant_id: Optional[str]
    summary: str
    questionnaire: Optional[dict[str, Any]]
    escalation_step: Optional[str]
    admin_notes: Optional[str]
    remote_participants: List[AdminAbuseReportParticipant]


class AdminAbuseReportListResponse(BaseModel):
    reports: List[AdminAbuseReport]


class ContactRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200, description="Sender's name.")
    email: EmailStr = Field(description="Sender's email address for acknowledgement.")
    subject: str = Field(min_length=1, max_length=200, description="Message subject.")
    message: str = Field(min_length=10, max_length=5000, description="Message body.")


class ContactResponse(BaseModel):
    success: bool
    message: str


class AdminUpdateAbuseReportRequest(BaseModel):
    status: Optional[AbuseReportStatus] = Field(
        default=None,
        description="Update the workflow status for the abuse report.",
    )
    escalation_step: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Next escalation action administrators should perform.",
    )
    admin_notes: Optional[str] = Field(
        default=None,
        max_length=4000,
        description="Internal notes recorded by the administrator handling the case.",
    )


