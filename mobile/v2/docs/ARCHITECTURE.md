# ChatOrbit Mobile v2 - Architecture Document

## Executive Summary

This document defines the architecture for ChatOrbit Mobile v2 - an independent React Native implementation of the ChatOrbit mobile chat application. This is NOT a refactor of v1, but a ground-up rebuild with modern patterns, clean architecture, and improved maintainability while maintaining full compatibility with the existing FastAPI backend.

## System Context

### Backend Integration

The v2 mobile app integrates with the existing ChatOrbit FastAPI backend at `/Users/erozloznik/Projects/chatorbit-mobile/backend/`. The backend provides:

- Token-based session management (exactly 2 participants per session)
- WebSocket signaling for WebRTC connection establishment
- Session lifecycle management
- Rate limiting and abuse prevention

API documentation: `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/OPENAPI.json`

### Key Backend Endpoints

**HTTP Endpoints:**
- `POST /api/tokens` - Mint new session token
- `POST /api/sessions/join` - Join session (returns participant_id and role)
- `GET /api/sessions/{token}/status` - Get session status
- `DELETE /api/sessions/{token}` - Delete session
- `POST /api/sessions/{token}/report-abuse` - Report abuse

**WebSocket Endpoint:**
- `WS /ws/sessions/{token}?participantId={id}` - WebSocket connection for signaling

### Session Lifecycle

1. **Token Minting**: User requests token with validity period (1 day/week/month/year) and session TTL (1-1440 minutes)
2. **Host Join**: First device joins → receives `participant_id` and role="host", status="issued"
3. **Guest Join**: Second device joins → session activates, countdown starts, role="guest", status="active"
4. **Active Session**: Both participants exchange encrypted messages via WebRTC data channel
5. **Session End**: Timer expires → backend broadcasts `session_closed` → clients disconnect

### Session States

- `issued` - Token created, waiting for participants
- `active` - Both participants joined, session running
- `closed` - Session timer expired naturally
- `expired` - Token expired before session started
- `deleted` - Session manually deleted or abuse reported

## Phase 1 Architecture

### Technology Stack

- **Framework**: React Native (Expo SDK 51)
- **Language**: TypeScript
- **Navigation**: React Navigation 6.x
- **State Management**: Zustand (lightweight, modern)
- **WebRTC**: react-native-webrtc
- **WebSocket**: Native WebSocket API
- **Styling**: React Native StyleSheet with design constants

### Project Structure

```
mobile/v2/
├── src/
│   ├── screens/           # Top-level navigation screens
│   │   ├── LandingScreen.tsx
│   │   ├── CockpitScreen.tsx
│   │   ├── HelpScreen.tsx
│   │   ├── PrivacyScreen.tsx
│   │   ├── AboutScreen.tsx
│   │   └── FAQScreen.tsx
│   │
│   ├── components/        # Reusable UI components
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── StatusDot.tsx
│   │   ├── cockpit/
│   │   │   ├── CockpitHeader.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── MenuDrawer.tsx
│   │   └── forms/
│   │       ├── MintTokenForm.tsx
│   │       └── JoinSessionForm.tsx
│   │
│   ├── webrtc/            # WebRTC connection management
│   │   ├── WebRTCManager.ts
│   │   ├── DataChannelManager.ts
│   │   ├── SignalingClient.ts
│   │   └── types.ts
│   │
│   ├── services/          # API and business logic
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── tokens.ts
│   │   │   ├── sessions.ts
│   │   │   └── types.ts
│   │   └── encryption/
│   │       ├── crypto.ts
│   │       ├── messages.ts
│   │       └── types.ts
│   │
│   ├── state/             # Global state management
│   │   ├── stores/
│   │   │   ├── sessionStore.ts
│   │   │   ├── messagesStore.ts
│   │   │   └── connectionStore.ts
│   │   └── types.ts
│   │
│   ├── constants/         # Design system and configuration
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   └── config.ts
│   │
│   ├── utils/             # Shared utilities
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── env.ts
│   │
│   └── types/             # Global TypeScript types
│       └── index.ts
│
├── App.tsx                # App entry point
├── app.json               # Expo configuration
├── package.json
└── tsconfig.json
```

## Core Modules

### 1. State Management (Zustand)

**Session Store** (`state/stores/sessionStore.ts`):
```typescript
interface SessionState {
  // Session data
  token: string | null;
  participantId: string | null;
  role: 'host' | 'guest' | null;
  status: SessionStatus;
  messageCharLimit: number;
  sessionExpiresAt: Date | null;
  remainingSeconds: number | null;

  // Actions
  setSession: (data: SessionData) => void;
  clearSession: () => void;
  updateRemainingTime: (seconds: number) => void;
}
```

**Messages Store** (`state/stores/messagesStore.ts`):
```typescript
interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  hash: string; // For integrity verification
}

interface MessagesState {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}
```

