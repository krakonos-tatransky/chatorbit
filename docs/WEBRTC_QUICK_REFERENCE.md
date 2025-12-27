# WebRTC Mobile Implementation - Quick Reference

## Quick Start

```typescript
import { webrtcManager } from '@/webrtc';

// 1. Initialize signaling for text chat
await webrtcManager.initializeSignaling(token, participantId, isHost);

// 2. (Later) Start video when user taps camera button
const localStream = await webrtcManager.startVideo();

// 3. Send text messages
await webrtcManager.sendMessage("Hello!");

// 4. Stop video (keeps text chat alive)
webrtcManager.stopVideo();

// 5. End entire session
await webrtcManager.endSession();
```

---

## Critical Design Patterns

### 1. Chat-First Paradigm

```typescript
// WRONG: Starting video immediately
await startSession(token, participantId, isHost); // Old v1 pattern

// RIGHT: Separate text from video
await initializeSignaling(token, participantId, isHost); // Text only
await startVideo(); // Video later, when needed
```

### 2. ICE Candidate Queuing

```typescript
// Queue candidates until conditions are met
if (!signaling.isConnected() || !pc.remoteDescription) {
  pendingIceCandidates.push(candidate);
  return;
}

// Flush after remote description is set
await pc.setRemoteDescription(offer);
flushPendingIceCandidates();
```

### 3. Signaling State Guards

```typescript
// Always check before processing offers/answers
const state = pc.getSignalingState();

// Only process offer if in stable or have-local-offer
if (state !== 'stable' && state !== 'have-local-offer') {
  console.log('Ignoring offer in wrong state:', state);
  return;
}
```

### 4. Polite/Impolite Peer Pattern

```typescript
// Handle offer collisions
if (signalingState === 'have-local-offer') {
  if (!this.isInitiator) {
    // Guest (polite): Back off, process remote offer
    await this.pc.setRemoteDescription(offer);
  } else {
    // Host (impolite): Ignore remote offer, wait for guest
    return;
  }
}
```

---

## State Management Cheat Sheet

### Connection States

```typescript
// Overall connection state
type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

// Access
const { connectionState } = useConnectionStore();
```

### Signaling States

```typescript
// WebSocket state
type SignalingState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

// Access
const { signalingState } = useConnectionStore();
```

### ICE States

```typescript
// ICE connection state
type IceConnectionState =
  | 'new'
  | 'checking'
  | 'connected'
  | 'completed'
  | 'failed'
  | 'disconnected'
  | 'closed';

// Access
const { iceConnectionState } = useConnectionStore();
```

---

## Message Routing Decision Tree

```
User sends message
    │
    ├─ Video active? (peer connection exists)
    │    ├─ YES → Data channel open?
    │    │    ├─ YES → Send via data channel
    │    │    │         Wait for ACK
    │    │    │         Mark as "sent" when ACK received
    │    │    │
    │    │    └─ NO → Fall through to signaling
    │    │
    │    └─ NO → Fall through to signaling
    │
    └─ Send via WebSocket signaling
         Mark as "sent" immediately (no ACK)
```

---

## Common Scenarios

### Scenario 1: User Starts Video Call

```typescript
// User taps camera button
const handleStartVideo = async () => {
  try {
    // 1. Start local video
    const stream = await webrtcManager.startVideo();

    // 2. Send video invite to peer
    webrtcManager.sendVideoInvite();

    // 3. Update UI
    setLocalStream(stream);
  } catch (error) {
    // Handle permission denial, device error, etc.
    console.error('Failed to start video:', error);
  }
};
```

### Scenario 2: User Receives Video Invite

```typescript
// Setup callback for video invites
webrtcManager.onVideoInvite = () => {
  // Show accept/decline UI
  showVideoInviteModal();
};

// User accepts invite
const handleAcceptVideo = async () => {
  try {
    // 1. Start local video
    const stream = await webrtcManager.startVideo();

    // 2. Accept invite (creates offer)
    await webrtcManager.acceptVideoInvite();

    // 3. Update UI
    setLocalStream(stream);
  } catch (error) {
    console.error('Failed to accept video:', error);
  }
};
```

