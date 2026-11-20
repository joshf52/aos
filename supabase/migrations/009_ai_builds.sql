-- ai_builds: one row per attempted deployment of a non-builder commitment.
-- Lets us track multiple build iterations per commitment (the edit round in
-- Moment 3 will recompile and reuse the same commitment, inserting new rows).
--
-- Idempotent on purpose. This table first shipped as 008_ai_builds.sql on the
-- Windows branch (same columns, one FOR ALL policy with no WITH CHECK), and
-- that version is live on the hosted database. Running this file there
-- upgrades it in place and keeps every row; on a fresh database it creates
-- everything; re-running it is a no-op. One transaction, so a failure leaves
-- nothing half-done. Two kinds of legacy row the new rules can't hold are
-- handled in place (see "Legacy rows" below): nothing is lost.
-- supabase/manual/verify_ai_builds.sql reports the state before and after;
-- supabase/manual/rollback_009_ai_builds.sql undoes it.
--
-- Who writes what:
--   * Signed-in users can only READ their own rows. They can't insert,
--     update or delete any row, so a build's status, URL and history can't
--     be forged, and the daily build count can't be reset.
--   * Server code writes with the service role (lib/supabase/service.ts,
--     lib/ai-build/store.ts) after checking the signed-in user owns the
--     commitment. The service role bypasses RLS, so the triggers below
--     re-check what RLS can't: ownership, the daily cap, immutable columns,
--     status transitions. It gets no DELETE: build history is the cap's
--     evidence. (Deleting an account still removes its rows — referential
--     actions run as the table owner.)

begin;

create table if not exists public.ai_builds (
  id              uuid default uuid_generate_v4() primary key,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null,
  -- NO ACTION, not CASCADE: deleting a commitment must not erase its build
  -- history (that would reset the daily cap). Deleting the user still works:
  -- user_id cascades and NO ACTION is checked at the end of the statement.
  commitment_id   uuid references public.commitments(id) not null,
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

-- The insert trigger below reads commitments as the service role. Supabase
-- stopped granting new tables to the API roles automatically (2026), so say
-- it explicitly rather than rely on how the project was created.
grant select on public.commitments to service_role;

-- A check from an earlier run of this file is enforced on updates even when
-- NOT VALID, which would block the legacy backfills below. Drop it here; it
-- is recreated further down, in the same transaction.
alter table public.ai_builds drop constraint if exists ai_builds_live_has_deployment;

-- Legacy rows the old 008 policy allowed but this schema can't hold.
--
-- (a) Rows attached to a commitment their user_id doesn't own. They would
--     block deleting the commitment owner's account (the FK below is NO
--     ACTION) and they never describe a real build of that commitment. They
--     are moved, whole, into ai_builds_quarantine (no API access) — kept as
--     history, out of the live table.
create table if not exists public.ai_builds_quarantine (
  quarantined_at timestamptz not null default now(),
  reason         text not null,
  row_data       jsonb not null
);
alter table public.ai_builds_quarantine enable row level security;
revoke all on public.ai_builds_quarantine from anon, authenticated, service_role;

insert into public.ai_builds_quarantine (reason, row_data)
  select 'commitment not owned by the row''s user (written under the old 008 policy)', pg_catalog.to_jsonb(b)
  from public.ai_builds b
  where not exists (select 1 from public.commitments c
                     where c.id = b.commitment_id and c.user_id = b.user_id);
delete from public.ai_builds b
  where not exists (select 1 from public.commitments c
                     where c.id = b.commitment_id and c.user_id = b.user_id);

