# Code Inventory

## UI Components (`src/components/ui`)
- `window-card.tsx`: [NEW] Main container component with retro border and title bar.
- `metric-card.tsx`: [NEW] Display component for single statistics with delta.
- `nav-item.tsx`: [NEW] Sidebar navigation link with active state animation.
- `empty-state.tsx`: [NEW] Placeholder component for empty lists/pages.
- `button.tsx`: Standard shadcn button (to be updated/used).
- `input.tsx`, `select.tsx`, `tabs.tsx`, `dialog.tsx`: Standard form elements (styled via globals.css).
- `card.tsx`: shadcn base card (mostly replaced by WindowCard for main UI).

## Dashboard Components (`src/components/dashboard`)
- `layout.tsx`: Main dashboard wrapper, Sidebar definition.
- `team-switcher.tsx`: Dropdown for switching active team.

## Admin Components (`src/components/admin`)
- `data-table.tsx`: Reusable table for reference data.

## Key Pages (`src/app`)
- `/quest-board`: [Active] Main Kanban board (currently placeholder).
- `/backlog`: [Active] Quest backlog (currently placeholder).
- `/analytics`: [Active] System stats (currently placeholder with mocked metrics).
- `/admin`: [Active] "The Forge" - System configuration (Statuses, Sizes, Urgencies).

## Utilities (`src/lib`)
- `supabase/client.ts`: Client-side Supabase client.
- `supabase/server.ts`: Server-side Supabase client.
- `types.ts`: TypeScript definitions for DB entities.
- `utils.ts`: Tailwind class merger.
