-- ai_builds: one row per attempted deployment of a non-builder commitment.
-- Lets us track multiple build iterations per commitment (the edit round in
-- Moment 3 will recompile and reuse the same commitment, inserting new rows).

create table public.ai_builds (
  id              uuid default uuid_generate_v4() primary key,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null,
  commitment_id   uuid references public.commitments(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,

  status          text default 'pending' not null
                    check (status in ('pending', 'approved', 'building', 'live', 'failed')),
  build_config    jsonb,
  project_name    text,
  deployment_id   text,
  deployment_url  text,
  error           text,
  edit_count      integer default 0 not null
);

create index ai_builds_commitment_idx on public.ai_builds (commitment_id);
create index ai_builds_user_idx       on public.ai_builds (user_id);

alter table public.ai_builds enable row level security;

create policy "Users manage their own ai_builds"
  on public.ai_builds for all
  using (auth.uid() = user_id);
