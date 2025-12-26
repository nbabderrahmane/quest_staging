-- 1. Ensure profiles table exists
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  first_name text,
  last_name text,
  email text,
  avatar_url text,
  updated_at timestamptz default now()
);

-- 2. Enable RLS
alter table profiles enable row level security;

-- 3. Policies for profiles (Idempotent)
do $$
begin
    if not exists (select 1 from pg_policies where policyname = 'Public profiles are viewable by everyone') then
        create policy "Public profiles are viewable by everyone" on profiles for select using (true);
    end if;
    
    if not exists (select 1 from pg_policies where policyname = 'Users can insert their own profile') then
        create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
    end if;

    if not exists (select 1 from pg_policies where policyname = 'Users can update own profile') then
        create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
    end if;
end
$$;

-- 4. Trigger for new users (ensure it exists)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  end if;
end
$$;

-- 5. CRITICAL: Add Foreign Key to allow joining team_members -> profiles
-- This allows request: .from('team_members').select('..., profile:profiles(...)')
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'team_members_user_id_fkey_profiles'
  ) then
    alter table team_members
    add constraint team_members_user_id_fkey_profiles
    foreign key (user_id)
    references profiles(id)
    on delete cascade;
  end if;
end
$$;
