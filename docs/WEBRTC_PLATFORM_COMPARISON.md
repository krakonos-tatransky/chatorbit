# WebRTC Platform Comparison: Browser vs Mobile

## Executive Summary

This document provides a comprehensive analysis of how WebRTC communication is implemented across ChatOrbit's two client platforms:

- **Browser (Next.js)**: `/frontend/components/session-view.tsx` + `/frontend/lib/webrtc.ts`
- **Mobile (React Native/Expo)**: `/mobile/v2/src/webrtc/` directory

Both implementations follow a **chat-first, video-optional** paradigm where:
1. Text chat connection is established first via WebRTC DataChannel
2. Video/audio is optionally initiated later via user action
3. Video can be stopped while keeping text chat active

## Architecture Overview

### Browser (Next.js)

**Location**: `/frontend/components/session-view.tsx`

**Structure**: Monolithic component with inline WebRTC logic
- All WebRTC logic embedded within the SessionView React component
- ~4000 lines of tightly integrated code
- Uses native browser `RTCPeerConnection` and `RTCDataChannel` APIs
- ICE server configuration from `/frontend/lib/webrtc.ts`

### Mobile (React Native)

**Location**: `/mobile/v2/src/webrtc/`

**Structure**: Modular, class-based architecture
- **manager.ts**: High-level orchestration (WebRTCManager class)
- **connection.ts**: Peer connection management (PeerConnection class)
- **signaling.ts**: WebSocket signaling (SignalingClient class)
- **types.ts**: TypeScript type definitions
- Uses `react-native-webrtc` library for WebRTC APIs
- Clean separation of concerns with single-responsibility classes

## Detailed Flow Comparison

### 1. Initialization

#### Browser Flow
```
SessionView component mounts
  └─> useEffect hook triggers
      ├─> Check terms acceptance (localStorage)
      ├─> Detect touch device capability
      ├─> Initialize encryption support check
      └─> Set up viewport orientation tracking
```

#### Mobile Flow
```
SessionScreen component mounts
  └─> useEffect hook triggers
      ├─> Initialize WebRTCManager singleton
      ├─> Set up lifecycle event handlers
      │   ├─> onVideoInvite callback
      │   ├─> onVideoAccepted callback
      │   ├─> onVideoEnded callback
      │   └─> onSessionEnded callback
      └─> Initialize signaling only (no peer connection yet)
```

**Key Difference**: Browser does lazy initialization; Mobile separates signaling from peer connection initialization.

---

### 2. Signaling Connection

#### Browser Flow
```
User joins session (participantId assigned)
  └─> WebSocket connection established
      ├─> URL: ws://[baseUrl]/ws/sessions/[token]?participantId=[id]
      ├─> onopen: Set socketReady = true
      ├─> onmessage: Route to message handler
      ├─> onerror: Set error state
      └─> onclose: Attempt reconnection (exponential backoff)
```

**Browser Code** (session-view.tsx ~line 3400):
```typescript
const wsUrl = `${wsUrl(language)}/ws/sessions/${token}?participantId=${participantId}`;
const socket = new WebSocket(wsUrl);

socket.onopen = () => {
  setSocketReady(true);
  if (reconnectAttemptsRef.current > 0) {
    // Resolve stuck "sending" messages
    resolveStuckMessages();
  }
  reconnectAttemptsRef.current = 0;
  reconnectBaseDelayMs = DEFAULT_RECONNECT_BASE_DELAY_MS;
};

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Route based on message.type
  handleWebSocketMessage(message);
};

socket.onclose = (event) => {
  if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
    scheduleReconnect(); // Exponential backoff
  }
};
```

#### Mobile Flow
```
User joins session
  └─> webrtcManager.initializeSignaling(token, participantId, isHost)
      ├─> SignalingClient.connect(token, participantId)
      │   ├─> URL: ws://[baseUrl]/ws/sessions/[token]?participantId=[id]
      │   ├─> onopen: Set signaling state to 'connected'
      │   ├─> Resolve stuck messages if reconnection
      │   └─> Reset reconnect attempts
      ├─> Setup signaling message handlers
      └─> Set signalingInitialized = true (guard against re-init)
```

**Mobile Code** (signaling.ts):
```typescript
async connect(token: string, participantId: string): Promise<void> {
  const wsUrl = `${API_CONFIG.wsBaseUrl}/ws/sessions/${token}?participantId=${participantId}`;

  this.ws = new WebSocket(wsUrl);

  this.ws.onopen = () => {
    console.log('[Signaling] Connected');
    useConnectionStore.getState().setSignalingState('connected');

    // If reconnection, resolve stuck messages
    if (this.reconnectAttempts > 0) {
      useMessagesStore.getState().resolveStuckMessages();
    }

    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
  };

  this.ws.onmessage = (event) => {
    this.handleMessage(event.data);
  };

  this.ws.onclose = (event) => {
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect(); // Exponential backoff
    }
  };
}
```

**Key Difference**: Mobile uses dedicated SignalingClient class with state management via Zustand stores; Browser uses component state and refs.

---

### 3. Peer Connection Initialization

#### Browser Flow
```
Both participants connected (status: 'active')
  └─> Create RTCPeerConnection
      ├─> ICE servers from getIceServers() (lib/webrtc.ts)
      │   ├─> Sanitize unroutable hosts (localhost, 0.0.0.0, etc.)
      │   ├─> Filter link-local IPv6 (fe80::/10)
      │   ├─> Parse from NEXT_PUBLIC_WEBRTC_ICE_SERVERS or individual STUN/TURN
      │   └─> Validate credentials
      ├─> Event handlers:
      │   ├─> onicecandidate: Send via WebSocket
      │   ├─> ontrack: Attach remote stream
      │   ├─> onconnectionstatechange: Update UI state
      │   ├─> oniceconnectionstatechange: Trigger recovery if failed/disconnected
      │   └─> onnegotiationneeded: Create new offer (renegotiation)
      ├─> HOST: Create DataChannel first, then offer
      └─> GUEST: Wait for DataChannel via ondatachannel event
```

**Browser Code** (session-view.tsx ~line 2840):
```typescript
const peerConnection = new RTCPeerConnection({
  iceServers: getIceServers(),
  iceCandidatePoolSize: 10,
});

peerConnection.onicecandidate = (event) => {
  if (event.candidate && event.candidate.candidate) {
    const candidate = event.candidate.toJSON();
    sendSignal("iceCandidate", candidate);
  }
};

peerConnection.ontrack = (event) => {
  const [stream] = event.streams;
  if (stream) {
    remoteStreamRef.current = stream;
    setRemoteStream(stream);
  }
};

peerConnection.onconnectionstatechange = () => {
  setConnectionState(peerConnection.connectionState);
  if (peerConnection.connectionState === 'failed') {
    schedulePeerConnectionRecovery(peerConnection, 'connection failed');
  }
};

// HOST creates DataChannel first
if (participantRole === 'host') {
  const channel = peerConnection.createDataChannel('chat');
  attachDataChannel(channel, peerConnection);
} else {
  // GUEST waits for DataChannel
  peerConnection.ondatachannel = (event) => {
    attachDataChannel(event.channel, peerConnection);
  };
}
```

#### Mobile Flow
```
Status message: 2 participants connected
  └─> WebRTCManager.initializePeerConnectionForText()
      ├─> Guard: Check peerConnectionInitialized flag
      ├─> Create PeerConnection instance
      ├─> PeerConnection.initialize(config)
      │   ├─> Get ICE servers from env or defaults
      │   ├─> Create RTCPeerConnection (react-native-webrtc)
      │   └─> Setup event handlers via addEventListener
      ├─> Setup ICE candidate handler with queuing
      ├─> Setup DataChannel handlers
      └─> HOST: Create data channel + send offer
          GUEST: Wait for offer (handled by handleOffer)
```

**Mobile Code** (manager.ts):
```typescript
private async initializePeerConnectionForText(): Promise<void> {
  // Guard against multiple initializations
  if (this.peerConnectionInitialized) {
    console.log('[WebRTC] Peer connection already initialized');
    return;
  }

  this.peerConnectionInitialized = true;
  this.peerConnection = new PeerConnection();
  await this.peerConnection.initialize();

  // Setup ICE candidate handler with queuing
  this.peerConnection.onIceCandidate((candidate) => {
    this.sendIceCandidate(candidate.toJSON());
  });

  // Setup data channel handlers
  this.setupDataChannelHandlers();

  if (this.isInitiator) {
    // Host: Create data channel and send offer
    this.peerConnection.createDataChannel('chat');
    const offer = await this.peerConnection.createOffer();
    this.signaling.send({
      type: 'signal',
      signalType: 'offer',
      payload: offer,
    });
  }
  // Guest: Wait for offer (handled by handleOffer)
}
```

