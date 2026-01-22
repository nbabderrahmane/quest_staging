-- Migration 106: Add inbox read status tracking
-- This allows tracking which notifications have been read by each user

-- Create inbox_read_status table
create table if not exists public.inbox_read_status (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    team_id uuid not null references public.teams(id) on delete cascade,
    notification_type text not null, -- 'assignment', 'comment', 'deadline', 'mention'
    reference_id uuid not null, -- task_id or comment_id
    is_read boolean not null default false,
    read_at timestamptz,
    created_at timestamptz not null default now(),
    unique(user_id, team_id, notification_type, reference_id)
);

-- Add RLS policies
alter table public.inbox_read_status enable row level security;

-- Users can only see their own read status
create policy "Users can view own read status"
    on public.inbox_read_status for select
    using (auth.uid() = user_id);

-- Users can insert their own read status
create policy "Users can insert own read status"
    on public.inbox_read_status for insert
    with check (auth.uid() = user_id);

-- Users can update their own read status
create policy "Users can update own read status"
    on public.inbox_read_status for update
    using (auth.uid() = user_id);

-- Create index for performance
create index if not exists idx_inbox_read_status_user_team 
    on public.inbox_read_status(user_id, team_id, is_read);

create index if not exists idx_inbox_read_status_reference 
    on public.inbox_read_status(reference_id, notification_type);
