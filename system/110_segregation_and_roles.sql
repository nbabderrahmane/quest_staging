-- 110_segregation_and_roles.sql
-- Purpose: Implement V4 Security (Strict Segregation), New Roles, and Enhanced Profiles.

-- 1. Enhanced Profiles (Teams Table)
alter table public.teams add column if not exists description text;
alter table public.teams add column if not exists website text;
alter table public.teams add column if not exists contact_email text;

-- 2. Enhanced Sub-Teams
alter table public.sub_teams add column if not exists description text;

-- 3. Update Role Constraint (Add 'developer')
-- check constraints cannot be altered easily, so we drop and add
alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check 
    check (role in ('owner', 'admin', 'manager', 'member', 'analyst', 'developer'));

-- 4. Strict Segregation RLS for Sub-Teams
-- Drop old lax policies
drop policy if exists "Organization members can view sub_teams" on public.sub_teams;
drop policy if exists "Organization members can view sub_team_members" on public.sub_team_members;

-- New Strict Policy: View Sub-Team ONLY if member OR Org Admin
create policy "Strict: View Sub-Teams"
    on public.sub_teams for select
    using (
        -- 1. Org Admin/Owner
        exists (
            select 1 from public.team_members
            where team_members.team_id = sub_teams.org_id
            and team_members.user_id = auth.uid()
            and team_members.role in ('owner', 'admin')
        )
        OR
        -- 2. Squad Member
        exists (
            select 1 from public.sub_team_members
            where sub_team_members.sub_team_id = sub_teams.id
            and sub_team_members.user_id = auth.uid()
        )
        OR
        -- 3. "General" Squad (Optional: if we want everyone to see General)
        name = 'General'
    );

-- 5. Strict Segregation RLS for Tasks
-- We must update the tasks policy to respect sub-team boundaries
drop policy if exists "Team members can view tasks" on public.tasks;

create policy "Strict: View Tasks"
    on public.tasks for select
    using (
        -- 1. Org Admin/Owner (See Everything)
        exists (
            select 1 from public.team_members
            where team_members.team_id = tasks.team_id
            and team_members.user_id = auth.uid()
            and team_members.role in ('owner', 'admin')
        )
        OR
        -- 2. Task is assigned to a Sub-Team where User is a Member
        (
            tasks.sub_team_id is not null AND
            exists (
                select 1 from public.sub_team_members
                where sub_team_members.sub_team_id = tasks.sub_team_id
                and sub_team_members.user_id = auth.uid()
            )
        )
        OR
        -- 3. Task is Global (No Sub-Team) -> Visible to all Org Members
        (
            tasks.sub_team_id is null AND
            exists (
                select 1 from public.team_members
                where team_members.team_id = tasks.team_id
                and team_members.user_id = auth.uid()
            )
        )
    );

-- 6. Helper for 'developer' role permissions (Task Management)
-- Developers should behave like Analysts (Can create/edit tasks)
-- We need to ensure existing management policies include 'developer'
-- (Assuming policies use "Team members can manage tasks" which covers all roles? 
-- Let's check schema.sql... "Team members can manage tasks" uses "team_members where user_id = auth.uid()".
-- It doesn't restrict by role. So developers are covered automatically.
-- But if we want to RESTRICT delete, we need to handle that in the API/Service layer.)