**Mobile Code** (connection.ts):
```typescript
async initialize(config?: WebRTCConfig): Promise<void> {
  const iceServers: RTCIceServer[] = config?.iceServers || this.getDefaultIceServers();

  this.pc = new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
  });

  // Setup event handlers using addEventListener pattern
  const pc = this.pc as any;

  pc.addEventListener('icecandidate', (event: any) => {
    if (event.candidate) {
      this.iceCandidateHandlers.forEach((handler) => handler(event.candidate));
    }
  });

  pc.addEventListener('track', (event: any) => {
    const stream = event.streams?.[0] ?? new MediaStream();
    if (!stream.getTrackById(event.track.id)) {
      stream.addTrack(event.track);
    }
    this.remoteStream = stream;
    this.remoteStreamHandlers.forEach((handler) => handler(stream));
  });

  pc.addEventListener('datachannel', (event: any) => {
    this.dataChannel = event.channel;
    this.setupDataChannel();
  });
}
```

**Key Differences**:
1. Browser uses property assignment (`pc.onicecandidate = ...`), Mobile uses `addEventListener`
2. Mobile explicitly handles missing stream in track event (renegotiation edge case)
3. Mobile has initialization guard flag to prevent duplicate peer connections
4. Browser has more complex ICE server sanitization (IPv6 link-local filtering)

---

### 4. Offer/Answer Exchange

#### Browser Flow (HOST)
```
Both participants connected
  └─> Host creates offer
      ├─> pc.createOffer()
      ├─> pc.setLocalDescription(offer)
      ├─> hasSentOfferRef.current = true (track offer state)
      └─> sendSignal('offer', offer)
          └─> WebSocket message: { type: 'signal', signalType: 'offer', payload: offer }
```

#### Browser Flow (GUEST)
```
Receive 'offer' signal
  └─> Check signaling state
      ├─> If have-local-offer: ROLLBACK (offer collision)
      │   └─> pc.setLocalDescription({ type: 'rollback' })
      ├─> pc.setRemoteDescription(offer)
      ├─> Flush pending ICE candidates
      ├─> pc.createAnswer()
      ├─> pc.setLocalDescription(answer)
      └─> sendSignal('answer', answer)
```

**Browser Code** (session-view.tsx ~line 2740):
```typescript
// Receive offer
if (signalType === 'offer' && detail) {
  logEvent('Applying remote offer');

  // Handle offer collision (glare)
  if (pc.signalingState === 'have-local-offer') {
    logEvent('Rolling back local offer to accept remote offer');
    await pc.setLocalDescription({ type: 'rollback' });
  }

  // Check for unstable signaling state
  if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') {
    deferredOffersRef.current = [payload];
    return;
  }

  await pc.setRemoteDescription(detail as RTCSessionDescriptionInit);
  await flushPendingCandidates();

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  sendSignal('answer', answer);
}
```

#### Mobile Flow (HOST)
```
Both participants connected
  └─> Host creates offer
      ├─> peerConnection.createOffer()
      │   └─> Internal: pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
      ├─> pc.setLocalDescription(offer)
      └─> signaling.send({ type: 'signal', signalType: 'offer', payload: offer })
```

#### Mobile Flow (GUEST)
```
Receive offer signal (type: 'signal', signalType: 'offer')
  └─> handleOffer(offer)
      ├─> Guard: Check if already processing offer (prevent duplicates)
      ├─> Create peer connection if doesn't exist (on-demand for guest)
      ├─> Check signaling state
      │   ├─> If not stable or have-local-offer: ignore
      │   └─> If have-local-offer: ROLLBACK (offer collision)
      │       └─> peerConnection.rollback()
      ├─> this.isProcessingOffer = true
      ├─> peerConnection.setRemoteDescription(offer)
      ├─> peerConnection.createAnswer()
      ├─> peerConnection.setLocalDescription(answer)
      ├─> signaling.send({ type: 'signal', signalType: 'answer', payload: answer })
      ├─> Flush pending ICE candidates
      └─> this.isProcessingOffer = false
```

**Mobile Code** (manager.ts ~line 754):
```typescript
private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
  // Prevent duplicate offer processing
  if (this.isProcessingOffer) {
    console.log('[WebRTC] Already processing an offer, ignoring duplicate');
    return;
  }

  // Initialize peer connection on-demand for guest
  if (!this.peerConnection) {
    this.peerConnection = new PeerConnection();
    await this.peerConnection.initialize();
    this.peerConnectionInitialized = true;
    this.peerConnection.onIceCandidate((candidate) => {
      this.sendIceCandidate(candidate.toJSON());
    });
    this.setupDataChannelHandlers();
  }

  // Check signaling state
  const signalingState = this.peerConnection.getSignalingState();
  if (signalingState && signalingState !== 'stable' && signalingState !== 'have-local-offer') {
    console.log(`[WebRTC] Ignoring offer in signaling state: ${signalingState}`);
    return;
  }

  // Handle offer collision (glare)
  if (signalingState === 'have-local-offer') {
    console.log('[WebRTC] Offer collision detected - rolling back');
    await this.peerConnection.rollback();
  }

  this.isProcessingOffer = true;

  try {
    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.signaling.send({
      type: 'signal',
      signalType: 'answer',
      payload: answer,
    });

    this.flushPendingIceCandidates();
  } finally {
    this.isProcessingOffer = false;
  }
}
```

**Key Differences**:
1. Mobile has explicit `isProcessingOffer` flag to prevent race conditions
2. Mobile creates peer connection on-demand for guest (lazy initialization)
3. Browser uses `deferredOffersRef` to queue offers in unstable states
4. Mobile uses dedicated `rollback()` method in PeerConnection class
5. Both implement offer collision handling (Perfect Negotiation pattern)

---

### 5. ICE Candidate Exchange

#### Browser Flow
```
RTCPeerConnection discovers ICE candidate
  └─> onicecandidate event fires
      ├─> Serialize candidate: candidate.toJSON()
      ├─> Send via WebSocket: { type: 'signal', signalType: 'iceCandidate', payload: candidate }
      └─> Log candidate discovery

Remote ICE candidate received via WebSocket
  └─> processSignalPayload('iceCandidate', candidateData)
      ├─> Check for duplicate (seenCandidatesRef)
      ├─> If remote description set:
      │   └─> pc.addIceCandidate(candidateInit)
      └─> Else: Queue in pendingCandidatesRef
          └─> Flushed when remote description is set
```

**Browser Code** (session-view.tsx):
```typescript
// Discovering local ICE candidates
peerConnection.onicecandidate = (event) => {
  if (event.candidate && event.candidate.candidate) {
    const candidate = event.candidate.toJSON();
    sendSignal('iceCandidate', candidate);
    logEvent('Discovered ICE candidate', candidate);
  } else {
    // End of candidates
    logEvent('ICE gathering complete');
  }
};

// Receiving remote ICE candidates
const processSignalPayload = async (pc, payload) => {
  const { signalType, payload: detail } = payload;

  if (signalType === 'iceCandidate' || signalType === 'ice-candidate') {
    if (detail && typeof detail === 'object') {
      const candidateInit = detail;

      // Check for duplicate
      if (isDuplicateCandidate(candidateInit)) {
        return;
      }

      // Apply immediately if remote description is set
      if (pc.remoteDescription) {
        await pc.addIceCandidate(candidateInit);
        logEvent('Applied ICE candidate from peer', detail);
      } else {
        // Queue until remote description available
        pendingCandidatesRef.current.push(candidateInit);
        logEvent('Queued ICE candidate', detail);
      }
    } else if (pc.remoteDescription) {
      // End-of-candidates signal
      await pc.addIceCandidate(null);
      logEvent('Applied end-of-candidates signal');
    }
  }
};
```

#### Mobile Flow
```
RTCPeerConnection discovers ICE candidate
  └─> icecandidate event fires (addEventListener)
      └─> iceCandidateHandlers.forEach(handler => handler(candidate))
          └─> WebRTCManager registered handler:
              └─> sendIceCandidate(candidate.toJSON())
                  ├─> Check if signaling connected
                  ├─> If not connected: Queue in pendingIceCandidates
                  └─> Else: signaling.send({ type: 'signal', signalType: 'ice-candidate', payload })

Remote ICE candidate received via signaling
  └─> handleSignalMessage({ signalType: 'ice-candidate', payload })
      └─> handleIceCandidate(payload)
          ├─> Check if peer connection exists
          └─> peerConnection.addIceCandidate(candidateInit)
              ├─> If no remote description: Queue in pendingIceCandidates
              └─> Else: pc.addIceCandidate(new RTCIceCandidate(candidate))
```

