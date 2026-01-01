-- Make email optional for generic invites
alter table client_invitations alter column email drop not null;

-- Add comment explaining usage
comment on column client_invitations.email is 'Optional. If null, this is a generic invite link usable by anyone.';
