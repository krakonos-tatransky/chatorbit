# Mobile-Browser WebRTC Compatibility Analysis

**Date**: 2025-12-21
**Status**: ✅ FIXES IMPLEMENTED - READY FOR TESTING
**Impact**: Mobile-to-browser connections failing; browser-to-browser working

> **UPDATE (2025-12-21)**: All identified fixes have been implemented in `mobile/App.tsx`.
> See `MOBILE-WEBRTC-FIXES-CHANGELOG.md` for complete change details.

## Executive Summary

Browser-to-browser WebRTC connections work perfectly (including video), but mobile-to-browser connections fail to establish. After comprehensive analysis by multiple specialized agents, we've identified **critical missing functionality** in the mobile implementation that exists in the working browser implementation.

**All issues identified below have been FIXED.** This document is preserved for historical reference and understanding the root causes.

## Root Cause Analysis

### Critical Issue #1: Missing Glare Handling

**What is Glare?**
In WebRTC, "glare" occurs when both peers simultaneously try to establish a connection by creating offers. This creates an unstable signaling state that must be resolved.

**Browser Implementation** (WORKING) - `frontend/components/session-view.tsx:2745-2765`:
```typescript
if (signalType === "offer" && detail) {
  logEvent("Applying remote offer");
  clearStaleCandidates();

  // GLARE HANDLING: Check if we already have a local offer pending
  if (pc.signalingState === "have-local-offer") {
    logEvent("Rolling back local offer to accept remote offer");
    try {
      await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
    } catch (cause) {
      // error handling
    }
  }

  // Additional safety check
  if (pc.signalingState !== "stable") {
    logEvent("Signaling not stable; deferring remote offer", {
      signalingState: pc.signalingState
    });
    deferredOffersRef.current = [payload];
    return;
  }

  // NOW safe to apply remote offer
  try {
    await pc.setRemoteDescription(detail as RTCSessionDescriptionInit);
    // ... rest of offer handling
  }
}
```

**Mobile Implementation** (BROKEN) - `mobile/App.tsx:826-846`:
```typescript
if (signalType === 'offer' && detail) {
  // ❌ NO glare handling
  // ❌ NO signaling state check
  logPeer(pc, 'received offer');
  clearStaleCandidates();
  try {
    await pc.setRemoteDescription(new RTCSessionDescriptionCtor(detail));
    // This FAILS when signalingState is "have-local-offer"
    logPeer(pc, 'applied remote offer');
    // ... rest of offer handling
  }
}
```

**Why This Breaks Mobile-Browser Connections:**

1. Browser (as guest) and Mobile (as host) both try to establish connection
2. Mobile creates offer → `signalingState = "have-local-offer"`
3. Browser receives mobile's offer and sends its own offer (with glare handling)
4. Mobile receives browser's offer while in "have-local-offer" state
5. Mobile tries to `setRemoteDescription()` without checking state → **FAILS**
6. Connection never establishes

### Critical Issue #2: Missing Deferred Offer Queue

**Browser Implementation**:
```typescript
// When receiving offer but signaling state is not stable
if (pc.signalingState !== "stable") {
  deferredOffersRef.current = [payload];  // Queue for later
  return;
}

// When signaling state becomes stable
peerConnection.onsignalingstatechange = () => {
  if (peerConnection.signalingState === "stable") {
    if (deferredOffersRef.current.length > 0) {
      // Process deferred offers
      const deferred = deferredOffersRef.current.shift();
      void processSignalPayload(deferred);
    }
  }
};
```

**Mobile Implementation**:
- ❌ No deferred offer queue
- ❌ No processing of deferred offers when state stabilizes
- Has `pendingSignalsRef` but only for signals received before peer creation (different use case)

### Critical Issue #3: Incomplete Signaling State Validation

**Browser**:
- Checks `pc.signalingState !== "stable"` BEFORE applying remote offer
- Checks `pc.signalingState === "have-local-offer"` for glare detection
- Validates signaling state before creating offers (in renegotiation)

