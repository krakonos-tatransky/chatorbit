# WebRTC Mobile Implementation Analysis

## Executive Summary

The ChatOrbit mobile app (v2) implements a robust, production-grade WebRTC architecture that prioritizes **chat-first communication** with **optional video**. This paradigm separates signaling (for text chat) from peer connections (for video/audio), allowing users to maintain text communication independently of video streams.

**Key Innovation**: Video is treated as an optional overlay on top of text chat, not a prerequisite. Users can start/stop video while keeping the text channel alive.

---

## Architecture Overview

### Three-Layer Design

```
┌─────────────────────────────────────────────────────┐
│                  WebRTC Manager                     │
│  - Orchestrates signaling + peer connection         │
│  - Handles chat-first flow: text → optional video   │
│  - Manages lifecycle and state transitions          │
└──────────────┬──────────────────────────┬───────────┘
               │                          │
      ┌────────▼────────┐        ┌────────▼─────────┐
      │ Signaling Client │        │ Peer Connection  │
      │ (WebSocket)      │        │ (RTCPeerConn)    │
      └──────────────────┘        └──────────────────┘
```

**Layer 1: WebRTC Manager** (`/mobile/v2/src/webrtc/manager.ts`)
- High-level orchestration
- Lifecycle management
- Message routing
- Role determination (host/guest)

**Layer 2: Signaling Client** (`/mobile/v2/src/webrtc/signaling.ts`)
- WebSocket connection to backend
- Message serialization/deserialization
- Automatic reconnection with exponential backoff
- Message queuing during disconnection

**Layer 3: Peer Connection** (`/mobile/v2/src/webrtc/connection.ts`)
- RTCPeerConnection wrapper
- Media stream management
- ICE candidate handling
- Data channel setup

---

## 1. Connection Establishment Flow

### Chat-First Initialization

The v2 paradigm separates signaling from video:

```typescript
// Step 1: Initialize signaling ONLY (for text chat)
await webrtcManager.initializeSignaling(token, participantId, isHost);

// Step 2: (Later) User taps camera button to start video
const localStream = await webrtcManager.startVideo();
```

**Implementation Details** (`manager.ts`, lines 60-98):

```typescript
async initializeSignaling(
  token: string,
  participantId: string,
  isHost: boolean
): Promise<void> {
  // Guard against multiple initializations
  if (this.signalingInitialized && this.signaling.isConnected()) {
    console.log('[WebRTC] Signaling already initialized, skipping');
    return;
  }

  // Clear previous session's messages
  useMessagesStore.getState().clearMessages();

  this.token = token;
  this.participantId = participantId;
  this.isInitiator = isHost;
  this.pendingIceCandidates = [];
  this.isProcessingOffer = false;

  // Connect to signaling server
  await this.signaling.connect(token, participantId);

  // Setup signaling handlers for text messages and video invites
  this.setupSignalingHandlers();

  this.signalingInitialized = true;
}
```

**Key Guards**:
- `signalingInitialized` flag prevents duplicate initialization
- `clearMessages()` ensures clean state for new session
- `pendingIceCandidates` array reset prevents stale candidates

### Video Initialization (On-Demand)

**Implementation** (`manager.ts`, lines 104-144):

```typescript
async startVideo(
  config?: WebRTCConfig,
  mediaConstraints?: MediaConstraints
): Promise<MediaStream> {
  if (this.videoStarted) {
    console.log('[WebRTC] Video already started');
    return this.peerConnection!.getLocalStream()!;
  }

  // Initialize peer connection
  this.peerConnection = new PeerConnection();
  await this.peerConnection.initialize(config);

  // Setup ICE candidate handler with queuing
  this.peerConnection.onIceCandidate((candidate) => {
    this.sendIceCandidate(candidate.toJSON());
  });

  // Setup remote stream handler
  this.peerConnection.onRemoteStream((stream) => {
    console.log('[WebRTC] Remote stream received');
  });

  // Setup data channel handlers
  this.setupDataChannelHandlers();

  // Add local media stream
  const localStream = await this.peerConnection.addLocalStream(mediaConstraints);

  this.videoStarted = true;
  return localStream;
}
```

---

## 2. ICE Candidate Handling

