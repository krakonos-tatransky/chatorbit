# ChatOrbit Architecture

## System Overview

ChatOrbit is a token-based, two-person chat application designed for ephemeral, secure communications with integrated video capabilities. The system emphasizes privacy through end-to-end encryption, minimal backend storage, and peer-to-peer WebRTC connections.

### Architecture Diagram

```
┌──────────────────┐         ┌──────────────────┐
│   Next.js Web    │◄───────►│    FastAPI       │
│   Frontend       │  HTTP   │    Backend       │
│   (Port 3000)    │  WS     │   (Port 50001)   │
└──────────────────┘         └──────────────────┘
         ▲                            ▲
         │                            │
         │ WebRTC P2P                │ HTTP/WS
         │ (Signaling via Backend)   │
         ▼                            ▼
┌──────────────────┐         ┌──────────────────┐
│  React Native    │◄────────┤    SQLite DB     │
│  Mobile App      │         │   (Sessions)     │
│  (Expo)          │         │   data/chat.db   │
└──────────────────┘         └──────────────────┘
```

### Core Architectural Principles

1. **Ephemeral by Design**: Messages not stored on backend; exist only in client memory
2. **Token-Gated Access**: Time-limited, single-use tokens control session access
3. **End-to-End Encryption**: AES-GCM encryption for all messages, keys derived client-side
4. **Peer-to-Peer Video**: WebRTC direct connections, backend only coordinates signaling
5. **Cross-Platform Consistency**: Shared design system and i18n between web and mobile
6. **Minimal Backend State**: Backend coordinates but doesn't participate in conversations

## Data Flow

### Complete Session Lifecycle

```
1. TOKEN REQUEST (Client A → Backend)
   ┌─────────┐
   │ Client  │ POST /api/tokens/issue
   │    A    │ {validity: "week", ttl: 120, msgLimit: 2000}
   └─────────┘
        │
        ▼
   ┌─────────┐
   │ Backend │ Generate 12-char token
   │         │ Store in DB with params
   └─────────┘
        │
        ▼
   ┌─────────┐
   │ Client  │ Receives token: "ABCD1234WXYZ"
   │    A    │ Shows share UI
   └─────────┘

2. HOST JOIN (Client A → Backend)
   ┌─────────┐
   │ Client  │ POST /api/tokens/join
   │    A    │ {token: "ABCD1234WXYZ", clientId: "host-123"}
   └─────────┘
        │
        ▼
   ┌─────────┐
   │ Backend │ Reserve host seat
   │         │ Update: host_id, host_joined_at
   └─────────┘
        │
        ▼
   ┌─────────┐
   │ Client  │ Role: HOST
   │    A    │ Status: WAITING_FOR_GUEST
   └─────────┘

3. GUEST JOIN (Client B → Backend)
   ┌─────────┐
   │ Client  │ POST /api/tokens/join
   │    B    │ {token: "ABCD1234WXYZ", clientId: "guest-456"}
   └─────────┘
        │
        ▼
   ┌─────────┐
   │ Backend │ Activate session
   │         │ Update: guest_id, guest_joined_at, activated_at
   │         │ Start TTL countdown
   └─────────┘
        │
        ▼
   ┌─────────┐                    ┌─────────┐
   │ Client  │ WS: session-status │ Client  │
   │    A    │◄───────────────────┤    B    │
   │ Role:   │                    │ Role:   │
   │ HOST    │                    │ GUEST   │
   └─────────┘                    └─────────┘
        │                              │
        └──────── BOTH ACTIVE ─────────┘

4. MESSAGE EXCHANGE (WebSocket Relay)
   ┌─────────┐                    ┌─────────┐
   │ Client  │                    │ Backend │
   │    A    │ Encrypt message    │         │
   │         │ with AES-GCM       │         │
   │         ├───────────────────►│         │
   │         │ {type:"message",   │         │
   │         │  encrypted: "...", │         │
   │         │  signature: "..."} │         │
   │         │                    │         │
   │         │                    │ Relay   │
   │         │                    │ as-is   │
   │         │                    │         │
   │         │                    ▼         │
   │         │              ┌─────────┐     │
   │         │              │ Client  │     │
   │         │              │    B    │     │
   │         │              │         │     │
   │         │              │ Decrypt │     │
   │         │              │ message │     │
   │         │              └─────────┘     │
   └─────────┘                              └─────────┘

5. VIDEO CHAT (WebRTC P2P via Signaling)
   ┌─────────┐                              ┌─────────┐
   │ Client  │                              │ Client  │
   │    A    │ createOffer()                │    B    │
   │         ├─────────────────────────────►│         │
   │         │ WS: {type:"webrtc-offer"}   │         │
   │         │                              │         │
   │         │◄─────────────────────────────┤         │
   │         │ WS: {type:"webrtc-answer"}  │ createAnswer()
   │         │                              │         │
   │         ├◄─────── ICE Candidates ─────►│         │
   │         │                              │         │
   └─────────┴──────────────────────────────┴─────────┘
          │                                      │
          └────── Direct P2P Connection ────────┘
                  (Video/Audio streams)

6. SESSION END (Timer Expiry or Manual)
   ┌─────────┐
   │ Backend │ Timer hits 0:00
   │         │ OR
   │         │ POST /api/session/{token}/end
   └─────────┘
        │
        ▼
   ┌─────────┐
   │ Backend │ Mark session as ended
   │         │ Close all WebSocket connections
   └─────────┘
        │
        ▼
   ┌─────────┐                    ┌─────────┐
   │ Client  │ WS: session-ended  │ Client  │
   │    A    │◄───────────────────┤    B    │
   │         │                    │         │
   │ Close   │                    │ Close   │
   │ cleanup │                    │ cleanup │
   └─────────┘                    └─────────┘
```

## Frontend Architecture (Next.js)

### Technology Stack

- **Framework**: Next.js 14.2.15 (App Router)
- **Runtime**: React 18.3.1
- **Language**: TypeScript 5.x
- **Styling**: Handcrafted CSS (no framework)
- **State Management**: React hooks (useState, useEffect, useContext)
- **WebRTC**: Native browser WebRTC APIs
- **i18n**: Custom LanguageProvider with localStorage
- **Build Tool**: Next.js built-in (Turbopack in dev)
- **Package Manager**: pnpm

### Directory Structure

