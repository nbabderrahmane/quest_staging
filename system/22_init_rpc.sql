-- =====================================================
-- INITIALIZE TEAM CONFIGURATION RPC
-- Allows setting up statuses, sizes, and urgencies
-- =====================================================

create or replace function initialize_team_configuration(target_team_id uuid, config jsonb)
returns boolean
language plpgsql
security definer
as $$
declare
  auth_user_id uuid;
  user_role text;
  s jsonb;
  z jsonb;
  u jsonb;
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

  -- 3. Atomic Reset (Clear existing configuration if any, to allow re-initialization or clean slate)
  delete from statuses where team_id = target_team_id;
  delete from sizes where team_id = target_team_id;
  delete from urgencies where team_id = target_team_id;

  -- 4. Parse & Insert Statuses
  if config ? 'statuses' then
    for s in select * from jsonb_array_elements(config->'statuses')
    loop
      insert into statuses (team_id, name, category, sort_order)
      values (target_team_id, s->>'name', s->>'category', (s->>'sort_order')::int);
    end loop;
  end if;

  -- 5. Parse & Insert Sizes
  if config ? 'sizes' then
    for z in select * from jsonb_array_elements(config->'sizes')
    loop
      insert into sizes (team_id, name, xp_points, sort_order)
      values (target_team_id, z->>'name', (z->>'xp_points')::int, (z->>'sort_order')::int);
    end loop;
  end if;

  -- 6. Parse & Insert Urgencies
  if config ? 'urgencies' then
    for u in select * from jsonb_array_elements(config->'urgencies')
    loop
      insert into urgencies (team_id, name, weight, color)
      values (target_team_id, u->>'name', (u->>'weight')::int, u->>'color');
    end loop;
  end if;

  -- 7. Insert Default Quest Statuses (if not present in config, use defaults)
  delete from quest_statuses where team_id = target_team_id;
  
  insert into quest_statuses (team_id, name, category, sort_order) values
  (target_team_id, 'Not Started', 'backlog', 0),
  (target_team_id, 'Started', 'active', 10),
  (target_team_id, 'Achieved', 'done', 20),
  (target_team_id, 'Abandoned', 'done', 30);

  return true;
end;
$$;