### Candidate Queuing Strategy

The implementation uses **two-level queuing** to handle timing issues:

**Level 1: Signaling Queue** (`manager.ts`, lines 160-179):

```typescript
private sendIceCandidate(candidateData: RTCIceCandidateInit): void {
  // Queue if signaling not ready
  if (!this.signaling.isConnected()) {
    console.log('[WebRTC] Queuing ICE candidate (signaling not ready)');
    this.pendingIceCandidates.push(candidateData);
    return;
  }

  try {
    this.signaling.send({
      type: 'signal',
      signalType: 'ice-candidate',
      payload: candidateData,
    });
  } catch (error) {
    console.log('[WebRTC] Failed to send ICE candidate, queuing:', error);
    this.pendingIceCandidates.push(candidateData);
  }
}
```

**Level 2: Remote Description Queue** (`connection.ts`, lines 384-406):

```typescript
async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
  if (!this.pc) {
    throw new WebRTCError(
      WebRTCErrorCode.INVALID_STATE,
      'Peer connection not initialized'
    );
  }

  // If remote description not set yet, queue the candidate
  if (!this.pc.remoteDescription) {
    console.log('[WebRTC] Queuing ICE candidate (no remote description yet)');
    this.pendingIceCandidates.push(candidate as RTCIceCandidate);
    return;
  }

  console.log('[WebRTC] Adding ICE candidate');
  await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
}
```

**Flushing Mechanism** (`manager.ts`, lines 184-195):

```typescript
private flushPendingIceCandidates(): void {
  if (this.pendingIceCandidates.length === 0) return;

  console.log(`[WebRTC] Flushing ${this.pendingIceCandidates.length} pending ICE candidates`);

  const candidates = [...this.pendingIceCandidates];
  this.pendingIceCandidates = [];

  candidates.forEach((candidate) => {
    this.sendIceCandidate(candidate);
  });
}
```

**Flush Triggers**:
1. After `setRemoteDescription` completes (offer processing, line 597)
2. After `setRemoteDescription` completes (answer processing, line 625)
3. After peer connection is stable

---

## 3. Data Channel Setup

### Data Channel Creation

**Name**: `"chat"` (default parameter in `connection.ts`, line 217)

**Options** (`connection.ts`, lines 217-230):

```typescript
createDataChannel(label: string = 'chat'): void {
  if (!this.pc) {
    throw new WebRTCError(
      WebRTCErrorCode.INVALID_STATE,
      'Peer connection not initialized'
    );
  }

  console.log('[PeerConnection] Creating data channel:', label);
  this.dataChannel = this.pc.createDataChannel(label, {
    ordered: true,  // CRITICAL: Ensures in-order delivery
  }) as any;

  this.setupDataChannel();
}
```

**Configuration Details**:
- **ordered: true** - Messages arrive in the order they were sent
- No explicit reliability settings (defaults to reliable)
- No negotiation required (created by initiator before offer)

### Data Channel Event Handlers

**Setup** (`connection.ts`, lines 181-212):

```typescript
private setupDataChannel(): void {
  if (!this.dataChannel) return;

  this.dataChannel.onopen = () => {
    console.log('[PeerConnection] Data channel open');
  };

  this.dataChannel.onclose = () => {
    console.log('[PeerConnection] Data channel closed');
  };

  this.dataChannel.onerror = (error) => {
    console.error('[PeerConnection] Data channel error:', error);
  };

  this.dataChannel.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as DataChannelMessage;
      console.log('[PeerConnection] Data channel message:', message.type);

      this.dataChannelHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('[PeerConnection] Data channel handler error:', error);
        }
      });
    } catch (error) {
      console.error('[PeerConnection] Failed to parse data channel message:', error);
    }
  };
}
```

### Data Channel Message Types

**Type Definition** (`types.ts`, lines 197-223):

```typescript
export type DataChannelMessageType = 'message' | 'typing' | 'ack';

export interface DataChannelMessage {
  type: DataChannelMessageType;
  payload: string;
  messageId: string;
  timestamp: number;
}
```

**Handler Registration** (`manager.ts`, lines 499-530):

