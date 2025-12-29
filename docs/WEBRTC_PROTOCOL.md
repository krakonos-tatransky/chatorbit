# WebRTC Protocol Specification

## Overview

This document defines the WebRTC communication protocol used in ChatOrbit for cross-platform (Browser ↔ Mobile) real-time communication. The protocol supports a **chat-first, video-optional** paradigm where:

1. Text chat connection is established first via WebRTC DataChannel
2. Video/audio is optionally initiated later via user action
3. Video can be stopped while keeping text chat active

## Version

**Current Version**: 1.0
**Last Updated**: December 2024
**Compatibility**: Browser (Next.js) ↔ Mobile (React Native)

---

## Transport Layers

### 1. WebSocket Signaling

WebSocket connection for SDP offer/answer exchange, ICE candidates, and control messages.

**Endpoint**: `ws://{baseUrl}/ws/sessions/{token}?participantId={participantId}`

**Message Format**:
```typescript
interface SignalingMessage {
  type: 'signal' | 'status' | 'message' | 'session-ended' | 'error';
  signalType?: 'offer' | 'answer' | 'ice-candidate' | 'iceCandidate' | 'message' | 'video-invite' | 'video-accept' | 'video-end';
  payload?: any;
  participantId?: string;
}
```

### 2. WebRTC DataChannel

Peer-to-peer encrypted communication for text messages and video call control.

**Channel Label**: `'chat'`
**Channel Config**: `{ ordered: true }`

---

## Message Types

### A. Signaling Messages (WebSocket)

#### 1. Offer/Answer Exchange

**Offer Message**:
```json
{
  "type": "signal",
  "signalType": "offer",
  "payload": {
    "type": "offer",
    "sdp": "v=0\r\no=- ..."
  }
}
```

**Answer Message**:
```json
{
  "type": "signal",
  "signalType": "answer",
  "payload": {
    "type": "answer",
    "sdp": "v=0\r\no=- ..."
  }
}
```

**Notes**:
- Browser and mobile both use `RTCSessionDescriptionInit` format
- Mobile sets `offerToReceiveAudio: true, offerToReceiveVideo: true` for bidirectional support

#### 2. ICE Candidate Exchange

**Browser Format** (camelCase):
```json
{
  "type": "signal",
  "signalType": "iceCandidate",
  "payload": {
    "candidate": "candidate:...",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  }
}
```

**Mobile Format** (kebab-case):
```json
{
  "type": "signal",
  "signalType": "ice-candidate",
  "payload": {
    "candidate": "candidate:...",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  }
}
```

**Compatibility**: Both platforms accept both formats.

#### 3. Session Status Updates

```json
{
  "type": "status",
  "status": "active" | "waiting" | "ended",
  "connected_participants": ["participant_id_1", "participant_id_2"],
  "remaining_seconds": 3600
}
```

**Triggers**:
- Sent by backend when participant joins/leaves
- When both participants connected, triggers peer connection initialization

#### 4. Session Ended

```json
{
  "type": "session-ended",
  "reason": "timeout" | "ended_by_participant" | "error"
}
```

---

### B. DataChannel Messages (P2P)

#### 1. Text Chat Messages

**Format** (Browser-compatible):
```json
{
  "type": "message",
  "message": {
    "sessionId": "token_abc123",
    "messageId": "uuid-v4",
    "participantId": "participant_id",
    "role": "host" | "guest",
    "createdAt": "2024-12-28T10:30:00.000Z",
    "encryptedContent": "base64_encrypted_payload",
    "hash": "",
    "encryption": "aes-gcm"
  }
}
```

**Encryption**:
- Algorithm: AES-GCM
- Key derivation: SHA-256 hash of session token
- IV: Random 12 bytes, prepended to ciphertext
- Format: `base64(iv + ciphertext + authTag)`

**Legacy Mobile Format** (deprecated but still accepted):
```json
{
  "type": "message",
  "payload": "base64_encrypted_payload",
  "messageId": "uuid-v4",
  "timestamp": 1703761800000
}
```

#### 2. Message Acknowledgment

```json
{
  "type": "ack",
  "messageId": "uuid-v4"
}
```

