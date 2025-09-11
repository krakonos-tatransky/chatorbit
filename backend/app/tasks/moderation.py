from celery import Celery
# celery app import...
from app.core.config import settings
from app.adapters.storage import private_client
from minio.commonconfig import CopySource

@celery.task(name="moderation.review_async")
def review_async(user_id: str, key: str):
    # TODO: call real moderation vendors
    # if clean -> copy to media bucket
    source = CopySource(settings.minio_bucket_quarantine, key)
    private_client.copy_object(settings.minio_bucket_media, key, source)
    # optionally delete from quarantine after copy
