# ChatOrbit Mobile v2

A complete rewrite of the ChatOrbit mobile application with modern architecture, clean code structure, and improved UX.

## What is ChatOrbit v2?

ChatOrbit v2 is a React Native (Expo) mobile app that provides encrypted two-person chat using WebRTC. It integrates with the existing ChatOrbit backend and focuses on delivering a clean, modern mobile experience.

**Phase 1**: Text-only chat with WebRTC connectivity, modern UI, and clean architecture.

## Tech Stack

- **React Native** (Expo SDK 51)
- **TypeScript** (strict mode)
- **Zustand** - State management
- **React Navigation 6** - Navigation
- **react-native-webrtc** - WebRTC support
- **expo-crypto** - Encryption (AES-GCM)
- **Axios** - HTTP client

## Project Structure

```
src/
├── screens/        # Navigation-level views (Landing, Cockpit, Help, etc.)
├── components/     # Reusable UI components
│   ├── ui/        # Base components (Button, Input, Card, StatusDot)
│   ├── cockpit/   # Cockpit screen components
│   └── forms/     # Form components
├── webrtc/        # WebRTC connection management
├── services/      # API and encryption services
│   ├── api/       # Backend API integration
│   └── encryption/# Message encryption/decryption
├── state/         # Zustand stores
│   └── stores/    # sessionStore, messagesStore, connectionStore
├── navigation/    # React Navigation setup
├── constants/     # Design system (colors, spacing, typography)
├── utils/         # Helpers and utilities
└── types/         # Global TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- iOS Simulator (macOS) or Android Emulator
- Expo CLI: `npm install -g expo-cli`

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.template .env
   # Edit .env with your backend URLs
   ```

3. **Start development server**:
   ```bash
   npm start
   ```

4. **Run on platform**:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## Environment Variables

Configure these in your `.env` file:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:50001
EXPO_PUBLIC_WS_BASE_URL=ws://localhost:50001
EXPO_PUBLIC_WEBRTC_STUN_URLS=stun:stun.l.google.com:19302
EXPO_PUBLIC_WEBRTC_TURN_URLS=
EXPO_PUBLIC_WEBRTC_TURN_USER=
EXPO_PUBLIC_WEBRTC_TURN_PASSWORD=
```

## Development Workflow

### Stage 0: Project Setup ✅
- [x] Initialize Expo project
- [x] Install dependencies
- [x] Create directory structure
- [x] Set up environment configuration

### Stage 1: Design System (Next)
- [ ] Create color palette
- [ ] Create typography system
- [ ] Create spacing system
- [ ] Build base UI components

### Stage 2: API Service Layer
- [ ] HTTP client setup
- [ ] Token API integration
- [ ] Session API integration

### Stage 3: Encryption
- [ ] Crypto utilities
- [ ] Message encryption/decryption

See `docs/IMPLEMENTATION_PLAN.md` for the complete 15-stage plan.

## Documentation

- **[Quick Start Guide](docs/QUICK_START.md)** - Get started quickly
- **[Architecture](docs/ARCHITECTURE.md)** - Full technical architecture
- **[Implementation Plan](docs/IMPLEMENTATION_PLAN.md)** - 15-stage detailed plan
- **[Coordination Summary](docs/COORDINATION_SUMMARY.md)** - High-level coordination guide
- **[OpenAPI Spec](OPENAPI.json)** - Backend API specification
- **[Phase 1 Requirements](MOBILE_APP_PHASE1.md)** - Phase 1 requirements

## Design System

**Colors**:
- Deep Blue (`#0A1929`) - Background
- Yellow (`#FFCA28`) - Accent
- Orange (`#FF9800`) - Accent
- Green (`#4CAF50`) - Status: connected
- Red (`#F44336`) - Status: error

**Typography**:
- Header: 20px, weight 600
- Body: 16px, weight 400
- Caption: 12px, weight 400

**Spacing**: 4, 8, 16, 24, 32px

## Testing

### Manual Testing

1. Mint token from Landing screen
2. Join session from second device
3. Send messages back and forth
4. Verify connection status
5. Test session timer
6. Test navigation and menu

See `docs/QUICK_START.md` for full testing checklist.

## Architecture Highlights

- **Token-derived encryption**: No key exchange needed
- **Three-store state pattern**: Session, messages, connection
- **WebSocket signaling**: For WebRTC setup
- **Layered architecture**: Strong separation of concerns

## v1 vs v2

**v2 is NOT a refactor of v1**. Key differences:

- ✅ Clean project structure (no monolithic App.tsx)
- ✅ Modern state management (Zustand vs React Context)
- ✅ New UI/UX design (deep blue, yellow/orange accents)
- ✅ Better separation of concerns
- ✅ Independent implementation

## Contributing

This is Phase 1 of v2 development. Future phases will add:
- Video/audio UI
- Advanced session controls
- Animations and transitions
- Multi-session handling

## License

Private project - ChatOrbit

---

**Status**: Stage 0 Complete ✅ | Ready for Stage 1
