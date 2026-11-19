-- Schema for a kit-side Supabase project. Materialized once when a build is
-- deployed; the compiler does not create this for Phase A.

create table if not exists interested_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  opportunity_id uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists interested_users_email_per_build
  on interested_users (email);

-- The kit writes with the public anon key, so without RLS any visitor could
-- read or rewrite every signup. Allow anonymous inserts only; reads go
-- through the dashboard / service role.
alter table interested_users enable row level security;

drop policy if exists "Anyone can join the interest list" on interested_users;
create policy "Anyone can join the interest list"
  on interested_users for insert
  to anon
  with check (true);

-- ---------------------------------------------------------------------------
-- Global request limiter for the apps' Claude calls.
--
-- Every generated app shares this project, and serverless instances share no
-- memory, so per-instance counters can't bound spend. kit_admit_ai() is one
-- atomic check across every instance of every app: per client per window, per
-- app per UTC day, and all apps per UTC day. A refused call changes no
-- counter. The app calls it before each Claude request and refuses to call
-- Claude if it can't get an answer (AI_REQUIRE_GLOBAL_LIMIT=1, set by AOS).
--
-- The function is callable with the public anon key, and the caps are
-- arguments, because the app's server is the only thing that spends money:
-- someone calling it directly can only use up counters (making apps refuse
-- requests), never cause a Claude call. The hard spend ceiling is the
-- Anthropic workspace spend limit on the key, not this table.

create table if not exists public.kit_ai_usage (
  bucket     text primary key,
  n          integer not null,
  expires_at timestamptz not null
);
alter table public.kit_ai_usage enable row level security;
-- No policies and no grants: only kit_admit_ai (SECURITY DEFINER) touches it.
revoke all on public.kit_ai_usage from anon, authenticated;

create or replace function public.kit_admit_ai(
  p_app text,
  p_client text,
  p_client_cap integer,
  p_window_seconds integer,
  p_app_daily_cap integer,
  p_all_daily_cap integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day   text := pg_catalog.to_char(pg_catalog.now() at time zone 'utc', 'YYYY-MM-DD');
  v_win   bigint;
  v_eod   timestamptz := (pg_catalog.date_trunc('day', pg_catalog.now() at time zone 'utc') + interval '1 day') at time zone 'utc';
  v_wend  timestamptz;
  v_n     integer;
begin
  if p_app !~ '^[a-z0-9-]{1,64}$' or p_client !~ '^[a-f0-9]{16,64}$'
     or p_client_cap not between 1 and 100000 or p_window_seconds not between 10 and 86400
     or p_app_daily_cap not between 1 and 1000000 or p_all_daily_cap not between 1 and 10000000 then
    raise exception 'kit_admit_ai: invalid arguments' using errcode = '22023';
  end if;
  v_win  := pg_catalog.floor(extract(epoch from pg_catalog.now()) / p_window_seconds)::bigint;
  v_wend := pg_catalog.to_timestamp((v_win + 1) * p_window_seconds);

  begin
    insert into public.kit_ai_usage as u (bucket, n, expires_at)
      values ('c:' || p_app || ':' || p_client || ':' || v_win, 1, v_wend)
      on conflict (bucket) do update set n = u.n + 1 where u.n < p_client_cap
      returning n into v_n;
    if v_n is null then
      raise exception 'rate' using errcode = 'P0001';
    end if;
    v_n := null;
    insert into public.kit_ai_usage as u (bucket, n, expires_at)
      values ('a:' || p_app || ':' || v_day, 1, v_eod)
      on conflict (bucket) do update set n = u.n + 1 where u.n < p_app_daily_cap
      returning n into v_n;
    if v_n is null then
      raise exception 'daily' using errcode = 'P0001';
    end if;
    v_n := null;
    insert into public.kit_ai_usage as u (bucket, n, expires_at)
      values ('all:' || v_day, 1, v_eod)
      on conflict (bucket) do update set n = u.n + 1 where u.n < p_all_daily_cap
      returning n into v_n;
    if v_n is null then
      raise exception 'daily' using errcode = 'P0001';
    end if;
  exception when sqlstate 'P0001' then
    -- The block's increments are rolled back: a refusal costs no quota.
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'reason', sqlerrm,
      'retry_after', pg_catalog.ceil(extract(epoch from (case when sqlerrm = 'rate' then v_wend else v_eod end) - pg_catalog.now()))::integer);
  end;

  -- Expired buckets are dead weight; sweep a few now and then.
  if pg_catalog.random() < 0.02 then
    delete from public.kit_ai_usage
      where bucket in (select bucket from public.kit_ai_usage where expires_at < pg_catalog.now() limit 500);
  end if;
  return pg_catalog.jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.kit_admit_ai(text, text, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.kit_admit_ai(text, text, integer, integer, integer, integer) to anon, service_role;
