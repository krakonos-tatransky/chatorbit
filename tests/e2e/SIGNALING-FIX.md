# WebRTC Signaling Format Fix

## Issue Summary

The browser-to-mobile E2E tests were timing out during WebRTC connection establishment. The root cause was **a signaling message format mismatch** between the browser frontend and the mobile simulator.

---

## Root Cause

### Browser Frontend Format (session-view.tsx)

The browser **sends** signals wrapped in an envelope:
```json
{
  "type": "signal",
  "signalType": "offer",  // or "answer", "iceCandidate"
  "payload": { "sdp": "..." }
}
```

The browser **receives** signals and unwraps them:
```typescript
// Line 3501-3502 in session-view.tsx
else if (payload.type === "signal") {
  void handleSignal(payload);
}

// Line 2688-2689 in handleSignal
const signalType = payload.signalType as string;
const detail = payload.payload;
```

### MobileSimulator Original Format

The mobile simulator was **sending** signals directly:
```json
{
  "type": "offer",  // or "answer", "candidate"
  "sdp": "..."
}
```

And **expecting** to receive them directly:
```typescript
switch (message.type) {
  case 'offer':
    await this.handleOffer(message);
    break;
  case 'answer':
    await this.handleAnswer(message);
    break;
  case 'candidate':
    await this.handleCandidate(message);
    break;
}
```

### Result

1. Browser sends: `{type: "signal", signalType: "offer", payload: {...}}`
2. MobileSimulator receives: Sees `message.type === "signal"`, no matching case, **IGNORED**
3. MobileSimulator sends: `{type: "offer", sdp: "..."}`
4. Browser receives: Sees `payload.type === "offer"` (not "signal"), **IGNORED**

**Outcome**: Both sides ignore each other's WebRTC signals → No peer connection → Test timeout

---

## The Fix

Updated `tests/e2e/clients/mobile-simulator.ts` to match the browser's signaling format.

### 1. Updated `handleMessage()` to Unwrap Signals

**Before**:
```typescript
switch (message.type) {
  case 'offer':
    await this.handleOffer(message);
    break;
  case 'answer':
    await this.handleAnswer(message);
    break;
  case 'candidate':
    await this.handleCandidate(message);
    break;
}
```

**After**:
```typescript
switch (message.type) {
  case 'signal':
    // Unwrap browser's signal envelope format
    const signalType = message.signalType as string;
    const payload = message.payload;

    if (signalType === 'offer') {
      await this.handleOffer({ sdp: payload });
    } else if (signalType === 'answer') {
      await this.handleAnswer({ sdp: payload });
    } else if (signalType === 'iceCandidate') {
      await this.handleCandidate({ candidate: payload });
    }
    break;
  // ... other cases ...
}
```

### 2. Updated `sendSignal()` to Wrap Signals

**Before**:
```typescript
private sendSignal(message: any): void {
  if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
    this.logger.error('Cannot send signal - WebSocket not open');
    return;
  }

  this.logger.signal('out', message.type || 'signal', message);
  this.ws.send(JSON.stringify(message));
}
```

**After**:
```typescript
private sendSignal(signalType: string, payload: unknown): void {
  if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
    this.logger.error('Cannot send signal - WebSocket not open');
    return;
  }

  const message = {
    type: 'signal',
    signalType,
    payload,
  };

  this.logger.signal('out', signalType, payload);
  this.ws.send(JSON.stringify(message));
}
```

### 3. Updated All Call Sites

**ICE Candidate (Line ~213)**:
```typescript
// Before
this.sendSignal({
  type: 'candidate',
  candidate: event.candidate.toJSON(),
});

// After
this.sendSignal('iceCandidate', event.candidate.toJSON());
```

**Answer (Line ~408)**:
```typescript
// Before
this.sendSignal({
  type: 'answer',
  sdp: this.pc!.localDescription,
});

// After
this.sendSignal('answer', this.pc!.localDescription);
```

**Offer (Line ~531)**:
```typescript
// Before
this.sendSignal({
  type: 'offer',
  sdp: this.pc.localDescription,
});

// After
this.sendSignal('offer', this.pc.localDescription);
```

---

## Message Flow (After Fix)

### Browser → MobileSimulator

1. Browser creates offer:
   ```json
   {
     "type": "signal",
     "signalType": "offer",
     "payload": { "type": "offer", "sdp": "..." }
   }
   ```

2. MobileSimulator receives:
   - Matches `message.type === 'signal'` ✅
   - Unwraps: `signalType = 'offer'`, `payload = { sdp: "..." }`
   - Calls `handleOffer({ sdp: payload })` ✅

### MobileSimulator → Browser

1. MobileSimulator creates answer:
   ```json
   {
     "type": "signal",
     "signalType": "answer",
     "payload": { "type": "answer", "sdp": "..." }
   }
   ```

2. Browser receives:
   - Matches `payload.type === 'signal'` ✅
   - Unwraps: `signalType = 'answer'`, `detail = { sdp: "..." }`
   - Processes answer ✅

---

## Testing the Fix

### Expected Results

**Before Fix**:
- ❌ Browser-to-browser test: PASS (both use same format)
- ❌ Browser-to-mobile test: TIMEOUT (format mismatch)

**After Fix**:
- ✅ Browser-to-browser test: PASS
- ✅ Browser-to-mobile test: PASS

### Test Commands

```bash
cd tests/e2e

# Run browser-to-mobile test
npm test -- browser-mobile-connection

# Run all tests
npm test
```

### Expected Output

```
 PASS  scenarios/browser-mobile-connection.test.ts
  Browser ↔ Mobile WebRTC Connection
    ✓ should establish WebRTC data channel between browser and mobile (15000 ms)
    ✓ should exchange text messages between browser and mobile (8000 ms)
    ✓ should handle video call initiation (5000 ms)
```

---

## Why This Was Hard to Debug

1. **WebSocket connection succeeded** - Both clients connected successfully
2. **Backend logs looked normal** - Showed WebSocket connections opening and closing
3. **No obvious error messages** - Just timeouts with no indication of the root cause
4. **Format looked similar** - Both were JSON with `type` field
5. **Browser-to-browser worked** - Masked the issue, suggesting infrastructure was fine

The WebRTC specialist agent identified the issue by:
1. Comparing the browser's `session-view.tsx` signaling code
2. Analyzing the mobile simulator's message handling
3. Identifying the envelope wrapper mismatch
4. Tracing through the exact message flow on both sides

---

## Lessons Learned

### For Future Development

1. **Establish signaling contracts early** - Document expected message formats
2. **Test cross-platform from the start** - Don't rely solely on browser-to-browser tests
3. **Add signaling validation** - Warn when receiving unexpected message formats
4. **Comprehensive logging** - Log raw messages to spot format issues quickly

### For Debugging

1. **Compare working vs failing scenarios** - Browser-browser vs browser-mobile revealed the issue
2. **Examine both sides of the connection** - Don't assume one side is "correct"
3. **Look at actual message formats** - Not just "it connected" but "what messages are being sent"
4. **Use specialized analysis** - WebRTC specialist agent was key to solving this

---

## Files Changed

- `/Users/erozloznik/Projects/chatorbit-mobile/tests/e2e/clients/mobile-simulator.ts`
  - Updated `handleMessage()` to handle `'signal'` type and unwrap
  - Updated `sendSignal()` to wrap in envelope format
  - Updated 3 call sites (ICE candidate, answer, offer)

---

**Date**: 2025-12-21
**Issue**: Browser-mobile WebRTC connection timeout
**Root Cause**: Signaling message format mismatch
**Status**: ✅ Fixed
