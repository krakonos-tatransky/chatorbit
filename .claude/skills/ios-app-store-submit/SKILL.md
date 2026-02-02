# iOS App Store Submission Skill

## Description

Guide through the complete Apple App Store submission process for ChatOrbit Mobile (React Native/Expo). Provides checklists, commands, and step-by-step workflows.

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
| `/app-store submit` | Final submission steps |

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
if [ -f "docs/APP_STORE_METADATA.md" ]; then
  echo "  ✓ APP_STORE_METADATA.md exists"
else
  echo "  ✗ APP_STORE_METADATA.md MISSING"
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
  if grep -q "TEMPLATE" eas.json; then
    echo "  ⚠ Contains TEMPLATE placeholders - needs credentials"
  else
    echo "  ✓ Credentials configured"
  fi
else
  echo "  ✗ eas.json MISSING"
fi
```

### Pre-Submission Checklist

| Item | Status | File/Location |
|------|--------|---------------|
| App icon (1024x1024) | Check | `assets/icon.png` |
| Splash screen | Check | `assets/splash-icon.png` |
| Privacy manifest | Check | `ios/ChatOrbitv2/PrivacyInfo.xcprivacy` |
| App metadata | Check | `docs/APP_STORE_METADATA.md` |
| Screenshots (5-10) | Manual | `screenshots/` directory |
| Production API URLs | Manual | `.env` file |
| EAS credentials | Manual | `eas.json` |
| Contact info | Manual | `docs/APP_STORE_METADATA.md` |

---

## Phase 2: Screenshot Capture

### Required Screenshots

| Device | Resolution | Required |
|--------|------------|----------|
| iPhone 6.7" (15 Pro Max) | 1290 x 2796 | Yes |
| iPhone 6.5" (11 Pro Max) | 1242 x 2688 | Yes |
| iPhone 5.5" (8 Plus) | 1242 x 2208 | Optional |
| iPad Pro 12.9" | 2048 x 2732 | If supporting iPad |

### Recommended Scenes

1. **Landing Page** - Main screen with "Get Token" and "Have Token" buttons
2. **Token Creation** - Mint screen with session parameters
3. **Token Success** - Generated token with share options
4. **Join Session** - Accept screen with token input
5. **Active Chat** - Session screen with messages
6. **Video Call** - Active video call (if applicable)
7. **Settings** - Background pattern selection
8. **Language Selection** - Language switcher modal

### Capture Process

```bash
# 1. Connect iPhone via USB
# 2. Open Xcode > Window > Devices and Simulators
# 3. Select your device
# 4. Use Cmd+S to capture screenshot
# OR use device: Settings > Developer > Screenshot Border OFF, then Power+Volume

# Create screenshots directory
mkdir -p /Users/erozloznik/Projects/chatorbit-mobile/mobile/v2/screenshots

# Screenshots should be saved as:
# screenshots/01-landing.png
# screenshots/02-mint.png
# screenshots/03-token-success.png
# screenshots/04-join.png
# screenshots/05-chat.png
# screenshots/06-video.png
# screenshots/07-settings.png
```

---

## Phase 3: EAS Build Configuration

### Configure Credentials

Edit `eas.json` and replace TEMPLATE values:

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
2. **Apple Team ID**:
   - Go to https://developer.apple.com/account
   - Click "Membership" in sidebar
   - Copy "Team ID"
3. **App Store Connect App ID (ascAppId)**:
   - Create app in App Store Connect first
   - Copy the "Apple ID" from App Information

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

## Phase 4: App Store Connect Setup

### Create App Listing

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" > "+" > "New App"
3. Fill in:
   - **Platform**: iOS
   - **Name**: ChatOrbit
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: com.chatorbit.mobile.v2
   - **SKU**: chatorbit-mobile-v2

### Upload Metadata

Copy from `docs/APP_STORE_METADATA.md`:

| Field | Character Limit | Source |
|-------|-----------------|--------|
| App Name | 30 chars | "ChatOrbit" |
| Subtitle | 30 chars | "Secure Ephemeral Chat" |
| Promotional Text | 170 chars | See metadata file |
| Description | 4000 chars | See metadata file |
| Keywords | 100 chars | See metadata file |
| Support URL | - | Your support page |
| Privacy Policy URL | - | Your privacy policy |

### Privacy Declarations

In App Store Connect > App Privacy:

| Data Type | Collected | Linked to User | Tracking |
|-----------|-----------|----------------|----------|
| Contact Info | No | - | No |
| User Content | No | - | No |
| Identifiers | No | - | No |
| Usage Data | No | - | No |
| Diagnostics | No | - | No |

**Reason**: ChatOrbit uses end-to-end encryption with no server-side message storage.

### Age Rating

Answer questionnaire:
- Violence: None
- Sexual Content: None
- Profanity: None
- Drugs: None
- Gambling: None
- Horror: None
- Mature Themes: None

**Result**: 4+ rating

---

## Phase 5: Final Submission

### Pre-Submit Verification

```bash
# Verify build is ready
eas build:list --platform ios --status finished

