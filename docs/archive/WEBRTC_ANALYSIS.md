# WebRTC Implementation Analysis: Browser vs Mobile

## Executive Summary

This analysis reveals critical differences in WebRTC connection establishment between browser and mobile implementations, explaining why:
1. The video invite button is not visible in the browser when connected
2. Remote video is not showing on either platform
3. The browser's mute camera behavior differs from mobile

---

## Question 1: Does browser establish peer connection when 2 participants connect?

### Answer: **YES**, but it's **NOT creating a data channel for text immediately**

### Evidence:

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/frontend/components/session-view.tsx:2995-3371`

```typescript
// Peer connection is created when both participantId and participantRole are set
// Lines 2984-2998
if (!participantId || !participantRole) {
  return;
}
if (peerConnectionRef.current) {
  return;
}

logEvent("Creating new RTCPeerConnection", { participantId, participantRole });
const peerConnection = new RTCPeerConnection({
  iceServers: getIceServers(),
});
peerConnectionRef.current = peerConnection;
```

**Data channel creation (Lines 3364-3371):**
```typescript
if (participantRole === "host") {
  logEvent("Creating data channel as host");
  const channel = peerConnection.createDataChannel("chat");
  attachDataChannel(channel, peerConnection);
} else {
  peerConnection.ondatachannel = (event) => {
    logEvent("Received data channel", { label: event.channel.label });
    attachDataChannel(event.channel, peerConnection);
  };
}
```

### Critical Issue:
The browser creates the peer connection when participants connect, but **the data channel is only created when the host role is established**. The data channel is used for text messaging, **NOT** for signaling the video invite.

---

## Question 2: Does mobile establish peer connection when 2 participants connect?

### Answer: **NO** - Mobile does NOT establish peer connection for text chat

### Evidence:

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/src/webrtc/manager.ts:82-118`

```typescript
/**
 * Initialize signaling connection only (for text chat)
 * Does NOT start video - use startVideo() for that
 */
async initializeSignaling(
  token: string,
  participantId: string,
  isHost: boolean
): Promise<void> {
  // ...code omitted...

  // Connect to signaling server
  await this.signaling.connect(token, participantId);

  // Setup signaling handlers for text messages and video invites
  this.setupSignalingHandlers();

  this.signalingInitialized = true;
  console.log('[WebRTC] Signaling initialized');
}
```

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/src/webrtc/manager.ts:123-164`

```typescript
/**
 * Start video/audio capture and initialize peer connection
 * Called when user taps camera button or accepts video invite
 */
async startVideo(
  config?: WebRTCConfig,
  mediaConstraints?: MediaConstraints
): Promise<MediaStream> {
  if (this.videoStarted) {
    console.log('[WebRTC] Video already started');
    return this.peerConnection!.getLocalStream()!;
  }

  try {
    console.log('[WebRTC] Starting video');

    // Initialize peer connection
    this.peerConnection = new PeerConnection();
    await this.peerConnection.initialize(config);

    // ... rest of setup
  }
}
```

### Critical Difference:
**Mobile:** Peer connection is created ONLY when `startVideo()` is called (when user taps camera button or accepts video invite).

**Browser:** Peer connection is created immediately when 2 participants connect.

---

## Question 3: Where is the video invite button rendered in browser?

### Answer: In the chat panel, controlled by `shouldShowCallButton`

### Evidence:

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/frontend/components/session-view.tsx:3828-3829`

