# WebRTC Browser-Mobile Compatibility Analysis

**Date:** 2024-12-24
**Analyzed:** Frontend (Browser) vs Mobile (React Native) WebRTC Implementations

## Executive Summary

This analysis compares the WebRTC implementations in the ChatOrbit browser frontend (`frontend/components/session-view.tsx` and `frontend/lib/webrtc.ts`) with the mobile app (`mobile/v2/src/webrtc/`). Several critical architectural differences exist that could cause cross-platform communication failures.

## Critical Compatibility Issues

### 1. CONNECTION ESTABLISHMENT FLOW - MAJOR DIFFERENCE

#### Browser Implementation
- **Single-phase initialization**: Browser creates peer connection AND starts video simultaneously
- **Always creates offer on "host" role**: Lines 3206-3621 in session-view.tsx
  ```typescript
  // Host always creates data channel immediately
  if (participantRole === "host") {
    const channel = peerConnection.createDataChannel("chat");
    attachDataChannel(channel, peerConnection);
  }
  ```
- **No video invite flow**: Browser assumes video is always active

#### Mobile Implementation (v2)
- **Two-phase initialization**:
  1. `initializeSignaling()` - Text chat only, NO peer connection
  2. `startVideo()` - Creates peer connection on demand
- **Video invite protocol**: Uses `video-invite` / `video-accept` / `video-end` signaling
- **Peer who ACCEPTS creates offer** (line 200-219 in manager.ts):
  ```typescript
  async acceptVideoInvite(): Promise<void> {
    this.signaling.send({ type: 'signal', signalType: 'video-accept', payload: {} });

    // Create data channel and offer
    if (this.peerConnection) {
      this.peerConnection.createDataChannel('chat');
      const offer = await this.peerConnection.createOffer();
      this.signaling.send({ type: 'signal', signalType: 'offer', payload: { sdp: offer.sdp }});
    }
  }
  ```

**COMPATIBILITY ISSUE**: If browser (host) creates peer connection and sends offer immediately, but mobile hasn't called `startVideo()` yet, the offer will be rejected or ignored.

### 2. SIGNALING STATE CHECKS - CRITICAL SAFETY DIFFERENCE

#### Browser Implementation
**EXTENSIVE signaling state validation** (lines 1902-1907, 2176-2180, 2750-2766):

```typescript
// Before ICE restart
if (pc.signalingState !== "stable") {
  logEvent("Skipping ICE restart while signaling is unstable", {
    reason,
    signalingState: pc.signalingState,
  });
  return false;
}

// Before renegotiation
if (pc.signalingState !== "stable") {
  logEvent("Deferring renegotiation until signaling state stabilizes", {
    signalingState: pc.signalingState,
  });
  negotiationPendingRef.current = true;
  return;
}

// Before processing offer - handles offer collision
if (pc.signalingState === "have-local-offer") {
  logEvent("Rolling back local offer to accept remote offer");
  try {
    await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
  } catch (cause) {
    // handle error
  }
}

if (pc.signalingState !== "stable") {
  logEvent("Signaling not stable; deferring remote offer", { signalingState: pc.signalingState });
  deferredOffersRef.current = [payload];
  return;
}
```

#### Mobile Implementation
**MINIMAL signaling state validation** (lines 562-580 in manager.ts):

```typescript
// Check signaling state - only process offer if in appropriate state
const signalingState = this.peerConnection.getSignalingState();
if (signalingState && signalingState !== 'stable' && signalingState !== 'have-local-offer') {
  console.log(`[WebRTC] Ignoring offer in signaling state: ${signalingState}`);
  return;
}

// Handle "glare" (offer collision) - polite peer pattern
if (signalingState === 'have-local-offer') {
  if (!this.isInitiator) {
    console.log('[WebRTC] Offer collision - backing off as guest (polite peer)');
    // Process incoming offer since we're the polite peer
  } else {
    console.log('[WebRTC] Offer collision - ignoring as host (impolite peer)');
    return;
  }
}
```

**MISSING from mobile**:
- No rollback mechanism for offer collisions
- No deferred offer queue
- No signaling state checks in `createOffer()` or `createAnswer()`
- No checks before ICE restart

**COMPATIBILITY RISK**: Mobile may attempt operations while browser is in unstable signaling state, causing disconnections.

### 3. ROLE DETERMINATION & OFFER CREATION LOGIC

#### Browser Implementation
- **Role-based**: `participantRole` determines who creates offers
- **Host always creates first offer** (line 3615-3620):
  ```typescript
  const pc = peerConnectionRef.current;
  if (!pc) {
    logEvent("Peer connection missing while creating offer");
    return;
  }
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  hasSentOfferRef.current = true;
  sendSignal("offer", offer);
  ```
- **Host creates renegotiation offers** (line 2168-2192)
- **Guest never initiates offers**