**Mobile**:
- ✅ Checks signaling state in `negotiateMediaUpdate()` (renegotiation) - lines 1421-1427
- ❌ Does NOT check signaling state when applying remote offer
- ❌ Does NOT handle rollback when in "have-local-offer" state

### Issue #4: Missing ICE Restart Options

**Browser** - `frontend/components/session-view.tsx:1932`:
```typescript
const offer = await pc.createOffer({ iceRestart: true });
```

**Mobile** - `mobile/App.tsx:1431, 1553`:
```typescript
const offer = await pc.createOffer();
// ❌ Missing iceRestart option for recovery scenarios
```

**Impact**: Mobile cannot perform ICE restarts for connection recovery.

### Issue #5: Data Channel Handler Timing

**Browser** - Always sets handler:
```typescript
if (participantRole === "host") {
  const channel = peerConnection.createDataChannel("chat");
  attachDataChannel(channel, peerConnection);
} else {
  // EXPLICITLY set handler for receiving channel from host
  peerConnection.ondatachannel = (event) => {
    attachDataChannel(event.channel, peerConnection);
  };
}
```

**Mobile** - Only host creates channel:
```typescript
if (participantRole === 'host') {
  const channel = pc.createDataChannel('chat');
  attachDataChannel(channel, pc);
}
// ❌ Guest doesn't explicitly set ondatachannel until later (line 1832)
```

**Impact**: Timing issue where guest might not be ready to receive data channel.

## Test Results Analysis

From `/Users/erozloznik/Projects/chatorbit-mobile/tests/e2e/output/test-run-2025-12-21T04-39-15-324Z/logs/`:

### Browser-to-Browser Tests
```
✅ WebRTC data channel establishment: PASSED
✅ Text message exchange: PASSED
```

### Browser-to-Mobile Tests
```
✅ WebRTC data channel establishment: PASSED (after MobileSimulator fixes)
❌ Text message exchange: FAILED (send button disabled - different issue)
✅ Video call initiation: PASSED
```

**Note**: The MobileSimulator (test client) works because it was fixed to match browser signaling format. However, the actual mobile app (`mobile/App.tsx`) still has the issues.

## Impact Assessment

| Issue | Severity | Impact |
|-------|----------|--------|
| Missing glare handling (rollback) | **CRITICAL** | Causes connection failure when both peers initiate |
| Missing signaling state check before applying offer | **CRITICAL** | Allows invalid SDP operations |
| Missing deferred offer queue | **HIGH** | No recovery from unstable signaling state |
| Missing ICE restart options | **MEDIUM** | Limits recovery options on connection failure |
| Data channel handler timing | **MEDIUM** | May cause race conditions |

## Recommended Fixes

### Fix #1: Add Glare Handling to Mobile

**Location**: `mobile/App.tsx:826-846` (offer processing in `processSignalPayload`)

**Add this code** before `pc.setRemoteDescription()`:

```typescript
if (signalType === 'offer' && detail) {
  logPeer(pc, 'received offer');
  clearStaleCandidates();

  // NEW: Glare handling - rollback local offer if present
  if (pc.signalingState === 'have-local-offer') {
    logPeer(pc, 'rolling back local offer to accept remote offer');
    try {
      await pc.setLocalDescription({ type: 'rollback' } as any);
      logPeer(pc, 'rollback successful');
    } catch (err) {
      console.warn('Failed to rollback local offer', err);
      // Continue anyway - setRemoteDescription might still work
    }
  }

  // NEW: Defer offer if signaling state is not stable
  if (pc.signalingState !== 'stable') {
    logPeer(pc, 'signaling not stable; deferring remote offer', {
      signalingState: pc.signalingState
    });
    deferredOffersRef.current = [payload];  // NEW ref needed
    return;
  }

  try {
    await pc.setRemoteDescription(new RTCSessionDescriptionCtor(detail));
    logPeer(pc, 'applied remote offer');
    // ... rest of existing code
  } catch (err) {
    logPeer(pc, 'failed to apply remote offer - clearing pending candidates');
    pendingCandidatesRef.current = [];
    throw err;
  }
}
```

