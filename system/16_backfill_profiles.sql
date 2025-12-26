-- Backfill Profiles from Auth Users
-- This ensures all existing users have a profile row

insert into public.profiles (id, email, first_name, last_name)
select 
  id, 
  email, 
  raw_user_meta_data->>'first_name', 
  raw_user_meta_data->>'last_name'
from auth.users
on conflict (id) do update
set 
  email = excluded.email,
  first_name = coalesce(profiles.first_name, excluded.first_name),
  last_name = coalesce(profiles.last_name, excluded.last_name);

-- Verify count
select count(*) as profiles_count from public.profiles;
