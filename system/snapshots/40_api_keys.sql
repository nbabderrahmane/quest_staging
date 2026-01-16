-- Create API Keys table
create table if not exists api_keys (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    key_hash text not null,
    label text not null,
    last_used_at timestamptz,
    created_at timestamptz not null default now()
);

-- Enable RLS
alter table api_keys enable row level security;

-- Policies
create policy "Users can view their own keys"
    on api_keys for select
    using (auth.uid() = user_id);

create policy "Users can create their own keys"
    on api_keys for insert
    with check (auth.uid() = user_id);

create policy "Users can delete their own keys"
    on api_keys for delete
    using (auth.uid() = user_id);

-- Index for faster lookups (though lookups will be mainly by key_hash, so maybe just ID?)
-- Actually, we look up by user_id for listing.
create index idx_api_keys_user_id on api_keys(user_id);
