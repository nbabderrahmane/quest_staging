# System Logs

## 2026-01-27: Bug Fixes & Refinements
- **Feature**: Sprint-based Reporting
  - Added "By Sprint" mode to Mission Reporting page.
  - Implemented `getQuestsForReporting` and updated `exportAnalyticsToCSV` to filter by Quest ID.
- **Fix**: Notification Logic
  - Modified Inbox Feed to show "Done" task deadline alerts (marked as read and resolved).
  - Implemented privacy filtering: Non-privileged users see only their assigned deadline alerts.
- **Fix**: Recurring Tasks
  - Improved recurrence engine to find "Next Future Sprint" if current date falls in a gap.
- **Refactoring**: Updated `src/app/(dashboard)/inbox/actions.ts` to include `isDone` metadata for improved frontend rendering.
- **Fix**: Resolved build type error in `admin/reporting/page.tsx` by adding explicit return type to `getQuestsForReporting`.
- **Infrastructure**: Excluded `tests/` and `playwright.config.ts` from `tsconfig.json` and `.gitignore` to prevent Vercel deployment failures.
- **Fix**: Recurrence - Added `vercel.json` to enable Cron Jobs. Forced recurring tasks to 'Todo' status.
- **Docs**: Created `RECURRENCE_GUIDE.md` explaining the recurrence engine.
- **Fix**: Notification Bell now fetches the same data as the Inbox feed (Assignments + Deadline Alerts) instead of just the raw `notifications` table.
- **Visual**: Added "Recurrent" badge to Task Cards in the Quest Board (`task-card.tsx`).

## 2026-01-22: Phase 2 Observability
- **Created**: `/api/health` endpoint with database connectivity check
- **Created**: `ErrorBoundary` component (`src/components/error-boundary.tsx`)
  - Catches React rendering errors
  - Logs to structured logger
  - Shows user-friendly error UI
- **Migrated**: `login/actions.ts` from console.log to structured logger
- **Note**: Existing structured logger at `src/lib/logger.ts` was already in place
- **Verification**: Build passes (35 routes including /api/health)

## 2026-01-22: Phase 1 Security Hygiene
- **Created**: `.env.example` documenting all required and optional environment variables
- **Fixed**: Hardcoded test credentials in `tests/regression.spec.ts` and `tests/recurrence.spec.ts`
  - Now use `process.env.TEST_USER_EMAIL` and `process.env.TEST_USER_PASSWORD`
- **Audited**: SERVICE_ROLE usage confirmed safe (confined to factories and protected admin actions)
- **Updated**: `SECURITY_STATUS.md` with Phase 1 audit results
- **Verification**: Build passes, no regressions

## 2026-01-22: Phase 0 Emergency Build Fix
- **Fixed**: Build failure caused by `createClient` function name collision in `actions.ts`
  - Renamed `createClient` → `createNewClient` in `src/app/(dashboard)/admin/clients/actions.ts`
  - Updated import in `src/components/admin/clients/client-dialog.tsx`
  - Removed unused `updateClient` import
- **Issue Origin**: Client-Department feature implementation created function with same name as supabase import
- **Verification**: `npm run build` succeeds (34 routes generated)

## 2026-01-14: Production Hardening Review
- **Removed**: `server/mcp-remote` (will be rebuilt separately)
- **Fixed**: Build failure caused by MCP SDK type resolution
- **Fixed**: React hooks violations in `tour-overlay.tsx` and `team-switcher.tsx`
- **Fixed**: RUNBOOK.md documentation (was corrupted with debug output)
- **Refactored**: API routes to use centralized `createAdminClient`
- **Fixed**: Multiple lint errors (371 → 303 remaining)
  - Removed unused imports across dashboard components
  - Fixed `any` types in key files (safe-action, database.types, api-key-generator)
  - Fixed empty interface in textarea.tsx
- **Verification**: Build passes, core functionality preserved

## 2026-01-08: Remote MCP Server Implementation
- **Added**: `server/mcp-remote` standalone Node.js application.
- **Architecture**: Express-based server implementing MCP over SSE.
- **Features**:
  - Bearer Token Authentication.
  - Per-connection session management.
  - Proxy to Ship Quest `/api/v1` endpoints.
  - Read-Only mode support.
- **Refactoring**: Switched from high-level `McpServer` helper to low-level `Server` class for compatibility with `@modelcontextprotocol/sdk` v0.6.0.
