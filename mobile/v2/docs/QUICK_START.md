# ChatOrbit Mobile v2 - Quick Start Guide

## What Is This?

ChatOrbit Mobile v2 is a complete rewrite of the ChatOrbit mobile chat app. It's a React Native app (Expo SDK 51) that provides encrypted two-person chat using WebRTC, integrating with the existing ChatOrbit backend.

**Phase 1 Goal**: Text-only chat with WebRTC connectivity, modern UI, clean architecture.

---

## Project Structure at a Glance

```
mobile/v2/
├── docs/
│   ├── ARCHITECTURE.md          ← Full technical architecture
│   ├── IMPLEMENTATION_PLAN.md   ← 15-stage detailed plan
│   ├── COORDINATION_SUMMARY.md  ← High-level coordination guide
│   └── QUICK_START.md           ← You are here
├── OPENAPI.json                 ← Backend API specification
├── MOBILE_APP_PHASE1.md         ← Phase 1 requirements
└── [Future: src/, App.tsx, etc.]
```

---

## Backend API Quick Reference

**Base URL**: `http://localhost:50001/api` (configurable)

**Key Endpoints**:
- `POST /tokens` → Mint new token
- `POST /sessions/join` → Join session (returns participant_id, role)
- `WS /ws/sessions/{token}?participantId={id}` → WebSocket for WebRTC signaling

**Session Flow**:
1. User A mints token → joins as "host"
2. User B joins with token → becomes "guest", session activates
3. Both connect WebRTC, exchange encrypted messages
4. Timer expires → session closes

**Full API Spec**: See `OPENAPI.json`

---

## Architecture in 60 Seconds

### Tech Stack
- **Framework**: React Native (Expo SDK 51)
- **Language**: TypeScript
- **State**: Zustand (3 stores: session, messages, connection)
- **WebRTC**: react-native-webrtc
- **Encryption**: Web Crypto API (AES-GCM, key derived from token)
- **HTTP**: Axios
- **Navigation**: React Navigation 6

### Project Structure
```
src/
├── screens/       # Landing, Cockpit, Help, Privacy, About, FAQ
├── components/    # UI components (ui/, cockpit/, forms/)
├── webrtc/        # WebRTCManager, SignalingClient, DataChannelManager
├── services/      # API (tokens, sessions) + Encryption (crypto, messages)
├── state/         # Zustand stores (sessionStore, messagesStore, connectionStore)
├── navigation/    # React Navigation setup
├── constants/     # Design system (colors, spacing, typography)
├── utils/         # Validation, formatting, env config
└── types/         # Global TypeScript types
```

### Data Flow
```
User Input → Encrypt (AES-GCM) → WebRTC Data Channel
  → Peer receives → Decrypt → Display in message list
```

### WebRTC Signaling
```
Client A ←→ WebSocket ←→ Backend ←→ WebSocket ←→ Client B
     ↓                                           ↓
  Offer/Answer/ICE candidates exchanged
     ↓                                           ↓
RTCPeerConnection established → Data channel open
```

---

## Implementation Plan Overview

### 15 Stages (79-98 hours total)

**Stage 0**: Project Setup (2-3h)
- Initialize Expo, install deps, create structure

**Stages 1-3**: Foundation (13-16h, parallel)
- Design system + API services + Encryption

**Stages 4-6**: Core Systems (14-17h, sequential)
- State management → WebRTC → Signaling

**Stages 7-11**: UI (19-24h, partial parallel)
- Navigation + Landing + Cockpit components

**Stage 12**: Integration (8-10h, CRITICAL)
- Assemble Cockpit, connect all systems

**Stages 13-15**: Polish & Testing (19-23h)
- Help screens + Error handling + Testing

**Critical Path**: 0 → 4 → 5 → 6 → 12 → 14 → 15

**Full Plan**: See `IMPLEMENTATION_PLAN.md`

---

## Getting Started (Stage 0)

### 1. Initialize Expo Project

```bash
cd /Users/erozloznik/Projects/chatorbit-mobile/mobile/v2
npx create-expo-app . --template blank-typescript
```

### 2. Install Dependencies

```bash
npm install zustand react-navigation @react-navigation/native @react-navigation/stack
npm install react-native-webrtc axios expo-crypto @expo/vector-icons
npm install --save-dev @types/react-native
```

### 3. Create Directory Structure

```bash
mkdir -p src/{screens,components/{ui,cockpit,forms},webrtc,services/{api,encryption},state/stores,navigation,constants,utils,types}
```

### 4. Create Environment Template

Create `.env.template`:
```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:50001
EXPO_PUBLIC_WS_BASE_URL=ws://localhost:50001
EXPO_PUBLIC_WEBRTC_STUN_URLS=stun:stun.l.google.com:19302
EXPO_PUBLIC_WEBRTC_TURN_URLS=
EXPO_PUBLIC_WEBRTC_TURN_USER=
EXPO_PUBLIC_WEBRTC_TURN_PASSWORD=
```

Copy to `.env` and configure.

### 5. Verify Setup

```bash
npm start
# Press 'i' for iOS simulator or 'a' for Android emulator
```

You should see a blank screen. Success!

---

## Key Files to Create (Checklist)

**Constants** (Stage 1):
- [ ] `src/constants/colors.ts`
- [ ] `src/constants/spacing.ts`
- [ ] `src/constants/typography.ts`

**UI Components** (Stage 1):
- [ ] `src/components/ui/Button.tsx`
- [ ] `src/components/ui/Input.tsx`
- [ ] `src/components/ui/Card.tsx`
- [ ] `src/components/ui/StatusDot.tsx`

**API Services** (Stage 2):
- [ ] `src/services/api/client.ts`
- [ ] `src/services/api/types.ts`
- [ ] `src/services/api/tokens.ts`
- [ ] `src/services/api/sessions.ts`

