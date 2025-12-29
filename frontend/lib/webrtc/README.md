# WebRTC Module Refactoring

## Overview

This directory contains the extracted WebRTC logic from `frontend/components/session-view.tsx` (~5400 lines). The goal is to create a modular, maintainable architecture matching the mobile app's pattern documented in `/docs/WEBRTC_PLATFORM_COMPARISON.md`.

## Completed Modules

### 1. `types.ts` (230 lines)
**Purpose**: TypeScript type definitions for all WebRTC-related types.

**Exports**:
- Connection state types (`CallState`, `EncryptionMode`)
- Message types (`Message`, `EncryptedMessage`, `SignalingMessage`, `DataChannelMessage`)
- ICE types (`IceCandidateStats`, `IceRouteInfo`, `IceConnectionStats`)
- Session types (`Participant`, `SessionStatus`)
- Callback types (various event handlers)
- Configuration types (`WebRTCConfig`, `SignalingConfig`, `MediaConstraintsConfig`)
- Constants (timeouts, retry limits)

**Status**: ✅ **Complete**

### 2. `encryption.ts` (274 lines)
**Purpose**: AES-GCM encryption/decryption for end-to-end encrypted messaging.

**Exports**:
- `resolveCrypto()` - Cross-platform Web Crypto API resolver
- `toBase64()` / `fromBase64()` - Base64 encoding helpers
- `deriveKey(token)` - SHA-256 key derivation from session token
- `encryptMessage(key, plaintext)` - AES-GCM encryption with random IV
- `decryptMessage(key, ciphertext)` - AES-GCM decryption
- `generateMessageId()` - Unique message ID generation
- `calculateMessageHash()` - Optional integrity verification

**Key Details**:
- Algorithm: AES-GCM (256-bit)
- IV: Random 12 bytes per message
- Format: `base64(IV + ciphertext + auth_tag)`
- Key derivation: `SHA-256(session_token)`

**Status**: ✅ **Complete**

### 3. `signaling.ts` (316 lines)
**Purpose**: WebSocket signaling client for SDP offer/answer exchange and ICE candidates.

**Exports**:
- `SignalingClient` class

**Features**:
- Automatic reconnection with exponential backoff
- Event-driven architecture with callbacks
- Status update handling
- Session lifecycle event handling
- Network-aware reconnection delay adjustment

**Key Methods**:
- `connect()` / `disconnect()` - Connection management
- `send(message)` - Send signaling messages
- `isConnected()` - Connection state check
- `on*()` callbacks - Event registration

**Status**: ✅ **Complete**

### 4. `index.ts` (54 lines)
**Purpose**: Public exports for the WebRTC module.

**Status**: ✅ **Complete**

---

## Remaining Work

### 5. `connection.ts` (TODO)
**Purpose**: RTCPeerConnection wrapper class.

**Required Functionality** (from session-view.tsx analysis):
- RTCPeerConnection lifecycle management
- ICE candidate handling with queue
- DataChannel creation and management
- Offer/answer creation (with `iceRestart` option)
- Track management (addTrack, removeTrack, replaceTrack)
- Event handlers:
  - `onicecandidate` - Send via signaling
  - `ontrack` - Attach remote stream
  - `onconnectionstatechange` - Update UI state
  - `oniceconnectionstatechange` - Trigger recovery if failed
  - `onnegotiationneeded` - Create new offer (renegotiation)
  - `ondatachannel` - Attach DataChannel for guest
- DataChannel timeout (adaptive: 10-20s based on network)
- Offer collision handling (rollback pattern)
- ICE restart capability

**Extracted Code Locations**:
- Lines 2846-3300: Peer connection initialization and event handlers
- Lines 2554-2690: DataChannel attachment logic
- Lines 2692-2815: Signal processing (offer/answer/ICE)
- Lines 1889-1949: ICE restart logic
- Lines 1710-1792: Peer connection recovery

**Complexity**: **High** (~500-700 lines estimated)

### 6. `manager.ts` (TODO)
**Purpose**: High-level WebRTCManager orchestration class.

