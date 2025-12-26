-- Drop the potentially recursive policy
drop policy if exists "Users can view members of their teams" on team_members;

-- Ensure the simple policy exists and is correct
drop policy if exists "Users can view their own memberships" on team_members;
create policy "Users can view their own memberships"
  on team_members for select
  using ( user_id = auth.uid() );

-- For now, this is enough for the Dashboard to load. 
-- Listing other members will require a more advanced non-recursive approach (e.g. Security Definer function) later.
