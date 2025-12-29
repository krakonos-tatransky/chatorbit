# Mobile WebRTC Fixes - Implementation Guide

> **STATUS: ✅ IMPLEMENTATION COMPLETE (2025-12-21)**
>
> All fixes have been implemented in `mobile/App.tsx`. See `MOBILE-WEBRTC-FIXES-CHANGELOG.md` for detailed changes made.
>
> **Next Step**: Run tests to verify fixes work correctly.

**Target File**: `mobile/App.tsx`
**Estimated Time**: 2-4 hours
**Priority**: CRITICAL

## Overview

This guide provides step-by-step instructions to add critical WebRTC glare handling to the mobile app, bringing it to parity with the working browser implementation.

## Prerequisites

Before starting:
1. Read `docs/MOBILE-BROWSER-WEBRTC-COMPATIBILITY-ANALYSIS.md` for context
2. Backup current `mobile/App.tsx` or create a git branch
3. Have the browser implementation open for reference: `frontend/components/session-view.tsx`

## Implementation Steps

### Step 1: Add Deferred Offers Ref

**Location**: Near line 196, after `pendingCandidatesRef`

**Add this new ref**:
```typescript
const deferredOffersRef = useRef<any[]>([]);
```

**Full context** (lines 196-200):
```typescript
const pendingSignalsRef = useRef<any[]>([]);
const pendingOutgoingSignalsRef = useRef<Array<{ signalType: string; payload: any }>>([]);
const pendingCandidatesRef = useRef<any[]>([]);
const seenCandidatesRef = useRef<Set<string>>(new Set());
const deferredOffersRef = useRef<any[]>([]);  // ← NEW
```

---

### Step 2: Add Glare Handling to Offer Processing

**Location**: `processSignalPayload` function, lines 826-846

**Replace the existing offer handling code**:

**BEFORE**:
```typescript
if (signalType === 'offer' && detail) {
  if (fallbackOfferTimeoutRef.current) {
    clearTimeout(fallbackOfferTimeoutRef.current as TimeoutHandle);
    fallbackOfferTimeoutRef.current = null;
  }
  logPeer(pc, 'received offer');
  clearStaleCandidates();
  try {
    await pc.setRemoteDescription(new RTCSessionDescriptionCtor(detail));
    logPeer(pc, 'applied remote offer');
    await flushPendingCandidates(pc);
    const answer = await pc.createAnswer();
    logPeer(pc, 'created answer');
    await pc.setLocalDescription(answer);
    logPeer(pc, 'set local answer');
    sendSignal('answer', answer);
  } catch (err) {
    logPeer(pc, 'failed to apply remote offer - clearing pending candidates');
    pendingCandidatesRef.current = [];
    throw err;
  }
}
```

**AFTER**:
```typescript
if (signalType === 'offer' && detail) {
  // Clear fallback offer timeout
  if (fallbackOfferTimeoutRef.current) {
    clearTimeout(fallbackOfferTimeoutRef.current as TimeoutHandle);
    fallbackOfferTimeoutRef.current = null;
  }

  logPeer(pc, 'received offer');
  clearStaleCandidates();

  // GLARE HANDLING: Check if we already have a local offer pending
  if (pc.signalingState === 'have-local-offer') {
    logPeer(pc, 'rolling back local offer to accept remote offer', {
      signalingState: pc.signalingState
    });
    try {
      await pc.setLocalDescription({ type: 'rollback' } as any);
      logPeer(pc, 'rollback successful');
    } catch (err) {
      console.warn('Failed to rollback local offer', err);
      // Continue anyway - setRemoteDescription might still work
    }
  }

  // SIGNALING STATE VALIDATION: Defer offer if not stable
  if (pc.signalingState !== 'stable') {
    logPeer(pc, 'signaling not stable; deferring remote offer', {
      signalingState: pc.signalingState
    });
    deferredOffersRef.current = [payload];
    return;
  }

  // Now safe to apply remote offer
  try {
    await pc.setRemoteDescription(new RTCSessionDescriptionCtor(detail));
    logPeer(pc, 'applied remote offer');

    await flushPendingCandidates(pc);

    const answer = await pc.createAnswer();
    logPeer(pc, 'created answer');

    await pc.setLocalDescription(answer);
    logPeer(pc, 'set local answer');

    sendSignal('answer', answer);
  } catch (err) {
    logPeer(pc, 'failed to apply remote offer - clearing pending candidates');
    pendingCandidatesRef.current = [];
    throw err;
  }
}
```

