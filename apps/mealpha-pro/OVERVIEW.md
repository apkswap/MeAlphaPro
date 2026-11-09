# MeAlpha Pro — Application Overview

MeAlpha Pro is a local-first personal planning and life-management application.

## Product areas
- Dashboard and activity overview
- Goals, tasks, habits, and focus sessions
- Personal finance: transactions, assets, liabilities, and net worth
- Rule/data-driven insights based on user-recorded information
- Custom workspaces with configurable fields and records
- Persian RTL and English LTR interface
- Jalali and Gregorian date formatting

## Persistence
The current data layer uses browser IndexedDB. Normal local reads and writes do not require a network connection. Do not describe multi-device sync as production-ready for this branch; it requires a separately implemented and validated sync provider.

## Visual identity in the current branding branch
- Sidebar brand label uses the user's display name, falling back to “MeAlpha”; the “Pro” suffix is omitted only from the compact label beside the mark.
- Product metadata and desktop packaging retain the product name “MeAlpha Pro”.
- The shared stylesheet provides a dark layered background, violet/cyan ambient lighting, a perspective grid, and glass-style panels.

## Typography
B Mitra is not yet included. Persian typography currently relies on system fallbacks (Tahoma/Segoe UI). Bundle B Mitra only after a properly licensed font file is provided.

## Build targets
- Web: Vite
- Windows: Electron + electron-builder (NSIS x64)
- Android: Capacitor Android project
