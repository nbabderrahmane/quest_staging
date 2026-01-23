-- 109_sub_teams.sql
-- Purpose: Introduce Sub-Teams (Squads) layer under Organizations (Teams).

-- 1. Create Sub-Teams Table
create table if not exists public.sub_teams (
    id uuid default gen_random_uuid() primary key,
    org_id uuid references public.teams(id) on delete cascade not null,
    name text not null,
    created_at timestamptz default now()
);

-- 2. Create Sub-Team Members Table (Squad Membership)
create table if not exists public.sub_team_members (
    id uuid default gen_random_uuid() primary key,
    sub_team_id uuid references public.sub_teams(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    role text default 'member', -- Optional: 'lead', 'member'
    created_at timestamptz default now(),
    unique(sub_team_id, user_id)
);

-- 3. Enable RLS
alter table public.sub_teams enable row level security;
alter table public.sub_team_members enable row level security;

-- 4. RLS Policies

-- Sub-Teams: Visible to everyone in the Organization
create policy "Organization members can view sub_teams"
    on public.sub_teams for select
    using ( exists (
        select 1 from public.team_members
        where team_members.team_id = sub_teams.org_id
        and team_members.user_id = auth.uid()
    ));

create policy "Organization admins can manage sub_teams"
    on public.sub_teams for all
    using ( exists (
        select 1 from public.team_members
        where team_members.team_id = sub_teams.org_id
        and team_members.user_id = auth.uid()
        and team_members.role in ('owner', 'admin', 'manager')
    ));

-- Sub-Team Members: Visible to Organization members
create policy "Organization members can view sub_team_members"
    on public.sub_team_members for select
    using ( exists (
        select 1 from public.sub_teams st
        join public.team_members tm on tm.team_id = st.org_id
        where st.id = sub_team_members.sub_team_id
        and tm.user_id = auth.uid()
    ));

create policy "Organization admins can manage sub_team_members"
    on public.sub_team_members for all
    using ( exists (
        select 1 from public.sub_teams st
        join public.team_members tm on tm.team_id = st.org_id
        where st.id = sub_team_members.sub_team_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'manager')
    ));

-- 5. Update Tasks Table
alter table public.tasks add column if not exists sub_team_id uuid references public.sub_teams(id) on delete set null;

create index if not exists idx_tasks_sub_team on public.tasks(sub_team_id);

-- 6. Backfill / Migration Strategy
-- Create a 'General' sub-team for every existing Organization
do $$
declare
    t record;
    new_sub_team_id uuid;
begin
    for t in select id from public.teams loop
        -- Check if 'General' exists
        if not exists (select 1 from public.sub_teams where org_id = t.id and name = 'General') then
            insert into public.sub_teams (org_id, name)
            values (t.id, 'General')
            returning id into new_sub_team_id;

            -- Optional: Add all org members to this General squad?
            -- Or just leave empty assignment? Let's leave strictly 'General' existence.
            -- Linking existing tasks to 'General' to verify visibility.
            update public.tasks
            set sub_team_id = new_sub_team_id
            where team_id = t.id and sub_team_id is null;
        end if;
    end loop;
end $$;
