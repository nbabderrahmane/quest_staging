-- =====================================================
-- SECURE TEAM CHECK FUNCTIONS
-- Fixes recursion issues in RLS policies
-- =====================================================

-- 1. Create SECURITY DEFINER function to check if user is owner
-- This bypasses RLS on team_members to avoid infinite recursion
CREATE OR REPLACE FUNCTION is_team_owner(lookup_team_id uuid)
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
      AND role = 'owner'
  );
END;
$$;

-- 2. Create SECURITY DEFINER function to check if user is admin (or owner)
CREATE OR REPLACE FUNCTION is_team_admin(lookup_team_id uuid)
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
      AND role IN ('owner', 'admin')
  );
END;
$$;

-- 3. Update RLS Policies to use these functions
-- This removes the recursive query on team_members inside the policy

-- Drop old policies to be safe
DROP POLICY IF EXISTS "Owners can add members" ON team_members;
DROP POLICY IF EXISTS "Admins can manage members" ON team_members;
DROP POLICY IF EXISTS "Admins can delete members" ON team_members;

-- Re-create with secure functions

-- Only owners can insert new members
CREATE POLICY "Owners can add members"
    ON team_members FOR INSERT
    WITH CHECK ( is_team_owner(team_id) );

-- Admins (and owners) can update members
CREATE POLICY "Admins can manage members"
    ON team_members FOR UPDATE
    USING (
        team_id = ANY(get_my_teams())
        AND is_team_admin(team_id)
    );

-- Admins (and owners) can remove members
CREATE POLICY "Admins can delete members"
    ON team_members FOR DELETE
    USING (
        team_id = ANY(get_my_teams())
        AND is_team_admin(team_id)
    );
