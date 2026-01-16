-- Recurrence Columns for Tasks
-- Adding support for recurring tasks (Weekly, Monthly, Custom)

alter table tasks 
add column if not exists is_recurring boolean default false,
add column if not exists recurrence_rule jsonb, -- { frequency: 'daily'|'weekly'|'monthly'|'custom', interval: 1, days: [], end_date: date }
add column if not exists recurrence_next_date timestamptz,
add column if not exists recurrence_end_date date,
add column if not exists parent_recurrence_id uuid references tasks(id) on delete set null;

-- Index for efficient cron querying
create index if not exists tasks_recurrence_idx on tasks(is_recurring, recurrence_next_date) 
where is_recurring = true;
