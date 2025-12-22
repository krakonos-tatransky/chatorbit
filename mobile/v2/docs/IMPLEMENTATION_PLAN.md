# ChatOrbit Mobile v2 - Phase 1 Implementation Plan

## Overview

This document provides a detailed, sequenced implementation plan for ChatOrbit Mobile v2 Phase 1. Tasks are organized into dependency-aware stages, with clear ownership recommendations for specialized agents.

## Pre-Implementation Checklist

- [x] Backend API analyzed and documented
- [x] OpenAPI specification generated
- [x] Architecture document created
- [ ] Expo project initialized
- [ ] Dependencies installed
- [ ] Environment configuration template created
- [ ] Git branch strategy confirmed

## Task Breakdown

### Stage 0: Project Setup (Foundation)

**Owner**: Mobile Infrastructure Agent

**Tasks**:

1. **Initialize Expo Project**
   - Run `npx create-expo-app chatorbit-v2 --template blank-typescript`
   - Move to `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/`
   - Configure `app.json` with proper bundle identifiers
   - Set up TypeScript strict mode in `tsconfig.json`

2. **Install Core Dependencies**
   ```bash
   npm install zustand react-navigation @react-navigation/native @react-navigation/stack
   npm install react-native-webrtc
   npm install axios
   npm install expo-crypto
   npm install @expo/vector-icons
   ```

3. **Create Project Structure**
   - Create all directories: `src/screens/`, `src/components/ui/`, `src/services/api/`, etc.
   - Create index barrel files for clean imports

4. **Environment Configuration**
   - Create `.env.template` with all required variables
   - Create `src/utils/env.ts` for environment variable access
   - Document environment setup in `README.md`

**Deliverables**:
- Runnable Expo app (blank screen)
- Complete directory structure
- Environment configuration system
- Updated `package.json` with all dependencies

**Estimated Time**: 2-3 hours

---

### Stage 1: Design System (Independent)

**Owner**: UI/UX Agent

**Tasks**:

1. **Color Palette** (`src/constants/colors.ts`)
   - Define deep blue background colors
   - Define yellow/orange accent colors
   - Define status colors (green/orange/red)
   - Define text colors

2. **Typography System** (`src/constants/typography.ts`)
   - Define font sizes (header, body, caption)
   - Define font weights
   - Create text style presets

3. **Spacing System** (`src/constants/spacing.ts`)
   - Define spacing scale (xs, sm, md, lg, xl)
   - Create padding/margin utilities

4. **Base UI Components**
   - `src/components/ui/Button.tsx` - Primary/secondary variants
   - `src/components/ui/Input.tsx` - Text input with validation styling
   - `src/components/ui/Card.tsx` - Container component
   - `src/components/ui/StatusDot.tsx` - Connection status indicator

**Deliverables**:
- Complete design constants
- Base UI component library
- Storybook-style preview (optional)

**Estimated Time**: 4-5 hours

---

### Stage 2: API Service Layer (Independent)

**Owner**: Backend Integration Agent

**Tasks**:

1. **HTTP Client** (`src/services/api/client.ts`)
   - Create Axios instance with base URL from env
   - Add request/response interceptors
   - Implement error handling and type guards
   - Add retry logic for network errors

2. **API Types** (`src/services/api/types.ts`)
   - Import OpenAPI schemas
   - Define TypeScript types for all request/response objects
   - Create type guards for runtime validation

3. **Token Service** (`src/services/api/tokens.ts`)
   ```typescript
   export async function mintToken(request: CreateTokenRequest): Promise<TokenResponse>
   export async function getSessionStatus(token: string): Promise<SessionStatusResponse>
   export async function deleteSession(token: string): Promise<void>
   ```

4. **Session Service** (`src/services/api/sessions.ts`)
   ```typescript
   export async function joinSession(request: JoinSessionRequest): Promise<JoinSessionResponse>
   export async function reportAbuse(token: string, report: ReportAbuseRequest): Promise<void>
   ```

**Deliverables**:
- Complete API service layer
- Type-safe HTTP client
- Unit tests for API functions (mocked responses)

**Estimated Time**: 4-5 hours

**Dependencies**: Stage 0 (env config)

---

### Stage 3: Encryption System (Independent)

**Owner**: Security/Crypto Agent

**Tasks**:

