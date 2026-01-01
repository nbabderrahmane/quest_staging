-- 1. Fix RLS on 'clients' table
-- Allow users to see clients they are a member of
DROP POLICY IF EXISTS "Clients are viewable by members" ON clients;
CREATE POLICY "Clients are viewable by members"
ON clients FOR SELECT
USING (
  exists (
    select 1 from client_members
    where client_members.client_id = clients.id
    and client_members.user_id = auth.uid()
  )
);

-- 2. Fix 'statuses' table missing 'color' column
-- Check if column exists, if not add it (using DO block for safety/idempotency)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'statuses' AND column_name = 'color') THEN
        ALTER TABLE statuses ADD COLUMN color text DEFAULT 'bg-slate-100 text-slate-800';
    END IF;
END $$;

-- 3. Verify 'urgency' table has color too (just in case)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'urgencies' AND column_name = 'color') THEN
         ALTER TABLE urgencies ADD COLUMN color text DEFAULT 'bg-slate-500';
    END IF;
END $$;
