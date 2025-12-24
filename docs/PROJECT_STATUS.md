# ChatOrbit Mobile v2 - Project Status

**Last Updated**: December 24, 2024

## Current Status: Field Testing Phase

The mobile app (v2) is feature-complete for basic chat and video functionality. Currently deployed to test devices for field testing without Metro bundler dependency.

---

## Completed Features

### Core Functionality
- [x] Token-based session joining (6-character tokens)
- [x] End-to-end encrypted text messaging
- [x] WebRTC video/audio calls (mobile-to-mobile, mobile-to-browser)
- [x] Session countdown timer with auto-end
- [x] Connection status indicators

### Chat-First UI
- [x] Text chat as primary interface
- [x] Floating camera button to initiate video
- [x] Video invite/accept flow between peers
- [x] Stop video button (keeps text chat connected)
- [x] Message status indicators (sending, sent, received, failed)

### Video Features
- [x] Local video preview (draggable PiP)
- [x] Remote video display
- [x] Fullscreen mode with auto-hiding controls
- [x] Mute/unmute microphone
- [x] Camera on/off toggle
- [x] Speaker toggle (earpiece/loudspeaker)
- [x] Echo cancellation and noise suppression

### Reliability
- [x] WebSocket auto-reconnect on disconnect
- [x] Stuck message resolution after device wake
- [x] Message cleanup on session end
- [x] UTC timezone handling for session timers
- [x] Graceful video-to-chat transition

---

## Known Issues

### Minor
- Proximity sensor warning in logs (non-blocking)
- Development-signed apps expire after 7 days

### To Investigate
- WebSocket behavior during extended sleep periods
- Battery usage during long text-only sessions

---

## What's Next: Options

### Option A: Production Deployment
Prepare for App Store / TestFlight release:
1. Set up Apple Developer Program account ($99/year)
2. Configure production signing certificates
3. Create App Store Connect listing
4. Set up TestFlight for beta distribution
5. Address any App Store review requirements

### Option B: Token Minting on Mobile
Allow users to create new session tokens from the mobile app:
1. Add "Create Token" screen with duration/settings options
2. Integrate with backend `/api/tokens` endpoint
3. Share token via system share sheet
4. QR code generation for easy sharing

### Option C: Device Identity System
Implement the device identity system for session reclaim:
1. Generate device token on first launch (stored in Keychain)
2. Backend endpoint for device registration
3. Bind participant to device during session join
4. Allow session reclaim after app restart/disconnect

### Option D: Push Notifications
Add push notifications for incoming messages/video invites:
1. Set up Firebase Cloud Messaging (FCM) / APNs
2. Backend integration for sending notifications
3. Handle notification tap to open specific session
4. Background message handling

### Option E: Settings & Preferences
Add a settings screen:
1. Language selection (i18n already implemented)
2. Notification preferences
3. Default camera (front/back)
4. Auto-answer video calls option
5. Dark/light theme toggle

### Option F: Android Support
Extend to Android devices:
1. Test existing codebase on Android emulator
2. Fix any platform-specific issues
3. Configure Android build and signing
4. Test on physical Android devices

---

## Technical Debt

### Should Address Soon
- [ ] Remove PatternPreviewScreen (dev-only feature)
- [ ] Remove "BG" dev button in MainScreen
- [ ] Finalize or remove BackgroundPattern component
- [ ] Add proper error boundaries

### Nice to Have
- [ ] Add unit tests for stores and utilities
- [ ] Add integration tests for WebRTC flow
- [ ] Performance profiling for video calls
- [ ] Reduce bundle size

---

## Architecture Overview

```
mobile/v2/
├── src/
│   ├── components/ui/     # Reusable UI components
│   ├── constants/         # Design tokens (colors, spacing)
│   ├── screens/           # Screen components
│   ├── services/          # API and encryption services
│   ├── state/             # Zustand stores
│   ├── utils/             # Helpers (env, date parsing)
│   └── webrtc/            # WebRTC manager, signaling, peer connection
├── assets/                # App icons, images
├── docs/                  # Stage completion docs
└── App.tsx                # Entry point with navigation
```

### Key Dependencies
- `react-native-webrtc` - WebRTC implementation
- `react-native-incall-manager` - Audio routing
- `zustand` - State management
- `react-native-quick-crypto` - Encryption
- `@react-navigation/native-stack` - Navigation

---

## Build & Deploy Commands

```bash
# Development (with Metro)
npx expo start

# Build Release for iOS
npx expo run:ios --device "DEVICE_NAME" --configuration Release

# Install on device (after build)
xcrun devicectl device install app --device DEVICE_UUID /path/to/ChatOrbitv2.app

# List connected devices
xcrun devicectl list devices
```

---

## Session Flow

```
1. User enters 6-char token → Join Session API
2. WebSocket connects to signaling server
3. Host waits, Guest activates session
4. Session timer starts counting down
5. Users exchange encrypted text messages
6. Optional: Initiate video call via camera button
7. Session ends: timer expires OR manual end
8. Messages cleared, navigate to token entry
```

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2024-12-21 | Chat-first UI | Most sessions are text-only; video is optional |
| 2024-12-22 | Speaker toggle via InCallManager | Native iOS audio routing more reliable |
| 2024-12-22 | Separate video-end from session-end | Allow text chat to continue after video |
| 2024-12-24 | UTC date parsing utility | Backend returns naive UTC datetimes |
| 2024-12-24 | Auto-resolve stuck messages | Better UX after device sleep/wake |

---

## Contact

For questions about the mobile app architecture or implementation details, refer to:
- `mobile/v2/docs/ARCHITECTURE.md` - Technical architecture
- `mobile/v2/docs/COORDINATION_SUMMARY.md` - API integration details
- `docs/CHANGELOG.md` - Recent changes
