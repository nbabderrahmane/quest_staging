-- Migration: Eisenhower Performance Indexes
-- Description: Optimizes queries for My Work, Pipeline, and Deadline alerts.

-- Index for My Work (Tasks assigned to me, filtered by status/wait)
CREATE INDEX IF NOT EXISTS idx_tasks_team_assigned_status ON public.tasks (team_id, assigned_to, status_id);

-- Index for Deadline-based Urgency calculations
CREATE INDEX IF NOT EXISTS idx_tasks_team_deadline ON public.tasks (team_id, deadline_at) WHERE deadline_at IS NOT NULL;

-- Index for Waiting tasks (needs_info)
CREATE INDEX IF NOT EXISTS idx_tasks_team_needs_info ON public.tasks (team_id, needs_info) WHERE needs_info = true;

-- Optional: Index for created_at/updated_at tiebreakers
CREATE INDEX IF NOT EXISTS idx_tasks_team_updated ON public.tasks (team_id, updated_at DESC);
