from fastapi import APIRouter, Depends
from pydantic import BaseModel
import uuid
from app.core.deps import get_current_user_id
from app.adapters.storage import presign_put, presign_get
from app.core.config import settings

router = APIRouter(prefix="/media", tags=["media"])

class PresignResponse(BaseModel):
    key: str
    upload_url: str
    get_url: str

@router.post("/presign", response_model=PresignResponse)
def presign_media(current=Depends(get_current_user_id)):
    key = f"{current}/{uuid.uuid4()}.bin"
    put = presign_put(settings.minio_bucket_quarantine, key)
    get = presign_get(settings.minio_bucket_quarantine, key)
    return {"key": key, "upload_url": put, "get_url": get}
