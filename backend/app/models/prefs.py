from sqlalchemy import Column, String, Integer
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.core.db import Base

class Prefs(Base):
    __tablename__ = "prefs"
    user_id = Column(UUID(as_uuid=True), primary_key=True)
    want_genders = Column(ARRAY(String), nullable=True)
    want_age_brackets = Column(ARRAY(Integer), nullable=True)
    languages_can = Column(ARRAY(String), nullable=True)
    ui_language = Column(String, default="en")
    geo_mode = Column(String, default="soft")  # soft|strict
    countries = Column(ARRAY(String), nullable=True)
