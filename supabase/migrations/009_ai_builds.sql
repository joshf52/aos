-- ai_builds: one row per attempted deployment of a non-builder commitment.
-- Lets us track multiple build iterations per commitment (the edit round in
-- Moment 3 will recompile and reuse the same commitment, inserting new rows).
--
-- Idempotent on purpose. This table first shipped as 008_ai_builds.sql on the
-- Windows branch (same columns, weaker policy). Running this file on a database
-- that already has that version upgrades the policy in place; on a fresh
-- database it creates everything; re-running it is a no-op. One transaction,
-- so a failure (e.g. duplicate in-flight rows blocking the unique index —
-- supabase/manual/verify_ai_builds.sql reports them) leaves nothing half-done.

begin;

create table if not exists public.ai_builds (
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

create index if not exists ai_builds_commitment_idx on public.ai_builds (commitment_id);
create index if not exists ai_builds_user_idx       on public.ai_builds (user_id);

-- At most one in-flight build per commitment: a second tab or a retry can't
-- start a second (paid) deploy. lib/ai-build/run.ts maps the 23505 to a
-- "build already running" refusal and expires stale in-flight rows first.
create unique index if not exists ai_builds_one_inflight_per_commitment
  on public.ai_builds (commitment_id) where status = 'building';

alter table public.ai_builds enable row level security;

-- WITH CHECK also pins commitment_id to one of the caller's own commitments,
-- so a user cannot attach build rows to someone else's commitment. Dropped and
-- recreated so the old 008 policy (USING only) is replaced.
drop policy if exists "Users manage their own ai_builds" on public.ai_builds;
create policy "Users manage their own ai_builds"
  on public.ai_builds for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.commitments c
      where c.id = commitment_id and c.user_id = auth.uid()
    )
  );

commit;
