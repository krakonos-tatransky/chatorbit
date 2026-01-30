# Outstanding Issues - ChatOrbit

**Document Created**: 2025-12-21
**Status**: Active tracking document
**Purpose**: Track and address remaining issues before production release

---

## Critical WebRTC Issues

### Issue #1: Mobile-to-Browser Video Offer Failure
**Severity**: HIGH
**Status**: ✅ FIXED (2025-12-21)
**Affects**: Mobile app → Web browser connections

**Description**:
When a mobile user sends a video chat offer via the "Request Video Chat" button:
1. Web user sees the offer appear on screen
2. Offer disappears after ~1 second
3. Connection breaks
4. Connection recovers after a few seconds
5. Text chat becomes active again
6. Video chat never establishes

**Root Cause**:
The web UI had three automatic call state transitions that would change `callState` from `"incoming"` to `"active"` without user acceptance:
1. When `remoteStream` exists (line 1077)
2. When connection state becomes `"connected"` (line 2879)
3. When a remote track is received (line 3073)

Since the text chat is already connected when the video request arrives, the WebRTC connection state is already `"connected"`, causing the dialog to instantly disappear.

**Solution Implemented**:
Modified all three automatic state transition points in `frontend/components/session-view.tsx` to exclude the `"incoming"` state:
```typescript
// Before:
if (current === "connecting" || current === "incoming" || current === "requesting") {
  return "active";
}

// After:
// Don't auto-activate when incoming - user must explicitly accept
if (current === "connecting" || current === "requesting") {
  return "active";
}
```

Now the `"incoming"` state only transitions to `"active"` when the user explicitly accepts the call via `handleCallAccept`.

**Files Modified**:
- `frontend/components/session-view.tsx` (3 locations)

**Testing Required**:
- Test mobile → browser video request flow
- Verify dialog persists until user accepts/declines
- Confirm video connection establishes after acceptance

---

### Issue #2: Browser-to-Mobile Video (Partially Working)
**Severity**: MEDIUM
**Status**: Partially Working
**Affects**: Web browser → Mobile app connections

**Description**:
When web user sends video offer to mobile:
- Mobile user sees accept button ✓
- When accepted, local video shows ✓
- Voice chat becomes active ✓
- Remote video status unclear

**Needs Verification**:
- Does remote video (from web user) display on mobile?
- Does bidirectional video work properly?
- Are there any edge cases causing failures?

---

## Mobile UI/UX Critical Issues

### Issue #3: Video Control Buttons Not Accessible
**Severity**: HIGH
**Status**: ✅ FIXED (2025-12-21)
**Affects**: Mobile app video chat mode

**Description**:
When video chat is active on mobile:
- Control buttons (fullscreen, switch camera, mute) are not visible
- Buttons are placed under the video pane
- No way to access video controls during active call

**Root Cause**:
The video controls were positioned below the video panes in a vertical layout. When video panes have minimum heights of 180-240px, they would push the control buttons below the visible viewport on smaller mobile screens, making them inaccessible.

**Solution Implemented**:
Restructured the video UI to overlay controls on top of the video panes using absolute positioning:

1. **Added `videoPreviewContainer`** - A relative-positioned wrapper around video panes and controls
2. **Added `videoControlsOverlay`** - Absolutely positioned controls at the bottom of the container with:
   - `position: 'absolute'` with `bottom: 0`
   - Semi-transparent dark background (`rgba(2, 11, 31, 0.85)`)
   - Proper padding and border radius to match video pane style
   - Always visible over the video content
   - Proper z-index layering

This is a standard video player UX pattern where controls overlay the video content rather than being separate elements below it.

**Files Modified**:
- `mobile/App.tsx` - Restructured JSX to wrap video panes and controls in container
- `mobile/src/constants/styles.ts` - Added `videoPreviewContainer` and `videoControlsOverlay` styles

**Testing Required**:
- Test video controls visibility during active video call
- Verify controls are accessible in both normal and fullscreen modes
- Ensure controls don't obscure critical video content
- Test on various screen sizes