#### Mobile Implementation
- **Dynamic role switching**: In video invite flow, the peer who ACCEPTS becomes the offerer
- **Guest can create offers** when accepting video invite (line 211-218):
  ```typescript
  // Create data channel and offer
  if (this.peerConnection) {
    this.peerConnection.createDataChannel('chat');
    const offer = await this.peerConnection.createOffer();
    this.signaling.send({
      type: 'signal',
      signalType: 'offer',
      payload: { sdp: offer.sdp },
    });
  }
  ```

**COMPATIBILITY ISSUE**: Browser expects host to always create offers. If mobile guest accepts video invite and sends offer, browser may not handle it correctly due to role assumptions.

### 4. DATA CHANNEL NAMING & OPTIONS

#### Browser Implementation
```typescript
// Line 3208
const channel = peerConnection.createDataChannel("chat");
// No explicit options, uses defaults
```

#### Mobile Implementation
```typescript
// Line 226-228 in connection.ts
this.dataChannel = this.pc.createDataChannel(label, {
  ordered: true,
}) as any;
```

**DIFFERENCE**: Mobile explicitly sets `ordered: true`, browser uses defaults (which is `ordered: true` by default). This is **compatible** but inconsistent.

### 5. ICE CANDIDATE HANDLING

#### Browser Implementation
- **Duplicate detection**: Lines 2797-2800 use `isDuplicateCandidate()` to prevent adding same candidate twice
- **Queueing with remote description check**: Lines 2802-2807
  ```typescript
  if (pc.remoteDescription) {
    await pc.addIceCandidate(candidateInit);
    logEvent("Applied ICE candidate from peer", detail);
  } else {
    pendingCandidatesRef.current.push(candidateInit);
    logEvent("Queued ICE candidate until remote description is available", detail);
  }
  ```
- **End-of-candidates support**: Lines 2808-2811
  ```typescript
  } else if (pc.remoteDescription) {
    await pc.addIceCandidate(null);
    logEvent("Applied end-of-candidates signal");
  }
  ```

#### Mobile Implementation
- **Basic queueing**: Lines 393-398 in connection.ts
  ```typescript
  // If remote description not set yet, queue the candidate
  if (!this.pc.remoteDescription) {
    console.log('[PeerConnection] Queuing ICE candidate (no remote description yet)');
    this.pendingIceCandidates.push(candidate as RTCIceCandidate);
    return;
  }
  ```
- **NO duplicate detection**
- **NO end-of-candidates handling**

**COMPATIBILITY RISK**:
- Mobile may add duplicate ICE candidates, wasting resources
- Mobile doesn't handle `addIceCandidate(null)` end-of-candidates signal from browser

### 6. OFFER COLLISION HANDLING ("GLARE")

#### Browser Implementation
- **Rollback mechanism**: Lines 2750-2759
  ```typescript
  if (pc.signalingState === "have-local-offer") {
    logEvent("Rolling back local offer to accept remote offer");
    try {
      await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
    } catch (cause) {
      logEvent("Failed to rollback local description before applying remote offer", {
        error: cause instanceof Error ? cause.message : cause,
      });
      throw cause;
    }
  }
  ```
- **Deferred offer queue**: Lines 2762-2766

#### Mobile Implementation
- **Polite peer pattern**: Lines 569-580 in manager.ts
  ```typescript
  if (signalingState === 'have-local-offer') {
    if (!this.isInitiator) {
      console.log('[WebRTC] Offer collision - backing off as guest (polite peer)');
      // We'll just process the incoming offer since we're the polite peer
    } else {
      console.log('[WebRTC] Offer collision - ignoring as host (impolite peer)');
      return;
    }
  }
  ```
- **NO rollback** - just processes offer without explicit rollback

**COMPATIBILITY ISSUE**: Different collision resolution strategies. Browser does explicit rollback, mobile relies on implicit state handling. This could cause signaling state mismatches.

### 7. RECONNECTION & RECOVERY LOGIC

#### Browser Implementation
**EXTENSIVE reconnection logic**:
- ICE restart on error 438 (lines 3175-3194)
- Connection state monitoring (lines 2874-2971)
- Scheduled recovery with exponential backoff (lines 1710-1792)
- Network change detection and ICE restart (lines 1951-2039)
- Force relay routing fallback (lines 1794-1848)

**Example**:
```typescript
peerConnection.onconnectionstatechange = () => {
  const state = peerConnection.connectionState;
  logEvent("Connection state", state);
  setConnectionState(state);

  if (state === "connected") {
    // ... recovery logic ...
  } else if (state === "disconnected") {
    schedulePeerConnectionRecovery(peerConnection, "peer connection disconnected", { delayMs: 2000 });
  } else if (state === "failed") {
    // ... failure handling ...
  }
};
```