1. **Crypto Utilities** (`src/services/encryption/crypto.ts`)
   - Port Web Crypto API detection from v1 (`resolveCrypto`)
   - Implement `deriveKey(token: string): Promise<CryptoKey>`
   - Implement `encryptText(key, plaintext): Promise<string>`
   - Implement `decryptText(key, ciphertext): Promise<string>`
   - Implement `computeMessageHash()` for integrity
   - Implement `generateMessageId()` for unique IDs

2. **Message Encryption** (`src/services/encryption/messages.ts`)
   ```typescript
   export async function encryptMessage(
     key: CryptoKey,
     content: string,
     metadata: MessageMetadata
   ): Promise<EncryptedMessage>

   export async function decryptMessage(
     key: CryptoKey,
     encrypted: EncryptedMessage
   ): Promise<Message>
   ```

3. **Encryption Types** (`src/services/encryption/types.ts`)
   - Define `EncryptedMessage` interface
   - Define `MessageMetadata` interface
   - Define crypto-related types

**Deliverables**:
- Working encryption/decryption system
- Unit tests with known plaintext/ciphertext pairs
- Documentation of encryption approach

**Estimated Time**: 5-6 hours

**Dependencies**: Stage 0 (env config)

**Reference**: `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v1/src/utils/crypto.ts` (patterns only, not code)

---

### Stage 4: State Management (Core)

**Owner**: State Management Agent

**Tasks**:

1. **Session Store** (`src/state/stores/sessionStore.ts`)
   ```typescript
   interface SessionState {
     token: string | null
     participantId: string | null
     role: 'host' | 'guest' | null
     status: SessionStatus
     messageCharLimit: number
     sessionExpiresAt: Date | null
     remainingSeconds: number | null
     encryptionKey: CryptoKey | null

     setSession: (data: SessionData) => void
     setEncryptionKey: (key: CryptoKey) => void
     clearSession: () => void
     updateRemainingTime: (seconds: number) => void
   }
   ```

2. **Messages Store** (`src/state/stores/messagesStore.ts`)
   ```typescript
   interface Message {
     id: string
     senderId: string
     content: string
     timestamp: Date
     hash: string
   }

   interface MessagesState {
     messages: Message[]
     addMessage: (message: Message) => void
     clearMessages: () => void
   }
   ```

3. **Connection Store** (`src/state/stores/connectionStore.ts`)
   ```typescript
   type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

   interface ConnectionState {
     status: ConnectionStatus
     peerConnected: boolean
     error: string | null

     setStatus: (status: ConnectionStatus) => void
     setPeerConnected: (connected: boolean) => void
     setError: (error: string | null) => void
   }
   ```

**Deliverables**:
- Three Zustand stores
- Store selectors and actions
- Unit tests for state mutations

**Estimated Time**: 3-4 hours

**Dependencies**: Stage 0 (zustand installed)

---

### Stage 5: WebRTC Foundation (Core)

**Owner**: WebRTC Specialist Agent

**Tasks**:

1. **WebRTC Types** (`src/webrtc/types.ts`)
   - Define ICE server configuration types
   - Define signaling message types
   - Define connection state types

2. **ICE Configuration** (`src/webrtc/config.ts`)
   - Port ICE server parsing from v1 (`getIceServers()`)
   - Sanitize unroutable hosts (localhost, 0.0.0.0, link-local IPv6)
   - Read from environment variables
   - Return RTCConfiguration object

3. **WebRTC Manager** (`src/webrtc/WebRTCManager.ts`)
   ```typescript
   class WebRTCManager {
     private peerConnection: RTCPeerConnection | null
     private dataChannel: RTCDataChannel | null

     initialize(iceServers: RTCIceServer[]): void
     createOffer(): Promise<RTCSessionDescriptionInit>
     handleOffer(offer: RTCSessionDescriptionInit): Promise<void>
     createAnswer(): Promise<RTCSessionDescriptionInit>
     handleAnswer(answer: RTCSessionDescriptionInit): Promise<void>
     addIceCandidate(candidate: RTCIceCandidateInit): Promise<void>

     // Event handlers
     onIceCandidate: (callback: (candidate: RTCIceCandidate) => void) => void
     onConnectionStateChange: (callback: (state: RTCPeerConnectionState) => void) => void
     onDataChannelOpen: (callback: () => void) => void
     onDataChannelMessage: (callback: (data: string) => void) => void

     sendMessage(data: string): void
     close(): void
   }
   ```

4. **Data Channel Manager** (`src/webrtc/DataChannelManager.ts`)
   - Wrapper around RTCDataChannel
   - Message queuing when channel not ready
   - Binary data handling (future-proof)
   - Event emission for received messages

