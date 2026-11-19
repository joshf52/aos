-- ROLLBACK of 009_ai_builds.sql: returns public.ai_builds to the old Windows
-- 008_ai_builds.sql shape that is live on the hosted database today, and keeps
-- every row. Emergency use only — it restores the weaker policy (users can
-- insert, update and delete their own rows, and attach rows to any commitment).
--
-- The AI Build code on this branch keeps working after a rollback (its writes
-- use the service role and its reads are owner-scoped), so rolling back the
-- database never requires rolling back the app first.
--
-- Run in the Supabase SQL editor as the project owner. One transaction.
-- Afterwards supabase/manual/verify_ai_builds.sql reports state = 'old 008'.

begin;

drop trigger if exists ai_builds_before_update on public.ai_builds;
drop trigger if exists ai_builds_before_insert on public.ai_builds;
drop function if exists public.ai_builds_before_update();
drop function if exists public.ai_builds_before_insert();

drop index if exists public.ai_builds_one_inflight_per_commitment;
alter table public.ai_builds drop constraint if exists ai_builds_live_has_deployment;

-- Back to ON DELETE CASCADE on the commitment, as the old file created it.
alter table public.ai_builds drop constraint if exists ai_builds_commitment_id_fkey;
alter table public.ai_builds
  add constraint ai_builds_commitment_id_fkey
  foreign key (commitment_id) references public.commitments(id) on delete cascade;

drop policy if exists "Users read their own ai_builds" on public.ai_builds;
drop policy if exists "Users create builds for their own commitments" on public.ai_builds;
drop policy if exists "Users update their own ai_builds" on public.ai_builds;
drop policy if exists "Users manage their own ai_builds" on public.ai_builds;
create policy "Users manage their own ai_builds"
  on public.ai_builds for all
  using (auth.uid() = user_id);

-- Supabase's default grants for a table created in public (what the old file
-- relied on).
grant all on public.ai_builds to anon, authenticated, service_role;

commit;