**Key changes**:
1. Added glare detection: `if (pc.signalingState === 'have-local-offer')`
2. Added rollback: `await pc.setLocalDescription({ type: 'rollback' })`
3. Added signaling state check: `if (pc.signalingState !== 'stable')`
4. Added deferral: `deferredOffersRef.current = [payload]; return;`

---

### Step 3: Update Signaling State Change Handler

**Location**: `handleSignalingStateChange` function, lines 1812-1819

**Replace the existing handler**:

**BEFORE**:
```typescript
const handleSignalingStateChange = () => {
  logPeer(pc, 'signaling state changed', pc.signalingState);
  if (pc.signalingState === 'stable' && negotiationPendingRef.current) {
    logPeer(pc, 'retrying deferred negotiation');
    void negotiateMediaUpdate(pc, 'deferred-negotiation-retry');
  }
};
```

**AFTER**:
```typescript
const handleSignalingStateChange = () => {
  logPeer(pc, 'signaling state changed', pc.signalingState);

  // Process deferred offers when signaling state becomes stable
  if (pc.signalingState === 'stable') {
    // Process deferred offers first
    if (deferredOffersRef.current.length > 0) {
      const deferred = deferredOffersRef.current.shift();
      if (deferred) {
        logPeer(pc, 'processing deferred offer');
        void processSignalPayload(pc, deferred);
      }
    }

    // Then retry pending negotiation
    if (negotiationPendingRef.current) {
      logPeer(pc, 'retrying deferred negotiation');
      void negotiateMediaUpdate(pc, 'deferred-negotiation-retry');
    }
  }
};
```

**Key changes**:
1. Added deferred offer processing when state becomes stable
2. Processes deferred offers BEFORE retrying negotiation

---

### Step 4: Add ICE Restart Support (Optional but Recommended)

**Location**: `createAndSendOffer` function signature, line 1537

**Update function signature**:

**BEFORE**:
```typescript
const createAndSendOffer = useCallback(
  async (pc: RTCPeerConnection, reason: string, ensureDataChannel = false) => {
```

**AFTER**:
```typescript
const createAndSendOffer = useCallback(
  async (
    pc: RTCPeerConnection,
    reason: string,
    ensureDataChannel = false,
    forceIceRestart = false
  ) => {
```

**Location**: Offer creation, line 1553

**BEFORE**:
```typescript
const offer = await pc.createOffer();
```

**AFTER**:
```typescript
const offer = await pc.createOffer(
  forceIceRestart ? { iceRestart: true } : undefined
);
```

**Full updated function excerpt**:
```typescript
const createAndSendOffer = useCallback(
  async (
    pc: RTCPeerConnection,
    reason: string,
    ensureDataChannel = false,
    forceIceRestart = false
  ) => {
    // ... existing pre-flight checks ...

    const offer = await pc.createOffer(
      forceIceRestart ? { iceRestart: true } : undefined
    );
    logPeer(pc, 'created offer', reason);

    // ... rest of existing code ...
  },
  [/* deps */]
);
```

---

### Step 5: Explicitly Set Data Channel Handler for Guest

**Location**: Peer connection setup, lines 1837-1841

**Replace the existing code**:

**BEFORE**:
```typescript
if (participantRole === 'host') {
  const channel = pc.createDataChannel('chat') as unknown as PeerDataChannel;
  logPeer(pc, 'created data channel', channel.label);
  attachDataChannel(channel, pc);
}
```

