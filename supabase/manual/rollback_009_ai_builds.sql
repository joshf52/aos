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

-- Put back what 009 moved into the quarantine:
--   * whole rows (attached to another user's commitment), where both the
--     commitment and the user still exist;
-- Raw provider error text from the old pipeline is NOT put back into the
-- user-readable rows; it stays in the quarantine. Anything that can't be
-- restored (its user or commitment was deleted since) stays there too, and
-- the table is then kept. Rows 009 marked 'failed' as superseded duplicates
-- stay failed: their deployments were never tracked.
--
-- verified_at, deployment_id and deployment_url are kept but never
-- user-writable: together they are the server's attestation that an app was
-- checked live at that address, and the page trusts them. Users get INSERT /
-- UPDATE on every other column. That is the one deliberate difference from
-- the old grants (this branch's code writes with the service role anyway).
do $$
begin
  if to_regclass('public.ai_builds_quarantine') is not null then
    with restorable as (
      delete from public.ai_builds_quarantine q
      where q.reason like 'commitment not owned%'
        and exists (select 1 from public.commitments c where c.id = (q.row_data->>'commitment_id')::uuid)
        and exists (select 1 from auth.users u where u.id = (q.row_data->>'user_id')::uuid)
      returning q.row_data
    )
    insert into public.ai_builds
      select (pg_catalog.jsonb_populate_record(null::public.ai_builds, r.row_data)).* from restorable r
      on conflict (id) do nothing;
    -- A restored row's raw provider error stays archived; the row gets the
    -- generic message (its owner can read the row).
    insert into public.ai_builds_quarantine (reason, row_data)
      select 'legacy error text (replaced on the row)', pg_catalog.jsonb_build_object('id', b.id, 'error', b.error)
      from public.ai_builds b
      where b.error is not null and b.error not in ('The deploy couldn''t start. Try again in a moment.', 'The deploy failed. Try again, or change the plan first.', 'The deploy was cancelled.', 'The deploy took too long and was stopped.', 'The deploy took too long.', 'The deploy couldn''t be confirmed.', 'The deploy is gone.', 'The deploy couldn''t be matched to this build.', 'The app built, but its address couldn''t be assigned.', 'The build stopped before the deploy started.', 'Superseded by a newer build.');
    update public.ai_builds b
      set error = 'The deploy failed. Try again, or change the plan first.'
      where b.error is not null and b.error not in ('The deploy couldn''t start. Try again in a moment.', 'The deploy failed. Try again, or change the plan first.', 'The deploy was cancelled.', 'The deploy took too long and was stopped.', 'The deploy took too long.', 'The deploy couldn''t be confirmed.', 'The deploy is gone.', 'The deploy couldn''t be matched to this build.', 'The app built, but its address couldn''t be assigned.', 'The build stopped before the deploy started.', 'Superseded by a newer build.');


    if not exists (select 1 from public.ai_builds_quarantine) then
      drop table public.ai_builds_quarantine;
    end if;
  end if;
end $$;

drop policy if exists "Users read their own ai_builds" on public.ai_builds;
drop policy if exists "Users create builds for their own commitments" on public.ai_builds;
drop policy if exists "Users update their own ai_builds" on public.ai_builds;
drop policy if exists "Users manage their own ai_builds" on public.ai_builds;
create policy "Users manage their own ai_builds"
  on public.ai_builds for all
  using (auth.uid() = user_id);

-- The old file relied on Supabase's default grants (all privileges to the API
-- roles), except that the attestation columns stay server-only (see above).
revoke all on public.ai_builds from anon, authenticated;
grant select, delete on public.ai_builds to anon, authenticated;
grant insert (id, created_at, updated_at, commitment_id, user_id, status, build_config, project_name, error, edit_count)
  on public.ai_builds to anon, authenticated;
grant update (id, created_at, updated_at, commitment_id, user_id, status, build_config, project_name, error, edit_count)
  on public.ai_builds to anon, authenticated;
grant all on public.ai_builds to service_role;

commit;
