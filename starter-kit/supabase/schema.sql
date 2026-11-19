-- Schema for the kit-side Supabase project that every generated app shares.
-- Apply once (idempotent). Grants are explicit: Supabase no longer grants new
-- tables to the API roles automatically (2026).

create table if not exists public.interested_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  opportunity_id uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists interested_users_email_per_build
  on public.interested_users (email);

-- The kit writes with the public anon key, so without RLS any visitor could
-- read or rewrite every signup. Allow anonymous inserts only; reads go
-- through the dashboard / service role.
alter table public.interested_users enable row level security;
revoke all on public.interested_users from anon, authenticated;
grant insert on public.interested_users to anon;

drop policy if exists "Anyone can join the interest list" on public.interested_users;
create policy "Anyone can join the interest list"
  on public.interested_users for insert
  to anon
  with check (true);

-- ---------------------------------------------------------------------------
-- Global request limiter for the apps' Claude calls.
--
-- Serverless instances share no memory, so per-instance counters can't bound
-- spend. kit_admit_ai() is one atomic check across every instance of every
-- app: per client per window, per app per UTC day, and all apps per UTC day.
-- A refused call changes no counter. The apps call it with a server-only
-- secret key before each Claude request and refuse to call Claude if it
-- can't answer (AI_REQUIRE_GLOBAL_LIMIT=1, set by AOS). It is not callable
-- with the public key, so nobody outside the apps can use up the counters.
-- The hard spend ceiling is the Anthropic workspace spend limit on the key.

create table if not exists public.kit_ai_usage (
  bucket     text primary key,
  n          integer not null,
  expires_at timestamptz not null
);
alter table public.kit_ai_usage enable row level security;
-- Only kit_admit_ai (SECURITY DEFINER) writes it; the service role may read
-- it (operator checks, the AOS end-to-end test). No API access otherwise.
revoke all on public.kit_ai_usage from anon, authenticated, service_role;
grant select on public.kit_ai_usage to service_role;

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
  v_until timestamptz;
begin
  -- NULLs would make every comparison below unknown, so reject them first.
  if p_app is null or p_client is null or p_client_cap is null or p_window_seconds is null
     or p_app_daily_cap is null or p_all_daily_cap is null
     or p_app !~ '^[a-z0-9-]{1,64}$' or p_client !~ '^[a-f0-9]{16,64}$'
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
    -- A retry can succeed only once every exhausted bucket has reset, so
    -- answer with the latest reset among them (the first check to fail may
    -- not be the last to clear: a window can end after midnight).
    declare
      v_window_full boolean := exists (select 1 from public.kit_ai_usage
        where bucket = 'c:' || p_app || ':' || p_client || ':' || v_win and n >= p_client_cap);
      v_daily_full boolean := exists (select 1 from public.kit_ai_usage
        where (bucket = 'a:' || p_app || ':' || v_day and n >= p_app_daily_cap)
           or (bucket = 'all:' || v_day and n >= p_all_daily_cap));
    begin
      v_until := greatest(  -- SQL syntax, not a function: unaffected by search_path
        case when v_window_full then v_wend end,
        case when v_daily_full then v_eod end,
        case when not v_window_full and not v_daily_full then v_wend end);
      return pg_catalog.jsonb_build_object(
        'ok', false,
        'reason', case when v_daily_full then 'daily' else 'rate' end,
        'retry_after', pg_catalog.ceil(extract(epoch from v_until - pg_catalog.now()))::integer);
    end;
  end;

  -- Expired buckets are dead weight; sweep a few now and then, skipping any
  -- row another request holds (so the sweep can never wait on admission).
  if pg_catalog.random() < 0.02 then
    delete from public.kit_ai_usage
      where bucket in (select bucket from public.kit_ai_usage
                        where expires_at < pg_catalog.now()
                        limit 500 for update skip locked);
  end if;
  return pg_catalog.jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.kit_admit_ai(text, text, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.kit_admit_ai(text, text, integer, integer, integer, integer) to service_role;
