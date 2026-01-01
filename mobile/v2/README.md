# ChatOrbit Mobile v2

A complete rewrite of the ChatOrbit mobile application with chat-first UI, optional video calling, and end-to-end encryption.

## Status: Field Testing

All core features are implemented and ready for field testing on physical iOS devices.

---

## Features

### Core Features
- **Chat-first UI**: Text messaging is primary, video is optional
- **End-to-end encryption**: AES-256-GCM encryption with token-derived keys
- **WebRTC video/audio**: Optional video calls via floating camera button
- **Session management**: Token-based access with configurable duration (1-1440 minutes)
- **Host/Guest roles**: First user is host, second activates session

### Video Calling
- **Draggable local video PiP**: Move your camera preview anywhere
- **Fullscreen mode**: Tap to toggle video controls
- **Speaker toggle**: Switch between earpiece and loudspeaker
- **Echo cancellation**: Built-in noise suppression
- **Video reinvite**: Stop and restart video without ending chat

### UI/UX
- **Session countdown timer**: Auto-cleanup when time expires
- **Message character limit**: Configurable per session (200-16,000 chars)
- **Connection status indicator**: Real-time WebRTC state
- **Offline-capable**: Release builds work without Metro bundler

---

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React Native (Expo SDK 51) | 0.81.5 |
| Language | TypeScript | 5.9 (strict) |
| State | Zustand | 5.x |
| WebRTC | react-native-webrtc | 124.x |
| Audio | react-native-incall-manager | 4.2.x |
| Encryption | react-native-quick-crypto | 1.x |
| HTTP | Axios | 1.13.x |
| Navigation | React Navigation | 7.x |

---

## Project Structure

```
src/
├── screens/                    # Screen components
│   ├── SplashScreen.tsx        # App initialization, font loading
│   ├── MainScreen.tsx          # Auth/token flow with animations
│   ├── SessionScreen.tsx       # Main chat + video experience
│   ├── LandingScreen.tsx       # Welcome screen
│   ├── MintScreen.tsx          # Create token flow
│   └── AcceptScreen.tsx        # Join session flow
│
├── components/
│   ├── ui/                     # Reusable UI primitives
│   │   ├── Button.tsx          # Touchable with press animations
│   │   ├── Input.tsx           # Text input with validation
│   │   ├── Card.tsx            # Elevated container
│   │   └── StatusDot.tsx       # Connection status indicator
│   ├── layout/
│   │   └── Header.tsx          # Screen header with back button
│   └── content/
│       ├── LandingContent.tsx  # "Need/Have token" buttons
│       ├── MintContent.tsx     # Token creation form
│       └── AcceptContent.tsx   # Token input + join
│
├── services/
│   ├── api/                    # HTTP API clients
│   │   ├── client.ts           # Axios instance + interceptors
│   │   ├── tokens.ts           # Token minting endpoints
│   │   └── sessions.ts         # Session join/status endpoints
│   └── encryption/
│       ├── crypto.ts           # Low-level AES-GCM operations
│       └── messages.ts         # High-level message encryption
│
├── state/stores/               # Zustand stores
│   ├── sessionStore.ts         # Session + token + timer state
│   ├── messagesStore.ts        # Chat messages + send/receive
│   └── connectionStore.ts      # WebRTC + network status
│
├── webrtc/
│   ├── manager.ts              # High-level orchestration
│   ├── signaling.ts            # WebSocket client
│   ├── connection.ts           # RTCPeerConnection wrapper
│   └── types.ts                # WebRTC types + enums
│
├── constants/
│   ├── colors.ts               # Design tokens
│   ├── typography.ts           # Font styles
│   └── spacing.ts              # Layout constants
│
└── utils/
    ├── env.ts                  # Environment variable access
    ├── date.ts                 # UTC date parsing
    └── deviceId.ts             # Device identification
```

---

## Architecture

### State Management (Zustand)

