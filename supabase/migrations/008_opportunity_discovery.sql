-- ============================================================
-- 008_opportunity_discovery.sql
-- Opportunity-discovery loop, Phase 1 (SPEC §3): private `ideas` and
-- `evaluation_runs`, owned by their author, with the nullable, human-gated
-- promotion hook to `opportunities`. Idea evaluation is a separate concept
-- from opportunities — see docs/aos/opportunity-engine/SPEC.md §1.
--
-- WRITE PATHS (the RLS design depends on these being explicit):
--   • ideas — INSERT/UPDATE by the signed-in author through an authed Server
--     Action; governed by the owner-scoped RLS policies below. NO client
--     DELETE (see the policy comment: deletion would cascade away the run
--     rows the spend guards count).
--     `promoted_opportunity_id` is written only by the Phase 5+ editorial
--     promotion surface via the service-role client. RLS cannot scope a
--     single column, so the guard_idea_promotion trigger below rejects any
--     change to it from the client roles (anon/authenticated) — a non-null
--     hook reads as "editorially promoted", a trust signal an author must
--     not be able to forge on their own row.
--   • evaluation_runs — ALL writes (insert `pending` → advance status →
--     persist verdict/brief) come from the pipeline via createServiceClient()
--     (lib/supabase/service.ts), which uses the service role and BYPASSES RLS.
--     That bypass is intentional and mirrors the existing cron/webhook write
--     pattern. There is deliberately NO user-facing write policy on
--     evaluation_runs: runs are append-only, pipeline-produced snapshots;
--     authenticated authors can only read their own.
-- ============================================================

-- ============================================================
-- IDEAS
-- ============================================================
create table public.ideas (
  id                uuid default uuid_generate_v4() primary key,
  created_at        timestamptz default now() not null,
  updated_at        timestamptz default now() not null,
  author_id         uuid references auth.users(id) on delete cascade not null,
  title             text not null,
  thesis            text not null,                      -- one-line
  space             text not null,                      -- space / category
  claimed_advantage text not null,                      -- founder's claimed unfair advantage
  links             jsonb default '[]'::jsonb not null, -- [{label,url}]
  -- Promotion hook (Phase 5+ writes this via the service role; see header):
  promoted_opportunity_id uuid references public.opportunities(id) on delete set null,
  -- (id, author_id) is trivially unique (id is the PK); this constraint exists
  -- so evaluation_runs can FK-pin the pair, making its denormalized author_id
  -- provably equal to the parent idea's author_id.
  constraint ideas_id_author_key unique (id, author_id)
);

create index ideas_author_idx on public.ideas (author_id, created_at desc);
create index ideas_promoted_opportunity_idx on public.ideas (promoted_opportunity_id)
  where promoted_opportunity_id is not null;

alter table public.ideas enable row level security;

-- Owner-scoped SELECT/INSERT/UPDATE — deliberately NO client DELETE policy.
-- Deleting an idea cascades to its evaluation_runs, which would let an owner
-- erase the very rows the route's spend guards count (the one-in-flight
-- unique index below and the hourly cap) — a self-service bypass. Deletion is
-- therefore a service-role act (account deletion cascades from auth.users;
-- an editorial soft-delete surface, if ever wanted, is Phase 5+). The split
-- policies still prevent cross-author touches and author_id re-attribution
-- (UPDATE carries both USING and WITH CHECK).
create policy "Authors read their own ideas"
  on public.ideas for select
  to authenticated
  using (auth.uid() = author_id);
create policy "Authors create their own ideas"
  on public.ideas for insert
  to authenticated
  with check (auth.uid() = author_id);
create policy "Authors update their own ideas"
  on public.ideas for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create trigger ideas_updated_at
  before update on public.ideas
  for each row execute procedure public.set_updated_at();