---

### Issue #4: Text Chat Pane Not Visible on Mobile
**Severity**: HIGH
**Status**: ✅ FIXED (2025-12-21)
**Affects**: Mobile app text chat mode

**Description**:
- Message pane is positioned below visible screen area
- Screen cannot be scrolled to access messages
- Users cannot see or interact with text chat effectively

**Root Cause**:
The `sessionContent` style (used as `contentContainerStyle` for the main ScrollView) incorrectly had `flex: 1`:

```typescript
sessionContent: {
  flex: 1,  // Wrong for ScrollView contentContainerStyle!
  paddingBottom: 28,
  gap: 18
}
```

Using `flex: 1` on a ScrollView's `contentContainerStyle` forces the content to fit within the viewport instead of allowing it to overflow. This compressed all cards (status, video, chat) to fit on screen, making the chat card invisible or inaccessible.

**Solution Implemented**:
Removed `flex: 1` from `sessionContent` style:

```typescript
sessionContent: {
  paddingBottom: 28,
  gap: 18
}
```

Now the content can grow beyond the viewport, and users can scroll to access all sections including the chat pane.

**Files Modified**:
- `mobile/src/constants/styles.ts` - Removed `flex: 1` from `sessionContent`

**Testing Required**:
- Test scrolling behavior on mobile device
- Verify all cards (status, video, chat) are accessible via scroll
- Ensure chat messages are visible and scrollable
- Test with keyboard open (KeyboardAvoidingView should still work)

---

### Issue #5: Missing Message Reorder Button on Mobile
**Severity**: MEDIUM
**Status**: ✅ FIXED (2025-12-21)
**Affects**: Mobile app

**Description**:
- Web version has button to reorder messages (top-to-bottom / bottom-to-top)
- This functionality is completely missing from mobile app

**Solution Implemented**:
Added complete message reordering functionality matching the web version:

1. **State Management**:
   - Added `reverseMessageOrder` boolean state
   - Created `orderedMessages` computed array using `useMemo`
   - Automatically loads preference from AsyncStorage on mount

2. **UI Components**:
   - Added toggle button next to "Messages" title in chat header
   - Shows arrow-up (↑) icon for newest-at-bottom (normal)
   - Shows arrow-down (↓) icon for newest-at-top (reversed)
   - Styled with circular button matching app design system

3. **Persistence**:
   - Saves preference to AsyncStorage with key `chatOrbit.reverseMessageOrder`
   - Persists across app restarts
   - Graceful error handling if AsyncStorage fails

4. **Functionality**:
   - `toggleMessageOrder` callback updates state and persists to storage
   - Messages rendered using `orderedMessages` array
   - Proper accessibility labels for screen readers

**Files Modified**:
- `mobile/App.tsx` - Added state, logic, UI button, and AsyncStorage integration
- `mobile/src/constants/styles.ts` - Added `chatHeaderLeft` and `messageOrderButton` styles

**Testing Required**:
- Test toggle button functionality
- Verify message order changes immediately
- Confirm preference persists after app restart
- Test with empty message list
- Verify accessibility labels work correctly

---

### Issue #6: Status Pane Layout Issues on Mobile
**Severity**: MEDIUM
**Status**: ✅ FIXED (2025-12-21)
**Affects**: Mobile app

**Description**:
Current status pane takes too much screen space and doesn't auto-hide

**Analysis**:
Upon investigation, most of the required functionality was already implemented:

1. **Status pane at top**: ✅ Already positioned as first element in ScrollView
2. **Auto-collapse logic**: ✅ Already implemented in `useEffect` at lines 399-407
   - Automatically collapses when session status becomes 'active'
   - Tracks transition from inactive → active using `lastSessionStatusRef`
   - User can still manually toggle if needed
3. **Video section visibility**: ✅ Already conditionally rendered based on `showVideoSection`
   - Only shows when `callState !== 'idle'` OR video streams exist
   - Hides completely in text-only mode

