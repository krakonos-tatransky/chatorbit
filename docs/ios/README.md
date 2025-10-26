# Turning ChatOrbit into an iPhone App (2025 Edition)

This guide walks you end to end through turning the ChatOrbit Next.js site into a native iOS app experience. It covers Apple
hardware requirements, legal onboarding, the Capacitor toolchain, and the Xcode distribution workflow that Apple expects as of
October 2025.

---

## 1. Hardware, software, and accounts

| Requirement | Recommendation | Notes |
|-------------|----------------|-------|
| **Mac** | Apple Silicon (M1/M2/M3) with 16 GB RAM | Xcode and the iOS Simulator are far smoother on Apple Silicon. |
| **macOS** | Sonoma or newer | Required for Xcode 16 SDKs. |
| **Storage** | 50 GB free | Xcode, simulators, DerivedData, and archives add up quickly. |
| **iPhone for device testing** | iOS 17+ | Optional but invaluable for validating sensors, push, and network behaviour. |

**Apple Developer setup**

1. Create or reuse an Apple ID dedicated to development.
2. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/enroll/) ($99 USD/year). Company enrollment
   requires a legal entity and D‑U‑N‑S number.
3. Accept every agreement under **Agreements, Tax, and Banking**. Add bank/tax info if you will sell subscriptions or in-app
   purchases.
4. Read the current **App Store Review Guidelines**, **Human Interface Guidelines**, and privacy policies so your UX and data
   flows align with Apple’s expectations before you submit.

---

## 2. Prepare the Next.js project for static export

Capacitor ships your web app as static assets. Configure Next.js so a single `pnpm build` produces the `/out` directory
Capacitor expects.

1. Update `frontend/next.config.mjs` to enable static export:

   ```js
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     output: 'export',
     trailingSlash: true,
     images: {
       unoptimized: true,
     },
   };

   export default nextConfig;
   ```

   The repository already includes this configuration along with optional `basePath`/`assetPrefix` overrides for hosted builds.
2. Install dependencies and create a static build:

   ```bash
   cd frontend
   pnpm install
   pnpm build
   ```

   Next.js writes the generated site to `frontend/out`. Inspect it with `pnpm dlx serve out` if you want to test locally in
   Safari Responsive Design Mode before wrapping it natively.

---

## 3. Install Capacitor and generate the native shell

Capacitor 6+ is the recommended bridge in 2025 for shipping web-driven apps with native capabilities.

1. From the project root, install the CLI (globally or locally):

   ```bash
   pnpm dlx @capacitor/cli@latest init
   ```

   - **App name:** e.g. `ChatOrbit`
   - **App ID:** Reverse-domain identifier (for example `com.yourcompany.chatorbit`). This must match the App ID you register on
     the Apple Developer portal.
   - **Web directory:** `frontend/out`
2. Add the iOS platform scaffold:

   ```bash
   npx cap add ios
   ```

   Capacitor creates `ios/App` with an Xcode workspace you can open directly. Commit this directory so your native configuration
   stays versioned with the web code.
3. Whenever you rebuild the web assets, sync them into the native container:

   ```bash
   pnpm --filter chatorbit-frontend build
   npx cap sync ios
   ```

---

## 4. Configure the project in Xcode

1. Install Xcode 16 from the Mac App Store (10–12 GB download) and launch it once so it can install the command-line tools. If
   prompted, run `xcode-select --install`.
2. Open the Capacitor workspace:

   ```bash
   npx cap open ios
   ```

   Xcode launches with simulators ready. Choose "iPhone 15" (or later) as the run target and press **Cmd+R** to verify the
   ChatOrbit web UI boots in the native shell.
3. Enable code signing for real devices and distribution:
   - In the Xcode navigator select the **App** target → **Signing & Capabilities**.
   - Sign in with the Apple ID that enrolled in the Developer Program.
   - Set the bundle identifier to match your Capacitor App ID.
   - Check **Automatically manage signing** so Xcode creates provisioning profiles.
4. Register devices and distribution certificates in
   [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/):
   - Generate a Certificate Signing Request in **Keychain Access**.
   - Create iOS Development and Distribution certificates using that CSR.
   - Add iPhone UDIDs under **Devices** for on-device testing.
   - Create development and distribution provisioning profiles tied to your App ID and certificates. Double-click the downloaded
     `.mobileprovision` files so Xcode picks them up.

---

## 5. Layer in native capabilities (optional)

Capacitor plugins expose hardware features without leaving the React codebase.

```bash
pnpm add @capacitor/camera
npx cap sync ios
```

Use plugins inside your components:

```tsx
import { Camera, CameraResultType } from '@capacitor/camera';

export async function takePhoto() {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Uri,
  });

  return image.webPath;
}
```

Repeat the install/sync cycle for notifications, geolocation, filesystem access, etc. Update `ios/App/Info.plist` with the
appropriate `NS*UsageDescription` strings any time you request permissions (camera, microphone, location, notifications).

---

## 6. Build, test, and ship

1. **Simulators:** Use **Cmd+R** in Xcode to smoke test across multiple iPhone sizes. Safe area insets and Dynamic Island space are
   already respected by the existing CSS.
2. **Devices:** Plug an iPhone into your Mac (or use wireless debugging). Select it as the run destination in Xcode and build.
3. **Archive for TestFlight/App Store:**
   - In Xcode choose **Product → Archive**.
   - When the archive completes, click **Distribute App** in the Organizer. Choose **TestFlight** for beta testing or **App Store
     Connect** for production.
4. **App Store Connect checklist:**
   - Create the app record with the same bundle identifier.
   - Complete the App Privacy questionnaire and upload a privacy policy URL explaining data collection/retention.
   - Provide localized descriptions, screenshots (use the Simulator’s screenshot tool or Xcode’s recordings), and keywords.
   - Ensure required agreements, tax, and banking contracts remain active.

---

## 7. Compliance and legal guardrails

- Document how users can request data deletion to stay compliant with GDPR/CCPA.
- If you use encryption beyond Apple’s standard libraries, review U.S. export compliance questions in App Store Connect.
- Respect App Tracking Transparency: show the ATT prompt before tracking and declare the usage in your App Store submission.
- Audit any third-party SDKs (analytics, crash reporting, ads) to make sure they follow Apple’s privacy policies.

---

## 8. Quick reference commands

| Task | Command |
|------|---------|
| Install frontend dependencies | `cd frontend && pnpm install` |
| Local dev server | `pnpm --filter chatorbit-frontend dev --hostname 0.0.0.0 --port 3000` |
| Static build for Capacitor | `pnpm --filter chatorbit-frontend build` |
| Sync web assets into native shell | `npx cap sync ios` |
| Open the iOS workspace | `npx cap open ios` |
| Lint | `pnpm --filter chatorbit-frontend lint` |

Keep this guide handy whenever certificates expire or Apple refreshes legal agreements—renewal lapses can break signing and delay
releases.
