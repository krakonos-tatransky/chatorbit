# ChatOrbit - Project Context for Claude

> **Last Updated**: December 28, 2024
> **Status**: Mobile v2 Field Testing
> **Documentation Version**: 2.0

---

## Quick Reference

| Component | Technology | Port | Status |
|-----------|------------|------|--------|
| Frontend | Next.js 14 (App Router) | 3000 | Production |
| Backend | FastAPI + SQLAlchemy | 50001 | Production |
| Mobile v2 | React Native (Expo SDK 51) | - | Field Testing |
| Mobile v1 | React Native (legacy) | - | Archived |

---

## Project Overview

ChatOrbit is a token-based, two-person chat application with optional WebRTC video capabilities. It emphasizes:

- **Ephemeral messaging**: Messages exist only in client memory, not stored on backend
- **Token-gated access**: Time-limited, single-use tokens control session access
- **End-to-end encryption**: AES-GCM encryption, keys derived client-side from token
- **Peer-to-peer video**: WebRTC direct connections, backend only coordinates signaling
- **Cross-platform consistency**: Shared design system and i18n between web and mobile

### Architecture Diagram

```
┌──────────────────┐         ┌──────────────────┐
│   Next.js Web    │◄───────►│    FastAPI       │
│   Frontend       │  HTTP   │    Backend       │
│   (Port 3000)    │  WS     │   (Port 50001)   │
└──────────────────┘         └──────────────────┘
         ▲                            ▲
         │                            │
         │ WebRTC P2P                │ HTTP/WS
         │ (Signaling via Backend)   │
         ▼                            ▼
┌──────────────────┐         ┌──────────────────┐
│  React Native    │◄────────┤    SQLite DB     │
│  Mobile App      │         │   (Sessions)     │
│  (Expo)          │         │   data/chat.db   │
└──────────────────┘         └──────────────────┘
```

---

## Project Structure

```
/
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── config.py         # Settings & environment parsing
│   │   ├── database.py       # SQLAlchemy engine + session helpers
│   │   ├── main.py           # FastAPI routes + WebSocket gateway
│   │   ├── models.py         # SQLAlchemy ORM models
│   │   ├── schemas.py        # Pydantic request/response models
│   │   ├── security.py       # Security utilities, rate limiting
│   │   └── email_utils.py    # Email notification helpers
│   ├── tests/
│   │   └── test_sessions.py
│   └── requirements.txt
│
├── frontend/                 # Next.js frontend
│   ├── app/                  # Next.js routes
│   │   ├── page.tsx          # Landing page
│   │   ├── session/[token]/  # Session UI
│   │   ├── help/             # Help page
│   │   ├── administracia/    # Admin pages
│   │   ├── privacy-policy/
│   │   └── terms-of-service/
│   ├── components/           # Reusable React components
│   │   ├── ui/               # UI primitives
│   │   ├── language/         # i18n provider and switcher
│   │   ├── session-view.tsx  # Main session component
│   │   └── ...
│   ├── lib/                  # Frontend helpers
│   │   ├── api.ts            # API client functions
│   │   ├── webrtc.ts         # WebRTC utilities
│   │   ├── crypto.ts         # AES-GCM encryption
│   │   └── i18n/             # Translations (EN + SK)
│   └── public/brand/         # Brand assets (SVG logos)
│
├── mobile/
│   └── v2/                   # React Native mobile app (current)
│       ├── App.tsx           # Entry point
│       ├── src/
│       │   ├── components/   # UI components
│       │   ├── constants/    # Colors, spacing, styles
│       │   ├── screens/      # Screen components
│       │   ├── services/     # API and encryption
│       │   ├── state/        # Zustand stores
│       │   ├── utils/        # Helpers (env, date parsing)
│       │   └── webrtc/       # WebRTC manager, signaling
│       └── docs/             # Mobile-specific docs
│
├── tests/
│   └── e2e/                  # End-to-end WebRTC tests
│       ├── clients/          # Browser and mobile simulators
│       ├── scenarios/        # Test scenarios
│       └── README.md         # Test documentation
│
├── infra/                    # Docker infrastructure
│   ├── docker-compose.yml    # Development environment
│   ├── docker-compose.production.yml
│   └── docs/
│       └── ispconfig-deployment.md
│
├── docs/                     # Project documentation
│   ├── architecture.md       # Comprehensive technical architecture
│   ├── CHANGELOG.md          # Version history
│   ├── PROJECT_STATUS.md     # Current status and next steps
│   ├── OUTSTANDING_ISSUES.md # Issue tracking
│   └── archive/              # Historical/completed docs
│
└── .claude/                  # Claude Code configuration
    └── skills/               # Custom Claude Code skills
```

---

## Technology Stack

### Frontend (Next.js)
- **Framework**: Next.js 14.2.15 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Handcrafted CSS (no framework)
- **WebRTC**: Native browser APIs
- **i18n**: Custom LanguageProvider with localStorage
- **Package Manager**: pnpm

