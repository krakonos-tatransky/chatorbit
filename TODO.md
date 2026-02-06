# TODO

Active issues and tasks. **Read this file before starting any work.**

See `docs/OUTSTANDING_ISSUES.md` for detailed analysis and historical context on resolved issues.

---

## Open Bugs

### [BUG] Mobile-to-browser video chat fails after initial connection
**Priority**: HIGH
**Status**: FIX APPLIED — needs field testing
**Affects**: Mobile app ↔ Web browser video calls

**Symptoms**:
1. Mobile initiates or accepts video call with browser
2. Video connection establishes successfully
3. After a short video session, the mobile app side fails/crashes
4. Browser continues showing video as active (no error on browser side)
5. Result: one-sided broken state — browser thinks call is live, mobile has dropped

**Root causes found** (3 cross-platform mismatches in `manager.ts`):

1. **ICE Candidate Format Mismatch** (CRITICAL) — Mobile sent `signalType: 'ice-candidate'` but browser only matches `'iceCandidate'`. Browser silently dropped ALL ICE candidates from mobile, making connections fragile.
   - Fix: Changed mobile to send `signalType: 'iceCandidate'` (line 271)

2. **Renegotiation Offer Collision** — Mobile let the VIDEO INITIATOR create renegotiation offers, but browser always uses the HOST role. When mobile-guest initiated video with browser-host, both created offers simultaneously (glare).
   - Fix: `onNegotiationNeeded` (line 698) and `handleVideoAccept()` (line 558) now use `this.isInitiator` (host role) consistently
   - Fix: `attemptIceRestart()` (line 1356) also aligned to use host role

3. **Video Invite Fallback** (lower severity) — Mobile falls back to `signalType: 'video-invite'`/`'video-accept'` via signaling, which browser doesn't handle. Primary `type: "call"` protocol IS compatible.

**Testing needed**: Mobile-to-browser AND mobile-to-mobile video calls to confirm both still work

---

## Pending Features

- Token minting on mobile (create tokens from app, not just join)
- Push notifications for incoming messages/video
- AdMob rewarded ads (code exists but package removed — see `docs/OUTSTANDING_ISSUES.md` for re-enable steps)
- App Store / TestFlight submission preparation

## Recently Completed

- ~~QR code on browser token minting~~ — Done (Feb 2025). Shows scannable QR (`chatorbit://join/{TOKEN}`) after minting a token in the browser. Uses `qrcode.react`.

## Pre-Release Cleanup

- Remove `PatternPreviewScreen.tsx` and dev screens from navigation stack
- Remove `__DEV__`-gated "BG" button in MainScreen
