from sqlalchemy import Column, String, Boolean, TIMESTAMP, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.core.db import Base

class Message(Base):
    __tablename__ = "messages"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"))
    sender = Column(UUID(as_uuid=True))
    original_lang = Column(String, default="auto")
    text_original = Column(Text, nullable=True)
    text_translated = Column(Text, nullable=True)
    delivered_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    moderation_label = Column(String, nullable=True)
    redacted = Column(Boolean, default=False)
    media_url = Column(Text, nullable=True)
