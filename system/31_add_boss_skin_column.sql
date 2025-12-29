-- Add boss_skin column to quests table
-- This fixes the error: "Could not find the 'boss_skin' column of 'quests' in the schema cache"

ALTER TABLE quests 
ADD COLUMN IF NOT EXISTS boss_skin UUID REFERENCES bosses(id);

-- Reload schema cache (Supabase should handle this automatically on DDL, but good to know)
NOTIFY pgrst, 'reload schema';