```typescript
private setupDataChannelHandlers(): void {
  if (!this.peerConnection) return;

  this.peerConnection.onDataChannelMessage(async (message: DataChannelMessage) => {
    try {
      switch (message.type) {
        case 'message':
          // Decrypt and add to messages store
          if (this.token) {
            await decryptAndAddMessage(
              this.token,
              message.payload,
              message.messageId,
              message.timestamp
            );
          }
          break;

        case 'ack':
          // Mark message as sent
          useMessagesStore.getState().markMessageSent(message.messageId);
          break;

        case 'typing':
          // Handle typing indicator (future enhancement)
          break;
      }
    } catch (error) {
      console.error('[WebRTC] Failed to handle data channel message:', error);
    }
  });
}
```

---

## 4. Signaling State Management

### Critical State Checks

The implementation includes **defensive signaling state checks** before operations to prevent mobile disconnections.

**Offer Processing** (`manager.ts`, lines 563-580):

```typescript
// Check signaling state - only process offer if in appropriate state
const signalingState = this.peerConnection.getSignalingState();
if (signalingState && signalingState !== 'stable' && signalingState !== 'have-local-offer') {
  console.log(`[WebRTC] Ignoring offer in signaling state: ${signalingState}`);
  return;
}

// Handle "glare" (offer collision) - if we already sent an offer, decide who wins
if (signalingState === 'have-local-offer') {
  // "Polite peer" pattern: guest backs off, host wins
  if (!this.isInitiator) {
    console.log('[WebRTC] Offer collision - backing off as guest (polite peer)');
    // We'll just process the incoming offer since we're the polite peer
    // The remote offer takes precedence
  } else {
    console.log('[WebRTC] Offer collision - ignoring as host (impolite peer)');
    return;
  }
}
```

**Answer Processing** (`manager.ts`, lines 615-619):

```typescript
// Check signaling state - only process answer if we're expecting one
const signalingState = this.peerConnection.getSignalingState();
if (signalingState && signalingState !== 'have-local-offer') {
  console.log(`[WebRTC] Ignoring answer in signaling state: ${signalingState}`);
  return;
}
```

### Signaling State Machine

```
┌─────────┐
│  stable │ ◄────────────────────┐
└────┬────┘                      │
     │                           │
     │ createOffer()             │
     │                           │
     ▼                           │
┌──────────────────┐             │
│ have-local-offer │             │
└────┬─────────────┘             │
     │                           │
     │ setRemoteDescription()    │
     │ (answer)                  │
     │                           │
     └───────────────────────────┘
```

**Getter Method** (`connection.ts`, lines 479-482):

```typescript
getSignalingState(): RTCSignalingState | null {
  return this.pc?.signalingState || null;
}
```

---

## 5. Reconnection and Recovery Logic

### WebSocket Reconnection

**Exponential Backoff Strategy** (`signaling.ts`, lines 100-120):

