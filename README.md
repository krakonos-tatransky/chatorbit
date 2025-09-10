# ChatOrbit – Starter Monorepo (FastAPI + Next.js + Redis + Postgres + MinIO)

End-to-end scaffold for a multilingual, safety-first random chat app.

## Stack
- **Frontend**: Next.js (App Router), Tailwind
- **Backend**: FastAPI (REST + WebSockets), SQLAlchemy
- **Workers**: Celery (Redis broker) for moderation/translation/notifications
- **DB**: Postgres
- **Cache/Queues**: Redis
- **Object Storage**: MinIO (S3-compatible) with presigned uploads
- **Auth**: OTP/email magic-link (stub) + JWT
- **Safety**: Rule-based prefilters + async moderation adapters (stubs)
- **Minor Mode**: parental consent placeholders, strict policies
- **Notifications**: Web Push (stub plumbing)

## Quick start
1. Create a `.env` from `.env.example` at the repo root and inside `backend/.env.example` and `frontend/.env.local.example`.
2. Start infra and apps:
   ```bash
   docker compose up --build
   ```
3. Access:
   - Frontend: http://localhost:3000
   - Backend docs: http://localhost:8000/docs
   - MinIO console: http://localhost:9001 (user/pass from .env)
   - Postgres: localhost:5432 (user/pass from .env)
   - Redis: localhost:6379

## Dev notes
- The backend auto-creates tables on start. Swap to Alembic for production.
- Worker tasks are idempotent and safe to retry.
- Adapters under `backend/app/adapters` are where you wire real providers
  (translation, image moderation, email/SMS for OTP, push services).

## Folder map
```
backend/        # FastAPI app + Celery worker
frontend/       # Next.js (App Router)
infra/          # docker-compose + Dockerfiles + scripts
shared/         # shared schemas/types (JSON, TS types), if needed
```

## MVP scope included
- Auth OTP flow (stub) and JWT session
- Profiles & preferences
- Queue join/leave and simple matcher
- WebSocket chat with server-side translation stub + "show original"
- Report/block and basic moderation pipeline sketch
- Presigned media uploads to MinIO (quarantine → TODO: scan → publish)

## Next steps
- Replace stubs in `adapters/*` with real vendors (LLM moderation, translation).
- Add CSAM hash matching + nudity classifier in `adapters/moderation.py`.
- Implement verifiable parental consent in `routes/consent.py` (choose a provider).
- Add WebRTC (audio captions) in `/chat/[roomId]` with a TURN server (coturn).
- Enable Alembic migrations.
```