**Required Functionality**:
- Coordinate `SignalingClient` and `PeerConnection`
- Text chat initialization flow (chat-first paradigm)
- Video call flow (invite, accept, reject, end)
- Message encryption/decryption integration
- Session lifecycle management
- Callback orchestration for UI events

**Extracted Code Locations**:
- Lines 2344-2542: Peer message handling (capabilities, call control, etc.)
- Lines 2211-2309: Media stream management
- Lines 2311-2342: Call teardown logic
- Lines 2097-2127: Capabilities announcement
- Lines 2129-2209: Call message sending and renegotiation

**Complexity**: **Very High** (~800-1000 lines estimated)

---

## Architecture Alignment

### Current Status
✅ **Foundational Types** - Complete
✅ **Encryption Layer** - Complete
✅ **Signaling Layer** - Complete
⏳ **Connection Layer** - Pending
⏳ **Manager Layer** - Pending

### Comparison with Mobile

| Component | Browser (Current) | Mobile | Status |
|-----------|------------------|--------|--------|
| **Types** | `types.ts` | `types.ts` | ✅ Aligned |
| **Encryption** | `encryption.ts` | `utils/crypto.ts` | ✅ Aligned |
| **Signaling** | `signaling.ts` | `signaling.ts` | ✅ Aligned |
| **Connection** | ❌ (in session-view) | `connection.ts` | ⏳ TODO |
| **Manager** | ❌ (in session-view) | `manager.ts` | ⏳ TODO |

### Benefits of Completion

Once `connection.ts` and `manager.ts` are extracted:

1. **Testability**: Each module can be unit tested independently
2. **Maintainability**: Easier to debug and modify WebRTC logic
3. **Reusability**: Can be reused in other Next.js components
4. **Cross-Platform Consistency**: Matches mobile architecture
5. **Reduced Complexity**: session-view.tsx becomes UI-only component (~2000 lines instead of 5400)

---

## Integration Guide

### Current Usage (session-view.tsx)

The existing `session-view.tsx` still contains all WebRTC logic inline. To use the new modules:

```typescript
import {
  SignalingClient,
  deriveKey,
  encryptMessage,
  decryptMessage,
  generateMessageId,
} from '@/lib/webrtc';

// Example: Signaling
const signaling = new SignalingClient({
  url: wsUrl(`/ws/sessions/${token}?participantId=${participantId}`),
});

signaling.onOpen(() => console.log('Connected'));
signaling.onMessage((message) => handleSignalingMessage(message));
signaling.connect();

// Example: Encryption
const key = await deriveKey(token);
const encrypted = await encryptMessage(key, 'Hello world');
const decrypted = await decryptMessage(key, encrypted);
```

### Future Usage (after connection.ts + manager.ts)

```typescript
import { WebRTCManager } from '@/lib/webrtc';

// Create manager
const manager = new WebRTCManager({
  signalingUrl: wsUrl(`/ws/sessions/${token}?participantId=${participantId}`),
  iceServers: getIceServers(),
});

// Register callbacks
manager.onDataChannelMessage((message) => {
  // Handle incoming message
});

manager.onRemoteStream((stream) => {
  setRemoteStream(stream);
});

manager.onCallInvite((from) => {
  setIncomingCallFrom(from);
  setCallDialogOpen(true);
});

// Initialize
await manager.initialize(token, participantId, isHost);

// Send message
await manager.sendMessage('Hello world');

// Start video call
await manager.startVideoCall();
```

---

## Implementation Plan

### Phase 1: connection.ts ✅
**Estimated Effort**: 4-6 hours

**Tasks**:
1. Extract RTCPeerConnection initialization logic
2. Extract ICE candidate handling with queue
3. Extract DataChannel creation and timeout logic
4. Extract offer/answer/rollback patterns
5. Extract ICE restart logic
6. Add comprehensive event handlers
7. Write unit tests

**Deliverables**:
- `connection.ts` (~500-700 lines)
- Unit tests for PeerConnection class
- Updated `index.ts` exports

### Phase 2: manager.ts ✅
**Estimated Effort**: 6-8 hours

**Tasks**:
1. Extract peer message handling logic
2. Extract media stream management
3. Extract call control flow (invite/accept/reject/end)
4. Integrate SignalingClient and PeerConnection
5. Add message encryption/decryption flow
6. Add session lifecycle management
7. Write unit tests

