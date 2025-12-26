# Project Logs - Ship Quest

## [2025-12-25] Phase 0: Initialization
- Initialized Next.js 14+ project (App Router, TypeScript, TailwindCSS).
- Created System Vault (`system/` directory).
- Installed core dependencies (`shadcn-ui`, `dnd-kit`, `framer-motion`, `lucide-react`, `recharts`, `tanstack-query`).
- Configured shadcn/ui with **Neutral** base color (fallback from Slate for reliability).
- Cleaned up failed initial installation and successfully re-initialized.

## [2025-12-25] Phase 2: System Configuration & UI Overhaul
- **System Admin**: Verified database schema and seeded initial data. Created Admin page functionality for Statuses, Sizes, and Urgencies.
- **Navigation Fixes**: Resolved 404 errors by creating placeholder pages for `/quest-board`, `/backlog`, and `/analytics`. Updated Sidebar to point to correct routes.
- **UI/UX Overhaul (Retro-Futuristic)**:
  - **Design System**: Implemented "Deep Space / Retro" dark theme in `globals.css` with neon accents (indigo/cyan) and boxy UI variables.
  - **Components**: Created reusable retro components (`WindowCard`, `MetricCard`, `NavItem`).
  - **Refactoring**: Updated Layout and Admin pages.

## [2025-12-25] Phase 3: Tasks + Quest Board
- **Database**: Defined `quests` and `tasks` schema with RLS policies in `system/schema.sql`.
- **Backend**: Implemented Server Actions for Quest and Task CRUD operations (`createQuest`, `createTask`, `updateTaskStatus`).
- **Frontend**:
  - **Quest Board**: Built Drag-and-Drop Kanban board using `@dnd-kit`.
  - **Components**: Created `TaskCard` (with XP/Urgency indicators) and `CreateTaskDialog`.
  - **Metrics**: Added Total vs Completed XP tracking to the board header.
- **Game Loop**: Established the flow of "Initialize Quest" -> "Add Tasks" -> "Complete Tasks" -> "XP Profit".
