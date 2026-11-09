# MeyPlan Pro — Next Generation Roadmap

## Product decisions

- Intelligence: local-first, deterministic and explainable. No AI service is required for core analysis.
- Analytics: advanced, with evidence, coverage, trends, goal risk and forecasts where the data supports them.
- Personalization: full custom categories, fields, statuses, workflows, templates and dashboards.
- Notifications: Windows and Android.
- Storage: local data remains the source of truth on each device; cloud sync is optional.
- Identity: Google sign-in and email/password are separate sign-in methods. Drive authorization is a separate, explicit consent even when Google sign-in is used.

## Target architecture

React application shell shared by Electron (Windows) and Capacitor (Android).

Domain modules:
- Productivity: projects, tasks, subtasks, priorities, dependencies and reusable templates.
- Goals: horizons, milestones, progress and risk.
- Habits: schedules, logs, streaks and adherence.
- Calendar and focus: Jalali/Gregorian views, time blocking, recurring plans and focus sessions.
- Finance: budgets, transactions, assets, liabilities, net worth and cash-flow trends.
- Personalization: user-defined categories, custom fields, statuses, workflows, saved filters and dashboard widgets.
- Intelligence: local scoring, strengths/weaknesses, productivity heatmaps, goal risk, time leakage indicators, forecasts and a decision engine.
- Notifications: platform adapters for Windows and Android, with a shared scheduling model.
- Data and sync: IndexedDB persistence, migrations, export/import, operation queue, conflict resolver and provider adapters.

Sync providers:
1. Google Drive appData as an optional personal sync provider.
2. A future self-hosted Iranian backend as an optional provider, not a dependency of local use.
3. Email/password identity should be provided by a configurable backend (planned: self-hosted Supabase); do not pretend Gmail login alone provides app authentication or Drive access.

## Data safety invariants (must not be broken)

1. Never clear or replace the existing IndexedDB database during an upgrade.
2. Every schema change must be an additive, versioned migration with a rollback/recovery plan.
3. Take a local snapshot before migrations, imports and first-time sync.
4. Never overwrite local records merely because a remote snapshot is older, incomplete or malformed.
5. Keep stable record IDs, per-record revisions, updated timestamps and deletion tombstones.
6. Resolve concurrent edits explicitly; do not silently use last-write-wins for financial records.
7. Sign-out disconnects identity only; it must not delete local data or backups.
8. Sync must be idempotent, resumable and safe to retry.
9. Validate snapshot schema and size before applying it.
10. Never store OAuth access tokens or passwords in exported backups or ordinary app settings.

## Delivery phases

### Phase 0 — Foundation and safety
- Document architecture and data invariants.
- Audit existing IndexedDB schema, backup/restore and Google Drive sync.
- Add a typed local intelligence facade over the existing analytics functions.
- Establish regression fixtures for legacy snapshots before changing persistence.

### Phase 1 — Data and sync hardening
- Versioned IndexedDB migrations and pre-migration backups.
- Durable sync operation queue and per-record revisions.
- Safer tombstone merge and conflict detection/resolution UI.
- Drive OAuth consent, token lifecycle and incremental sync.
- Preserve export/import compatibility.

### Phase 2 — Combined identity
- Google sign-in and email/password sign-in.
- Configurable self-hosted Supabase Auth adapter for email/password.
- Explicit Drive permission flow; Google identity does not silently grant Drive access.
- Account linking, sign-out and account recovery without touching local records.

### Phase 3 — Productivity and personalization
- Projects, subtasks, dependencies, recurring tasks and templates.
- Custom categories, fields, statuses, workflows, saved views and dashboard layout.
- Calendar time blocking and richer focus sessions.
- Keep existing records readable and editable throughout.

### Phase 4 — Local Intelligence Center
- Performance overview and coverage-aware Life Score.
- Strength/weakness analysis with evidence and confidence.
- Goal risk, adherence trends, productivity heatmaps and time-estimate calibration.
- Local decision engine with accept/reject/edit actions.
- Weekly/monthly review and forecasts only where sufficient history exists.

### Phase 5 — Finance intelligence
- Budget alerts, recurring transactions and cash-flow summaries.
- Net-worth history and financial health indicators.
- Missing exchange-rate warnings and explicit handling of uncertain financial data.

### Phase 6 — Cross-platform notifications
- Shared reminder model and scheduling rules.
- Windows native notifications through Electron.
- Android local notifications through Capacitor.
- Permission handling, timezone/DST safety, recurrence and deduplication.

### Phase 7 — Release readiness
- Unit and migration tests, sync conflict tests and cross-platform smoke tests.
- Accessibility, Persian RTL, English LTR and Jalali/Gregorian QA.
- Windows installer and Android build validation.
- Offline installation/dependency strategy and release documentation.

## Current repository observations

- The app already uses IndexedDB through `localDb.ts`.
- JSON export/import and a first-generation Google Drive appData sync already exist.
- Rule-based analytics already exist in `analytics.ts`; this roadmap extends and consolidates them rather than replacing them.
- Focus history currently uses localStorage and should be migrated carefully into the main local database in a later additive migration.
- Google Drive currently has a manually-triggered snapshot merge. It is not yet a robust background multi-device sync engine.
- The current repository README says a production build has not been verified in the previous development environment.

## Acceptance criteria

- Existing local records remain present after every upgrade and sign-out.
- Fresh install, upgrade from legacy data, backup restore and sync retry are tested.
- Offline CRUD works on both platforms.
- Drive sync is optional and consent-based.
- Google sign-in and Drive permission are independently represented.
- All intelligence findings include evidence and distinguish measured facts from hypotheses.
- Notification delivery and permissions are tested separately on Windows and Android.

## Implementation status

The first safety-focused implementation slice on `feat/next-gen-local-first-roadmap` now includes:

- A typed local intelligence overview facade over the existing analytics functions.
- Snapshot shape validation before remote data is applied.
- A single IndexedDB read-write transaction for snapshot merge across all entity stores and metadata, so a failed write aborts the merge rather than leaving a partially replaced database.
- A persistent `preSyncBackup` snapshot written atomically with the merge, exposed through `getPreSyncBackup()` for a future recovery UI.
- Tombstone reads and updates performed inside the same IndexedDB read-write transaction as record create/delete; settings and their timestamp are also saved atomically.
- A GitHub Actions workflow for TypeScript validation, web production build, Windows x64 NSIS installer, and Android debug APK artifacts.

Not yet complete or verified:

- The pre-sync backup is stored locally but no user-facing restore screen exists yet.
- Snapshot merge still uses timestamp-based record selection; a full conflict review/resolve interface and per-field financial conflict policy remain future work.
- Background/incremental Drive sync, OAuth token lifecycle, combined Google/email authentication, custom workflow UI, expanded intelligence dashboards, native notification adapters, and finance forecasting remain roadmap work.
- No build result is claimed until the GitHub Actions jobs finish successfully; the local execution environment cannot reach GitHub to clone dependencies or run the build.