-- Column-level guard RLS can't express: promotion is an editorial act
-- performed by the service role (Phase 5+ surface). Client roles may not
-- set, change, or clear the hook — on their own rows or anyone's. The
-- ON DELETE SET NULL cascade from opportunities is unaffected: it runs as
-- the role deleting the opportunity, which RLS already restricts to the
-- service role (opportunities has no client delete policy).
create or replace function public.guard_idea_promotion()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated')
     and (
       (tg_op = 'INSERT' and new.promoted_opportunity_id is not null) or
       (tg_op = 'UPDATE' and new.promoted_opportunity_id is distinct from old.promoted_opportunity_id)
     )
  then
    raise exception 'promoted_opportunity_id is written only by the editorial promotion surface (service role)';
  end if;
  return new;
end;
$$;

create trigger ideas_guard_promotion
  before insert or update on public.ideas
  for each row execute procedure public.guard_idea_promotion();

-- ============================================================
-- EVALUATION RUNS
-- Append-only, point-in-time snapshots of a pipeline run (SPEC §4.7).
-- verdict_json is the source of truth; the flat columns are projections.
-- ============================================================
create table public.evaluation_runs (
  id                 uuid default uuid_generate_v4() primary key,
  created_at         timestamptz default now() not null,
  idea_id            uuid not null,
  -- Denormalized for RLS; pinned to the parent idea by the composite FK below,
  -- so it can never drift from ideas.author_id.
  author_id          uuid references auth.users(id) on delete cascade not null,
  status             text default 'pending' not null
                       check (status in ('pending','researching','scoring','complete','failed')),
  model              text,                        -- provenance, e.g. 'claude-opus-4-8'
  searches_performed integer default 0 not null check (searches_performed >= 0),
  -- Honesty gate, DB half (SPEC §7 layer 2): no greenfield-adjacent value is
  -- even storable. Occupancy lives inside verdict_json, validated by the Zod
  -- layer (lib/opportunity-engine/schema.ts) before any write.
  verdict            text
                       check (verdict in
                         ('pioneer','fast-follow-on-execution','build-for-intrinsic-use','dont-bother')),
  verdict_json       jsonb,                       -- full schema-validated Verdict (source of truth)
  brief_md           text,                        -- human-readable brief
  kill_condition     text,
  error              text,                        -- set when status = 'failed'
  started_at         timestamptz,
  completed_at       timestamptz,
  -- Structural ownership guarantee: the (idea_id, author_id) pair must exist
  -- in ideas as (id, author_id). Because ideas.id is the primary key, the
  -- matched row IS the parent idea — therefore author_id here always equals
  -- the parent idea's author_id, enforced by the database, not by the
  -- pipeline being careful. A service-role write with a mismatched author_id
  -- fails the FK instead of silently creating a cross-author leak.
  constraint evaluation_runs_idea_author_fkey
    foreign key (idea_id, author_id)
    references public.ideas (id, author_id)
    on delete cascade
);

create index evaluation_runs_idea_idx    on public.evaluation_runs (idea_id, created_at desc);
create index evaluation_runs_author_idx  on public.evaluation_runs (author_id, created_at desc);
create index evaluation_runs_verdict_idx on public.evaluation_runs (verdict);

-- Spend guard, structural half: at most ONE non-terminal ("in flight") run per
-- author, enforced by the database instead of a check-then-insert read (which
-- races). A partial-index predicate cannot contain now(), so staleness is
-- deliberately NOT part of the index — a crashed invocation's stuck
-- non-terminal row would otherwise wedge its author forever. Recovery is an
-- EXPLICIT state transition owned by the on-demand route: before inserting a
-- pending row it sweeps the author's non-terminal rows older than its duration
-- ceiling to failed('timeout'), so a unique violation on this index always
-- means a genuinely live run (→ 409), never a wedge.
create unique index evaluation_runs_one_in_flight_per_author
  on public.evaluation_runs (author_id)
  where status in ('pending','researching','scoring');

alter table public.evaluation_runs enable row level security;

-- Read-only for authors, and only their own runs. Because the composite FK
-- pins author_id to the parent idea's author, "my runs" and "runs on my
-- ideas" are the same set — no join needed in the policy.
create policy "Authors read their own runs"
  on public.evaluation_runs for select
  to authenticated
  using (auth.uid() = author_id);

-- No INSERT/UPDATE/DELETE policies on evaluation_runs: with RLS enabled and
-- no policy for a verb, that verb is denied for authenticated users. All run
-- writes go through the service-role client (see header comment).
