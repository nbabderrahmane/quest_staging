-- =====================================================
-- FIX: Remove infinite recursion on team_members RLS
-- =====================================================
-- The original policy "Users can view members of their teams" 
-- queries team_members inside a team_members policy = INFINITE LOOP
-- 
-- Solution: Use simple user_id = auth.uid() check + SECURITY DEFINER function

-- 1. Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view members of their teams" ON team_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON team_members;

-- 2. Create a simple, non-recursive SELECT policy
-- Users can view their own memberships directly
CREATE POLICY "Users can read their own memberships"
    ON team_members FOR SELECT
    USING (user_id = auth.uid());

-- 3. Allow users to see other members of teams they belong to
-- This uses get_my_teams() which is SECURITY DEFINER (bypasses RLS)
CREATE POLICY "Users can view teammates"
    ON team_members FOR SELECT
    USING (team_id = ANY(get_my_teams()));

-- 4. Only owners can insert new members
DROP POLICY IF EXISTS "Owners can add members" ON team_members;
CREATE POLICY "Owners can add members"
    ON team_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'owner'
        )
    );

-- 5. Owners and admins can update/delete members
DROP POLICY IF EXISTS "Admins can manage members" ON team_members;
CREATE POLICY "Admins can manage members"
    ON team_members FOR UPDATE
    USING (
        team_id = ANY(get_my_teams()) 
        AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can delete members"
    ON team_members FOR DELETE
    USING (
        team_id = ANY(get_my_teams()) 
        AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- VERIFICATION: Check that get_my_teams() function exists
-- =====================================================
-- If this errors, run 03_security_refactor.sql first!
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_teams') THEN
        RAISE EXCEPTION 'MISSING: get_my_teams() function not found. Run 03_security_refactor.sql first!';
    END IF;
END $$;
