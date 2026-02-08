# iOS App Store Submission Skill

## Description

Guide through the complete Apple App Store submission process for ChatOrbit Mobile (React Native/Expo). Covers pre-submission cleanup, guideline compliance, build configuration, metadata, screenshots, submission, and rejection handling.

## Trigger

Use `/app-store` or `/submit-ios` to start the submission workflow.

## Quick Commands

| Command | Description |
|---------|-------------|
| `/app-store status` | Check current submission readiness |
| `/app-store checklist` | Show pre-submission checklist |
| `/app-store screenshots` | Guide for capturing screenshots |
| `/app-store build` | Build for App Store submission |
| `/app-store metadata` | Review/edit App Store metadata |
| `/app-store review-notes` | Show/edit App Review notes and guideline compliance |
| `/app-store submit` | Final submission steps |

## Key Reference Files

**Read these files before any submission work:**

| File | Purpose |
|------|---------|
| `docs/APP_REVIEW_NOTES.md` | Apple reviewer notes, guideline compliance rationale, anticipated Q&A |
| `mobile/v2/APP_STORE_METADATA.md` | Full App Store listing metadata (description, keywords, screenshots, privacy) |
| `mobile/v2/eas.json` | EAS Build/Submit configuration (credentials go here) |
| `mobile/v2/app.json` | App version, bundle ID, permissions |
| `CLAUDE.md` | Pre-production cleanup tasks (remove dev screens before submission) |

---

## Apple Guideline Compliance Summary

ChatOrbit is a **private 1:1 encrypted messenger** (like iMessage/Signal), not a UGC platform.

| Apple Guideline | Status | Details |
|---|---|---|
| **1.2 User-Generated Content** | N/A — private 1:1 E2E chat | Not a public content platform. See `docs/APP_REVIEW_NOTES.md` for full rationale |
| **1.2 Report Mechanism** | Done | `ReportAbuseModal.tsx` — 3-stage flow (warning → form → success) |
| **1.2 Block Users** | Done | Ending session = permanent block (ephemeral, no persistent identity) |
| **1.2 Contact Info** | Done | `legal@chatorbit.com`, `privacy@chatorbit.com`, support link on 3 screens |
| **2.5.14 Recording** | Done | iOS permission prompts + native status bar indicators |
| **Encryption Export** | Exempt | Standard AES-256-GCM / TLS, qualifies for exemption |
| **Privacy Labels** | Done | No data collected. See `APP_STORE_METADATA.md` |

---

## Phase 1: Pre-Submission Checklist

### Run Status Check

```bash
cd /Users/erozloznik/Projects/chatorbit-mobile/mobile/v2

echo "=== App Store Submission Readiness ==="
echo ""

# Check app version
echo "App Version:"
grep '"version"' app.json | head -1
echo ""

# Check bundle ID
echo "Bundle ID:"
grep '"bundleIdentifier"' app.json
echo ""

# Check required assets
echo "Required Assets:"
for file in assets/icon.png assets/splash-icon.png assets/adaptive-icon.png; do
  if [ -f "$file" ]; then
    echo "  ✓ $file exists"
  else
    echo "  ✗ $file MISSING"
  fi
done
echo ""

# Check metadata file
echo "Metadata Documentation:"
if [ -f "APP_STORE_METADATA.md" ]; then
  echo "  ✓ APP_STORE_METADATA.md exists"
else
  echo "  ✗ APP_STORE_METADATA.md MISSING"
fi
echo ""

# Check review notes
echo "Review Notes:"
if [ -f "../docs/APP_REVIEW_NOTES.md" ]; then
  echo "  ✓ APP_REVIEW_NOTES.md exists"
else
  echo "  ✗ APP_REVIEW_NOTES.md MISSING"
fi
echo ""

# Check privacy manifest
echo "Privacy Manifest:"
if [ -f "ios/ChatOrbitv2/PrivacyInfo.xcprivacy" ]; then
  echo "  ✓ PrivacyInfo.xcprivacy exists"
else
  echo "  ✗ PrivacyInfo.xcprivacy MISSING"
fi
echo ""

# Check EAS config
echo "EAS Build Config:"
if [ -f "eas.json" ]; then
  echo "  ✓ eas.json exists"
  if grep -q "YOUR_" eas.json; then
    echo "  ⚠ Contains placeholder values - needs real credentials"
  else
    echo "  ✓ Credentials configured"
  fi
else
  echo "  ✗ eas.json MISSING"
fi
echo ""

# Check dev cleanup
echo "Dev Cleanup:"
if grep -rq "PatternPreviewScreen" src/navigation/; then
  echo "  ⚠ PatternPreviewScreen still in navigation — remove before submission"
else
  echo "  ✓ PatternPreviewScreen removed"
fi
```

### Pre-Submission Checklist