```
frontend/
├── app/                              # Next.js App Router pages
│   ├── page.tsx                      # Landing page (/)
│   ├── layout.tsx                    # Root layout
│   ├── globals.css                   # Global styles
│   ├── session/[token]/
│   │   └── page.tsx                  # Session UI (/session/TOKEN)
│   ├── help/
│   │   └── page.tsx                  # Help & FAQ
│   ├── administracia/
│   │   ├── page.tsx                  # Admin login
│   │   └── reports/page.tsx          # Abuse reports
│   ├── privacy-policy/page.tsx
│   └── terms-of-service/page.tsx
│
├── components/
│   ├── ui/                           # Reusable UI primitives
│   │   ├── button.tsx                # Button with variants
│   │   ├── card.tsx                  # Card container
│   │   ├── input.tsx                 # Form input
│   │   ├── label.tsx                 # Form label
│   │   ├── confirm-dialog.tsx        # Confirmation modal
│   │   └── slot.tsx                  # Polymorphic component
│   │
│   ├── language/
│   │   ├── language-provider.tsx     # i18n React Context
│   │   └── language-switcher.tsx     # Language selection UI
│   │
│   ├── legal/
│   │   ├── legal-aware-link.tsx      # Link that opens legal modal
│   │   ├── legal-overlay-provider.tsx # Legal modal state
│   │   ├── privacy-policy-content.tsx
│   │   └── terms-of-service-content.tsx
│   │
│   ├── admin/
│   │   ├── admin-layout.tsx
│   │   ├── admin-login-panel.tsx
│   │   └── admin-report-row.tsx
│   │
│   ├── help/
│   │   └── help-content.tsx          # Help page content
│   │
│   ├── session-view.tsx              # Main session component
│   ├── token-request-card.tsx        # Token creation form
│   ├── join-session-card.tsx         # Token redemption form
│   ├── report-abuse-modal.tsx        # Abuse reporting
│   ├── site-header.tsx               # Top navigation
│   ├── site-footer.tsx               # Footer links
│   ├── prevent-navigation-prompt.tsx # Unsaved changes warning
│   └── terms-consent-modal.tsx       # Terms acceptance modal
│
├── lib/
│   ├── api.ts                        # API client functions
│   ├── webrtc.ts                     # WebRTC utilities
│   ├── crypto.ts                     # AES-GCM encryption
│   ├── cn.ts                         # Classname utility (clsx + twMerge)
│   └── i18n/
│       └── translations.tsx          # All translations (EN + SK)
│
└── public/
    └── brand/                        # Brand assets
        ├── chat-orbit-logo-token.svg # Primary badge
        ├── chat-orbit-logo-link.svg  # Wide lockup
        └── chat-orbit-logo-glyph.svg # Compact glyph
```

### Key Components

#### session-view.tsx (frontend/components/session-view.tsx)

**Purpose**: Main orchestrator for active chat sessions

**Responsibilities**:
- WebSocket connection lifecycle management
- Message encryption/decryption (AES-GCM)
- WebRTC peer connection setup and teardown
- Media stream management (local/remote video)
- Session state tracking and UI updates
- Timer countdown display
- Message history rendering

**State Management**:
```typescript
// Core session state
const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
const [messages, setMessages] = useState<Message[]>([]);
const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

// WebRTC state
const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
const [localStream, setLocalStream] = useState<MediaStream | null>(null);
const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
const [callState, setCallState] = useState<'idle' | 'requesting' | 'incoming' | 'connecting' | 'active'>('idle');

// WebSocket state
const wsRef = useRef<WebSocket | null>(null);
const [wsReconnectAttempt, setWsReconnectAttempt] = useState(0);
```

**WebSocket Message Handling**:
```typescript
// Incoming message types
type WebSocketMessage =
  | { type: 'session-status'; status: SessionStatus }
  | { type: 'message'; message_id: string; encrypted: string; signature: string; timestamp: number }
  | { type: 'delete'; message_id: string }
  | { type: 'webrtc-offer'; offer: RTCSessionDescriptionInit }
  | { type: 'webrtc-answer'; answer: RTCSessionDescriptionInit }
  | { type: 'webrtc-ice-candidate'; candidate: RTCIceCandidateInit }
  | { type: 'error'; message: string };
```

#### token-request-card.tsx

**Purpose**: Token creation UI with parameter selection

**Form Fields**:
- Validity window (1 day / 1 week / 1 month / 1 year)
- Session TTL in minutes (30, 60, 120, custom)
- Message character limit (200-16,000)

**Validation**:
- TTL must be > 0 and ≤ 10,000 minutes
- Character limit must be 200-16,000
- User must accept terms before submission

#### join-session-card.tsx

**Purpose**: Token redemption UI

**Workflow**:
1. User pastes token
2. Validates format (12 uppercase alphanumeric)
3. POST /api/tokens/join
4. Redirects to /session/[token] on success

### i18n System Architecture

**Design**: React Context + localStorage persistence

**Flow**:
```
1. App starts → LanguageProvider mounts
2. Detect language:
   a. Check localStorage for saved preference
   b. Fall back to browser navigator.language
   c. Default to 'en' if unsupported
3. Load translations for detected language
4. Provide via React Context
5. On language change:
   a. Update context state
   b. Persist to localStorage
   c. Re-render all consumers
```

**Context Structure**:
```typescript
type LanguageContextValue = {
  language: LanguageCode;               // 'en' | 'sk'
  setLanguage: (lang: LanguageCode) => void;
  definition: LanguageDefinition;       // {code, label, nativeLabel, flagEmoji}
  translations: AppTranslation;         // All strings for current language
  availableLanguages: LanguageDefinition[]; // ['en', 'sk']
};
```

**Usage Example**:
```typescript
import { useLanguage } from '@/components/language/language-provider';

function MyComponent() {
  const { translations, language, setLanguage } = useLanguage();

  return (
    <div>
      <p>{translations.home.heroTitle}</p>
      <button onClick={() => setLanguage('sk')}>
        Switch to Slovak
      </button>
    </div>
  );
}
```

### Design System

**Color Palette** (from `app/globals.css`):
```css
:root {
  --color-midnight: #020B1F;
  --color-abyss: #041335;
  --color-deep-blue: #06255E;
  --color-ocean: #0A4A89;
  --color-lagoon: #0F6FBA;
  --color-aurora: #6FE7FF;       /* Primary brand */
  --color-ice: #F4F9FF;          /* Text */
  --color-mint: #88E6FF;
  --color-danger: #EF476F;
}
```

**Typography Scale**:
- Headings: 28px (hero), 22px (section), 20px (card)
- Body: 16px (default), 14px (small), 13px (caption)
- Line height: 1.5-1.6 for readability

**Spacing System** (consistent with mobile):
- Container padding: 24px
- Card padding: 28px
- Section gap: 20px
- Element gap: 12-16px
- Border radius: 16-28px (organic feel)

**Component Patterns**:
```typescript
// Button variants
<Button variant="default">   {/* bg-black text-white */}
<Button variant="outline">   {/* border hover:bg-neutral-50 */}
<Button variant="ghost">     {/* transparent hover:bg-neutral-100 */}

// Sizes
<Button size="sm">           {/* h-9 px-3 */}
<Button size="md">           {/* h-10 px-4 */}
<Button size="lg">           {/* h-11 px-5 */}
```

### WebRTC Implementation (frontend/lib/webrtc.ts)

**ICE Configuration**:
```typescript
const config: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    {
      urls: process.env.NEXT_PUBLIC_WEBRTC_TURN_URLS?.split(',') || [],
      username: process.env.NEXT_PUBLIC_WEBRTC_TURN_USER,
      credential: process.env.NEXT_PUBLIC_WEBRTC_TURN_PASSWORD
    }
  ]
};
```

**Connection Setup Flow**:
```
1. User initiates call
   ↓
2. getUserMedia() → Get local camera/mic
   ↓
3. new RTCPeerConnection(config)
   ↓
4. addTrack(localStream) → Add local media to peer connection
   ↓
5. createOffer() → Generate SDP offer
   ↓
6. Send offer via WebSocket to peer
   ↓
7. Receive answer from peer
   ↓
8. Exchange ICE candidates
   ↓
9. Connection established (ontrack event fires)
   ↓
10. Display remote video stream
```

**Error Handling**:
- Camera/mic permission denied → Show help instructions
- ICE connection failed → Retry with TURN server
- Peer disconnected → Display reconnection UI
- Signaling timeout → Show "peer not responding" message

## Mobile Architecture (React Native)

### Technology Stack

