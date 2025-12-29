# ChatOrbit WebRTC Connection Specification

## Overview

Two-participant chat application using WebRTC for ALL peer-to-peer communication:
- **RTCDataChannel**: Text messaging (encrypted)
- **Video/Audio tracks**: Optional video calls

WebSocket is used ONLY for:
- Session/token management with backend
- Signaling (SDP offer/answer, ICE candidates)
- Connection status updates

## Participants

- **Host**: First device to join session (creates offer)
- **Guest**: Second device to join session (creates answer)
- Both connect via unique token with TTL

## Connection Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INITIAL CONNECTION (TEXT MODE)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   HOST                                    GUEST                             │
│                                                                             │
│   1. Join session via HTTP                                                  │
│      └─ Get participantId, role="host"                                      │
│                                                                             │
│   2. Connect WebSocket                    3. Join session via HTTP          │
│      └─ Server broadcasts status             └─ Get participantId, role="guest"
│                                                                             │
│                                           4. Connect WebSocket              │
│                                              └─ Server broadcasts status    │
│                                                 (2 participants connected)  │
│                                                                             │
│   5. Receive status: 2 participants       5. Receive status: 2 participants│
│      ├─ Create RTCPeerConnection             (wait for offer)               │
│      ├─ Create DataChannel "chat"                                           │
│      ├─ Create SDP offer                                                    │
│      └─ Send "offer" via WebSocket                                          │
│                                           │                                 │
│                                           ▼                                 │
│                                   6. Receive "offer"                        │
│                                      ├─ Create RTCPeerConnection            │
│                                      ├─ Set remote description              │
│                                      ├─ Create SDP answer                   │
│                                      └─ Send "answer" via WebSocket         │
│                                           │                                 │
│   7. Receive "answer"                     │                                 │
│      └─ Set remote description            │                                 │
│                                           │                                 │
│   8. Exchange ICE candidates (bidirectional via WebSocket)                  │
│                                                                             │
│   9. DataChannel opens                    9. DataChannel opens              │
│      └─ Status: "Connected"                  └─ Status: "Connected"         │
│      └─ Video invite button visible          └─ Video invite button visible │
│                                                                             │
│   TEXT CHAT NOW WORKS VIA DATACHANNEL                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Video Call Flow (Adding to Existing Connection)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VIDEO CALL INITIATION                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   INITIATOR                               RECEIVER                          │
│                                                                             │
│   1. User taps camera button                                                │
│      ├─ Start local media capture                                           │
│      ├─ Add video/audio tracks to existing peer connection                  │
│      ├─ Set callState = "inviting"                                          │
│      └─ Send "video-invite" via DataChannel                                 │
│                                           │                                 │
│                                           ▼                                 │
│                                   2. Receive "video-invite"                 │
│                                      ├─ Show accept/decline modal           │
│                                      └─ Set callState = "incoming"          │
│                                           │                                 │
│                              ┌────────────┴────────────┐                    │
│                              ▼                         ▼                    │
│                         DECLINED                   ACCEPTED                 │
│                              │                         │                    │
│   3a. Receive "video-decline"│    3b. User accepts     │                    │
│       ├─ Remove video tracks │        ├─ Start local media                  │
│       ├─ Set callState="idle"│        ├─ Add tracks to peer connection      │
│       └─ Show "declined" msg │        ├─ Set callState = "active"           │
│                              │        └─ Send "video-accept" via DataChannel│
│                              │                         │                    │
│                              │    4. Receive "video-accept"                 │
│                              │       ├─ Set callState = "active"            │
│                              │       └─ Renegotiate (new offer if needed)   │
│                              │                         │                    │
│                              │    5. ICE renegotiation if needed            │
│                              │                         │                    │
│                              │    6. Remote video tracks received           │
│                              │       └─ Both show local + remote video      │
│                              │                                              │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

## Signaling Protocol

### Via WebSocket (to backend server)

| Message Type | Purpose |
|--------------|---------|
| `status` | Session status updates (participants, remaining time) |
| `signal` | Wrapper for peer-to-peer signaling |
| `offer` | SDP offer (wrapped in signal) |
| `answer` | SDP answer (wrapped in signal) |
| `iceCandidate` | ICE candidate (wrapped in signal) |

### Via RTCDataChannel (peer-to-peer)

| Message Type | Purpose |
|--------------|---------|
| `message` | Encrypted text message |
| `video-invite` | Request to start video call |
| `video-accept` | Accept video call |
| `video-decline` | Decline video call |
| `video-end` | End video call |
| `capabilities` | Announce encryption support |

## Connection States

### 1. Waiting
- WebSocket connected
- Waiting for other participant
- Status: "Waiting..."

### 2. Connecting
- Both participants present
- Peer connection being established
- Status: "Connecting..."

### 3. Connected (Text Mode)
- DataChannel open
- Text chat working
- Video invite button visible
- Status: "Connected"

### 4. Video Active
- Video/audio tracks active
- Video panel visible with controls
- Text chat still works
- Status: "Connected" (video indicator shown)

## UI Requirements

### Waiting State
- Status: "Waiting for other participant..."
- No video button (no one to call)

### Connected (Text Mode)
- [x] Text chat panel visible
- [x] Text input visible
- [ ] **Video invite button visible** (camera icon)
- [x] Status: "Connected"

### Video Invite Pending (Sender)
- [x] "Calling..." indicator
- [ ] Video invite button hidden

### Video Invite Pending (Receiver)
- [x] Modal: Accept/Decline

### Video Active
- [ ] **Remote video visible** (main view)
- [x] Local video (PiP)
- [x] Mute camera (toggles track.enabled, does NOT exit video mode)
- [x] Mute mic
- [x] End video call
- [x] Fullscreen toggle

### After Video Ends
- [x] Video panel hidden
- [ ] **Video invite button visible again**
- [x] "Video ended" notification

## Known Issues

1. **Browser**: Video invite button not visible when connected
2. **Both**: Remote video not showing (only local)
3. **Browser**: Mute camera exits video mode instead of just disabling track
4. **Browser**: Video invite button not visible after video ends

## Role Responsibilities

### Host (Initiator)
- Creates initial offer when guest joins
- Creates data channel
- Sends renegotiation offers when adding video

### Guest (Responder)
- Waits for offer
- Creates answer
- Receives data channel via ondatachannel event
