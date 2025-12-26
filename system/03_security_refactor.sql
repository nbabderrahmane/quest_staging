-- 1. Create a stable function to get current user's team IDs
create or replace function get_my_teams()
returns uuid[]
language sql
security definer
set search_path = public
stable
as $$
  select array_agg(team_id)
  from team_members
  where user_id = auth.uid();
$$;

-- 2. Update RLS Policies to use the central function

-- Statuses
drop policy if exists "Team members can view statuses" on statuses;
create policy "Team members can view statuses"
  on statuses for select
  using ( team_id = any(get_my_teams()) );

drop policy if exists "Team admins can manage statuses" on statuses;
create policy "Team admins can manage statuses"
  on statuses for all
  using ( team_id = any(get_my_teams()) and exists (
    select 1 from team_members
    where user_id = auth.uid()
    and team_id = statuses.team_id
    and role in ('owner', 'manager')
  ));

-- Sizes
drop policy if exists "Team members can view sizes" on sizes;
create policy "Team members can view sizes"
  on sizes for select
  using ( team_id = any(get_my_teams()) );

drop policy if exists "Team admins can manage sizes" on sizes;
create policy "Team admins can manage sizes"
  on sizes for all
  using ( team_id = any(get_my_teams()) and exists (
    select 1 from team_members
    where user_id = auth.uid()
    and team_id = sizes.team_id
    and role in ('owner', 'manager')
  ));

-- Urgencies
drop policy if exists "Team members can view urgencies" on urgencies;
create policy "Team members can view urgencies"
  on urgencies for select
  using ( team_id = any(get_my_teams()) );

drop policy if exists "Team admins can manage urgencies" on urgencies;
create policy "Team admins can manage urgencies"
  on urgencies for all
  using ( team_id = any(get_my_teams()) and exists (
    select 1 from team_members
    where user_id = auth.uid()
    and team_id = urgencies.team_id
    and role in ('owner', 'manager')
  ));

-- Quests
drop policy if exists "Team members can view quests" on quests;
create policy "Team members can view quests"
  on quests for select
  using ( team_id = any(get_my_teams()) );

drop policy if exists "Team members can manage quests" on quests;
create policy "Team members can manage quests"
  on quests for all
  using ( team_id = any(get_my_teams()) );

-- Tasks
drop policy if exists "Team members can view tasks" on tasks;
create policy "Team members can view tasks"
  on tasks for select
  using ( team_id = any(get_my_teams()) );

drop policy if exists "Team members can manage tasks" on tasks;
create policy "Team members can manage tasks"
  on tasks for all
  using ( team_id = any(get_my_teams()) );