### Fix #2: Add Deferred Offer Queue

**Location**: Add new ref near line 196

```typescript
const deferredOffersRef = useRef<any[]>([]);
```

**Location**: Update `onsignalingstatechange` handler at line 1812-1819

```typescript
const handleSignalingStateChange = () => {
  logPeer(pc, 'signaling state changed', pc.signalingState);

  // Process deferred offers when state becomes stable
  if (pc.signalingState === 'stable') {
    // Process deferred offers
    if (deferredOffersRef.current.length > 0) {
      const deferred = deferredOffersRef.current.shift();
      if (deferred) {
        logPeer(pc, 'processing deferred offer');
        void processSignalPayload(pc, deferred);
      }
    }

    // Retry pending negotiation
    if (negotiationPendingRef.current) {
      logPeer(pc, 'retrying deferred negotiation');
      void negotiateMediaUpdate(pc, 'deferred-negotiation-retry');
    }
  }
};
```

### Fix #3: Add ICE Restart Support

**Location**: `mobile/App.tsx:1553` in `createAndSendOffer`

```typescript
const offer = await pc.createOffer({
  iceRestart: forceIceRestart,  // Add parameter to function signature
});
```

**Update function signature**:
```typescript
const createAndSendOffer = useCallback(
  async (pc: RTCPeerConnection, reason: string, forceIceRestart = false) => {
    // existing code
  },
  [/* deps */]
);
```

### Fix #4: Always Set Data Channel Handler

**Location**: `mobile/App.tsx:1837-1841`

```typescript
if (participantRole === 'host') {
  const channel = pc.createDataChannel('chat') as unknown as PeerDataChannel;
  logPeer(pc, 'created data channel', channel.label);
  attachDataChannel(channel, pc);
} else {
  // NEW: Explicitly set handler for guest
  (pc as any).ondatachannel = handleDataChannel;
  logPeer(pc, 'set ondatachannel handler for guest role');
}
```

### Fix #5: Clear Deferred Offers on Peer Reset

**Location**: `mobile/App.tsx:1244-1245` in cleanup

```typescript
return () => {
  if (socket) {
    socket.close();
  }
  if (pc) {
    pc.close();
  }
  // NEW: Clear deferred offers
  deferredOffersRef.current = [];
  pendingSignalsRef.current = [];
  pendingCandidatesRef.current = [];
  seenCandidatesRef.current.clear();
};
```

## Testing Strategy

After implementing these fixes:

1. **Unit Test**: Test glare handling in isolation
   - Create two mobile peers
   - Force both to send offers simultaneously
   - Verify one rolls back and accepts remote offer

2. **Integration Test**: Browser-to-mobile connection
   - Run existing E2E test: `browser-mobile-connection.test.ts`
   - Should pass all 3 test cases

3. **Stress Test**: Rapid reconnections
   - Create connection
   - Close one peer
   - Reconnect
   - Verify no signaling state errors

4. **Real-World Test**:
   - Deploy to TestFlight/internal build
   - Test browser (desktop) to mobile (iOS/Android)
   - Test mobile-to-mobile
   - Verify video calls work in all combinations

## Related Documentation

- **Browser Implementation**: `frontend/components/session-view.tsx:2745-2968`
- **Mobile Implementation**: `mobile/App.tsx:789-1955`
- **WebRTC Signaling Spec**: https://www.w3.org/TR/webrtc/#rtcsignalingstate-enum
- **Glare Handling**: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription#implicit_rollback

## Rollout Plan

### Phase 1: Implement Core Fixes (Critical)
- ✅ Fix #1: Add glare handling
- ✅ Fix #2: Add deferred offer queue
- ✅ Fix #4: Always set data channel handler

### Phase 2: Enhanced Recovery (High Priority)
- ✅ Fix #3: Add ICE restart support
- ✅ Fix #5: Clear deferred offers on reset