- **Framework**: React Native 0.74.x (Expo SDK 51)
- **Runtime**: React 18.2+
- **Language**: TypeScript 5.x
- **Styling**: React Native StyleSheet API
- **WebRTC**: react-native-webrtc 118.x
- **i18n**: Custom LanguageProvider with AsyncStorage
- **Storage**: @react-native-async-storage/async-storage
- **Localization**: expo-localization
- **Package Manager**: npm

### Directory Structure

```
mobile/
├── App.tsx                           # Entry point, LanguageProvider wrapper
├── app.json                          # Expo configuration
├── package.json
│
└── src/
    ├── components/
    │   ├── AcceptScreen.tsx          # Terms acceptance (first screen)
    │   ├── BigActionButton.tsx       # Large action button component
    │   │
    │   ├── InAppSessionScreen/       # Main session interface
    │   │   ├── index.tsx             # Container component
    │   │   ├── ChatSection.tsx       # Message list + composer
    │   │   ├── StatusSection.tsx     # Session info, timer, participants
    │   │   └── VideoSection.tsx      # WebRTC video UI
    │   │
    │   ├── forms/
    │   │   ├── JoinTokenForm.tsx     # Token redemption form
    │   │   └── NeedTokenForm.tsx     # Token creation form
    │   │
    │   └── session/
    │       └── TokenResultCard.tsx   # Token display after creation
    │
    ├── constants/
    │   ├── colors.ts                 # Color palette (matches frontend)
    │   ├── layout.ts                 # Spacing constants
    │   ├── styles.ts                 # Global StyleSheet definitions
    │   ├── options.ts                # Form option lists
    │   ├── session.ts                # Session constants
    │   ├── timings.ts                # Timing constants
    │   └── webrtc.ts                 # WebRTC configuration
    │
    ├── i18n/
    │   ├── index.ts                  # Public exports
    │   ├── translations.ts           # EN + SK translations
    │   ├── LanguageProvider.tsx      # React Context + AsyncStorage
    │   ├── LanguageSwitcher.tsx      # Language selection modal
    │   └── README.md                 # Usage documentation
    │
    ├── types/
    │   ├── index.ts                  # Type exports
    │   ├── session.ts                # Session types
    │   ├── webrtc.ts                 # WebRTC types
    │   └── crypto.ts                 # Crypto types
    │
    ├── utils/
    │   ├── crypto.ts                 # AES-GCM encryption
    │   ├── webrtc.ts                 # WebRTC helpers
    │   ├── session.ts                # Session utilities
    │   ├── formatting.ts             # Date/time formatting
    │   └── errorHandling.ts          # Error utilities
    │
    ├── session/
    │   └── config.ts                 # API endpoints, client identity
    │
    └── native/
        └── consoleFilters.ts         # Debug log filtering
```

### Key Components

#### AcceptScreen.tsx

**Purpose**: First screen - terms of service acceptance

**Features**:
- Scrollable terms content
- Accept button enabled after scrolling to bottom
- Language switcher in header
- Blocks app usage until accepted

**i18n Integration**:
```typescript
const { translations } = useLanguage();

<Text>{translations.termsModal.agree}</Text>  // "AGREE" or "SÚHLASÍM"
<Text>{translations.termsModal.helper}</Text> // "Scroll to accept..." or "Prejdite celý dokument..."
```

#### InAppSessionScreen

