-- 1. Create a Security Definer function to check membership safely
-- This breaks the infinite recursion because it bypasses RLS on client_members when checking.
CREATE OR REPLACE FUNCTION is_client_member(_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM client_members
    WHERE client_id = _client_id
    AND user_id = auth.uid()
  );
END;
$$;

-- 2. Drop the problematic recursive policy
DROP POLICY IF EXISTS "Clients are viewable by members" ON clients;

-- 3. Create the new non-recursive policy
CREATE POLICY "Clients are viewable by members"
ON clients FOR SELECT
USING (
  is_client_member(id)
);

-- 4. Fix 'statuses' table missing 'color' column (Re-applying from previous step to be safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'statuses' AND column_name = 'color') THEN
        ALTER TABLE statuses ADD COLUMN color text DEFAULT 'bg-slate-100 text-slate-800';
    END IF;
END $$;