```typescript
private scheduleReconnect(): void {
  if (this.reconnectTimer) {
    clearTimeout(this.reconnectTimer);
  }

  this.reconnectAttempts++;
  const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

  console.log(
    `[Signaling] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
  );

  this.reconnectTimer = setTimeout(() => {
    if (this.token && this.participantId) {
      this.connect(this.token, this.participantId).catch((error) => {
        console.error('[Signaling] Reconnection failed:', error);
      });
    }
  }, delay);
}
```

**Configuration**:
- **maxReconnectAttempts**: 5 (line 27)
- **reconnectDelay**: 1000ms (line 28)
- **Backoff**: 1s, 2s, 4s, 8s, 16s

**Reconnection Trigger** (`signaling.ts`, lines 79-87):

```typescript
this.ws.onclose = (event) => {
  console.log('[Signaling] Disconnected:', event.code, event.reason);
  useConnectionStore.getState().setSignalingState('disconnected');

  // Attempt reconnection if not a normal closure
  if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
    this.scheduleReconnect();
  }
};
```

### Stuck Message Resolution

**Problem**: Messages sent while signaling was temporarily disconnected get stuck in "sending" state.

**Solution** (`signaling.ts`, lines 51-56):

```typescript
this.ws.onopen = () => {
  console.log('[Signaling] Connected');
  useConnectionStore.getState().setSignalingState('connected');

  // If this is a reconnection, resolve any stuck "sending" messages
  if (this.reconnectAttempts > 0) {
    console.log('[Signaling] Reconnected - resolving stuck messages');
    useMessagesStore.getState().resolveStuckMessages();
  }

  this.reconnectAttempts = 0;
  this.reconnectDelay = 1000;
  resolve();
};
```

**Implementation** (`messagesStore.ts`, lines 196-208):

```typescript
resolveStuckMessages: () => {
  const state = get();
  const stuckMessages = state.messages.filter((msg) => msg.status === 'sending');

  if (stuckMessages.length > 0) {
    console.log(`[MessagesStore] Resolving ${stuckMessages.length} stuck messages`);
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.status === 'sending' ? { ...msg, status: 'sent' as MessageStatus } : msg
      ),
    }));
  }
}
```

### Peer Connection Recovery

**ICE Connection State Monitoring** (`connection.ts`, lines 133-139):

```typescript
pc.addEventListener('iceconnectionstatechange', () => {
  const state = this.pc?.iceConnectionState;
  console.log('[PeerConnection] ICE connection state:', state);
  if (state) {
    useConnectionStore.getState().setIceConnectionState(state as any);
  }
});
```

**State Mapping** (`connectionStore.ts`, lines 182-193):

```typescript
setIceConnectionState: (iceConnectionState) => {
  set({ iceConnectionState });

  // Auto-update overall connection state based on ICE state
  if (iceConnectionState === 'connected' || iceConnectionState === 'completed') {
    set({ connectionState: 'connected' });
  } else if (iceConnectionState === 'checking') {
    set({ connectionState: 'connecting' });
  } else if (iceConnectionState === 'failed') {
    set({ connectionState: 'failed' });
  } else if (iceConnectionState === 'disconnected') {
    set({ connectionState: 'reconnecting' });
  }
}
```

---

## 6. Role Determination (Polite/Impolite Peer)

### Perfect Negotiation Pattern

The implementation uses the **"perfect negotiation" pattern** with role-based collision resolution.

**Role Assignment** (`manager.ts`, lines 82-83):

```typescript
this.isInitiator = isHost;
```

- **Host** = Initiator = **Impolite Peer** (wins collisions)
- **Guest** = Responder = **Polite Peer** (backs off during collisions)

### Offer Collision Handling

**Implementation** (`manager.ts`, lines 569-580):

```typescript
// Handle "glare" (offer collision) - if we already sent an offer, decide who wins
if (signalingState === 'have-local-offer') {
  // "Polite peer" pattern: guest backs off, host wins
  if (!this.isInitiator) {
    console.log('[WebRTC] Offer collision - backing off as guest (polite peer)');
    // We'll just process the incoming offer since we're the polite peer
    // The remote offer takes precedence
  } else {
    console.log('[WebRTC] Offer collision - ignoring as host (impolite peer)');
    return;
  }
}
```

**Collision Resolution Logic**:

```
┌────────────────────────────────────────────────────────┐
│ Scenario: Both peers send offers simultaneously       │
└────────────────────────────────────────────────────────┘

Host (Impolite):
  - Receives remote offer while in "have-local-offer"
  - Ignores remote offer
  - Waits for guest to process host's offer
  - Receives answer from guest
  - Connection established

Guest (Polite):
  - Receives remote offer while in "have-local-offer"
  - Discards own pending offer
  - Processes remote offer
  - Sends answer
  - Connection established