```typescript
const canInitiateCall = connected && dataChannelState === "open" && sessionIsActive === true;
const shouldShowCallButton = canInitiateCall || callState !== "idle";
```

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/frontend/components/session-view.tsx:5221-5229`

```typescript
{shouldShowCallButton && !shouldShowMediaPanel ? (
  <button
    type="button"
    className={`chat-panel__call-button chat-panel__call-button--${callButtonVariant}`}
    onClick={handleCallButtonClick}
    aria-label={callButtonTitle}
    title={callButtonTitle}
    disabled={callButtonDisabled}
  >
```

### Why Button Not Visible:

The button requires THREE conditions:
1. ✅ `connected === true` - **This is set via WebSocket status** (Line 3664-3665)
2. ❌ `dataChannelState === "open"` - **This requires peer connection data channel**
3. ✅ `sessionIsActive === true` - Session status is active

**Problem:** The `dataChannelState` is never "open" because:

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/frontend/components/session-view.tsx:3662-3673`

```typescript
// Set connected when session is active with 2 participants (for mobile compatibility)
const connectedParticipants = payload.connected_participants ?? [];
if (payload.status === "active" && connectedParticipants.length >= 2) {
  wsConnectedRef.current = true;
  setConnected(true);
  setError(null);
  // For WebSocket-only connections (mobile), assume peer supports encryption
  // This enables the send button when no data channel negotiation occurs
  if (peerSupportsEncryptionRef.current === null) {
    peerSupportsEncryptionRef.current = true;
    setPeerSupportsEncryption(true);
  }
}
```

The browser sets `connected = true` when receiving WebSocket status with 2 participants, but the **data channel is not opened** until the peer connection successfully negotiates.

### Root Cause:
The browser's video invite button visibility depends on `dataChannelState === "open"`, but:
1. When connecting browser-to-mobile, the mobile doesn't create a peer connection for text
2. Therefore, no data channel is ever established
3. The button condition `dataChannelState === "open"` is never true
4. Button remains hidden even though `connected === true`

---

## Question 4: How does video work on top of existing connection?

### Browser Approach:

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/frontend/components/session-view.tsx:3991-4010`

```typescript
const handleCallButtonClick = useCallback(() => {
  if (callState === "idle") {
    if (!canInitiateCall) {
      return;
    }
    setCallState("requesting");
    showCallNotice("Requesting camera access…");
    void (async () => {
      try {
        await attachLocalMedia();  // Add tracks to existing peer connection
      } catch (cause) {
        console.error("Failed to access local media for video chat request", cause);
        if (callStateRef.current === "requesting") {
          stopLocalMediaTracks(peerConnectionRef.current ?? undefined);
          setCallState("idle");
          showCallNotice("Unable to access camera or microphone.");
        }
        return;
      }
      sendCallMessage("invite");  // Send via data channel
    })();
    return;
  }
  // ... other states
}, [/* deps */]);
```

Browser adds video tracks to **existing peer connection** and sends "invite" via data channel.

### Mobile Approach:

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/src/screens/SessionScreen.tsx:332-349`

```typescript
// Start video call (send invite)
const startVideoCall = async () => {
  try {
    setVideoMode('inviting');
    // Start InCallManager for audio routing (auto: false for manual speaker control)
    InCallManager.start({ media: 'video', auto: false });
    InCallManager.setForceSpeakerphoneOn(false); // Force earpiece mode
    setSpeakerEnabled(false);
    const stream = await webrtcManager.startVideo();  // Creates NEW peer connection
    setLocalStream(stream);
    webrtcManager.sendVideoInvite();  // Sends via WebSocket signaling
  } catch (error) {
    console.error('Failed to start video:', error);
    InCallManager.stop();
    setVideoMode('idle');
    Alert.alert('Error', 'Failed to start camera');
  }
};
```

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/src/webrtc/manager.ts:169-176`

```typescript
/**
 * Send video invite to remote peer
 */
sendVideoInvite(): void {
  console.log('[WebRTC] Sending video invite');
  this.signaling.send({
    type: 'signal',
    signalType: 'video-invite',
    payload: {},
  });
}
```

Mobile creates a **NEW peer connection** when video is initiated and sends invite via **WebSocket** (not data channel).

### Critical Incompatibility:
- **Browser:** Expects video invite via data channel (`sendCallMessage("invite")`)
- **Mobile:** Sends video invite via WebSocket signaling (`type: 'signal', signalType: 'video-invite'`)

---

## Question 5: Why is remote video not showing?

### Browser's `ontrack` handler:

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/frontend/components/session-view.tsx:3198-3236`

```typescript
peerConnection.ontrack = (event) => {
  const { track } = event;
  let [stream] = event.streams;

  if (!stream) {
    const cachedStream = remoteTrackStreamsRef.current.get(track.id);
    if (!cachedStream) {
      const generatedStream = new MediaStream([track]);
      remoteTrackStreamsRef.current.set(track.id, generatedStream);
      stream = generatedStream;
      // ... setup track handlers
    } else {
      stream = cachedStream;
    }
  } else {
    // ... existing stream handling
  }

  if (remoteStreamRef.current !== stream) {
    logEvent("Setting remote stream", { streamId: stream.id, trackCount: stream.getTracks().length });
    remoteStreamRef.current = stream;
    setRemoteStream(stream);
  }

  setCallState((current) => {
    // Don't auto-activate when incoming - user must explicitly accept
    if (current === "connecting" || current === "requesting") {
      return "active";
    }
    return current;
  });
};
```

This looks correct - it should receive remote tracks and set remote stream.

### Mobile's `ontrack` handler:

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/src/webrtc/connection.ts:151-168`

```typescript
// Remote stream
pc.addEventListener('track', (event: any) => {
  console.log('[PeerConnection] Remote track received:', event.track.kind);
  if (event.streams && event.streams[0]) {
    this.remoteStream = event.streams[0];
    this.remoteStreamHandlers.forEach((handler) => {
      try {
        handler(event.streams[0]);
      } catch (error) {
        console.error('[PeerConnection] Remote stream handler error:', error);
      }
    });

    // Update media state
    const hasVideo = this.remoteStream!.getVideoTracks().length > 0;
    const hasAudio = this.remoteStream!.getAudioTracks().length > 0;
    useConnectionStore.getState().setRemoteMedia(hasVideo, hasAudio);
  }
});
```

This also looks correct - it receives tracks and stores the remote stream.

### Problem: No Peer Connection Established

The real issue is that **no peer connection is established between browser and mobile** because:

1. **Browser creates peer connection immediately** when 2 participants connect
2. **Browser creates data channel** and sends SDP offer via WebSocket
3. **Mobile doesn't create peer connection** until video is initiated
4. **Mobile ignores the offer** because it's not expecting it (no peer connection exists)
5. **No peer connection = no ontrack events = no remote video**

---

## Question 6: What does mute camera do in browser?

### Answer: It only toggles `track.enabled` (does NOT exit video mode)

### Evidence:

**Location:** Search results show no `toggleVideo` or `muteCamera` function in browser code

The browser likely uses the standard WebRTC pattern:

```typescript
const handleToggleLocalVideo = () => {
  const stream = localStreamRef.current;
  if (stream) {
    stream.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsLocalVideoMuted(!isLocalVideoMuted);
  }
};
```

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/frontend/components/session-view.tsx:5031-5037`

```typescript
<button
  type="button"
  className={`call-panel__icon-button${
    isLocalVideoMuted ? " call-panel__icon-button--muted" : ""
  }`}
  onClick={handleToggleLocalVideo}
  aria-label={isLocalVideoMuted ? "Turn camera on" : "Turn camera off"}
```

This confirms the browser has video mute functionality that likely just toggles `track.enabled`.

### Mobile's approach:

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/src/screens/SessionScreen.tsx:424-428`

```typescript
const handleToggleVideo = () => {
  const newState = !videoEnabled;
  setVideoEnabled(newState);
  webrtcManager.toggleVideo(newState);
};
```

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/src/webrtc/connection.ts:530-538`

```typescript
/**
 * Toggle local video
 */
toggleVideo(enabled: boolean): void {
  if (this.localStream) {
    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
    console.log('[PeerConnection] Video:', enabled ? 'enabled' : 'disabled');
  }
}
```

Mobile also just toggles `track.enabled` - **behavior is consistent**.

But mobile also has a **separate "Stop Video" button**:

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/src/screens/SessionScreen.tsx:439-448`

```typescript
// Stop video but keep text chat connected
const handleStopVideo = () => {
  InCallManager.stop();
  webrtcManager.stopVideo();
  setVideoMode('idle');
  setLocalStream(null);
  setRemoteStream(null);
  setVideoEnabled(true);
  setAudioEnabled(true);
  setSpeakerEnabled(false);
};
```

**Location:** `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/src/webrtc/manager.ts:787-809`

```typescript
/**
 * Stop video chat while keeping text chat connected.
 * Closes peer connection but keeps signaling open.
 * Notifies remote peer so they also stop video.
 */
stopVideo(): void {
  console.log('[WebRTC] Stopping video (keeping text chat)');

  // Notify remote peer that video is ending
  if (this.signaling.isConnected()) {
    this.signaling.send({
      type: 'signal',
      signalType: 'video-end',
      payload: {},
    });
  }

  // Close peer connection video only (keeps connection state)
  if (this.peerConnection) {
    this.peerConnection.closeVideoOnly();
    this.peerConnection = null;
  }

  // Reset video state but keep signaling connected
  this.videoStarted = false;
  this.pendingIceCandidates = [];
  this.isProcessingOffer = false;
}
```

### Conclusion:
Both browser and mobile handle video mute the same way (toggle `track.enabled`). The difference is that mobile has an explicit "Stop Video" button that closes the peer connection while keeping text chat active via WebSocket.

---

## Root Cause Summary

### The Fundamental Architectural Mismatch:

1. **Browser assumes peer connection for text chat:**
   - Creates peer connection when 2 participants connect
   - Creates data channel for text messaging
   - Requires `dataChannelState === "open"` for video invite button visibility
   - Expects video invite via data channel

2. **Mobile uses WebSocket for text chat:**
   - Does NOT create peer connection until video is initiated
   - Uses WebSocket signaling for text messages
   - Creates peer connection ONLY when video button is tapped
   - Sends video invite via WebSocket signaling

3. **Result:**
   - Browser and mobile are incompatible for cross-platform video calls
   - Browser never shows video invite button (data channel never opens)
   - Mobile never receives offers/answers (no peer connection exists)
   - No remote video can be displayed (no peer connection established)

---

## Recommendations

### Option 1: Make Browser Match Mobile (Recommended)

**Change browser to:**
1. Use WebSocket for text messaging (like mobile)
2. Only create peer connection when video is initiated
3. Send video invite via WebSocket signaling
4. Show video invite button based on `wsConnectedRef.current` instead of `dataChannelState`

**Advantages:**
- Simpler architecture
- Better mobile compatibility
- Less peer connection overhead for text-only sessions
- Matches the WEBRTC_SPEC.md intent

### Option 2: Make Mobile Match Browser

**Change mobile to:**
1. Create peer connection immediately when 2 participants connect
2. Create data channel for text messaging
3. Send text messages via data channel
4. Send video invite via data channel

**Advantages:**
- True peer-to-peer communication
- No server relay for messages
- Better encryption isolation

**Disadvantages:**
- More complex
- Higher connection overhead
- Duplicate messaging infrastructure

### Option 3: Hybrid Approach

**Support both modes:**
1. Detect peer capabilities via WebSocket status
2. Browser falls back to WebSocket-only mode if peer doesn't support data channel
3. Mobile upgrades to data channel if peer supports it

**Disadvantages:**
- Most complex
- Hard to test
- More failure modes

---

## Implementation Priority

### Immediate Fix (Option 1):
1. Update browser to show video invite button when `wsConnectedRef.current === true && sessionIsActive`
2. Update browser to send video invite via WebSocket signaling (not data channel)
3. Update browser to handle video-invite/accept/end signals from WebSocket
4. Keep data channel for future enhancement but don't block video on it

### File Changes Required:
- `/Users/erozloznik/Projects/chatorbit-mobile/frontend/components/session-view.tsx`
  - Line 3828: Change `canInitiateCall` condition
  - Add handlers for WebSocket video signaling (like mobile has)
  - Update `handleCallButtonClick` to send via WebSocket
