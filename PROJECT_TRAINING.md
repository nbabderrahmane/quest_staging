# PROJECT TRAINING: Ship Quest

## 1. System Architecture & Schema

The Ship Quest database is built on Supabase (Postgres) and optimized for high-velocity sprint management.

### Core Tables
*   `teams` & `team_members`: The root of strict multi-tenancy.
*   `quests`: Represents a "Sprint" or "Mission".
*   `tasks`: The atomic unit of work.
*   `statuses`: Kanban columns (Backlog, Active, Done).
*   `sizes`: T-Shirt sizing for gamified XP (S/M/L).
*   `urgencies`: Visual priority signaling.

### The "Golden Rule" of Security (RLS)
**NEVER** write recursive subqueries in RLS policies.
**ALWAYS** use the security definer function: `get_my_teams()`.

```sql
-- CORRECT
using ( team_id = any(get_my_teams()) )

-- INCORRECT (Recursive & Slow)
using ( exists (select 1 from team_members where ...) )
```

---

## 2. Admin Onboarding Flow

When a new team is created, it starts "offline" (empty configuration). The **Cockpit Initializer** forces the Team Owner/Admin to initialize the system before usage.

### Logic
1.  **Dashboard Check**: The layout checks if `statuses` exist for the active team.
2.  **Sentinel Block**: If `count(statuses) == 0`, the dashboard is replaced by the **Cockpit Initializer**.
3.  **Role Gating**:
    *   `OWNER` / `ADMIN`: Sees the `[ INITIALIZE MISSION CONTROL ]` button.
    *   `MEMBER`: Sees a "Standby" message.
4.  **Atomic Seeding**:
    *   Upon click, a Server Action calls `initialize_team_defaults(team_id)`.
    *   This Postgres RPC function inserts defaults for Statuses, Sizes, and Urgencies in a **single transaction**.

---

## 3. Design Language: "Retro-Futuristic Sci-Fi"

Our UI mimics a high-tech console from an 80s/90s Sci-Fi movie (Alien, Blade Runner).

### Core Tenets
*   **Palette**: Deep Void Black (`#0a0a0a`), CRT Green (`#22c55e`), Alert Red (`#ef4444`).
*   **Typography**:
    *   Headers: `Tracking-Widest`, `Uppercase`.
    *   Data/Numbers: `Font-Mono` (Consolas/Monaco).
*   **Juice (Micro-Interactions)**:
    *   Buttons should glow on hover (`shadow-[0_0_15px_rgba(var(--primary),0.5)]`).
    *   Borders should look semi-transparent (`border-white/10`).
    *   Glassmorphism: `backdrop-blur-md` used sparingly for overlays.

### Components
*   `WindowCard`: The container for all major content.
*   `DbDoctor`: The always-present debug overlay.

---

## 4. Commandant Onboarding Path (System Calibration)

Every new team must pass through the **System Calibration** phase, handled by the "Cockpit Initializer".

### Detection Logic
1.  **Sentinel Check**: The Dashboard (`layout.tsx`) checks if the active team has `statuses` defined.
2.  **Blocker**: If count is 0, the main app is blocked, and `CockpitInitializer` is rendered.

### Calibration Protocol
Authorized users (Owner, Admin, Manager) are presented with a form to configure defaults:

1.  **Status Protocols**: Define the column names for the Kanban (e.g., Backlog, To Do).
2.  **Size Matrices**: Define XP values for t-shirt sizes (Tiny, Medium, Large).
3.  **Urgency Levels**: Define weight and color for urgencies.

### Execution
-   **Action**: Clicking "COMMIT TO DATABASE" calls `initializeTeamConfiguration`.
-   **Atomic RPC**: The server calls `initialize_team_configuration(team_id, json_payload)`.
    -   Existing defaults are **cleared**.
    -   New values are inserted in a single transaction.
-   **Unlock**: Upon success, the dashboard unlocks automatically.

---

## 5. RBAC Matrix (Role-Based Access Control)

| Action                        | Owner | Admin | Manager | Member | Analyst |
|-------------------------------|:-----:|:-----:|:-------:|:------:|:-------:|
| View Dashboard                | ✅    | ✅    | ✅      | ✅     | ✅      |
| View Quest Board              | ✅    | ✅    | ✅      | ✅     | ✅      |
| Create Quest                  | ✅    | ✅    | ✅      | ❌     | ❌      |
| Create Task                   | ✅    | ✅    | ✅      | ❌     | ❌      |
| **Assign Task**               | ❌    | ❌    | ✅      | ❌     | ❌      |
| Manage The Forge              | ✅    | ✅    | ❌      | ❌     | ❌      |
| Manage Crew (`/admin/crew`)   | ✅    | ✅    | ❌      | ❌     | ❌      |
| Initialize Team               | ✅    | ✅    | ✅      | ❌     | ❌      |

> **Key Insight**: **Managers execute missions** (assign tasks). **Owners/Admins configure the system** (Forge, Crew).

---

## 6. Dynamic Data Architecture

### Golden Rules
1.  **No Hardcoded IDs**: All object references use UUIDs from the database. Never hardcode strings like `'owner'` without context.
2.  **Session-Based Team Context**: The `selected_team` cookie (or URL parameter) is the source of truth for `team_id`.
3.  **Role Queries**: Always fetch role dynamically:
    ```typescript
    const { data } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .single()
    ```

### Supabase Join Syntax
Use named relations based on Foreign Key constraints:
```typescript
// Tasks with all relations
.select(`
    *,
    status:statuses(id, name, category),
    size:sizes(id, name, xp_points),
    urgency:urgencies(id, name, color, weight)
`)

// Quests with lifecycle status
.select('*, status:quest_statuses(*)')
```

### Schema Refresh
If PostgREST cache is stale after FK changes, refresh via SQL:
```sql
NOTIFY pgrst, 'reload schema';
```

---

## 7. Ship Quest Doctrine

### Core Principles
1. **UUID-Only Access**: Never query by name, always use UUIDs
2. **Dynamic Team Context**: Always inject `team_id` from cookie or parameter
3. **Centralized Role Service**: Use `getRoleContext()` for all permission checks

### Role Service API
```typescript
import { getRoleContext } from '@/lib/role-service'

const ctx = await getRoleContext()
if (ctx?.canManageForge) {
    // Show admin UI
}
if (ctx?.canAssignTasks) {
    // Show assign button (managers only)
}
```

### Unified CRUD Payload
All Forge create functions accept:
- `name` (required)
- `team_id` (injected)
- `sort_order` (optional, default 0)
- `category` or `color` (type-specific)

### Rich Joins
```typescript
// Tasks with all relations
.select(`
    *,
    status:statuses(id, name, category),
    size:sizes(id, name, xp_points),
    urgency:urgencies(id, name, color, weight),
    quest:quests(id, name)
`)
```


