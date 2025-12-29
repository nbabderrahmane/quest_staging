-- Add logo_url to teams table
alter table teams 
add column if not exists logo_url text;

-- Create storage bucket for team logos
insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

-- Storage Policies

-- Allow public read access to team logos
create policy "Public Access to Team Logos"
on storage.objects for select
using ( bucket_id = 'team-logos' );

-- Allow team owners/admins to upload/update logos
-- We'll rely on the folder structure being `team_id/logo.ext` and verify team membership
create policy "Team Owners can upload logos"
on storage.objects for insert
with check (
    bucket_id = 'team-logos' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1]::uuid in (
        select team_id from team_members 
        where user_id = auth.uid() 
        and role in ('owner', 'admin')
    )
);

create policy "Team Owners can update logos"
on storage.objects for update
using (
    bucket_id = 'team-logos' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1]::uuid in (
        select team_id from team_members 
        where user_id = auth.uid() 
        and role in ('owner', 'admin')
    )
);

create policy "Team Owners can delete logos"
on storage.objects for delete
using (
    bucket_id = 'team-logos' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1]::uuid in (
        select team_id from team_members 
        where user_id = auth.uid() 
        and role in ('owner', 'admin')
    )
);
