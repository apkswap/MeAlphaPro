<!-- Search-friendly product summary -->
# MeAlpha Pro — Personal Planner, Finance & Productivity App

[GitHub Actions](https://github.com/apkswap/MeAlphaPro/actions) · [Repository](https://github.com/apkswap/MeAlphaPro)

**MeAlpha Pro** is a personal planner and productivity application for managing goals, tasks, habits, focus sessions, personal finances, and weekly performance insights in one place. It is being developed for **Windows desktop and Android**, with a responsive interface in **Persian (RTL) and English (LTR)** and support for **Jalali and Gregorian dates**.

- **Product:** MeAlpha Pro
- **Category:** Personal planner · Personal finance tracker · Goal and habit tracker · Focus and productivity app
- **Platforms:** Windows desktop and Android
- **Data approach:** Local-first application data; online backup/sync is a separate capability and should not be assumed available until validated
- **Languages:** Persian and English

[Open the GitHub repository](https://github.com/apkswap/MeAlphaPro) · [Read the Persian documentation](README-FA.md) · [View build workflows](https://github.com/apkswap/MeAlphaPro/actions)

---

# MeAlpha Pro

**MeAlpha Pro** is a local-first personal operating system for organizing everyday work and life. It brings personal planning, goals, habits, tasks, financial tracking, and progress insights into one desktop- and mobile-oriented application.

> The application is designed to keep day-to-day data on the user's device. Cloud backup is a separate, optional capability and must never be required for normal offline use.

## Product highlights

### Personal planning
- Dashboard for reviewing personal activity and progress.
- Goal management and progress tracking.
- Task and to-do management.
- Habit tracking.
- Focus-session tracking.
- Personal workspace for ideas, projects, lists, and notes.

### Personal finance
- Multiple financial accounts, each with its own currency, account number, and balance.
- Transactions associated with their relevant accounts.
- Asset and liability tracking.
- Net-worth overview.
- Reports and insights based on information entered into the application.

### Profile and personalization
- Personal profile with display name, username, and biography.
- Avatar selection and profile-image support.
- Profile color and cover-image customization.
- Persian (RTL) and English (LTR) interface support.
- Jalali and Gregorian date support.
- Three visual color directions: orange/navy, minimal green, and blue/navy.
- Light and dark appearance modes.
- Responsive layouts for desktop and smaller screens.

## Design

The current interface uses a dark, layered visual language with glass-like surfaces, depth, and a subtle animated network-inspired background. The application shell, navigation, dashboard, and profile experience share the same design system.

The product name remains **MeAlpha Pro**. The compact application branding may display **MeAlpha** where space is limited.

## Data, privacy, and backup

### Local-first storage
- Application data is stored locally using IndexedDB.
- Core day-to-day use does not require an internet connection.
- The application should remain usable when offline.
- Users should create a backup before restoring data or moving to another device.

### Dropbox direction
Dropbox is the **only intended online backup provider** for MeAlpha Pro. Google Drive and other online backup providers are not part of the product's backup direction.

**Integration status:** A successful application build does not, by itself, verify Dropbox authorization, upload, restore, or multi-device synchronization. Treat Dropbox backup and sync as unavailable until the Dropbox OAuth configuration and end-to-end account tests have been completed successfully. Do not rely on it as the only copy of important data before that validation.

Local data storage and manual backup/restore are distinct from cloud synchronization. A backup file transfer is not automatic multi-device sync.

## Technology

- React and TypeScript
- Vite
- IndexedDB for local application data
- Electron for the Windows desktop application
- Capacitor for the Android application
- Tailwind CSS and shared UI components
- GitHub Actions for automated Windows and Android builds

## Requirements

- Node.js **22.14.0** (the version used by the CI workflows)
- npm
- Windows build: Windows environment and Electron Builder dependencies
- Android build: Java 21 and Android SDK

## Getting started

Run these commands from the repository root:

```bash
npm install
npm run dev
```

## Type-check and web build

Build the application workspace:

```bash
npm run build --workspace apps/mealpha-pro
```

The workspace build runs the TypeScript project build followed by the Vite production build.

## Build for Windows

Run from the repository root on Windows:

```bash
npm install
npm run desktop:build --workspace apps/mealpha-pro
```

The Windows installer is generated under:

```
apps/mealpha-pro/release/
```

The GitHub Actions workflow also prepares the Windows application icon, verifies that an EXE installer exists, and uploads it as a build artifact.

## Build for Android

The Android workflow creates the Capacitor Android project, synchronizes the web application, builds a debug APK, verifies the APK, and uploads it as an artifact.

For a local first-time Android setup:

```bash
npm install
npm run build --workspace apps/mealpha-pro
cd apps/mealpha-pro
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

On Windows, run `gradlew.bat assembleDebug` instead of `./gradlew assembleDebug`.

The debug APK is generated at:

```
apps/mealpha-pro/android/app/build/outputs/apk/debug/app-debug.apk
```

## Continuous integration

The repository contains two GitHub Actions workflows:

- [Windows build](.github/workflows/build-windows.yml)
- [Android build](.github/workflows/build-android.yml)

Both workflows can be run manually and are configured to validate relevant changes targeting the main branch. Successful runs publish downloadable artifacts on their respective GitHub Actions run pages. A green workflow confirms that the configured build completed; it does not replace device-level testing or end-to-end validation of external integrations such as Dropbox.

## Current limitations and validation notes

- The B Mitra Persian font is not bundled in the current source. The application uses available system font fallbacks until a properly licensed font file is added.
- Dropbox must be configured with a Dropbox application key and a registered OAuth redirect URI before account-level integration can be tested.
- Dropbox authorization, backup upload, restore, and synchronization should be considered unverified until tested against a real Dropbox account.
- Build artifacts are CI outputs. Test the Windows installer on a clean Windows environment and the Android APK on a physical device before treating a release as production-ready.

## Repository

Source code and build workflows are maintained in this repository:

[github.com/apkswap/MeAlphaPro](https://github.com/apkswap/MeAlphaPro)


## Download MeAlpha Pro

Users can choose either supported release line; publishing V2 does not remove or replace the V1 release.

- **Version 1 — V1.0.0:** https://github.com/apkswap/MeAlphaPro/releases/tag/v1.0.0
- **Version 2 — V2.0.0:** https://github.com/apkswap/MeAlphaPro/releases/tag/v2.0.0
- **All releases and future updates:** https://github.com/apkswap/MeAlphaPro/releases
- **Latest overall release:** https://github.com/apkswap/MeAlphaPro/releases/latest

Each release page contains its own Windows installer, Android APK and Linux packages when those builds are available, plus SHA-256 checksums.

The Android package produced by the current release workflow is a debug-signed APK intended for direct installation and evaluation. It is not a Google Play production-signed build. For each public release, the app version in `apps/mealpha-pro/package.json` must be incremented; pushes to `main` that modify the app trigger the Windows and Android release pipeline.

## Product website

- English: https://apkswap.github.io/MeAlphaPro/
- فارسی: https://apkswap.github.io/MeAlphaPro/fa/

The site includes localized product information, structured SoftwareApplication metadata, canonical and alternate language URLs, a sitemap, and robots directives. Google indexing and ranking are not automatic or guaranteed; submit the sitemap and request indexing through Google Search Console after GitHub Pages is enabled.

## Development and release status

[Windows build workflow](https://github.com/apkswap/MeAlphaPro/actions/workflows/build-windows.yml) · [Android build workflow](https://github.com/apkswap/MeAlphaPro/actions/workflows/build-android.yml) · [Release workflow](https://github.com/apkswap/MeAlphaPro/actions/workflows/release.yml) · [Website deployment](https://github.com/apkswap/MeAlphaPro/actions/workflows/deploy-pages.yml)
