-- 1. Create Quest Statuses Table
create table if not exists quest_statuses (
    id uuid default gen_random_uuid() primary key,
    team_id uuid references teams(id) on delete cascade not null,
    name text not null,
    category text not null check (category in ('backlog', 'active', 'done')), -- Helper for logic
    sort_order int default 0,
    created_at timestamptz default now()
);

-- 2. RLS for Quest Statuses
alter table quest_statuses enable row level security;

create policy "Users can view quest statuses"
    on quest_statuses for select
    using (team_id in (select get_my_teams()));

create policy "Owners and Admins can manage quest statuses"
    on quest_statuses for all
    using (team_id in (select get_my_teams()) and exists (
        select 1 from team_members
        where team_id = quest_statuses.team_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    ));

-- 3. Update Quests Table
-- We add status_id as optional first, populate it, then make it required later if needed.
alter table quests add column if not exists status_id uuid references quest_statuses(id) on delete set null;

-- (Optional) Index for performance
create index if not exists idx_quests_status_id on quests(status_id);