-- (b) Error text written by the old pipeline is raw provider output, and the
--     row's owner can read it through the API. The original text moves to
--     the quarantine (no API access); the row keeps a generic message. The
--     list below is every message the current code writes — keep it in sync
--     with KNOWN_ERRORS in lib/ai-build/build-status.ts.
insert into public.ai_builds_quarantine (reason, row_data)
  select 'legacy error text (replaced on the row)', pg_catalog.jsonb_build_object('id', b.id, 'error', b.error)
  from public.ai_builds b
  where b.error is not null and b.error not in (
    'The deploy couldn''t start. Try again in a moment.',
    'The deploy failed. Try again, or change the plan first.',
    'The deploy was cancelled.',
    'The deploy took too long and was stopped.',
    'The deploy took too long.',
    'The deploy couldn''t be confirmed.',
    'The deploy is gone.',
    'The deploy couldn''t be matched to this build.',
    'The app built, but its address couldn''t be assigned.',
    'The build stopped before the deploy started.',
    'Superseded by a newer build.');
update public.ai_builds b
  set error = 'The deploy failed. Try again, or change the plan first.'
  where b.error is not null and b.error not in (
    'The deploy couldn''t start. Try again in a moment.',
    'The deploy failed. Try again, or change the plan first.',
    'The deploy was cancelled.',
    'The deploy took too long and was stopped.',
    'The deploy took too long.',
    'The deploy couldn''t be confirmed.',
    'The deploy is gone.',
    'The deploy couldn''t be matched to this build.',
    'The app built, but its address couldn''t be assigned.',
    'The build stopped before the deploy started.',
    'Superseded by a newer build.');

-- (c) More than one "building" row for one (commitment, user) — a retry or a
--     race under the old code. The unique index below can't be built over
--     them, so every one but the newest is marked failed (rows and their
--     deployment ids are kept; the reconciler can still look them up).
update public.ai_builds b
  set status = 'failed', error = 'Superseded by a newer build.'
  where b.status = 'building'
    and exists (select 1 from public.ai_builds n
                 where n.commitment_id = b.commitment_id and n.user_id = b.user_id
                   and n.status = 'building'
                   and (n.created_at, n.id) > (b.created_at, b.id));

-- When the server confirmed the app answered at its public address as this
-- deployment. Only rows written by the current code have it, so a legacy
-- "live" row (marked live on mere acceptance) is never shown as live.
alter table public.ai_builds add column if not exists verified_at timestamptz;

-- At most one in-flight build per commitment owner: a second tab or a retry
-- can't start a second (paid) deploy. store.ts maps the 23505 to a refusal.
-- Rebuilt every run so an index from an earlier draft can't survive.
drop index if exists public.ai_builds_one_inflight_per_commitment;
create unique index ai_builds_one_inflight_per_commitment
  on public.ai_builds (commitment_id, user_id) where status = 'building';

-- The old 008 table was created with ON DELETE CASCADE on commitment_id.
alter table public.ai_builds drop constraint if exists ai_builds_commitment_id_fkey;
alter table public.ai_builds
  add constraint ai_builds_commitment_id_fkey
  foreign key (commitment_id) references public.commitments(id);

-- "live" means Vercel reported READY and the app answered at its public
-- address as that deployment; a row can't claim it without a deployment id,
-- an https URL with a host, and verified_at.
-- NOT VALID: legacy rows from the old pipeline (which marked builds live on
-- acceptance) are kept as they are; every new insert and update is checked.
-- The status page also refuses to show a row as live without both.
alter table public.ai_builds
  add constraint ai_builds_live_has_deployment
  check (status <> 'live' or (coalesce(deployment_id, '') ~ '^[A-Za-z0-9_-]{4,128}$'
                              and coalesce(deployment_url, '') ~ '^https://[a-z0-9-]+(\.[a-z0-9-]+)+(/[^[:space:]]*)?$'
                              and verified_at is not null)) not valid;