### Scenario 3: User Stops Video (Keeps Text)

```typescript
const handleStopVideo = () => {
  // Stops video, keeps text chat
  webrtcManager.stopVideo();

  // Update UI
  setLocalStream(null);
  setRemoteStream(null);
};
```

### Scenario 4: Network Transition (WiFi → Cellular)

```typescript
// Automatic reconnection
// 1. WebSocket disconnects (code !== 1000)
// 2. SignalingClient schedules reconnect with backoff
// 3. Reconnects: 1s, 2s, 4s, 8s, 16s
// 4. On reconnect, stuck messages are resolved
// 5. ICE connection may restart automatically

// Monitor connection state
const { connectionState } = useConnectionStore();

useEffect(() => {
  if (connectionState === 'reconnecting') {
    showReconnectingIndicator();
  }
}, [connectionState]);
```

---

## Error Handling Patterns

### Permission Errors

```typescript
try {
  await webrtcManager.startVideo();
} catch (error) {
  if (error.code === WebRTCErrorCode.MEDIA_PERMISSION_DENIED) {
    // Show permission instructions
    alert('Please grant camera/microphone access');
  }
}
```

### Connection Errors

```typescript
const { error } = useConnectionStore();

useEffect(() => {
  if (error) {
    // Show error toast
    showError(error);

    // Clear after display
    useConnectionStore.getState().clearError();
  }
}, [error]);
```

### Message Send Failures

```typescript
const handleSendMessage = async (content: string) => {
  try {
    await webrtcManager.sendMessage(content);
  } catch (error) {
    // Message added to store with status: 'failed'
    console.error('Send failed:', error);
  }
};

// Monitor message status
const messages = useMessagesStore(selectMessages);
const failedMessages = messages.filter(m => m.status === 'failed');
```

---

## Debugging Checklist

### Connection Issues

- [ ] Check signaling state: Is WebSocket connected?
- [ ] Check ICE state: Are candidates being generated?
- [ ] Check peer connection state: Is connection established?
- [ ] Verify STUN/TURN server configuration
- [ ] Check network connectivity (WiFi/Cellular)
- [ ] Review console logs for WebRTC errors

### Media Issues

- [ ] Check camera/microphone permissions
- [ ] Verify media constraints (resolution, frame rate)
- [ ] Check if local stream is captured
- [ ] Check if remote stream is received
- [ ] Verify track states (enabled/disabled)
- [ ] Test on different devices

### Message Issues

- [ ] Check if signaling is connected
- [ ] Verify encryption key is available
- [ ] Check message store for stuck messages
- [ ] Verify data channel is open (for video calls)
- [ ] Check WebSocket message routing
- [ ] Review backend logs

---

## Performance Tips

### Optimize Video Quality

```typescript
// Lower resolution for poor networks
const constraints: MediaConstraints = {
  audio: true,
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 15 },
  },
};

await webrtcManager.startVideo(undefined, constraints);
```

### Reduce Bandwidth

```typescript
// Monitor connection quality
const { networkQuality, rtt } = useConnectionStore(selectNetworkStatus);

useEffect(() => {
  if (networkQuality === 'poor') {
    // Suggest lowering video quality
    showQualityWarning();
  }
}, [networkQuality]);
```

### Memory Management

```typescript
// Always cleanup when leaving session
useEffect(() => {
  return () => {
    webrtcManager.endSession();
  };
}, []);
```

---

## Testing Checklist

### Platform Matrix

- [ ] iOS → iOS (same WiFi)
- [ ] iOS → iOS (different networks)
- [ ] iOS → Android
- [ ] iOS → Web browser
- [ ] Android → Android
- [ ] Android → Web browser

### Network Scenarios

