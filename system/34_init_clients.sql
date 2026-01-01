-- Init Clients
-- Enable management of clients/customers entity

-- 1. Create Clients Table
create table if not exists public.clients (
    id uuid default gen_random_uuid() primary key,
    team_id uuid references public.teams(id) on delete cascade not null,
    name text not null,
    logo_url text,
    created_at timestamptz default now()
);

-- 2. Enable RLS
alter table public.clients enable row level security;

-- 3. RLS Policies
-- Team members can view clients
create policy "Team members can view clients"
    on public.clients for select
    using ( exists (
        select 1 from public.team_members
        where team_members.team_id = clients.team_id
        and team_members.user_id = auth.uid()
    ));

-- Owners, Admins, Managers can manage clients
create policy "Owners, Admins, Managers can manage clients"
    on public.clients for all
    using ( exists (
        select 1 from public.team_members
        where team_members.team_id = clients.team_id
        and team_members.user_id = auth.uid()
        and team_members.role in ('owner', 'admin', 'manager')
    ));

-- 4. Update Tasks Table
alter table public.tasks add column if not exists client_id uuid references public.clients(id) on delete set null;

-- 5. Optimization Indices
create index if not exists idx_clients_team on public.clients(team_id);
create index if not exists idx_tasks_client on public.tasks(client_id);
