-- Migration: Add Boss Skin to Quests
-- Description: Adds a column to store the selected boss archetype for the quest.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quests' AND column_name = 'boss_skin') THEN
        ALTER TABLE "quests" ADD COLUMN "boss_skin" text DEFAULT 'generic_monster';
    END IF;
END $$;
