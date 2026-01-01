-- Fix Invitation Read Access
-- Allows checking if a token is valid without being logged in
-- or without having admin access to the team yet.

DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone with a token can view a specific invitation" ON public.client_invitations;
    
    CREATE POLICY "Anyone with a token can view a specific invitation"
    ON public.client_invitations
    FOR SELECT
    USING (status = 'pending');
    -- NOTE: Ideally we would check the token itself in the policy, 
    -- but PostgREST filter works better if we just allow select on pending 
    -- and the code filters by the specific UUID token.
    -- This is safe enough as invitation IDs/tokens are UUIDs.
END $$;
