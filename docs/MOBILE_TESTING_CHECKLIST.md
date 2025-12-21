# Mobile App Testing Checklist

**Date**: 2025-12-21
**Purpose**: Comprehensive testing of all recent mobile fixes
**Platform**: React Native (iOS/Android)

---

## Recent Fixes Summary

All fixes implemented on **2025-12-21**:

1. ✅ **Issue #3**: Video control buttons overlay (accessibility fix)
2. ✅ **Issue #4**: Text chat pane visibility (ScrollView fix)
3. ✅ **Issue #5**: Message reorder button implementation
4. ✅ **Issue #6**: Status pane auto-collapse optimization

---

## Pre-Test Setup

### Build Verification
- [x] TypeScript compilation: **PASSED** (no new errors)
- [ ] Metro bundler starts without errors
- [ ] App builds successfully on iOS simulator/device
- [ ] App builds successfully on Android emulator/device

### Required Test Environment
- [ ] Two devices/simulators ready (for peer-to-peer testing)
- [ ] Token generated and ready
- [ ] Backend server running at API_BASE_URL
- [ ] WebSocket server accessible at WS_BASE_URL

---

## Test Suite 1: Video Control Buttons (Issue #3)

**What Changed**: Video controls now overlay the video panes instead of being positioned below them.

### Test Cases

#### TC1.1: Controls Visibility - Normal Mode
- [ ] Start a video call between two devices
- [ ] Verify 5 control buttons are visible **on top** of the video
- [ ] Expected buttons (left to right):
  - [ ] Fullscreen toggle
  - [ ] Camera mute/unmute
  - [ ] Microphone mute/unmute
  - [ ] Switch camera
  - [ ] End call
- [ ] Buttons should have semi-transparent dark background
- [ ] All buttons should be tappable

#### TC1.2: Controls Visibility - Fullscreen Mode
- [ ] Tap "Fullscreen" button
- [ ] Video panes should expand
- [ ] Controls should **still be visible** at bottom of video
- [ ] All 5 buttons remain accessible
- [ ] Tap "Exit fullscreen" to return to normal mode

#### TC1.3: Control Functionality
- [ ] **Camera toggle**: Tap to mute video → local video should show muted state
- [ ] **Camera toggle**: Tap again to unmute → local video resumes
- [ ] **Mic toggle**: Tap to mute audio → verify remote user can't hear you
- [ ] **Mic toggle**: Tap again to unmute → audio resumes
- [ ] **Switch camera**: Tap to flip between front/back camera (mobile only)
- [ ] **End call**: Tap → video ends but text chat remains active

#### TC1.4: Visual Design
- [ ] Controls background is semi-transparent: `rgba(2, 11, 31, 0.85)`
- [ ] Controls have rounded bottom corners matching video panes
- [ ] Controls don't obscure critical video content
- [ ] Controls wrap properly on smaller screens

**Pass Criteria**: All 5 buttons visible and functional during active video call

---

## Test Suite 2: Text Chat Visibility (Issue #4)

**What Changed**: Removed `flex: 1` from `sessionContent` to allow proper scrolling.

### Test Cases

#### TC2.1: Chat Pane Visibility - Session Start
- [ ] Launch app and join a session
- [ ] Status pane should be visible at top
- [ ] Video section should be visible (if applicable)
- [ ] **Chat section should be visible** without scrolling
- [ ] Message input field should be accessible

#### TC2.2: Scroll Behavior
- [ ] Scroll down through the session screen
- [ ] Should be able to scroll past status pane
- [ ] Should be able to scroll past video section
- [ ] Should reach chat section smoothly
- [ ] No content should be cut off or inaccessible

#### TC2.3: Chat with Multiple Messages
- [ ] Send 10+ messages back and forth
- [ ] Chat list should scroll independently
- [ ] All messages should be visible by scrolling the chat list
- [ ] Message input should remain fixed at bottom of chat card

