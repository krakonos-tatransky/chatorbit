# ChatOrbit Token Mobile

This Expo + React Native application prototypes the ChatOrbit iPhone experience for generating real-time session tokens.

## Features

- Scroll-to-accept onboarding gate before using the app.
- Bold hero screen with "Need token" and "Got token" actions inspired by the ChatOrbit website.
- Slide-up native form to choose token duration and experience tier using iOS pickers.
- Calls the API defined by `EXPO_PUBLIC_API_BASE_URL` (defaults to `https://endpoints.chatorbit.com/api`) to request session tokens.
- Presents the issued token with copy, share, and quick start controls.
- Vibrant blue-forward gradient theme that mirrors the ChatOrbit visual identity.

## Getting started

```bash
cd mobile
npm install
npm run ios # requires Xcode / iOS simulator
```

> **Note:** Run all Expo CLI commands from inside the `mobile/` directory so Metro resolves the
> workspace-local entry points and configuration correctly.

You can also run `npm run start` to choose the desired platform from the Expo CLI interface.

### Configure environment variables

The Expo app reads the same ICE/STUN/TURN settings as the web client via `EXPO_PUBLIC_*` variables.
Copy `.env.example` to `.env` and tweak the values to point at your API, websocket, TURN
infrastructure, and the hosted session experience (`EXPO_PUBLIC_WEB_BASE_URL`):

```bash
cd mobile
cp .env.example .env
# edit .env to match your endpoints and credentials
```

If you already maintain a `.env.local` for the Next.js frontend, you can reuse the same STUN/TURN
values here (the mobile helper automatically falls back to `NEXT_PUBLIC_*` keys when present).

### Configure your default editor for Expo Go

Expo CLI can open the project in your preferred editor (handy when you press `o` in the
terminal or tap "Open in Editor" inside Expo Go). Set the `EXPO_EDITOR` environment variable in
your shell profile (for example `~/.zshrc` or `~/.bash_profile`) so the CLI knows which command to
invoke:

```bash
echo 'export EXPO_EDITOR="code"' >> ~/.zshrc # or replace `code` with your editor's launch command
source ~/.zshrc
```

On macOS you can point to any app bundle by using the `open` command, e.g.

```bash
echo 'export EXPO_EDITOR="open -a \"Visual Studio Code\""' >> ~/.zshrc
```

After saving your profile, restart the terminal (or `source` the file) before running `npm run ios`
so Expo picks up the new default editor when launching on iOS.

### Optional: add custom icons locally

Binary assets are intentionally excluded from this repository. If you want branded launcher icons or
launch screens while exploring the prototype, you can place the appropriate PNG files inside an
`assets/` directory and reference them in `app.json` (e.g. by setting `icon`, `splash.image`, and
`android.adaptiveIcon`). Expo will automatically pick them up the next time you run the project.

## Next steps

Future milestones include adding the WebRTC messaging and video experience plus a "Got token" join flow.
