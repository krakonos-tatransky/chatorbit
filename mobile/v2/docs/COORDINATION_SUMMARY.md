# ChatOrbit Mobile v2 - Technical Coordination Summary

## Purpose

This document provides a high-level coordination summary for the ChatOrbit Mobile v2 project. It synthesizes the backend analysis, architecture, and implementation plan into actionable guidance for the user and any specialized agents.

---

## Project Status

**Current State**: Planning Complete, Ready for Implementation

**Completed**:
- Backend API analysis
- OpenAPI specification generation
- System architecture design
- Detailed implementation plan with 15 staged tasks
- Risk assessment and mitigation strategies

**Next Action**: Initialize Expo project (Stage 0)

---

## What Is ChatOrbit Mobile v2?

ChatOrbit Mobile v2 is a **complete rewrite** of the ChatOrbit mobile application. It is NOT a refactor or iteration of v1 - it's an independent implementation with:

- Modern React Native architecture (Expo SDK 51)
- Clean separation of concerns (screens, components, services, state)
- New UI/UX design (deep blue background, yellow/orange accents)
- Same backend API and token-based session model as v1
- Phase 1 focus: Text-only chat with WebRTC connectivity

**Why a Rewrite?**
- v1 has architectural debt (monolithic App.tsx, mixed concerns)
- v2 establishes a solid foundation for future features
- Cleaner codebase improves long-term maintainability

---

## Backend API Summary

The mobile app integrates with the existing FastAPI backend located at `/Users/erozloznik/Projects/chatorbit-mobile/backend/`.

### Core Endpoints

**Token Management**:
- `POST /api/tokens` - Mint new session token
  - Input: validity_period (1_day/1_week/1_month/1_year), session_ttl_minutes (1-1440), message_char_limit (200-16000)
  - Output: token, validity_expires_at, session_ttl_seconds, message_char_limit

**Session Management**:
- `POST /api/sessions/join` - Join session (host or guest)
  - Input: token, optional participant_id, optional client_identity
  - Output: participant_id, role (host/guest), session_active (bool), session_started_at, session_expires_at
- `GET /api/sessions/{token}/status` - Get current session state
- `DELETE /api/sessions/{token}` - Delete session

**WebSocket Signaling**:
- `WS /ws/sessions/{token}?participantId={id}` - WebSocket for WebRTC signaling
  - Relays offer/answer/ICE candidates between peers
  - Broadcasts session status updates
  - Notifies on session lifecycle events (closed/expired/deleted)

### Session Model

- Each session supports **exactly 2 participants**
- First to join = "host" (status: "issued")
- Second to join = "guest" (status: "active", timer starts)
- Session states: issued → active → closed/expired/deleted
- Encryption key derived from token (SHA-256 → AES-GCM)

**OpenAPI Spec**: `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/OPENAPI.json`

---

## Architecture Overview

### Technology Decisions

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Framework | React Native (Expo SDK 51) | Cross-platform, rapid development |
| Language | TypeScript | Type safety, better DX |
| State Management | Zustand | Lightweight, modern, less boilerplate than Redux |
| Navigation | React Navigation 6.x | Industry standard for RN |
| WebRTC | react-native-webrtc | Native WebRTC support |
| Encryption | Web Crypto API | Browser-standard, secure |
| HTTP Client | Axios | Robust, interceptors, type-friendly |

### Project Structure

```
src/
├── screens/        # Navigation-level views (Landing, Cockpit, Help, etc.)
├── components/     # Reusable UI (ui/, cockpit/, forms/)
├── webrtc/         # WebRTC connection management
├── services/       # API and encryption logic
├── state/          # Zustand stores (session, messages, connection)
├── navigation/     # React Navigation setup
├── constants/      # Design system (colors, spacing, typography)
├── utils/          # Shared utilities
└── types/          # Global TypeScript types
```

### Data Flow

