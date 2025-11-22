# ChatOrbit iOS

This directory contains the native SwiftUI client for ChatOrbit sessions. The iOS app mirrors the public web experience: request a session token, join with an existing token, chat over an encrypted data channel, and escalate to a live video call with the device camera and microphone.

## Project structure

```
ios/ChatOrbit
├── ChatOrbit.xcodeproj          # Preconfigured Xcode project
├── ChatOrbit                    # Application sources and resources
│   ├── App                      # Application entry point
│   ├── Features
│   │   ├── Chat                 # Session landing screen, chat log, and token workflows
│   │   ├── Auth                 # Report abuse form + shared support links
│   │   ├── Shared               # Models, environment helpers, persistence utilities
│   │   └── Video                # WebRTC peer connection, data channel, and rendering helpers
│   └── Resources                # Assets, Info.plist, and localization placeholders
└── Podfile                      # CocoaPods dependency declaration (GoogleWebRTC)
```

## Requirements

- Xcode 15 or later (iOS 16 deployment target)
- Swift 5.9
- [CocoaPods](https://cocoapods.org) 1.13 or later

## First-time setup

1. From `ios/ChatOrbit`, run `pod install` to fetch the [`GoogleWebRTC`](https://github.com/google/ios-webrtc) binary distribution used for media capture and data channels.
2. Open the generated `ChatOrbit.xcworkspace` in Xcode.
3. Update the bundle identifier and signing team under **Signing & Capabilities**.
4. Optionally override the default backend endpoints (`https://endpoints.chatorbit.com`) by editing `Info.plist` (`CHAT_ORBIT_API_URL`, `CHAT_ORBIT_WS_URL`, and ICE server keys) or the `AppEnvironment` helper.

## Feature overview

- **Token issuance:** configure validity, session TTL, and per-message character limits directly from the landing screen. Copy the generated token or jump straight into a hosted session.
- **Join with token:** paste an existing token to reclaim the host/guest slot, automatically restoring the participant ID if it was previously used on the device.
- **Live session view:** combines the encrypted chat log, WebRTC data channel messaging, and native video calling surface. Session timers, connected state, and signaling all mirror the behaviour of the Next.js frontend.
- **Report abuse:** submit the same questionnaire exposed on the web client; submitting immediately shuts down the active session via the REST API.
- **Help/Terms shortcuts:** persistent footer links open the public support and policy pages.

## Runtime configuration

`AppEnvironment.swift` centralises URLs and ICE configuration. The app ships with the production endpoints but honours Info.plist overrides:

```swift
AppEnvironment.apiBaseURL      // https://endpoints.chatorbit.com by default
AppEnvironment.websocketURL    // wss://endpoints.chatorbit.com/ws by default
AppEnvironment.iceServers      // Parsed from Info.plist (STUN/TURN) or sensible defaults
```

The app caches session metadata in `UserDefaults` (see `SessionPersistence`) to allow reconnecting with the same participant ID and countdown state, matching the behaviour of the browser sessionStorage logic.

## Video & messaging stack

`SessionPeerConnection` wraps the GoogleWebRTC APIs to:

- create the RTCPeerConnection with ICE servers that match the web client
- capture local audio/video, expose remote/local tracks to SwiftUI, and send capabilities over the data channel
- encrypt chat messages with AES-GCM using the token-derived key, verify hashes, and honour delete events
- exchange offers, answers, and ICE candidates through the `/ws/sessions/{token}` WebSocket endpoint

The SwiftUI `SessionView` renders the remote feed (falling back to a placeholder until the guest joins), keeps the chat log in sync, and exposes mute-free call controls via the data channel.

## Notes

- The iOS client lives alongside the existing Next.js frontend; no web assets are modified.
- All guest interactions work without authentication, matching the current public website.
- When pointing at another backend environment, ensure it is configured with the same WebRTC signalling contracts expected by the web app.
- The legacy Chat/Video/Auth scaffolding was repurposed to host the new session-centric workflow; the Xcode project layout remains stable for future updates.
