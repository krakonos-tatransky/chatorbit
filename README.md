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
   Exposing on `0.0.0.0` lets other machines on your LAN reach the API at `http://localhost:50001`.
   When you want browsers on a second device to talk to the API, also allow that device's origin in
   FastAPI by exporting an explicit list instead of the default wildcard:

   ```bash
   export CHAT_CORS_ALLOWED_ORIGINS='["http://localhost:3000", "http://192.168.1.16:3000"]'
   ```

   Replace `192.168.1.16` with the LAN IP of the machine running the dev servers. Using explicit
   origins keeps credentialed requests working while still letting the wildcard (`*`) cover quick
   same-machine tests.
4. **Run the frontend**
   ```bash
   cd ../frontend
   NEXT_PUBLIC_API_BASE_URL=http://localhost:50001 \
   NEXT_PUBLIC_WS_BASE_URL=ws://localhost:50001 \
   pnpm dev --hostname 0.0.0.0 --port 80
   ```
   If you're loading the UI from another device, point the frontend at the same LAN IP that the
   API advertises (e.g., `NEXT_PUBLIC_API_BASE_URL=http://192.168.1.16:50001` and
   `NEXT_PUBLIC_WS_BASE_URL=ws://192.168.1.16:50001`). Pair this with the updated
   `CHAT_CORS_ALLOWED_ORIGINS` above so the browser sees matching origins.
5. Open http://localhost from any device on the same network to mint tokens and join sessions.

### Dockerized workflow

```bash
# From the repo root
cp .env.example .env  # edit as needed for your LAN
cd infra
docker compose up --build
```

This spins up the FastAPI backend on port **50001** (with SQLite persistence under `backend/data/`) and the Next.js frontend on
port **3000**, both reachable via the LAN IP `http://localhost`.

For production, copy `infra/.env.production.example` to `infra/.env.production` and tailor the hostnames/credentials. The production Compose file keeps both containers bound to loopback (`127.0.0.1:50001` for the API and `127.0.0.1:3000` for the frontend) so ISPConfig-managed Apache/Nginx vhosts can publish `https://api.yourserver.com` (API/WebSocket) and `https://yourserver.com` (frontend) via reverse proxy rules.


## Key concepts

- **Token minting** – Each device can request up to 10 tokens per hour. The requester picks the validity window (one day/week/
  month/year), the active session TTL, and the per-message character cap (200–16,000).
- **Joining & activation** – The first device to join reserves the host seat. The second activates the session, starts the
  countdown, and locks the token to both participants.
- **WebSocket messaging** – Messages are relayed as signed bundles. Either author can delete their own line, instantly removing
  it from both histories. When the timer expires the backend closes the session and notifies both peers.

## Brand assets

Need a visual to promote ChatOrbit? The `frontend/public/brand/` directory now ships with three high-resolution SVG marks that
mirror the product concept of token-gated two-person conversations:

- `chat-orbit-logo-token.svg` – coin-like primary badge with mirrored chat silhouettes orbiting a shared core.
- `chat-orbit-logo-link.svg` – wide lockup depicting two callouts bridged by a token clasp for hero or banner usage.
- `chat-orbit-logo-glyph.svg` – compact orbital glyph for favicons, avatars, and tight UI placements.

Because the assets are vector-based you can scale or recolor them in your editor without quality loss. Feel free to drop them
into the Next.js app by referencing `/brand/<filename>.svg`.

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
| `CHAT_DATABASE_URL`       | `sqlite:///./data/yourapp.db` | Database location (SQLite file by default) |
| `CHAT_TOKEN_RATE_LIMIT_PER_HOUR` | `10`                | Maximum token requests per IP each hour    |
| `CHAT_CORS_ALLOWED_ORIGINS` | `*`                      | Comma-separated list, JSON array, or single string origin(s) allowed to call the API |
| `CHAT_CORS_ALLOW_CREDENTIALS` | `true`                | Whether to send `Access-Control-Allow-Credentials`; automatically disabled when using a wildcard origin |
| `NEXT_PUBLIC_API_BASE_URL`| `http://yourserver:50001`  | Frontend → backend HTTP base (LAN-ready)   |
| `NEXT_PUBLIC_WS_BASE_URL` | `ws://yourserver:50001`    | Frontend → backend WebSocket base (LAN-ready) |
| `NEXT_PUBLIC_WEBRTC_STUN_URLS` | —                         | Optional comma-separated list of STUN URLs overriding the default list |
| `NEXT_PUBLIC_WEBRTC_DEFAULT_STUN_URLS` | `stun:stun.nextcloud.com:443` | Baseline STUN URLs used when no override is provided |
| `NEXT_PUBLIC_WEBRTC_TURN_URLS` | — | Optional comma-separated list of TURN URLs overriding the default list |
| `NEXT_PUBLIC_WEBRTC_TURN_USER` | — | TURN username when providing custom TURN URLs |
| `NEXT_PUBLIC_WEBRTC_TURN_PASSWORD` | — | TURN password when providing custom TURN URLs |
| `NEXT_PUBLIC_WEBRTC_DEFAULT_TURN_URLS` | `turn:turn.yourserver.com:3478?transport=udp,turn:turn.yourserver.com:3478?transport=tcp,turns:turn.yourserver.com:443?transport=tcp` | Baseline TURN URLs (UDP/TCP/TLS) used when no override is provided |
| `NEXT_PUBLIC_WEBRTC_TURN_DEFAULT_USER` | `youruser` | TURN username paired with the default TURN URLs |
| `NEXT_PUBLIC_WEBRTC_TURN_DEFAULT_PASSWORD` | `yourpassword` | TURN password paired with the default TURN URLs |

