-- FRESH PROJECTS ONLY (e.g. the isolated AI Build test project). Not for the
-- hosted production database, whose tables already have these grants.
--
-- Supabase stopped granting new tables in public to anon / authenticated /
-- service_role automatically (new projects from 2026-05-30; every project
-- from 2026-10-30, for tables created after that). Migrations 001–008 were
-- written when those grants were automatic and rely on RLS alone, so on a
-- fresh project the app gets "permission denied" (42501) everywhere.
--
-- This restores exactly the grants those tables had on the hosted project
-- (RLS still decides what each user can see). ai_builds and its quarantine
-- keep 009's own, narrower grants. Run after applying 001–009. Idempotent.

begin;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'opportunities', 'decision_lenses', 'commitments', 'checkins',
    'events', 'email_events', 'ideas', 'evaluation_runs'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('grant select, insert, update, delete on public.%I to anon, authenticated, service_role', t);
    end if;
  end loop;
end $$;

commit;
