# ChatOrbit iOS

This directory contains a native SwiftUI implementation of the ChatOrbit client application. The project mirrors the core experiences delivered by the existing web frontend while integrating with the current backend services. It also includes a native WebRTC powered video calling surface that uses the device camera and microphone.

## Project structure

```
ios/ChatOrbit
├── ChatOrbit.xcodeproj          # Preconfigured Xcode project
├── ChatOrbit                    # Application sources and resources
│   ├── App                      # App entry point and scene configuration
│   ├── Features                 # Feature specific screens, view models, and services
│   │   ├── Auth                 # Authentication flows
│   │   ├── Chat                 # Conversations, messaging, and presence
│   │   ├── Shared               # Shared models, networking, and utilities
│   │   └── Video                # Native video calling stack powered by WebRTC
│   └── Resources                # Assets, Info.plist, and preview fixtures
└── Package.resolved             # Swift Package Manager lockfile for third-party deps
```

## Requirements

- Xcode 15 or later (iOS 16 deployment target)
- Swift 5.9
- CocoaPods is **not** required; all dependencies are delivered through Swift Package Manager

## First-time setup

1. Open `ChatOrbit.xcodeproj` in Xcode.
2. Resolve the Swift Package dependencies (Xcode will prompt automatically). The project currently references:
   - [`WebRTC`](https://github.com/stasel/WebRTC) for real-time audio and video (tracking the `latest` branch).
3. Update the bundle identifier (`com.chatorbit.app`) and signing team under *Signing & Capabilities*.
4. Set the backend URL environment values if you are not using the default `https://api.chatorbit.com` domain. You can do this via the `CHAT_ORBIT_API_URL` user-defined build setting or by editing `Environment.swift`.

## Building & running

- Select the `ChatOrbit` scheme and run on an iOS 16 simulator or device.
- The app automatically handles authentication, chat messaging, presence updates, and video calling by leveraging the backend REST and WebSocket APIs already used by the web application.

## Configuration

Key runtime values live in `Environment.swift`. Update these if your backend deployment differs from the default values or if you need to point to a staging environment.

```
struct Environment {
    static var apiBaseURL: URL = URL(string: "https://api.chatorbit.com")!
    static var websocketURL: URL = URL(string: "wss://api.chatorbit.com/ws")!
}
```

You can also override them at build time with custom *User-Defined* build settings (`CHAT_ORBIT_API_URL` and `CHAT_ORBIT_WS_URL`).

## Video calling

The `VideoCallView` and `VideoCallViewModel` leverage Apple's `AVFoundation` for local capture and Google's WebRTC native SDK for bidirectional media streams. The app negotiates sessions through the same signaling endpoints used by the web client (see `VideoSession.swift` for details). The view includes native picture-in-picture controls, mute toggles, and call management.

## Testing

Unit tests are not included yet, but the architecture isolates networking behind protocol-oriented services to make it straightforward to add XCTest targets later. View models expose async operations and `@Published` state that can be validated with dependency injection and mocked services.

## Notes

- This project does not modify the existing web frontend; all web assets remain untouched.
- The directory can be zipped or distributed independently for collaborators who prefer Xcode.
- Ensure that your backend supports WebRTC signaling for native clients. The `VideoSession` implementation matches the JSON contracts used by the web application.