**Purpose**: Main session orchestrator (equivalent to frontend's session-view)

**Sub-components**:
1. **StatusSection**: Timer, participant list, session metadata
2. **ChatSection**: Message list with FlatList + message composer
3. **VideoSection**: Local/remote video views, call controls

**State Management**:
```typescript
const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
const [messages, setMessages] = useState<Message[]>([]);
const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
const [localStream, setLocalStream] = useState<MediaStream | null>(null);
const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
```

### i18n System Architecture

**Design**: React Context + AsyncStorage + expo-localization

**Differences from Frontend**:

| Feature | Frontend | Mobile |
|---------|----------|--------|
| Storage | localStorage | AsyncStorage |
| Language detection | navigator.language | expo-localization.locale |
| Translation format | Can include JSX | Plain strings only |
| Switcher UI | Dropdown menu | Modal with list |

**AsyncStorage Persistence**:
```typescript
// On mount
const stored = await AsyncStorage.getItem('chatOrbit.language');
if (stored) setLanguage(stored);

// On language change
await AsyncStorage.setItem('chatOrbit.language', newLanguage);
```

**Device Language Detection**:
```typescript
import * as Localization from 'expo-localization';

const deviceLocale = Localization.locale?.slice(0, 2); // 'en-US' → 'en'
if (SUPPORTED_LANGUAGES.includes(deviceLocale)) {
  setLanguage(deviceLocale);
}
```

### Design System

**Colors** (from `src/constants/colors.ts`):
```typescript
export const COLORS = {
  midnight: '#020B1F',
  abyss: '#041335',
  deepBlue: '#06255E',
  ocean: '#0A4A89',
  lagoon: '#0F6FBA',
  aurora: '#6FE7FF',       // Primary brand (matches frontend)
  ice: '#F4F9FF',          // Text (matches frontend)
  mint: '#88E6FF',
  white: '#FFFFFF',
  glowSoft: 'rgba(4, 23, 60, 0.96)',
  glowWarm: 'rgba(9, 54, 120, 0.88)',
  glowEdge: 'rgba(111, 214, 255, 0.55)',
  cobaltShadow: 'rgba(3, 20, 46, 0.6)',
  danger: '#EF476F'
};
```

**Spacing** (from `src/constants/layout.ts`):
```typescript
export const SPACING = {
  CONTAINER_TOP: 48,
  CONTAINER_HORIZONTAL: 20,
  IN_SESSION_TOP: 12,
  IN_SESSION_HORIZONTAL: 12,
  SECTION_GAP: 20,
  CONTENT_GAP: 16,
  CARD_RADIUS: 28,
  CARD_PADDING: 24,
  BUTTON_RADIUS: 18,
  BUTTON_PADDING: 16,
  ACTION_RADIUS: 24,
  LARGE_ICON: 64
};
```

**StyleSheet Patterns**:
```typescript
// Card style (consistent with frontend Card component)
termsCard: {
  borderRadius: SPACING.CARD_RADIUS,
  padding: SPACING.CARD_PADDING,
  borderWidth: 1,
  borderColor: COLORS.glowEdge,
  shadowColor: COLORS.cobaltShadow,
  shadowOffset: { width: 0, height: 18 },
  shadowOpacity: 0.35,
  shadowRadius: 32,
  elevation: 12  // Android shadow
}
```

### WebRTC Implementation (mobile/src/utils/webrtc.ts)

**Platform-Specific Considerations**:

1. **Permissions**:
   ```typescript
   // Request camera/microphone permissions before getUserMedia
   import { PermissionsAndroid, Platform } from 'react-native';

   if (Platform.OS === 'android') {
     await PermissionsAndroid.requestMultiple([
       PermissionsAndroid.PERMISSIONS.CAMERA,
       PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
     ]);
   }
   ```

2. **Media Constraints**:
   ```typescript
   const constraints = {
     audio: true,
     video: {
       facingMode: 'user',  // Front camera
       width: { ideal: 1280 },
       height: { ideal: 720 }
     }
   };
   ```

3. **Signaling State Checks** (critical for mobile stability):
   ```typescript
   // Added Dec 2024 to fix disconnection issues
   if (peerConnection.signalingState === 'stable') {
     await peerConnection.setRemoteDescription(answer);
   } else {
     console.warn('Signaling state not stable:', peerConnection.signalingState);
   }
   ```

4. **RTCView Component**:
   ```typescript
   import { RTCView } from 'react-native-webrtc';

   <RTCView
     streamURL={localStream.toURL()}
     objectFit="cover"
     mirror={true}  // Mirror for front camera
     style={styles.videoSurface}
   />
   ```

## Backend Architecture (FastAPI)

### Technology Stack

- **Framework**: FastAPI 0.104+
- **Database**: SQLAlchemy 2.x ORM with SQLite 3.x
- **WebSocket**: FastAPI WebSocket support (Starlette)
- **Validation**: Pydantic 2.x schemas
- **Email**: SMTP (Python smtplib)
- **ASGI Server**: Uvicorn (production: gunicorn + uvicorn workers)

### Directory Structure

```
backend/
├── app/
│   ├── main.py                   # FastAPI app, routes, WebSocket gateway
│   ├── config.py                 # Settings from environment (pydantic-settings)
│   ├── database.py               # SQLAlchemy engine + session factory
│   ├── models.py                 # Database models (Session table)
│   ├── schemas.py                # Pydantic request/response schemas
│   ├── security.py               # Token validation, rate limiting
│   └── email_utils.py            # Email notifications (SMTP)
│
├── tests/
│   └── test_sessions.py          # Pytest suite
│
├── requirements.txt
├── data/                         # SQLite database (gitignored)
│   └── chat.db
│
└── .env                          # Environment variables (gitignored)
```

### Database Schema

#### Session Model (app/models.py)

```python
from sqlalchemy import Column, String, Integer, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Session(Base):
    __tablename__ = "sessions"

    # Primary key
    token = Column(String(12), primary_key=True, index=True)

    # Token configuration
    valid_until = Column(DateTime, nullable=False)       # When token expires
    ttl_minutes = Column(Integer, nullable=False)        # Active session duration
    max_message_length = Column(Integer, nullable=False) # Character limit per message

    # Participant tracking
    host_id = Column(String, nullable=True)              # First joiner client ID
    guest_id = Column(String, nullable=True)             # Second joiner client ID
    host_joined_at = Column(DateTime, nullable=True)
    guest_joined_at = Column(DateTime, nullable=True)

    # Session lifecycle
    activated_at = Column(DateTime, nullable=True)       # When guest joined (timer starts)
    ended_at = Column(DateTime, nullable=True)           # When session ended
    deleted = Column(Boolean, default=False)             # Soft delete flag

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Indexes**:
- Primary index on `token` (automatic)
- Index on `created_at` for cleanup queries

**Session States** (derived from columns):
```python
def get_session_state(session: Session) -> str:
    if session.ended_at or session.deleted:
        return "ENDED"
    elif session.activated_at:
        return "ACTIVE"
    elif session.host_id:
        return "HOST_RESERVED"
    else:
        return "CREATED"
```

### API Endpoints (app/main.py)

#### Token Management

**POST /api/tokens/issue**
```python
Request:
{
  "validity_option": "week",      # "day" | "week" | "month" | "year"
  "ttl_minutes": 120,
  "max_message_length": 2000
}

Response:
{
  "token": "ABCD1234WXYZ",
  "valid_until": "2025-01-27T12:00:00Z",
  "ttl_minutes": 120,
  "max_message_length": 2000
}
```

**POST /api/tokens/join**
```python
Request:
{
  "token": "ABCD1234WXYZ",
  "client_identity": "host-abc-123"
}

Response:
{
  "role": "host" | "guest",
  "session_status": {
    "token": "ABCD1234WXYZ",
    "state": "HOST_RESERVED" | "ACTIVE",
    "participants": {...},
    "timer": {...}
  }
}
```

**GET /api/session/{token}/status**
```python
Response:
{
  "token": "ABCD1234WXYZ",
  "state": "ACTIVE",
  "participants": {
    "host": {
      "id": "host-abc-123",
      "joined_at": "2025-01-20T10:00:00Z"
    },
    "guest": {
      "id": "guest-def-456",
      "joined_at": "2025-01-20T10:05:00Z"
    }
  },
  "timer": {
    "started_at": "2025-01-20T10:05:00Z",
    "ttl_minutes": 120,
    "ends_at": "2025-01-20T12:05:00Z",
    "remaining_seconds": 6543
  }
}
```

#### Session Control

**POST /api/session/{token}/end**
```python
Request:
{
  "client_identity": "host-abc-123"
}

Response:
{
  "message": "Session ended",
  "ended_at": "2025-01-20T11:30:00Z"
}
```

**DELETE /api/session/{token}/message/{message_id}**
```python
# No request body

Response:
{
  "message": "Message deletion broadcast",
  "message_id": "uuid-v4-here"
}
```

### WebSocket Protocol (WS /api/ws/{token}/{client_identity})

**Connection Lifecycle**:
```
1. Client connects: ws://backend/api/ws/ABCD1234WXYZ/host-abc-123
2. Backend validates: token exists, session active, client is participant
3. Backend sends: session-status message
4. Client sends/receives messages
5. Backend relays messages to other participant
6. On timer expiry: Backend sends session-ended, closes connection
```

**Message Types**:

```typescript
// Server → Client: Session status update
{
  "type": "session-status",
  "status": {
    "token": "ABCD1234WXYZ",
    "state": "ACTIVE",
    "participants": {...},
    "timer": {...}
  }
}

// Client → Server → Other Client: Chat message
{
  "type": "message",
  "message_id": "uuid-v4",
  "encrypted": "base64-encoded-aes-gcm-ciphertext",
  "signature": "sha256-hash",
  "timestamp": 1705752000
}

// Client → Server → Other Client: Delete message
{
  "type": "delete",
  "message_id": "uuid-v4"
}

// Client → Server → Other Client: WebRTC signaling
{
  "type": "webrtc-offer",
  "offer": {
    "type": "offer",
    "sdp": "v=0\r\no=- ..."
  }
}

{
  "type": "webrtc-answer",
  "answer": {
    "type": "answer",
    "sdp": "v=0\r\no=- ..."
  }
}

{
  "type": "webrtc-ice-candidate",
  "candidate": {
    "candidate": "candidate:...",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  }
}

// Server → Client: Session ended
{
  "type": "session-ended",
  "reason": "timer_expired" | "manually_ended",
  "ended_at": "2025-01-20T12:05:00Z"
}

// Server → Client: Error
{
  "type": "error",
  "message": "Invalid message format"
}
```

### Rate Limiting (app/security.py)

**Implementation**: In-memory token bucket per IP address

```python
# Global state (production: use Redis)
rate_limit_buckets: Dict[str, List[Tuple[datetime, str]]] = {}

def check_rate_limit(ip_address: str, limit: int = 10) -> Tuple[bool, int]:
    """
    Returns (allowed: bool, remaining: int)
    Sliding window: last 60 minutes
    """
    now = datetime.utcnow()
    cutoff = now - timedelta(hours=1)

    # Get bucket for IP
    bucket = rate_limit_buckets.get(ip_address, [])

    # Remove old entries
    bucket = [(ts, token) for ts, token in bucket if ts > cutoff]

    # Check limit
    if len(bucket) >= limit:
        rate_limit_buckets[ip_address] = bucket
        return False, 0

    # Add new entry (will be added after token creation)
    rate_limit_buckets[ip_address] = bucket
    return True, limit - len(bucket)
```

**Configuration**:
```bash
CHAT_TOKEN_RATE_LIMIT_PER_HOUR=10  # Default: 10 tokens/hour per IP
```

**Response Headers**:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1705755600  # Unix timestamp
```

### Security

**Token Generation** (app/security.py):
```python
import secrets
import string

def generate_token() -> str:
    """
    Generate cryptographically secure 12-character token
    Character set: A-Z, 0-9 (36^12 = ~4.7 trillion combinations)
    """
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(12))
```

**CORS Configuration** (app/main.py):
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,  # From env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
```

**WebSocket Authentication**:
```python
async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
    client_identity: str
):
    # 1. Validate token exists
    session = db.query(Session).filter_by(token=token).first()
    if not session:
        await websocket.close(code=4004, reason="Token not found")
        return

    # 2. Check session is active
    if session.ended_at or session.deleted:
        await websocket.close(code=4003, reason="Session ended")
        return

    # 3. Verify client is participant
    if client_identity not in [session.host_id, session.guest_id]:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    # 4. Accept connection
    await websocket.accept()
    # ... message handling