**Mobile Code** (manager.ts):
```typescript
// Sending ICE candidates with queuing
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

// Flushing queued candidates
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

**Mobile Code** (connection.ts):
```typescript
async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
  if (!this.pc) {
    throw new WebRTCError(
      WebRTCErrorCode.INVALID_STATE,
      'Peer connection not initialized'
    );
  }

  // Queue if remote description not set yet
  if (!this.pc.remoteDescription) {
    console.log('[PeerConnection] Queuing ICE candidate (no remote description yet)');
    this.pendingIceCandidates.push(candidate as RTCIceCandidate);
    return;
  }

  console.log('[PeerConnection] Adding ICE candidate');
  await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
}
```

**Key Differences**:
1. Mobile has **TWO** queuing layers:
   - Manager level: Queue if signaling not connected
   - Connection level: Queue if remote description not set
2. Browser uses `seenCandidatesRef` Set to deduplicate candidates
3. Mobile uses try/catch for resilience and falls back to queuing
4. Browser has explicit end-of-candidates handling (`addIceCandidate(null)`)

---

### 6. DataChannel Setup

#### Browser Flow
```
HOST:
  └─> Create DataChannel before offer
      ├─> channel = pc.createDataChannel('chat')
      └─> attachDataChannel(channel, pc)
          ├─> Set dataChannelRef.current = channel
          ├─> Setup timeout (10-20s based on network)
          ├─> channel.onopen: Clear timeout, send capabilities
          ├─> channel.onclose: Schedule peer recovery
          ├─> channel.onerror: Schedule peer recovery
          └─> channel.onmessage: Handle incoming messages

GUEST:
  └─> Wait for DataChannel via ondatachannel
      ├─> pc.ondatachannel = (event) => attachDataChannel(event.channel, pc)
      └─> attachDataChannel() same as host
```

**Browser Code** (session-view.tsx):
```typescript
const attachDataChannel = (channel: RTCDataChannel, owner: RTCPeerConnection) => {
  dataChannelRef.current = channel;
  setDataChannelState(channel.readyState);

  // Adaptive timeout based on network (slow/fast)
  const getDataChannelTimeout = (): number => {
    const effectiveType = navigator?.connection?.effectiveType;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return DATA_CHANNEL_TIMEOUT_SLOW_NETWORK_MS; // 20s
    }
    return DATA_CHANNEL_TIMEOUT_MS; // 10s
  };

  if (channel.readyState !== 'open') {
    const timeoutMs = getDataChannelTimeout();
    dataChannelTimeoutRef.current = setTimeout(() => {
      if (channel.readyState !== 'open' && sessionActiveRef.current) {
        logEvent('Data channel failed to open within timeout');
        schedulePeerConnectionRecovery(owner, 'data channel timeout');
      }
    }, timeoutMs);
  }

  channel.onopen = () => {
    if (dataChannelTimeoutRef.current) {
      clearTimeout(dataChannelTimeoutRef.current);
    }
    logEvent('Data channel opened');
    capabilityAnnouncedRef.current = false;
    sendCapabilities(); // Announce encryption support
    setDataChannelState(channel.readyState);

    // Flush pending call messages (video invites queued before channel opened)
    const pending = pendingCallMessagesRef.current.splice(0);
    if (pending.length > 0) {
      for (const { action, detail } of pending) {
        channel.send(JSON.stringify({ type: 'call', action, ...detail }));
      }
    }
  };

  channel.onclose = () => {
    logEvent('Data channel closed');
    setDataChannelState(channel.readyState);
    if (sessionActiveRef.current) {
      setIsReconnecting(true);
      schedulePeerConnectionRecovery(owner, 'data channel closed');
    }
  };

  channel.onerror = (error) => {
    logEvent('Data channel error', error);
    setDataChannelState(channel.readyState);
    if (sessionActiveRef.current) {
      setIsReconnecting(true);
      schedulePeerConnectionRecovery(owner, 'data channel error');
    }
  };

  channel.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleDataChannelMessage(message);
    } catch (error) {
      console.error('Failed to parse data channel message', error);
    }
  };
};
```

#### Mobile Flow
```
HOST:
  └─> peerConnection.createDataChannel('chat')
      ├─> Set this.dataChannel = pc.createDataChannel('chat', { ordered: true })
      └─> setupDataChannel()
          ├─> onopen: Notify handlers, set connection state to 'connected'
          ├─> onclose: Log closure
          ├─> onerror: Log error
          └─> onmessage: Parse JSON, notify handlers

GUEST:
  └─> Wait for datachannel event (addEventListener)
      ├─> event fires with event.channel
      ├─> Set this.dataChannel = event.channel
      └─> setupDataChannel() same as host
```

**Mobile Code** (connection.ts):
```typescript
createDataChannel(label: string = 'chat'): void {
  if (!this.pc) {
    throw new WebRTCError(
      WebRTCErrorCode.INVALID_STATE,
      'Peer connection not initialized'
    );
  }

  this.dataChannel = this.pc.createDataChannel(label, {
    ordered: true,
  }) as any;

  this.setupDataChannel();
}

private setupDataChannel(): void {
  if (!this.dataChannel) return;

  this.dataChannel.onopen = () => {
    console.log('[PeerConnection] Data channel open');
    // Notify handlers that data channel is ready for text chat
    this.dataChannelOpenHandlers.forEach((handler) => {
      handler();
    });
  };

  this.dataChannel.onclose = () => {
    console.log('[PeerConnection] Data channel closed');
  };

  this.dataChannel.onerror = (error) => {
    console.error('[PeerConnection] Data channel error:', error);
  };

  this.dataChannel.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      this.dataChannelHandlers.forEach((handler) => {
        handler(message);
      });
    } catch (error) {
      console.error('[PeerConnection] Failed to parse message:', error);
    }
  };
}
```

**Mobile Code** (manager.ts - handler registration):
```typescript
private setupDataChannelHandlers(): void {
  if (!this.peerConnection) return;

  // Set connection state when data channel opens
  this.peerConnection.onDataChannelOpen(() => {
    console.log('[WebRTC] Data channel opened - text chat ready');
    useConnectionStore.getState().setConnectionState('connected');
  });

  this.peerConnection.onDataChannelMessage(async (message) => {
    // Handle different message types (message, ack, typing, call, etc.)
    switch (message.type) {
      case 'message':
        // Decrypt and add to messages store
        break;
      case 'ack':
        // Mark message as sent
        break;
      case 'call':
        // Handle video invite/accept/end
        await this.handleCallMessage(message);
        break;
      // ... more cases
    }
  });
}
```

**Key Differences**:
1. Browser has **adaptive timeout** based on network speed (10-20s)
2. Browser queues "call" messages if DataChannel not open yet (`pendingCallMessagesRef`)
3. Mobile uses **observer pattern** with handler registration (`onDataChannelOpen`, `onDataChannelMessage`)
4. Browser triggers peer connection recovery on DataChannel failure
5. Mobile separates DataChannel state from WebRTC manager concerns

---

### 7. Message Exchange (Text Chat)

#### Browser Flow
```
User sends message
  └─> Encrypt message (AES-GCM)
      ├─> Derive key from session token
      ├─> Generate random IV
      ├─> Encrypt content
      └─> Create message object with encrypted payload
  └─> Send via DataChannel
      ├─> Format: { type: 'message', message: { sessionId, messageId, participantId, role, createdAt, encryptedContent, encryption: 'aes-gcm' } }
      ├─> channel.send(JSON.stringify(message))
      └─> Fallback to WebSocket if DataChannel closed
  └─> Add to local messages array (optimistic UI)

Receive message via DataChannel
  └─> channel.onmessage fires
      └─> Parse JSON
          ├─> If type === 'message':
          │   ├─> Verify hash (optional)
          │   ├─> Decrypt encryptedContent with session key
          │   ├─> Add to messages array
          │   └─> Send ACK back via DataChannel
          └─> If type === 'ack':
              └─> Mark local message as delivered
```

**Browser Code** (session-view.tsx):
```typescript
const sendMessage = async (content: string) => {
  if (!participantId || !participantRole) {
    return;
  }

  const messageId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Encrypt message
  const key = await ensureEncryptionKey();
  const encrypted = await encryptMessage(key, content);

  const message = {
    sessionId: token,
    messageId,
    participantId,
    role: participantRole,
    createdAt: now,
    encryptedContent: encrypted,
    encryption: 'aes-gcm' as const,
  };

  // Send via DataChannel if open
  const channel = dataChannelRef.current;
  if (channel && channel.readyState === 'open') {
    const payload = {
      type: 'message',
      message,
    };
    channel.send(JSON.stringify(payload));
  } else {
    // Fallback to WebSocket
    socketRef.current?.send(JSON.stringify({
      type: 'message',
      ...message,
    }));
  }

  // Optimistic UI update
  setMessages(prev => [...prev, {
    messageId,
    participantId,
    role: participantRole,
    content, // Decrypted for local display
    createdAt: now,
  }]);
};