**Deliverables**:
- WebRTC connection manager
- ICE configuration system
- Data channel abstraction
- Connection state monitoring

**Estimated Time**: 6-7 hours

**Dependencies**: Stage 0 (react-native-webrtc installed), Stage 4 (connection store)

**Reference**: `/Users/erozloznik/Projects/chatorbit-mobile/mobile/v1/src/utils/webrtc.ts` (ICE config patterns)

---

### Stage 6: Signaling Client (Core)

**Owner**: WebRTC Specialist Agent

**Tasks**:

1. **Signaling Client** (`src/webrtc/SignalingClient.ts`)
   ```typescript
   class SignalingClient {
     private ws: WebSocket | null
     private reconnectAttempts: number

     connect(token: string, participantId: string): void
     disconnect(): void

     sendSignal(signalType: 'offer' | 'answer' | 'ice-candidate', payload: any): void

     // Event handlers
     onSignalReceived: (callback: (signal: SignalMessage) => void) => void
     onStatusUpdate: (callback: (status: SessionStatusResponse) => void) => void
     onSessionClosed: (callback: () => void) => void
     onSessionExpired: (callback: () => void) => void
     onSessionDeleted: (callback: () => void) => void
     onError: (callback: (error: Error) => void) => void

     private reconnect(): void // Exponential backoff
   }
   ```

2. **WebSocket Protocol Implementation**
   - Handle incoming message types: `signal`, `status`, `session_closed`, etc.
   - Send outgoing signals with proper format
   - Implement reconnection logic (1s, 2s, 4s, 8s, max 30s)
   - Handle connection errors gracefully

**Deliverables**:
- WebSocket signaling client
- Reconnection logic
- Message type handlers
- Integration with WebRTCManager

**Estimated Time**: 5-6 hours

**Dependencies**: Stage 5 (WebRTCManager)

---

### Stage 7: Navigation Setup (Independent)

**Owner**: Navigation Agent

**Tasks**:

1. **Navigation Configuration** (`src/navigation/index.tsx`)
   - Set up React Navigation stack navigator
   - Define routes: Landing, Cockpit, Help, Privacy, About, FAQ
   - Configure header styles (or hide headers for custom ones)

2. **Navigation Types** (`src/navigation/types.ts`)
   ```typescript
   export type RootStackParamList = {
     Landing: undefined
     Cockpit: { token: string; participantId: string }
     Help: undefined
     Privacy: undefined
     About: undefined
     FAQ: undefined
   }
   ```

3. **Update App.tsx**
   - Wrap app with NavigationContainer
   - Set up stack navigator
   - Apply deep blue theme

**Deliverables**:
- Working navigation structure
- Type-safe navigation
- Themed navigator

**Estimated Time**: 2-3 hours

**Dependencies**: Stage 0 (react-navigation installed), Stage 1 (colors)

---

### Stage 8: Landing Screen (User-Facing)

**Owner**: UI/UX Agent

**Tasks**:

1. **Landing Screen Layout** (`src/screens/LandingScreen.tsx`)
   - Deep blue gradient background
   - ChatOrbit logo at top (use SVG or PNG asset)
   - Two action cards: "Create New Chat" and "Join Existing Chat"
   - Cards expand to show forms

2. **Mint Token Form** (`src/components/forms/MintTokenForm.tsx`)
   - Validity period selector (1 day/week/month/year)
   - Session TTL input (minutes, 1-1440)
   - Message char limit input (200-16000, default 2000)
   - Submit button
   - Loading state
   - Error display

3. **Join Session Form** (`src/components/forms/JoinSessionForm.tsx`)
   - Token input field (text or QR code scanner - Phase 1: text only)
   - Submit button
   - Loading state
   - Error display

4. **Integration with API Services**
   - Call `mintToken()` on form submit
   - Call `joinSession()` on token input submit
   - Handle errors (display user-friendly messages)
   - On success: navigate to Cockpit with token and participantId

**Deliverables**:
- Complete Landing screen
- Functional mint and join flows
- Error handling and validation
- Navigation to Cockpit

**Estimated Time**: 6-7 hours

**Dependencies**: Stage 1 (UI components), Stage 2 (API services), Stage 7 (navigation)

---

### Stage 9: Cockpit Screen Header & Menu (User-Facing)

**Owner**: UI/UX Agent

**Tasks**:

1. **Cockpit Header** (`src/components/cockpit/CockpitHeader.tsx`)
   - Back button (navigate to Landing, confirm if session active)
   - ChatOrbit logo + text (centered)
   - Menu icon (hamburger/drawer icon)
   - Connection status dot (read from connectionStore)
   - 60px height, fixed at top

