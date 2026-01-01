-- 1. Create a helper function to verify task access for clients
-- This is similar to is_client_member but for tasks
CREATE OR REPLACE FUNCTION is_task_client_member(_task_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tasks t
        JOIN client_members cm ON cm.client_id = t.client_id
        WHERE t.id = _task_id
        AND cm.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Tasks RLS for Clients
-- Allows members to view ALL tasks for their client, not just their own.
DROP POLICY IF EXISTS "Client members can view their tasks" ON tasks;
CREATE POLICY "Client members can view their tasks"
    ON tasks FOR SELECT
    USING (
        is_client_member(client_id)
    );

-- 3. Correct Task Comments RLS for Clients
-- View comments on tasks I have access to
DROP POLICY IF EXISTS "Client members can view task comments" ON task_comments;
CREATE POLICY "Client members can view task comments"
    ON task_comments FOR SELECT
    USING (
        is_task_client_member(task_id)
    );

-- Add comments to tasks I have access to
DROP POLICY IF EXISTS "Client members can add task comments" ON task_comments;
CREATE POLICY "Client members can add task comments"
    ON task_comments FOR INSERT
    WITH CHECK (
        is_task_client_member(task_id)
    );
