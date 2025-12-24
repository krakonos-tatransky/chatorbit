# ChatOrbit Mobile v2

A complete rewrite of the ChatOrbit mobile application with chat-first UI, optional video calling, and end-to-end encryption.

## Status: Field Testing

All core features are implemented and ready for field testing on physical iOS devices.

## Features

- **Chat-first UI**: Text messaging is primary, video is optional
- **End-to-end encryption**: AES-GCM encryption with token-derived keys
- **WebRTC video/audio**: Optional video calls via floating camera button
- **Speaker toggle**: Switch between earpiece and loudspeaker
- **Session timer**: Countdown with auto-cleanup
- **Offline-capable**: Release builds work without Metro bundler

## Tech Stack

- **React Native** (Expo SDK 51)
- **TypeScript** (strict mode)
- **Zustand** - State management
- **react-native-webrtc** - WebRTC implementation
- **react-native-incall-manager** - Audio routing
- **react-native-quick-crypto** - Encryption

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
# Run on connected device (Debug mode)
npx expo run:ios --device "DEVICE_NAME"
```

### Option 2: Release Build (Standalone)

**Recommended for field testing.** No Metro required after install.

```bash
# Step 1: Build release version
npx expo run:ios --device "DEVICE_NAME" --configuration Release

# The app will be built and installed automatically
# JS bundle is embedded - works offline from Mac
```

### Option 3: Manual Installation

If the automatic install hangs, use manual installation:

```bash
# Step 1: Build release (may hang on "Connecting to device")
# Press Ctrl+C after "Build Succeeded" message

# Step 2: List connected devices
xcrun devicectl list devices

# Step 3: Install manually using device UUID
xcrun devicectl device install app \
  --device YOUR_DEVICE_UUID \
  /Users/YOUR_USERNAME/Library/Developer/Xcode/DerivedData/ChatOrbitv2-*/Build/Products/Release-iphoneos/ChatOrbitv2.app
```

### Finding Your Device UUID

```bash
xcrun devicectl list devices
# Output example:
# iPapuš          ...   9B7D39D6-F779-5AE1-9FA8-148970397F5B   available
# iPapuš Senior   ...   07F942DA-D51B-557D-86A0-E23C4AC63D7E   available
```

### Example: Install on Two Test Devices

```bash
# Build once
npx expo run:ios --device "iPapuš" --configuration Release
# Wait for "Build Succeeded", then Ctrl+C if it hangs

# Install on first device
xcrun devicectl device install app \
  --device 9B7D39D6-F779-5AE1-9FA8-148970397F5B \
  ~/Library/Developer/Xcode/DerivedData/ChatOrbitv2-*/Build/Products/Release-iphoneos/ChatOrbitv2.app

# Install on second device
xcrun devicectl device install app \
  --device 07F942DA-D51B-557D-86A0-E23C4AC63D7E \
  ~/Library/Developer/Xcode/DerivedData/ChatOrbitv2-*/Build/Products/Release-iphoneos/ChatOrbitv2.app
```

---

## Production Deployment (TestFlight)

For longer testing periods (90 days vs 7 days for dev builds):

### Prerequisites

1. Apple Developer Program membership ($99/year)
2. App Store Connect account
3. Distribution certificate and provisioning profile

### Using EAS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios
```

### Using Xcode Archive

```bash
# Open in Xcode
open ios/ChatOrbitV2.xcworkspace

# In Xcode:
# 1. Select "Any iOS Device" as destination
# 2. Product → Archive
# 3. Window → Organizer → Distribute App
# 4. Select "App Store Connect" → Upload
```

---

## Environment Variables

Create `.env` file:

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-api.com
EXPO_PUBLIC_WS_BASE_URL=wss://your-api.com
EXPO_PUBLIC_WEBRTC_STUN_URLS=stun:stun.l.google.com:19302
EXPO_PUBLIC_WEBRTC_TURN_URLS=turn:your-turn-server.com:3478
EXPO_PUBLIC_WEBRTC_TURN_USER=username
EXPO_PUBLIC_WEBRTC_TURN_PASSWORD=password
```

---

## Troubleshooting

### Build fails with signing error

```bash
# Regenerate iOS project
npx expo prebuild --clean --platform ios
```

### App crashes on launch (Release build)

Ensure `.env` is properly configured - Release builds bundle the JS but still need valid API URLs.

### WebRTC not connecting

1. Check STUN/TURN server configuration
2. Verify both devices are on networks that allow WebRTC
3. Check backend WebSocket endpoint is accessible

### Device not found

```bash
# Ensure device is connected and trusted
xcrun devicectl list devices

# If device shows "unavailable", unlock it and trust the computer
```

### Metro port in use

```bash
# Kill any process on port 8081
lsof -ti:8081 | xargs kill -9
```

---

## Project Structure

```
src/
├── components/ui/     # Reusable UI components
├── constants/         # Design tokens (colors, spacing)
├── screens/           # Screen components
├── services/          # API and encryption services
├── state/             # Zustand stores
├── utils/             # Helpers (env, date parsing)
└── webrtc/            # WebRTC manager, signaling, peer connection
```

---

## Documentation

- **[Project Status](../../docs/PROJECT_STATUS.md)** - Current status and next steps
- **[Changelog](../../docs/CHANGELOG.md)** - Version history
- **[Architecture](docs/ARCHITECTURE.md)** - Technical architecture

---

## Important Notes

- **Development builds expire after 7 days** - Reinstall or use TestFlight for longer testing
- **Release builds work offline** - No Mac/Metro connection needed after install
- **Both devices need the app** - WebRTC requires the app on both ends

---

**Last Updated**: December 24, 2024