### Backend (FastAPI)
- **Framework**: FastAPI 0.104+
- **Database**: SQLAlchemy 2.x ORM with SQLite
- **WebSocket**: FastAPI WebSocket support (Starlette)
- **Validation**: Pydantic 2.x schemas
- **ASGI Server**: Uvicorn

### Mobile v2 (React Native)
- **Framework**: React Native 0.74.x (Expo SDK 51)
- **Language**: TypeScript 5.x
- **State**: Zustand
- **WebRTC**: react-native-webrtc 118.x
- **Encryption**: react-native-quick-crypto
- **i18n**: Custom LanguageProvider with AsyncStorage

---

## Key Concepts

### Token System
- 12-character alphanumeric tokens (A-Z, 0-9)
- Rate limit: 10 tokens/hour per IP
- Configurable validity window: day/week/month/year
- Configurable session TTL and message character limit

### Session Flow
```
1. TOKEN MINTING     → First user requests token with parameters
2. HOST JOIN         → First device reserves host seat
3. GUEST JOIN        → Second device activates session, starts timer
4. ACTIVE SESSION    → Both exchange encrypted messages + optional video
5. SESSION END       → Timer expires or manual end, cleanup
```

### WebRTC Implementation
- **Signaling**: Offer/answer exchange via WebSocket
- **ICE Candidates**: Buffered until remote description set
- **Glare Prevention**: Deferred negotiation when signaling state not stable
- **Cross-platform**: Browser ↔ Mobile tested and working

### End-to-End Encryption
- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 (100,000 iterations, SHA-256)
- **IV**: 96-bit random nonce per message
- **Key Source**: Derived from session token

---

## Environment Variables

### Backend
| Variable | Default | Purpose |
|----------|---------|---------|
| `CHAT_DATABASE_URL` | `sqlite:///./data/yourapp.db` | Database location |
| `CHAT_TOKEN_RATE_LIMIT_PER_HOUR` | `10` | Max token requests per IP |
| `CHAT_CORS_ALLOWED_ORIGINS` | `*` | CORS origins (JSON array or comma-separated) |

### Frontend
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend HTTP base (e.g., `http://localhost:50001`) |
| `NEXT_PUBLIC_WS_BASE_URL` | Backend WebSocket base (e.g., `ws://localhost:50001`) |
| `NEXT_PUBLIC_WEBRTC_STUN_URLS` | STUN server URLs |
| `NEXT_PUBLIC_WEBRTC_TURN_URLS` | TURN server URLs |
| `NEXT_PUBLIC_WEBRTC_TURN_USER` | TURN username |
| `NEXT_PUBLIC_WEBRTC_TURN_PASSWORD` | TURN password |

### Mobile
Configure in `.env` or `src/session/config.ts`:
| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | Backend HTTP base |
| `EXPO_PUBLIC_WS_BASE_URL` | Backend WebSocket base |
| `EXPO_PUBLIC_WEBRTC_STUN_URLS` | STUN server URLs |
| `EXPO_PUBLIC_WEBRTC_TURN_URLS` | TURN server URLs |

---

## Development Workflow

### Quick Start (Local)
```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 50001 --reload

# Terminal 2: Frontend
cd frontend
pnpm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:50001 \
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:50001 \
pnpm dev

# Terminal 3: Mobile (optional)
cd mobile/v2
npm install
npx expo start
```

### Docker Development
```bash
cd infra
docker compose up --build
# Frontend: http://localhost:3000
# Backend: http://localhost:50001
```

### Mobile iOS Deployment
```bash
cd mobile/v2

# Development (with Metro)
npx expo run:ios --device "DEVICE_NAME"

# Release (standalone, no Metro needed)
npx expo run:ios --device "DEVICE_NAME" --configuration Release

# Manual install after build
xcrun devicectl device install app \
  --device DEVICE_UUID \
  ~/Library/Developer/Xcode/DerivedData/ChatOrbitv2-*/Build/Products/Release-iphoneos/ChatOrbitv2.app
```

### Testing
```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && pnpm lint

# E2E WebRTC tests
cd tests/e2e && npm install && npm test
```

---

## API Reference

### Token Endpoints

**POST /api/tokens/issue**
```json
// Request
{ "validity_option": "week", "ttl_minutes": 120, "max_message_length": 2000 }

// Response
{ "token": "ABCD1234WXYZ", "valid_until": "...", "ttl_minutes": 120 }
```

**POST /api/tokens/join**
```json
// Request
{ "token": "ABCD1234WXYZ", "client_identity": "host-abc-123" }

// Response
{ "role": "host", "session_status": {...} }
```

**GET /api/session/{token}/status**
```json
// Response
{ "token": "...", "state": "ACTIVE", "participants": {...}, "timer": {...} }
```

### WebSocket Protocol

Connect: `ws://backend/api/ws/{token}/{client_identity}`