**Connection Store** (`state/stores/connectionStore.ts`):
```typescript
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface ConnectionState {
  status: ConnectionStatus;
  peerConnected: boolean;
  setStatus: (status: ConnectionStatus) => void;
  setPeerConnected: (connected: boolean) => void;
}
```

### 2. API Service Layer

**HTTP Client** (`services/api/client.ts`):
- Axios or fetch wrapper with base URL configuration
- Request/response interceptors
- Error handling and retry logic
- Type-safe response parsing

**Token Service** (`services/api/tokens.ts`):
```typescript
export async function mintToken(request: CreateTokenRequest): Promise<TokenResponse>
export async function getSessionStatus(token: string): Promise<SessionStatusResponse>
export async function deleteSession(token: string): Promise<void>
```

**Session Service** (`services/api/sessions.ts`):
```typescript
export async function joinSession(request: JoinSessionRequest): Promise<JoinSessionResponse>
export async function reportAbuse(token: string, report: ReportAbuseRequest): Promise<void>
```

### 3. WebRTC Architecture

**WebRTC Manager** (`webrtc/WebRTCManager.ts`):
- Manages RTCPeerConnection lifecycle
- ICE server configuration from environment
- Handles offer/answer exchange
- Connection state monitoring
- Cleanup on disconnect

**Signaling Client** (`webrtc/SignalingClient.ts`):
- WebSocket connection to backend
- Sends/receives WebRTC signaling messages
- Message format: `{ type: 'signal', signalType: 'offer'|'answer'|'ice-candidate', payload: any, sender: participantId }`
- Reconnection logic with exponential backoff
- Status updates broadcasting

**Data Channel Manager** (`webrtc/DataChannelManager.ts`):
- Creates and manages RTCDataChannel for text chat
- Handles message sending/receiving
- Message ordering and delivery confirmation
- Integration with encryption layer

### 4. Encryption System

Based on v1 patterns but with cleaner implementation:

**Crypto Utilities** (`services/encryption/crypto.ts`):
```typescript
// Key derivation from session token
export async function deriveKey(token: string): Promise<CryptoKey>

// AES-GCM encryption/decryption
export async function encryptText(key: CryptoKey, plaintext: string): Promise<string>
export async function decryptText(key: CryptoKey, ciphertext: string): Promise<string>

// Message integrity
export async function computeMessageHash(
  sessionId: string,
  participantId: string,
  messageId: string,
  content: string
): Promise<string>
```

**Message Encryption** (`services/encryption/messages.ts`):
```typescript
export async function encryptMessage(
  key: CryptoKey,
  content: string,
  sessionId: string,
  participantId: string
): Promise<EncryptedMessage>

export async function decryptMessage(
  key: CryptoKey,
  encrypted: EncryptedMessage
): Promise<Message>
```

### 5. Design System

**Colors** (`constants/colors.ts`):
```typescript
export const Colors = {
  // Background
  deepBlue: '#0A1929',
  darkBlue: '#132F4C',

  // Accents
  yellow: '#FFCA28',
  orange: '#FF9800',

  // Status
  green: '#4CAF50',
  red: '#F44336',

  // Text
  white: '#FFFFFF',
  gray: '#B0BEC5',
  lightGray: '#ECEFF1',
}
```

**Typography** (`constants/typography.ts`):
```typescript
export const Typography = {
  header: {
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
  },
}
```

**Spacing** (`constants/spacing.ts`):
```typescript
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
}
```

## Screen Architectures

### Landing Screen

**Purpose**: Entry point with two actions - Mint token or Join session

**Layout**:
- Deep blue background
- ChatOrbit logo at top
- Two primary action cards:
  1. "Create New Chat" (Mint token)
  2. "Join Existing Chat" (Enter token)
- Each action expands to show its form

**State Management**:
- Local state for form visibility
- Form submission calls API service
- On success: navigate to Cockpit screen

### Cockpit Screen

**Purpose**: Main chat interface (Phase 1: text-only mode)

**Layout**:
```
┌─────────────────────────────────┐
│ [←] [ChatOrbit Logo] [≡]   [●] │ ← Header (60px)
├─────────────────────────────────┤
│                                 │
│  Message bubble (them)          │
│                                 │
│         Message bubble (me)     │
│                                 │
│  Message bubble (them)          │
│                                 │
│                                 │ ← Scrollable message area
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│ [Text input field] [Send]       │ ← Input footer (keyboard-aware)
└─────────────────────────────────┘
```

**Header Components**:
- Back button (navigate to Landing)
- ChatOrbit logo + text
- Menu icon (opens drawer)
- Connection status dot (green/orange/red)

**Menu Items** (drawer):
- FAQ
- Privacy Policy
- About
- Help
- Report Abuse (if applicable)
- End Session

