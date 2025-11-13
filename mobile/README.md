# ChatOrbit Token Mobile

This Expo + React Native application prototypes the ChatOrbit iPhone experience for generating real-time session tokens.

## Features

- Scroll-to-accept onboarding gate before using the app.
- Bold hero screen with "Need token" and "Got token" actions inspired by the ChatOrbit website.
- Slide-up native form to choose token duration and experience tier using iOS pickers.
- Calls the production API at `https://endpoints.chatorbit.com/token` to request session tokens.
- Presents the issued token with copy, share, and quick start controls.
- Vibrant blue-forward gradient theme that mirrors the ChatOrbit visual identity.

## Getting started

```bash
cd mobile
npm install
npm run ios # requires Xcode / iOS simulator
```

You can also run `npm run start` to choose the desired platform from the Expo CLI interface.

### Optional: add custom icons locally

Binary assets are intentionally excluded from this repository. If you want branded launcher icons or
launch screens while exploring the prototype, you can place the appropriate PNG files inside an
`assets/` directory and reference them in `app.json` (e.g. by setting `icon`, `splash.image`, and
`android.adaptiveIcon`). Expo will automatically pick them up the next time you run the project.

## Next steps

Future milestones include adding the WebRTC messaging and video experience plus a "Got token" join flow.