**Token Minting**:
```
User → Landing Screen → Mint Form → API.mintToken()
  → sessionStore.setSession() → Navigate to Cockpit
  → API.joinSession() [as host] → WebRTC.initialize()
```

**Message Sending**:
```
User → Message Input → Encrypt (AES-GCM)
  → WebRTC Data Channel → Peer
  → Decrypt → messagesStore.addMessage() → UI Update
```

**WebRTC Connection**:
```
SignalingClient (WebSocket) ↔ Backend ↔ Peer's SignalingClient
         ↓                                      ↓
  WebRTCManager (offer)  →  Backend  →  Peer (answer)
         ↓                                      ↓
    ICE candidates exchange via WebSocket
         ↓                                      ↓
  RTCPeerConnection established → Data Channel open
```

### State Management (Zustand Stores)

1. **sessionStore**: token, participantId, role, status, encryption key, timer
2. **messagesStore**: message history (id, sender, content, timestamp, hash)
3. **connectionStore**: WebRTC connection status, peer connection state

**Full Architecture**: `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/docs/ARCHITECTURE.md`

---

## Implementation Plan Summary

### 15-Stage Plan

**Stage 0: Project Setup** (2-3h)
- Initialize Expo, install dependencies, create directory structure

**Stages 1-3: Foundation** (13-16h, can parallelize)
- Stage 1: Design system (colors, typography, base UI components)
- Stage 2: API service layer (HTTP client, token/session services)
- Stage 3: Encryption system (crypto utilities, message encryption)

**Stages 4-6: Core Systems** (14-17h, sequential on critical path)
- Stage 4: State management (Zustand stores)
- Stage 5: WebRTC foundation (WebRTCManager, ICE config)
- Stage 6: Signaling client (WebSocket with reconnection)

**Stages 7-11: User Interface** (19-24h, partially parallel)
- Stage 7: Navigation setup
- Stage 8: Landing screen (mint/join forms)
- Stage 9: Cockpit header & menu
- Stage 10: Message list display
- Stage 11: Message input component

**Stage 12: Integration** (8-10h, CRITICAL PATH)
- Assemble Cockpit screen
- Connect WebRTC + encryption + state
- Implement message send/receive flow
- Handle session lifecycle events

**Stages 13-15: Polish & Testing** (19-23h)
- Stage 13: Help screens (FAQ, Privacy, About)
- Stage 14: Error handling & edge cases
- Stage 15: Testing & bug fixes

**Total Estimate**: 79-98 hours (2-2.5 weeks solo, 1-1.5 weeks with team)

**Full Plan**: `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/docs/IMPLEMENTATION_PLAN.md`

---

## Agent Coordination Guide

### If Working with Multiple Agents

**Parallel Workstreams** (can run simultaneously):

1. **UI/UX Agent**: Stages 1, 8, 9, 10, 11
   - Owns design system and all visual components
   - Creates Landing and Cockpit UI (not integration)

2. **Backend Integration Agent**: Stage 2
   - Owns API service layer
   - Creates type-safe HTTP client

3. **Security/Crypto Agent**: Stage 3
   - Owns encryption system
   - Ports crypto utilities from v1 patterns

4. **WebRTC Specialist Agent**: Stages 5, 6
   - Owns WebRTC connection management
   - Owns WebSocket signaling client

5. **State Management Agent**: Stage 4, assists with Stage 10
   - Owns Zustand stores
   - Assists with store integration in components

6. **Integration Agent**: Stage 12 (CRITICAL)
   - Coordinates all systems in Cockpit screen
   - Requires outputs from Stages 3-6, 9-11
   - Focus all resources here when reached

7. **QA/Testing Agent**: Stages 14, 15
   - Error handling, edge cases
   - Manual and automated testing

### If Working Solo

**Week 1**:
- Day 1: Stage 0, start Stages 1-3
- Day 2-3: Complete Stages 1-3, Stage 4
- Day 4-5: Stages 5-6, start Stage 8

**Week 2**:
- Day 1-2: Complete Stage 8, Stages 7, 9
- Day 3: Stages 10, 11
- Day 4-5: **Stage 12** (integration - focus time)