| Item | Status | File/Location |
|------|--------|---------------|
| App icon (1024x1024) | Check | `assets/icon.png` |
| Splash screen | Check | `assets/splash-icon.png` |
| Privacy manifest | Check | `ios/ChatOrbitv2/PrivacyInfo.xcprivacy` |
| App metadata | Check | `APP_STORE_METADATA.md` |
| Review notes + compliance | Check | `docs/APP_REVIEW_NOTES.md` |
| Screenshots (5-10) | Manual | `screenshots/` directory |
| Production API URLs | Manual | environment config |
| EAS credentials | Manual | `eas.json` |
| Remove dev screens | Code | `PatternPreviewScreen`, `__DEV__` BG button |

---

## Phase 2: Pre-Production Code Cleanup

Before building for submission, these dev artifacts must be removed:

1. **Remove `PatternPreviewScreen.tsx`** from navigation stack
2. **Remove `__DEV__`-gated "BG" button** in MainScreen

See `CLAUDE.md` section "Pre-Production Cleanup (mobile)" for details.

---

## Phase 3: Screenshot Capture

### Required Screenshots

| Device | Resolution | Required |
|--------|------------|----------|
| iPhone 6.7" (15 Pro Max) | 1290 x 2796 | Yes |
| iPhone 6.5" (11 Pro Max) | 1242 x 2688 | Yes |
| iPhone 5.5" (8 Plus) | 1242 x 2208 | Optional |
| iPad Pro 12.9" | 2048 x 2732 | If supporting iPad |

### Recommended Scenes

1. **Landing Page** — "Need token" and "Have token" buttons
2. **Token Creation** — Mint screen with session parameters
3. **Token Success** — Generated token with share options
4. **Join Session** — Accept screen with token input
5. **Active Chat** — Session screen with messages
6. **Video Call** — Active video call (if applicable)
7. **Settings** — Background pattern selection
8. **Language Selection** — Language switcher modal

---

## Phase 4: EAS Build Configuration

### Configure Credentials

Edit `eas.json` and replace placeholder values:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "XXXXXXXXXX"
      }
    }
  }
}
```

### Get Required IDs

1. **Apple ID**: Your Apple Developer account email
2. **Apple Team ID**: developer.apple.com/account > Membership > Team ID
3. **App Store Connect App ID (ascAppId)**: Create app in ASC first, copy "Apple ID" from App Information

### Build Commands

```bash
# Install EAS CLI if needed
npm install -g eas-cli

# Login to Expo
eas login

# Build for App Store
eas build --platform ios --profile production

# Or build locally and upload
npx expo run:ios --configuration Release
```

---

## Phase 5: App Store Connect Setup

### Create App Listing

1. Go to appstoreconnect.apple.com
2. My Apps > "+" > New App
3. Fill in:
   - **Platform**: iOS
   - **Name**: ChatOrbit
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: com.chatorbit.mobile.v2
   - **SKU**: chatorbit-mobile-v2

### Upload Metadata

Copy from `APP_STORE_METADATA.md`. Key fields:

| Field | Limit | Source |
|-------|-------|--------|
| App Name | 30 chars | "ChatOrbit" |
| Subtitle | 30 chars | "Secure Two-Person Chat" |
| Promotional Text | 170 chars | See metadata file |
| Description | 4000 chars | See metadata file |
| Keywords | 100 chars | See metadata file |
| Support URL | — | https://chatorbit.com/help |
| Privacy Policy URL | — | https://chatorbit.com/privacy-policy |

### Review Notes

Copy the reviewer notes from `docs/APP_REVIEW_NOTES.md` into the "App Review Information > Notes" field in App Store Connect. This includes testing instructions and the no-account explanation.

---

## Phase 6: Final Submission

### Pre-Submit Verification

```bash
# Verify build is ready
eas build:list --platform ios --status finished

# Check latest build
eas build:view --latest --platform ios
```

### Submit

```bash
# Submit latest build
eas submit --platform ios --latest

# Or submit specific build
eas submit --platform ios --id BUILD_ID
```

---

## Phase 7: Post-Submission & Rejection Handling

### Monitor Status

Check App Store Connect for: Waiting for Review → In Review → Pending Developer Release → Ready for Sale (or Rejected).

### Common Rejection Scenarios for ChatOrbit

| Potential Issue | Pre-built Response |
|---|---|
| "App enables anonymous chat" | Token-sharing is intentional pairing between known contacts (see `APP_REVIEW_NOTES.md`) |
| "Missing content moderation" | Private 1:1 E2E chat (like iMessage). Report Abuse mechanism included. |
| "Missing block feature" | Session termination = blocking. No persistent identity to reconnect. |
| "Minimum functionality (4.2)" | Full chat + video calling + encryption + multilingual |
| "Crashes on launch" | Test on physical device, check logs |

### Respond to Rejection

1. Read rejection reason in Resolution Center
2. Consult `docs/APP_REVIEW_NOTES.md` for pre-written compliance arguments
3. Fix identified issues if code changes needed
4. Upload new build with incremented build number
5. Reply in Resolution Center with specific guideline references
6. Resubmit