**Session Store** - Token, role, and session timing:
```typescript
// Key state
token: string
role: 'host' | 'guest'
status: 'issued' | 'active'
remainingSeconds: number
messageCharLimit: number

// Key actions
joinSession(token, participantId)
endSession()
updateRemainingTime()
```

**Messages Store** - Chat messages:
```typescript
// Message interface
interface Message {
  id: string
  content: string       // Decrypted plaintext
  timestamp: number
  type: 'sent' | 'received'
  status: 'sending' | 'sent' | 'failed'
}

// Key actions
sendMessage(token, content)    // Returns encrypted payload
addReceivedMessage(...)        // Decrypts and adds
clearMessages()                // Session cleanup
```

**Connection Store** - WebRTC and network:
```typescript
connectionState: 'disconnected' | 'connecting' | 'connected' | 'failed'
hasLocalVideo: boolean
hasRemoteVideo: boolean
networkQuality: 'excellent' | 'good' | 'poor'
```

### WebRTC Flow

```
Session Start
├─ signaling.connect()          # WebSocket to backend
├─ PeerConnection created       # With STUN/TURN config
└─ Data channel opened          # For encrypted messages

Video Call (optional)
├─ User taps camera button
├─ manager.startVideo()         # Request media, add to PC
├─ Send video-invite            # Via WebSocket
├─ Wait for video-accept
├─ Create WebRTC offer          # If initiator
├─ Exchange offer/answer
└─ Both sides streaming

Video End
├─ User taps end button
├─ manager.stopVideo()          # Stop local tracks
├─ clearRemoteStream()          # Clear frozen video
├─ Send video-end message
└─ Chat continues               # Data channel stays open
```

### End-to-End Encryption

```
Message Send:
1. Derive AES-256 key from token (SHA-256 hash)
2. Generate random 96-bit IV
3. Encrypt with AES-GCM
4. Combine: IV (12 bytes) + ciphertext
5. Base64 encode for transport

Message Receive:
1. Base64 decode
2. Extract IV (first 12 bytes)
3. Decrypt with cached key
4. Return plaintext UTF-8
```

Key caching prevents re-derivation per message.

---

## API Integration

### HTTP Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tokens` | POST | Create new token |
| `/api/sessions/join` | POST | Join session with token |
| `/api/sessions/{token}/status` | GET | Get session status |
| `/api/sessions/{token}` | DELETE | End session |

### WebSocket Messages

| Type | Direction | Purpose |
|------|-----------|---------|
| `message` | both | Encrypted chat message |
| `offer/answer` | both | WebRTC signaling |
| `ice-candidate` | both | NAT traversal |
| `video-invite` | initiator | Request video call |
| `video-accept` | responder | Accept video invite |
| `video-end` | both | End video (keep chat) |
| `session-ended` | backend | Session cleanup signal |

---

## Development

### Prerequisites

- Node.js 18+ and npm
- Xcode 15+ (for iOS)
- Physical iOS device (for testing WebRTC)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your backend URLs

# Start Metro bundler
npx expo start
```

### Run on iOS Simulator

```bash
npx expo run:ios
```

---

## Deployment to Physical iOS Devices

### Option 1: Development Build (with Metro)

Good for debugging, requires Mac connection:

```bash
npx expo run:ios --device "DEVICE_NAME"
```

### Option 2: Release Build (Standalone)

**Recommended for field testing.** No Metro required after install.

```bash
npx expo run:ios --device "DEVICE_NAME" --configuration Release
```

### Option 3: Manual Installation

If automatic install hangs:

```bash
# Build (may hang on "Connecting to device")
# Press Ctrl+C after "Build Succeeded"

# List devices
xcrun devicectl list devices

# Install manually
xcrun devicectl device install app \
  --device YOUR_DEVICE_UUID \
  ~/Library/Developer/Xcode/DerivedData/ChatOrbitv2-*/Build/Products/Release-iphoneos/ChatOrbitv2.app
