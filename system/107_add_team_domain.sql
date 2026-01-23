-- 107_add_team_domain.sql
-- Purpose: Add domain column to teams to enable PLG auto-join based on email domain.

-- 1. Add nullable unique domain column
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS domain TEXT UNIQUE;

-- 2. Index for faster lookup during auth
CREATE INDEX IF NOT EXISTS idx_teams_domain ON public.teams(domain);

-- 3. Comment
COMMENT ON COLUMN public.teams.domain IS 'Email domain (e.g. acme.com) associated with this team for auto-join logic.';