**Encryption** (Stage 3):
- [ ] `src/services/encryption/crypto.ts`
- [ ] `src/services/encryption/messages.ts`
- [ ] `src/services/encryption/types.ts`

**State** (Stage 4):
- [ ] `src/state/stores/sessionStore.ts`
- [ ] `src/state/stores/messagesStore.ts`
- [ ] `src/state/stores/connectionStore.ts`

**WebRTC** (Stages 5-6):
- [ ] `src/webrtc/config.ts`
- [ ] `src/webrtc/types.ts`
- [ ] `src/webrtc/WebRTCManager.ts`
- [ ] `src/webrtc/DataChannelManager.ts`
- [ ] `src/webrtc/SignalingClient.ts`

**Navigation** (Stage 7):
- [ ] `src/navigation/index.tsx`
- [ ] `src/navigation/types.ts`

**Screens** (Stages 8, 13):
- [ ] `src/screens/LandingScreen.tsx`
- [ ] `src/screens/CockpitScreen.tsx`
- [ ] `src/screens/HelpScreen.tsx`
- [ ] `src/screens/PrivacyScreen.tsx`
- [ ] `src/screens/AboutScreen.tsx`
- [ ] `src/screens/FAQScreen.tsx`

**Cockpit Components** (Stages 9-11):
- [ ] `src/components/cockpit/CockpitHeader.tsx`
- [ ] `src/components/cockpit/MessageList.tsx`
- [ ] `src/components/cockpit/MessageBubble.tsx`
- [ ] `src/components/cockpit/MessageInput.tsx`
- [ ] `src/components/cockpit/MenuDrawer.tsx`

**Forms** (Stage 8):
- [ ] `src/components/forms/MintTokenForm.tsx`
- [ ] `src/components/forms/JoinSessionForm.tsx`

**Utils**:
- [ ] `src/utils/env.ts`
- [ ] `src/utils/validation.ts`
- [ ] `src/utils/formatting.ts`

---

## Design System Quick Reference

**Colors**:
```typescript
deepBlue: '#0A1929'      // Background
darkBlue: '#132F4C'      // Secondary background
yellow: '#FFCA28'        // Accent
orange: '#FF9800'        // Accent
green: '#4CAF50'         // Status: connected
red: '#F44336'           // Status: error
white: '#FFFFFF'         // Text
gray: '#B0BEC5'          // Secondary text
```

**Spacing**:
```typescript
xs: 4, sm: 8, md: 16, lg: 24, xl: 32
```

**Typography**:
```typescript
header: { fontSize: 20, fontWeight: '600' }
body: { fontSize: 16, fontWeight: '400' }
caption: { fontSize: 12, fontWeight: '400' }
```

---

## Testing Checklist

**Manual Tests** (Stage 15):
- [ ] Mint token from Landing screen
- [ ] Join session from second device
- [ ] Send message from User A → appears on User B
- [ ] Send message from User B → appears on User A
- [ ] Connection status dot shows correct state
- [ ] Session timer counts down
- [ ] Session ends when timer reaches 0
- [ ] Back button with confirmation works
- [ ] Menu drawer opens and navigates to help screens
- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Test on physical devices (if available)

**Edge Cases**:
- [ ] Enter invalid token → show error
- [ ] Token expired → show error
- [ ] Session already has 2 participants → show error
- [ ] Network disconnect → show reconnecting
- [ ] Message over character limit → disable send button

---

## Common Issues & Solutions

### Issue: WebRTC connection fails
**Solution**: Check ICE server configuration, ensure STUN/TURN URLs are valid and routable. Filter out localhost and link-local addresses.

### Issue: Messages not decrypting
**Solution**: Verify both clients derive the same key from the token. Add debug logging for key derivation. Check message format.

### Issue: Keyboard hides input field
**Solution**: Use `KeyboardAvoidingView` with `behavior="padding"` on iOS, `behavior="height"` on Android.

### Issue: WebSocket disconnects frequently
**Solution**: Implement exponential backoff reconnection. Check mobile network restrictions. Verify backend WebSocket endpoint is accessible.

### Issue: App crashes on start
**Solution**: Check for missing dependencies, verify `tsconfig.json` is correct, ensure all imports are valid.

---

## Resources

| Resource | Path |
|----------|------|
| **Full Architecture** | `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/docs/ARCHITECTURE.md` |
| **Implementation Plan** | `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/docs/IMPLEMENTATION_PLAN.md` |
| **Coordination Summary** | `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/docs/COORDINATION_SUMMARY.md` |
| **OpenAPI Spec** | `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/OPENAPI.json` |
| **Backend Source** | `/Users/erozloznik/Projects/chatorbit-mobile/backend/app/main.py` |
| **v1 Crypto (ref)** | `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v1/src/utils/crypto.ts` |
| **v1 WebRTC (ref)** | `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v1/src/utils/webrtc.ts` |

---

## Next Steps

1. **Read**: Review `ARCHITECTURE.md` for full technical details
2. **Plan**: Review `IMPLEMENTATION_PLAN.md` for staged tasks
3. **Start**: Run Stage 0 (project setup)
4. **Build**: Follow stages 1-15 sequentially or in parallel
5. **Test**: Complete Stage 15 testing checklist
6. **Ship**: Phase 1 complete! Plan Phase 2 (video/audio)

---

**Good Luck! You have everything you need to build ChatOrbit Mobile v2.**

If you get stuck, refer to the architecture document or implementation plan for detailed guidance. The critical path is clearly marked, and risks are documented with mitigation strategies.

**Remember**: This is NOT a refactor of v1. Build v2 independently with a clean, modern architecture.
