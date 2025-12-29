# ChatOrbit Documentation Index

> **Last Updated**: December 28, 2024

This index catalogs all project documentation and their purposes.

---

## Primary Documentation

| File | Purpose | Status |
|------|---------|--------|
| [/CLAUDE.md](/CLAUDE.md) | AI assistant context, project overview, quick reference | **Active** |
| [/README.md](/README.md) | User-facing setup guide, environment variables, quick start | **Active** |

---

## Technical Documentation

| File | Purpose | Status |
|------|---------|--------|
| [architecture.md](architecture.md) | Comprehensive technical architecture (2000+ lines) covering frontend, backend, mobile, WebRTC state machine, security | **Active** |
| [CHANGELOG.md](CHANGELOG.md) | Version history following Keep a Changelog format | **Active** |

---

## Project Status & Planning

| File | Purpose | Status |
|------|---------|--------|
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Mobile v2 current status, completed features, next steps | **Active** |
| [OUTSTANDING_ISSUES.md](OUTSTANDING_ISSUES.md) | Active issue tracking with severity and resolution status | **Active** |

---

## Testing & Operations

| File | Purpose | Status |
|------|---------|--------|
| [MOBILE_TESTING_CHECKLIST.md](MOBILE_TESTING_CHECKLIST.md) | 89-point test suite for mobile fixes across 7 categories | **Active** |
| [admin-deployment.md](admin-deployment.md) | Admin deployment notes | **Active** |
| [/infra/docs/ispconfig-deployment.md](/infra/docs/ispconfig-deployment.md) | ISPConfig production deployment guide | **Active** |
| [/tests/e2e/README.md](/tests/e2e/README.md) | E2E WebRTC test documentation | **Active** |

---

## Mobile Documentation

| File | Purpose | Status |
|------|---------|--------|
| [/mobile/v2/README.md](/mobile/v2/README.md) | Mobile v2 setup, deployment, troubleshooting | **Active** |
| [/mobile/v2/docs/ARCHITECTURE.md](/mobile/v2/docs/ARCHITECTURE.md) | Mobile v2 technical architecture | **Active** |
| [/mobile/v2/docs/QUICK_START.md](/mobile/v2/docs/QUICK_START.md) | Mobile v2 60-second overview | **Active** |

---

## Archived Documentation

These documents have been moved to `docs/archive/` as they are:
- Historical reference (resolved issues, completed stages)
- Superseded by newer documentation
- Planning docs for abandoned features

| File | Original Purpose |
|------|-----------------|
| archive/WEBRTC_ANALYSIS.md | WebRTC compatibility analysis |
| archive/WEBRTC_COMPATIBILITY_ANALYSIS.md | WebRTC cross-platform analysis |
| archive/WEBRTC_MOBILE_IMPLEMENTATION.md | Mobile WebRTC implementation |
| archive/WEBRTC_QUICK_REFERENCE.md | WebRTC quick reference guide |
| archive/WEBRTC_SPEC.md | WebRTC specification document |
| archive/webrtc-refactoring-plan.md | WebRTC refactoring plan |
| archive/MOBILE-BROWSER-WEBRTC-COMPATIBILITY-ANALYSIS.md | Mobile-browser compatibility |
| archive/MOBILE-WEBRTC-FIXES-CHANGELOG.md | WebRTC fixes changelog |
| archive/MOBILE-WEBRTC-FIXES-IMPLEMENTATION.md | WebRTC fixes implementation |
| archive/IMPLEMENTATION-SUMMARY-2025-12-21.md | December 21 implementation summary |
| archive/PLANNING_PHONE_AUTH.md | Phone auth planning (abandoned) |
| archive/issues.md | Resolved issues (Dec 20) |

---

## Documentation Maintenance

### Adding New Documentation
1. Add file to appropriate section in this index
2. Update CLAUDE.md if it's a primary reference
3. Mark status as **Active**

### Archiving Documentation
1. Move file to `docs/archive/`
2. Update this index - move entry to Archived section
3. Update CLAUDE.md to remove reference

### Documentation Standards
- Use Markdown format
- Include "Last Updated" date
- Follow Keep a Changelog format for changelogs
- Reference file paths consistently

---

**Maintained by**: Documentation automation
