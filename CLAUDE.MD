# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Before You Start

**Read `/TODO.md` first.** It contains open bugs and active tasks. Also check `docs/OUTSTANDING_ISSUES.md` for detailed historical context on WebRTC issues.

## Project Overview

ChatOrbit is a token-based, two-person ephemeral chat application with WebRTC video. Messages exist only in client memory (never stored on backend). Tokens are 12-character alphanumeric strings that gate access to time-limited sessions. Encryption is AES-256-GCM with keys derived client-side from the session token via PBKDF2.

## Architecture

```
Frontend (Next.js 14, Port 3000) ◄──HTTP/WS──► Backend (FastAPI, Port 50001, SQLite)
         ▲                                              ▲
         │ WebRTC P2P (signaling via backend)           │ HTTP/WS
         ▼                                              │
Mobile (React Native/Expo) ◄────────────────────────────┘
```

**Session flow**: Mint token → Host joins → Guest joins (starts timer) → Active session (encrypted messages + optional video) → Timer expires or manual end.

The backend only manages tokens, session lifecycle, and relays encrypted messages/WebRTC signaling. It never sees plaintext messages.

## Components and Commands

### Backend (Python/FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 50001 --reload

# Tests
cd backend && pytest
# Single test
cd backend && pytest tests/test_sessions.py -k "test_name"
```

### Frontend (Next.js)
```bash
cd frontend
pnpm install    # uses pnpm (lockfile: pnpm-lock.yaml)
NEXT_PUBLIC_API_BASE_URL=http://localhost:50001 \
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:50001 \
pnpm dev

# Lint
cd frontend && pnpm lint
```
- Styling: handcrafted CSS (no Tailwind/framework)
- ESLint extends `next/core-web-vitals` + `prettier`
- TypeScript strict mode: **off**
- Path alias: `@/*` → `./`

### Mobile v2 (React Native/Expo)
```bash
cd mobile/v2
npm install     # uses npm (lockfile: package-lock.json)
npx expo start

# iOS device (development)
npx expo run:ios --device "DEVICE_NAME"

# iOS device (release, no Metro needed)
npx expo run:ios --device "DEVICE_NAME" --configuration Release

# Rebuild native (after changing native deps, app.json, permissions, plugins)
npx expo prebuild -p ios && npx expo run:ios
```
- Expo SDK 54, React Native 0.81.x, React 19
- TypeScript strict mode: **on** (extends `expo/tsconfig.base`)
- State management: Zustand (stores in `src/state/stores/`)
- WebRTC: `react-native-webrtc` 124.x
- Encryption: `react-native-quick-crypto`
- i18n: Custom LanguageProvider with AsyncStorage (languages: en, sk, hu)

### Docker (full stack)
```bash
cd infra && docker compose up --build
# Frontend: http://localhost:3000, Backend: http://localhost:50001
```

### E2E Tests
```bash
cd tests/e2e
npm install && npm test
# Verbose: npm run test:verbose
# With local frontend: cd infra && docker compose -f docker-compose.test.yml up --build
```

## Mobile v2 Architecture (primary development area)

### State Stores (Zustand)
- `sessionStore` — Token, role, session status, timing
- `connectionStore` — WebSocket/WebRTC connection state
- `messagesStore` — Chat messages (in-memory only)
- `settingsStore` — Language, app preferences (persisted via AsyncStorage)

### Design System (mobile differs from web)
Mobile uses a **deep blue + yellow/orange** palette (defined in `src/constants/colors.ts`):
- Backgrounds: `#0A1929` (primary), `#132F4C` (secondary), `#1E3A5F` (tertiary)
- Accents: `#FFCA28` (yellow), `#FF9800` (orange)
- Text: `#FFFFFF` (primary), `#B0BEC5` (secondary)

The web frontend uses a different palette (aurora/midnight/ice). Don't mix them.

### Key Directories
- `src/screens/` — Screen components (Landing, Mint, Accept, Session, Settings, Help, etc.)
- `src/components/` — Organized by type: `ui/`, `layout/`, `content/`, `forms/`, `cockpit/`
- `src/services/` — API client (`api/`) and encryption (`encryption/`)
- `src/webrtc/` — WebRTC connection management, signaling
- `src/i18n/` — Translation system with `translations.ts` defining all strings

### Navigation
React Navigation stack navigator. Screens defined in `src/navigation/`.

## WebRTC Implementation Notes

- **Signaling**: Offer/answer exchange via WebSocket through backend
- **ICE candidates**: Must be buffered until remote description is set
- **Glare prevention**: Deferred negotiation when signaling state is not `stable`
- **Cross-platform**: Browser ↔ Mobile connections are tested and working
- **flushSync requirement** (web frontend only): In `frontend/components/session-view.tsx`, use `flushSync` from `react-dom` when setting `callState` before `attachLocalMedia()` to avoid React batching issues

## Git Conventions

- Main branch: `master`
- Commit format: conventional commits (`feat:`, `fix:`, `chore:`, etc.)
- PR format: Summary bullet points + Test plan

## App Store Submission

Use `/app-store` skill to guide through submission. Key docs:
- `docs/APP_REVIEW_NOTES.md` — Reviewer notes, Apple guideline compliance rationale, anticipated Q&A
- `mobile/v2/APP_STORE_METADATA.md` — Full App Store listing metadata
- `mobile/v2/eas.json` — EAS Build/Submit credentials (has placeholders, needs real values)

**Guideline compliance**: ChatOrbit is a private 1:1 E2E encrypted messenger (not a UGC platform). Report Abuse mechanism exists (`ReportAbuseModal.tsx`). Contact info published in-app (`legal@chatorbit.com`, `privacy@chatorbit.com`, support links). See `docs/APP_REVIEW_NOTES.md` for the full compliance argument.

## Pre-Production Cleanup (mobile)

Before App Store release, remove:
1. `PatternPreviewScreen.tsx` and dev screens from navigation stack
2. `__DEV__`-gated "BG" button in MainScreen