**AFTER**:
```typescript
if (participantRole === 'host') {
  const channel = pc.createDataChannel('chat') as unknown as PeerDataChannel;
  logPeer(pc, 'created data channel', channel.label);
  attachDataChannel(channel, pc);
} else {
  // Explicitly set handler for guest to receive data channel from host
  logPeer(pc, 'setting ondatachannel handler (guest role)');
  (pc as any).ondatachannel = handleDataChannel;
}
```

**Note**: The `handleDataChannel` function is already defined at line 1759-1775, so we're just ensuring it's always attached for guest role.

---

### Step 6: Clear Deferred Offers on Cleanup

**Location**: Cleanup function in peer connection useEffect, around line 1950

**Add to the cleanup/reset logic**:

Find where you clear refs on cleanup, and add:
```typescript
// Clear deferred offers
deferredOffersRef.current = [];
```

**Full cleanup section** should include:
```typescript
return () => {
  logPeer(pc, 'cleanup');

  // Clear all refs
  pendingSignalsRef.current = [];
  pendingCandidatesRef.current = [];
  pendingOutgoingSignalsRef.current = [];
  seenCandidatesRef.current.clear();
  deferredOffersRef.current = [];  // ← NEW

  // ... rest of cleanup ...
};
```

---

## Verification Checklist

After implementing all changes:

### Code Review
- [ ] `deferredOffersRef` is declared near line 196
- [ ] Glare handling added to offer processing (rollback logic)
- [ ] Signaling state check added before applying remote offer
- [ ] `handleSignalingStateChange` processes deferred offers
- [ ] ICE restart parameter added to `createAndSendOffer` (optional)
- [ ] Guest role explicitly sets `ondatachannel` handler
- [ ] Cleanup function clears `deferredOffersRef`

### Build & Compile
- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] No new linter warnings: `npm run lint` (if exists)
- [ ] iOS build succeeds: `cd ios && pod install && cd .. && npx react-native run-ios`
- [ ] Android build succeeds: `npx react-native run-android`

### Testing
- [ ] Run E2E tests: `cd tests/e2e && npm test -- --testNamePattern="browser-mobile"`
- [ ] Manual test: Browser (host) → Mobile (guest) connection
- [ ] Manual test: Mobile (host) → Browser (guest) connection
- [ ] Manual test: Mobile → Mobile connection
- [ ] Video call works in all scenarios
- [ ] Text messages work in all scenarios
- [ ] No console errors about signaling state

### Regression Testing
- [ ] Browser-to-browser still works (should not be affected)
- [ ] Mobile-to-mobile still works
- [ ] Connection recovery works (disconnect and reconnect)
- [ ] ICE candidate deduplication still works

---

## Testing Strategy

### Unit Test (Optional)
Create a test for glare handling:

```typescript
// tests/unit/webrtc-glare.test.ts
test('should rollback local offer when receiving remote offer', async () => {
  const pc = new RTCPeerConnection();

  // Create local offer (signalingState = "have-local-offer")
  const localOffer = await pc.createOffer();
  await pc.setLocalDescription(localOffer);

  expect(pc.signalingState).toBe('have-local-offer');

  // Receive remote offer - should trigger rollback
  const remoteOffer = createMockOffer();

  // Rollback
  await pc.setLocalDescription({ type: 'rollback' });
  expect(pc.signalingState).toBe('stable');

  // Now can apply remote offer
  await pc.setRemoteDescription(remoteOffer);
  expect(pc.signalingState).toBe('have-remote-offer');
});
```

### Integration Test
Use existing E2E test:

```bash
cd tests/e2e
npm test -- --testNamePattern="browser-mobile"
```

Expected results:
```
✅ should establish WebRTC data channel between browser and mobile
✅ should exchange text messages between browser and mobile
✅ should handle video call initiation
```

