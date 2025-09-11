from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.db import init_db
from app.core.config import settings
from app.routes import auth, me, queue, match, chat, storage, consent
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis

app = FastAPI(title="ChatOrbit API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(me.router)
app.include_router(queue.router)
app.include_router(match.router)
app.include_router(storage.router)
app.include_router(chat.router)
app.include_router(consent.router)

@app.on_event("startup")
def on_startup():
    init_db()
    
@app.on_event("startup")
async def _startup():
    r = redis.from_url("redis://redis:6379/0", encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(r)

@app.get("/healthz")
def health():
    return {"ok": True}