> ℹ️  To allow multiple specific origins, set `CHAT_CORS_ALLOWED_ORIGINS` in your `.env` file to either a JSON list (e.g. `["http://localhost:3000", "https://app.example.com"]`), a comma-separated list (`http://localhost:3000,https://app.example.com`), or a single origin string. Leave it as `*` to accept requests from any origin, but note that credentials (cookies/authorization headers) will be suppressed for security when using the wildcard.
>
> 🌐  Hosting for the public internet? Keep `CHAT_CORS_ALLOWED_ORIGINS=*` and set `CHAT_CORS_ALLOW_CREDENTIALS=false` (or rely on the automatic downgrade) so any browser can reach the API without pre-registering origins. Because browsers forbid combining `Access-Control-Allow-Origin: *` with credentials, authenticate requests using bearer tokens or one-time query params instead of cookies when you need broad origin support. If you do require cookie-based auth, maintain an allowlist of trusted origins instead of the wildcard.

Everything else ships with sensible defaults so you can get started immediately. When no custom ICE configuration is supplied, the frontend falls back to the values defined in `NEXT_PUBLIC_WEBRTC_DEFAULT_*` so peers behind restrictive networks can still connect without hard-coded credentials.

### Environment file map

| Location | Purpose | Typical action |
|----------|---------|----------------|
| `.env` | Shared overrides when running locally (Docker Compose or directly) | Copy `.env.example`, adjust LAN IPs, and keep it alongside the root `docker-compose` workflows |
| `backend/.env` | Backend-specific values when running FastAPI without Docker | Copy `backend/.env.example` and adjust database or rate-limit settings |
| `frontend/.env.local` | Frontend overrides for `pnpm dev` / `pnpm build` | Copy `frontend/.env.local.example` and set API/WS URLs for your environment |
| `infra/.env.production` | Values consumed by `docker-compose.production.yml` | Copy `infra/.env.production.example`, set the public domains, and load TURN credentials |

Both Compose files load their respective environment files automatically—`infra/docker-compose.yml` consumes the root `.env`, while `infra/docker-compose.production.yml` loads `infra/.env.production`. Keeping the files scoped this way avoids accidentally leaking production credentials into local builds and mirrors how ISPConfig expects per-site configuration files.


## Troubleshooting WebRTC ICE errors

If you see Firefox logs similar to the following when two peers try to connect:

```
Skipping STUN server because of address type mis-match
skipping UDP STUN server(addr:IP4:0.0.0.0:19302/UDP)
failed to create passive TCP host candidate: 3
TURN(... IP4:0.0.0.0:5349/UDP) failed
```

it means the browser rejected the configured ICE servers. Common causes are:

- **Wild-card or loopback hosts** – values such as `0.0.0.0`, `127.0.0.1`, `[::]`, or `localhost` cannot be reached by other peers. Remove them from `NEXT_PUBLIC_WEBRTC_*` variables or replace them with a routable IP/DNS name.
- **IPv4/IPv6 mismatch** – attempting to reach an IPv6 TURN/STUN address from an IPv4-only interface (or vice versa) yields an "address type mis-match" warning. Ensure the ICE URLs resolve to addresses that match the network stack of the peers.
- **Missing TURN credentials** – log lines like `Missing MESSAGE-INTEGRITY`, `nr_stun_process_error_response failed`, or STUN error code `401` indicate the TURN server rejected the request. Double-check `NEXT_PUBLIC_WEBRTC_TURN_USER`/`NEXT_PUBLIC_WEBRTC_TURN_PASSWORD` (or the credentials supplied inside `NEXT_PUBLIC_WEBRTC_ICE_SERVERS`) and confirm they match your TURN provider.
- **Port blocks** – corporate or guest networks often block UDP 3478/5349 or TCP 80/443 on TURN servers. Choose TURN endpoints that are reachable from both clients.

The frontend automatically ignores unroutable ICE URLs, but explicitly set environment variables take precedence. Verify any custom `NEXT_PUBLIC_WEBRTC_STUN_URLS`, `NEXT_PUBLIC_WEBRTC_TURN_URLS`, or `NEXT_PUBLIC_WEBRTC_ICE_SERVERS` overrides before redeploying.


# Expo Dev Client – Ultra-Compact Cheat Sheet (iOS)

## Golden Rule
JS change → reload  
Native / config change → rebuild

---

## Most common (JS only)
Used when changing:
- Components, screens, hooks, styles, logic
- Adding new JS/TS files
- JS-only packages

Command:
npx expo start --dev-client
(or add `-c` if new files aren’t picked up)

Result:
- Fast Refresh
- Works on simulator + device
- No Xcode / no rebuild

---

## Native change (rebuild required)
Used when changing:
- expo-camera, expo-av, react-native-webrtc, react-native-svg
- app.json / app.config.ts
- Permissions (Camera / Mic)
- Expo plugins
- iOS entitlements

Commands:
npx expo prebuild -p ios
npx expo run:ios

Result:
- New Dev Client binary
- Simulator + device synced again

---

## When things look stuck
Safe reset (JS only):
npx expo start --dev-client -c

Last resort:
rm -rf node_modules
npm install
npx expo start --dev-client -c

---

## Simulator vs Device
- Simulator rebuilds fast
- Device requires matching Dev Client binary
- Simulator works but device doesn’t → rebuild Dev Client

---

## One-line decision
Did I touch native stuff?
NO  → expo start --dev-client
YES → prebuild + run:ios