#### TC2.4: Keyboard Interaction
- [ ] Tap message input to open keyboard
- [ ] KeyboardAvoidingView should push content up
- [ ] Message input should remain visible above keyboard
- [ ] Chat messages should still be scrollable

**Pass Criteria**: All sections accessible via scrolling, no cut-off content

---

## Test Suite 3: Message Reorder Button (Issue #5)

**What Changed**: Added message reorder toggle button with AsyncStorage persistence.

### Test Cases

#### TC3.1: Button Visibility
- [ ] Navigate to chat section
- [ ] Find "Messages" title in chat header
- [ ] Circular toggle button should appear **next to** the title
- [ ] Button should have aurora color scheme
- [ ] Button should show arrow icon (↑ or ↓)

#### TC3.2: Message Order - Normal (Newest at Bottom)
- [ ] Default state: arrow-up icon (↑)
- [ ] Send a few messages
- [ ] Newest messages should appear at **bottom** of list
- [ ] Scroll to bottom to see latest messages
- [ ] This is the default/normal state

#### TC3.3: Message Order - Reversed (Newest at Top)
- [ ] Tap the message order button
- [ ] Icon should change to arrow-down (↓)
- [ ] Message list should **reverse immediately**
- [ ] Newest messages now appear at **top**
- [ ] Scroll to top to see latest messages

#### TC3.4: Persistence Across App Restart
- [ ] Set message order to reversed (↓)
- [ ] Close and fully restart the app
- [ ] Join the same or new session
- [ ] Message order should **still be reversed**
- [ ] Button should show arrow-down icon (↓)
- [ ] Preference loaded from AsyncStorage

#### TC3.5: Toggle Multiple Times
- [ ] Rapidly toggle order button 5 times
- [ ] Each tap should flip the order
- [ ] No crashes or UI glitches
- [ ] AsyncStorage saves should complete without errors

#### TC3.6: Empty Message List
- [ ] Join a new session with no messages
- [ ] Message order button should be visible
- [ ] Toggle should work even with empty list
- [ ] No errors in console

**Pass Criteria**: Button toggles order, preference persists across restarts

---

## Test Suite 4: Status Pane Auto-Collapse (Issue #6)

**What Changed**: Optimized collapsed padding; auto-collapse already existed.

### Test Cases

#### TC4.1: Initial State - Expanded
- [ ] Join a new session
- [ ] Status pane should be **expanded** initially
- [ ] Shows all metrics: Timer, Message limit, Connected participants
- [ ] Takes reasonable space at top of screen

#### TC4.2: Auto-Collapse on Session Active
- [ ] Wait for both participants to connect
- [ ] Wait for session status to become "active"
- [ ] Status pane should **auto-collapse** automatically
- [ ] Only shows: Title + status pill + toggle button
- [ ] Collapsed state is visibly more compact

#### TC4.3: Manual Expand/Collapse
- [ ] After auto-collapse, tap "Show" button
- [ ] Status pane should expand to show all details
- [ ] Tap "Hide" button
- [ ] Status pane should collapse again
- [ ] Manual toggle should work at any time

#### TC4.4: Collapsed State Compactness
- [ ] When collapsed, measure height visually
- [ ] Padding should be: `paddingVertical: 8, paddingHorizontal: 12`
- [ ] Should be ~33% smaller than before
- [ ] More screen space for chat/video

#### TC4.5: Status Pane Position
- [ ] Status pane should be first element (top of scroll)
- [ ] Video section should come after status
- [ ] Chat section should come after video
- [ ] Order: Status → Video → Chat

#### TC4.6: Video Section Visibility
- [ ] **Text-only mode**: Video section should be **hidden**
- [ ] **Request video**: Video section appears
- [ ] **Active video**: Video section visible with controls
- [ ] **End video**: Video section disappears (unless streams persist)

**Pass Criteria**: Status auto-collapses when active, optimized padding visible

---

## Test Suite 5: Integration Testing

**Purpose**: Verify all fixes work together without conflicts.

### Test Cases

