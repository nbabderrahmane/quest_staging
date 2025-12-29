# System Architecture - Ship Quest

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + CSS Variables
- **UI Components**: shadcn/ui (base), Custom "Retro-Futuristic" components
- **Motion**: framer-motion
- **State Management**: React Query (Server State), Local State (React hooks)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth

## Design System (Retro-Futuristic)
- **Theme**: "Deep Space" Dark Mode (Default)
  - Background: `oklch(0.12 0.03 260)` (Deep Blue/Black)
  - Foreground: `oklch(0.9 0.02 260)` (Crisp Blue-White)
  - Primary: `oklch(0.6 0.2 280)` (Neon Indigo)
- **Core Principles**:
  - **Boxy UI**: Sharp corners (`rounded-none` or very small radius).
  - **Chrome**: Visible borders, title bars on cards.
  - **Typography**: Sans-serif for UI, Monospace for data/metrics.
  - **Motion**: Subtle, quick entry animations (opacity/slide).
  - **Micro-interactions**: Hover flows, active state indicators.

## Directory Structure
- `src/app`: Routes and Pages (App Router).
- `src/components`:
  - `ui`: Base components (`WindowCard`, `MetricCard`, `Button`, etc.).
  - `dashboard`: Layout specific components (`Sidebar`, `TeamSwitcher`).
  - `admin`: Admin specific components (`DataTable`).
- `src/lib`: Utilities (`supabase`, `utils`, `types`).
- `system`: Documentation vault.

## Data Flow
- **Server Components**: Fetch initial data.
- **Client Components**: Handle interactivity and mutations (Server Actions).
- **Supabase**: Direct DB access via RLS policies.

## Security Architecture
- **Team Isolation**: Strict "Zero-Leak" Policy.
  - **RLS**: All operational tables (`tasks`, `quests`, `team_members`, `projects`, etc.) enforce `team_id` checks at the database row level.
  - **Profile Privacy**: Profiles are only visible to users sharing at least one team with the target profile.
  - **Server Actions**: All mutations explicitly verify `team_id` and role context (`getRoleContext`) before execution.
- **Middleware**: Edge-compatible session management with strict environment variable validation.
