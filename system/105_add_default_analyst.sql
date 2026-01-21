-- Migration: Add default_analyst_id for Auto-assignment
-- Description: Adds a reference to a team member (analyst) who will be automatically assigned to tasks linked to these entities.

-- 1. Update Departments
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS default_analyst_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Update Clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS default_analyst_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Update Projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS default_analyst_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.departments.default_analyst_id IS 'Default analyst to be assigned to tasks in this department';
COMMENT ON COLUMN public.clients.default_analyst_id IS 'Default analyst to be assigned to tasks for this client';
COMMENT ON COLUMN public.projects.default_analyst_id IS 'Default analyst to be assigned to tasks in this project';
