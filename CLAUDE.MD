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
- **Framework**: React Native (Expo SDK 51)
- **Language**: TypeScript
- **Styling**: StyleSheet API with shared design constants
- **Key Features**:
  - Native iOS and Android apps
  - WebRTC video chat with mobile optimizations
  - i18n system with AsyncStorage persistence
  - Shared design system with frontend (colors, spacing)

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
│   ├── App.tsx        # Entry point
│   ├── src/
│   │   ├── components/    # React Native components
│   │   ├── constants/     # Colors, spacing, styles
│   │   ├── i18n/         # Internationalization system
│   │   ├── utils/        # Crypto, WebRTC, formatting
│   │   └── types/        # TypeScript type definitions
│   └── README.md
│
├── infra/              # Docker infrastructure
│   ├── docker-compose.yml
│   └── docker-compose.production.yml
│
├── docs/              # Documentation
│   ├── architecture.md    # Technical architecture
│   └── CHANGELOG.md       # Version history
│
└── .claude/          # Claude Code configuration
    └── skills/       # Custom Claude Code skills
        ├── chatorbit-design-sync/      # Cross-platform design sync
        ├── chatorbit-docs-keeper/      # Documentation maintenance
        ├── session-flow-test/          # Session testing
        └── webrtc-debug/               # WebRTC debugging
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

**December 2024**:
- **Mobile i18n System**: Implemented complete internationalization for mobile app
  - Created `mobile/src/i18n/` with LanguageProvider using AsyncStorage
  - Ported all translations from frontend (English + Slovak)
  - Added LanguageSwitcher component with modal UI
  - Device language auto-detection with expo-localization
  - Wrapped App.tsx with LanguageProvider
  - Updated AcceptScreen to demonstrate i18n usage

- **Documentation Infrastructure**:
  - Created `docs/architecture.md` with comprehensive technical architecture
  - Created `docs/CHANGELOG.md` following Keep a Changelog format
  - Created Documentation Keeper skill for maintaining all docs

- **Claude Code Skills**:
  - Created `.claude/skills/` directory for custom skills
  - **chatorbit-design-sync**: Cross-platform design consistency expert
  - **chatorbit-docs-keeper**: Documentation maintenance automation

- **WebRTC Improvements**:
  - Fixed critical WebRTC issues for browser-mobile compatibility
  - Added signaling state checks to prevent mobile disconnections
  - Improved connection management and error handling

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

## Future Enhancements (TODO)

### Device Identity & Session Reclaim System
**Goal**: Allow users to leave a session and rejoin later, while preventing other devices from hijacking their slot.

**Proposed Approach**:
1. On first app launch, call `POST /api/devices/register`
2. Server returns JWT device token (TTL: 3 months) + device_id
3. Store in Keychain (iOS) / Keystore (Android)
4. Include device token in all API requests
5. When joining session, server binds `participant_id ↔ device_id`
6. When reclaiming, server verifies device_id matches

**Additional Considerations**:
- Silent token refresh (check weekly, refresh if < 30 days remaining)
- Reinstall behavior (new device or recovery code?)
- Optional: Signed requests with HMAC for extra security
- Web frontend parity

**Backend Changes Needed**:
- `POST /api/devices/register` - Issue device token
- `POST /api/devices/refresh` - Refresh expiring token
- Modify session join to store/verify device binding
- Add `device_id` column to SessionParticipant model

---

## Pre-Production Cleanup

Before building for production, remove the following dev-only features:

### Mobile App (v2)
- **PatternPreviewScreen**: Remove `src/screens/PatternPreviewScreen.tsx` and its navigation entry
- **Dev Button**: Remove the "BG" button in `MainScreen.tsx` (wrapped in `__DEV__` check)
- **BackgroundPattern component**: Either finalize the logo design or remove `src/components/ui/BackgroundPattern.tsx`
- Update `App.tsx` to remove PatternPreview from the navigation stack
- Update `src/components/ui/index.ts` to remove BackgroundPattern export if not used

## Additional Notes

- Project emphasizes lightweight, focused functionality
- End-to-end encryption for privacy
- Mobile-first responsive design
- Production-ready with ISPConfig integration
- Rate limiting and abuse prevention built-in
