# MeAlpha Pro

A local-first personal planning and life-management application for goals, tasks, habits, focus sessions, personal finance, and performance insights.

## Current features

- Dashboard and activity overview
- Goals, tasks, habits, and focus-session tracking
- Transactions, assets, liabilities, and net-worth tracking
- Data-driven insights based on recorded activity
- Custom workspaces with user-defined fields and records
- Persian (RTL) and English (LTR) interface
- Jalali and Gregorian date formatting
- Local IndexedDB persistence; normal data reads and writes do not require an internet connection.

## UI changes in this branch

- The compact label beside the sidebar mark now displays the user's display name or “MeAlpha”; “Pro” has been removed from that specific location. The product/package name remains MeAlpha Pro in application metadata and packaging configuration.
- The backdrop now uses layered violet/cyan ambient lighting and a perspective grid for a 3D visual effect.
- Panels use a dark glass-style visual treatment.
- These changes are in the shared UI layer and are included when the web, desktop, and Android applications are built from this source.

## Persian font

B Mitra is not bundled in the current source. Persian text currently falls back to system fonts such as Tahoma and Segoe UI. To ship B Mitra offline, add a font file that is licensed for use and redistribution, register it with CSS @font-face, and rebuild the app. B Mitra should not be expected in the current installers.

## Requirements

- Node.js 22.14.0 (the version used by the CI workflows)
- npm
- Android builds: Java 21 and Android SDK
- Windows installer builds: Windows environment and Electron Builder dependencies

## Install dependencies and run in development

From the repository root:

~~~bash
npm install
npm run dev
~~~

## Type-check and build the web application

~~~bash
npm run build
~~~

Or build only the application workspace:

~~~bash
npm run build --workspace apps/mealpha-pro
~~~

## Build the Windows installer

From the repository root:

~~~bash
npm run desktop:build
~~~

The installer is written to:

apps/mealpha-pro/release/

## Build Android

On the first run, create the Android project before syncing:

~~~bash
npm install
npm run build --workspace apps/mealpha-pro
cd apps/mealpha-pro
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
~~~

On Windows, run gradlew.bat assembleDebug. The debug APK is generated at:

apps/mealpha-pro/android/app/build/outputs/apk/debug/app-debug.apk

The repository includes GitHub Actions workflows for automated builds:
- .github/workflows/build-windows.yml
- .github/workflows/build-android.yml

After a workflow succeeds, download its artifact from the corresponding GitHub Actions run.

## Local data and synchronization

Operational data is stored in local IndexedDB, and local data reads/writes do not depend on a cloud service. Multi-device synchronization is not documented as a complete, validated feature in this branch. Until an independent sync solution is implemented and tested, use the backup/restore capability available in the app when moving data, and create a backup before restoring.

## Documentation status

This README describes the committed state of feat/mealpha-3d-branding. Bundling B Mitra and final validation of distributable installers are separate tasks and must not be considered complete until implemented and tested.