**Message Display**:
- Messages flow top-to-bottom
- Auto-scroll to latest message
- Timestamp display
- Sender differentiation (visual left/right alignment)
- Character limit indicator

**Input Footer**:
- KeyboardAvoidingView wrapper
- Text input with max character limit
- Send button (disabled if empty or over limit)
- Submit on button tap or Enter key

**State Integration**:
- Reads from `sessionStore` for session details
- Reads from `messagesStore` for message list
- Reads from `connectionStore` for connection status
- Uses `WebRTCManager` to send messages

## Data Flow Diagrams

### Token Minting Flow

```
User → LandingScreen → MintTokenForm
                         ↓
                    API.mintToken()
                         ↓
                    TokenResponse
                         ↓
                  sessionStore.setSession()
                         ↓
              Navigate to CockpitScreen
                         ↓
              API.joinSession() [as host]
                         ↓
           sessionStore.setParticipantId()
                         ↓
        WebRTCManager.initialize() + SignalingClient.connect()
```

### Joining Session Flow

```
User → LandingScreen → JoinSessionForm
                         ↓
                  API.joinSession()
                         ↓
                  JoinSessionResponse
                         ↓
              sessionStore.setSession()
                         ↓
              Navigate to CockpitScreen
                         ↓
        WebRTCManager.initialize() + SignalingClient.connect()
                         ↓
          [If session_active=true, peer already waiting]
                         ↓
             WebRTC connection negotiation
```

### Message Sending Flow

```
User types message → MessageInput
                         ↓
                  Click Send button
                         ↓
          Encryption.encryptMessage()
                         ↓
        DataChannelManager.send(encrypted)
                         ↓
              [Transmitted via WebRTC]
                         ↓
         messagesStore.addMessage() [local echo]
```

### Message Receiving Flow

```
WebRTC Data Channel receives data
                ↓
    DataChannelManager.onMessage()
                ↓
    Encryption.decryptMessage()
                ↓
    Verify message hash integrity
                ↓
    messagesStore.addMessage()
                ↓
    MessageList re-renders
```

## WebRTC Signaling Protocol

### Message Types

**From Client to Server:**
```typescript
{
  type: 'signal',
  signalType: 'offer' | 'answer' | 'ice-candidate',
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit,
  sender: participantId
}
```

**From Server to Client:**
```typescript
// Signal relay (from other participant)
{
  type: 'signal',
  signalType: 'offer' | 'answer' | 'ice-candidate',
  payload: any,
  sender: otherParticipantId
}

// Status update
{
  type: 'status',
  token: string,
  status: SessionStatus,
  connected_participants: string[],
  remaining_seconds: number | null,
  ...SessionStatusResponse
}

// Session lifecycle events
{ type: 'session_closed' }
{ type: 'session_expired' }
{ type: 'session_deleted' }
{ type: 'abuse_reported' }
```

### Connection Establishment Sequence

1. **Both clients connect WebSocket** to `/ws/sessions/{token}?participantId={id}`
2. **Server broadcasts status** to both clients
3. **Host creates offer**:
   - `WebRTCManager.createOffer()` → generates SDP offer
   - Send via SignalingClient: `{ type: 'signal', signalType: 'offer', payload: offerSDP }`
4. **Guest receives offer**:
   - `SignalingClient.onMessage()` → receives offer
   - `WebRTCManager.handleOffer()` → sets remote description
   - Creates answer: `WebRTCManager.createAnswer()` → generates SDP answer
   - Send via SignalingClient: `{ type: 'signal', signalType: 'answer', payload: answerSDP }`
5. **Both exchange ICE candidates**:
   - `WebRTCManager.onIceCandidate()` → local candidate found
   - Send via SignalingClient: `{ type: 'signal', signalType: 'ice-candidate', payload: candidate }`
   - Peer receives and adds: `WebRTCManager.addIceCandidate()`
6. **Connection established**:
   - `WebRTCManager.onConnectionStateChange()` → 'connected'
   - `connectionStore.setStatus('connected')`
7. **Data channel opens**:
   - `DataChannelManager.onOpen()` → ready for messages

## Environment Configuration

**Required Environment Variables:**

```bash
# API Base URLs
EXPO_PUBLIC_API_BASE_URL=http://localhost:50001
EXPO_PUBLIC_WS_BASE_URL=ws://localhost:50001

# WebRTC ICE Servers
EXPO_PUBLIC_WEBRTC_STUN_URLS=stun:stun.l.google.com:19302
EXPO_PUBLIC_WEBRTC_TURN_URLS=turn:turn.example.com:3478
EXPO_PUBLIC_WEBRTC_TURN_USER=username
EXPO_PUBLIC_WEBRTC_TURN_PASSWORD=password

# Optional: Full ICE server config (JSON)
EXPO_PUBLIC_WEBRTC_ICE_SERVERS=[{"urls":["stun:..."]},{"urls":["turn:..."],"username":"...","credential":"..."}]
```