**Deliverables**:
- `manager.ts` (~800-1000 lines)
- Unit tests for WebRTCManager class
- Updated `index.ts` exports

### Phase 3: Refactor session-view.tsx ✅
**Estimated Effort**: 4-6 hours

**Tasks**:
1. Remove extracted WebRTC logic
2. Replace with `WebRTCManager` usage
3. Update state management to use manager callbacks
4. Test cross-platform compatibility (browser ↔ mobile)
5. Update documentation

**Deliverables**:
- Refactored `session-view.tsx` (~2000-2500 lines)
- End-to-end tests
- Updated `/docs/WEBRTC_PLATFORM_COMPARISON.md`

---

## Testing Strategy

### Unit Tests (per module)
- **encryption.ts**: Test key derivation, encrypt/decrypt, message ID generation
- **signaling.ts**: Test WebSocket lifecycle, reconnection, message handling
- **connection.ts**: Test peer connection lifecycle, ICE handling, DataChannel
- **manager.ts**: Test orchestration, call flows, message encryption

### Integration Tests
- Browser ↔ Browser: Text chat + video call
- Browser ↔ Mobile: Cross-platform compatibility
- Reconnection scenarios: Network interruption during chat/video
- Offer collision: Simultaneous offer creation (glare)

### E2E Tests
- Full session flow: Token → Join → Chat → Video → End
- Error scenarios: Failed ICE, DataChannel timeout, signaling disconnect

---

## File Metrics

| File | Lines | Status | Complexity |
|------|-------|--------|------------|
| `types.ts` | 230 | ✅ Complete | Low |
| `encryption.ts` | 274 | ✅ Complete | Medium |
| `signaling.ts` | 316 | ✅ Complete | Medium |
| `connection.ts` | ~600 | ⏳ TODO | High |
| `manager.ts` | ~900 | ⏳ TODO | Very High |
| `index.ts` | 54 | ✅ Complete | Low |
| **Total** | **~2374** | **50% complete** | - |

### Original vs. Refactored

| Component | Lines (Before) | Lines (After) | Reduction |
|-----------|---------------|---------------|-----------|
| `session-view.tsx` | 5437 | ~2200 (est.) | **-60%** |
| WebRTC modules | 0 | ~2374 | **+2374** |
| **Total codebase** | 5437 | ~4574 | **-16%** |

**Benefits**: More maintainable, testable, and aligned with mobile architecture.

---

## Next Steps

1. **Immediate**: Implement `connection.ts`
   - Start with RTCPeerConnection wrapper
   - Add ICE candidate queue
   - Implement DataChannel management
   - Add event handlers

2. **Follow-up**: Implement `manager.ts`
   - Orchestrate signaling + connection
   - Add call control logic
   - Integrate encryption

3. **Final**: Refactor session-view.tsx
   - Replace inline logic with WebRTCManager
   - Update state management
   - Test cross-platform compatibility

---

## Questions & Clarifications

Before proceeding with `connection.ts` and `manager.ts`:

1. **Should we maintain 100% backward compatibility with current session-view.tsx behavior?**
   - Yes: Match all edge cases, quirks, and timing
   - No: Simplify and modernize where appropriate

2. **Should we add new features during refactoring?**
   - Example: Better error recovery, more granular callbacks, typed events

3. **Testing requirements?**
   - Unit tests for each module?
   - Integration tests for cross-platform?
   - E2E tests for full flow?

4. **Deployment strategy?**
   - Feature flag to toggle between old/new implementation?
   - Gradual rollout with monitoring?
   - Big-bang replacement?

---

## References

- **WEBRTC_PLATFORM_COMPARISON.md**: Mobile vs. Browser architecture comparison
- **WEBRTC_PROTOCOL.md**: Protocol specification for cross-platform compatibility
- **session-view.tsx**: Original monolithic implementation (5437 lines)
- **mobile/v2/src/webrtc/**: Mobile reference implementation

---

**Last Updated**: 2024-12-28
**Status**: 50% Complete (3/6 modules)
**Next Milestone**: connection.ts implementation
