-- Check if the user exists in the Authentication system
select * from auth.users where email = 'abderrahmanenaciribennani@gmail.com';

-- Check if they are in client_members
select * from client_members where user_id = (select id from auth.users where email = 'abderrahmanenaciribennani@gmail.com');
