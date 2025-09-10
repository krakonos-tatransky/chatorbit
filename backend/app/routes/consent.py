from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from app.core.deps import get_current_user_id

router = APIRouter(prefix="/consent", tags=["consent"])

class StartConsent(BaseModel):
    parent_email: EmailStr
    method: str = "portal"  # id_check | microcharge | portal

@router.post("/start")
def start_consent(data: StartConsent, current=Depends(get_current_user_id)):
    # TODO: send parent invite link / start verification flow
    return {"ok": True, "note": "Consent flow started (stub)"}

@router.get("/status")
def status(current=Depends(get_current_user_id)):
    # TODO: read consent table
    return {"verified": False}