const handleDataChannelMessage = async (message: any) => {
  if (message.type === 'message') {
    const { message: msg } = message;

    // Decrypt
    const key = await ensureEncryptionKey();
    const decrypted = await decryptMessage(key, msg.encryptedContent);

    // Add to messages
    setMessages(prev => [...prev, {
      messageId: msg.messageId,
      participantId: msg.participantId,
      role: msg.role,
      content: decrypted,
      createdAt: msg.createdAt,
    }]);

    // Send ACK
    dataChannelRef.current?.send(JSON.stringify({
      type: 'ack',
      messageId: msg.messageId,
    }));
  } else if (message.type === 'ack') {
    // Mark message as delivered (visual feedback)
    markMessageDelivered(message.messageId);
  }
};
```

#### Mobile Flow
```
User sends message
  └─> webrtcManager.sendMessage(content)
      ├─> useMessagesStore.sendMessage(token, content)
      │   ├─> Encrypt with AES-GCM (crypto utils)
      │   ├─> Generate messageId
      │   ├─> Add to local messages with status='sending'
      │   └─> Return { messageId, payload, timestamp }
      ├─> Format message (browser-compatible):
      │   └─> { type: 'message', message: { sessionId, messageId, participantId, role, createdAt, encryptedContent, hash, encryption } }
      ├─> Send via DataChannel (peerConnection.sendRawMessage())
      └─> Fallback to signaling if DataChannel not ready

Receive message via DataChannel
  └─> onDataChannelMessage handler fires
      ├─> Parse message
      ├─> If type === 'message':
      │   ├─> Extract payload (browser or mobile format)
      │   ├─> decryptAndAddMessage(token, payload, messageId, timestamp)
      │   │   ├─> Decrypt using crypto utils
      │   │   ├─> Add to useMessagesStore
      │   │   └─> Update UI
      │   └─> (No explicit ACK sent - browser compatibility)
      └─> If type === 'ack':
          └─> useMessagesStore.markMessageSent(messageId)
```

**Mobile Code** (manager.ts):
```typescript
async sendMessage(content: string): Promise<void> {
  if (!this.token) {
    throw new WebRTCError(
      WebRTCErrorCode.INVALID_STATE,
      'No active session'
    );
  }

  // Encrypt message
  const encrypted = await useMessagesStore.getState().sendMessage(this.token, content);

  // Get session info for browser-compatible format
  const sessionState = useSessionStore.getState();
  const participantId = this.participantId || sessionState.participantId || '';
  const role = sessionState.role || 'guest';

  // If we have a data channel open, use it with browser-compatible format
  if (this.peerConnection) {
    try {
      // Browser expects { type: 'message', message: { ... } }
      const browserMessage = {
        type: 'message',
        message: {
          sessionId: this.token,
          messageId: encrypted.messageId,
          participantId: participantId,
          role: role,
          createdAt: new Date(encrypted.timestamp).toISOString(),
          encryptedContent: encrypted.payload,
          hash: '', // Optional - browser skips verification if empty
          encryption: 'aes-gcm',
        },
      };

      this.peerConnection.sendRawMessage(browserMessage);
      console.log('[WebRTC] Message sent via data channel (browser format)');
      return;
    } catch (error) {
      console.log('[WebRTC] Data channel failed, falling back to signaling');
    }
  }

  // Fallback to signaling
  this.signaling.send({
    type: 'signal',
    signalType: 'message',
    payload: {
      payload: encrypted.payload,
      messageId: encrypted.messageId,
      timestamp: encrypted.timestamp,
    },
  });

  // Mark message as sent (no ack from signaling)
  useMessagesStore.getState().markMessageSent(encrypted.messageId);
}
```

**Mobile Code** (state/messagesStore.ts - referenced):
```typescript
// Decrypt and add message helper
export async function decryptAndAddMessage(
  token: string,
  encryptedPayload: string,
  messageId: string,
  timestamp: number
) {
  const content = await decrypt(token, encryptedPayload);
  useMessagesStore.getState().addMessage({
    id: messageId,
    content,
    timestamp,
    isSent: true,
    status: 'delivered',
  });
}
```

**Key Differences**:
1. Browser sends **ACK** messages back, Mobile does not (asymmetric protocol)
2. Mobile has **two message formats**:
   - Browser-compatible (when sending to browser)
   - Mobile-optimized (when receiving from mobile)
3. Browser uses component state for messages, Mobile uses Zustand store
4. Mobile has explicit "sending" → "sent" → "delivered" status tracking
5. Browser has hash verification (optional), Mobile skips it for browser compatibility

---

### 8. Video Call Initiation

Both platforms follow a similar flow but with different UI patterns:

#### Browser Flow (Video Invite)
```
User clicks "Start Call" button
  └─> Request media permissions
      ├─> navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      ├─> Add tracks to peer connection
      │   ├─> stream.getTracks().forEach(track => pc.addTrack(track, stream))
      │   └─> Trigger onnegotiationneeded event
      ├─> onnegotiationneeded fires:
      │   ├─> pc.createOffer()
      │   ├─> pc.setLocalDescription(offer)
      │   └─> sendSignal('offer', offer)
      ├─> Set localStream state (auto-display in UI)
      └─> Send video invite via DataChannel:
          └─> channel.send({ type: 'call', action: 'request', from: participantId })
```

**Browser Code** (session-view.tsx):
```typescript
const startCall = async () => {
  try {
    setCallState('requesting');

    // Get user media
    const constraints = {
      video: {
        deviceId: selectedVideoDeviceId ? { exact: selectedVideoDeviceId } : undefined,
        facingMode: preferredFacingMode || 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);

    // Add tracks to peer connection
    const pc = peerConnectionRef.current;
    if (pc) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      // onnegotiationneeded will fire automatically and create new offer
    }

    // Send video invite
    const channel = dataChannelRef.current;
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify({
        type: 'call',
        action: 'request',
        from: participantId,
      }));
    }
  } catch (error) {
    console.error('Failed to start call', error);
    setCallState('idle');
  }
};
```

#### Mobile Flow (Video Invite)
```
User taps camera button
  └─> webrtcManager.startVideo()
      ├─> Check if video already started (guard)
      ├─> peerConnection.addLocalStream(mediaConstraints)
      │   ├─> mediaDevices.getUserMedia({
      │   │     audio: { echoCancellation: true, noiseSuppression: true },
      │   │     video: { width: 1280, height: 720, facingMode: 'user' }
      │   │   })
      │   ├─> Set this.localStream = stream
      │   ├─> stream.getTracks().forEach(track => pc.addTrack(track, stream))
      │   └─> Update connection store (local media state)
      ├─> Set this.videoStarted = true
      └─> sendVideoInvite()
          ├─> Try DataChannel: peerConnection.sendRawMessage({ type: 'call', action: 'request', from: participantId })
          └─> Fallback to signaling: { type: 'signal', signalType: 'video-invite', payload: {} }
```

**Mobile Code** (manager.ts):
```typescript
async startVideo(
  config?: WebRTCConfig,
  mediaConstraints?: MediaConstraints
): Promise<MediaStream> {
  if (this.videoStarted) {
    console.log('[WebRTC] Video already started');
    return this.peerConnection!.getLocalStream()!;
  }

  if (!this.peerConnection) {
    throw new WebRTCError(
      WebRTCErrorCode.INVALID_STATE,
      'Peer connection not initialized - text chat must be connected first'
    );
  }

  // Add local media stream to existing peer connection
  const localStream = await this.peerConnection.addLocalStream(mediaConstraints);

  this.videoStarted = true;
  console.log('[WebRTC] Video started');

  return localStream;
}

sendVideoInvite(): void {
  console.log('[WebRTC] Sending video invite via DataChannel');
  if (this.peerConnection) {
    try {
      // Use browser-compatible call protocol
      this.peerConnection.sendRawMessage({
        type: 'call',
        action: 'request',
        from: this.participantId,
      });
      return;
    } catch (error) {
      console.log('[WebRTC] DataChannel not ready, falling back to signaling');
    }
  }
  // Fallback to signaling
  this.signaling.send({
    type: 'signal',
    signalType: 'video-invite',
    payload: {},
  });
}
```

**Key Differences**:
1. Browser: `onnegotiationneeded` creates offer automatically after adding tracks
2. Mobile: Explicit renegotiation triggered by caller after peer accepts
3. Mobile: Video is added to **existing** peer connection (chat-first paradigm)
4. Browser: Can initiate video before DataChannel is open (pending queue)

---

### 9. Video Call Acceptance

#### Browser Flow
```
Receive video invite via DataChannel
  └─> channel.onmessage: { type: 'call', action: 'request' }
      ├─> setCallState('incoming')
      ├─> setIncomingCallFrom(message.from)
      ├─> Show incoming call dialog modal
      └─> playNotificationTone()

User clicks "Accept"
  └─> acceptCall()
      ├─> Request media permissions (same as startCall)
      ├─> Add tracks to peer connection
      ├─> Send accept via DataChannel:
      │   └─> channel.send({ type: 'call', action: 'accept', from: participantId })
      └─> setCallState('connecting')
          └─> Waits for renegotiation offer from caller
              └─> Remote stream arrives → setCallState('active')
