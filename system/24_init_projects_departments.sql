-- Init Projects and Departments
-- Enable easier management of these entities

-- 1. Create Projects Table
create table if not exists public.projects (
    id uuid default gen_random_uuid() primary key,
    team_id uuid references public.teams(id) on delete cascade not null,
    name text not null,
    description text,
    color text default '#64748b', -- Slate-500
    created_at timestamptz default now()
);

-- 2. Create Departments Table
create table if not exists public.departments (
    id uuid default gen_random_uuid() primary key,
    team_id uuid references public.teams(id) on delete cascade not null,
    name text not null,
    icon text default 'Building2',
    created_at timestamptz default now()
);

-- 3. Enable RLS
alter table public.projects enable row level security;
alter table public.departments enable row level security;

-- 4. RLS Policies (Same as Quests/Tasks)
-- Projects
create policy "Team members can view projects"
    on public.projects for select
    using ( exists (
        select 1 from public.team_members
        where team_members.team_id = projects.team_id
        and team_members.user_id = auth.uid()
    ));

create policy "Owners, Admins, Managers can manage projects"
    on public.projects for all
    using ( exists (
        select 1 from public.team_members
        where team_members.team_id = projects.team_id
        and team_members.user_id = auth.uid()
        and team_members.role in ('owner', 'admin', 'manager')
    ));

-- Departments
create policy "Team members can view departments"
    on public.departments for select
    using ( exists (
        select 1 from public.team_members
        where team_members.team_id = departments.team_id
        and team_members.user_id = auth.uid()
    ));

create policy "Owners, Admins, Managers can manage departments"
    on public.departments for all
    using ( exists (
        select 1 from public.team_members
        where team_members.team_id = departments.team_id
        and team_members.user_id = auth.uid()
        and team_members.role in ('owner', 'admin', 'manager')
    ));

-- 5. Update Tasks Table
alter table public.tasks add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.tasks add column if not exists department_id uuid references public.departments(id) on delete set null;

-- Optimization Indices
create index if not exists idx_projects_team on public.projects(team_id);
create index if not exists idx_departments_team on public.departments(team_id);
create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_tasks_department on public.tasks(department_id);