Message types:
- `session-status` - Session state updates
- `message` - Encrypted chat messages
- `delete` - Message deletion
- `webrtc-offer/answer/ice-candidate` - WebRTC signaling
- `session-ended` - Session termination
- `video-end` - Video call ended (keeps text chat)

---

## Current Status (December 2024)

### Mobile v2 - Field Testing Phase

**Completed Features**:
- Token-based session joining
- End-to-end encrypted text messaging
- WebRTC video/audio calls (mobile-to-mobile, mobile-to-browser)
- Chat-first UI (text primary, video optional)
- Session countdown timer with auto-end
- Speaker toggle (earpiece/loudspeaker)
- Echo cancellation and noise suppression
- Draggable local video PiP
- Fullscreen video mode
- UTC timezone handling
- Message cleanup on session end
- Message reorder button
- Video control overlay

**Known Issues**:
- Development-signed apps expire after 7 days
- WebSocket behavior during extended sleep needs investigation

### What's Next (Priority Options)

1. **Production Deployment**: TestFlight/App Store preparation
2. **Token Minting on Mobile**: Create tokens from app
3. **Device Identity System**: Session reclaim after disconnect
4. **Push Notifications**: Incoming message/video alerts
5. **Android Support**: Cross-platform testing
6. **Settings Screen**: Language, notifications, preferences

---

## Design System

### Colors (shared across platforms)
```
midnight:   #020B1F  (background)
abyss:      #041335
deepBlue:   #06255E
ocean:      #0A4A89
lagoon:     #0F6FBA
aurora:     #6FE7FF  (primary brand)
ice:        #F4F9FF  (text)
mint:       #88E6FF
danger:     #EF476F
```

### Spacing
```
Container padding: 24px
Card padding: 28px
Section gap: 20px
Element gap: 12-16px
Border radius: 16-28px
```

---

## WebRTC Troubleshooting

### Common ICE Errors
- **Wildcard hosts**: Remove `0.0.0.0`, `localhost` from ICE config
- **IPv4/IPv6 mismatch**: Ensure URLs resolve to matching address types
- **Missing TURN credentials**: Check username/password configuration
- **Port blocks**: Corporate networks may block UDP 3478/5349

### Signaling State Issues
If connections fail, check:
1. Signaling state is `stable` before creating offers
2. ICE candidates are buffered until remote description set
3. Deferred negotiation flag is cleared after completion

---

## Documentation Map

### Primary References (kept current)
| File | Purpose |
|------|---------|
| `/CLAUDE.md` | This file - AI assistant context |
| `/README.md` | User-facing setup guide |
| `/docs/architecture.md` | Comprehensive technical architecture |
| `/docs/CHANGELOG.md` | Version history |
| `/docs/PROJECT_STATUS.md` | Current status and next steps |
| `/docs/OUTSTANDING_ISSUES.md` | Active issue tracking |
| `/mobile/v2/README.md` | Mobile app setup & deployment |

### Operational Guides
| File | Purpose |
|------|---------|
| `/infra/docs/ispconfig-deployment.md` | Production deployment with ISPConfig |
| `/tests/e2e/README.md` | E2E WebRTC test documentation |
| `/docs/MOBILE_TESTING_CHECKLIST.md` | Mobile testing procedures |

### Archived Documentation
See `/docs/archive/` for historical documents:
- WebRTC analysis and compatibility docs
- Stage completion logs
- Planning documents for abandoned features
- Implementation summaries

---

## Pre-Production Cleanup

Before building for App Store release:

1. **Remove PatternPreviewScreen**: `src/screens/PatternPreviewScreen.tsx`
2. **Remove Dev Button**: "BG" button in MainScreen (wrapped in `__DEV__`)
3. **Finalize BackgroundPattern**: Either complete or remove
4. **Update navigation**: Remove dev screens from stack

---

## Git Workflow

- **Main Branch**: `master`
- **Commit Format**: Use conventional commits
- **PR Template**: Summary + Test plan format

---

## Brand Assets

Located in `frontend/public/brand/`:
- `chat-orbit-logo-token.svg` - Primary badge
- `chat-orbit-logo-link.svg` - Wide lockup for hero/banner
- `chat-orbit-logo-glyph.svg` - Compact glyph for favicons/avatars

---

## Glossary

| Term | Definition |
|------|------------|
| **Token** | 12-char alphanumeric string granting session access |
| **Host** | First participant to join (reserves seat) |
| **Guest** | Second participant (activates session, starts timer) |
| **Session** | Time-limited chat room for exactly two participants |
| **TTL** | Time-to-live; active session duration |
| **E2E** | End-to-end encryption |
| **P2P** | Peer-to-peer (direct connection) |
| **WebRTC** | Web Real-Time Communication |
| **ICE** | Interactive Connectivity Establishment |
| **STUN** | Session Traversal Utilities for NAT |
| **TURN** | Traversal Using Relays around NAT |
| **SDP** | Session Description Protocol |

---

**Document maintained by**: Documentation automation
**Canonical source**: `/CLAUDE.md`