#### TC5.1: Complete Session Flow
- [ ] Join session → Status expanded
- [ ] Session becomes active → Status auto-collapses
- [ ] Send messages → Chat visible and scrollable
- [ ] Toggle message order → Works correctly
- [ ] Request video → Video section appears
- [ ] Video connects → Controls overlay visible
- [ ] All buttons accessible during call
- [ ] End video → Video section hides
- [ ] Chat remains functional

#### TC5.2: Screen Real Estate Usage
- [ ] With status collapsed + video active + chat visible
- [ ] Measure screen space distribution:
  - Status: ~8-10% (collapsed)
  - Video: ~35-40% (with overlay controls)
  - Chat: ~50-55% (majority of space)
- [ ] No wasted space
- [ ] All interactive elements accessible

#### TC5.3: Memory and Performance
- [ ] Monitor app memory usage during session
- [ ] Rapid toggling of controls shouldn't leak memory
- [ ] Message list scrolling should be smooth
- [ ] Video rendering should be smooth (30+ fps)
- [ ] No frame drops when toggling controls

#### TC5.4: Error Handling
- [ ] AsyncStorage errors → Message order defaults correctly
- [ ] Missing video permissions → Graceful error messages
- [ ] Network disconnection → Status pane shows error
- [ ] Reconnection → Session resumes correctly

---

## Test Suite 6: Cross-Platform Compatibility

### iOS Specific
- [ ] SafeAreaView respects notch/home indicator
- [ ] Video controls don't overlap safe areas
- [ ] Keyboard behavior with KeyboardAvoidingView works
- [ ] AsyncStorage persists correctly on iOS

### Android Specific
- [ ] Status bar doesn't overlap content
- [ ] Back button behavior correct
- [ ] Keyboard behavior works (no KeyboardAvoidingView needed)
- [ ] AsyncStorage persists correctly on Android

---

## Test Suite 7: Accessibility

### Screen Reader Testing
- [ ] VoiceOver (iOS) / TalkBack (Android) enabled
- [ ] Message order button announces: "Show newest messages at top/bottom"
- [ ] Video controls announce their state (muted/unmuted)
- [ ] Status toggle announces "Show/Hide"
- [ ] All buttons have proper labels

### Visual Accessibility
- [ ] Color contrast sufficient for all text
- [ ] Icons are clear and recognizable
- [ ] Button tap targets are adequate (minimum 44x44 points)

---

## Known Pre-Existing Issues (Not Fixed)

These errors exist in the codebase but are **not related** to recent fixes:

1. TypeScript import errors for `react-native-webrtc`
2. Missing `DEFAULT_MESSAGE_CHAR_LIMIT` export
3. Variable declaration order warnings
4. RTCView component type mismatches
5. Missing `primaryButtonDisabled` style property
6. expo-localization type issues

**Action**: These can be addressed separately; they don't affect the fixes implemented.

---

## Compilation Results

```
✅ TypeScript Check: PASSED
- No new errors introduced
- All new code (videoPreviewContainer, videoControlsOverlay,
  orderedMessages, reverseMessageOrder, chatHeaderLeft,
  messageOrderButton) compiles successfully
```

---

## Sign-Off

### Test Execution
- **Tested By**: _________________
- **Date**: _________________
- **Platform**: iOS / Android / Both
- **Device**: _________________

### Results Summary
- [ ] All critical tests passed
- [ ] Minor issues found (list below)
- [ ] Major issues found (stop deployment)

### Issues Found
```
[List any issues discovered during testing]
```

### Deployment Recommendation
- [ ] **APPROVED** - Ready for production
- [ ] **CONDITIONAL** - Fix minor issues first
- [ ] **BLOCKED** - Fix critical issues first

---

## Next Steps After Testing

If all tests pass:
1. Create release notes documenting the fixes
2. Update CHANGELOG.md with version bump
3. Tag release in git
4. Deploy to TestFlight / Google Play Beta
5. Monitor crash reports and user feedback

If issues found:
1. Document issues in GitHub/JIRA
2. Prioritize by severity
3. Fix and re-test
4. Update this checklist with results