2. **Menu Drawer** (`src/components/cockpit/MenuDrawer.tsx`)
   - Slide-in drawer from right
   - Menu items:
     - FAQ (navigate to FAQ screen)
     - Privacy Policy (navigate to Privacy screen)
     - About (navigate to About screen)
     - Help (navigate to Help screen)
     - Report Abuse (modal or separate flow)
     - End Session (confirmation dialog → delete session)
   - Close button

3. **Confirmation Dialogs**
   - "End Session?" dialog (Yes/No)
   - "Leave Session?" dialog (when pressing back with active session)

**Deliverables**:
- Cockpit header component
- Menu drawer component
- Confirmation dialogs
- Navigation to help screens

**Estimated Time**: 4-5 hours

**Dependencies**: Stage 1 (UI components), Stage 4 (connection store), Stage 7 (navigation)

---

### Stage 10: Cockpit Screen Messages (User-Facing)

**Owner**: UI/UX Agent + State Management Agent

**Tasks**:

1. **Message List** (`src/components/cockpit/MessageList.tsx`)
   - FlatList with inverted prop (latest at bottom)
   - Message bubble component (left for them, right for me)
   - Timestamp display
   - Auto-scroll to latest message
   - Pull-to-refresh (future: load history)
   - Empty state ("Waiting for messages...")

2. **Message Bubble** (`src/components/cockpit/MessageBubble.tsx`)
   - Sender differentiation (background color)
   - Content text
   - Timestamp
   - Hash verification indicator (checkmark icon - future)

3. **Integration with Messages Store**
   - Read messages from `messagesStore`
   - Subscribe to updates (auto re-render)
   - Display decrypted content

**Deliverables**:
- Scrollable message list
- Message bubble component
- Store integration
- Auto-scroll behavior

**Estimated Time**: 4-5 hours

**Dependencies**: Stage 1 (UI components), Stage 4 (messages store)

---

### Stage 11: Cockpit Screen Input (User-Facing)

**Owner**: UI/UX Agent

**Tasks**:

1. **Message Input** (`src/components/cockpit/MessageInput.tsx`)
   - TextInput with multiline support
   - Character counter (current/limit)
   - Send button (disabled when empty or over limit)
   - KeyboardAvoidingView wrapper
   - Submit on button press or Enter key
   - Clear input after send

2. **Keyboard Behavior**
   - Use KeyboardAvoidingView with proper behavior prop
   - Ensure message list adjusts when keyboard opens
   - Test on iOS and Android

3. **Input Validation**
   - Max character limit enforcement
   - Trim whitespace
   - Prevent empty messages

**Deliverables**:
- Message input component
- Keyboard-aware layout
- Input validation

**Estimated Time**: 3-4 hours

**Dependencies**: Stage 1 (UI components), Stage 4 (session store for char limit)

---

### Stage 12: Cockpit Screen Integration (Core Integration)

**Owner**: Integration Agent (coordinates multiple systems)

**Tasks**:

1. **Cockpit Screen Assembly** (`src/screens/CockpitScreen.tsx`)
   - Import header, message list, input components
   - Layout with flex container
   - SafeAreaView for proper spacing

2. **Session Initialization Hook**
   ```typescript
   useEffect(() => {
     // On mount:
     // 1. Derive encryption key from token
     // 2. Store in sessionStore
     // 3. Initialize WebRTCManager
     // 4. Connect SignalingClient
     // 5. Set up WebRTC event handlers

     return () => {
       // On unmount:
       // 1. Close WebRTC connection
       // 2. Disconnect SignalingClient
       // 3. Clear session store
     }
   }, [])
   ```

3. **WebRTC Event Handlers**
   - OnIceCandidate: send via SignalingClient
   - OnConnectionStateChange: update connectionStore
   - OnDataChannelMessage: decrypt and add to messagesStore

4. **Signaling Event Handlers**
   - OnSignalReceived: handle offer/answer/ICE candidate
   - OnStatusUpdate: update session store with remaining time
   - OnSessionClosed/Expired/Deleted: show dialog, navigate to Landing

5. **Message Sending Flow**
   - User submits message
   - Encrypt with sessionStore.encryptionKey
   - Send via WebRTCManager.sendMessage()
   - Add to messagesStore (local echo)

**Deliverables**:
- Fully integrated Cockpit screen
- Working WebRTC connection
- Message send/receive flow
- Session lifecycle handling

