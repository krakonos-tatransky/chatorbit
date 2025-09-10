from celery import Celery
import os

broker_url = os.environ.get("REDIS_URL", "redis://redis:6379/0")
celery_app = Celery("chatorbit", broker=broker_url, backend=broker_url)

@celery_app.task(name="moderation.review_async")
def moderation_review_async(message_id: str):
    # TODO: fetch message by ID, run heavy checks (nudity, CSAM hashes), update DB
    return {"message_id": message_id, "status": "scanned"}

@celery_app.task(name="notify.push")
def notify_push(user_id: str, title: str, body: str):
    # TODO: integrate Web Push/APNs/FCM
    return {"user_id": user_id}
