from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    app_env: str = Field(default="dev", alias="APP_ENV")
    backend_url: str = Field(default="http://localhost:8000", alias="BACKEND_URL")
    frontend_url: str = Field(default="http://localhost:3000", alias="FRONTEND_URL")

    postgres_user: str = Field(default="chatorbit", alias="POSTGRES_USER")
    postgres_password: str = Field(default="chatorbit", alias="POSTGRES_PASSWORD")
    postgres_db: str = Field(default="chatorbit", alias="POSTGRES_DB")
    postgres_host: str = Field(default="localhost", alias="POSTGRES_HOST")
    postgres_port: str = Field(default="5432", alias="POSTGRES_PORT")

    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    minio_endpoint: str = Field(default="localhost:9000", alias="MINIO_ENDPOINT")
    minio_region: str = Field(default="us-east-1", alias="MINIO_REGION")
    minio_bucket_media: str = Field(default="media", alias="MINIO_BUCKET_MEDIA")
    minio_bucket_quarantine: str = Field(default="quarantine", alias="MINIO_BUCKET_QUARANTINE")
    minio_root_user: str = Field(default="admin", alias="MINIO_ROOT_USER")
    minio_root_password: str = Field(default="adminadmin", alias="MINIO_ROOT_PASSWORD")
    minio_public_url: str = Field(default="http://localhost:9000", alias="MINIO_PUBLIC_URL")

    cookie_name: str = Field(default="chatorbit_session", alias="COOKIE_NAME")
    cookie_domain: str | None = Field(default=None, alias="COOKIE_DOMAIN")
    cookie_secure: bool = Field(default=False, alias="COOKIE_SECURE")
    cookie_samesite: str = Field(default="lax", alias="COOKIE_SAMESITE")

    jwt_secret: str = Field(default="devsecretpleasechange", alias="JWT_SECRET")
    jwt_alg: str = Field(default="HS256", alias="JWT_ALG")
    access_token_expire_minutes: int = Field(default=60, alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    class Config:
        env_file = "../.env"
        extra = "allow"

settings = Settings()