```

### Background Tasks

**Session Cleanup** (periodic task):
```python
# Run every 5 minutes (production: Celery or similar)
async def cleanup_expired_sessions():
    now = datetime.utcnow()

    # Find sessions past their end time
    expired = db.query(Session).filter(
        Session.activated_at.isnot(None),
        Session.ended_at.is_(None),
        Session.activated_at + timedelta(minutes=Session.ttl_minutes) < now
    ).all()

    for session in expired:
        session.ended_at = now
        # Close WebSocket connections (tracked in memory)
        await close_session_connections(session.token)

    db.commit()
```

**Rate Limit Cleanup**:
```python
# Run every hour
def cleanup_rate_limits():
    cutoff = datetime.utcnow() - timedelta(hours=1)
    for ip, bucket in list(rate_limit_buckets.items()):
        bucket = [(ts, token) for ts, token in bucket if ts > cutoff]
        if bucket:
            rate_limit_buckets[ip] = bucket
        else:
            del rate_limit_buckets[ip]
```

## Cross-Platform Patterns

### Design System Synchronization

**Shared Color Values**:

Both platforms use identical hex colors:

| Name | Hex | Usage | Frontend File | Mobile File |
|------|-----|-------|---------------|-------------|
| midnight | `#020B1F` | Background | `globals.css` | `colors.ts` |
| aurora | `#6FE7FF` | Primary CTA | `globals.css` | `colors.ts` |
| ice | `#F4F9FF` | Text | `globals.css` | `colors.ts` |
| danger | `#EF476F` | Errors | `globals.css` | `colors.ts` |

**Component Equivalents**:

| Purpose | Frontend | Mobile | Notes |
|---------|----------|--------|-------|
| Primary action button | `<Button variant="default">` | `<BigActionButton>` | Same colors, different shape |
| Card container | `<Card>` | `styles.tokenCard` | Same border radius, padding |
| Text input | `<Input>` | `<TextInput>` | Same styling approach |
| Session UI | `session-view.tsx` | `InAppSessionScreen/` | Split into sub-components on mobile |

**Layout Consistency**:

```typescript
// Frontend (CSS)
.container {
  padding: 24px;
  gap: 20px;
  border-radius: 28px;
}

// Mobile (StyleSheet)
container: {
  padding: 24,
  gap: 20,
  borderRadius: 28
}
```

### i18n Synchronization

**Translation Key Structure** (identical on both platforms):

```typescript
// Both frontend and mobile
translations.home.heroTitle
translations.session.chat.sendButton
translations.session.chat.emptyState
translations.termsModal.agree
translations.tokenCard.submitIdle
```

**Sync Workflow**:

1. **Add translation to frontend**:
   ```typescript
   // frontend/lib/i18n/translations.tsx
   const baseTranslation = {
     // ...
     newFeature: {
       title: 'New Feature',
       description: 'This is a new feature'
     }
   };

   // Slovak
   sk: {
     ...baseTranslation,
     newFeature: {
       title: 'Nová funkcia',
       description: 'Toto je nová funkcia'
     }
   }
   ```

2. **Port to mobile**:
   ```typescript
   // mobile/src/i18n/translations.ts
   const baseTranslation = {
     // ...
     newFeature: {
       title: 'New Feature',
       description: 'This is a new feature'
     }
   };

   // Slovak (same structure)
   sk: {
     ...baseTranslation,
     newFeature: {
       title: 'Nová funkcia',
       description: 'Toto je nová funkcia'
     }
   }
   ```

3. **Update components**:
   ```typescript
   // Both platforms
   const { translations } = useLanguage();
   <Text>{translations.newFeature.title}</Text>
   ```

**Platform Differences**:

| Aspect | Frontend | Mobile |
|--------|----------|--------|
| Storage | localStorage | AsyncStorage |
| Detection | navigator.language | expo-localization.locale |
| JSX in translations | ✅ Allowed (terms/privacy) | ❌ Plain strings only |
| Switcher UI | Dropdown menu | Modal with list |

### WebRTC Cross-Platform Flow

**Signaling Sequence**:

```
Browser Client                Backend                    Mobile Client
      │                         │                              │
      │─── createOffer() ───────┤                              │
      │                         │                              │
      │─── WS: offer ──────────►│                              │
      │                         │─── WS: offer ──────────────►│
      │                         │                              │
      │                         │                              │─── setRemoteDescription(offer)
      │                         │                              │─── createAnswer()
      │                         │                              │
      │                         │◄─── WS: answer ─────────────│
      │◄─── WS: answer ─────────│                              │
      │                         │                              │
      │─── setRemoteDescription │                              │
      │                         │                              │
      │─── ICE candidates ─────►│─── ICE candidates ─────────►│
      │◄─── ICE candidates ─────│◄─── ICE candidates ─────────│
      │                         │                              │
      └─────────────────────────┴──────────────────────────────┘
                     P2P Connection Established
```

**Platform-Specific Handling**:

```typescript
// Browser (frontend/lib/webrtc.ts)
const pc = new RTCPeerConnection(config);
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
// Send via WebSocket

// Mobile (mobile/src/utils/webrtc.ts)
import { RTCPeerConnection } from 'react-native-webrtc';

const pc = new RTCPeerConnection(config);
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

// Mobile-specific: Check signaling state
if (pc.signalingState === 'stable') {
  await pc.setRemoteDescription(answer);
}
```

### WebRTC Negotiation State Machine

ChatOrbit implements a sophisticated WebRTC negotiation state machine to prevent "glare" conditions (simultaneous offers from both peers) and ensure reliable browser-mobile connectivity.

#### Signaling State Machine

WebRTC peer connections progress through these signaling states:

```
stable → have-local-offer → stable (offer/answer complete)
   │
   └→ have-remote-offer → stable (answer/offer complete)
```

**Critical Rule**: New offers can ONLY be created when `signalingState === 'stable'`

**Implementation** (both frontend and mobile):
- `frontend/components/session-view.tsx:2173-2189`
- `mobile/App.tsx:1421-1428`

```typescript
async function renegotiate(pc: RTCPeerConnection) {
  // Critical: Check signaling state before creating offer
  if (pc.signalingState !== 'stable') {
    logEvent('Deferring renegotiation until signaling state stabilizes', {
      signalingState: pc.signalingState,
    });
    negotiationPendingRef.current = true;
    return;
  }

  negotiationPendingRef.current = false;
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  sendSignal('offer', offer);
}
```

