-- Client Portal Schema

-- 1. Client Members (Maps Auth Users to Clients)
create table if not exists client_members (
    id uuid default gen_random_uuid() primary key,
    client_id uuid references clients(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    role text not null check (role in ('owner', 'member')) default 'member',
    created_at timestamptz default now(),
    unique(client_id, user_id)
);

alter table client_members enable row level security;

-- Policies for Client Members
create policy "Users can view their own client memberships"
    on client_members for select
    using (user_id = auth.uid());

create policy "Team Admins can view client members"
    on client_members for select
    using (
        exists (
            select 1 from clients c
            join team_members tm on tm.team_id = c.team_id
            where c.id = client_members.client_id
            and tm.user_id = auth.uid()
        )
    );

-- 2. Client Invitations
create table if not exists client_invitations (
    id uuid default gen_random_uuid() primary key,
    client_id uuid references clients(id) on delete cascade not null,
    email text not null,
    token uuid default gen_random_uuid() not null,
    status text not null check (status in ('pending', 'accepted', 'expired')) default 'pending',
    expires_at timestamptz not null default (now() + interval '7 days'),
    created_at timestamptz default now()
);

alter table client_invitations enable row level security;

create policy "Team Admins can manage invitations"
    on client_invitations for all
    using (
        exists (
            select 1 from clients c
            join team_members tm on tm.team_id = c.team_id
            where c.id = client_invitations.client_id
            and tm.user_id = auth.uid()
        )
    );

-- 3. Notifications Table
create table if not exists notifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    type text not null check (type in ('info_request', 'comment', 'status_change', 'new_ticket', 'validation_request')),
    resource_id uuid not null, -- Can be task_id, etc.
    resource_type text not null default 'task',
    title text not null,
    message text,
    is_read boolean default false,
    payload jsonb,
    created_at timestamptz default now()
);

alter table notifications enable row level security;

create policy "Users can view their own notifications"
    on notifications for select
    using (user_id = auth.uid());

create policy "Users can update their own notifications (mark read)"
    on notifications for update
    using (user_id = auth.uid());

-- 4. Status Migration: Add 'Validation' Status
-- Logic: Insert 'Validation' status for every team, with sort_order just before 'Done'.
do $$
declare
    t record;
    done_order int;
    new_validation_id uuid;
begin
    for t in select id from teams loop
        -- Find the sort_order of the first 'done' status for this team
        select min(sort_order) into done_order
        from statuses
        where team_id = t.id and category = 'done';

        -- If no done status (shouldn't happen), default to 999
        if done_order is null then
            done_order := 100;
        end if;

        -- Shift all statuses >= done_order up by 1 to make space
        update statuses
        set sort_order = sort_order + 1
        where team_id = t.id and sort_order >= done_order;

        -- Insert 'Validation' status
        insert into statuses (team_id, name, category, sort_order)
        values (t.id, 'Validation', 'active', done_order)
        on conflict do nothing; -- Simplistic avoidance
    end loop;
end $$;

-- 5. RLS Updates for Task Visibility
-- Allow Client Members to view Tasks belonging to their Client
create policy "Client members can view their client's tasks"
    on tasks for select
    using (
        exists (
            select 1 from client_members cm
            where cm.client_id = tasks.client_id
            and cm.user_id = auth.uid()
        )
    );

-- Allow Client Members to Create Tasks (Tickets) for their Client
create policy "Client members can create tasks for their client"
    on tasks for insert
    with check (
        exists (
            select 1 from client_members cm
            where cm.client_id = tasks.client_id
            and cm.user_id = auth.uid()
        )
    );

-- Allow Client Members to Comment on their tasks
create policy "Client members can view comments on their tasks"
    on task_comments for select
    using (
        exists (
            select 1 from tasks t
            join client_members cm on cm.client_id = t.client_id
            where t.id = task_comments.task_id
            and cm.user_id = auth.uid()
        )
    );

create policy "Client members can insert comments on their tasks"
    on task_comments for insert
    with check (
        exists (
            select 1 from tasks t
            join client_members cm on cm.client_id = t.client_id
            where t.id = task_comments.task_id
            and cm.user_id = auth.uid()
        )
    );