```

**Browser Code** (session-view.tsx):
```typescript
const handleDataChannelMessage = (message: any) => {
  if (message.type === 'call') {
    const { action, from } = message;

    if (action === 'request') {
      // Incoming video call
      setCallState('incoming');
      setIncomingCallFrom(from);
      setCallDialogOpen(true);
      playNotificationTone();
    } else if (action === 'accept') {
      // Our video invite was accepted
      setCallState('connecting');
      // Renegotiation will happen via onnegotiationneeded
    } else if (action === 'end') {
      // Remote peer ended video
      stopCall();
    }
  }
};

const acceptCall = async () => {
  try {
    setCallDialogOpen(false);
    setCallState('connecting');

    // Get user media
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 1280, height: 720 },
      audio: { echoCancellation: true, noiseSuppression: true },
    });

    localStreamRef.current = stream;
    setLocalStream(stream);

    // Add tracks (triggers renegotiation on remote side)
    const pc = peerConnectionRef.current;
    if (pc) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    // Send accept
    const channel = dataChannelRef.current;
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify({
        type: 'call',
        action: 'accept',
        from: participantId,
      }));
    }
  } catch (error) {
    console.error('Failed to accept call', error);
    setCallState('idle');
  }
};
```

#### Mobile Flow
```
Receive video invite via DataChannel
  └─> onDataChannelMessage: { type: 'call', action: 'request' }
      └─> handleCallMessage(message)
          ├─> If action === 'request':
          │   └─> this.handleVideoInvite()
          │       └─> if (this.onVideoInvite) this.onVideoInvite()
          │           └─> SessionScreen shows incoming call modal
          └─> playNotificationSound()

User taps "Accept"
  └─> handleAcceptCall()
      ├─> webrtcManager.acceptVideoInvite()
      │   └─> Send accept via DataChannel:
      │       └─> peerConnection.sendRawMessage({ type: 'call', action: 'accept', from: participantId })
      └─> webrtcManager.startVideo(config, mediaConstraints)
          ├─> Request media permissions
          ├─> Add tracks to existing peer connection
          └─> Wait for renegotiation offer from caller
              └─> Remote stream arrives → onVideoAccepted callback fires
```

**Mobile Code** (manager.ts):
```typescript
private async handleCallMessage(message: { type: 'call'; action: string; from?: string }): Promise<void> {
  const action = message.action;

  switch (action) {
    case 'request':
      // Browser is requesting video call - treat as video invite
      this.handleVideoInvite();
      break;

    case 'accept':
      // Browser accepted our video request
      await this.handleVideoAccept();
      break;

    case 'end':
      // Browser ended video call
      this.handleVideoEnd();
      break;

    case 'renegotiate':
      // Browser (guest) wants to renegotiate - if we're host, create offer
      if (this.isInitiator && this.peerConnection) {
        const offer = await this.peerConnection.createOffer();
        this.signaling.send({
          type: 'signal',
          signalType: 'offer',
          payload: offer,
        });
      }
      break;
  }
}

private handleVideoInvite(): void {
  console.log('[WebRTC] Received video invite');
  if (this.onVideoInvite) {
    this.onVideoInvite(); // Notify UI to show modal
  }
}

async acceptVideoInvite(): Promise<void> {
  console.log('[WebRTC] Accepting video invite via DataChannel');

  // Send accept message via DataChannel
  if (this.peerConnection) {
    try {
      this.peerConnection.sendRawMessage({
        type: 'call',
        action: 'accept',
        from: this.participantId,
      });
    } catch (error) {
      // Fallback to signaling if DataChannel not ready
      this.signaling.send({
        type: 'signal',
        signalType: 'video-accept',
        payload: {},
      });
    }
  }
  // Note: The caller (SessionScreen) will call startVideo() after this
}
```

**Mobile Code** (SessionScreen.tsx - UI handler):
```typescript
const handleAcceptCall = async () => {
  try {
    setShowIncomingCall(false);

    // Accept the invite
    await webrtcManager.acceptVideoInvite();

    // Start video
    const stream = await webrtcManager.startVideo();
    setLocalStream(stream);
    setVideoActive(true);
  } catch (error) {
    console.error('Failed to accept call', error);
  }
};
```

**Key Differences**:
1. Mobile: Separate `acceptVideoInvite()` and `startVideo()` calls (explicit flow)
2. Browser: Single `acceptCall()` function handles both
3. Mobile: Uses callback pattern (`onVideoInvite`) to notify UI
4. Browser: Sets component state directly (`setCallState('incoming')`)
5. Mobile: Handles "renegotiate" action for guest-initiated renegotiation

---

### 10. Video Renegotiation

When video tracks are added to an existing peer connection (chat-first paradigm), renegotiation is required.

#### Browser Flow
```
Tracks added to peer connection
  └─> pc.addTrack(track, stream) called
      └─> onnegotiationneeded event fires
          ├─> Check if negotiation already pending (debounce)
          ├─> Set negotiationPendingRef.current = true
          └─> pc.createOffer()
              ├─> pc.setLocalDescription(offer)
              └─> sendSignal('offer', offer)
                  └─> Peer receives offer and creates answer
                      └─> Video streams flow bidirectionally
```

**Browser Code** (session-view.tsx):
```typescript
peerConnection.onnegotiationneeded = async () => {
  logEvent('Negotiation needed');

  if (negotiationPendingRef.current) {
    logEvent('Negotiation already pending, skipping');
    return;
  }

  negotiationPendingRef.current = true;

  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    sendSignal('offer', offer);
    logEvent('Sent renegotiation offer');
  } catch (error) {
    console.error('Failed to renegotiate', error);
  } finally {
    negotiationPendingRef.current = false;
  }
};
```

#### Mobile Flow
```
Guest accepts video invite
  └─> handleVideoAccept() fires (on the caller/initiator side)
      ├─> Prevent duplicate: Check videoAcceptHandled flag
      ├─> Set this.videoAcceptHandled = true
      ├─> Notify UI: onVideoAccepted callback
      └─> Create renegotiation offer:
          ├─> peerConnection.createOffer()
          ├─> peerConnection.setLocalDescription(offer)
          └─> signaling.send({ type: 'signal', signalType: 'offer', payload: offer })
              └─> Peer receives offer and creates answer
                  └─> Video streams established

Guest initiates video (mobile-specific)
  └─> If guest is mobile and wants to start video first:
      └─> Send "renegotiate" request via DataChannel:
          └─> peerConnection.sendRawMessage({ type: 'call', action: 'renegotiate' })
              └─> Host receives and creates offer
```

**Mobile Code** (manager.ts):
```typescript
private async handleVideoAccept(): Promise<void> {
  // Prevent duplicate handling - browser sends accept via both data channel and signaling
  if (this.videoAcceptHandled) {
    console.log('[WebRTC] Video accept already handled, ignoring duplicate');
    return;
  }
  this.videoAcceptHandled = true;

  console.log('[WebRTC] Remote peer accepted video - creating renegotiation offer');

  // Notify UI that video call is starting
  if (this.onVideoAccepted) {
    this.onVideoAccepted();
  }

  // Create renegotiation offer to include video tracks
  // Data channel already exists from text chat connection
  if (this.peerConnection) {
    const offer = await this.peerConnection.createOffer();
    this.signaling.send({
      type: 'signal',
      signalType: 'offer',
      payload: offer,  // Send full RTCSessionDescriptionInit { type, sdp }
    });
    console.log('[WebRTC] Renegotiation offer sent after video accept');
  }
}
```

**Mobile Code** (connection.ts - createOffer with receive flags):
```typescript
async createOffer(): Promise<RTCSessionDescriptionInit> {
  if (!this.pc) {
    throw new WebRTCError(
      WebRTCErrorCode.INVALID_STATE,
      'Peer connection not initialized'
    );
  }

  const offer = await this.pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });

  await this.pc.setLocalDescription(offer);
  console.log('[PeerConnection] Local description set (offer)');

  return offer;
}
```

**Key Differences**:
1. Browser: Uses `onnegotiationneeded` event (automatic)
2. Mobile: **Explicit** renegotiation triggered by `handleVideoAccept()`
3. Mobile: Has `videoAcceptHandled` flag to prevent duplicate accept handling
4. Mobile: Guest can request renegotiation via "renegotiate" action (browser compatibility)
5. Mobile: Always sets `offerToReceiveAudio/Video: true` in createOffer (ensures bidirectional)

---

### 11. Stopping Video (Keeping Text Chat)

#### Browser Flow
```
User clicks "End Call" button
  └─> endCall()
      ├─> Stop local tracks:
      │   └─> localStream.getTracks().forEach(track => track.stop())
      ├─> Remove tracks from peer connection:
      │   └─> pc.getSenders().forEach(sender => pc.removeTrack(sender))
      ├─> Clear local/remote stream refs
      ├─> Send "end" via DataChannel:
      │   └─> channel.send({ type: 'call', action: 'end', from: participantId })
      ├─> setCallState('idle')
      └─> DataChannel and signaling remain connected for text chat
