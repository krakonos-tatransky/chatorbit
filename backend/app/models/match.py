from sqlalchemy import Column, String, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.core.db import Base

class Match(Base):
    __tablename__ = "matches"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    a = Column(UUID(as_uuid=True), nullable=False)
    b = Column(UUID(as_uuid=True), nullable=False)
    started_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    ended_at = Column(TIMESTAMP(timezone=True), nullable=True)
    status = Column(String, default="pending")

class Room(Base):
    __tablename__ = "rooms"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id"))
    type = Column(String, default="text")
    is_active = Column(Boolean, default=True)