**Week 3**:
- Day 1-2: Stages 13, 14
- Day 3-5: Stage 15 (testing, bug fixes)

---

## Critical Success Factors

### 1. Stage 12 Integration (Highest Risk)

**Why Critical**: Coordinates WebRTC, encryption, state management, and UI in one screen.

**Mitigation**:
- Allocate 8-10 hours minimum
- Test incrementally (WebRTC first, then encryption, then messages)
- Add extensive logging for debugging
- Use pair programming if possible

### 2. WebRTC Connection Reliability

**Challenges**:
- ICE failures (NAT traversal)
- Connection drops (network changes)
- Mobile-specific issues (background execution)

**Mitigation**:
- Implement robust reconnection logic (exponential backoff)
- Use TURN servers for restrictive networks
- Filter out unroutable ICE candidates (localhost, link-local IPv6)
- Test on real devices, not just simulators

### 3. Encryption Correctness

**Challenges**:
- Key derivation from token
- Consistent encrypt/decrypt behavior
- Message integrity verification

**Mitigation**:
- Unit test extensively with known plaintext/ciphertext pairs
- Reference v1 crypto.ts for patterns (but don't copy code)
- Add debug logging for key derivation steps
- Test cross-platform (iOS, Android, Web if applicable)

### 4. Keyboard Behavior (Mobile-Specific)

**Challenges**:
- Different behavior on iOS vs Android
- Input field hidden behind keyboard
- Message list doesn't adjust

**Mitigation**:
- Use KeyboardAvoidingView with proper behavior prop
- Test early on both platforms
- Use platform-specific adjustments if needed

---

## Key Architectural Decisions

### 1. Why Zustand Instead of Redux?

- Less boilerplate (no actions/reducers/sagas)
- Simpler learning curve
- Smaller bundle size
- Direct state mutation with immer-like syntax
- Good TypeScript support

### 2. Why Independent WebRTC Managers?

- Separation of concerns (connection vs data channel vs signaling)
- Easier to test in isolation
- Clearer lifecycle management
- Reusable patterns for future features (video/audio)

### 3. Why AES-GCM for Encryption?

- Web Crypto API standard
- Authenticated encryption (integrity + confidentiality)
- Fast native implementation
- Same as v1 (compatibility)

### 4. Why Token-Derived Keys?

- No need for separate key exchange
- Token already shared between participants
- Backend never sees encryption key
- Stateless (no key storage)

---

## Reference Material Locations

| Resource | Path |
|----------|------|
| Backend API Source | `/Users/erozloznik/Projects/chatorbit-mobile/backend/app/main.py` |
| Backend Models | `/Users/erozloznik/Projects/chatorbit-mobile/backend/app/models.py` |
| Backend Schemas | `/Users/erozloznik/Projects/chatorbit-mobile/backend/app/schemas.py` |
| OpenAPI Spec | `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/OPENAPI.json` |
| v1 Crypto (patterns) | `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v1/src/utils/crypto.ts` |
| v1 WebRTC (patterns) | `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v1/src/utils/webrtc.ts` |
| Phase 1 Requirements | `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/MOBILE_APP_PHASE1.md` |
| Architecture Doc | `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/docs/ARCHITECTURE.md` |
| Implementation Plan | `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/docs/IMPLEMENTATION_PLAN.md` |

**Important**: Reference v1 for **patterns and understanding only**. DO NOT copy v1 code or structure.

---

## Environment Variables Required

```bash
# API Endpoints
EXPO_PUBLIC_API_BASE_URL=http://localhost:50001
EXPO_PUBLIC_WS_BASE_URL=ws://localhost:50001

# WebRTC ICE Servers
EXPO_PUBLIC_WEBRTC_STUN_URLS=stun:stun.l.google.com:19302
EXPO_PUBLIC_WEBRTC_TURN_URLS=turn:turn.example.com:3478
EXPO_PUBLIC_WEBRTC_TURN_USER=username
EXPO_PUBLIC_WEBRTC_TURN_PASSWORD=password
```

Create `.env.template` in Stage 0 with these variables.

---

## Testing Strategy

### Unit Tests

- Encryption/decryption (crypto.ts)
- API services (mocked Axios)
- State stores (Zustand actions)

### Integration Tests

- Token minting flow
- Join session flow
- WebRTC connection establishment (mocked signaling)
- Message encrypt → send → receive → decrypt cycle

### Manual Testing

- Two-device testing (iOS + Android)
- Network interruptions (airplane mode toggle)
- Session expiration (wait for timer)
- Back button behavior
- Keyboard behavior on different screen sizes

**Test Checklist**: See Stage 15 in Implementation Plan

---

## Known Constraints & Limitations

### Phase 1 Scope

**Included**:
- Text-only chat
- WebRTC data channel
- Encrypted messaging
- Session lifecycle management
- Basic UI (header, messages, input, menu)

**Excluded** (future phases):
- Video/audio UI
- Screen sharing controls
- Animations/transitions
- Advanced session features (multi-session, history, etc.)
- File sharing
- Message reactions

### Platform Support

- iOS: 13.0+ (Expo SDK 51 requirement)
- Android: 5.0+ (API level 21+)

### Backend Compatibility

- Must work with existing FastAPI backend (no backend changes)
- Must follow existing token/session model
- Must use existing WebSocket signaling protocol

---

## Success Criteria for Phase 1

Phase 1 is **complete** when:

- [ ] User can mint a token with configurable parameters
- [ ] User can join a session using a token
- [ ] Two users connect via WebRTC automatically
- [ ] Messages are encrypted (AES-GCM) and transmitted
- [ ] Messages are decrypted and displayed in chat
- [ ] Connection status indicator is accurate (green/orange/red)
- [ ] Session timer counts down correctly
- [ ] Session ends gracefully when timer expires
- [ ] Menu drawer provides access to Help, Privacy, About, FAQ
- [ ] Back button behavior is correct (confirmation if session active)
- [ ] App runs without crashes on iOS and Android
- [ ] Manual testing with two physical devices succeeds

---

## Next Actions

### Immediate (Today)

1. Review this coordination summary
2. Review architecture document if needed
3. Review implementation plan for detailed tasks
4. Decide: solo implementation or multi-agent coordination?
5. Begin Stage 0 (project setup)

### This Week

1. Complete Stages 0-3 (setup + foundation)
2. Start Stages 4-6 (core systems)
3. Set up git branch for v2 development

### Next Week

1. Complete Stages 7-11 (UI)
2. **Stage 12: Integration** (critical path, allocate focus time)
3. Begin Stages 13-15 (help screens, error handling, testing)

---

## Questions to Clarify Before Starting

1. **Backend Environment**: Is the backend running locally? What's the actual base URL?
2. **Device Testing**: Do you have access to two physical devices (or simulators) for testing?
3. **TURN Server**: Do you have a TURN server configured, or should we use public STUN only?
4. **Brand Assets**: Where are the ChatOrbit logo SVG files? (frontend/public/brand/ ?)
5. **Content**: Should help screens reference web app content verbatim, or create new mobile-specific content?

---

## Conclusion

ChatOrbit Mobile v2 is architecturally ready for implementation. The project is well-scoped, with clear dependencies, risk mitigation, and success criteria. The 15-stage plan provides a roadmap from zero to working Phase 1 app in 2-3 weeks.

**Critical Path**: Stages 0 → 4 → 5 → 6 → 12 → 14 → 15

**Highest Risk**: Stage 12 (Cockpit Integration) - allocate extra time and attention here.

**Recommended Next Step**: Initialize the Expo project (Stage 0) and set up the directory structure. All planning artifacts are in place to begin development.

---

**Document Version**: 1.0
**Last Updated**: 2025-12-21
**Prepared By**: Technical Coordinator (Claude Code)
