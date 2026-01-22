-- Inbox Read Status Table
-- Tracks which items (tasks, comments, etc.) have been marked as read by a user
create table if not exists inbox_read_status (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  resource_type text not null check (resource_type in ('task', 'ticket')),
  resource_id uuid not null,
  last_read_at timestamptz default now(),
  is_read boolean default true,
  created_at timestamptz default now(),
  unique(user_id, resource_id)
);

-- Add missing columns if they don't exist (for existing tables)
do $$
begin
  if not exists (select from information_schema.columns where table_name = 'inbox_read_status' and column_name = 'resource_type') then
    alter table inbox_read_status add column resource_type text check (resource_type in ('task', 'ticket'));
  end if;

  if not exists (select from information_schema.columns where table_name = 'inbox_read_status' and column_name = 'resource_id') then
    alter table inbox_read_status add column resource_id uuid;
  end if;
end $$;

-- RLS
alter table inbox_read_status enable row level security;

do $$
begin
  if not exists (
    select from pg_policies 
    where policyname = 'Users can manage their own read status' 
    and tablename = 'inbox_read_status'
  ) then
    create policy "Users can manage their own read status"
      on inbox_read_status for all
      using ( user_id = auth.uid() );
  end if;
end $$;

-- Indexes for performance
create index if not exists idx_inbox_read_status_user_team on inbox_read_status(user_id, team_id);
create index if not exists idx_inbox_read_status_resource on inbox_read_status(resource_id);
