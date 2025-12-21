# Changelog

All notable changes to ChatOrbit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Mobile i18n system with automatic language detection and AsyncStorage persistence
- `LanguageSwitcher` component for mobile app with modal UI
- `useLanguage()` hook for accessing translations in React Native components
- ChatOrbit Design Sync skill for cross-platform design consistency
- ChatOrbit Documentation Keeper skill for maintaining project documentation
- Message reorder button to mobile app matching web functionality
- Video control overlay UI with 5 buttons (fullscreen, camera, mic, switch, end)
- Comprehensive mobile testing checklist with 89 test cases across 7 test suites
- Outstanding issues tracking document for systematic bug fixing

### Changed
- Wrapped `App.tsx` with `LanguageProvider` to enable i18n throughout mobile app
- Updated `AcceptScreen` to demonstrate i18n usage with translated strings
- Video controls now overlay video panes instead of positioning below them
- Status pane collapsed state padding reduced by 33% for better screen usage
- Status pane auto-collapses when session becomes active (verified existing logic)

### Fixed
- **CRITICAL**: Mobile-to-browser video offer dialog now persists until user accepts/declines
  - Web UI was auto-transitioning from "incoming" to "active" state without user consent
  - Removed "incoming" from automatic state transitions in 3 locations
  - Dialog now remains visible until explicit user action
- **CRITICAL**: Text chat pane visibility on mobile devices
  - Removed incorrect `flex: 1` from ScrollView's `contentContainerStyle`
  - Content now properly overflows and scrolls instead of compressing
  - All sections (status, video, chat) now accessible via scrolling
- Video control buttons inaccessible during active video calls on mobile
  - Repositioned controls using absolute positioning at bottom of video container
  - Added semi-transparent background for better visibility
  - Controls always visible regardless of video pane height
- Message ordering functionality missing from mobile app
  - Implemented complete message reorder system matching web version
  - Added toggle button with arrow icons (↑/↓) next to "Messages" title
  - Preference persists across app restarts via AsyncStorage

### Technical
- Installed `@react-native-async-storage/async-storage` for language preference persistence
- Installed `expo-localization` for device language detection
- Created `mobile/src/i18n/` directory structure matching frontend pattern
- Created `.claude/skills/` directory for Claude Code skills
- Added `videoPreviewContainer` style with relative positioning for overlay support
- Added `videoControlsOverlay` style with absolute positioning and semi-transparent background
- Added `chatHeaderLeft` and `messageOrderButton` styles for message reorder UI
- Implemented `reverseMessageOrder` state with AsyncStorage key `chatOrbit.reverseMessageOrder`
- Created `orderedMessages` computed array using `useMemo` for efficient rendering
- Optimized `sessionStatusCardCollapsed` padding: `paddingVertical: 8, paddingHorizontal: 12, gap: 0`

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
