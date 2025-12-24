# Changelog

All notable changes to ChatOrbit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added - December 2024 (Mobile v2)
- **Chat-first UI paradigm**: Text chat is primary, video is optional via floating camera button
- **Stop video button**: End video call while keeping text chat connected (seamless transition)
- **Speaker toggle**: Switch between earpiece and loudspeaker during video calls
- **Echo cancellation**: WebRTC audio constraints for noise suppression and auto gain control
- **Draggable local video**: PiP preview can be dragged around the screen
- **Fullscreen video mode**: Tap remote video to toggle fullscreen with auto-hiding controls
- **UTC date parsing utility**: `parseUTCDate()` for correct timezone handling of API responses
- **Message cleanup on session end**: Messages automatically cleared when session ends or new session starts
- **Stuck message resolution**: Messages stuck in "Sending..." status auto-resolve on WebSocket reconnect

### Changed - December 2024
- **Audio routing**: Changed from `setSpeakerphoneOn()` to `setForceSpeakerphoneOn()` for reliable speaker control
- **InCallManager**: Uses `auto: false` for manual audio routing control
- **Video disconnect**: Uses `closeVideoOnly()` to preserve connection state when stopping video only
- **Local video position**: Moved from right side to left side of screen

### Fixed - December 2024
- **Timer showing wrong duration**: 1-hour session was showing 8 hours due to timezone parsing issue
  - Backend returns UTC times without 'Z' suffix
  - JavaScript was interpreting as local time, adding timezone offset
  - Fixed by appending 'Z' to datetime strings before parsing
- **Stuck "Sending..." messages**: After device sleep/wake, messages remained in sending status
  - Added `resolveStuckMessages()` method to mark stuck messages as sent
  - Called automatically when WebSocket reconnects after disconnect
- **Old messages persisting**: Messages from previous sessions appeared in new sessions
  - Added `clearMessages()` call in `initializeSignaling()` when joining new session
  - Added `clearMessages()` call in `cleanup()` when ending session
- **Video disconnect causing reconnection delay**: Stopping video was resetting connection state
  - Created `closeVideoOnly()` method that preserves signaling connection state

### Previous (v1 improvements)
- Mobile i18n system with automatic language detection and AsyncStorage persistence
- `LanguageSwitcher` component for mobile app with modal UI
- `useLanguage()` hook for accessing translations in React Native components
- ChatOrbit Design Sync skill for cross-platform design consistency
- ChatOrbit Documentation Keeper skill for maintaining project documentation
- Message reorder button to mobile app matching web functionality
- Video control overlay UI with 5 buttons (fullscreen, camera, mic, switch, end)
- Comprehensive mobile testing checklist with 89 test cases across 7 test suites
- Outstanding issues tracking document for systematic bug fixing

### Technical
- Created `src/utils/date.ts` with `parseUTCDate()` and `formatDuration()` utilities
- Updated `sessionStore.ts` to use `parseUTCDate()` for API datetime parsing
- Updated `signaling.ts` to call `resolveStuckMessages()` on WebSocket reconnect
- Updated `manager.ts` with `clearMessages()` calls in session lifecycle
- Added `closeVideoOnly()` method to `PeerConnection` class
- Added `stopVideo()` method to `WebRTCManager` for seamless video-to-chat transition
- Added 'video-end' signal type for notifying peer when video stops

## [1.1.0] - 2024-12-20

### Added
- WebRTC video chat for browser-to-mobile communication
- Signaling state checks to prevent disconnection issues
- Browser-mobile compatibility improvements

### Fixed
- Critical WebRTC issues in mobile app for browser-mobile compatibility
- Video disconnection bug by adding signaling state validation
- WebRTC connection management improvements

### Changed
- Improved ICE candidate handling for mobile connections
- Enhanced error handling in WebRTC connection flow

## [1.0.0] - 2024-12-01

### Added
- Initial ChatOrbit implementation
- Token-based two-person chat system
- Next.js 14 frontend with App Router
- FastAPI backend with SQLAlchemy ORM
- React Native mobile app
- WebSocket message relay system
- End-to-end encryption (AES-GCM)
- Session lifecycle management
- Rate limiting (10 tokens/hour per device)
- Docker Compose development environment
- ISPConfig-compatible production setup
- Brand assets (SVG logos)

### Security
- End-to-end message encryption
- Token-based access control
- Rate limiting implementation
- CORS configuration for API security
