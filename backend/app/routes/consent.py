from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from app.core.deps import get_current_user_id
from app.core.db import SessionLocal
from app.models.consent import ParentalConsent
from app.models.user import User
from sqlalchemy import select

router = APIRouter(prefix="/consent", tags=["consent"])

class StartConsent(BaseModel):
    parent_email: EmailStr
    method: str = "portal"  # id_check | microcharge | portal

@router.post("/start")
def start_consent(data: StartConsent, current=Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        existing = db.scalar(select(ParentalConsent).where(ParentalConsent.minor_id == current))
        if not existing:
            consent = ParentalConsent(minor_id=current, parent_contact=str(data.parent_email), method=data.method)
            db.add(consent)
        else:
            existing.parent_contact = str(data.parent_email)
            existing.method = data.method
        db.commit()
        # TODO: send parent invite link / start verification flow
        return {"ok": True, "note": "Consent flow started (stub)"}
    finally:
        db.close()

@router.get("/status")
def status(current=Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        consent = db.get(ParentalConsent, current)
        verified = consent.verified if consent else False
        if verified:
            user = db.get(User, current)
            if user and not user.consent_ok:
                user.consent_ok = True
                db.commit()
        return {"verified": verified}
    finally:
        db.close()
