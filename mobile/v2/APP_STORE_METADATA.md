# ChatOrbit - App Store Submission Metadata

> Use this document to prepare your App Store Connect listing.

---

## App Information

| Field | Value |
|-------|-------|
| **App Name** | ChatOrbit |
| **Subtitle** | Secure Two-Person Chat |
| **Bundle ID** | com.chatorbit.mobile.v2 |
| **SKU** | chatorbit-mobile-v2 |
| **Primary Language** | English (US) |
| **Category** | Social Networking |
| **Secondary Category** | Utilities |
| **Content Rating** | 4+ (No objectionable content) |

---

## Version Information

| Field | Value |
|-------|-------|
| **Version** | 2.0.0 |
| **Build Number** | 1 |
| **Copyright** | © 2026 ChatOrbit |

---

## App Description

### Short Description (Promotional Text - 170 chars)
```
Secure, ephemeral two-person chat with end-to-end encryption. Create a token, share it, and connect privately with video calls. No accounts, no message storage.
```

### Full Description (4000 chars max)
```
ChatOrbit lets you create private, time-limited chat sessions with just one other person. Perfect for confidential conversations that don't need to live forever.

HOW IT WORKS
1. Generate a unique session token with your preferred time limit
2. Share the token with your contact through any channel
3. Once both devices connect, your secure session begins
4. When time runs out, the session closes automatically

KEY FEATURES

🔐 End-to-End Encryption
All messages are encrypted using AES-256-GCM. Encryption keys are derived from your session token and never leave your device.

⏱️ Time-Limited Sessions
Choose how long your session lasts - from 5 minutes to 12 hours. The countdown starts when both participants join.

📹 Peer-to-Peer Video
Start a video call directly with your chat partner. Video streams flow directly between devices using WebRTC - no server in the middle.

🚫 No Accounts Required
No email, no phone number, no registration. Just generate a token and start chatting.

💨 Ephemeral by Design
Messages exist only in your device's memory. When the session ends, everything is gone. No server-side archives.

🌍 Multilingual
Available in English and Slovak.

PERFECT FOR
• Quick private conversations
• Sharing sensitive information temporarily
• Video calls without account signup
• Time-boxed discussions that auto-expire

PRIVACY FIRST
ChatOrbit doesn't store your messages on any server. Your conversations stay between you and your chat partner. We can't read your messages because we never have them.

Download ChatOrbit and experience truly private communication.
```

---

## Keywords (100 chars max)
```
secure chat,encrypted,private messaging,ephemeral,video call,peer to peer,no account,temporary,token
```

---

## URLs

| Field | URL |
|-------|-----|
| **Support URL** | https://chatorbit.com/help |
| **Privacy Policy URL** | https://chatorbit.com/privacy-policy |
| **Terms of Service URL** | https://chatorbit.com/terms-of-service |
| **Marketing URL** | https://chatorbit.com |

---

## Contact Information

| Field | Value |
|-------|-------|
| **Contact Email** | support@chatorbit.com |
| **Phone** | (optional) |
| **First Name** | [Your First Name] |
| **Last Name** | [Your Last Name] |

---

## App Review Information

> **Full review notes with guideline compliance rationale**: See `docs/APP_REVIEW_NOTES.md`

### Demo Account
```
Not required - app uses token-based access without accounts.
```

### Review Notes
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

### Contact for Review Issues
```
Email: [review-contact@chatorbit.com]
Phone: [Your Phone Number]
Available: [Your Timezone, e.g., "9 AM - 6 PM CET"]
```

---

## App Capabilities Declaration

### Encryption (Export Compliance)
- **Uses Encryption**: Yes
- **Exempt from Export Compliance**: Yes
- **Reason**: The app uses standard HTTPS/TLS for network communication and standard encryption for user data protection, which qualifies for the encryption exemption.

### Privacy Declarations
| Data Type | Collected | Linked to User | Used for Tracking |
|-----------|-----------|----------------|-------------------|
| User Content (Messages) | No | No | No |
| Camera | Used | No | No |
| Microphone | Used | No | No |
| Identifiers | No | No | No |
| Usage Data | No | No | No |
| Diagnostics | No | No | No |

### App Permissions
| Permission | Purpose |
|------------|---------|
| Camera | Video calls between chat participants |
| Microphone | Audio during video calls |

---

## Screenshots Required

### iPhone 6.7" Display (Required)
- Minimum 5 screenshots, maximum 10
- Size: 1290 x 2796 pixels (iPhone 15 Pro Max)
- Recommended scenes:
  1. Landing screen with "Need token" / "Have token" buttons
  2. Token generation screen
  3. Active chat session with messages
  4. Video call in progress
  5. Token entry screen

### iPhone 6.5" Display (Required if supporting older devices)
- Size: 1284 x 2778 pixels (iPhone 14 Plus)

### iPad Pro 12.9" (Required if supporting iPad)
- Size: 2048 x 2732 pixels

---

## App Preview Video (Optional)
- Duration: 15-30 seconds
- Show key features: token generation, chat, video call
- No hands or device bezels in recording

---

## Localization

### Supported Languages
- English (US) - Primary
- Slovak (sk)

### Localized Metadata Needed
- App name (if different)
- Subtitle
- Description
- Keywords
- What's New text

---

## Release Strategy

| Option | Recommended |
|--------|-------------|
| **Manual Release** | ✅ Yes - review before going live |
| **Automatic Release** | For subsequent updates |
| **Phased Release** | Consider for v2.1+ |

---

## Pre-Submission Checklist

- [ ] App icons uploaded (1024x1024)
- [ ] Screenshots for all required device sizes
- [ ] App description finalized
- [ ] Keywords optimized
- [ ] Privacy policy URL accessible
- [ ] Support URL accessible
- [ ] Contact information complete
- [ ] Age rating questionnaire completed
- [ ] Export compliance answered
- [ ] Privacy nutrition labels filled out
- [ ] App review notes written
- [ ] Build uploaded via Xcode or EAS

---

## Version Release Notes (What's New)

### Version 2.0.0
```
ChatOrbit 2.0 - Complete Redesign

• All-new modern interface with smooth animations
• Improved video calling with better connection quality
• Enhanced end-to-end encryption
• Support for longer session durations (up to 12 hours)
• Bilingual support (English & Slovak)
• Better handling of network reconnections
• Optimized for iOS 15+
```