**Optimization Implemented**:
Made the collapsed status pane more compact by reducing padding:

```typescript
// Before:
sessionStatusCardCollapsed: {
  paddingVertical: 12,
  paddingHorizontal: 16
}

// After:
sessionStatusCardCollapsed: {
  paddingVertical: 8,
  paddingHorizontal: 12,
  gap: 0
}
```

This reduces the collapsed status pane height by ~33%, saving valuable screen space.

**Auto-Collapse Behavior**:
The status pane automatically collapses when:
- Session status transitions from any state → 'active'
- Both participants are connected and chatting (text or video)
- User can manually expand/collapse using the toggle button if needed

**Files Modified**:
- `mobile/src/constants/styles.ts` - Optimized `sessionStatusCardCollapsed` padding

**Testing Required**:
- Verify status pane auto-collapses when session becomes active
- Confirm collapsed state is sufficiently compact
- Test manual toggle still works
- Verify behavior in text-only and video modes

---

## UI/UX Requirements to Implement

### Requirement #1: Clear Button Visibility Rules
**Priority**: HIGH
**Status**: Design specification needed

**Rules for Both Platforms (Web + Mobile)**:

#### Text-Only Chat Mode
- **Visible Buttons**:
  - Message reorder button (top ↔ bottom)
  - Video chat offer button/icon
  - End session button
  - Report abuse button

#### Video Chat Offer State
- **Sender View**:
  - Show "Waiting for acceptance" indicator
  - Option to cancel offer

- **Recipient View**:
  - Show prominent "Accept Video Chat" button
  - Show "Decline" option
  - Display who sent the offer

#### Active Video Chat Mode
- **5 Video Control Icons** (at top of video area):
  1. **Fullscreen Mode** - Toggle fullscreen video
  2. **Switch Camera** - Toggle front/back camera (mobile) or camera source (web)
  3. **Mute Microphone** - Toggle audio on/off
  4. **Mute Camera** - Toggle video on/off
  5. **Disconnect Video Chat** - End video only, keep text chat active

- **Always Visible**:
  - End session button (ends entire session)
  - Report abuse button

---

### Requirement #2: Mobile Layout Redesign
**Priority**: HIGH
**Status**: Needs implementation

**Layout Specifications**:

#### Text-Only Mode
```
┌─────────────────────┐
│ Status Pane (small) │ ← Auto-close when active
├─────────────────────┤
│                     │
│   Text Chat Pane    │ ← Larger, takes most space
│     (scrollable)    │
│                     │
├─────────────────────┤
│  Message Input      │
│  [Reorder] [Video]  │ ← Control buttons
└─────────────────────┘
```

#### Video Chat Mode
```
┌─────────────────────┐
│  [🖥️] [📷] [🎤] [📹] [❌] │ ← 5 video controls
├──────────┬──────────┤
│          │          │
│  Remote  │  Local   │ ← Video panes, larger
│  Video   │  Video   │   Close to edges
│          │          │
├──────────┴──────────┤
│  Text Chat (small)  │ ← Still visible but smaller
├─────────────────────┤
│  Message Input      │
└─────────────────────┘
```

**Key Requirements**:
- Text chat pane bigger in text-only mode
- Status pane at top, much smaller
- Video pane only visible when video active
- In video mode: individual video panes larger, close to screen edges
- All elements must fit in viewport without scrolling (except message history)

---

## Implementation Priority

