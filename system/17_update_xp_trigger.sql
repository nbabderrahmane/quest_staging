-- Function to calculate and update a user's total XP
CREATE OR REPLACE FUNCTION update_user_xp_fn()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    old_user_id UUID;
BEGIN
    -- Handle DELETE operation
    IF (TG_OP = 'DELETE') THEN
        target_user_id := OLD.assigned_to;
    -- Handle UPDATE operation (check both old and new assignee if changed)
    ELSIF (TG_OP = 'UPDATE') THEN
        target_user_id := NEW.assigned_to;
        old_user_id := OLD.assigned_to;
    -- Handle INSERT operation
    ELSE
        target_user_id := NEW.assigned_to;
    END IF;

    -- Update XP for the new/current target user
    IF target_user_id IS NOT NULL THEN
        UPDATE profiles
        SET total_xp = (
            SELECT COALESCE(SUM(s.xp_points), 0)
            FROM tasks t
            JOIN statuses st ON t.status_id = st.id
            LEFT JOIN sizes s ON t.size_id = s.id
            WHERE t.assigned_to = target_user_id
            AND st.category = 'done'
        )
        WHERE id = target_user_id;
    END IF;

    -- If the assignee changed, update the old user too
    IF old_user_id IS NOT NULL AND old_user_id IS DISTINCT FROM target_user_id THEN
        UPDATE profiles
        SET total_xp = (
            SELECT COALESCE(SUM(s.xp_points), 0)
            FROM tasks t
            JOIN statuses st ON t.status_id = st.id
            LEFT JOIN sizes s ON t.size_id = s.id
            WHERE t.assigned_to = old_user_id
            AND st.category = 'done'
        )
        WHERE id = old_user_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_task_change_update_xp ON tasks;
CREATE TRIGGER on_task_change_update_xp
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_user_xp_fn();
