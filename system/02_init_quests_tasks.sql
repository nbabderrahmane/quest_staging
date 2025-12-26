-- 1. Statuses Table
create table if not exists statuses (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  name text not null,
  category text not null check (category in ('backlog', 'active', 'done', 'archived')),
  sort_order int not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2. Sizes Table (XP)
create table if not exists sizes (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  name text not null,
  xp_points int not null default 0,
  sort_order int not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. Urgencies Table
create table if not exists urgencies (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  name text not null,
  weight int not null default 0,
  color text not null default 'blue',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 4. Quests Table
create table if not exists quests (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  name text not null,
  description text,
  is_active boolean default false,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- 5. Tasks Table
create table if not exists tasks (
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