#### Glare Prevention Mechanism

**Problem**: When both peers try to add media tracks simultaneously, both trigger `onnegotiationneeded`, both create offers, leading to:
- Conflicting SDP offers
- `setRemoteDescription` failures
- Buffered ICE candidates never applied
- Repeated connection resets

**Solution**: Deferred Negotiation Pattern

```
Peer A (Browser)                  Peer B (Mobile)
      │                                 │
      │ onnegotiationneeded              │ onnegotiationneeded
      │ signalingState = 'stable'        │ signalingState = 'stable'
      │                                 │
      ├─ createOffer()                  ├─ createOffer()
      ├─ setLocalDescription()          │  (blocks - state check)
      │  signalingState = 'have-local-offer'
      │                                 │
      ├─ send offer ──────────────────►│
      │                                 ├─ setRemoteDescription()
      │                                 │  signalingState = 'have-remote-offer'
      │                                 │
      │                                 ├─ negotiationPendingRef = true
      │                                 │  (defers second offer)
      │                                 │
      │                                 ├─ createAnswer()
      │                                 ├─ setLocalDescription()
      │                                 │  signalingState = 'stable' ✓
      │                                 │
      │◄────────── send answer ─────────┤
      ├─ setRemoteDescription()         │
      │  signalingState = 'stable' ✓    │
      │                                 │
      │                                 │ onsignalingstatechange('stable')
      │                                 ├─ retry deferred negotiation
      │                                 ├─ createOffer() (now allowed)
      │◄──────── send offer ────────────┤
      │                                 │
      └───────────────────────────────────► both peers synchronized
```

**Key Components**:

1. **State Check Before Offer** (`mobile/App.tsx:1421`):
   ```typescript
   if (pc.signalingState !== 'stable') {
     negotiationPendingRef.current = true;
     return;
   }
   ```

2. **State Change Listener** (`mobile/App.tsx:1812-1818`):
   ```typescript
   pc.onsignalingstatechange = () => {
     if (pc.signalingState === 'stable' && negotiationPendingRef.current) {
       void negotiateMediaUpdate(pc, 'deferred-negotiation-retry');
     }
   };
   ```

3. **Negotiation Pending Flag**:
   - Tracks whether a negotiation was deferred
   - Cleared when negotiation completes
   - Reset on peer connection reset

#### ICE Candidate Buffering

**Problem**: ICE candidates arrive before `setRemoteDescription` completes, causing `addIceCandidate()` to fail.

**Solution**: Buffer candidates until remote description is set

```typescript
// frontend/components/session-view.tsx:2774-2779
// mobile/App.tsx:862-874

if (pc.remoteDescription) {
  await pc.addIceCandidate(candidateInit);
  logEvent('Applied ICE candidate from peer');
} else {
  pendingCandidatesRef.current.push(candidateInit);
  logEvent('Queued ICE candidate until remote description is available');
}
```

**Flush After Remote Description**:
```typescript
async function flushPendingCandidates(pc: RTCPeerConnection) {
  if (!pc.remoteDescription) return;

  const backlog = pendingCandidatesRef.current.splice(0);
  for (const candidate of backlog) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      logEvent('Failed to apply buffered ICE candidate', { error: err });
    }
  }
}
```

**Candidate Deduplication** (`mobile/App.tsx:795-816`):
- Candidates keyed by `candidate + sdpMid + sdpMLineIndex`
- Duplicates ignored to prevent unnecessary processing
- Stale candidates cleared on peer reset

#### Renegotiation Flow (Media Track Addition)

**Trigger**: User grants camera/microphone permission

```
Initial State (Data Channel Only)
      │
      ├─ getUserMedia() succeeds
      ├─ addTrack(audioTrack, pc)
      ├─ addTrack(videoTrack, pc)
      │
      └─ onnegotiationneeded fires
             │
             ├─ Check: pc.signalingState === 'stable'?
             │     YES → createOffer() with audio/video m-lines
             │     NO  → negotiationPendingRef = true, defer
             │
             ├─ setLocalDescription(offer)
             ├─ Send offer via WebSocket
             │
             └─ Peer receives offer
                   ├─ setRemoteDescription(offer)
                   ├─ createAnswer() (matches m-lines)
                   ├─ setLocalDescription(answer)
                   └─ Send answer back
                         │
                         └─ Original peer: setRemoteDescription(answer)
                               └─ Renegotiation complete ✓
```

**Host vs Guest Behavior**:
- **Host** (`participantRole === 'host'`): Initiates renegotiation on `onnegotiationneeded`
- **Guest**: Does NOT renegotiate automatically, waits for host offers

```typescript
// mobile/App.tsx:1809
peerConnection.onnegotiationneeded = () => {
  if (participantRole === 'host') {
    void negotiateMediaUpdate(pc, 'onnegotiationneeded');
  }
};
```

#### Error Recovery

**ICE Failure Recovery** (`mobile/App.tsx:1789-1807`):

When ICE candidate error 438 (stale nonce) occurs:

```typescript
const MAX_ICE_FAILURE_RETRIES = 3;

pc.addEventListener('icecandidateerror', (event) => {
  if (event.errorCode === 438 && iceFailureRetriesRef.current < MAX_ICE_FAILURE_RETRIES) {
    const attempt = iceFailureRetriesRef.current + 1;
    iceFailureRetriesRef.current = attempt;

    const delay = Math.min(1000 * 2 ** attempt, 10000); // Exponential backoff
    logEvent('Stale nonce detected, retrying', { attempt, delay });

    setTimeout(() => {
      resetPeerConnection(); // Creates new peer with fresh ICE
    }, delay);
  }
});
```

**Backoff Strategy**:
- Attempt 1: 2 second delay
- Attempt 2: 4 second delay
- Attempt 3: 8 second delay
- After 3 failures: Manual reconnection required

**SetRemoteDescription Failure** (`mobile/App.tsx:838-846`):

```typescript
try {
  await pc.setRemoteDescription(new RTCSessionDescription(detail));
  await flushPendingCandidates(pc);
} catch (err) {
  logEvent('failed to apply remote offer - clearing pending candidates', {
    error: err instanceof Error ? err.message : String(err)
  });
  pendingCandidatesRef.current = []; // Clear stale candidates
  throw err; // Propagate for higher-level recovery
}
```

#### State Cleanup on Reset

When peer connection is reset:

```typescript
// mobile/App.tsx:941-945
pendingCandidatesRef.current = [];
seenCandidatesRef.current.clear();
iceFailureRetriesRef.current = 0;
negotiationPendingRef.current = false;
hasSentOfferRef.current = false;
```

This ensures no stale state carries over to the new connection attempt.

#### Cross-Platform Implementation Comparison

| Feature | Frontend (Browser) | Mobile (React Native) |
|---------|-------------------|----------------------|
| **Signaling State Checks** | ✅ `session-view.tsx:2173` | ✅ `App.tsx:1421` |
| **Negotiation Pending Flag** | ✅ `negotiationPendingRef` | ✅ `negotiationPendingRef` |
| **ICE Candidate Buffering** | ✅ `pendingCandidatesRef` | ✅ `pendingCandidatesRef` |
| **Deferred Retry on Stable** | ✅ `onsignalingstatechange` | ✅ `onsignalingstatechange` |
| **Candidate Deduplication** | ✅ `seenCandidatesRef` | ✅ `seenCandidatesRef` |
| **ICE Failure Retry** | ✅ Exponential backoff | ✅ Exponential backoff |
| **Error Surfacing** | ✅ Logs state + error | ✅ Logs state + error |

