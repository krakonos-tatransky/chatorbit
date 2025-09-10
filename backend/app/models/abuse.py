from sqlalchemy import Column, String, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.core.db import Base

class AbuseReport(Base):
    __tablename__ = "abuse_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter = Column(UUID(as_uuid=True))
    target = Column(UUID(as_uuid=True))
    room_id = Column(UUID(as_uuid=True))
    type = Column(String)      # grooming, csam, spam, etc.
    reason = Column(String)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    status = Column(String, default="open")