### Phase 3: Validation (Required)
- Run full E2E test suite
- Manual testing on iOS and Android
- Performance regression testing

### Phase 4: Deployment
- Internal TestFlight build
- Monitor crash logs and connection metrics
- Production rollout with feature flag

## Success Metrics

- ✅ Browser-to-mobile connection success rate: **>95%**
- ✅ Mobile-to-mobile connection success rate: **>95%**
- ✅ Average connection establishment time: **<10 seconds**
- ✅ Zero signaling state errors in production logs

## Appendix A: Signaling State Machine

```
          [new]
            |
            | createOffer() / createAnswer()
            ↓
      [have-local-offer]  ←──────┐
            |                     │
            | setRemoteDescription(answer)
            ↓                     │
         [stable] ←───────────────┘
            |
            | setRemoteDescription(offer)
            ↓
    [have-remote-offer]
            |
            | setLocalDescription(answer)
            ↓
         [stable]
```

**Valid Transitions:**
- `stable` → `have-local-offer` (create offer)
- `stable` → `have-remote-offer` (receive offer)
- `have-local-offer` → `stable` (receive answer OR rollback)
- `have-remote-offer` → `stable` (send answer)

**Invalid Transitions** (cause errors):
- `have-local-offer` → `have-remote-offer` (receive offer without rollback)
- `have-remote-offer` → `have-local-offer` (create offer without rollback)

## Appendix B: Message Flow Comparison

### Browser-to-Browser (WORKING)

```
Browser A (Host)          Backend WS           Browser B (Guest)
     |                        |                      |
     |──── createOffer() ────→|                      |
     |──── sendSignal(offer)─→|──── signal(offer) ──→|
     |                        |──→ CHECK STATE ──────|
     |                        |──→ State = stable ───|
     |                        |──→ setRemoteDesc ────|
     |                        |──→ createAnswer() ───|
     |←─── signal(answer) ────|←─── sendSignal() ────|
     |──→ setRemoteDesc ──────|                      |
     |                        |                      |
     ✅ CONNECTION ESTABLISHED                       |
```

### Browser-to-Mobile (BROKEN - Before Fix)

```
Browser (Guest)          Backend WS         Mobile (Host)
     |                        |                  |
     |                        |←─ createOffer() ─|
     |                        |← sendSignal(offer)
     |                        |                  |
     |──── createOffer() ────→|                  |
     |──── sendSignal(offer)─→|─ signal(offer) ─→|
     |                        | ❌ NO STATE CHECK!
     |                        | State = have-local-offer
     |                        | setRemoteDesc() ← FAILS
     |                        |                  |
     ❌ CONNECTION FAILED                        |
```

### Browser-to-Mobile (FIXED - After Fix)

```
Browser (Guest)          Backend WS         Mobile (Host)
     |                        |                  |
     |                        |←─ createOffer() ─|
     |                        |← sendSignal(offer)
     |                        |                  |
     |──── createOffer() ────→|                  |
     |──── sendSignal(offer)─→|─ signal(offer) ─→|
     |                        |──→ CHECK STATE ──|
     |                        | State = have-local-offer
     |                        |──→ ROLLBACK ─────|
     |                        | State = stable   |
     |                        |──→ setRemoteDesc─|
     |                        |──→ createAnswer()─|
     |←─── signal(answer) ────|←── sendSignal() ─|
     |──→ setRemoteDesc ──────|                  |
     |                        |                  |
     ✅ CONNECTION ESTABLISHED                   |
```

## Conclusion

The mobile app is missing **critical WebRTC glare handling** that the browser implementation has. This causes connection failures when both peers try to establish connections simultaneously - a common scenario in peer-to-peer WebRTC.

The fixes are straightforward: add the same glare detection and rollback logic that already exists and works in the browser implementation.

**Estimated implementation time**: 2-4 hours
**Testing time**: 4-6 hours
**Total**: 1 developer-day

**Priority**: **CRITICAL** - This is blocking mobile-to-browser video chat functionality.