Both platforms implement identical negotiation logic, ensuring reliable cross-platform connectivity.

**Related Issue**: `docs/issues.md` - "WebRTC browser ↔ mobile troubleshooting" (RESOLVED)

**Key Commits**:
- `21f04f3` - Fix browser-to-mobile video disconnection by adding signaling state checks
- `18171dd` - Fix critical WebRTC issues in mobile app for browser-mobile compatibility

### Message Encryption Cross-Platform

**AES-GCM Encryption** (identical algorithm on both):

```typescript
// Key derivation (both platforms)
import { subtle } from 'crypto'; // Browser
import { subtle } from 'react-native-quick-crypto'; // Mobile polyfill

async function deriveKey(token: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(token),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('chatOrbitSalt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encryption (both platforms)
async function encryptText(plaintext: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce

  const ciphertext = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Combine IV + ciphertext, encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}
```

**Message Format** (sent over WebSocket, same on both):

```json
{
  "type": "message",
  "message_id": "550e8400-e29b-41d4-a716-446655440000",
  "encrypted": "AQIDBAUGBwgJCgsMDQ4P...", // IV + ciphertext (base64)
  "signature": "abc123...",                // SHA-256 of plaintext
  "timestamp": 1705752000
}
```

## Infrastructure

### Development Environment

**Docker Compose** (`infra/docker-compose.yml`):

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
    ports:
      - "50001:50001"
    volumes:
      - ../backend:/app
      - backend-data:/app/data
    environment:
      - CHAT_DATABASE_URL=sqlite:////app/data/chat.db
      - CHAT_CORS_ALLOWED_ORIGINS=["http://localhost:3000"]
    command: uvicorn app.main:app --host 0.0.0.0 --port 50001 --reload

  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ../frontend:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:50001
      - NEXT_PUBLIC_WS_BASE_URL=ws://localhost:50001
    command: pnpm dev

volumes:
  backend-data:
```

**Mobile Development**:

```bash
# Terminal 1: Start backend
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 50001 --reload

# Terminal 2: Start Expo
cd mobile
npm start

# Scan QR code with Expo Go app on phone
# OR
# Press 'a' for Android emulator
# Press 'i' for iOS simulator
```

**Environment Configuration**:

```bash
# Backend (.env)
CHAT_DATABASE_URL=sqlite:///./data/chat.db
CHAT_TOKEN_RATE_LIMIT_PER_HOUR=10
CHAT_CORS_ALLOWED_ORIGINS=["http://localhost:3000","http://192.168.1.100:3000"]

# Frontend (.env.local)
NEXT_PUBLIC_API_BASE_URL=http://localhost:50001
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:50001
NEXT_PUBLIC_WEBRTC_STUN_URLS=["stun:stun.l.google.com:19302"]

# Mobile (src/session/config.ts)
export const API_BASE_URL = 'http://192.168.1.100:50001';
export const WS_BASE_URL = 'ws://192.168.1.100:50001';
```

### Production Deployment

**ISPConfig Integration**:

```
┌─────────────────┐
│  Apache/Nginx   │  SSL Termination
│  Reverse Proxy  │  https://chatorbit.com
└────────┬────────┘  https://api.chatorbit.com
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Frontend│ │Backend │
│:3000   │ │:50001  │
└────────┘ └────────┘
```

**Reverse Proxy Configuration** (Apache):

```apache
<VirtualHost *:443>
    ServerName chatorbit.com
    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem

    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
</VirtualHost>

<VirtualHost *:443>
    ServerName api.chatorbit.com
    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem

    ProxyPass / http://127.0.0.1:50001/
    ProxyPassReverse / http://127.0.0.1:50001/

    # WebSocket support
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:50001/$1" [P,L]
</VirtualHost>
```

**Production Docker Compose** (`infra/docker-compose.production.yml`):

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
    ports:
      - "127.0.0.1:50001:50001"
    volumes:
      - backend-data:/app/data
    environment:
      - CHAT_DATABASE_URL=sqlite:////app/data/chat.db
      - CHAT_CORS_ALLOWED_ORIGINS=["https://chatorbit.com"]
    restart: unless-stopped

  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_API_BASE_URL=https://api.chatorbit.com
        - NEXT_PUBLIC_WS_BASE_URL=wss://api.chatorbit.com
    ports:
      - "127.0.0.1:3000:3000"
    restart: unless-stopped

volumes:
  backend-data:
```

## Performance Considerations

### Frontend

**Optimization Strategies**:

1. **Code Splitting**: Next.js App Router automatic code splitting per route
2. **Lazy Loading**: WebRTC components loaded only when video chat initiated
3. **Message Pagination**: Limit initial render to 50 messages, virtual scrolling for more
4. **Debounced Typing**: Debounce message input to reduce re-renders
5. **WebSocket Throttling**: Rate limit outgoing messages to 1/second
6. **Image Optimization**: Next.js Image component for brand assets

**Bundle Size**:
- Initial page load: ~150KB gzipped
- Session page (with WebRTC): ~280KB gzipped
- i18n adds ~15KB per language

### Mobile

**Optimization Strategies**:

1. **FlatList Virtualization**: Message list uses FlatList with `windowSize={10}`
2. **useMemo/useCallback**: Prevent unnecessary re-renders
3. **Image Caching**: Expo Image with disk cache
4. **AsyncStorage Batching**: Batch i18n reads/writes
5. **Native Modules**: WebRTC uses native implementation (not JS)

**App Size**:
- Android APK: ~45MB (includes WebRTC native libraries)
- iOS IPA: ~35MB

### Backend

**Database Optimization**:

```sql
-- Indexes
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_sessions_activated_at ON sessions(activated_at);

-- Cleanup query (runs every 5 min)
DELETE FROM sessions
WHERE ended_at IS NOT NULL
  AND ended_at < datetime('now', '-7 days');
```

**Connection Limits**:
- Max concurrent WebSocket connections: 1000 (default uvicorn)
- Max database connections: 10 (SQLite limitation)
- Rate limit: 10 tokens/hour per IP

**Memory Usage**:
- Active session: ~5KB (WebSocket + state)
- 100 concurrent sessions: ~500KB
- Rate limit buckets: ~100KB (for 1000 IPs)

## Security Architecture

### Threat Model

**Assumptions**:
1. Backend is **semi-trusted**: Coordinates sessions but doesn't see plaintext messages
2. Clients are **trusted after authentication**: Token possession = authorization
3. Network is **observable but not modifiable**: TLS prevents MITM, but metadata visible
4. Users trust each other: Token sharing is intentional

**Protected Assets**:
- Message content (E2E encrypted)
- User privacy (no persistent identifiers)
- Session integrity (token validation)
- System availability (rate limiting)

### Attack Vectors & Mitigations

| Attack | Mitigation | Implementation |
|--------|-----------|----------------|
| Message interception | E2E encryption (AES-GCM) | `frontend/lib/crypto.ts` |
| Token guessing | 12-char random (36^12 combinations) | `backend/app/security.py` |
| Token brute force | Rate limiting (10/hour per IP) | `backend/app/security.py` |
| Session hijacking | Client ID must match on join | WebSocket authentication |
| XSS | React auto-escaping + CSP headers | Next.js defaults |
| CSRF | Token-based (no cookies for auth) | N/A (stateless tokens) |
| SQL injection | SQLAlchemy ORM (parameterized) | `backend/app/models.py` |
| DoS (token spam) | Rate limiting | `check_rate_limit()` |
| DoS (message spam) | WebSocket message throttling | Frontend/Mobile |
| Eavesdropping | TLS in production | Reverse proxy |