-- Insert rules, race-free:
--   * a new row starts as 'pending' or 'building';
--   * the commitment must belong to the row's user (the service role bypasses
--     RLS, so this is the database's own ownership check);
--   * created_at / updated_at are the server clock;
--   * at most 5 builds per (commitment, user) per rolling 24 hours (keep in
--     sync with MAX_BUILDS_PER_COMMITMENT_PER_DAY in lib/ai-build/limits.ts).
-- The advisory lock serializes inserts for one commitment until commit, so two
-- concurrent inserts can't both count 4 and both land (READ COMMITTED, the
-- PostgREST default, sees the first one's row after the lock is released).
-- SECURITY INVOKER: only the service role and the owner insert, and both see
-- every row. Empty search_path: every object below is schema-qualified.
create or replace function public.ai_builds_before_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('ai_builds:' || new.commitment_id::text));
  -- A build starts at the beginning; live / failed are reached by update only.
  if new.status not in ('pending', 'building') then
    raise exception 'ai_builds_bad_initial_status: a build can''t be created as %', new.status
      using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.commitments c
                  where c.id = new.commitment_id and c.user_id = new.user_id) then
    raise exception 'ai_builds_not_owner: the commitment does not belong to this build''s user'
      using errcode = 'P0001';
  end if;
  new.created_at := pg_catalog.now();
  new.updated_at := pg_catalog.now();
  if (select pg_catalog.count(*) from public.ai_builds
        where commitment_id = new.commitment_id
          and user_id = new.user_id
          and created_at > pg_catalog.now() - interval '24 hours') >= 5 then
    raise exception 'ai_builds_daily_cap: this commitment started 5 builds in the last 24 hours'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Update rules: identity and history columns never change, and a status only
-- moves forward (pending → approved → building → live | failed). live and
-- failed are final; a retry is a new row, which the daily cap counts.
create or replace function public.ai_builds_before_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.commitment_id is distinct from old.commitment_id
     or new.created_at is distinct from old.created_at then
    raise exception 'ai_builds_immutable: id, user_id, commitment_id and created_at cannot change'
      using errcode = 'P0001';
  end if;
  -- A verified live row is a record of what was checked: its deployment,
  -- address and verification time can't be edited afterwards.
  if old.status = 'live' and (new.deployment_id is distinct from old.deployment_id
     or new.deployment_url is distinct from old.deployment_url
     or new.verified_at is distinct from old.verified_at) then
    raise exception 'ai_builds_immutable: a live build''s deployment, address and verification are final'
      using errcode = 'P0001';
  end if;
  if new.status is distinct from old.status and not (
       (old.status = 'pending'  and new.status in ('approved', 'building', 'failed'))
    or (old.status = 'approved' and new.status in ('building', 'failed'))
    or (old.status = 'building' and new.status in ('live', 'failed'))
  ) then
    raise exception 'ai_builds_bad_transition: % -> % is not allowed', old.status, new.status
      using errcode = 'P0001';
  end if;
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.ai_builds_before_insert() from public, anon, authenticated;
revoke all on function public.ai_builds_before_update() from public, anon, authenticated;

drop trigger if exists ai_builds_before_insert on public.ai_builds;
create trigger ai_builds_before_insert
  before insert on public.ai_builds
  for each row execute function public.ai_builds_before_insert();

drop trigger if exists ai_builds_before_update on public.ai_builds;
create trigger ai_builds_before_update
  before update on public.ai_builds
  for each row execute function public.ai_builds_before_update();

alter table public.ai_builds enable row level security;

-- Replace every earlier policy (old 008, earlier 009 drafts) with read-only.
drop policy if exists "Users manage their own ai_builds" on public.ai_builds;
drop policy if exists "Users read their own ai_builds" on public.ai_builds;
drop policy if exists "Users create builds for their own commitments" on public.ai_builds;
drop policy if exists "Users update their own ai_builds" on public.ai_builds;

create policy "Users read their own ai_builds"
  on public.ai_builds for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Privileges. Explicit, so the result doesn't depend on the project's default
-- grants for new tables.
revoke all on public.ai_builds from anon;
revoke all on public.ai_builds from authenticated;
revoke all on public.ai_builds from service_role;
grant select on public.ai_builds to authenticated;
grant select, insert, update on public.ai_builds to service_role;

commit;
