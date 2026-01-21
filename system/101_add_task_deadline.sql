-- Migration: Add deadline_at to tasks
alter table tasks add column if not exists deadline_at timestamptz;

-- Refresh schema cache if needed (Supabase does this automatically)
comment on column tasks.deadline_at is 'The deadline date and time for the task.';
