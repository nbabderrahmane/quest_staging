-- Migration: Add was_dropped column to tasks
-- Run this in Supabase SQL Editor

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS was_dropped boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.was_dropped IS 'Flag to indicate if the mission was aborted/dropped';
