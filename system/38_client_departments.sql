-- Client Departments Mapping
-- Enable mapping clients to specific departments

-- 1. Create Join Table
create table if not exists public.client_departments (
    id uuid default gen_random_uuid() primary key,
    client_id uuid references public.clients(id) on delete cascade not null,
    department_id uuid references public.departments(id) on delete cascade not null,
    created_at timestamptz default now(),
    unique(client_id, department_id)
);

-- 2. Enable RLS
alter table public.client_departments enable row level security;

-- 3. RLS Policies

-- Public/Authenticated users can view?
-- Team members can view mappings for their team's clients
create policy "Team members can view client departments"
    on public.client_departments for select
    using ( exists (
        select 1 from public.clients
        join public.team_members on team_members.team_id = clients.team_id
        where clients.id = client_departments.client_id
        and team_members.user_id = auth.uid()
    ));

-- Client members can view their own client's departments
create policy "Client members can view own departments"
    on public.client_departments for select
    using ( exists (
        select 1 from public.client_members
        where client_members.client_id = client_departments.client_id
        and client_members.user_id = auth.uid()
    ));

-- Owners, Admins, Managers can manage
create policy "Staff can manage client departments"
    on public.client_departments for all
    using ( exists (
        select 1 from public.clients
        join public.team_members on team_members.team_id = clients.team_id
        where clients.id = client_departments.client_id
        and team_members.user_id = auth.uid()
        and team_members.role in ('owner', 'admin', 'manager')
    ));

-- 4. Indices
create index if not exists idx_client_depts_client on public.client_departments(client_id);
create index if not exists idx_client_depts_dept on public.client_departments(department_id);
