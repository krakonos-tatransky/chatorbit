from fastapi import APIRouter, Depends
from pydantic import BaseModel
import uuid
from app.core.config import settings
from app.core.deps import get_current_user
from app.core.csrf import enforce_csrf
from app.core.config import settings
from app.adapters.storage import public_client
from app.tasks import moderation as mod

router = APIRouter(prefix="/media", tags=["media"])

class PresignResponse(BaseModel):
    key: str
    upload_url: str
    get_url: str


@router.post("/presign")
def presign_media(request: Request, user=Depends(get_current_user)):
    enforce_csrf(request, str(user.id))
    key = f"{user.id}/{uuid4()}.bin"

    put_url = public_client.presigned_put_object(
        settings.minio_bucket_quarantine,
        key,
        expires=timedelta(minutes=10),
    )
    get_url = public_client.presigned_get_object(
        settings.minio_bucket_quarantine,
        key,
        expires=timedelta(minutes=10),
    )
    return {"upload_url": put_url, "get_url": get_url, "key": key}

@router.post("/publish")
def publish_media(request: Request, data: dict, user=Depends(get_current_user)):
    enforce_csrf(request, str(user.id))
    key = data["key"]
    # enqueue scan; worker will copy from quarantine->media if clean
    mod.review_async.delay(user_id=str(user.id), key=key)
    return {"ok": True}
