-- =====================================================
-- FIX TEAM CREATION RLS (SECURE VERSION)
-- =====================================================

-- 0. Ensure RLS is enabled
ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;

-- 1. TEAMS: Enable insert for authenticated users
-- (Restriction is handled by UI: only Owners/Admins see the button)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."teams";
CREATE POLICY "Enable insert for authenticated users only" 
ON "public"."teams" 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 2. TEAM_MEMBERS: Allow Team Creator to join their own team
-- This is secure: You can only add yourself if you are the logged-in creator of the team.
DROP POLICY IF EXISTS "Allow self-insert for team_members" ON "public"."team_members";
DROP POLICY IF EXISTS "Creators can join their teams" ON "public"."team_members";

CREATE POLICY "Creators can join their teams" 
ON "public"."team_members" 
FOR INSERT 
TO authenticated 
WITH CHECK (
    auth.uid() = user_id 
    AND 
    EXISTS (
        SELECT 1 FROM teams 
        WHERE id = team_id 
        AND created_by = auth.uid()
    )
);

-- 3. SCHEMA: Ensure slug column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'slug') THEN
        ALTER TABLE teams ADD COLUMN slug text UNIQUE;
    END IF;
END $$;

-- 4. DATA FIX: Generated missing slugs
UPDATE teams 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) 
WHERE slug IS NULL;
