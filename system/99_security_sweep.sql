-- Security Sweep: strict enforcement of Team Isolation
-- 1. Ensure RLS is enabled on all sensitive tables
-- 2. Fix task_comments delete policy
-- 3. Verify Projects/Departments policies
-- 4. Enforce Profile Privacy (Remove public access)

-- 1. Enable RLS (Idempotent)
ALTER TABLE IF EXISTS "public"."teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."team_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."quests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."statuses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."sizes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."urgencies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."task_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- 2. Enforce Profile Privacy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles viewable by team members" ON profiles;

CREATE POLICY "Profiles viewable by team members"
  ON profiles FOR SELECT
  USING (
    id = auth.uid() -- Self
    OR
    EXISTS ( -- Shared Team
      SELECT 1 
      FROM team_members my_teams
      JOIN team_members their_teams ON my_teams.team_id = their_teams.team_id
      WHERE my_teams.user_id = auth.uid()
      AND their_teams.user_id = profiles.id
    )
  );

-- 3. Fix task_comments DELETE policy
DROP POLICY IF EXISTS "Author can delete own comments" ON task_comments;

CREATE POLICY "Author can delete own comments"
  ON task_comments FOR DELETE
  USING (
    author_id = auth.uid()
    AND
    team_id IN (
      SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()
    )
  );

-- 4. Schema Checks (Ensure team_id exists)
DO $$
BEGIN
    -- Check task_comments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_comments' AND column_name = 'team_id') THEN
        RAISE EXCEPTION 'Table task_comments missing team_id column';
    END IF;
    
    -- Check projects
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'team_id') THEN
        RAISE EXCEPTION 'Table projects missing team_id column';
    END IF;

    -- Check departments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'team_id') THEN
        RAISE EXCEPTION 'Table departments missing team_id column';
    END IF;

     -- Check tasks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'team_id') THEN
        RAISE EXCEPTION 'Table tasks missing team_id column';
    END IF;
END $$;
