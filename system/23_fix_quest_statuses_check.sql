-- =====================================================
-- FIX QUEST STATUSES CHECK CONSTRAINT
-- The existing constraint seems to reject 'backlog'. 
-- This script updates it to be more permissive.
-- =====================================================

-- 1. Drop existing check constraint
ALTER TABLE "public"."quest_statuses" 
DROP CONSTRAINT IF EXISTS "quest_statuses_category_check";

-- 2. Add corrected check constraint
ALTER TABLE "public"."quest_statuses" 
ADD CONSTRAINT "quest_statuses_category_check" 
CHECK (category IN ('backlog', 'active', 'done', 'todo', 'in_progress', 'completed', 'archived'));

-- 3. Verify RLS is enabled (just to be safe)
ALTER TABLE "public"."quest_statuses" ENABLE ROW LEVEL SECURITY;
