# Phone-Based Authentication - Early Planning

**Status**: Early Planning / Brainstorm
**Priority**: Future Enhancement
**Created**: December 24, 2024

---

## Overview

Replace anonymous token-based access with phone number authentication. Users verify their phone once, receive a JWT, and can seamlessly access their tokens across devices.

## Goals

1. **Zero friction** - Phone + SMS code, nothing else
2. **Seamless migration** - New device? Verify phone, tokens sync automatically
3. **Token ownership** - Tokens tied to user, shareable with others
4. **Push notifications** - Wake app for incoming chat invites

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     FIRST LAUNCH                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. App opens → Phone number input screen                       │
│  2. User enters phone → SMS verification code sent              │
│  3. User enters code → Phone verified                           │
│  4. Server creates user record + issues JWT (3 month TTL)       │
│  5. JWT stored in Keychain (iOS) / Keystore (Android)           │
│  6. User lands on main screen with synced tokens                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     RETURNING USER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. App opens → JWT found in Keychain                           │
│  2. JWT validated with server                                   │
│  3. Tokens synced (local ↔ server)                              │
│  4. User lands on main screen                                   │
│                                                                 │
│  If JWT expired: Re-verify phone (no password needed)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Token Lifecycle

Tokens are GUIDs with TTL and session duration. Current token system remains, with ownership layer added.

```
MINT                SHARE               STORE               USE
 │                    │                   │                  │
 ▼                    ▼                   ▼                  ▼
User A             User A sends       User B saves      Either user
creates            token to B         to their list     joins session
token              (link/QR/app)      (synced to server)

Token: 550e8400-e29b-41d4-a716-446655440000
Owner: User A (phone: +421901234567)
Shared with: User B (phone: +421907654321)
TTL: 7 days
Duration: 1 hour
```

### Sharing Methods

- **Deep link**: `chatorbit://join/550e8400-e29b-41d4-a716-446655440000`
- **QR code**: Generates scannable code
- **In-app**: Select from contacts (if both registered)
- **Copy GUID**: Manual sharing (current approach)

---

## Database Schema (Additions)

Extends existing SQLite database. No changes to existing tables.

```sql
-- New: Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,              -- UUID
    phone TEXT UNIQUE NOT NULL,       -- E.164 format: +421901234567
    phone_verified_at TEXT,           -- ISO timestamp
    created_at TEXT NOT NULL,
    last_active_at TEXT
);

-- New: Token ownership (links existing tokens to users)
CREATE TABLE token_ownership (
    token_id TEXT NOT NULL,           -- References existing tokens.id (GUID)
    user_id TEXT NOT NULL,            -- References users.id
    role TEXT NOT NULL,               -- 'owner' | 'guest'
    nickname TEXT,                    -- User-assigned label
    shared_by_user_id TEXT,           -- Who shared it (for guests)
    created_at TEXT NOT NULL,
    PRIMARY KEY (token_id, user_id)
);

-- New: Push notification tokens
CREATE TABLE push_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,            -- References users.id
    device_token TEXT NOT NULL,       -- APNs/FCM token
    platform TEXT NOT NULL,           -- 'ios' | 'android'
    created_at TEXT NOT NULL,
    UNIQUE (user_id, device_token)
);

-- New: SMS verification codes (short-lived)
CREATE TABLE verification_codes (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,               -- 6-digit code
    expires_at TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);
```

---

## API Endpoints (New)

```
POST /api/auth/request-code
  Body: { phone: "+421901234567" }
  Response: { success: true, expires_in: 300 }

POST /api/auth/verify-code
  Body: { phone: "+421901234567", code: "123456" }
  Response: { user_id: "uuid", jwt: "...", expires_at: "..." }

POST /api/auth/refresh
  Header: Authorization: Bearer <jwt>
  Response: { jwt: "...", expires_at: "..." }

GET /api/users/me/tokens
  Header: Authorization: Bearer <jwt>
  Response: { tokens: [...] }

POST /api/tokens/{token_id}/share
  Header: Authorization: Bearer <jwt>
  Body: { phone: "+421907654321" }
  Response: { success: true }
```

---

## Push Notifications / Ring Feature

```
┌─────────────────────────────────────────────────────────────────┐
│                     INCOMING CALL FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User A taps "Call" on User B's contact                      │
│  2. Server auto-mints token, sends push to User B               │
│  3. User B's app wakes, shows incoming call UI                  │
│  4. User B accepts → both join session                          │
│  5. User B declines → token marked unused, can use later        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Push payload:
{
  "type": "chat_invite",
  "from_phone": "+421901234567",
  "from_name": "User A",        // If saved in contacts
  "token_id": "550e8400-...",
  "expires_in": 60              // Seconds to respond
}
```

---

## SMS Provider Options

| Provider | Cost/SMS | Notes |
|----------|----------|-------|
| Twilio | ~$0.0075 | Most popular, easy API, good docs |
| AWS SNS | ~$0.00645 | Cheaper, AWS ecosystem |
| Firebase Auth | Free (10k/mo) | Handles full verification flow |
| Vonage | ~$0.0068 | Good international coverage |

**Recommendation**: Start with Firebase Auth for free tier, migrate to Twilio if volume grows.

---

## Security Considerations

- **Rate limiting**: 3 SMS requests per phone per hour
- **Code expiry**: 5 minutes
- **Max attempts**: 3 per code, then regenerate
- **JWT TTL**: 3 months, refresh weekly if active
- **Phone format**: Validate E.164 format server-side

---

## Implementation Phases

### Phase 1: Phone Auth
- [ ] Phone input screen (mobile)
- [ ] SMS verification flow
- [ ] Backend auth endpoints
- [ ] JWT storage in Keychain
- [ ] Logout functionality

### Phase 2: Token Ownership
- [ ] Token ownership table
- [ ] "My Tokens" list screen
- [ ] Local/server sync on launch
- [ ] Share token UI (QR, deep link)
- [ ] Receive shared token flow

### Phase 3: Push & Ring
- [ ] APNs setup (iOS)
- [ ] FCM setup (Android)
- [ ] Push token registration
- [ ] Incoming call UI
- [ ] Background wake handling

---

## Open Questions

1. **Phone number change**: Allow migration with old number verification, or start fresh?

2. **Anonymous fallback**: Keep current anonymous flow for users who don't want to register?

3. **Contact discovery**: Upload contacts to find friends (privacy concern) or manual entry only?

4. **Web parity**: Should web frontend also support phone auth?

5. **Multiple devices**: Same phone on multiple devices - allowed or single device only?

---

## Notes

- Token is GUID (existing system), not 6-char code
- Reuse existing database, add tables as needed
- Current anonymous flow can coexist during transition
- Phone number is E.164 format with country code

---

**Last Updated**: December 24, 2024
