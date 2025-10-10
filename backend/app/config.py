from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration."""

    model_config = SettingsConfigDict(env_prefix="CHAT_", env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./data/chat_orbit.db"
    token_rate_limit_per_hour: int = 10
    default_message_char_limit: int = 2000
    max_message_char_limit: int = 16000
    min_message_char_limit: int = 200
    cors_allowed_origins: List[str] = ["*"]
    cors_allow_credentials: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
