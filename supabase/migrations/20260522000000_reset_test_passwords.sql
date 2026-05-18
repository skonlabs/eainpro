-- Reset all test user passwords to test@123
create extension if not exists pgcrypto with schema extensions;

update auth.users
set encrypted_password = extensions.crypt('test@123', extensions.gen_salt('bf')),
    updated_at = now(),
    email_confirmed_at = coalesce(email_confirmed_at, now())
where email like '%@test.com';
