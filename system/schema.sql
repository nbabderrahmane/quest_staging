-- Teams Table
create table if not exists teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);

-- Team Members Table
create table if not exists team_members (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('owner', 'manager', 'member')),
  joined_at timestamptz default now(),
  unique(team_id, user_id)
);

-- Enable RLS for Teams
alter table teams enable row level security;
alter table team_members enable row level security;

-- Policies for Teams
create policy "Users can view teams they belong to"
  on teams for select
  using (
    exists (
      select 1 from team_members
      where team_members.team_id = teams.id
      and team_members.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create teams"
  on teams for insert
  with check ( auth.role() = 'authenticated' );

-- Policies for Team Members
create policy "Users can view their own memberships"
  on team_members for select
  using ( user_id = auth.uid() );

create policy "Users can view members of their teams"
  on team_members for select
  using (
    exists (
      select 1 from team_members as my_membership
      where my_membership.team_id = team_members.team_id
      and my_membership.user_id = auth.uid()
    )
  );

-- Statuses Table
create table statuses (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  name text not null,
  category text not null check (category in ('backlog', 'active', 'done', 'archived')),
  sort_order int not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Sizes Table (XP)
create table sizes (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  name text not null,
  xp_points int not null default 0,
  sort_order int not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Urgencies Table
create table urgencies (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  name text not null,
  weight int not null default 0,
  color text not null default 'blue',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Quests Table
create table quests (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  name text not null,
  description text,
  is_active boolean default false,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- Tasks Table
create table tasks (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  quest_id uuid references quests(id) on delete cascade not null,
  title text not null,
  description text,
  status_id uuid references statuses(id) on delete set null,
  size_id uuid references sizes(id) on delete set null,
  urgency_id uuid references urgencies(id) on delete set null,
  assignee_id uuid references auth.users(id) on delete set null,
  xp_points int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table statuses enable row level security;
alter table sizes enable row level security;
alter table urgencies enable row level security;
alter table quests enable row level security;
alter table tasks enable row level security;

-- RLS Policies (Team Scoped)

-- Statuses
create policy "Team members can view statuses"
  on statuses for select
  using ( team_id in (select team_id from team_members where user_id = auth.uid()) );

create policy "Team admins can manage statuses"
  on statuses for all
  using ( team_id in (select team_id from team_members where user_id = auth.uid() and role in ('owner', 'manager')) );

-- Sizes
create policy "Team members can view sizes"
  on sizes for select
  using ( team_id in (select team_id from team_members where user_id = auth.uid()) );

create policy "Team admins can manage sizes"
  on sizes for all
  using ( team_id in (select team_id from team_members where user_id = auth.uid() and role in ('owner', 'manager')) );

-- Urgencies
create policy "Team members can view urgencies"
  on urgencies for select
  using ( team_id in (select team_id from team_members where user_id = auth.uid()) );

create policy "Team admins can manage urgencies"
  on urgencies for all
  using ( team_id in (select team_id from team_members where user_id = auth.uid() and role in ('owner', 'manager')) );

-- Quests
create policy "Team members can view quests"
  on quests for select
  using ( team_id in (select team_id from team_members where user_id = auth.uid()) );

create policy "Team members can manage quests"
  on quests for all
  using ( team_id in (select team_id from team_members where user_id = auth.uid()) );

-- Tasks
create policy "Team members can view tasks"
  on tasks for select
  using ( team_id in (select team_id from team_members where user_id = auth.uid()) );

create policy "Team members can manage tasks"
  on tasks for all
  using ( team_id in (select team_id from team_members where user_id = auth.uid()) );