```

**Browser Code** (session-view.tsx):
```typescript
const endCall = () => {
  logEvent('Ending call');

  // Stop local tracks
  const localStream = localStreamRef.current;
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }

  // Remove tracks from peer connection
  const pc = peerConnectionRef.current;
  if (pc) {
    pc.getSenders().forEach(sender => {
      if (sender.track) {
        pc.removeTrack(sender);
      }
    });
  }

  // Clear remote stream
  remoteStreamRef.current = null;
  setRemoteStream(null);

  // Notify peer
  const channel = dataChannelRef.current;
  if (channel && channel.readyState === 'open') {
    channel.send(JSON.stringify({
      type: 'call',
      action: 'end',
      from: participantId,
    }));
  }

  setCallState('idle');
  setIsCallFullscreen(false);
};
```

#### Mobile Flow
```
User taps "Stop Video" button
  └─> webrtcManager.stopVideo()
      ├─> Notify peer via DataChannel:
      │   └─> peerConnection.sendRawMessage({ type: 'call', action: 'end', from: participantId })
      │   └─> Fallback to signaling if DataChannel not ready
      ├─> Stop local video tracks:
      │   └─> peerConnection.stopVideoTracks()
      │       ├─> localStream.getTracks().forEach(track => track.stop())
      │       ├─> Remove tracks from peer connection (getSenders)
      │       ├─> Clear local/remote stream refs
      │       └─> Reset media state in connection store
      ├─> Set this.videoStarted = false
      └─> Peer connection and DataChannel remain open for text chat
```

**Mobile Code** (manager.ts):
```typescript
stopVideo(): void {
  console.log('[WebRTC] Stopping video (keeping text chat via DataChannel)');

  // Notify remote peer that video is ending via DataChannel
  if (this.peerConnection) {
    try {
      this.peerConnection.sendRawMessage({
        type: 'call',
        action: 'end',
        from: this.participantId,
      });
    } catch (error) {
      // Fallback to signaling if data channel not ready
      if (this.signaling.isConnected()) {
        this.signaling.send({
          type: 'signal',
          signalType: 'video-end',
          payload: {},
        });
      }
    }
  }

  // Stop video tracks only (keep data channel open for text chat)
  if (this.peerConnection) {
    this.peerConnection.stopVideoTracks();
  }

  // Reset video state but keep peer connection and signaling connected
  this.videoStarted = false;
}
```

**Mobile Code** (connection.ts):
```typescript
stopVideoTracks(): void {
  console.log('[PeerConnection] Stopping video tracks only (keeping data channel)');

  // Stop and remove local video/audio tracks from peer connection
  if (this.localStream && this.pc) {
    this.localStream.getTracks().forEach((track) => {
      track.stop();
      // Remove track from peer connection
      const senders = (this.pc as any).getSenders?.();
      if (senders) {
        senders.forEach((sender: any) => {
          if (sender.track === track) {
            (this.pc as any).removeTrack?.(sender);
          }
        });
      }
    });
    this.localStream = null;
  }

  // Clear remote stream reference (remote will stop their tracks too)
  this.remoteStream = null;

  // Reset media state only (NOT connection state or data channel)
  useConnectionStore.getState().setLocalMedia(false, false);
  useConnectionStore.getState().setRemoteMedia(false, false);
}
```

**Key Differences**:
1. Both platforms: Keep peer connection and DataChannel alive
2. Mobile: Has dedicated `stopVideoTracks()` method in PeerConnection class
3. Browser: Resets call state UI (`setCallState('idle')`)
4. Mobile: Uses connection store to track media state separately from connection state
5. Both: Notify peer via "end" action in "call" protocol

---

### 12. Session End / Cleanup

#### Browser Flow
```
Session expires or user ends session
  └─> endSession()
      ├─> Stop all media tracks
      ├─> Close DataChannel
      ├─> Close peer connection
      ├─> Close WebSocket
      ├─> Clear all refs and state
      ├─> Navigate away or show session ended UI
      └─> Remove from localStorage (session key)
```

**Browser Code** (session-view.tsx):
```typescript
const endSession = async () => {
  setEndSessionLoading(true);

  try {
    // Notify backend
    await fetch(apiUrl(`/api/sessions/${token}/end`, language), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId }),
    });

    // Cleanup WebRTC resources
    const localStream = localStreamRef.current;
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    const channel = dataChannelRef.current;
    if (channel) {
      channel.close();
      dataChannelRef.current = null;
    }

    const pc = peerConnectionRef.current;
    if (pc) {
      pc.close();
      peerConnectionRef.current = null;
    }

    const socket = socketRef.current;
    if (socket) {
      socket.close(1000, 'Session ended');
      socketRef.current = null;
    }

    // Clear encryption
    encryptionKeyRef.current = null;
    encryptionPromiseRef.current = null;

    // Mark session as ended
    setSessionEnded(true);
    localStorage.setItem(`chatorbit:session:${token}:ended`, 'true');

    router.push('/');
  } catch (error) {
    console.error('Failed to end session', error);
  } finally {
    setEndSessionLoading(false);
  }
};
```

#### Mobile Flow
```
Session expires or user ends session
  └─> webrtcManager.endSession()
      └─> cleanup()
          ├─> Close peer connection
          │   └─> peerConnection.close()
          │       ├─> Close DataChannel
          │       ├─> Stop all media tracks
          │       ├─> Close RTCPeerConnection
          │       └─> Reset connection store state
          ├─> Disconnect signaling
          │   └─> signaling.disconnect()
          │       ├─> Close WebSocket (code 1000)
          │       ├─> Clear message handlers
          │       └─> Reset signaling state
          ├─> Clear messages store
          ├─> Clear session data (token, participantId, etc.)
          └─> Reset all flags and state
```

**Mobile Code** (manager.ts):
```typescript
async endSession(): Promise<void> {
  console.log('[WebRTC] Ending session');
  await this.cleanup();
}

private async cleanup(): Promise<void> {
  // Close peer connection
  if (this.peerConnection) {
    this.peerConnection.close();
    this.peerConnection = null;
  }

  // Disconnect signaling
  this.signaling.disconnect();

  // Clear messages when session ends
  useMessagesStore.getState().clearMessages();

  // Clear session data
  this.token = null;
  this.participantId = null;
  this.isInitiator = false;
  this.videoStarted = false;
  this.signalingInitialized = false;
  this.peerConnectionInitialized = false;
  this.pendingIceCandidates = [];
  this.isProcessingOffer = false;
  this.videoAcceptHandled = false;
  this.onVideoInvite = undefined;
  this.onVideoEnded = undefined;
  this.onSessionEnded = undefined;
  this.onVideoAccepted = undefined;
}
```

**Mobile Code** (connection.ts):
```typescript
close(): void {
  console.log('[PeerConnection] Closing');

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

  // Reset state
  useConnectionStore.getState().resetConnection();
}
```

**Key Differences**:
1. Browser: Makes HTTP request to `/api/sessions/:token/end`
2. Mobile: Cleanup is entirely client-side (backend handles via WebSocket close)
3. Mobile: Clears Zustand stores (messages, connection, session)
4. Browser: Saves session end state to localStorage
5. Browser: Navigates to home page, Mobile: Returns to accept screen

---

## Cross-Platform Compatibility

### Browser-to-Mobile Communication

The implementations are **highly compatible** due to deliberate protocol alignment:

#### 1. DataChannel Message Format

Both platforms use the same "call" protocol for video operations:

```typescript
// Video invite
{ type: 'call', action: 'request', from: participantId }

// Video accept
{ type: 'call', action: 'accept', from: participantId }

// Video end
{ type: 'call', action: 'end', from: participantId }

