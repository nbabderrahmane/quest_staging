-- 1. Clean up redundant user_id column and its dependencies
-- We drop the policies that depend on it first to avoid "cannot drop column ... because other objects depend on it"
DROP POLICY IF EXISTS "Creators can view their tasks" ON tasks;
DROP POLICY IF EXISTS "Creators can manage their tasks" ON tasks;

DO $$
BEGIN
    -- If we accidentally added user_id, let's remove it to keep schema clean
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'user_id') THEN
        ALTER TABLE tasks DROP COLUMN user_id;
    END IF;
END $$;

-- 2. Create correct RLS policies using create_by (Standard system column)
CREATE POLICY "Creators can view their tasks"
    ON tasks FOR SELECT
    USING (created_by = auth.uid());

CREATE POLICY "Creators can manage their tasks"
    ON tasks FOR ALL
    USING (created_by = auth.uid());