### Encryption Details

**AES-GCM (Galois/Counter Mode)**:
- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 (100,000 iterations, SHA-256)
- **IV**: 96-bit random nonce (per message)
- **Authentication**: Built-in (GCM mode provides MAC)

**Key Derivation**:
```
Token (12 chars) → PBKDF2(token, salt="chatOrbitSalt", 100k iter) → 256-bit AES key
```

**Message Encryption Flow**:
```
1. Plaintext: "Hello"
2. Derive key from session token
3. Generate random 96-bit IV
4. Encrypt: AES-GCM(plaintext, key, IV) → ciphertext
5. Combine: IV || ciphertext
6. Encode base64
7. Send via WebSocket
```

**Decryption Flow**:
```
1. Receive base64 encrypted message
2. Decode base64 → IV || ciphertext
3. Extract IV (first 12 bytes)
4. Extract ciphertext (remaining bytes)
5. Derive key from session token
6. Decrypt: AES-GCM-decrypt(ciphertext, key, IV) → plaintext
7. Display message
```

**Why Not TLS Alone?**
- TLS protects network transmission, but backend sees plaintext
- E2E ensures backend **cannot** read messages (privacy)
- Token-based key derivation = no key exchange needed

### Privacy Guarantees

**What Backend Knows**:
- ✅ Session token
- ✅ Timestamp of token creation
- ✅ TTL and validity settings
- ✅ When host/guest joined
- ✅ Client identifiers (ephemeral UUIDs)
- ✅ Message count (not content)
- ✅ WebRTC signaling data (SDP, ICE candidates)

**What Backend Doesn't Know**:
- ❌ Message content (encrypted)
- ❌ Real identities (no email, phone, etc.)
- ❌ Video/audio streams (P2P)
- ❌ IP addresses of peers (after WebRTC connection)

**Data Retention**:
- Sessions deleted 7 days after end
- No message logs
- No user profiles
- Rate limit buckets expire after 1 hour

## Future Architecture Considerations

### Scalability

**Current Limits** (Single Server):
- **SQLite**: ~1,000 concurrent sessions (write contention)
- **WebSocket**: ~10,000 connections (OS limits)
- **Memory**: ~50MB for 1,000 active sessions

**Horizontal Scaling Path**:

```
┌────────────┐
│   Redis    │ ← WebSocket pub/sub
│  (shared)  │ ← Rate limit buckets
└────────────┘
      ▲
      │
  ┌───┴───┐
  │       │
  ▼       ▼
┌────┐  ┌────┐
│App1│  │App2│  ← Multiple backend instances
└────┘  └────┘
  │       │
  └───┬───┘
      ▼
┌────────────┐
│ PostgreSQL │ ← Shared database
└────────────┘
```

**Changes Required**:
1. Replace SQLite with PostgreSQL
2. Use Redis for WebSocket message relay
3. Store rate limit buckets in Redis
4. Load balancer for multiple backend instances

### Feature Extensions

**Group Chat** (3+ participants):
- Requires message fanout (1→N broadcast)
- Key management complexity (N keys instead of 1)
- WebRTC mesh or SFU needed for video

**Persistent History**:
- Contradicts privacy model (no storage)
- Would need user authentication
- Encryption key management challenges

**File Sharing**:
- Need temporary storage or direct P2P (WebRTC DataChannel)
- Size limits, virus scanning
- Encryption of files in transit

**Screen Recording**:
- Requires explicit consent from both parties
- Privacy/legal considerations
- Storage implications

### Monitoring & Observability

**Metrics to Track**:
- Session creation rate
- Session completion rate (vs abandoned)
- Average session duration
- WebRTC connection success rate
- Message encryption errors
- Rate limit hits per IP
- WebSocket connection errors

**Logging**:
```python
# Structured logging (JSON)
{
  "timestamp": "2025-01-20T12:00:00Z",
  "level": "INFO",
  "event": "session_created",
  "token": "ABCD1234WXYZ",
  "ttl_minutes": 120,
  "validity": "week"
}
```

**Error Tracking**:
- Sentry or similar for backend exceptions
- Frontend error boundary for React errors
- Mobile crash reporting (Expo)

## Glossary

| Term | Definition |
|------|------------|
| **Token** | 12-character alphanumeric string granting session access |
| **Host** | First participant to join a session (reserves seat) |
| **Guest** | Second participant to join (activates session, starts timer) |
| **Session** | Time-limited chat room for exactly two participants |
| **TTL** | Time-to-live; duration of active session after both join |
| **Validity Window** | How long a token can be used before expiring (day/week/month/year) |
| **E2E** | End-to-end (encryption where only clients have keys) |
| **P2P** | Peer-to-peer (direct connection, no intermediary) |
| **WebRTC** | Web Real-Time Communication (browser/native A/V API) |
| **ICE** | Interactive Connectivity Establishment (NAT traversal) |
| **STUN** | Session Traversal Utilities for NAT (public IP discovery) |
| **TURN** | Traversal Using Relays around NAT (relay fallback) |
| **SDP** | Session Description Protocol (WebRTC offer/answer format) |
| **AES-GCM** | Advanced Encryption Standard - Galois/Counter Mode |
| **PBKDF2** | Password-Based Key Derivation Function 2 |
| **SQLite** | Embedded SQL database (file-based) |
| **SQLAlchemy** | Python ORM (Object-Relational Mapping) |
| **Pydantic** | Python data validation library |
| **Uvicorn** | ASGI server for FastAPI |

## Appendix: File Path Reference

### Documentation
- `/README.md` - User-facing setup guide
- `/CLAUDE.MD` - AI assistant project context
- `/docs/architecture.md` - This file (technical architecture)
- `/docs/CHANGELOG.md` - Version history

### Frontend
- `frontend/app/page.tsx` - Landing page
- `frontend/app/session/[token]/page.tsx` - Session page
- `frontend/components/session-view.tsx` - Main session component
- `frontend/lib/webrtc.ts` - WebRTC implementation
- `frontend/lib/crypto.ts` - AES-GCM encryption
- `frontend/lib/i18n/translations.tsx` - All translations (EN + SK)
- `frontend/components/language/language-provider.tsx` - i18n context

### Mobile
- `mobile/App.tsx` - Entry point
- `mobile/src/components/InAppSessionScreen/` - Session UI
- `mobile/src/utils/webrtc.ts` - WebRTC implementation
- `mobile/src/utils/crypto.ts` - AES-GCM encryption
- `mobile/src/i18n/translations.ts` - All translations (EN + SK)
- `mobile/src/i18n/LanguageProvider.tsx` - i18n context
- `mobile/src/constants/colors.ts` - Color palette
- `mobile/src/constants/styles.ts` - StyleSheet definitions

### Backend
- `backend/app/main.py` - API routes & WebSocket gateway
- `backend/app/models.py` - Database schema (Session model)
- `backend/app/security.py` - Token generation, rate limiting
- `backend/app/schemas.py` - Pydantic request/response models
- `backend/app/config.py` - Environment configuration

### Infrastructure
- `infra/docker-compose.yml` - Development environment
- `infra/docker-compose.production.yml` - Production environment
- `.env.example` - Environment variable template

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-20  
**Maintained By**: Documentation Keeper  
**Status**: ✅ Comprehensive
