# Code Inventory

> Last updated: 2026-01-14

## Core Application Structure

### Entry Points
| Path | Purpose |
|---|---|
| `/login` | Staff authentication |
| `/portal/login` | Client portal authentication |
| `/demo` | Guided demo mode |
| `/quest-board` | Main staff dashboard |
| `/admin/*` | Admin management pages |
| `/portal/*` | Client portal |
| `/api/v1/tasks` | RESTful API |
| `/api/health` | Health check endpoint |

### Key Modules
| Module | Location | Purpose |
|---|---|---|
| Server Actions | `src/app/actions/`, `src/app/(portal)/actions.ts` | Business logic |
| API Routes | `src/app/api/v1/` | External API layer |
| Role Service | `src/lib/role-service.ts` | Centralized RBAC |
| Admin Client | `src/lib/supabase/admin.ts` | Service role DB access |
| Auth Utils | `src/lib/auth-utils.ts`, `src/lib/auth/api-key.ts` | Authentication helpers |
| Logger | `src/lib/logger.ts` | Structured JSON logging |
| Error Boundary | `src/components/error-boundary.tsx` | React error catching |

### Component Library
| Path | Contents |
|---|---|
| `src/components/ui/` | Reusable UI primitives (shadcn/ui based) |
| `src/components/dashboard/` | Staff dashboard components |
| `src/components/dashboard/calendar-view.tsx` | Reusable Calendar/Timeline component |
| `src/components/admin/` | Admin page components |
| `src/components/demo/` | Demo mode components |

---

## Removed Components

### Remote MCP Server (removed 2026-01-14)
Previously located at `server/mcp-remote/`. Will be rebuilt separately.
