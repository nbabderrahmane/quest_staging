-- Phase 3.5: Task Comments Table (Fixed)
-- Run this migration in Supabase SQL Editor

-- Drop existing table if it exists with wrong schema
DROP TABLE IF EXISTS task_comments;

-- Create task_comments table with all columns
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Team members can view comments in their team
CREATE POLICY "Team members can view comments"
  ON task_comments FOR SELECT
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()
    )
  );

-- RLS Policy: Team members can add comments in their team
CREATE POLICY "Team members can add comments"
  ON task_comments FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()
    )
  );

-- RLS Policy: Author can delete their own comments
CREATE POLICY "Author can delete own comments"
  ON task_comments FOR DELETE
  USING (author_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_created_at ON task_comments(created_at DESC);
