from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from app.core.deps import get_current_user_id
from app.core.db import SessionLocal
from app.models.user import User, Profile
from app.models.prefs import Prefs

router = APIRouter(prefix="/me", tags=["me"])

class MeUpdate(BaseModel):
    display_name: str | None = None
    gender: str | None = None
    interests: list[str] | None = None
    about: str | None = None
    age_bracket: int | None = None
    ui_language: str | None = "en"

class PrefsUpdate(BaseModel):
    want_genders: list[str] | None = None
    want_age_brackets: list[int] | None = None
    languages_can: list[str] | None = None
    ui_language: str | None = None
    geo_mode: str | None = None
    countries: list[str] | None = None

@router.get("")
def me(current=Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        user = db.get(User, current)
        prof = db.get(Profile, current)
        prefs = db.get(Prefs, current)
        return {"user": {"id": str(user.id), "age_bracket": user.age_bracket, "locale": user.locale, "is_minor": user.is_minor},
                "profile": None if not prof else {"display_name": prof.display_name, "gender": prof.gender, "interests": prof.interests, "about": prof.about},
                "prefs": None if not prefs else {"want_genders": prefs.want_genders, "want_age_brackets": prefs.want_age_brackets, "languages_can": prefs.languages_can, "ui_language": prefs.ui_language, "geo_mode": prefs.geo_mode, "countries": prefs.countries}}
    finally:
        db.close()

@router.put("")
def update_me(data: MeUpdate, current=Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        user = db.get(User, current)
        if data.age_bracket is not None:
            user.age_bracket = data.age_bracket
            user.is_minor = bool(data.age_bracket is not None and data.age_bracket < 18)
        prof = db.get(Profile, current)
        if not prof:
            prof = Profile(user_id=user.id)
            db.add(prof)
        if data.display_name is not None: prof.display_name = data.display_name
        if data.gender is not None: prof.gender = data.gender
        if data.interests is not None: prof.interests = data.interests
        if data.about is not None: prof.about = data.about
        db.commit()
        return {"ok": True}
    finally:
        db.close()

@router.put("/prefs")
def update_prefs(data: PrefsUpdate, current=Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        prefs = db.get(Prefs, current)
        if not prefs:
            prefs = Prefs(user_id=current)
            db.add(prefs)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(prefs, field, value)
        db.commit()
        return {"ok": True}
    finally:
        db.close()
