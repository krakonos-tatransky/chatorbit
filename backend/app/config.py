from __future__ import annotations

import json
from functools import lru_cache
from typing import Iterable, List

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    """Application configuration."""

    model_config = SettingsConfigDict(env_prefix="CHAT_", env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./data/chat_orbit.db"
    token_rate_limit_per_hour: int = 10
    default_message_char_limit: int = 2000
    max_message_char_limit: int = 16000
    min_message_char_limit: int = 200
    cors_allowed_origins: List[str] | str | None = ["*"]
    cors_allow_credentials: bool = True
    enable_docs: bool = False
    runtime_directory: str = "../runtime"
    runtime_log_to_file: bool = True
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    smtp_sender: str | None = None
    abuse_notifications_email: str | None = None
    admin_username: str | None = None
    admin_password_hash: str | None = None
    admin_token_secret_key: str | None = None
    admin_token_algorithm: str = "HS256"
    admin_token_expire_minutes: int = 60

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def _parse_cors_allowed_origins(cls, value: object) -> List[str]:
        if isinstance(value, list):
            return [str(origin).strip() for origin in value if str(origin).strip()]

        if isinstance(value, (set, tuple)):
            return [str(origin).strip() for origin in value if str(origin).strip()]

        if isinstance(value, str):
            raw_value = value.strip()
            if not raw_value:
                return []
            # Try JSON decoding first so existing JSON formatted configuration continues to work.
            try:
                parsed = json.loads(raw_value)
            except json.JSONDecodeError:
                parsed = None
            if isinstance(parsed, list):
                return [str(origin).strip() for origin in parsed if str(origin).strip()]
            if isinstance(parsed, str):
                parsed_origin = parsed.strip()
                return [parsed_origin] if parsed_origin else []
            return [origin.strip() for origin in raw_value.split(",") if origin.strip()]

        if isinstance(value, Iterable):
            return [str(origin).strip() for origin in value if str(origin).strip()]

        return ["*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
