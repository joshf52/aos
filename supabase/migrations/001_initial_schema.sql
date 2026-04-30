-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- Extends auth.users. Created automatically via trigger.
-- ============================================================
create table public.profiles (
  id                     uuid references auth.users(id) on delete cascade primary key,
  created_at             timestamptz default now() not null,
  updated_at             timestamptz default now() not null,
  capability             text,
  unfair_advantage       text,
  reputation_stage       text default 'Explorer' not null
                           check (reputation_stage in ('Explorer', 'Builder', 'Shipper', 'Proven')),
  active_commitment_count integer default 0 not null
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- OPPORTUNITIES
-- Public read. Admin-managed via service role.
-- ============================================================
create table public.opportunities (
  id               uuid default uuid_generate_v4() primary key,
  created_at       timestamptz default now() not null,
  title            text not null,
  slug             text not null unique,
  capability       text not null,
  gap              text not null,
  signal           text not null,
  wedge            text not null,
  example_customer text not null,
  why_now          text not null,
  confidence       integer not null check (confidence between 1 and 5),
  builder_count    integer default 0 not null,
  is_active        boolean default true not null
);

alter table public.opportunities enable row level security;

create policy "Anyone can view active opportunities"
  on public.opportunities for select
  using (is_active = true);

-- ============================================================
-- DECISION LENSES
-- ============================================================
create table public.decision_lenses (
  id               uuid default uuid_generate_v4() primary key,
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null,
  user_id          uuid references auth.users(id) on delete cascade not null,
  opportunity_id   uuid references public.opportunities(id) on delete cascade not null,
  answer_1         text,
  answer_2         text,
  answer_3         text,
  answer_4         text,
  answer_5         text,
  current_step     integer default 1 not null,
  completed_at     timestamptz
);

alter table public.decision_lenses enable row level security;

create policy "Users can manage their own lenses"
  on public.decision_lenses for all
  using (auth.uid() = user_id);

-- ============================================================
-- COMMITMENTS
-- ============================================================
create table public.commitments (
  id               uuid default uuid_generate_v4() primary key,
  created_at       timestamptz default now() not null,
  user_id          uuid references auth.users(id) on delete cascade not null,
  opportunity_id   uuid references public.opportunities(id) on delete cascade not null,
  lens_id          uuid references public.decision_lenses(id) on delete cascade not null,
  status           text default 'active' not null
                     check (status in ('active', 'completed', 'abandoned')),
  started_at       timestamptz default now() not null,
  completed_at     timestamptz,
  abandoned_at     timestamptz,
  shipped_url      text
);

alter table public.commitments enable row level security;

create policy "Users can manage their own commitments"
  on public.commitments for all
  using (auth.uid() = user_id);

-- ============================================================
-- CHECKINS
-- ============================================================
create table public.checkins (
  id               uuid default uuid_generate_v4() primary key,
  created_at       timestamptz default now() not null,
  commitment_id    uuid references public.commitments(id) on delete cascade not null,
  week_number      integer not null check (week_number between 1 and 4),
  shipped_learned  text not null,
  blockers         text,
  next_focus       text not null,
  unique (commitment_id, week_number)
);

alter table public.checkins enable row level security;

create policy "Users can manage checkins on their own commitments"
  on public.checkins for all
  using (
    exists (
      select 1 from public.commitments c
      where c.id = commitment_id and c.user_id = auth.uid()
    )
  );

-- ============================================================
-- EVENTS (analytics)
-- ============================================================
create table public.events (
  id               uuid default uuid_generate_v4() primary key,
  created_at       timestamptz default now() not null,
  user_id          uuid references auth.users(id) on delete set null,
  event            text not null,
  properties       jsonb
);

alter table public.events enable row level security;

create policy "Users can insert their own events"
  on public.events for insert
  with check (auth.uid() = user_id or user_id is null);

-- ============================================================
-- AUTH TRIGGER
-- Auto-creates a profile row when a user signs up.
-- Run this manually in the Supabase SQL editor after applying migrations.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- updated_at trigger helper
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger decision_lenses_updated_at
  before update on public.decision_lenses
  for each row execute procedure public.set_updated_at();
