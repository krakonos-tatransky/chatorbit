# ChatOrbit – Token-based two-person chat

A lightweight rebuild of ChatOrbit focused on issuing limited-use chat tokens and connecting exactly two devices in an
end-to-end session. The backend only mints tokens, validates joins, and relays encrypted message bundles; the frontend provides
an elegant control surface for the host and guest.

## What’s inside

| Layer     | Stack                                              | Highlights |
|-----------|----------------------------------------------------|------------|
| Frontend  | Next.js 14 (App Router), React, handcrafted CSS    | Landing page for issuing/redeeming tokens and a responsive chat workspace with countdown + connection state |
| Backend   | FastAPI, SQLAlchemy ORM (SQLite)                   | Token issuance (10/hour rate limit), session lifecycle management, WebSocket bridge for message exchange & deletion |
| Infra     | Docker Compose (frontend + backend)                | Hot reload for local development with a single `docker compose up` |

## Local development

1. **Install frontend dependencies**
   ```bash
   # Install Corepack if your Node.js distribution does not bundle it
   npm install -g corepack  # optional – only needed when `corepack` is missing
   corepack enable pnpm     # ensures pnpm is available
   cd frontend
   pnpm install
   ```
2. **Create a Python virtual env** (optional but recommended) and install backend deps:
   ```bash
   cd ../backend
   virtualenv -p python3 --system-site-packages --prompt '|> ChatOrbit_DEV <|' env
   .env/bin/activate
   pip install -r requirements.txt
   ```
3. **Run the backend**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 50001 --reload
   ```
   Exposing on `0.0.0.0` lets other machines on your LAN reach the API at `http://192.168.1.145:50001`.
4. **Run the frontend**
   ```bash
   cd ../frontend
   NEXT_PUBLIC_API_BASE_URL=http://192.168.1.145:50001 \
   NEXT_PUBLIC_WS_BASE_URL=ws://192.168.1.145:50001 \
   pnpm dev --hostname 0.0.0.0 --port 80
   ```
5. Open http://192.168.1.145 from any device on the same network to mint tokens and join sessions.

### Dockerized workflow

```bash
cd infra
docker compose up --build
```

This spins up the FastAPI backend on port **50001** (with SQLite persistence under `backend/data/`) and the Next.js frontend on
port **80**, both reachable via the LAN IP `http://192.168.1.145`.

## Key concepts

- **Token minting** – Each device can request up to 10 tokens per hour. The requester picks the validity window (one day/week/
  month/year), the active session TTL, and the per-message character cap (200–16,000).
- **Joining & activation** – The first device to join reserves the host seat. The second activates the session, starts the
  countdown, and locks the token to both participants.
- **WebSocket messaging** – Messages are relayed as signed bundles. Either author can delete their own line, instantly removing
  it from both histories. When the timer expires the backend closes the session and notifies both peers.

## Project structure

```
backend/
    app/
      config.py          # Settings & environment parsing
      database.py        # SQLAlchemy engine + session helpers
      main.py            # FastAPI routes + WebSocket gateway
      models.py          # SQLAlchemy ORM models
      schemas.py         # Pydantic request/response models
  requirements.txt
  tests/
    test_sessions.py   # Token issuance & join flow tests
frontend/
  app/                 # Next.js routes (landing page + session UI)
  components/          # Reusable client components
  lib/                 # Frontend helpers (API endpoints)
infra/
  docker-compose.yml   # Backend + frontend services
```

## Testing

- **Backend**: `cd backend && pytest`
- **Frontend**: rely on TypeScript + Next.js compilation (run `pnpm lint`/`pnpm test` when adding unit tests).

## Environment variables

| Variable                  | Default                     | Purpose                                    |
|---------------------------|-----------------------------|--------------------------------------------|
| `CHAT_DATABASE_URL`       | `sqlite:///./data/chat_orbit.db` | Database location (SQLite file by default) |
| `CHAT_TOKEN_RATE_LIMIT_PER_HOUR` | `10`                | Maximum token requests per IP each hour    |
| `NEXT_PUBLIC_API_BASE_URL`| `http://192.168.1.145:50001`  | Frontend → backend HTTP base (LAN-ready)   |
| `NEXT_PUBLIC_WS_BASE_URL` | `ws://192.168.1.145:50001`    | Frontend → backend WebSocket base (LAN-ready) |

Everything else ships with sensible defaults so you can get started immediately.