# Check latest build
eas build:view --latest --platform ios
```

### Submit to App Store

```bash
# Submit latest build
eas submit --platform ios --latest

# Or submit specific build
eas submit --platform ios --id BUILD_ID
```

### Manual Upload (Alternative)

1. Open Xcode
2. Product > Archive
3. Window > Organizer
4. Select archive > Distribute App
5. Choose "App Store Connect"
6. Follow prompts

### Review Notes Template

```
Test Account Information:
No account required - the app uses ephemeral token-based sessions.

Testing Instructions:
1. Open app and tap "Get Token"
2. Configure session parameters and tap "Create Token"
3. Copy the generated token
4. On second device, tap "Have Token" and paste the token
5. Both devices will connect for encrypted chat
6. Optional: Tap camera button to start video call

Notes:
- App requires two devices to fully test peer-to-peer features
- Video calls require camera/microphone permissions
- Sessions are time-limited and automatically expire
```

---

## Phase 6: Post-Submission

### Monitor Status

Check App Store Connect for:
- **Waiting for Review**: Submitted, in queue
- **In Review**: Apple is reviewing
- **Pending Developer Release**: Approved, ready to release
- **Ready for Sale**: Live on App Store
- **Rejected**: See resolution center for feedback

### Common Rejection Reasons

| Issue | Resolution |
|-------|------------|
| Crashes on launch | Test on physical device, check logs |
| Incomplete metadata | Fill all required fields |
| Privacy concerns | Update privacy manifest, add policy URL |
| Guideline 4.2 (Minimum Functionality) | Ensure app has clear purpose |
| Missing demo account | Provide clear testing instructions |

### Respond to Rejection

1. Read rejection reason in Resolution Center
2. Fix identified issues
3. Upload new build with incremented build number
4. Reply in Resolution Center explaining fixes
5. Resubmit

---

## Quick Reference Files

| File | Purpose |
|------|---------|
| `app.json` | App configuration |
| `app.config.js` | Dynamic Expo config |
| `eas.json` | EAS Build/Submit config |
| `docs/APP_STORE_METADATA.md` | Complete metadata |
| `docs/SCREENSHOT_GUIDE.md` | Screenshot instructions |
| `ios/ChatOrbitv2/PrivacyInfo.xcprivacy` | Privacy manifest |
| `.env` | Environment variables |

---

## Example Usage

**User**: `/app-store status`

**Response**:
```
App Store Submission Status
===========================

✓ App Version: 2.0.0 (Build 1)
✓ Bundle ID: com.chatorbit.mobile.v2
✓ Assets: All present
✓ Privacy Manifest: Configured
✓ Metadata: Complete
⚠ Screenshots: Not captured
⚠ EAS Credentials: Need configuration

Next Steps:
1. Capture 5-10 screenshots
2. Configure EAS credentials in eas.json
3. Run: eas build --platform ios --profile production
```

**User**: `/app-store submit`

**Response**:
```
Final Submission Checklist
==========================

Before submitting, confirm:
□ Screenshots uploaded to App Store Connect
□ All metadata fields completed
□ Privacy declarations filled
□ Age rating questionnaire completed
□ Review notes added with testing instructions
□ Build uploaded and processed

Ready to submit? Run:
  eas submit --platform ios --latest
```
