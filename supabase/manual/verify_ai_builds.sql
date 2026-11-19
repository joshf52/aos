-- READ-ONLY. Run in the Supabase SQL editor before (and after) applying
-- 009_ai_builds.sql to see which state the live database is in. It only reads
-- catalogs and counts rows; it changes nothing.
--
-- How to read the first result:
--   * table_exists = false  -> fresh database: apply 009 as-is.
--   * state = 'old 008'     -> the Windows 008_ai_builds.sql is installed (one
--                              FOR ALL policy, users write their own rows):
--                              apply 009; it upgrades in place and keeps rows.
--   * state = 'current'     -> 009 is applied: users read only, the service
--                              role writes, every trigger and constraint is on.
--   * anything else         -> inspect the columns; don't apply blind.
-- The second result, before applying 009, says what 009 will do to legacy rows
-- (no manual cleanup is needed):
--   * commitments_with_duplicate_inflight_builds > 0 -> 009 marks all but the
--     newest 'building' row per (commitment, user) failed ("Superseded").
--   * rows_violating_ownership > 0 -> rows attached to a commitment their
--     user_id doesn't own (possible only under the old policy). 009 moves them
--     into ai_builds_quarantine (no API access); after 009 this reads 0 and
--     quarantined_rows says how many moved.
--   * live_rows_without_deployment > 0 -> rows the old pipeline marked 'live'
--     when Vercel merely accepted a deploy. 009 keeps them as history (its
--     live check is NOT VALID); the status page won't show them as live.

with p as (
  select policyname, cmd, roles, qual, with_check
  from pg_policies
  where schemaname = 'public' and tablename = 'ai_builds'
),
t as (select to_regclass('public.ai_builds') as oid)
select
  (select oid from t) is not null as table_exists,
  case
    when (select oid from t) is null then 'absent'
    when exists (select 1 from p where policyname = 'Users manage their own ai_builds') then 'old 008'
    when (select count(*) from p) = 1
     and exists (select 1 from p where policyname = 'Users read their own ai_builds' and cmd = 'SELECT'
                   and roles = '{authenticated}'::name[]
                   and pg_catalog.regexp_replace(qual, '\s', '', 'g') = '((SELECTauth.uid()ASuid)=user_id)')
     and to_regclass('public.ai_builds_quarantine') is not null
     and (select relrowsecurity from pg_class where oid = (select oid from t))
     and exists (select 1 from pg_index i
                   where i.indexrelid = to_regclass('public.ai_builds_one_inflight_per_commitment')
                     and i.indisunique and i.indisvalid
                     and pg_get_indexdef(i.indexrelid) like '%(commitment_id, user_id)%'
                     and pg_get_indexdef(i.indexrelid) like '%status = ''building''%')
     -- Triggers: enabled, BEFORE ... FOR EACH ROW on the right event (tgtype
     -- 7 = row|before|insert, 19 = row|before|update), bound to the right
     -- function, and that function still contains its rules.
     and exists (select 1 from pg_trigger g join pg_proc f on f.oid = g.tgfoid
                   where g.tgrelid = (select oid from t) and g.tgname = 'ai_builds_before_insert'
                     and not g.tgisinternal and g.tgenabled in ('O', 'A') and g.tgtype = 7
                     and g.tgfoid = to_regprocedure('public.ai_builds_before_insert()')
                     and f.prosrc like '%pg_advisory_xact_lock%' and f.prosrc like '%ai_builds_not_owner%'
                     and f.prosrc like '%ai_builds_daily_cap%' and f.prosrc like '%ai_builds_bad_initial_status%')
     and exists (select 1 from pg_trigger g join pg_proc f on f.oid = g.tgfoid
                   where g.tgrelid = (select oid from t) and g.tgname = 'ai_builds_before_update'
                     and not g.tgisinternal and g.tgenabled in ('O', 'A') and g.tgtype = 19
                     and g.tgfoid = to_regprocedure('public.ai_builds_before_update()')
                     and f.prosrc like '%ai_builds_immutable%' and f.prosrc like '%ai_builds_bad_transition%')
     and exists (select 1 from pg_constraint where conrelid = (select oid from t)
                   and conname = 'ai_builds_live_has_deployment' and contype = 'c'
                   and pg_get_constraintdef(oid) like '%verified_at IS NOT NULL%'
                   and pg_get_constraintdef(oid) like '%deployment_id%'
                   and pg_get_constraintdef(oid) like '%deployment_url%')
     and (select rolbypassrls from pg_roles where rolname = 'service_role')
     and exists (select 1 from pg_constraint where conrelid = (select oid from t)
                   and conname = 'ai_builds_commitment_id_fkey' and confdeltype = 'a')
     and has_table_privilege('authenticated', 'public.ai_builds', 'SELECT')
     and not has_table_privilege('authenticated', 'public.ai_builds', 'INSERT')
     and not has_table_privilege('authenticated', 'public.ai_builds', 'UPDATE')
     and not has_any_column_privilege('authenticated', 'public.ai_builds', 'INSERT')
     and not has_any_column_privilege('authenticated', 'public.ai_builds', 'UPDATE')
     and not has_table_privilege('authenticated', 'public.ai_builds', 'DELETE')
     and not has_table_privilege('anon', 'public.ai_builds', 'SELECT')
     and not has_any_column_privilege('anon', 'public.ai_builds', 'SELECT')
     and not has_table_privilege('service_role', 'public.ai_builds', 'DELETE')
     and has_table_privilege('service_role', 'public.ai_builds', 'SELECT')
     and has_table_privilege('service_role', 'public.commitments', 'SELECT')
     and has_table_privilege('service_role', 'public.ai_builds', 'INSERT')
     and has_table_privilege('service_role', 'public.ai_builds', 'UPDATE')
      then 'current'
    else 'unexpected — inspect the columns below'
  end as state,
  (select relrowsecurity from pg_class where oid = (select oid from t)) as rls_enabled,
  (select string_agg(policyname || ' [' || cmd || ']' || case when with_check is null then '' else ' +check' end, '; ' order by policyname) from p) as policies,
  (select indexdef from pg_indexes where schemaname = 'public'
     and indexname = 'ai_builds_one_inflight_per_commitment') as inflight_index,
  (select string_agg(tgname, ', ' order by tgname) from pg_trigger
     where tgrelid = (select oid from t) and not tgisinternal) as triggers,
  (select case confdeltype when 'c' then 'cascade' when 'a' then 'no action' when 'r' then 'restrict' else confdeltype::text end
     from pg_constraint where conrelid = (select oid from t)
       and conname = 'ai_builds_commitment_id_fkey') as commitment_fk_on_delete,
  case when (select oid from t) is null then null
       else has_any_column_privilege('authenticated', 'public.ai_builds', 'INSERT')
         or has_any_column_privilege('authenticated', 'public.ai_builds', 'UPDATE')
         or has_table_privilege('authenticated', 'public.ai_builds', 'DELETE') end as authenticated_can_write,
  case when (select oid from t) is null then null
       else has_any_column_privilege('anon', 'public.ai_builds', 'SELECT') end as anon_can_select;

