-- 1. Create Teams Table
create table if not exists teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);

-- 2. Create Team Members Table
create table if not exists team_members (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('owner', 'manager', 'member')),
  joined_at timestamptz default now(),
  unique(team_id, user_id)
);

-- 3. Enable RLS
alter table teams enable row level security;
alter table team_members enable row level security;

-- 4. RLS Policies

-- TEAMS
-- Allow users to view teams they are members of
create policy "Users can view teams they belong to"
  on teams for select
  using (
    exists (
      select 1 from team_members
      where team_members.team_id = teams.id
      and team_members.user_id = auth.uid()
    )
  );

-- Allow users to create teams (they become owner via server action logic, but DB permission needed)
create policy "Authenticated users can create teams"
  on teams for insert
  with check ( auth.role() = 'authenticated' );

-- TEAM MEMBERS
-- Allow users to view their own memberships
create policy "Users can view their own memberships"
  on team_members for select
  using ( user_id = auth.uid() );

-- Allow users to view members of teams they belong to (to see who else is in the team)
create policy "Users can view members of their teams"
  on team_members for select
  using (
    exists (
      select 1 from team_members as my_membership
      where my_membership.team_id = team_members.team_id
      and my_membership.user_id = auth.uid()
    )
  );

-- Allow users to join teams (if valid invitation or open - adjust as needed, for now assume server action handles it with service role)
-- note: usually insert is handled by server action with service_role, but if using client side:
-- create policy "Users can join teams" ...
