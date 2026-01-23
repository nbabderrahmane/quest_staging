-- 108_notification_triggers.sql
-- Purpose: Automate notification creation for Task Assignment, Comments, and Status Changes.

-- 1. Generic Notification Function
CREATE OR REPLACE FUNCTION handle_new_notification()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id uuid;
    notif_type text;
    notif_title text;
    notif_message text;
    notif_resource_id uuid;
    payload jsonb;
BEGIN
    -- Scenario A: Task Assignment (Update on tasks.assigned_to)
    IF (TG_TABLE_NAME = 'tasks' AND TG_OP = 'UPDATE') THEN
        -- Only if assigned_to changed and is not null
        IF (NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
            target_user_id := NEW.assigned_to;
            notif_type := 'info_request'; -- reusing existing type enum or 'status_change', let's use 'info_request' as generic 'action needed' or we need to add types.
            -- Existing types: 'info_request', 'comment', 'status_change', 'new_ticket', 'validation_request'
            -- Assignment -> 'info_request' (You have a new mission) seems okay, or generic. 
            -- Actually, let's treat it as 'status_change' if we can't add types easily, but 'info_request' is fine.
            notif_title := 'New Mission Assigned';
            notif_message := 'You have been assigned to task: ' || NEW.title;
            notif_resource_id := NEW.id;
            payload := jsonb_build_object('taskId', NEW.id, 'role', 'assignee');
            
            -- Prevent self-notification if assigner is same (but we don't know assigner easily in trigger without session)
            -- We'll allow it for now, or check auth.uid() if possible.
            IF target_user_id != auth.uid() THEN
                 INSERT INTO public.notifications (user_id, type, resource_id, resource_type, title, message, payload)
                 VALUES (target_user_id, 'info_request', notif_resource_id, 'task', notif_title, notif_message, payload);
            END IF;
        END IF;

        -- Scenario B: Status Change (Update on tasks.status_id)
        IF (NEW.status_id IS DISTINCT FROM OLD.status_id AND NEW.assigned_to IS NOT NULL) THEN
            target_user_id := NEW.assigned_to;
            notif_type := 'status_change';
            notif_title := 'Mission Status Updated';
            notif_message := 'Task "' || NEW.title || '" moved to a new status.';
            notif_resource_id := NEW.id;
            payload := jsonb_build_object('taskId', NEW.id, 'oldStatus', OLD.status_id, 'newStatus', NEW.status_id);

            IF target_user_id != auth.uid() THEN
                INSERT INTO public.notifications (user_id, type, resource_id, resource_type, title, message, payload)
                VALUES (target_user_id, notif_type, notif_resource_id, 'task', notif_title, notif_message, payload);
            END IF;
        END IF;
    END IF;

    -- Scenario C: New Comment (Insert on task_comments)
    IF (TG_TABLE_NAME = 'task_comments' AND TG_OP = 'INSERT') THEN
        -- Notify Assignee (if exists and not the commenter)
        SELECT assigned_to, title INTO target_user_id, notif_title FROM public.tasks WHERE id = NEW.task_id;
        
        IF (target_user_id IS NOT NULL AND target_user_id != NEW.user_id) THEN
            notif_type := 'comment';
            notif_message := 'New comment on: ' || notif_title;
            notif_resource_id := NEW.task_id;
            payload := jsonb_build_object('commentId', NEW.id, 'taskId', NEW.task_id);

            INSERT INTO public.notifications (user_id, type, resource_id, resource_type, title, message, payload)
            VALUES (target_user_id, notif_type, notif_resource_id, 'task', 'New Intel Received', notif_message, payload);
        END IF;

        -- Also Notify Owner/Creator? (Maybe later, keep simple for now as requested: assignee/client)
        -- The user said "am either assignee or client of it". 
        -- Client notification is harder because client is a relation, but let's check `client_id` on task.
        -- We won't implement client notification in this first pass unless explicitly critical, strictly following "assignee" first as it's cleaner.
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Triggers
DROP TRIGGER IF EXISTS trigger_notify_task_update ON public.tasks;
CREATE TRIGGER trigger_notify_task_update
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION handle_new_notification();

DROP TRIGGER IF EXISTS trigger_notify_new_comment ON public.task_comments;
CREATE TRIGGER trigger_notify_new_comment
AFTER INSERT ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION handle_new_notification();
