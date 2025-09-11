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
# Docker Restart & Rebuild Guide (ChatOrbit / `infra`)

This guide collects the most useful commands to restart, rebuild, and fully reset your local Docker stack for the ChatOrbit project.

> **Project path used below:** `~/myDev/chatorbit_starter/chatorbit/infra`  
> Replace it if your path differs.

---

## TL;DR Cheat Sheet

```bash
# go to compose folder
cd ~/myDev/chatorbit_starter/chatorbit/infra

# quick restart (no rebuild, no env reload)
docker compose restart

# recreate all containers (picks up .env changes; keeps volumes/data)
docker compose down --remove-orphans
docker compose up -d

# rebuild images + recreate (picks up code & requirements)
docker compose down --remove-orphans
docker compose up -d --build

# full reset (⚠️ deletes Postgres/MinIO/Redis data)
docker compose down -v --remove-orphans
docker compose up -d postgres redis minio
docker compose up -d createbuckets
docker compose up -d --build backend worker frontend
```

---

## Common Scenarios

### 1) Fast restart (containers only)
Use when you only need to bounce processes (e.g., transient errors). No images rebuilt, no env reload.

```bash
cd ~/myDev/chatorbit_starter/chatorbit/infra
docker compose restart
```

### 2) Recreate all containers (pick up env changes)
Use after editing `.env` files. Recreates containers but **keeps volumes** (DB/MinIO data intact).

```bash
cd ~/myDev/chatorbit_starter/chatorbit/infra
docker compose down --remove-orphans
docker compose up -d
```

### 3) Rebuild images + recreate
Use after changing **Dockerfiles**, **requirements.txt**, or when you need a clean image build.

```bash
cd ~/myDev/chatorbit_starter/chatorbit/infra
docker compose down --remove-orphans
docker compose up -d --build
```

### 4) Full reset (nuke volumes)
Use as a last resort or when you want a fresh DB/object store. ⚠️ **This deletes data** in Postgres/MinIO/Redis volumes.

```bash
cd ~/myDev/chatorbit_starter/chatorbit/infra
docker compose down -v --remove-orphans
docker compose up -d postgres redis minio
docker compose up -d createbuckets     # re-create buckets (media/quarantine)
docker compose up -d --build backend worker frontend
```

---

## Service-Specific Handy Commands

### Backend
```bash
# hot restart (no rebuild)
docker compose restart backend

# rebuild backend image (picks up requirements / Dockerfile) + recreate
docker compose up -d --build backend

# tail logs
docker compose logs -f backend
```

### Frontend
```bash
# hot restart
docker compose restart frontend

# rebuild + recreate
docker compose up -d --build frontend

# tail logs
docker compose logs -f frontend
```

### Worker
```bash
docker compose restart worker
docker compose up -d --build worker
docker compose logs -f worker
```

### Datastores
```bash
# Postgres
docker compose logs -f postgres
docker compose exec postgres bash

# MinIO
docker compose logs -f minio
# Console: http://localhost:9001 (minioadmin / minioadmin unless you changed it)

# Redis
docker compose logs -f redis
```

---

## Status & Diagnostics

```bash
# status of all services
docker compose ps

# follow logs for all services
docker compose logs -f

# only the last N lines for a service
docker compose logs -n 100 backend
```

---

## Fix “network in use” / remove orphans

```bash
docker compose down -v --remove-orphans
docker network prune -f   # caution: removes unused networks system-wide
```

---

## Free space / clean dangling artifacts

```bash
# images, containers, networks not referenced by any container
docker system prune -f

# also remove dangling volumes (⚠️ potentially destructive)
docker volume prune -f
```

---

## Notes & Tips

- **Env changes** require a **recreate** to take effect (`down --remove-orphans && up -d`).
- **Code changes inside bind-mounted folders** (e.g., frontend Next.js, backend in dev with watch) often **do not** require rebuilds—just a service restart is enough.
- **Rebuild** when changing Dockerfiles, base images, or dependency lockfiles (`requirements.txt` / `pnpm-lock.yaml`).

---

**Happy shipping!**