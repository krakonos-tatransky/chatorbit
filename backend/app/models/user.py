from sqlalchemy import Column, String, Boolean, Integer, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func
import uuid
from app.core.db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=True)
    phone = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(TIMESTAMP(timezone=True), nullable=True)
    otp_code = Column(String, nullable=True)
    otp_code_expires = Column(TIMESTAMP(timezone=True), nullable=True)
    age_bracket = Column(Integer, nullable=True)
    is_minor = Column(Boolean, default=False)
    locale = Column(String, default="en")
    tz = Column(String, default="UTC")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    status = Column(String, default="active")
    trust_score = Column(Integer, default=0)

class Profile(Base):
    __tablename__ = "profiles"
    user_id = Column(UUID(as_uuid=True), primary_key=True)
    display_name = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    interests = Column(ARRAY(String), nullable=True)
    about = Column(Text, nullable=True)
