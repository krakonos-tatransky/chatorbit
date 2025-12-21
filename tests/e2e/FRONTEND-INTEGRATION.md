# Frontend Integration Guide

To enable E2E testing with the BrowserClient, you need to make a few small changes to the frontend code.

## 1. Add Test IDs to Components

Add `data-testid` attributes to key interactive elements for reliable test selection.

### Message Input & Send Button

**File**: `frontend/components/session-view.tsx` (or wherever your chat UI is)

```typescript
// Message input
<textarea
  data-testid="message-input"
  placeholder="Type your message..."
  value={draft}
  onChange={(e) => setDraft(e.target.value)}
/>

// Send button
<button
  data-testid="send-button"
  onClick={handleSendMessage}
>
  Send
</button>
```

### Video Call Buttons

```typescript
// Initiate video call button
<button
  data-testid="video-call-button"
  onClick={handleInitiateCall}
>
  Start Video Call
</button>

// Accept call button
<button
  data-testid="accept-call-button"
  onClick={handleAcceptCall}
>
  Accept Call
</button>
```

### Terms Acceptance Modal

```typescript
// Terms agreement button
<button
  onClick={handleAcceptTerms}
>
  I understand and agree
</button>
```

---

## 2. Expose WebRTC State for Testing

Add a global reference to the peer connection so tests can inspect its state.

### Option A: Development-Only Global (Recommended)

**File**: `frontend/components/session-view.tsx`

```typescript
useEffect(() => {
  // Only expose in test environment
  if (process.env.NODE_ENV === 'development' || process.env.TEST_MODE === 'true') {
    (window as any).__peerConnection = peerConnectionRef.current;
    (window as any).__dataChannel = dataChannelRef.current;
  }

  return () => {
    if (process.env.NODE_ENV === 'development' || process.env.TEST_MODE === 'true') {
      delete (window as any).__peerConnection;
      delete (window as any).__dataChannel;
    }
  };
}, [peerConnectionRef.current, dataChannelRef.current]);
```

### Option B: Test Hook API (More Structured)

Create a test API that exposes state only when requested:

```typescript
// Add to session-view component
useEffect(() => {
  if (typeof window !== 'undefined') {
    (window as any).__getWebRTCState = () => ({
      peerConnection: peerConnectionRef.current,
      dataChannel: dataChannelRef.current,
      connectionState: peerConnectionRef.current?.connectionState,
      iceConnectionState: peerConnectionRef.current?.iceConnectionState,
      signalingState: peerConnectionRef.current?.signalingState,
      dataChannelState: dataChannelRef.current?.readyState,
    });
  }

  return () => {
    delete (window as any).__getWebRTCState;
  };
}, []);
```

Then in tests:
```typescript
const state = await page.evaluate(() => {
  return (window as any).__getWebRTCState();
});
```

---

## 3. Add Test Mode Environment Variable

**File**: `frontend/.env.local` (for local development testing)

```bash
TEST_MODE=true
```

**File**: `frontend/next.config.mjs`

```javascript
const nextConfig = {
  // ... existing config
  env: {
    TEST_MODE: process.env.TEST_MODE,
  },
};
```

---

## 4. Add Console Logging for Key Events

Enhance logging to help tests track events:

```typescript
// When message received
useEffect(() => {
  if (receivedMessage) {
    console.log('[TEST_EVENT] message-received', { text: receivedMessage.text });
  }
}, [receivedMessage]);

// When video call initiated
const handleInitiateCall = () => {
  console.log('[TEST_EVENT] video-call-initiated');
  // ... existing logic
};

// When video call accepted
const handleAcceptCall = () => {
  console.log('[TEST_EVENT] video-call-accepted');
  // ... existing logic
};

// When WebRTC connection state changes
peerConnection.onconnectionstatechange = () => {
  console.log('[TEST_EVENT] connection-state-change', {
    state: peerConnection.connectionState,
  });
};
```

The `BrowserClient` captures these console logs and can use them to verify events occurred.

---

## 5. Example: Complete Integration

Here's a complete example of integrating test support into your session component:

```typescript
// frontend/components/session-view.tsx

export function SessionView({ token }: { token: string }) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  // Expose WebRTC state for E2E tests
  useEffect(() => {
    if (process.env.TEST_MODE === 'true') {
      (window as any).__peerConnection = peerConnectionRef.current;
      (window as any).__dataChannel = dataChannelRef.current;

      console.log('[TEST] WebRTC state exposed for testing');
    }

    return () => {
      if (process.env.TEST_MODE === 'true') {
        delete (window as any).__peerConnection;
        delete (window as any).__dataChannel;
      }
    };
  }, [peerConnectionRef.current, dataChannelRef.current]);

  // Message input with test ID
  return (
    <div>
      {/* ... other UI ... */}

      <textarea
        data-testid="message-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Type a message..."
      />

      <button
        data-testid="send-button"
        onClick={handleSendMessage}
      >
        Send
      </button>

      <button
        data-testid="video-call-button"
        onClick={handleInitiateCall}
      >
        Video Call
      </button>

      {/* ... rest of UI ... */}
    </div>
  );
}
```

---

## 6. Verify Integration

After making these changes, verify they work:

### Test 1: Check Test IDs
```bash
# Start frontend
cd frontend
npm run dev

# In browser DevTools console:
document.querySelector('[data-testid="message-input"]')
// Should return the textarea element
```

### Test 2: Check WebRTC State Exposure
```bash
# Open a session in browser
# In DevTools console:
window.__peerConnection
// Should show RTCPeerConnection object or null

window.__dataChannel
// Should show RTCDataChannel object or null
```

### Test 3: Check Console Logging
```bash
# Open browser DevTools console
# Perform actions (send message, start call)
# Should see [TEST_EVENT] logs
```

---

## 7. Minimal Required Changes

If you want the **absolute minimum** to get tests working:

1. **Add these 3 test IDs**:
   - `data-testid="message-input"` on textarea
   - `data-testid="send-button"` on send button
   - `data-testid="video-call-button"` on video button

2. **Expose peer connection**:
   ```typescript
   useEffect(() => {
     (window as any).__peerConnection = peerConnectionRef.current;
     (window as any).__dataChannel = dataChannelRef.current;
   }, [peerConnectionRef.current, dataChannelRef.current]);
   ```

That's it! With just these changes, the BrowserClient will work.

---

## 8. Alternative: No Frontend Changes

If you **don't want to modify the frontend**, you can:

1. **Use CSS selectors** instead of test IDs:
   ```typescript
   // In BrowserClient
   const input = this.page.locator('textarea').first();
   const button = this.page.locator('button:has-text("Send")').first();
   ```

2. **Skip WebRTC state inspection** and rely only on:
   - Visual element presence
   - Console log messages
   - Network activity

This is less reliable but requires zero frontend changes.

---

## Summary

| Change | Required? | Impact |
|--------|-----------|--------|
| Add test IDs | Recommended | Makes selectors reliable |
| Expose WebRTC state | Recommended | Enables state verification |
| Add console logging | Optional | Helps debugging |
| Test mode env var | Optional | Gates test-only code |

**Recommended approach**: Add test IDs and expose WebRTC state. Takes ~10 minutes, massively improves test reliability.
