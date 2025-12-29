-- =====================================================
-- RESET TEAMS RLS (NUCLEAR OPTION) - RECURSION FIX
-- Drops ALL existing policies on 'teams' and 'team_members' 
-- and recreates them using SECURITY DEFINER functions to avoid recursion.
-- =====================================================

DO $$ 
DECLARE r RECORD; 
BEGIN 
    -- 1. DROP ALL POLICIES ON TEAMS
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'teams') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON "public"."teams"'; 
    END LOOP;

    -- 2. DROP ALL POLICIES ON TEAM_MEMBERS
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'team_members') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON "public"."team_members"'; 
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- These break infinite recursion loops in policies
-- =====================================================

CREATE OR REPLACE FUNCTION is_team_member(lookup_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_members
    WHERE team_id = lookup_team_id
      AND user_id = auth.uid()
  );
END;
$$;

-- =====================================================
-- RE-CREATE PERMISSIVE POLICIES
-- =====================================================

-- 1. TEAMS: Allow Insert for Authenticated
CREATE POLICY "Enable insert for authenticated" 
ON "public"."teams" 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 2. TEAMS: Allow Select for Members (Basic visibility)
CREATE POLICY "Enable select for members" 
ON "public"."teams" 
FOR SELECT 
TO authenticated 
USING (
    is_team_member(id)
);

-- 3. TEAMS: Allow Select for Created Teams (so you can see it right after create)
CREATE POLICY "Enable select for creators" 
ON "public"."teams" 
FOR SELECT 
TO authenticated 
USING (created_by = auth.uid());


-- 4. TEAM_MEMBERS: Allow Self-Insert if Creator/Authenticated
--    We allow users to join teams if they are the creator (checked via teams table)
--    OR if we want to allow any self-join (e.g. invite). 
--    For creation flow, "auth.uid() = user_id" is the minimum requirement.
CREATE POLICY "Allow basic self-insert" 
ON "public"."team_members" 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 5. TEAM_MEMBERS: Allow Select for Members (Visibility)
--    You can see rows if:
--    A. It is YOU
--    B. It is a member of a team YOU belong to
CREATE POLICY "Enable select for members" 
ON "public"."team_members" 
FOR SELECT 
TO authenticated 
USING (
    user_id = auth.uid() OR 
    is_team_member(team_id)
);

-- 6. Ensure Slug
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'slug') THEN
        ALTER TABLE teams ADD COLUMN slug text UNIQUE;
    END IF;
END $$;

-- 7. Fix existing teams with NULL slugs
UPDATE teams 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) 
WHERE slug IS NULL;
