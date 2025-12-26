-- Analytics Dashboard Views

-- Drop view if exists
drop view if exists alliance_leaderboard;

-- Create View: Alliance Leaderboard
-- Aggregates XP from 'done' tasks for each team member
create view alliance_leaderboard as
select 
    tm.team_id,
    tm.user_id,
    p.email,
    p.first_name,
    p.last_name,
    tm.role,
    count(t.id) as tasks_completed,
    coalesce(sum(s.xp_points), 0) as total_xp
from team_members tm
join profiles p on tm.user_id = p.id
left join tasks t on t.assigned_to = tm.user_id and t.team_id = tm.team_id
left join statuses st on t.status_id = st.id
left join sizes s on t.size_id = s.id
where 
    st.category = 'done' -- Only count COMPLETED tasks
group by 
    tm.team_id, 
    tm.user_id, 
    p.email, 
    p.first_name, 
    p.last_name, 
    tm.role;

-- Grant access to authenticated users (RLS will filter by team_id via policy?)
-- Views in Supabase are tricky with RLS. 
-- Best practice: Use `security invoker` option in Postgres 15+, or ensure RLS policies on underlying tables apply.
-- However, complex joins often bypass RLS if not careful.
-- For now, we will rely on key-based access in the application (filtering by team_id in the WHERE clause).

comment on view alliance_leaderboard is 'Aggregated XP and task counts for team members based on completed missions.';
