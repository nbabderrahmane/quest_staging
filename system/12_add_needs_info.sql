-- Migration: Add needs_info column to tasks
-- Run this in Supabase SQL Editor

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS needs_info boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.needs_info IS 'Flag to indicate the task needs more information/details';