```

### Who Creates Offer?

**Video Invite Flow** (`manager.ts`, lines 200-220):

```typescript
async acceptVideoInvite(): Promise<void> {
  console.log('[WebRTC] Accepting video invite');

  // Send accept message
  this.signaling.send({
    type: 'signal',
    signalType: 'video-accept',
    payload: {},
  });

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
}
```

**Rule**: The peer who **accepts** the video invite creates the offer.

**Rationale**: This ensures the accepting peer (who just started their media streams) sends a complete offer that includes their media tracks.

---

## 7. Mobile-Specific Optimizations

### Media Constraints

**Default Constraints** (`types.ts`, lines 152-164):

```typescript
export const DEFAULT_MEDIA_CONSTRAINTS: MediaConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    facingMode: 'user',
  },
};
```

**Audio Processing**:
- **echoCancellation**: Prevents audio feedback on mobile speakers
- **noiseSuppression**: Filters background noise
- **autoGainControl**: Normalizes volume levels

**Video Settings**:
- **720p resolution** (1280x720) - Balance between quality and bandwidth
- **30 fps** - Standard mobile video frame rate
- **facingMode: 'user'** - Front-facing camera by default

### ICE Configuration

**Mobile ICE Pool Size** (`connection.ts`, line 66):

```typescript
this.pc = new RTCPeerConnection({
  iceServers,
  iceCandidatePoolSize: 10,  // Pre-gather candidates
});
```

**iceCandidatePoolSize**: Pre-gathers up to 10 ICE candidates before offer/answer exchange, reducing connection time on mobile networks.

### Video-Only Close (Seamless Stop)

**Critical Feature** (`connection.ts`, lines 509-544):

```typescript
/**
 * Close video/audio only (keep signaling connected)
 * Used when stopping video call but keeping text chat active
 */
closeVideoOnly(): void {
  console.log('[PeerConnection] Closing video only (keeping connection state)');

  // Close data channel
  if (this.dataChannel) {
    this.dataChannel.close();
    this.dataChannel = null;
  }

  // Stop local stream
  if (this.localStream) {
    this.localStream.getTracks().forEach((track) => track.stop());
    this.localStream = null;
  }

  // Close peer connection
  if (this.pc) {
    this.pc.close();
    this.pc = null;
  }

  // Clear handlers
  this.dataChannelHandlers.clear();
  this.remoteStreamHandlers.clear();
  this.iceCandidateHandlers.clear();
  this.pendingIceCandidates = [];

  // Reset media state only (NOT connection state)
  useConnectionStore.getState().setLocalMedia(false, false);
  useConnectionStore.getState().setRemoteMedia(false, false);
  useConnectionStore.getState().setPeerConnectionState('closed');
  useConnectionStore.getState().setIceConnectionState('closed');
}
```

**Key Difference from `close()`**:
- **`closeVideoOnly()`**: Resets media state but keeps signaling connection
- **`close()`**: Calls `resetConnection()` which clears entire connection state

**Manager Integration** (`manager.ts`, lines 741-763):

```typescript
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

### Duplicate Offer Prevention

**Concurrent Processing Guard** (`manager.ts`, lines 537-540):

```typescript
// Prevent processing duplicate offers concurrently
if (this.isProcessingOffer) {
  console.log('[WebRTC] Already processing an offer, ignoring duplicate');
  return;
}
```

**Why Critical on Mobile**:
- Mobile network transitions (WiFi → Cellular) can trigger duplicate signaling messages
- Race conditions during network changes could cause state corruption
- Guard ensures atomic offer processing

---

## 8. State Management Integration

### Connection Store

**Tracked States** (`connectionStore.ts`, lines 60-85):

```typescript
interface ConnectionStoreState {
  // Overall state
  connectionState: ConnectionState;

  // WebSocket signaling
  signalingState: SignalingState;
  signalingError: string | null;

  // WebRTC states
  iceConnectionState: IceConnectionState;
  peerConnectionState: PeerConnectionState;

  // Network quality
  networkQuality: NetworkQuality;
  rtt: number | null;

  // Media tracks
  hasLocalVideo: boolean;
  hasLocalAudio: boolean;
  hasRemoteVideo: boolean;
  hasRemoteAudio: boolean;

  // Error state
  error: string | null;
  lastError: string | null;
}
```

**State Updates from WebRTC Layer**:

1. **Signaling State** (`signaling.ts`, line 43):
   ```typescript
   useConnectionStore.getState().setSignalingState('connecting');
   ```

2. **ICE State** (`connection.ts`, line 137):
   ```typescript
   useConnectionStore.getState().setIceConnectionState(state as any);
   ```

3. **Media State** (`connection.ts`, lines 260-261):
   ```typescript
   useConnectionStore.getState().setLocalMedia(hasVideo, hasAudio);
   ```

### Session Store

**Session Data** (`sessionStore.ts`, lines 22-38):

