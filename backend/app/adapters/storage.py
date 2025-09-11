from minio import Minio
from app.core.config import settings
from datetime import timedelta

def _client(public: bool = False) -> Minio:
    endpoint = settings.minio_public_url.replace("http://", "").replace("https://", "") \
        if public else settings.minio_endpoint
    # e.g., endpoint: "minio:9000" for internal; public: "localhost:9000"
    return Minio(
        endpoint,
        access_key=settings.minio_root_user,
        secret_key=settings.minio_root_password,
        secure=settings.minio_public_url.startswith("https://") if public else False,
        region=settings.minio_region,  # avoid location probe
    )

public_client = _client(public=True)
private_client = _client(public=False)

def presign_put(bucket: str, key: str, expires_minutes: int = 10):
    return public_client.presigned_put_object(bucket, key, expires=timedelta(minutes=expires_minutes))

def presign_get(bucket: str, key: str, expires_minutes: int = 10):
    return public_client.presigned_get_object(bucket, key, expires=timedelta(minutes=expires_minutes))
