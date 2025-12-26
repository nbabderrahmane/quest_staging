-- Phase 3: Quests Table Schema (Corrected)
-- Run this migration in Supabase SQL Editor

-- Create quests table
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  -- References to Forge tables
  status_id UUID REFERENCES statuses(id),
  size_id UUID REFERENCES sizes(id),
  urgency_id UUID REFERENCES urgencies(id),
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Team members can view quests
CREATE POLICY "Team members can view quests"
  ON quests FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Owner/Admin can insert quests
CREATE POLICY "Owner/Admin can create quests"
  ON quests FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policy: Owner/Admin can update quests
CREATE POLICY "Owner/Admin can update quests"
  ON quests FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policy: Owner can delete quests
CREATE POLICY "Owner can delete quests"
  ON quests FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quests_team_id ON quests(team_id);
CREATE INDEX IF NOT EXISTS idx_quests_status_id ON quests(status_id);
CREATE INDEX IF NOT EXISTS idx_quests_assigned_to ON quests(assigned_to);
