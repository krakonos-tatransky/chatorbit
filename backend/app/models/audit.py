from sqlalchemy import Column, String, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from app.core.db import Base

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor = Column(UUID(as_uuid=True), nullable=True)
    action = Column(String, nullable=False)
    target_type = Column(String, nullable=True)
    target_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    meta = Column(JSONB, nullable=True)