```typescript
interface SessionState {
  // Session data
  token: string | null;
  participantId: string | null;
  role: ParticipantRole | null;
  status: SessionStatus | null;
  messageCharLimit: number;

  // Timing
  sessionStartedAt: Date | null;
  sessionExpiresAt: Date | null;
  remainingSeconds: number | null;

  // Loading & error state
  isJoining: boolean;
  isLoading: boolean;
  error: string | null;
}
```

**Status Updates from Signaling** (`manager.ts`, lines 400-436):

```typescript
private handleStatusUpdate(message: StatusMessage): void {
  const participantCount = Array.isArray(message.connected_participants)
    ? message.connected_participants.length
    : 0;

  const isSessionActive = message.status === 'active';
  const connectionStore = useConnectionStore.getState();

  // Update connection state based on session status and participant count
  if (isSessionActive && participantCount >= 2) {
    console.log('[WebRTC] Session is active with 2 participants - connected');
    connectionStore.setConnectionState('connected');
  } else if (isSessionActive && participantCount === 1) {
    console.log('[WebRTC] Session active but waiting for peer');
    connectionStore.setConnectionState('connecting');
  }

  // Update session store if session became active
  if (isSessionActive && this.token) {
    const sessionStore = useSessionStore.getState();
    if (sessionStore.status !== 'active') {
      sessionStore.updateSessionStatus(this.token).catch((error) => {
        console.error('[WebRTC] Failed to update session status:', error);
      });
    }
  }
}
```

### Messages Store

**Message Flow**:

1. **Sending** (`messagesStore.ts`, lines 136-172):
   ```typescript
   sendMessage: async (token, content) => {
     // Encrypt message
     const encrypted = await encryptMessage(token, content);

     // Add to local store as "sending"
     const newMessage: Message = {
       id: encrypted.messageId,
       content,
       timestamp: encrypted.timestamp,
       type: 'sent',
       status: 'sending',
     };

     set((state) => ({
       messages: [...state.messages, newMessage].sort(
         (a, b) => a.timestamp - b.timestamp
       ),
     }));

     // Return encrypted message for WebRTC sending
     return encrypted;
   }
   ```

2. **Receiving** (`messagesStore.ts`, lines 110-134):
   ```typescript
   addReceivedMessage: (decrypted) => {
     // Check for duplicate message
     const existingMessage = state.messages.find((msg) => msg.id === decrypted.messageId);
     if (existingMessage) {
       console.log('[MessagesStore] Ignoring duplicate/own message');
       return;
     }

     const newMessage: Message = {
       id: decrypted.messageId,
       content: decrypted.content,
       timestamp: decrypted.timestamp,
       type: 'received',
       status: 'received',
     };

     set((state) => ({
       messages: [...state.messages, newMessage].sort(
         (a, b) => a.timestamp - b.timestamp
       ),
     }));
   }
   ```

**Duplicate Prevention**:
- Messages are keyed by `messageId`
- Store checks for existing messages before adding
- Prevents echoes from data channel acknowledgments

---

## 9. Message Routing (Dual Path)

### Primary Path: Data Channel

**Send** (`manager.ts`, lines 685-699):

```typescript
// If we have a data channel open, use it
if (this.peerConnection) {
  try {
    const message: DataChannelMessage = {
      type: 'message',
      payload: encrypted.payload,
      messageId: encrypted.messageId,
      timestamp: encrypted.timestamp,
    };

    this.peerConnection.sendMessage(message);
    console.log('[WebRTC] Message sent via data channel');
    return;
  } catch (error) {
    console.log('[WebRTC] Data channel failed, falling back to signaling');
  }
}
```

**Receive** (`manager.ts`, lines 505-515):

```typescript
case 'message':
  // Decrypt and add to messages store
  if (this.token) {
    await decryptAndAddMessage(
      this.token,
      message.payload,
      message.messageId,
      message.timestamp
    );
  }
  break;
```

### Fallback Path: WebSocket Signaling

**Send** (`manager.ts`, lines 702-715):