### Phase 1: Critical Fixes (Blocking Release)
1. Fix mobile-to-browser video offer failure (#1)
2. Fix text chat pane visibility on mobile (#4)
3. Fix video control button accessibility (#3)

### Phase 2: Essential Features
4. Implement message reorder button on mobile (#5)
5. Implement mobile layout redesign (Requirement #2)
6. Implement clear button visibility rules (Requirement #1)

### Phase 3: Polish
7. Fix status pane auto-close behavior (#6)
8. Verify and polish browser-to-mobile video (#2)
9. Add fullscreen, camera switch, mute controls

---

## Testing Checklist

### WebRTC Connection Matrix
- [ ] Browser → Browser (text) ✓ Working
- [ ] Browser → Browser (video) ✓ Working
- [ ] Mobile → Mobile (text) - Needs testing
- [ ] Mobile → Mobile (video) - Needs testing
- [ ] Browser → Mobile (text) ✓ Working
- [ ] Browser → Mobile (video) ⚠️ Partially working
- [ ] Mobile → Browser (text) ✓ Working
- [ ] Mobile → Browser (video) ❌ Broken

### Mobile UI Testing
- [ ] Text chat visible and scrollable
- [ ] Message reorder button works
- [ ] Video controls accessible during call
- [ ] Status pane auto-closes
- [ ] Layout fits in viewport
- [ ] No overlapping elements
- [ ] All buttons accessible

### Video Controls Testing
- [ ] Fullscreen toggle works
- [ ] Camera switch works (mobile)
- [ ] Microphone mute works
- [ ] Camera mute works
- [ ] Disconnect video (keep text) works
- [ ] End session works
- [ ] Report abuse works

---

## Pending Features

### AdMob Rewarded Ads (Package Removed - Re-install When Ready)
**Status**: Package uninstalled to prevent crash. Re-install when App Store linked.
**Priority**: HIGH (monetization)

**What Was Implemented** (code preserved but inactive):
- `src/services/admob.ts` - Full rewarded ad service (file exists, imports commented)
- `MintContent.tsx` - Ad integration hooks (imports commented)
- `App.tsx` - AdMob initialization (imports commented)
- `settingsStore.ts` - `isPaidVersion` feature flag (working)

**What's Needed to Enable AdMob**:
1. Link app to App Store in Google AdMob console (REQUIRED - ads crash without this)
2. Re-install the package: `npm install react-native-google-mobile-ads`
3. Add plugin config to `app.json`:
   ```json
   "plugins": [
     [
       "react-native-google-mobile-ads",
       {
         "androidAppId": "ca-app-pub-2071726038718700~2099540252",
         "iosAppId": "ca-app-pub-2071726038718700~2099540252",
         "userTrackingUsageDescription": "This identifier will be used to deliver personalized ads to you."
       }
     ]
   ]
   ```
4. Run `npx expo prebuild --platform ios` and `pod install`
5. Set `isPaidVersion` to `false` in `settingsStore.ts` (line ~71)
6. Uncomment AdMob import in `App.tsx`
7. Uncomment AdMob initialization useEffect in `App.tsx`
8. Uncomment AdMob imports in `MintContent.tsx`

**How the Feature Flag Works**:
- `isPaidVersion = true` → Paid version, no ads shown (current default)
- `isPaidVersion = false` → Free version, show ads before token minting
- Flag is persisted in AsyncStorage
- Selector `selectShouldShowAds` returns the inverse (true = show ads)

**Ad Flow (when enabled)**:
1. User taps "Generate Token"
2. If free version: Show rewarded ad
3. If user completes ad: Mint token
4. If user cancels ad: Show message asking to watch full ad
5. If paid version: Mint token directly (no ad)

**Ad Unit IDs** (preserved for re-implementation):
- App ID: `ca-app-pub-2071726038718700~2099540252`
- Rewarded Ad Unit: `ca-app-pub-2071726038718700/1971547745`

---

## Notes

- Previous WebRTC fixes (signaling state checks, connection management) have been implemented
- Browser-to-browser connections work perfectly as reference implementation
- Mobile app needs comprehensive UI/UX redesign focusing on proper layout and control accessibility
- All platforms should follow consistent button visibility rules

---

## Historical Context

All issues identified in the initial comprehensive analysis have been marked as FIXED. However, the core mobile-to-browser video connection issue persists despite those fixes, indicating a deeper problem in the mobile WebRTC implementation or UI state management that requires further investigation.