// Renegotiation request (mobile → browser)
{ type: 'call', action: 'renegotiate' }
```

#### 2. Text Message Format

Mobile sends **browser-compatible** message format:

```typescript
{
  type: 'message',
  message: {
    sessionId: token,
    messageId: string,
    participantId: string,
    role: 'host' | 'guest',
    createdAt: ISO8601 timestamp,
    encryptedContent: base64 string,
    hash: string, // Optional, mobile sends empty string
    encryption: 'aes-gcm',
  }
}
```

Browser also accepts simplified mobile format:

```typescript
{
  type: 'message',
  payload: base64 encrypted string,
  messageId: string,
  timestamp: number,
}
```

#### 3. Signaling Message Format

Both use WebSocket with same protocol:

```typescript
{
  type: 'signal',
  signalType: 'offer' | 'answer' | 'ice-candidate' | 'iceCandidate' | 'message' | 'video-invite' | 'video-accept' | 'video-end',
  payload: any,
  participantId: string,
}
```

**Note**: Browser sends `iceCandidate` (camelCase), mobile accepts both `ice-candidate` and `iceCandidate`.

### Known Compatibility Quirks

1. **ACK Messages**: Browser sends ACK for received messages, mobile does not
   - Impact: Browser expects ACK for delivery confirmation, mobile marks sent immediately
   - Workaround: Browser gracefully handles missing ACK

2. **Hash Verification**: Browser optionally verifies message hash, mobile skips it
   - Impact: None (browser also skips if hash is empty string)

3. **Track Event Streams**: Mobile handles missing `streams` array in track event, browser assumes present
   - Impact: Mobile is more robust for renegotiation scenarios

4. **Offer Collision**: Both implement rollback, but mobile has additional guard flag
   - Impact: Mobile more defensive against race conditions

---

## Signaling Message Flow Diagrams

### Text Chat Connection (Host Initiates)

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│  HOST   │                    │ BACKEND │                    │  GUEST  │
│(Browser)│                    │(FastAPI)│                    │(Mobile) │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │  WebSocket Connect           │                              │
     ├─────────────────────────────>│                              │
     │  (token, participantId)      │                              │
     │                              │                              │
     │         WebSocket Connect    │  WebSocket Connect           │
     │<─────────────────────────────┤<─────────────────────────────┤
     │         (Ack)                │  (token, participantId)      │
     │                              │                              │
     │                              │  Status Update               │
     │<─────────────────────────────┤─────────────────────────────>│
     │  (status: active,            │  (status: active,            │
     │   connected_participants: 2) │   connected_participants: 2) │
     │                              │                              │
     │  Create RTCPeerConnection    │                              │
     ├──────────────────────┐       │                              │
     │  Create DataChannel  │       │                              │
     │  createOffer()       │       │                              │
     │<─────────────────────┘       │                              │
     │                              │                              │
     │  Signal: offer               │                              │
     ├─────────────────────────────>│─────────────────────────────>│
     │  { type: 'signal',           │  { type: 'signal',           │
     │    signalType: 'offer',      │    signalType: 'offer',      │
     │    payload: {sdp, type} }    │    payload: {sdp, type} }    │
     │                              │                              │
     │                              │  Create RTCPeerConnection    │
     │                              │  setRemoteDescription(offer) │
     │                              │  createAnswer()              │
     │                              │                         ┌────┤
     │                              │                         └───>│
     │                              │                              │
     │  Signal: answer              │  Signal: answer              │
     │<─────────────────────────────┤<─────────────────────────────┤
     │  { type: 'signal',           │  { type: 'signal',           │
     │    signalType: 'answer',     │    signalType: 'answer',     │
     │    payload: {sdp, type} }    │    payload: {sdp, type} }    │
     │                              │                              │
     │  setRemoteDescription()      │                              │
     ├──────────────────┐           │                              │
     │<─────────────────┘           │                              │
     │                              │                              │
     │  ICE Candidate Exchange      │  ICE Candidate Exchange      │
     │<════════════════════════════>│<════════════════════════════>│
     │  (Multiple candidates)       │  (Multiple candidates)       │
     │                              │                              │
     │  DataChannel Open            │  DataChannel Open            │
     │<─────────────────────────────┼─────────────────────────────>│
     │  (Direct P2P connection)     │                              │
     │                              │                              │
     │  Capabilities Announcement   │                              │
     │─────────────────────────────────────────────────────────────>│
     │  { type: 'capabilities',     │                              │
     │    encryption: 'aes-gcm' }   │                              │
     │                              │                              │
     │  Text Chat Messages          │                              │
     │<═════════════════════════════════════════════════════════════>│
     │  (via DataChannel)           │                              │
     │                              │                              │
```

### Video Invite Flow (Browser Initiates)

```
┌─────────┐                                                     ┌─────────┐
│ BROWSER │                                                     │ MOBILE  │
│  HOST   │                                                     │  GUEST  │
└────┬────┘                                                     └────┬────┘
     │                                                               │
     │  (DataChannel already open for text chat)                    │
     │<══════════════════════════════════════════════════════════════│
     │                                                               │
     │  User clicks "Start Call"                                    │
     ├───────────┐                                                  │
     │ getUserMedia({video, audio})                                 │
     │ addTrack() to peer connection                                │
     │<──────────┘                                                  │
     │                                                               │
     │  DataChannel: Video Invite                                   │
     ├──────────────────────────────────────────────────────────────>│
     │  { type: 'call', action: 'request', from: hostId }           │
     │                                                               │
     │                                                User sees modal
     │                                                "Incoming call"
     │                                                          ┌────┤
     │                                                          └───>│
     │                                                               │
     │  DataChannel: Video Accept                                   │
     │<──────────────────────────────────────────────────────────────┤
     │  { type: 'call', action: 'accept', from: guestId }           │
     │                                                               │
     │  onnegotiationneeded fires                                   │
     ├───────────┐                                                  │
     │ createOffer() (with video tracks)                            │
     │ setLocalDescription()                                        │
     │<──────────┘                                                  │
     │                                                               │
     │  Signal: offer                                               │
     ├──────────────────────────────────────────────────────────────>│
     │  { type: 'signal', signalType: 'offer', payload: {sdp} }     │
     │                                                               │
     │                                                setRemoteDescription()
     │                                                createAnswer()
     │                                                getUserMedia()
     │                                                addTrack()
     │                                                          ┌────┤
     │                                                          └───>│
     │                                                               │
     │  Signal: answer                                              │
     │<──────────────────────────────────────────────────────────────┤
     │  { type: 'signal', signalType: 'answer', payload: {sdp} }    │
     │                                                               │
     │  setRemoteDescription()                                      │
     ├───────────┐                                                  │
     │<──────────┘                                                  │
     │                                                               │
     │  ontrack event fires (remote video)                          │
     ├───────────┐                                                  │
     │ Display remote video                                         │
     │<──────────┘                                                  │
     │                                                               │
     │  Video Streams (bidirectional)                               │
     │<══════════════════════════════════════════════════════════════>│
     │                                                               │
```

### Video Invite Flow (Mobile Initiates)

```
┌─────────┐                                                     ┌─────────┐
│ MOBILE  │                                                     │ BROWSER │
│  HOST   │                                                     │  GUEST  │
└────┬────┘                                                     └────┬────┘
     │                                                               │
     │  (DataChannel already open for text chat)                    │
     │<══════════════════════════════════════════════════════════════│
     │                                                               │
     │  User taps camera button                                     │
     ├───────────┐                                                  │
     │ getUserMedia({video, audio})                                 │
     │ addTrack() to peer connection                                │
     │<──────────┘                                                  │
     │                                                               │
     │  DataChannel: Video Invite                                   │
     ├──────────────────────────────────────────────────────────────>│
     │  { type: 'call', action: 'request', from: hostId }           │
     │                                                               │
     │                                                User sees modal
     │                                                "Incoming call"
     │                                                          ┌────┤
     │                                                          └───>│
     │                                                               │
     │  DataChannel: Video Accept                                   │
     │<──────────────────────────────────────────────────────────────┤
     │  { type: 'call', action: 'accept', from: guestId }           │
     │                                                               │
     │  handleVideoAccept() fires                                   │
     ├───────────┐                                                  │
     │ createOffer() (explicit renegotiation)                       │
     │ setLocalDescription()                                        │
     │<──────────┘                                                  │
     │                                                               │
     │  Signal: offer                                               │
     ├──────────────────────────────────────────────────────────────>│
     │  { type: 'signal', signalType: 'offer', payload: {sdp} }     │
     │                                                               │
     │                                                setRemoteDescription()
     │                                                createAnswer()
     │                                                getUserMedia()
     │                                                addTrack()
     │                                                          ┌────┤
     │                                                          └───>│
     │                                                               │
     │  Signal: answer                                              │
     │<──────────────────────────────────────────────────────────────┤
     │  { type: 'signal', signalType: 'answer', payload: {sdp} }    │
     │                                                               │
     │  setRemoteDescription()                                      │
     ├───────────┐                                                  │
     │<──────────┘                                                  │
     │                                                               │
     │  ontrack event fires (remote video)                          │
     ├───────────┐                                                  │
     │ Display remote video                                         │
     │<──────────┘                                                  │
     │                                                               │
     │  Video Streams (bidirectional)                               │
     │<══════════════════════════════════════════════════════════════>│
     │                                                               │
```

---

## Key Differences Summary Table

