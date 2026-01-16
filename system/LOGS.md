# System Logs

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
