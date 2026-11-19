-- Schema for a kit-side Supabase project. Materialized once when a build is
-- deployed; the compiler does not create this for Phase A.

create table if not exists interested_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  opportunity_id uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists interested_users_email_per_build
  on interested_users (email);

-- The kit writes with the public anon key, so without RLS any visitor could
-- read or rewrite every signup. Allow anonymous inserts only; reads go
-- through the dashboard / service role.
alter table interested_users enable row level security;

drop policy if exists "Anyone can join the interest list" on interested_users;
create policy "Anyone can join the interest list"
  on interested_users for insert
  to anon
  with check (true);