```typescript
// Fallback to signaling - backend expects type: "signal" with signalType
this.signaling.send({
  type: 'signal',
  signalType: 'message',
  payload: {
    payload: encrypted.payload,
    messageId: encrypted.messageId,
    timestamp: encrypted.timestamp,
  },
});
console.log('[WebRTC] Message sent via signaling');

// Mark message as sent (no ack from signaling, so mark immediately)
useMessagesStore.getState().markMessageSent(encrypted.messageId);
```

**Receive** (`manager.ts`, lines 449-459):

```typescript
case 'message':
  // Handle chat message wrapped in signal
  if (this.token && payload) {
    await decryptAndAddMessage(
      this.token,
      payload.payload,
      payload.messageId,
      payload.timestamp
    );
  }
  break;
```

**Routing Decision Tree**:

```
Send Message
    │
    ├─ Peer connection exists AND data channel open?
    │    └─ YES → Send via data channel → Wait for ACK
    │
    └─ NO → Send via WebSocket signaling → Mark sent immediately
```

---

## 10. Error Handling and Recovery

### Error Type System

**Custom Error Class** (`types.ts`, lines 183-192):

```typescript
export class WebRTCError extends Error {
  constructor(
    public code: WebRTCErrorCode,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'WebRTCError';
  }
}
```

**Error Codes** (`types.ts`, lines 169-178):

```typescript
export enum WebRTCErrorCode {
  SIGNALING_CONNECTION_FAILED = 'SIGNALING_CONNECTION_FAILED',
  SIGNALING_DISCONNECTED = 'SIGNALING_DISCONNECTED',
  PEER_CONNECTION_FAILED = 'PEER_CONNECTION_FAILED',
  MEDIA_PERMISSION_DENIED = 'MEDIA_PERMISSION_DENIED',
  MEDIA_DEVICE_ERROR = 'MEDIA_DEVICE_ERROR',
  DATA_CHANNEL_ERROR = 'DATA_CHANNEL_ERROR',
  SEND_MESSAGE_FAILED = 'SEND_MESSAGE_FAILED',
  INVALID_STATE = 'INVALID_STATE',
}
```

### Error Recovery Strategies

**Media Permission Denied** (`connection.ts`, lines 264-270):

```typescript
catch (error) {
  console.error('[PeerConnection] Failed to get user media:', error);
  throw new WebRTCError(
    WebRTCErrorCode.MEDIA_PERMISSION_DENIED,
    'Failed to access camera/microphone',
    error as Error
  );
}
```

**ICE Candidate Errors (Non-Fatal)** (`connection.ts`, lines 402-405):

```typescript
catch (error) {
  console.error('[PeerConnection] Failed to add ICE candidate:', error);
  // Don't throw - ICE candidate errors are usually recoverable
}
```

**Data Channel Send Errors** (`connection.ts`, lines 424-430):

```typescript
catch (error) {
  console.error('[PeerConnection] Failed to send message:', error);
  throw new WebRTCError(
    WebRTCErrorCode.SEND_MESSAGE_FAILED,
    'Failed to send message via data channel',
    error as Error
  );
}
```

---

## 11. Comparison with v1 Implementation

### V1 Architecture (Monolithic)

The v1 implementation (`mobile/v1/src/utils/webrtc.ts`) focused on **ICE server configuration** with extensive URL sanitization:

**Features**:
- Advanced ICE server URL validation
- Unroutable host detection (localhost, link-local IPv6, etc.)
- Environment variable parsing for multiple configuration formats
- STUN/TURN fallback logic

**Missing**:
- No peer connection management
- No signaling client
- No state management
- Configuration-only utility

### V2 Architecture (Layered)

The v2 implementation provides **complete WebRTC orchestration**:

**Improvements**:
1. **Separation of Concerns**: Signaling, peer connection, and manager layers
2. **Chat-First Paradigm**: Text works without video
3. **State Management**: Zustand stores for reactive UI updates
4. **Error Recovery**: Reconnection, message queuing, stuck message resolution
5. **Mobile Optimizations**: Echo cancellation, video-only close, offer collision handling
6. **Production-Ready**: Comprehensive logging, error types, cleanup

**Code Size**:
- v1: ~247 lines (config only)
- v2: ~1,500 lines (complete implementation)

---

## 12. Key Takeaways for Developers

### Critical Implementation Details