- [ ] WiFi (strong signal)
- [ ] WiFi (weak signal)
- [ ] 4G/LTE
- [ ] 5G
- [ ] WiFi → Cellular transition
- [ ] Cellular → WiFi transition
- [ ] Airplane mode → Network on

### Edge Cases

- [ ] Start video immediately (both peers)
- [ ] Rapid connect/disconnect
- [ ] Background app (iOS)
- [ ] Lock screen (iOS/Android)
- [ ] Incoming phone call
- [ ] Low battery mode
- [ ] Device wake from sleep
- [ ] Simultaneous offers (glare)

---

## Common Mistakes to Avoid

### 1. Setting Remote Description Without Checking State

```typescript
// WRONG
await pc.setRemoteDescription(offer);

// RIGHT
const state = pc.getSignalingState();
if (state === 'stable' || state === 'have-local-offer') {
  await pc.setRemoteDescription(offer);
}
```

### 2. Not Queueing ICE Candidates

```typescript
// WRONG
await pc.addIceCandidate(candidate);

// RIGHT
if (!pc.remoteDescription) {
  pendingIceCandidates.push(candidate);
} else {
  await pc.addIceCandidate(candidate);
}
```

### 3. Closing Entire Connection When Stopping Video

```typescript
// WRONG
pc.close(); // Kills text chat too

// RIGHT
closeVideoOnly(); // Keeps signaling alive
```

### 4. Not Handling Reconnection

```typescript
// WRONG
ws.onclose = () => { /* do nothing */ };

// RIGHT
ws.onclose = (event) => {
  if (event.code !== 1000) {
    scheduleReconnect();
  }
};
```

### 5. Ignoring Duplicate Messages

```typescript
// WRONG
addReceivedMessage(message);

// RIGHT
if (!messages.find(m => m.id === message.id)) {
  addReceivedMessage(message);
}
```

---

## Key Files Reference

| Component | File Path | Key Exports |
|-----------|-----------|-------------|
| Manager | `/mobile/v2/src/webrtc/manager.ts` | `WebRTCManager`, `webrtcManager` |
| Connection | `/mobile/v2/src/webrtc/connection.ts` | `PeerConnection` |
| Signaling | `/mobile/v2/src/webrtc/signaling.ts` | `SignalingClient`, `signalingClient` |
| Types | `/mobile/v2/src/webrtc/types.ts` | All WebRTC types, `DEFAULT_MEDIA_CONSTRAINTS` |
| Connection Store | `/mobile/v2/src/state/stores/connectionStore.ts` | `useConnectionStore` |
| Session Store | `/mobile/v2/src/state/stores/sessionStore.ts` | `useSessionStore` |
| Messages Store | `/mobile/v2/src/state/stores/messagesStore.ts` | `useMessagesStore` |

---

## Environment Variables

```bash
# STUN servers (comma-separated)
EXPO_PUBLIC_WEBRTC_STUN_URLS=stun:stun.l.google.com:19302

# TURN servers (comma-separated)
EXPO_PUBLIC_WEBRTC_TURN_URLS=turn:turn.example.com:3478

# TURN credentials
EXPO_PUBLIC_WEBRTC_TURN_USER=username
EXPO_PUBLIC_WEBRTC_TURN_PASSWORD=password
```

---

## Mobile-Specific Considerations

### iOS Safari Quirks

1. **getUserMedia requires HTTPS** (except localhost)
2. **Background video stops** when app enters background
3. **No H.264 baseline** on older devices
4. **Limited WebRTC API** compared to desktop Safari

### Android Chrome/WebView

1. **Battery optimization** may suspend connections
2. **Permissions model** differs from iOS
3. **Better codec support** (VP8, VP9, H.264)
4. **Foreground service** recommended for calls

### Cross-Platform Tips

1. **Always use VP8** for maximum compatibility
2. **Test codec negotiation** with different platforms
3. **Handle permission dialogs** gracefully
4. **Provide fallback UI** for unsupported features