| Aspect | Browser (Next.js) | Mobile (React Native) |
|--------|------------------|----------------------|
| **Architecture** | Monolithic component (~4000 lines) | Modular classes (Manager, Connection, Signaling) |
| **State Management** | Component state + refs | Zustand stores + class properties |
| **ICE Server Config** | Advanced sanitization (IPv6 link-local filtering) | Simple env-based defaults |
| **Offer Collision** | Rollback pattern | Rollback + processing flag guard |
| **ICE Candidate Queue** | Single queue (remote desc check) | Two-layer queue (signaling + remote desc) |
| **DataChannel Timeout** | Adaptive (10-20s based on network) | Not implemented |
| **Message Format** | Single format | Dual format (browser-compatible + mobile-optimized) |
| **ACK Messages** | Sends and expects ACK | Does not send ACK |
| **Video Renegotiation** | Automatic (`onnegotiationneeded`) | Explicit (`handleVideoAccept()`) |
| **Guest Renegotiation** | Not supported | Sends "renegotiate" action to host |
| **Track Event Handling** | Assumes `streams` array present | Handles missing `streams` (renegotiation edge case) |
| **Offer Processing** | Uses `deferredOffersRef` for unstable states | Uses `isProcessingOffer` flag |
| **Initialization** | Lazy (on demand) | Guarded (explicit flags to prevent re-init) |
| **Error Recovery** | Complex retry logic with ICE restart | Exponential backoff reconnection |
| **Debug Mode** | Secret keyword "orbitdebug" + stats panel | Console logging only |
| **Session End** | HTTP POST + localStorage + navigate | Client-side cleanup + close WebSocket |

---

## Recommendations

### 1. **Align Renegotiation Strategy**

**Issue**: Browser uses automatic `onnegotiationneeded`, mobile uses explicit `handleVideoAccept()`.

**Recommendation**:
- Add `onnegotiationneeded` listener to mobile's PeerConnection class
- Keep explicit call as fallback for browser compatibility
- This reduces code duplication and aligns with WebRTC standards

**Proposed Mobile Code**:
```typescript
// In connection.ts
pc.addEventListener('negotiationneeded', async () => {
  console.log('[PeerConnection] Negotiation needed');
  if (this.negotiationCallback) {
    await this.negotiationCallback();
  }
});

// Expose callback registration
onNegotiationNeeded(callback: () => Promise<void>): void {
  this.negotiationCallback = callback;
}
```

### 2. **Implement ACK Messages on Mobile**

**Issue**: Browser sends ACK, mobile doesn't. This creates asymmetric protocol.

**Recommendation**:
- Mobile should send ACK when receiving messages via DataChannel
- Update mobile's `handleDataChannelMessage` to send ACK after successful decryption

**Proposed Mobile Code**:
```typescript
// In manager.ts
case 'message':
  if (this.token && payload) {
    await decryptAndAddMessage(token, payload, messageId, timestamp);

    // Send ACK
    if (this.peerConnection) {
      this.peerConnection.sendRawMessage({
        type: 'ack',
        messageId: messageId,
      });
    }
  }
  break;
```

### 3. **Add DataChannel Timeout to Mobile**

**Issue**: Browser has adaptive timeout (10-20s) for DataChannel establishment, mobile doesn't.

**Recommendation**:
- Add timeout handling in mobile's `initializePeerConnectionForText()`
- Schedule recovery if DataChannel doesn't open within timeout

**Proposed Mobile Code**:
```typescript
// In manager.ts
private async initializePeerConnectionForText(): Promise<void> {
  // ... existing code ...

  // Set timeout for DataChannel establishment
  const timeout = setTimeout(() => {
    if (!this.dataChannelReady) {
      console.error('[WebRTC] DataChannel failed to open within timeout');
      // Trigger recovery
      this.cleanup();
      this.initializeSignaling(this.token!, this.participantId!, this.isInitiator);
    }
  }, 15000); // 15 seconds

  this.peerConnection.onDataChannelOpen(() => {
    clearTimeout(timeout);
    this.dataChannelReady = true;
    // ... existing handler logic ...
  });
}
```

### 4. **Unified Message Format**

**Issue**: Mobile uses dual format (browser-compatible + mobile-optimized), browser uses single format.

**Recommendation**:
- Standardize on browser-compatible format for all messages
- Remove mobile-optimized format to reduce complexity
- This simplifies debugging and ensures full compatibility

### 5. **Improve Error Recovery Parity**

**Issue**: Browser has complex ICE restart logic, mobile has simple reconnection.

**Recommendation**:
- Port browser's ICE restart logic to mobile (handle `iceConnectionState: 'failed'`)
- Add connection state monitoring in mobile's PeerConnection class
- Implement progressive recovery: ICE restart → peer connection reset → full reconnection

**Proposed Mobile Code**:
```typescript
// In connection.ts
pc.addEventListener('iceconnectionstatechange', () => {
  const state = this.pc?.iceConnectionState;

  if (state === 'failed') {
    console.log('[PeerConnection] ICE connection failed - attempting restart');
    if (this.onIceConnectionFailed) {
      this.onIceConnectionFailed();
    }
  }
});
```

### 6. **Extract WebRTC Logic from Browser Component**

**Issue**: Browser has all WebRTC logic embedded in 4000-line SessionView component.

**Recommendation**:
- Create modular classes similar to mobile architecture
- Extract into `lib/webrtc/` directory with Manager, Connection, Signaling classes
- Keep SessionView as UI-only component
- This improves testability, maintainability, and code reuse

**Proposed Structure**:
```
frontend/lib/webrtc/
  ├── manager.ts         # High-level orchestration
  ├── connection.ts      # RTCPeerConnection wrapper
  ├── signaling.ts       # WebSocket signaling
  ├── encryption.ts      # AES-GCM encryption helpers
  └── types.ts           # TypeScript types
```

### 7. **Document Protocol Specification**

**Issue**: Cross-platform compatibility relies on implicit knowledge of message formats.

**Recommendation**:
- Create `/docs/WEBRTC_PROTOCOL.md` with:
  - All message formats (DataChannel + Signaling)
  - Call flow sequences (text chat, video invite, etc.)
  - Error handling expectations
  - Version compatibility matrix
- This serves as single source of truth for both platforms

---

## Testing Recommendations

### Cross-Platform Compatibility Tests

1. **Browser → Mobile Video Call**
   - Browser initiates, mobile accepts
   - Verify bidirectional video/audio
   - Test message exchange during call
   - Verify stop video keeps text chat

2. **Mobile → Browser Video Call**
   - Mobile initiates, browser accepts
   - Verify renegotiation works correctly
   - Test "renegotiate" action handling

3. **Message Delivery**
   - Send from browser, receive on mobile
   - Send from mobile, receive on browser
   - Verify encryption/decryption
   - Check ACK handling

4. **Reconnection Scenarios**
   - Network interruption during text chat
   - Network interruption during video call
   - WebSocket disconnect/reconnect
   - ICE connection failure recovery

5. **Offer Collision (Glare)**
   - Both peers create offer simultaneously
   - Verify rollback mechanism works
   - Check that one peer backs off correctly

### Automated E2E Tests

**Proposed Test Framework**:
- Playwright for browser automation
- Detox for mobile automation
- Shared test scenarios in `/e2e/webrtc/`

**Example Test**:
```typescript
test('Browser-to-Mobile video call', async () => {
  // Setup: Join session on both devices
  await browser.joinSession(token);
  await mobile.joinSession(token);

  // Browser initiates video call
  await browser.click('[data-test="start-call"]');

  // Mobile receives invite
  await mobile.waitFor('[data-test="incoming-call"]');
  await mobile.click('[data-test="accept-call"]');

  // Verify video streams established
  await expect(browser.locator('[data-test="remote-video"]')).toHaveAttribute('srcObject', /.+/);
  await expect(mobile.locator('[data-test="remote-video"]')).toHaveAttribute('srcObject', /.+/);

  // Test message during call
  await browser.type('[data-test="message-input"]', 'Hello from browser');
  await browser.click('[data-test="send-message"]');
  await expect(mobile.locator('[data-test="messages"]')).toContainText('Hello from browser');

  // Stop video
  await browser.click('[data-test="end-call"]');
  await expect(mobile.locator('[data-test="remote-video"]')).not.toBeVisible();

  // Verify text chat still works
  await mobile.type('[data-test="message-input"]', 'Chat still works');
  await mobile.click('[data-test="send-message"]');
  await expect(browser.locator('[data-test="messages"]')).toContainText('Chat still works');
});
```

---

## Conclusion

Both platforms implement WebRTC communication with a **chat-first, video-optional** paradigm and maintain **strong cross-platform compatibility** through aligned protocols. The main differences lie in architecture (monolithic vs modular) and implementation details (automatic vs explicit renegotiation, ACK handling, error recovery).

**Strengths**:
- Both follow Perfect Negotiation pattern for offer collision handling
- DataChannel protocol is well-aligned ("call" actions)
- Message encryption is consistent (AES-GCM)
- Both support stopping video while keeping text chat

**Areas for Improvement**:
1. Extract browser WebRTC logic into modular classes (improve maintainability)
2. Align renegotiation strategy (use `onnegotiationneeded` on mobile)
3. Implement ACK messages on mobile (symmetric protocol)
4. Add DataChannel timeout to mobile (match browser resilience)
5. Create protocol specification document (single source of truth)
6. Implement automated cross-platform E2E tests

By addressing these recommendations, the ChatOrbit platform can achieve even tighter integration, improved reliability, and easier long-term maintenance of its real-time communication features.
