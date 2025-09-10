from sqlalchemy import Column, String, Boolean, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.db import Base

class ParentalConsent(Base):
    __tablename__ = "parental_consent"
    minor_id = Column(UUID(as_uuid=True), primary_key=True)
    parent_contact = Column(String, nullable=False)
    method = Column(String, nullable=False)  # id_check, microcharge, portal
    verified = Column(Boolean, default=False)
    evidence_url = Column(String, nullable=True)
    verified_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
