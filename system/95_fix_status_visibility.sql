-- Allow Client Members to view Statuses (Matched by Team)
-- This allows the Portal to display status names and colors for tickets.
DROP POLICY IF EXISTS "Client members can view team statuses" ON statuses;
CREATE POLICY "Client members can view team statuses"
    ON statuses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM clients c
            JOIN client_members cm ON cm.client_id = c.id
            WHERE c.team_id = statuses.team_id
            AND cm.user_id = auth.uid()
        )
    );

-- Allow Client Members to view Urgencies (Assuming Global or Public)
-- If Urgencies have RLS enabled, we need a policy.
-- Safely adding policy if table exists.
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'urgencies') THEN
        DROP POLICY IF EXISTS "Everyone can view urgencies" ON urgencies;
        CREATE POLICY "Everyone can view urgencies"
            ON urgencies FOR SELECT
            USING (true);
    END IF;
END $$;
