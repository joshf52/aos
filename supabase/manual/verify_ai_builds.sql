-- READ-ONLY. Run in the Supabase SQL editor before applying 009_ai_builds.sql
-- to see which state the live database is in. Changes nothing.
--
-- Expected results:
--   * table_exists = false                  -> fresh: apply 009 as-is.
--   * table_exists = true, has_with_check = false
--                                           -> old 008_ai_builds.sql is installed:
--                                              apply 009 (idempotent; it replaces
--                                              the policy and keeps every row).
--   * table_exists = true, has_with_check = true and the check mentions
--     commitments, and inflight_index = true -> already current: nothing to do.

select
  to_regclass('public.ai_builds') is not null                       as table_exists,
  (select relrowsecurity from pg_class where oid = to_regclass('public.ai_builds')) as rls_enabled,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'ai_builds') as policy_count,
  (select with_check is not null from pg_policies
     where schemaname = 'public' and tablename = 'ai_builds'
       and policyname = 'Users manage their own ai_builds')         as has_with_check,
  (select with_check from pg_policies
     where schemaname = 'public' and tablename = 'ai_builds'
       and policyname = 'Users manage their own ai_builds')         as with_check_expr,
  (select count(*) from pg_indexes
     where schemaname = 'public' and tablename = 'ai_builds')       as index_count,
  exists (select 1 from pg_indexes where schemaname = 'public'
            and indexname = 'ai_builds_one_inflight_per_commitment') as inflight_index;

-- Row counts only if the table exists (query_to_xml keeps this from erroring
-- on a fresh database). rows_violating_new_check > 0 means some build rows
-- point at a commitment their user_id does not own — possible only under the
-- old policy. 009 keeps them, but they can no longer be updated by that user;
-- review them before or after applying 009.
select case when to_regclass('public.ai_builds') is null then null
            else (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.ai_builds', false, true, '')))[1]::text::int
       end as ai_builds_rows,
       case when to_regclass('public.ai_builds') is null then null
            else (xpath('/row/n/text()', query_to_xml(
              'select count(*) as n from public.ai_builds b
                 where not exists (select 1 from public.commitments c
                                   where c.id = b.commitment_id and c.user_id = b.user_id)',
              false, true, '')))[1]::text::int
       end as rows_violating_new_check,
       -- > 0 would make 009's one-in-flight unique index fail to create.
       -- Mark the older duplicates 'failed' first.
       case when to_regclass('public.ai_builds') is null then null
            else (xpath('/row/n/text()', query_to_xml(
              'select count(*) as n from (select commitment_id from public.ai_builds
                 where status = ''building'' group by commitment_id having count(*) > 1) d',
              false, true, '')))[1]::text::int
       end as commitments_with_duplicate_inflight_builds;
