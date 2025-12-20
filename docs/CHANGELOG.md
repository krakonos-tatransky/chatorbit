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

### Changed
- Wrapped `App.tsx` with `LanguageProvider` to enable i18n throughout mobile app
- Updated `AcceptScreen` to demonstrate i18n usage with translated strings

### Technical
- Installed `@react-native-async-storage/async-storage` for language preference persistence
- Installed `expo-localization` for device language detection
- Created `mobile/src/i18n/` directory structure matching frontend pattern
- Created `.claude/skills/` directory for Claude Code skills

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