### Manual Test Scenarios

#### Scenario 1: Browser Host → Mobile Guest
1. Open browser at `http://localhost:3000`
2. Create token and join as host
3. Open mobile app and scan QR code (or paste token)
4. Verify:
   - Connection establishes within 10 seconds
   - Data channel opens
   - Can send text messages both ways
   - Video call works

#### Scenario 2: Mobile Host → Browser Guest
1. Open mobile app and create new session
2. Copy token
3. Open browser and paste token
4. Verify same as Scenario 1

#### Scenario 3: Rapid Reconnection
1. Establish connection (either scenario above)
2. Force-close mobile app
3. Reopen mobile app and rejoin
4. Verify connection re-establishes without errors

---

## Troubleshooting

### Issue: "Failed to rollback local offer"
**Cause**: Rollback might not be supported in older WebRTC implementations
**Solution**: The code already handles this with try-catch and continues

### Issue: "Signaling state is already stable"
**Cause**: Race condition where state stabilized before deferred offer processed
**Solution**: Check if offer is still needed before processing deferred offer

### Issue: Data channel never opens
**Cause**: `ondatachannel` handler not set for guest
**Solution**: Verify Step 5 was completed correctly

### Issue: Still getting connection failures
**Debugging steps**:
1. Enable verbose logging: Add `console.debug` calls
2. Check signaling state at each step
3. Verify rollback is actually being called when needed
4. Check if deferred offers are being processed

**Add debug logging**:
```typescript
// In offer processing
console.debug('rn-webrtc:offer:signaling-state', pc.signalingState);

// After rollback
console.debug('rn-webrtc:rollback:signaling-state', pc.signalingState);

// When processing deferred
console.debug('rn-webrtc:deferred-offer:count', deferredOffersRef.current.length);
```

---

## Rollback Plan

If fixes cause new issues:

1. **Revert changes**:
   ```bash
   git checkout HEAD -- mobile/App.tsx
   ```

2. **Alternative approach**: Implement only critical fixes
   - Start with just Step 1 and Step 2 (glare handling)
   - Test thoroughly
   - Add remaining steps incrementally

3. **Feature flag**: Add environment variable to enable/disable new logic
   ```typescript
   const USE_GLARE_HANDLING = process.env.EXPO_PUBLIC_WEBRTC_GLARE_HANDLING !== 'false';

   if (USE_GLARE_HANDLING && pc.signalingState === 'have-local-offer') {
     // Glare handling
   }
   ```

---

## Success Criteria

Implementation is successful when:

1. ✅ All E2E tests pass
2. ✅ Browser-to-mobile connections succeed >95% of time
3. ✅ Mobile-to-browser connections succeed >95% of time
4. ✅ No "invalid signaling state" errors in logs
5. ✅ Connection establishes within 10 seconds
6. ✅ Video calls work reliably in all combinations
7. ✅ No regression in browser-to-browser connections

---

## Next Steps After Implementation

1. **Deploy to TestFlight**: Internal testing on real iOS devices
2. **Monitor metrics**: Track connection success rates
3. **Gather logs**: Collect real-world signaling state transitions
4. **Document learnings**: Update architecture docs with findings
5. **Consider extracting**: Move WebRTC logic to separate module for reuse

---

## References

- Browser implementation: `frontend/components/session-view.tsx:2745-2968`
- Mobile implementation: `mobile/App.tsx:789-1955`
- Analysis document: `docs/MOBILE-BROWSER-WEBRTC-COMPATIBILITY-ANALYSIS.md`
- WebRTC spec: https://www.w3.org/TR/webrtc/#rtcsignalingstate-enum
- Rollback: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription

---

## Questions?

If you encounter issues during implementation:
1. Re-read the analysis document for context
2. Compare with browser implementation line-by-line
3. Check WebRTC console logs for signaling state transitions
4. Verify all 6 steps were completed exactly as specified
