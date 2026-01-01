-- Phase: Database Schema Cleanup & Fixing Profile Joins
-- This script resolves redundant foreign keys that cause "PGRST201: Ambiguous relationship" errors.

-- 1. CLEANUP: Remove suspected redundant or conflicting foreign keys
-- We drop both the system-generated ones and the ones recently added to start from a clean state.

DO $$
BEGIN
    -- Tasks: assigned_to links
    ALTER TABLE IF EXISTS public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
    ALTER TABLE IF EXISTS public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey_profiles;
    
    -- Tasks: created_by links
    ALTER TABLE IF EXISTS public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
    ALTER TABLE IF EXISTS public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey_profiles;
    
    -- Client Members: user_id links
    ALTER TABLE IF EXISTS public.client_members DROP CONSTRAINT IF EXISTS client_members_user_id_fkey;
    ALTER TABLE IF EXISTS public.client_members DROP CONSTRAINT IF EXISTS client_members_user_id_fkey_profiles;
END $$;

-- 2. RE-ESTABLISH: Create clean, singular foreign keys pointing to public.profiles

-- task(assigned_to) -> profiles(id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_assigned_to_profiles_fkey') THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_assigned_to_profiles_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- task(created_by) -> profiles(id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_created_by_profiles_fkey') THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_created_by_profiles_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- client_members(user_id) -> profiles(id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'client_members_user_id_profiles_fkey') THEN
        ALTER TABLE public.client_members ADD CONSTRAINT client_members_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. VERIFY: Ensure indexes exist for these foreign keys to maintain performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_client_members_user_id ON public.client_members(user_id);
