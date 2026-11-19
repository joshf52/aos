-- ai_builds: one row per attempted deployment of a non-builder commitment.
-- Lets us track multiple build iterations per commitment (the edit round in
-- Moment 3 will recompile and reuse the same commitment, inserting new rows).
--
-- Idempotent on purpose. This table first shipped as 008_ai_builds.sql on the
-- Windows branch (same columns, one FOR ALL policy with no WITH CHECK). Running
-- this file on a database that already has that version upgrades it in place
-- and keeps every row; on a fresh database it creates everything; re-running
-- it is a no-op. One transaction, so a failure leaves nothing half-done —
-- supabase/manual/verify_ai_builds.sql reports the state before you apply it.
--
-- Rows are written by server code acting as the signed-in user (no service
-- role), so the user could also write them directly through the API. Each
-- build spends AOS money, so the rules below make the spend controls in
-- lib/ai-build/run.ts tamper-proof:
--   * no DELETE, and created_at / user_id / commitment_id can't be updated,
--     so the per-commitment daily build count can't be reset;
--   * INSERT / UPDATE must stay on one of the caller's own commitments;
--   * at most one in-flight build per (commitment, user).

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

-- At most one in-flight build per commitment owner: a second tab or a retry
-- can't start a second (paid) deploy. Keyed on user_id too, so a stray legacy
-- row another user attached to this commitment (possible under the old 008
-- policy) can't occupy the owner's slot. run.ts maps the 23505 to a refusal.
create unique index if not exists ai_builds_one_inflight_per_commitment
  on public.ai_builds (commitment_id, user_id) where status = 'building';

alter table public.ai_builds enable row level security;

-- Replace the old single FOR ALL policy with per-command policies (no DELETE).
drop policy if exists "Users manage their own ai_builds" on public.ai_builds;
drop policy if exists "Users read their own ai_builds" on public.ai_builds;
drop policy if exists "Users create builds for their own commitments" on public.ai_builds;
drop policy if exists "Users update their own ai_builds" on public.ai_builds;

create policy "Users read their own ai_builds"
  on public.ai_builds for select
  using (auth.uid() = user_id);

create policy "Users create builds for their own commitments"
  on public.ai_builds for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.commitments c
      where c.id = commitment_id and c.user_id = auth.uid()
    )
  );

create policy "Users update their own ai_builds"
  on public.ai_builds for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.commitments c
      where c.id = commitment_id and c.user_id = auth.uid()
    )
  );

-- Privileges. Explicit so the table works whether or not the project grants
-- new tables to the API roles automatically. service_role is untouched.
revoke all on public.ai_builds from anon;
revoke all on public.ai_builds from authenticated;
grant select, insert on public.ai_builds to authenticated;
grant update (status, build_config, project_name, deployment_id, deployment_url, error, edit_count, updated_at)
  on public.ai_builds to authenticated;

commit;