-- Row counts only if the table exists (query_to_xml keeps this from erroring
-- on a fresh database).
select
  case when to_regclass('public.ai_builds') is null then null
       else (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.ai_builds', false, true, '')))[1]::text::int
  end as ai_builds_rows,
  case when to_regclass('public.ai_builds') is null then null
       else (xpath('/row/s/text()', query_to_xml(
         'select coalesce(string_agg(status || ''='' || n, '', '' order by status), ''none'') as s
            from (select status, count(*) n from public.ai_builds group by status) x',
         false, true, '')))[1]::text
  end as rows_by_status,
  case when to_regclass('public.ai_builds') is null then null
       else (xpath('/row/n/text()', query_to_xml(
         'select count(*) as n from public.ai_builds b
            where not exists (select 1 from public.commitments c
                              where c.id = b.commitment_id and c.user_id = b.user_id)',
         false, true, '')))[1]::text::int
  end as rows_violating_ownership,
  case when to_regclass('public.ai_builds') is null then null
       else (xpath('/row/n/text()', query_to_xml(
         'select count(*) as n from (select commitment_id, user_id from public.ai_builds
            where status = ''building'' group by commitment_id, user_id having count(*) > 1) d',
         false, true, '')))[1]::text::int
  end as commitments_with_duplicate_inflight_builds,
  case when to_regclass('public.ai_builds') is null then null
       else (xpath('/row/n/text()', query_to_xml(
         'select count(*) as n from public.ai_builds
            where status = ''live'' and (deployment_id is null or deployment_url is null)',
         false, true, '')))[1]::text::int
  end as live_rows_without_deployment,
  case when to_regclass('public.ai_builds_quarantine') is null then null
       else (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.ai_builds_quarantine', false, true, '')))[1]::text::int
  end as quarantined_rows;