#### Mobile Implementation
**BASIC state monitoring**:
- Connection state logging (lines 142-148 in connection.ts)
- ICE connection state logging (lines 133-139)
- **NO automatic reconnection**
- **NO ICE restart logic**
- **NO network change handling**

**COMPATIBILITY RISK**: When browser attempts ICE restart or reconnection, mobile may not respond appropriately, causing permanent disconnection.

### 8. MEDIA CONSTRAINTS

#### Browser Implementation
```typescript
// No explicit constraints visible in grep results
// Uses getUserMedia with default constraints
```

#### Mobile Implementation
```typescript
// Line 287-290 in connection.ts
const offer = await this.pc.createOffer({
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
});
```

**DIFFERENCE**: Mobile explicitly sets `offerToReceiveAudio` and `offerToReceiveVideo` in offer options. Browser doesn't show these constraints in the code analyzed.

**COMPATIBILITY**: These are **legacy constraints** (deprecated in spec) but widely supported. Should be compatible.

## Detailed Flow Comparison

### Browser Flow (Traditional WebRTC)
1. Both peers join session
2. **Host creates peer connection immediately**
3. Host creates data channel "chat"
4. Host creates offer → sends to guest
5. Guest receives offer → creates answer → sends to host
6. Both peers exchange ICE candidates
7. Connection established

### Mobile Flow (Video-on-Demand)
1. Both peers join session via signaling only (NO peer connection)
2. Text chat works via WebSocket signaling
3. **User initiates video**:
   - Sender: `sendVideoInvite()` → sends `video-invite` signal
   - Receiver: Shows video invite UI
4. **Receiver accepts**:
   - Receiver: `startVideo()` → creates peer connection
   - Receiver: `acceptVideoInvite()` → creates data channel + offer
   - Receiver sends `video-accept` signal
   - Receiver sends `offer` signal
5. **Sender processes accept**:
   - Sender: `handleVideoAccept()` → waits for offer
   - Sender receives offer → creates answer → sends to receiver
6. Both peers exchange ICE candidates
7. Connection established

### Critical Mismatch Scenario

**Scenario**: Browser (host) + Mobile (guest)

1. **Browser joins** → creates peer connection → creates offer → sends offer
2. **Mobile joins** → initializes signaling only (NO peer connection yet)
3. **Mobile receives offer** → `handleOffer()` in manager.ts line 535
   - Checks `if (!this.peerConnection)` → TRUE
   - Initializes peer connection on-demand (line 542-560)
   - Processes offer → creates answer → sends answer
4. **Browser receives answer** → connection established

**This WORKS** because mobile has lazy peer connection initialization (line 542-560).

**BUT**:

**Scenario**: Mobile (host) + Browser (guest)

1. **Mobile joins as host** → initializes signaling only (NO peer connection)
2. **Browser joins as guest** → creates peer connection → **WAITS for offer** (guest never creates offers)
3. **DEADLOCK**: Mobile isn't sending an offer because video hasn't started, browser isn't sending an offer because it's the guest.

**CRITICAL FAILURE MODE IDENTIFIED**

## Additional Findings

### 9. ICE Server Configuration

#### Browser Implementation
- Extensive URL sanitization (lines 1-90 in webrtc.ts)
- Filters out unroutable hosts (localhost, 0.0.0.0, IPv6 link-local)
- Environment variable parsing with multiple fallback options
- STUN/TURN credential validation

#### Mobile Implementation
- Basic environment variable parsing (lines 87-107 in connection.ts)
- **NO URL validation or sanitization**
- Default to Google STUN if not configured
- Simple TURN credential check

**COMPATIBILITY**: Browser is more defensive, but both should work if properly configured.

### 10. Event Handler Patterns

#### Browser Implementation
- Direct property assignment: `peerConnection.onicecandidate = (event) => { ... }`
- Uses refs to prevent stale closures

#### Mobile Implementation
- addEventListener pattern: `pc.addEventListener('icecandidate', (event: any) => { ... })`
- Uses class methods (no closure issues)

**COMPATIBILITY**: Both patterns are valid and equivalent.

### 11. Screen Sharing Support

#### Browser Implementation
- No screen sharing code visible in analyzed sections
- Mentioned in CLAUDE.md but not implemented in session-view.tsx

#### Mobile Implementation
- No screen sharing implementation in mobile v2

**STATUS**: Not a compatibility issue, feature not implemented on either side.

## Recommendations

### Priority 1: CRITICAL FIXES REQUIRED

1. **Fix role-based deadlock**:
   - **Option A**: Browser should support receiving offers from guests (remove role assumption)
   - **Option B**: Mobile should send offer immediately when host joins (remove video-on-demand for host)
   - **Recommended**: Option A - Browser needs to be role-agnostic

2. **Add signaling state checks to mobile**:
   - Implement rollback mechanism for offer collisions
   - Add deferred offer queue
   - Check signaling state before `createOffer()` and `createAnswer()`