**Estimated Time**: 8-10 hours

**Dependencies**: Stage 3 (encryption), Stage 4 (stores), Stage 5 (WebRTC), Stage 6 (signaling), Stage 9 (header), Stage 10 (messages), Stage 11 (input)

**Critical Path**: This is the most complex integration stage

---

### Stage 13: Help Screens (Independent)

**Owner**: Content Agent

**Tasks**:

1. **FAQ Screen** (`src/screens/FAQScreen.tsx`)
   - Scrollable list of Q&A
   - Reference web app content but adapt for mobile
   - Collapsible sections (Accordion pattern)

2. **Privacy Policy Screen** (`src/screens/PrivacyScreen.tsx`)
   - Scrollable text content
   - Reference `/Users/erozloznik/Projects/chatorbit-mobile/frontend/app/privacy-policy/page.tsx`

3. **About Screen** (`src/screens/AboutScreen.tsx`)
   - App version
   - ChatOrbit description
   - Credits
   - Links to website

4. **Help Screen** (`src/screens/HelpScreen.tsx`)
   - How to use the app
   - Troubleshooting tips
   - Contact information

**Deliverables**:
- Four help/info screens
- Scrollable content
- Professional layout

**Estimated Time**: 4-5 hours

**Dependencies**: Stage 1 (UI components), Stage 7 (navigation)

---

### Stage 14: Error Handling & Edge Cases (Polish)

**Owner**: QA/Testing Agent

**Tasks**:

1. **Network Error Handling**
   - API request failures: display toast/alert
   - WebSocket disconnect: show reconnecting indicator
   - WebRTC connection failure: retry logic

2. **Session Edge Cases**
   - Token expired when joining: show error, return to Landing
   - Session already has 2 participants: show error
   - Other participant disconnects: show status in UI
   - Session timer expires: graceful shutdown

3. **Input Validation**
   - Empty token: disable submit
   - Invalid token format: show error
   - Over character limit: disable send

4. **User Feedback**
   - Loading indicators for API calls
   - Success messages (toast notifications)
   - Error messages (alerts or inline)

**Deliverables**:
- Comprehensive error handling
- User-friendly error messages
- Loading states
- Edge case handling

**Estimated Time**: 5-6 hours

**Dependencies**: All previous stages

---

### Stage 15: Testing & Bug Fixes (Final)

**Owner**: QA/Testing Agent

**Tasks**:

1. **Manual Testing**
   - Two-device testing (physical devices or simulators)
   - Mint token → join from second device
   - Send messages both directions
   - Test connection interruptions (airplane mode toggle)
   - Test session expiration
   - Test back button behavior
   - Test keyboard on iOS and Android

2. **Unit Tests**
   - Encryption/decryption
   - API services (mocked)
   - State stores

3. **Integration Tests**
   - Token minting flow
   - Join session flow
   - Message encryption end-to-end

4. **Bug Fixes**
   - Document issues
   - Prioritize by severity
   - Fix critical bugs

**Deliverables**:
- Test report
- Bug fix commits
- Known issues documentation

**Estimated Time**: 10-12 hours

**Dependencies**: All previous stages

---

## Task Sequencing & Parallelization

### Can Be Done in Parallel

- Stage 1 (Design System) || Stage 2 (API Services) || Stage 3 (Encryption)
- Stage 4 (State Management) can start after Stage 0
- Stage 7 (Navigation) can start after Stage 0 + Stage 1

### Critical Path (Sequential Dependencies)

```
Stage 0 (Setup)
    ↓
Stage 4 (State Management)
    ↓
Stage 5 (WebRTC Foundation)
    ↓
Stage 6 (Signaling Client)
    ↓
Stage 12 (Cockpit Integration) ← CRITICAL
    ↓
Stage 14 (Error Handling)
    ↓
Stage 15 (Testing)
```

### Recommended Parallel Execution

**Week 1**:
- Stage 0 (Day 1)
- Stage 1 || Stage 2 || Stage 3 (Day 1-2)
- Stage 4 || Stage 7 (Day 2)
- Stage 5 || Stage 8 (Day 3-4)

**Week 2**:
- Stage 6 (Day 1)
- Stage 9 || Stage 10 || Stage 11 || Stage 13 (Day 1-3)
- Stage 12 (Day 4-5) ← Focus all resources here

**Week 3**:
- Stage 14 (Day 1-2)
- Stage 15 (Day 2-5)
- Buffer for bug fixes

## Agent Assignments Summary

