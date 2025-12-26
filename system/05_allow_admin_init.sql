-- Update function to allow 'admin' role to initialize team defaults
create or replace function initialize_team_defaults(target_team_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  auth_user_id uuid;
  user_role text;
begin
  -- 1. Get Access Context
  auth_user_id := auth.uid();
  
  -- 2. Verify Permission (Must be Owner, Manager, OR Admin of the target team)
  select role into user_role
  from team_members
  where team_id = target_team_id
  and user_id = auth_user_id;

  if user_role is null or user_role not in ('owner', 'manager', 'admin') then
    raise exception 'Access Denied: You must be an Owner, Manager, or Admin to initialize this team.';
  end if;

  -- 3. Atomic Seeding

  -- Statuses
  insert into statuses (team_id, name, category, sort_order) values
  (target_team_id, 'Backlog', 'backlog', 0),
  (target_team_id, 'To Do', 'active', 10),
  (target_team_id, 'In Progress', 'active', 20),
  (target_team_id, 'Done', 'done', 30);

  -- Sizes (XP)
  insert into sizes (team_id, name, xp_points, sort_order) values
  (target_team_id, 'Tiny', 10, 0),
  (target_team_id, 'Medium', 30, 10),
  (target_team_id, 'Large', 100, 20);

  -- Urgencies
  insert into urgencies (team_id, name, weight, color) values
  (target_team_id, 'Normal', 10, 'blue'),
  (target_team_id, 'High', 50, 'orange'),
  (target_team_id, 'CRITICAL', 100, 'red');

  return true;
end;
$$;
