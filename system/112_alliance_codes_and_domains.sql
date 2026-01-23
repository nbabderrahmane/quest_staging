-- 112_alliance_codes_and_domains.sql
-- Purpose: Add support for discovery by domain and joining via codes.

-- 1. Add columns to teams
alter table public.teams add column if not exists domain text;
alter table public.teams add column if not exists join_code_admin text unique;
alter table public.teams add column if not exists join_code_manager text unique;
alter table public.teams add column if not exists join_code_analyst text unique;
alter table public.teams add column if not exists join_code_developer text unique;
alter table public.teams add column if not exists join_code_member text unique;

-- 2. Create index for performance
create index if not exists idx_teams_domain on public.teams(domain);

-- 3. Update RLS (Discovery)
-- Users need to be able to see basic team info IF the domain matches their email,
-- even if they are not yet members.
drop policy if exists "Discovery: View teams by domain" on public.teams;
create policy "Discovery: View teams by domain"
  on public.teams for select
  using (
    domain is not null 
    AND 
    auth.jwt() ->> 'email' like '%@' || domain
  );