**Behavior**:
- Browser: Sends ACK after receiving and decrypting message
- Mobile: **Now sends ACK** (as of v2, Recommendation #2 implemented)
- Used for delivery confirmation and UI state updates

#### 3. Video Call Control Messages

**Video Invite**:
```json
{
  "type": "call",
  "action": "request",
  "from": "participant_id"
}
```

**Video Accept**:
```json
{
  "type": "call",
  "action": "accept",
  "from": "participant_id"
}
```

**Video Reject**:
```json
{
  "type": "call",
  "action": "reject",
  "from": "participant_id"
}
```

**Video End**:
```json
{
  "type": "call",
  "action": "end",
  "from": "participant_id"
}
```

**Renegotiation Request** (mobile guest → browser host):
```json
{
  "type": "call",
  "action": "renegotiate"
}
```

#### 4. Capabilities Announcement

```json
{
  "type": "capabilities",
  "encryption": "aes-gcm"
}
```

**Sent by**: Browser when DataChannel opens
**Purpose**: Announce supported features to peer

---

## Connection Flow Sequences

### 1. Text Chat Connection (Host Initiates)

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│  HOST   │                    │ BACKEND │                    │  GUEST  │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │  1. WebSocket Connect        │                              │
     ├─────────────────────────────>│                              │
     │  ?participantId=host123      │                              │
     │                              │                              │
     │                              │  2. WebSocket Connect        │
     │                              │<─────────────────────────────┤
     │                              │  ?participantId=guest456     │
     │                              │                              │
     │  3. Status: active (2 participants)                         │
     │<─────────────────────────────┤─────────────────────────────>│
     │                              │                              │
     │  4. Create RTCPeerConnection │                              │
     │  5. Create DataChannel       │                              │
     │  6. createOffer()            │                              │
     ├──────────────────┐           │                              │
     │<─────────────────┘           │                              │
     │                              │                              │
     │  7. Signal: offer            │                              │
     ├─────────────────────────────>│─────────────────────────────>│
     │                              │                              │
     │                              │  8. Create RTCPeerConnection │
     │                              │  9. setRemoteDescription()   │
     │                              │  10. createAnswer()          │
     │                              │                         ┌────┤
     │                              │                         └───>│
     │                              │                              │
     │  11. Signal: answer          │  Signal: answer              │
     │<─────────────────────────────┤<─────────────────────────────┤
     │                              │                              │
     │  12. setRemoteDescription()  │                              │
     ├──────────────────┐           │                              │
     │<─────────────────┘           │                              │
     │                              │                              │
     │  13. ICE Candidate Exchange (multiple)                      │
     │<════════════════════════════>│<════════════════════════════>│
     │                              │                              │
     │  14. DataChannel Open (P2P)                                 │
     │<═══════════════════════════════════════════════════════════>│
     │                              │                              │
     │  15. Capabilities            │                              │
     │─────────────────────────────────────────────────────────────>│
     │                              │                              │
     │  16. Text Messages (Encrypted)                              │
     │<═══════════════════════════════════════════════════════════>│
     │                              │                              │
```

### 2. Video Invite Flow (Browser → Mobile)

```
┌─────────┐                                                     ┌─────────┐
│ BROWSER │                                                     │ MOBILE  │
└────┬────┘                                                     └────┬────┘
     │                                                               │
     │  (DataChannel already open for text chat)                    │
     │<══════════════════════════════════════════════════════════════│
     │                                                               │
     │  1. User clicks "Start Video"                                │
     ├───────────┐                                                  │
     │  getUserMedia({video, audio})                                │
     │  addTrack(track, stream) for each track                      │
     │<──────────┘                                                  │
     │                                                               │
     │  2. DataChannel: Video Invite                                │
     ├──────────────────────────────────────────────────────────────>│
     │  { type: 'call', action: 'request', from: browserId }        │
     │                                                               │
     │                                                User sees modal
     │                                                "Incoming call"
     │                                                          ┌────┤
     │                                                          └───>│
     │                                                               │
     │  3. DataChannel: Video Accept                                │
     │<──────────────────────────────────────────────────────────────┤
     │  { type: 'call', action: 'accept', from: mobileId }          │
     │                                                               │
     │  4. onnegotiationneeded fires                                │
     ├───────────┐                                                  │
     │  createOffer() (includes video tracks)                       │
     │  setLocalDescription(offer)                                  │
     │<──────────┘                                                  │
     │                                                               │
     │  5. Signal: offer                                            │
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
     │  6. Signal: answer                                           │
     │<──────────────────────────────────────────────────────────────┤
     │  { type: 'signal', signalType: 'answer', payload: {sdp} }    │
     │                                                               │
     │  7. setRemoteDescription()                                   │
     ├───────────┐                                                  │
     │<──────────┘                                                  │
     │                                                               │
     │  8. ontrack events fire (remote video/audio)                 │
     ├───────────┐                                                  │
     │  Display remote stream                                       │
     │<──────────┘                                                  │
     │                                                               │
     │  9. Video Streams (bidirectional P2P)                        │
     │<══════════════════════════════════════════════════════════════>│
     │                                                               │
```

### 3. Video Invite Flow (Mobile → Browser)

```
┌─────────┐                                                     ┌─────────┐
│ MOBILE  │                                                     │ BROWSER │
└────┬────┘                                                     └────┬────┘
     │                                                               │
     │  (DataChannel already open for text chat)                    │
     │<══════════════════════════════════════════════════════════════│
     │                                                               │
     │  1. User taps camera button                                  │
     ├───────────┐                                                  │
     │  getUserMedia({video, audio})                                │
     │  addTrack(track, stream) for each track                      │
     │<──────────┘                                                  │
     │                                                               │
     │  2. DataChannel: Video Invite                                │
     ├──────────────────────────────────────────────────────────────>│
     │  { type: 'call', action: 'request', from: mobileId }         │
     │                                                               │
     │                                                User sees modal
     │                                                "Incoming call"
     │                                                          ┌────┤
     │                                                          └───>│
     │                                                               │
     │  3. DataChannel: Video Accept                                │
     │<──────────────────────────────────────────────────────────────┤
     │  { type: 'call', action: 'accept', from: browserId }         │
     │                                                               │
     │  4. handleVideoAccept() fires                                │
     ├───────────┐                                                  │
     │  createOffer() (explicit renegotiation)                      │
     │  setLocalDescription(offer)                                  │
     │<──────────┘                                                  │
     │                                                               │
     │  5. Signal: offer                                            │
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
     │  6. Signal: answer                                           │
     │<──────────────────────────────────────────────────────────────┤
     │  { type: 'signal', signalType: 'answer', payload: {sdp} }    │
     │                                                               │
     │  7. setRemoteDescription()                                   │
     ├───────────┐                                                  │
     │<──────────┘                                                  │
     │                                                               │
     │  8. ontrack events fire (remote video/audio)                 │
     ├───────────┐                                                  │
     │  Display remote stream                                       │
     │<──────────┘                                                  │
     │                                                               │
     │  9. Video Streams (bidirectional P2P)                        │
     │<══════════════════════════════════════════════════════════════>│
     │                                                               │
```

**Key Difference**: Mobile uses explicit renegotiation in `handleVideoAccept()`, while browser relies on `onnegotiationneeded` event.

### 4. Stopping Video (Keeping Text Chat)

```
┌─────────┐                                                     ┌─────────┐
│  USER A │                                                     │  USER B │
└────┬────┘                                                     └────┬────┘
     │                                                               │
     │  (Video call active, DataChannel open)                       │
     │<══════════════════════════════════════════════════════════════│
     │                                                               │
     │  1. User clicks "End Call"                                   │
     ├───────────┐                                                  │
     │  Stop local tracks (track.stop())                            │
     │  Remove tracks from peer connection                          │
     │<──────────┘                                                  │
     │                                                               │
     │  2. DataChannel: Video End                                   │
     ├──────────────────────────────────────────────────────────────>│
     │  { type: 'call', action: 'end', from: userAId }              │
     │                                                               │
     │                                                Stop remote tracks
     │                                                Clear video UI
     │                                                          ┌────┤
     │                                                          └───>│
     │                                                               │
     │  3. Text Messages Continue (P2P via DataChannel)             │
     │<══════════════════════════════════════════════════════════════>│
     │  (Peer connection and DataChannel remain open)               │
     │                                                               │
```

**Important**: Peer connection is NOT closed, only video/audio tracks are stopped.

---

## Error Handling

### 1. Offer Collision (Glare)

**Scenario**: Both peers send offer simultaneously.

**Resolution** (Perfect Negotiation Pattern):
```typescript
if (pc.signalingState === 'have-local-offer') {
  // Rollback our local offer
  await pc.setLocalDescription({ type: 'rollback' });
  // Then accept remote offer
  await pc.setRemoteDescription(remoteOffer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  sendSignal('answer', answer);
}
```

**Implemented in**: Both browser and mobile.

### 2. ICE Connection Failure

**Browser Behavior**:
- Monitors `iceConnectionState: 'failed'`
- Triggers ICE restart by creating new offer
- Falls back to full peer connection reset if ICE restart fails

**Mobile Behavior** (as of Recommendation #5):
- Monitors `iceConnectionState: 'failed'`
- Calls `attemptIceRestart()` which creates new offer
- Falls back to `resetPeerConnection()` if restart fails
- Progressive recovery: ICE restart → full reconnection

### 3. DataChannel Timeout

**Browser**: 10-20 seconds adaptive timeout (based on network type)
**Mobile**: 15 seconds fixed timeout (as of Recommendation #3)

**Recovery**: Triggers peer connection recovery if DataChannel doesn't open.

### 4. WebSocket Reconnection

**Both platforms** use exponential backoff:
- Initial delay: 1000ms
- Max delay: 30000ms (30s)
- Max attempts: 5
- Resolves stuck "sending" messages on reconnect

---

## Platform-Specific Differences

### 1. Renegotiation Strategy

| Platform | Strategy | Implementation |
|----------|----------|----------------|
| **Browser** | Automatic | `onnegotiationneeded` event fires when tracks added |
| **Mobile** | Automatic + Explicit | `onnegotiationneeded` event (as of Recommendation #1) + explicit `handleVideoAccept()` as fallback |

### 2. Message Acknowledgment

| Platform | Sends ACK | Expects ACK |
|----------|-----------|-------------|
| **Browser** | Yes | Yes (for delivery confirmation) |
| **Mobile** | Yes (as of v2) | Yes |

### 3. ICE Server Configuration

**Browser**:
- Advanced sanitization (removes localhost, 0.0.0.0, IPv6 link-local)
- Parses from `NEXT_PUBLIC_WEBRTC_ICE_SERVERS` or individual vars

**Mobile**:
- Simple env-based defaults
- Parses from `EXPO_PUBLIC_WEBRTC_STUN_URLS` / `EXPO_PUBLIC_WEBRTC_TURN_URLS`

---

## Compatibility Matrix

| Feature | Browser v1 | Mobile v1 | Mobile v2 |
|---------|------------|-----------|-----------|
| Text chat via DataChannel | ✅ | ✅ | ✅ |
| Video invite/accept | ✅ | ✅ | ✅ |
| Stop video (keep chat) | ✅ | ✅ | ✅ |
| ACK messages | ✅ Send + Receive | ❌ Receive only | ✅ Send + Receive |
| Browser-compatible format | ✅ | ⚠️ Dual format | ✅ Unified format |
| DataChannel timeout | ✅ 10-20s | ❌ | ✅ 15s |
| ICE restart | ✅ | ❌ | ✅ |
| negotiationneeded event | ✅ | ❌ | ✅ |
| Renegotiate action | ❌ | ✅ | ✅ |

**Legend**:
- ✅ Fully supported
- ⚠️ Partially supported
- ❌ Not supported

---

## Security

### End-to-End Encryption

**Algorithm**: AES-GCM (256-bit)
**Key Derivation**: `SHA-256(session_token)`
**IV**: Random 12 bytes per message
**Authentication**: Built-in to AES-GCM

**Message Format**:
```
Encrypted = base64( IV (12 bytes) + Ciphertext + Auth Tag (16 bytes) )
```

**Key Points**:
- Session token acts as pre-shared key
- Each message has unique IV (prevents replay attacks)
- Authentication tag ensures integrity
- Backend cannot decrypt (token is never sent to backend, only hashed for verification)

---

## Testing Recommendations

### Cross-Platform Tests

1. **Browser → Mobile Video Call**
   - Verify bidirectional video/audio
   - Test message exchange during call
   - Verify stop video keeps text chat

2. **Mobile → Browser Video Call**
   - Verify renegotiation works correctly
   - Test explicit and automatic renegotiation paths

3. **Message Delivery**
   - Send from browser, receive on mobile (verify ACK)
   - Send from mobile, receive on browser (verify ACK)
   - Verify encryption/decryption

4. **Reconnection Scenarios**
   - Network interruption during text chat
   - Network interruption during video call
   - WebSocket disconnect/reconnect
   - ICE connection failure recovery

5. **Offer Collision (Glare)**
   - Both peers create offer simultaneously
   - Verify rollback mechanism works

---

## Future Extensions

### Planned Features

1. **Typing Indicators**
   ```json
   {
     "type": "typing",
     "isTyping": true
   }
   ```

2. **Read Receipts**
   ```json
   {
     "type": "read",
     "messageId": "uuid-v4"
   }
   ```

3. **File Transfer**
   - Use DataChannel for small files (<10MB)
   - Chunked transfer with progress tracking

4. **Screen Sharing**
   - Already supported in browser
   - Needs mobile implementation

---

## Changelog

### v1.0 (December 2024)

**Mobile v2 Improvements**:
- Added ACK message sending (Recommendation #2)
- Implemented DataChannel timeout (15s, Recommendation #3)
- Added `onnegotiationneeded` listener (Recommendation #1)
- Implemented ICE restart on failure (Recommendation #5)
- Unified message format (browser-compatible, Recommendation #4)

**Browser**:
- Maintained existing functionality
- Ready for modular refactoring (Recommendation #6)

---

## References

- [WebRTC Platform Comparison](/docs/WEBRTC_PLATFORM_COMPARISON.md)
- [ChatOrbit Architecture](/docs/architecture.md)
- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Perfect Negotiation Pattern](https://w3c.github.io/webrtc-pc/#perfect-negotiation-example)
