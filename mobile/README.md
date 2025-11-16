# ChatOrbit Token Mobile

This Expo + React Native application prototypes the ChatOrbit iPhone experience for generating real-time session tokens.

## Features

- Scroll-to-accept onboarding gate before using the app.
- Bold hero screen with "Need token" and "Got token" actions inspired by the ChatOrbit website.
- Slide-up native form to choose token duration and experience tier using iOS pickers.
- Calls the API defined by `EXPO_PUBLIC_API_BASE_URL` (defaults to `https://endpoints.chatorbit.com/api`) to request session tokens.
- Presents the issued token with copy, share, and quick start controls.
- Join an existing session by pasting a shared token directly inside the "Got token" flow.
- Native in-app cockpit that mirrors the browser experience with live session status, ICE diagnostics, and a WebRTC data-channel chat surface.
- Vibrant blue-forward gradient theme that mirrors the ChatOrbit visual identity.

## Getting started

### 1. Prep your macOS environment

All commands below assume the latest macOS Sonoma release with Xcode 15.4+ **and** that you are
using the default `zsh` shell. If you use another shell, replace the `~/.zshrc` edits with the
equivalent profile file for your setup.

```bash
# Install Homebrew if it is not already available.
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install build tooling used by Metro / React Native.
brew install watchman cocoapods node@20

# Ensure the Node 20 toolchain is active for this shell session.
# Use the Homebrew prefix dynamically so this works on both Apple silicon (/opt/homebrew)
# and Intel (/usr/local) Macs.
echo 'export PATH="$(brew --prefix node@20)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# (Optional) use nvm if you prefer isolated runtimes.
brew install nvm
mkdir -p ~/.nvm
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"' >> ~/.zshrc
source ~/.zshrc
nvm install 20.19.5
nvm use 20.19.5

# Confirm CocoaPods is ready (installs into the system Ruby once).
sudo gem install cocoapods
pod --version
```

> **Tip:** If you upgrade Xcode, re-run `sudo xcode-select --switch /Applications/Xcode.app` so
> the command-line tools match the GUI install.

### 2. Install JavaScript dependencies

```bash
cd mobile
npm install
```

If you see dependency mismatch warnings (for example peer dependency errors while installing), run
`npx expo install --fix` so Expo reapplies the SDK 52-compatible versions and re-runs
`npm install` with the corrected constraints.

### 3. Configure environment variables

Copy `.env.example` to `.env` and tweak the REST, websocket, and TURN credentials. When you are
working on a fork or local backend, point the base URLs at your machine or tunnel.

```bash
cd mobile
cp .env.example .env
```

> The Expo CLI automatically loads `.env` before starting Metro so long as the file lives in the
> `mobile/` directory.

### 4. Produce a development build (required for WebRTC)

Expo Go does **not** bundle `expo-webrtc`. Always create a dev client or simulator build before
trying the in-app cockpit:

```bash
cd mobile
npm run native:ios        # builds + launches the iOS simulator
npm run native:android    # builds + installs on the Android emulator or connected device
```

Behind the scenes these commands execute `expo prebuild`, run `pod install`, and invoke
`xcodebuild`/`gradlew`. The repository’s config plugin disables the fragile `React-Codegen` phase
and adds derived-data marker files so you can repeatedly run `expo run` without touching the native
projects manually.

### 5. Launch Metro in dev-client mode

Once the native dev client is installed, start Metro and connect to it from the installed app:

```bash
cd mobile
npm run start     # or: npx expo start --dev-client
```

Press `i`, `a`, or scan the QR code to connect. The dev client will reuse the same bundle until you
shake the device (or press `r`/`R`) to reload.

> **Note:** Run all Expo CLI commands from inside the `mobile/` directory so Metro resolves the
> workspace-local entry points and configuration correctly. If you store your environment exports in
> `~/.zprofile` or another `zsh`-specific startup file, make sure it is sourced before launching
> Expo in a new terminal tab/window.

### 6. Force a pristine native rebuild (when things get stuck)

If Xcode complains about stale pods, build scripts, or missing native modules, delete the generated
projects and regenerate them:

```bash
cd mobile
rm -rf ios android
npx expo prebuild --clean
npx expo run:ios --no-build-cache
```

For iOS-specific dependency hiccups you can also run:

```bash
cd mobile/ios
rm -rf Pods Podfile.lock build
pod install
cd ..
```

### 7. Validate the toolchain

Expo bundles a doctor utility that catches common setup problems. Run it whenever you change Node,
CocoaPods, or Xcode:

```bash
cd mobile
npm run doctor
```

This command will automatically rewrite `package.json` to the highest versions that match the Expo
SDK in use (currently 52) and re-run `npm install` for you. Accept its prompts whenever you are
upgrading Node or when Apple ships a new simulator runtime.

## Reference

The sections below preserve the original quick-start guidance so teams familiar with the previous
README can still find the same headings.

### Configure environment variables

The Expo app reads the same ICE/STUN/TURN settings as the web client via `EXPO_PUBLIC_*` variables.
Copy `.env.example` to `.env` and tweak the values to point at your API, websocket, and TURN
infrastructure:

```bash
cd mobile
cp .env.example .env
# edit .env to match your endpoints and credentials
```

If you already maintain a `.env.local` for the Next.js frontend, you can reuse the same STUN/TURN
values here (the mobile helper automatically falls back to `NEXT_PUBLIC_*` keys when present).

### Build with the WebRTC native module

The in-app cockpit relies on the `expo-webrtc` native module, which Expo Go does not
bundle. To actually join sessions inside the app, create an Expo development build and install it on
your device or simulator:

```bash
cd mobile
npx expo run:ios    # or: npx expo run:android
```

Expo documents the full dev-build workflow here:
https://docs.expo.dev/development/introduction/

### Keep Xcode builds quiet (and stable)

When you generate the native iOS project via `npx expo prebuild`/`npx expo run:ios`, Xcode warns
about custom `[CP-User]` script phases that lack declared output files. The app now ships with a
config plugin (`plugins/ensure-script-phase-outputs.js`) that adds derived-data stamp files for the
Hermes, RNCore, and Expo Constants helper scripts so the warnings disappear automatically each time
you prebuild. If you add new custom script phases in the future, mimic this pattern so every phase
declares at least one output.

The same plugin also forces `ENV['DISABLE_CODEGEN'] = '1'` in the generated Podfile *and* drops stub
`React-Codegen.podspec.json` **and** `ReactCodegen.podspec.json` files inside `ios/build/generated/ios`.
React Native's codegen target has been intermittently failing on clean Expo development builds and
Podfile templates sometimes look for either spelling, so disabling it (while still providing the
expected podspecs) keeps `npx expo run:ios` reliable until we switch to the new architecture. Remove
that line (or override the environment variable) if you specifically need to re-enable codegen for
local experiments.

### Configure your default editor for Expo Go

Expo CLI can open the project in your preferred editor (handy when you press `o` in the
terminal or tap "Open in Editor" inside Expo Go). Set the `EXPO_EDITOR` environment variable in
your shell profile (for example `~/.zshrc` or `~/.zprofile`) so the CLI knows which command to
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

Future milestones include layering in the WebRTC video call controls, camera/microphone previews, and richer moderation tooling that already exists in the desktop cockpit.
