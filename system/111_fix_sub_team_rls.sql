-- 111_fix_sub_team_rls.sql
-- Purpose: Fix squad creation, management, and break RLS recursion.

-- 1. Schema Liaison: Add squad association to Quests
alter table public.quests add column if not exists sub_team_id uuid references public.sub_teams(id) on delete set null;
create index if not exists idx_quests_sub_team on public.quests(sub_team_id);

-- 2. Denormalization for RLS speed and recursion break
-- We add org_id to sub_team_members so its policy doesn't have to join sub_teams (which triggers recursion)
alter table public.sub_team_members add column if not exists org_id uuid references public.teams(id) on delete cascade;

-- Backfill org_id from sub_teams
update public.sub_team_members
set org_id = st.org_id
from public.sub_teams st
where st.id = public.sub_team_members.sub_team_id
and public.sub_team_members.org_id is null;

-- 3. Security Reset: Drop existing specific policies to ensure clean state
drop policy if exists "Organization admins can manage sub_teams" on public.sub_teams;
drop policy if exists "Organization admins can manage sub_team_members" on public.sub_team_members;
drop policy if exists "Organization members can view sub_teams" on public.sub_teams;
drop policy if exists "Organization members can view sub_team_members" on public.sub_team_members;
drop policy if exists "Strict: View Sub-Teams" on public.sub_teams;

-- 4. Sub-Teams (Squads) Policies

-- View: Any org member can see the squad list
create policy "Organization members can view sub_teams"
    on public.sub_teams for select
    using ( exists (
        select 1 from public.team_members
        where team_members.team_id = sub_teams.org_id
        and team_members.user_id = auth.uid()
    ));

-- Manage: Admins, Owners, and Managers
create policy "Organization admins can manage sub_teams"
    on public.sub_teams for all
    using ( exists (
        select 1 from public.team_members
        where team_members.team_id = sub_teams.org_id
        and team_members.user_id = auth.uid()
        and team_members.role in ('owner', 'admin', 'manager')
    ))
    with check ( exists (
        select 1 from public.team_members
        where team_members.team_id = sub_teams.org_id
        and team_members.user_id = auth.uid()
        and team_members.role in ('owner', 'admin', 'manager')
    ));

-- 5. Sub-Team Memberships Policies

-- View: Any org member can see who is in a squad (Now using org_id directly to break recursion)
create policy "Organization members can view sub_team_members"
    on public.sub_team_members for select
    using ( exists (
        select 1 from public.team_members
        where team_members.team_id = sub_team_members.org_id
        and team_members.user_id = auth.uid()
    ));

-- Manage: Admins, Owners, and Managers
create policy "Organization admins can manage sub_team_members"
    on public.sub_team_members for all
    using ( exists (
        select 1 from public.team_members
        where team_members.team_id = sub_team_members.org_id
        and team_members.user_id = auth.uid()
        and team_members.role in ('owner', 'admin', 'manager')
    ))
    with check ( exists (
        select 1 from public.team_members
        where team_members.team_id = sub_team_members.org_id
        and team_members.user_id = auth.uid()
        and team_members.role in ('owner', 'admin', 'manager')
    ));