| Agent Type | Stages | Total Hours |
|-----------|--------|-------------|
| Mobile Infrastructure Agent | 0 | 2-3h |
| UI/UX Agent | 1, 8, 9, 10, 11 | 21-26h |
| Backend Integration Agent | 2 | 4-5h |
| Security/Crypto Agent | 3 | 5-6h |
| State Management Agent | 4, 10 (partial) | 7-9h |
| WebRTC Specialist Agent | 5, 6 | 11-13h |
| Navigation Agent | 7 | 2-3h |
| Integration Agent | 12 | 8-10h |
| Content Agent | 13 | 4-5h |
| QA/Testing Agent | 14, 15 | 15-18h |

**Total Estimated Hours**: 79-98 hours (2-2.5 weeks for single developer, 1-1.5 weeks for team)

## Risk Mitigation

### High-Risk Areas

1. **Stage 12 (Cockpit Integration)**
   - **Risk**: Complex WebRTC + encryption + state coordination
   - **Mitigation**: Allocate extra time, use pair programming, test incrementally

2. **WebRTC Connection Reliability**
   - **Risk**: ICE failures, connection drops
   - **Mitigation**: Implement robust reconnection logic, extensive logging, test on multiple networks

3. **Encryption Key Management**
   - **Risk**: Key derivation issues, decryption failures
   - **Mitigation**: Unit test extensively, add debug logging, validate against v1 behavior

### Medium-Risk Areas

1. **Keyboard Behavior (iOS vs Android)**
   - **Risk**: Different keyboard avoidance behavior
   - **Mitigation**: Test early on both platforms, use platform-specific adjustments

2. **WebSocket Reconnection**
   - **Risk**: Reconnection storms, infinite loops
   - **Mitigation**: Implement exponential backoff, max retry limits, circuit breaker pattern

## Success Criteria

**Phase 1 Complete When**:
- [ ] User can mint a token from Landing screen
- [ ] User can join session with token from Landing screen
- [ ] Two users can connect via WebRTC
- [ ] Messages are encrypted and transmitted via WebRTC data channel
- [ ] Messages are decrypted and displayed in message list
- [ ] Connection status indicator reflects actual state
- [ ] Session timer countdown works correctly
- [ ] Session ends gracefully when timer expires
- [ ] All help screens are accessible and display content
- [ ] Menu drawer works on Cockpit screen
- [ ] Back button behavior is correct (with confirmation)
- [ ] App runs on iOS and Android without crashes

## Next Steps After Phase 1

1. User testing with real participants
2. Performance profiling and optimization
3. Crash reporting integration (Sentry)
4. Analytics integration (optional)
5. Plan Phase 2 (video/audio UI)

## Appendix: File Checklist

Create these files during implementation:

```
mobile/v2/
├── .env.template
├── README.md
├── App.tsx
├── src/
│   ├── screens/
│   │   ├── LandingScreen.tsx
│   │   ├── CockpitScreen.tsx
│   │   ├── HelpScreen.tsx
│   │   ├── PrivacyScreen.tsx
│   │   ├── AboutScreen.tsx
│   │   └── FAQScreen.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── StatusDot.tsx
│   │   ├── cockpit/
│   │   │   ├── CockpitHeader.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── MenuDrawer.tsx
│   │   └── forms/
│   │       ├── MintTokenForm.tsx
│   │       └── JoinSessionForm.tsx
│   ├── webrtc/
│   │   ├── WebRTCManager.ts
│   │   ├── DataChannelManager.ts
│   │   ├── SignalingClient.ts
│   │   ├── config.ts
│   │   └── types.ts
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── tokens.ts
│   │   │   ├── sessions.ts
│   │   │   └── types.ts
│   │   └── encryption/
│   │       ├── crypto.ts
│   │       ├── messages.ts
│   │       └── types.ts
│   ├── state/
│   │   ├── stores/
│   │   │   ├── sessionStore.ts
│   │   │   ├── messagesStore.ts
│   │   │   └── connectionStore.ts
│   │   └── types.ts
│   ├── navigation/
│   │   ├── index.tsx
│   │   └── types.ts
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   └── config.ts
│   ├── utils/
│   │   ├── env.ts
│   │   ├── validation.ts
│   │   └── formatting.ts
│   └── types/
│       └── index.ts
└── __tests__/
    ├── encryption.test.ts
    ├── api.test.ts
    └── stores.test.ts
```

Total: ~45 files

---

**Document Version**: 1.0
**Last Updated**: 2025-12-21
**Status**: Ready for Implementation
