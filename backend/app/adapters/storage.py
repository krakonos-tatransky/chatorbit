from minio import Minio
from app.core.config import settings
from datetime import timedelta
from urllib.parse import urlparse

# internal client (not used for presign)
internal_client = Minio(
    settings.minio_endpoint,
    access_key=settings.minio_root_user,
    secret_key=settings.minio_root_password,
    secure=False,
    region=settings.minio_region,   # optional, ok to include too
)

# public presign client — signs URLs for the host your browser will call
_pu = urlparse(settings.minio_public_url)  # e.g. http://localhost:9000
public_client = Minio(
    _pu.netloc,                              # "localhost:9000"
    access_key=settings.minio_root_user,
    secret_key=settings.minio_root_password,
    secure=_pu.scheme == "https",
    region=settings.minio_region,            # <-- IMPORTANT
)

def presign_put(bucket: str, key: str, expires_minutes: int = 10):
    return public_client.presigned_put_object(bucket, key, expires=timedelta(minutes=expires_minutes))

def presign_get(bucket: str, key: str, expires_minutes: int = 10):
    return public_client.presigned_get_object(bucket, key, expires=timedelta(minutes=expires_minutes))
