-- Add is_archived column to quests table
ALTER TABLE quests 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Update existing records to have is_archived = false (redundant with default but good for clarity)
UPDATE quests SET is_archived = FALSE WHERE is_archived IS NULL;