3. **Align offer creation timing**:
   - **Either**: Browser supports lazy peer connection like mobile
   - **Or**: Mobile creates peer connection immediately on join (like browser)
   - **Recommended**: Hybrid - support both immediate and on-demand video

### Priority 2: IMPORTANT IMPROVEMENTS

4. **Add duplicate ICE candidate detection to mobile**:
   - Implement same logic as browser (lines 2797-2800)

5. **Implement end-of-candidates handling in mobile**:
   - Support `addIceCandidate(null)` signal

6. **Add reconnection logic to mobile**:
   - ICE restart on failure
   - Connection state recovery
   - Network change detection

### Priority 3: NICE-TO-HAVE ENHANCEMENTS

7. **Align data channel options**:
   - Explicitly set `ordered: true` in browser to match mobile

8. **Add URL sanitization to mobile**:
   - Adopt browser's ICE server validation logic

9. **Standardize event handler patterns**:
   - Choose one pattern (property assignment vs addEventListener) for consistency

## Testing Strategy

### Cross-Platform Test Matrix

| Test Case | Browser (Host) + Mobile (Guest) | Mobile (Host) + Browser (Guest) | Browser + Browser | Mobile + Mobile |
|-----------|----------------------------------|----------------------------------|-------------------|------------------|
| **Text Chat Only** | EXPECTED PASS | EXPECTED PASS | PASS | PASS |
| **Video Immediate** | EXPECTED PASS (lazy init) | **EXPECTED FAIL** (deadlock) | PASS | PASS |
| **Video On-Demand** | **UNKNOWN** (browser doesn't support) | **UNKNOWN** | N/A | PASS |
| **Offer Collision** | **RISKY** (different strategies) | **RISKY** | PASS | PASS |
| **ICE Restart** | **RISKY** (mobile lacks logic) | **RISKY** | PASS | UNKNOWN |

### Recommended Test Scenarios

1. **Scenario 1**: Mobile host + Browser guest
   - Expected: Deadlock on initial connection
   - Test: Join both peers, measure time to connection
   - Success criteria: Connection established within 5 seconds

2. **Scenario 2**: Browser host + Mobile guest (immediate video)
   - Expected: Success due to lazy initialization
   - Test: Browser creates offer before mobile joins
   - Success criteria: Video connection established

3. **Scenario 3**: Browser host + Mobile guest (delayed video)
   - Expected: Unknown behavior
   - Test: Mobile joins, waits 10s, then starts video
   - Success criteria: Video connection established after delay

4. **Scenario 4**: Simultaneous offer creation
   - Expected: Different collision resolution
   - Test: Both peers create offers at exactly the same time
   - Success criteria: One offer wins, connection established

5. **Scenario 5**: ICE failure recovery
   - Expected: Browser recovers, mobile doesn't
   - Test: Simulate ICE candidate failure
   - Success criteria: Browser reconnects, mobile shows failure

## Code References

### Browser Implementation Files
- **Primary WebRTC Logic**: `/Users/erozloznik/Projects/chatorbit-mobile/frontend/components/session-view.tsx`
  - Lines 2845-3621: Peer connection initialization and signaling
  - Lines 1710-1848: Reconnection and recovery logic
  - Lines 2692-2814: Signal processing
- **ICE Configuration**: `/Users/erozloznik/Projects/chatorbit-mobile/frontend/lib/webrtc.ts`
  - Lines 1-90: URL sanitization
  - Lines 189-226: ICE server configuration

### Mobile Implementation Files
- **Peer Connection**: `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/src/webrtc/connection.ts`
  - Lines 56-82: Initialization
  - Lines 277-333: Offer/Answer creation
  - Lines 338-379: Remote description handling
  - Lines 384-406: ICE candidate handling
- **WebRTC Manager**: `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/src/webrtc/manager.ts`
  - Lines 62-98: Signaling initialization
  - Lines 104-144: Video start flow
  - Lines 198-220: Video invite acceptance
  - Lines 534-601: Offer handling with lazy initialization

## Conclusion

The browser and mobile implementations use fundamentally different architectural patterns:
- **Browser**: Traditional WebRTC with immediate peer connection creation
- **Mobile**: Chat-first with on-demand video via invite protocol

The most critical issue is the **role-based deadlock** when mobile is host and browser is guest. This will cause 100% connection failure in that configuration.

**Immediate action required**:
1. Test Mobile (host) + Browser (guest) scenario to confirm deadlock
2. Implement browser support for receiving offers from guests
3. Add signaling state validation to mobile
4. Align offer creation timing strategies

**Medium-term improvements**:
- Add reconnection logic to mobile
- Implement duplicate ICE candidate detection
- Standardize collision resolution

Without these fixes, the browser and mobile apps cannot reliably communicate in all role configurations.
