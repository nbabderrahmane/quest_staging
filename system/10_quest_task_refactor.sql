-- Phase 3: Quest/Task Hierarchy Refactor
-- Run this migration in Supabase SQL Editor

-- Step 1: Rename existing quests table to tasks
ALTER TABLE quests RENAME TO tasks;

-- Step 2: Rename all related indexes
ALTER INDEX IF EXISTS idx_quests_team_id RENAME TO idx_tasks_team_id;
ALTER INDEX IF EXISTS idx_quests_status_id RENAME TO idx_tasks_status_id;
ALTER INDEX IF EXISTS idx_quests_assigned_to RENAME TO idx_tasks_assigned_to;

-- Step 3: Rename RLS policies
DROP POLICY IF EXISTS "Team members can view quests" ON tasks;
DROP POLICY IF EXISTS "Owner/Admin can create quests" ON tasks;
DROP POLICY IF EXISTS "Owner/Admin can update quests" ON tasks;
DROP POLICY IF EXISTS "Owner can delete quests" ON tasks;

CREATE POLICY "Team members can view tasks" ON tasks FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Owner/Admin can create tasks" ON tasks FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Owner/Admin can update tasks" ON tasks FOR UPDATE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Owner can delete tasks" ON tasks FOR DELETE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'owner'));

-- Step 4: Create new quests table (high-level objectives)
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 5: Enable RLS on quests
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view quests" ON quests FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Owner/Admin can create quests" ON quests FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Owner/Admin can update quests" ON quests FOR UPDATE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Owner can delete quests" ON quests FOR DELETE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'owner'));

-- Step 6: Add quest_id foreign key to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS quest_id UUID REFERENCES quests(id);

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quests_team_id ON quests(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_quest_id ON tasks(quest_id);