```

### Install on Two Test Devices

```bash
# Build once
xcodebuild -workspace ios/ChatOrbitv2.xcworkspace \
  -scheme ChatOrbitv2 -configuration Release \
  -destination "platform=iOS,name=iPapuš Senior" build

# Install on both devices
xcrun devicectl device install app \
  --device 9B7D39D6-F779-5AE1-9FA8-148970397F5B \
  ~/Library/Developer/Xcode/DerivedData/ChatOrbitv2-*/Build/Products/Release-iphoneos/ChatOrbitv2.app

xcrun devicectl device install app \
  --device 07F942DA-D51B-557D-86A0-E23C4AC63D7E \
  ~/Library/Developer/Xcode/DerivedData/ChatOrbitv2-*/Build/Products/Release-iphoneos/ChatOrbitv2.app
```

---

## Environment Variables

Create `.env` file:

```bash
# Required
EXPO_PUBLIC_API_BASE_URL=https://your-api.com
EXPO_PUBLIC_WS_BASE_URL=wss://your-api.com

# Optional (WebRTC)
EXPO_PUBLIC_WEBRTC_STUN_URLS=stun:stun.l.google.com:19302
EXPO_PUBLIC_WEBRTC_TURN_URLS=turn:your-turn-server.com:3478
EXPO_PUBLIC_WEBRTC_TURN_USER=username
EXPO_PUBLIC_WEBRTC_TURN_PASSWORD=password
```

---

## Key Files for Common Tasks

| Task | File(s) |
|------|---------|
| Add UI component | `src/components/ui/*.tsx` |
| Change colors/theme | `src/constants/colors.ts` |
| Add/modify store | `src/state/stores/*.ts` |
| Fix WebRTC issues | `src/webrtc/manager.ts`, `connection.ts` |
| Add screen | `src/screens/*.tsx` |
| Modify API calls | `src/services/api/*.ts` |
| Change encryption | `src/services/encryption/crypto.ts` |

---

## Troubleshooting

### Build fails with signing error

```bash
npx expo prebuild --clean --platform ios
```

### App crashes on launch (Release build)

Ensure `.env` is properly configured - Release builds bundle the JS but still need valid API URLs.

### WebRTC not connecting

1. Check STUN/TURN server configuration
2. Verify both devices allow WebRTC traffic
3. Check backend WebSocket endpoint is accessible

### Device not found

```bash
xcrun devicectl list devices
# If "unavailable", unlock device and trust computer
```

### Video freezes on reinvite

Fixed in latest version - `clearRemoteStream()` now properly cleans up frozen remote video when video call ends.

### Metro port in use

```bash
lsof -ti:8081 | xargs kill -9
```

---

## Production Deployment (TestFlight)

### Prerequisites

1. Apple Developer Program membership ($99/year)
2. App Store Connect account
3. Distribution certificate and provisioning profile

### Using EAS Build

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile production
eas submit --platform ios
```

### Using Xcode Archive

```bash
open ios/ChatOrbitV2.xcworkspace
# Product → Archive → Distribute App → App Store Connect
```

---

## Pre-Production Cleanup

Before App Store submission:

1. Remove `PatternPreviewScreen.tsx`
2. Remove dev "BG" button in MainScreen (wrapped in `__DEV__`)
3. Complete or remove `BackgroundPattern.tsx`
4. Update navigation to remove dev screens

---

## Documentation

- **[Project Status](../../docs/PROJECT_STATUS.md)** - Current status and next steps
- **[Changelog](../../docs/CHANGELOG.md)** - Version history
- **[Architecture](../../docs/architecture.md)** - Full technical architecture

---

## Important Notes

- **Development builds expire after 7 days** - Use TestFlight for longer testing
- **Release builds work offline** - No Mac/Metro connection needed after install
- **Both devices need the app** - WebRTC requires the app on both ends
- **Video can be stopped/restarted** - Chat continues without video

---

**Last Updated**: December 29, 2024