1. **Always check signaling state before operations**
   - Prevents "InvalidStateError" on mobile
   - Handles offer collisions gracefully
   - Example: Lines 563-566 in `manager.ts`

2. **Queue ICE candidates if remote description not set**
   - Mobile networks can be unpredictable
   - Candidate timing varies by platform
   - Example: Lines 393-398 in `connection.ts`

3. **Use dual-path message routing**
   - Data channel for low latency when available
   - WebSocket fallback ensures reliability
   - Example: Lines 685-715 in `manager.ts`

4. **Implement exponential backoff for reconnection**
   - Prevents server overload during network issues
   - Gives network time to stabilize
   - Example: Lines 100-120 in `signaling.ts`

5. **Separate video lifecycle from text chat**
   - Users expect text to work always
   - Video is optional and can be stopped
   - Example: `stopVideo()` method preserves signaling

### Mobile-Specific Gotchas

1. **iOS Background State**: Safari suspends WebRTC when app goes to background
2. **Network Transitions**: WiFi → Cellular can trigger ICE restart
3. **Permission Timing**: Request camera/mic only when needed, not on init
4. **Echo Cancellation**: Always enable on mobile (speaker/mic proximity)
5. **Bandwidth Adaptation**: Mobile networks are variable - use adaptive bitrate

### Testing Recommendations

1. **Network Conditions**:
   - Test on WiFi, 4G, 5G
   - Test network transitions mid-call
   - Simulate poor network (packet loss, high latency)

2. **Platform Combinations**:
   - iOS → iOS
   - Android → Android
   - iOS → Android
   - Mobile → Web browser

3. **Edge Cases**:
   - Simultaneous offers (glare condition)
   - Rapid connect/disconnect cycles
   - Background/foreground transitions
   - Device wake from sleep

---

## 13. Future Enhancement Opportunities

### Potential Improvements

1. **ICE Restart Support**
   - Handle network transitions without full reconnection
   - Use `RTCPeerConnection.restartIce()`

2. **Bandwidth Adaptation**
   - Monitor RTCStats for packet loss
   - Dynamically adjust video bitrate/resolution

3. **Typing Indicators**
   - Data channel message type already defined
   - UI components needed

4. **Network Quality Metrics**
   - Expose RTT, jitter, packet loss to UI
   - Visual indicator (poor/good/excellent)

5. **Background Audio**
   - iOS: Request background audio mode
   - Android: Foreground service for calls

6. **Screen Sharing**
   - Mobile screen capture APIs
   - Separate video track management

7. **Recording Support**
   - MediaRecorder API for local recording
   - Backend integration for cloud storage

---

## File Reference Index

| File Path | Primary Responsibility | Lines of Code |
|-----------|------------------------|---------------|
| `/mobile/v2/src/webrtc/manager.ts` | WebRTC orchestration, lifecycle, role determination | 820 |
| `/mobile/v2/src/webrtc/connection.ts` | RTCPeerConnection wrapper, media, data channel | 580 |
| `/mobile/v2/src/webrtc/signaling.ts` | WebSocket client, reconnection, message routing | 216 |
| `/mobile/v2/src/webrtc/types.ts` | Type definitions, error codes, media constraints | 224 |
| `/mobile/v2/src/state/stores/connectionStore.ts` | Connection state management (Zustand) | 253 |
| `/mobile/v2/src/state/stores/sessionStore.ts` | Session state management (Zustand) | 226 |
| `/mobile/v2/src/state/stores/messagesStore.ts` | Message state, encryption integration | 246 |

**Total WebRTC Implementation**: ~2,565 lines of production TypeScript code

---

## Conclusion

The ChatOrbit mobile v2 WebRTC implementation represents a **production-grade, chat-first communication system** optimized for mobile platforms. Key strengths include:

- **Robust state management** with defensive programming
- **Dual-path messaging** (data channel + WebSocket fallback)
- **Mobile-first optimizations** (echo cancellation, bandwidth awareness)
- **Graceful degradation** (video optional, text always works)
- **Comprehensive error handling** with automatic recovery

This architecture serves as a **reference implementation** for building reliable peer-to-peer communication in React Native applications, particularly when targeting cross-platform deployments (iOS, Android, and web).
