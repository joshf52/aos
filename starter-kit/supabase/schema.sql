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
