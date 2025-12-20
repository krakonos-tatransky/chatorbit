# ChatOrbit - Project Context for Claude

## Project Overview

ChatOrbit is a token-based two-person chat application with video chat capabilities. It focuses on issuing limited-use chat tokens and connecting exactly two devices in an end-to-end session with text messaging and WebRTC video/audio communication.

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Handcrafted CSS
- **Key Features**:
  - Landing page for token issuance/redemption
  - Responsive chat workspace with countdown and connection state
  - WebRTC video/audio chat with screen sharing
  - Mobile-responsive design

### Backend
- **Framework**: FastAPI
- **Database**: SQLAlchemy ORM with SQLite
- **Key Features**:
  - Token issuance with 10/hour rate limit
  - Session lifecycle management
  - WebSocket bridge for message exchange and deletion
  - Email notifications and abuse reporting

### Mobile
- React Native application for iOS and Android

### Infrastructure
- Docker Compose for local development
- Production-ready Docker configuration
- ISPConfig-compatible reverse proxy setup

## Project Structure

```
/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── config.py     # Settings & environment parsing
│   │   ├── database.py   # SQLAlchemy engine + session helpers
│   │   ├── main.py       # FastAPI routes + WebSocket gateway
│   │   ├── models.py     # SQLAlchemy ORM models
│   │   ├── schemas.py    # Pydantic request/response models
│   │   ├── security.py   # Security utilities
│   │   └── email_utils.py # Email notification helpers
│   ├── tests/
│   │   └── test_sessions.py
│   └── requirements.txt
│
├── frontend/             # Next.js frontend
│   ├── app/             # Next.js routes
│   │   ├── page.tsx     # Landing page
│   │   ├── session/[token]/  # Session UI
│   │   ├── help/        # Help page
│   │   ├── administracia/    # Admin pages
│   │   ├── privacy-policy/
│   │   └── terms-of-service/
│   ├── components/      # Reusable React components
│   │   ├── ui/         # UI primitives
│   │   └── admin/      # Admin components
│   ├── lib/            # Frontend helpers (API endpoints)
│   └── public/brand/   # Brand assets (SVG logos)
│
├── mobile/             # React Native mobile app
│   └── README.md
│
├── infra/              # Docker infrastructure
│   ├── docker-compose.yml
│   └── docker-compose.production.yml
│
└── docs/              # Documentation
```

## Key Concepts

### Token System
- Each device can request up to 10 tokens per hour
- Configurable validity window (day/week/month/year)
- Configurable active session TTL
- Per-message character cap (200-16,000)

### Session Flow
1. **Token Minting**: First user requests a token with desired parameters
2. **Host Join**: First device to join reserves the host seat
3. **Guest Join**: Second device activates session, starts countdown, locks token
4. **Active Session**: Both participants can exchange messages and video/audio
5. **Session End**: Timer expires, backend closes session and notifies both peers

### WebRTC Integration
- Peer-to-peer video and audio communication
- Screen sharing capability
- Configurable STUN/TURN servers via environment variables
- Mobile and browser compatibility
- Network traversal for restrictive NAT environments

### Security & Moderation
- End-to-end message encryption
- Abuse reporting system
- Admin interface for reviewing reports
- Email notifications for abuse reports

## Important Environment Variables

| Variable | Purpose |
|----------|---------|
| `CHAT_DATABASE_URL` | Database location (SQLite by default) |
| `CHAT_TOKEN_RATE_LIMIT_PER_HOUR` | Max token requests per IP (default: 10) |
| `CHAT_CORS_ALLOWED_ORIGINS` | CORS origins configuration |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend → Backend HTTP base |
| `NEXT_PUBLIC_WS_BASE_URL` | Frontend → Backend WebSocket base |
| `NEXT_PUBLIC_WEBRTC_STUN_URLS` | STUN server URLs |
| `NEXT_PUBLIC_WEBRTC_TURN_URLS` | TURN server URLs |
| `NEXT_PUBLIC_WEBRTC_TURN_USER` | TURN username |
| `NEXT_PUBLIC_WEBRTC_TURN_PASSWORD` | TURN password |

See README.md for complete environment variable documentation.

## Development Workflow

### Local Development
1. Backend runs on port 50001 (FastAPI with hot reload)
2. Frontend runs on port 3000 (Next.js dev server)
3. Use pnpm for frontend package management
4. Python virtual environment recommended for backend

### Docker Development
```bash
cd infra
docker compose up --build
```

### Testing
- **Backend**: `cd backend && pytest`
- **Frontend**: TypeScript compilation + `pnpm lint`

## Recent Changes

Based on recent commits:
- Fixed critical WebRTC issues for browser-mobile compatibility
- Improved WebRTC connection management
- Added build artifacts to gitignore

## Common Patterns

### Frontend
- Uses App Router with TypeScript
- Server and client components clearly separated
- API calls through lib/ helper functions
- CSS modules for component styling

### Backend
- FastAPI async/await patterns
- SQLAlchemy ORM for database operations
- Pydantic schemas for validation
- WebSocket connections managed per session

## Known Issues & Troubleshooting

### WebRTC ICE Errors
- Avoid wildcard hosts (0.0.0.0, localhost) in ICE configuration
- Ensure IPv4/IPv6 compatibility
- Verify TURN credentials are correct
- Check port accessibility (UDP 3478/5349, TCP 80/443)

See "Troubleshooting WebRTC ICE errors" section in README.md for detailed guidance.

## Brand Assets

Located in `frontend/public/brand/`:
- `chat-orbit-logo-token.svg` - Primary badge with mirrored chat silhouettes
- `chat-orbit-logo-link.svg` - Wide lockup for hero/banner usage
- `chat-orbit-logo-glyph.svg` - Compact glyph for favicons/avatars

## Git Workflow

- **Main Branch**: `master`
- **Current Worktree**: `flamboyant-nash`
- Repository uses git worktrees for parallel development

## Additional Notes

- Project emphasizes lightweight, focused functionality
- End-to-end encryption for privacy
- Mobile-first responsive design
- Production-ready with ISPConfig integration
- Rate limiting and abuse prevention built-in
