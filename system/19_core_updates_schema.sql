-- =====================================================
-- CORE UPDATES SCHEMA
-- Adds Project and Department to Tasks
-- Adds Phone to Profiles
-- Adds Slug to Teams
-- =====================================================

-- 1. Add new columns to tasks table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'project') THEN
        ALTER TABLE tasks ADD COLUMN project text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'department') THEN
        ALTER TABLE tasks ADD COLUMN department text;
    END IF;

    -- 2. Add phone to profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE profiles ADD COLUMN phone text;
    END IF;

    -- 3. Add slug to teams
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'slug') THEN
        ALTER TABLE teams ADD COLUMN slug text UNIQUE;
    END IF;
END $$;
