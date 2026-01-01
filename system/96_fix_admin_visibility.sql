-- Ensure Access for BOTH Team Members (Admin) and Client Members (Portal)

-- 1. Re-apply Team Member Policy (Admin Access)
DROP POLICY IF EXISTS "Team members can view clients" ON clients;
CREATE POLICY "Team members can view clients"
    ON clients FOR SELECT
    USING ( exists (
        select 1 from team_members
        where team_members.team_id = clients.team_id
        and team_members.user_id = auth.uid()
    ));

-- 2. Re-apply Manager Policy (Admin Write Access)
DROP POLICY IF EXISTS "Owners, Admins, Managers can manage clients" ON clients;
CREATE POLICY "Owners, Admins, Managers can manage clients"
    ON clients FOR ALL
    USING ( exists (
        select 1 from team_members
        where team_members.team_id = clients.team_id
        and team_members.user_id = auth.uid()
        and team_members.role in ('owner', 'admin', 'manager')
    ));

-- 3. Ensure Client Member Policy (Portal Access) uses the Safe Function
-- Dropping BOTH potential names to be safe and avoid "already exists" errors
DROP POLICY IF EXISTS "Clients are viewable by members" ON clients;
DROP POLICY IF EXISTS "Clients are viewable by portal members" ON clients;

-- Create the Safe Policy using the Function from Step 97
CREATE POLICY "Clients are viewable by portal members"
ON clients FOR SELECT
USING (
  is_client_member(id)
);
