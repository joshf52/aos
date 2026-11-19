-- READ-ONLY. Run in the Supabase SQL editor before (and after) applying
-- 009_ai_builds.sql to see which state the live database is in. It only reads
-- catalogs and counts rows; it changes nothing.
--
-- How to read the first result:
--   * table_exists = false           -> fresh database: apply 009 as-is.
--   * state = 'old 008'              -> the Windows 008_ai_builds.sql is installed
--                                       (one FOR ALL policy, no WITH CHECK): apply
--                                       009; it upgrades in place and keeps rows.
--   * state = 'current'              -> 009 is already applied: nothing to do.
-- Then check the second result before applying 009:
--   * commitments_with_duplicate_inflight_builds > 0 -> 009's unique index can't
--     be created (the whole file rolls back). Mark the older duplicates 'failed'.
--   * rows_violating_new_check > 0 -> build rows attached to a commitment their
--     user_id doesn't own (possible only under the old policy). 009 keeps them;
--     review and clean them up.

with p as (
  select policyname, cmd, with_check
  from pg_policies
  where schemaname = 'public' and tablename = 'ai_builds'
)
select
  to_regclass('public.ai_builds') is not null as table_exists,
  case
    when to_regclass('public.ai_builds') is null then 'absent'
    when exists (select 1 from p where policyname = 'Users manage their own ai_builds') then 'old 008'
    when (select count(*) from p) = 3
     and (select relrowsecurity from pg_class where oid = to_regclass('public.ai_builds'))
     and exists (select 1 from pg_index i
                   where i.indexrelid = to_regclass('public.ai_builds_one_inflight_per_commitment')
                     and i.indisunique and i.indisvalid
                     and pg_get_indexdef(i.indexrelid) like '%(commitment_id, user_id)%'
                     and pg_get_indexdef(i.indexrelid) like '%status = ''building''%')
     and exists (select 1 from pg_trigger where tgrelid = to_regclass('public.ai_builds')
                   and tgname = 'ai_builds_before_insert' and not tgisinternal and tgenabled in ('O', 'A'))
     and exists (select 1 from pg_constraint where conrelid = to_regclass('public.ai_builds')
                   and conname = 'ai_builds_commitment_id_fkey' and confdeltype = 'a')
     and not has_table_privilege('authenticated', 'public.ai_builds', 'DELETE')
     and not has_column_privilege('authenticated', 'public.ai_builds', 'created_at', 'UPDATE')
     and not has_table_privilege('anon', 'public.ai_builds', 'SELECT')
      then 'current'
    else 'unexpected — inspect the columns below'
  end as state,
  (select relrowsecurity from pg_class where oid = to_regclass('public.ai_builds')) as rls_enabled,
  (select string_agg(policyname || ' [' || cmd || ']' || case when with_check is null then '' else ' +check' end, '; ' order by policyname) from p) as policies,
  (select indexdef from pg_indexes where schemaname = 'public'
     and indexname = 'ai_builds_one_inflight_per_commitment') as inflight_index,
  exists (select 1 from pg_trigger where tgrelid = to_regclass('public.ai_builds')
            and tgname = 'ai_builds_before_insert' and not tgisinternal) as daily_cap_trigger,
  (select case confdeltype when 'c' then 'cascade' when 'a' then 'no action' when 'r' then 'restrict' else confdeltype::text end
     from pg_constraint where conrelid = to_regclass('public.ai_builds')
       and conname = 'ai_builds_commitment_id_fkey') as commitment_fk_on_delete,
  case when to_regclass('public.ai_builds') is null then null
       else has_table_privilege('authenticated', 'public.ai_builds', 'DELETE') end as authenticated_can_delete,
  case when to_regclass('public.ai_builds') is null then null
       else has_column_privilege('authenticated', 'public.ai_builds', 'created_at', 'UPDATE') end as authenticated_can_update_created_at,
  case when to_regclass('public.ai_builds') is null then null
       else has_table_privilege('anon', 'public.ai_builds', 'SELECT') end as anon_can_select;

-- Row counts only if the table exists (query_to_xml keeps this from erroring
-- on a fresh database).
select
  case when to_regclass('public.ai_builds') is null then null
       else (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.ai_builds', false, true, '')))[1]::text::int
  end as ai_builds_rows,
  case when to_regclass('public.ai_builds') is null then null
       else (xpath('/row/n/text()', query_to_xml(
         'select count(*) as n from public.ai_builds b
            where not exists (select 1 from public.commitments c
                              where c.id = b.commitment_id and c.user_id = b.user_id)',
         false, true, '')))[1]::text::int
  end as rows_violating_new_check,
  case when to_regclass('public.ai_builds') is null then null
       else (xpath('/row/n/text()', query_to_xml(
         'select count(*) as n from (select commitment_id, user_id from public.ai_builds
            where status = ''building'' group by commitment_id, user_id having count(*) > 1) d',
         false, true, '')))[1]::text::int
  end as commitments_with_duplicate_inflight_builds;
