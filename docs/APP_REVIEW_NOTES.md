# App Store Review Notes — ChatOrbit

> Prepared for Apple App Review. This document contains the reviewer notes,
> guideline compliance rationale, and responses to likely reviewer questions.
> Reference: https://developer.apple.com/app-store/review/guidelines/

---

## Reviewer Notes (paste into App Store Connect)

```
ChatOrbit is a private, token-based, two-person ephemeral chat application
with optional peer-to-peer video calling. It does NOT require user accounts.

TESTING INSTRUCTIONS:
1. Open the app and tap "Need token" to create a session token
2. Choose session duration and tap "Create Token"
3. Copy or share the 12-character token
4. On a second device, open ChatOrbit and tap "Have token"
5. Paste/enter the same token to connect
6. Exchange messages in the encrypted session
7. Optionally tap the camera icon to start a video call
8. Session ends automatically when the timer expires, or tap "End Session"

IMPORTANT NOTES:
- No login or account required — sessions are gated by shared tokens
- Two devices are needed to test the full peer-to-peer experience
- Video calls require camera and microphone permissions
- All messages are end-to-end encrypted (AES-256-GCM) and exist only in
  device memory — nothing is stored on the server
```

---

## Guideline 1.2 — User-Generated Content Compliance

### Why Guideline 1.2 Does NOT Apply as a UGC Platform

ChatOrbit is a **private one-on-one encrypted messenger**, not a user-generated
content platform. It is comparable to iMessage, Signal, or WhatsApp:

| Characteristic | ChatOrbit | UGC Platforms (1.2 target) |
|---|---|---|
| Audience | 1:1 private | Public / community |
| Content visibility | Only 2 participants | Visible to many users |
| Matching | Intentional (shared token) | Random / algorithmic |
| Content storage | None (ephemeral, in-memory) | Server-side, persistent |
| User accounts | None | Required |
| Encryption | E2E (AES-256-GCM) | Typically none |

### Safety Mechanisms Already Implemented

Despite being a private messenger (not a UGC platform), ChatOrbit includes
safety features that exceed typical 1:1 chat apps:

1. **Report Abuse** — Full 3-stage reporting flow (warning → form → confirmation)
   accessible during any active session. Collects reporter email, incident
   summary, threat/criminal activity flags, and additional details. Terminates
   the session upon submission.
   - Component: `mobile/v2/src/components/ReportAbuseModal.tsx`
   - Translations: all 3 languages (en, sk, hu)

2. **Session Termination = Blocking** — Sessions are ephemeral with no
   persistent user identity. Ending a session permanently severs the connection.
   There is no mechanism for one user to reconnect to another without a new,
   mutually shared token.

3. **Contact Information** — Published in-app:
   - `legal@chatorbit.com` (Terms of Service)
   - `privacy@chatorbit.com` (Privacy Policy)
   - Support link: `https://chatorbit.com/support` (visible on Landing,
     Mint, and Accept screens)

4. **18+ Requirement** — Terms of Service state users must be at least 18
   years old or have legal capacity to enter a binding agreement.

### Not Random or Anonymous Chat

Apple removes apps used primarily for "Chatroulette-style experiences" or
"random or anonymous chat" without notice. ChatOrbit is neither:

- **Not random**: Both participants must possess the same 12-character token,
  which is shared intentionally outside the app (via messaging, email, in person, etc.)
- **Not anonymous matching**: There is no discovery, directory, or matching
  system. Users connect only with people they already know and choose to
  share a token with.
- **Comparable to**: iMessage (share a phone number), Signal (share a phone
  number), AirDrop (proximity-based). ChatOrbit uses a token instead.

---

## Guideline 2.5.14 — Recording and Monitoring

- **Camera/Microphone**: iOS system permission prompts are shown before
  first use. The app declares `NSCameraUsageDescription` and
  `NSMicrophoneUsageDescription` in Info.plist.
- **Visual indicators**: iOS natively shows green (camera) and orange
  (microphone) status bar indicators when in use.
- **No background recording**: The app does not record, log, or store any
  audio/video content.

---

## Encryption Export Compliance

- **Uses encryption**: Yes (AES-256-GCM for message encryption, PBKDF2 for
  key derivation, TLS for network transport)
- **Exempt from export compliance**: Yes — uses standard encryption for
  protecting user data, qualifying for the exemption under Category 5 Part 2
  of the EAR.
- The app does not implement any proprietary or non-standard cryptographic
  algorithms.

---

## Privacy Nutrition Labels

| Data Type | Collected | Linked to User | Used for Tracking |
|---|---|---|---|
| User Content (Messages) | No | No | No |
| Identifiers | No | No | No |
| Usage Data | No | No | No |
| Diagnostics | No | No | No |
| Camera | Used (not collected) | No | No |
| Microphone | Used (not collected) | No | No |

**Rationale**: Messages are E2E encrypted and exist only in device memory.
The backend relays encrypted blobs and signaling data but never stores
message content or encryption keys. No analytics, advertising SDKs, or
tracking frameworks are included.

---

## Anticipated Reviewer Questions

### Q: "How do users find each other?"
**A**: They don't — ChatOrbit has no user directory, search, or matching.
One person creates a token and shares it with someone they already know
(via text message, email, in person, etc.). Both must enter the same token
to connect.

### Q: "Where are messages stored?"
**A**: Nowhere. Messages exist only in each device's RAM during an active
session. The backend relays encrypted payloads in real-time but does not
persist them. When the session ends (timer or manual), all messages are gone.

### Q: "How do you moderate content?"
**A**: ChatOrbit is a private 1:1 encrypted messenger, similar to iMessage
or Signal. Content moderation of encrypted private messages is not
applicable. However, we provide a Report Abuse mechanism that terminates
the session and logs the incident for investigation.

### Q: "Why no user accounts?"
**A**: By design. ChatOrbit prioritizes privacy and ephemerality. No
accounts means no persistent identity, no data to breach, and no profile
to target. Access is gated by knowledge of the session token, which is
a shared secret between two consenting participants.

---

## Related Files

| File | Purpose |
|---|---|
| `mobile/v2/APP_STORE_METADATA.md` | Full App Store listing metadata |
| `mobile/v2/eas.json` | EAS Build/Submit configuration |
| `mobile/v2/src/components/ReportAbuseModal.tsx` | Report Abuse implementation |
| `mobile/v2/src/i18n/translations.ts` | All translated strings (en, sk, hu) |
| `ios/ChatOrbitv2/PrivacyInfo.xcprivacy` | Apple Privacy Manifest |