**Configuration Loading** (`utils/env.ts`):
```typescript
export function getApiBaseUrl(): string
export function getWsBaseUrl(): string
export function getIceServers(): RTCIceServer[]
```

## Error Handling Strategy

### Categories

1. **Network Errors**: API request failures, WebSocket disconnects
2. **Validation Errors**: Invalid token, expired session, rate limits
3. **WebRTC Errors**: Connection failures, ICE errors, data channel errors
4. **Encryption Errors**: Decryption failures, key derivation issues

### User-Facing Error Messages

- **Token Expired**: "This chat link has expired. Please request a new one."
- **Session Full**: "This chat already has two participants."
- **Connection Failed**: "Unable to connect. Please check your internet connection."
- **Rate Limited**: "Too many requests. Please try again later."

### Error Recovery

- **WebSocket disconnect**: Exponential backoff reconnection (1s, 2s, 4s, 8s, max 30s)
- **WebRTC connection failure**: Retry with new offer/answer exchange
- **API errors**: Display user-friendly message, allow retry

## Performance Considerations

### Optimizations

1. **Message List**: Use FlatList with virtualization, windowSize=10
2. **State Updates**: Batch message additions with Zustand's `batch()`
3. **Re-renders**: Memoize components with `React.memo()` and `useMemo()`
4. **WebRTC**: Use UDP for data channel (lower latency than TCP)
5. **Encryption**: Derive key once per session, cache for message encryption

### Memory Management

- Clear messages on session end
- Close WebRTC connections properly
- Remove WebSocket event listeners on unmount
- Limit message history to last 500 messages (configurable)

## Security Considerations

### End-to-End Encryption

- Token used as encryption key seed (SHA-256 derived AES-GCM key)
- Messages encrypted before WebRTC transmission
- Backend cannot read message content (only relays encrypted blobs)

### WebRTC Security

- Use TURN servers for restrictive networks (prevents IP leakage)
- Validate ICE candidates (filter out link-local addresses)
- Enforce DTLS-SRTP for media streams (future phases)

### Input Validation

- Sanitize user input before encryption
- Enforce character limits client-side and server-side
- Prevent XSS in message display (React Native handles this natively)

## Testing Strategy

### Unit Tests

- Encryption utilities (encrypt/decrypt correctness)
- API service functions (mock responses)
- State stores (action correctness)

### Integration Tests

- Token minting → join session flow
- WebRTC connection establishment (mock signaling)
- Message send/receive cycle

### Manual Testing Checklist

- [ ] Mint token with various validity periods
- [ ] Join session from two devices
- [ ] Send/receive encrypted messages
- [ ] Handle connection interruptions
- [ ] Test session expiration
- [ ] Test abuse reporting
- [ ] Test all menu items
- [ ] Test keyboard behavior (input field visibility)

## Migration from v1

### What NOT to Migrate

- v1 file structure (monolithic App.tsx)
- v1 UI components and styling
- v1 state management approach
- v1 component naming conventions

### What to Reference (Patterns Only)

- Encryption implementation logic (crypto.ts)
- WebRTC ICE server configuration (webrtc.ts)
- Session flow understanding
- Message structure

### Key Differences from v1

| Aspect | v1 | v2 |
|--------|----|----|
| State Management | React Context + useState | Zustand stores |
| Project Structure | Flat components | Layered (screens/components/services) |
| Navigation | Custom | React Navigation |
| Design System | Inline styles | Centralized constants |
| WebRTC | Mixed in App.tsx | Dedicated managers |
| Encryption | Inline | Service layer |

## Deployment Considerations

### Build Variants

- Development: Local backend, verbose logging
- Staging: Staging backend, moderate logging
- Production: Production backend, error-only logging

### Platform-Specific Notes

**iOS**:
- WebRTC permissions: Camera/microphone (for future video phase)
- Background execution: Limited WebSocket reliability

**Android**:
- WebRTC permissions: Same as iOS
- Background execution: Better WebSocket support

## Future Phases (Post-Phase 1)

### Phase 2: Video/Audio UI
- Camera/microphone controls
- Video stream rendering
- Audio level indicators
- Screen sharing UI

### Phase 3: Advanced Features
- Message reactions
- Typing indicators
- Read receipts
- File sharing (via WebRTC data channel)

### Phase 4: Polish
- Animations and transitions
- Haptic feedback
- Sound effects
- Dark/light theme toggle
- Accessibility improvements (VoiceOver, TalkBack)

## Conclusion

This architecture provides a solid foundation for ChatOrbit Mobile v2. The clear separation of concerns, modern state management, and clean code structure will enable rapid development in Phase 1 and smooth extension in future phases. The design maintains full compatibility with the existing backend while creating an independent, maintainable codebase.
