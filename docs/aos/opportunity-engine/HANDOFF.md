# HANDOFF.md — Opportunity-Discovery Loop, Resume State

> Where Phase 2 stands, anchored to git + code (not conversation memory).
> Branch: `feat/opportunity-engine-phase2`. Build order per `SPEC.md` §10.
> Last reconciled: 2026-07-15.

## TL;DR

The research→score→verdict **pipeline is built and committed**; the **honesty gate**
(schema.ts discriminated union + `deriveVerdict`) is its load-bearing core.
`persistRun()` (SPEC step 7's persistence half) is committed (`43b8ba6`), the
**persist-probe** (`scripts/eval/persist-probe.ts`, committed `bed1f6f`) is the only
thing that verifies its DB write — the eval does not. The **step-9 on-demand route**
(`app/api/discovery/runs`) is now **built with its security-posture pass done at
build time** (see the step-9 section) and boundary-verified by a $0 **route-probe**;
its live pass is the human batch's final step. Migration 008 is **written + committed
but NOT applied**, so no probe or real run has touched the DB yet. The eval has
**not been run green** since the scoring fix landed — the committed `EVAL_RESULTS.md`
is a stale pre-fix red run. Nothing here has made a verified live API pass yet; the
eval is the spend gate.

## State by SPEC step

| SPEC step | What | Status |
|---|---|---|
| 1 | Honesty-gate schema + types (`schema.ts`, `deriveVerdict`, `types/database.ts` rows) | ✅ committed `4c824f7` |
| 2 | Eval harness + fixtures (`scripts/eval/run.ts`, `eval/ideas.ts`) | ✅ committed `4c824f7`; cost-control `--limit`/`--only` committed `43b8ba6` |
| 3 | Deps + env (`@anthropic-ai/sdk`, `tsx`, `.env.example`) | ✅ committed `4c824f7`; deps installed |
| 4 | Anthropic client (`client.ts`) | ✅ committed `4c824f7` |
| 5 | Research stage — web_search sweep + evidence extraction (`research.ts`) | ✅ committed `4c824f7` (runtime-unverified) |
| 6 | Score+verdict stage (`score.ts`) — index-grounded incumbents, rubric reconcile | ✅ committed `4c824f7` (runtime-unverified; **eval not yet green**) |
| 7a | Orchestrator `runEvaluation` (DB-free chain) | ✅ committed `4c824f7` |
| 7b | **Persistence `persistRun()`** — service-role write to `evaluation_runs` | ✅ committed `43b8ba6`; runtime-unverified until the probe runs on an applied 008 |
| 8 | Migration `008_opportunity_discovery.sql` (ideas + evaluation_runs + RLS + guard) | ✅ committed `4c824f7`; **NOT applied** to Supabase |
| 9 | On-demand route (`app/api/discovery/runs`) | ✅ built (security-posture pass done at build time; see the step-9 section below); runtime-unverified until the human batch's route step |
| 10 | Minimal UI (`app/(app)/discovery/*`) | ❌ not built |
| 11 | End-to-end verify | ❌ not done |

**Contradiction that prompted this reconcile:** commit `4c824f7` is titled "SPEC
steps 5-7," but step 7 is "orchestrator **+ persistence**." Only the orchestrator
landed; `runEvaluation` is intentionally DB-free (see `run.ts` header) and
`persistRun` was deferred. So "steps 1–7 committed" and "persistRun is new work"
were both partly true — the commit over-claimed by exactly one function.

## Working-tree state (this session)

**Committed to the branch in `43b8ba6`** ("add persistRun + eval cost-control flags"):
- `lib/opportunity-engine/run.ts` — `persistRun(input): Promise<{id}>` writes a
  terminal `complete` row to `evaluation_runs` via `createServiceClient()`.
  `runEvaluation` stays DB-free.
- `scripts/eval/run.ts` — `--limit N` / `--only id,id` (+ `EVAL_LIMIT` / `EVAL_ONLY`)
  so a single-case smoke replaces the ~$10 full five-idea run. Subset runs write
  `EVAL_RESULTS.partial.md` (gitignored) and never clobber the canonical file.
- `.gitignore` — ignore `EVAL_RESULTS.partial.md`.

**Committed in `bed1f6f`** ("add persist-probe for the evaluation_runs write path"):
- `scripts/eval/persist-probe.ts` + the `eval:persist-probe` script in `package.json`
  — see the verification-boundary section below.

**Step-9 route work (this session):**
- `app/api/discovery/runs/route.ts` — the on-demand route (see the step-9 section).
- `lib/opportunity-engine/run.ts` — lifecycle primitives (`createPendingRun`,
  `advanceRunStatus`, `failRun`, `findInFlightRun`) + `persistRun` optional `runId`.
- `scripts/eval/route-probe.ts` + the `eval:route-probe` script — $0 boundary probe.

Typechecks + lint clean. No live API call has been made.

## persistRun verification boundary (read before assuming the eval covers it)

The eval harness is **DB-free by design** and **does not call `persistRun`** — its
fixtures use slug ids (`agent-payments`) with no `ideas` row and no author, which
cannot satisfy `evaluation_runs`' composite FK. So **`npm run eval` verifies the
pipeline, not persistence.**

The **persist-probe now covers that gap**: `scripts/eval/persist-probe.ts`
(`npm run eval:persist-probe`, **$0** — a fixture Verdict, no Anthropic call). It:
- **(a)** creates a real auth user + `ideas` row, calls `persistRun`, reads the run
  back, and asserts `verdict_json` round-trips AND every flat projection (verdict,
  searches_performed, kill_condition, brief_md, model, status, started_at) matches;
- **(b)** attempts a **cross-author** write (a second real auth user who owns no idea)
  and asserts it is REJECTED — reporting SQLSTATE `23503` + the constraint name to
  prove the rejector is the **composite FK `evaluation_runs_idea_author_fkey`**, NOT
  the `guard_idea_promotion` trigger (that trigger is on `ideas.promoted_opportunity_id`
  and never runs for an `evaluation_runs` insert).

It creates and tears down its own fixtures (an auth-user delete cascades to ideas +
runs) and is idempotent. **Prerequisites: migration 008 applied + Supabase service
creds in the env.** Locally it is **typecheck-clean and fixture-validated**, but the
live-DB assertions have **not** been run here (no local Supabase creds) — that is
step 2 of the human batch. Absent the probe run, `persistRun` is verified only to
**compile** against the generated schema.

## RLS posture of `evaluation_runs` (a real trust boundary — review before shipping)

- **System-write / author-read.** RLS is ON. There is a SELECT policy
  (`auth.uid() = author_id`) and **no** insert/update/delete policy — so under RLS
  no authenticated/anon client can write a run. All writes go through the
  **service-role client, which BYPASSES RLS** (same boundary as cron/webhooks).
- **Integrity is enforced by the composite FK**, not RLS: `(idea_id, author_id) →
  ideas(id, author_id)`. A run whose `author_id` ≠ the parent idea's author fails
  the FK rather than silently creating a cross-author row. `persistRun` trusts the
  caller-supplied `authorId`; the FK verifies it.
- **What the composite FK does NOT prove — the step-9 gap.** The FK guarantees a run's
  `author_id` equals its parent idea's *true owner* — internal consistency only. It
  does **not** verify that the *authenticated requester* owns the idea:
  `(someone-else's-idea, that-idea's-real-owner)` is a valid pair the FK happily
  accepts. `persistRun` trusts its `authorId` argument. So **the on-demand route (SPEC
  step 9) MUST independently verify the authenticated user owns the supplied `ideaId`
  before calling `persistRun`** — otherwise a requester could trigger/attribute a run
  on an idea they don't own. **Step 9 ships only after a security-posture pass on this
  ownership check.**
- `ideas` is the opposite posture — owner SELECT/INSERT/UPDATE via RLS, with a
  `guard_idea_promotion` trigger blocking client roles from forging
  `promoted_opportunity_id`, and deliberately **no client DELETE**: deleting an
  idea cascades to its runs, which would let an owner erase the rows the spend
  guards count (freeing the one-in-flight slot and resetting the hourly cap).
  Deletion is a service-role act (account deletion cascades from auth.users —
  which is also what keeps the persist-probe's cleanup working).

## Step 9: the on-demand route (`app/api/discovery/runs`) — posture as built

`POST {ideaId}` → pending run → `researching` → `scoring` → terminal
`complete`/`failed`. `runtime = "nodejs"`, `maxDuration = 300` (assumes Fluid
Compute, Vercel's default since 2025; a legacy 60s cap kills the invocation
mid-run and the stale window below un-wedges the author). Closes the ownership
gap flagged above:

- **Ownership is structural, not compared.** The idea is read through the
  user-scoped (RLS) client — the row coming back IS the proof the requester
  owns it. No service-role read + manual author compare exists. Absent and
  not-owned are the same 404 (no existence oracle).
- **`authorId` = session, never body.** Every service-role write receives the
  session user id; body-supplied decoys are ignored (probed). The composite FK
  stays behind it as defense-in-depth and re-checks the pair at the pending
  insert, before any Anthropic spend.
- **Spend guard (each run ≈ $2), two layers — the former race is CLOSED:**
  1. *Structural:* the partial unique index
     `evaluation_runs_one_in_flight_per_author` (amended into 008 — 008 has
     never been applied, so no 009) allows at most one non-terminal run per
     author. The old check-then-insert read is gone. An index predicate cannot
     contain `now()`, so staleness is deliberately not in the index — instead
     **recovery is an explicit state transition**: the route sweeps the
     author's non-terminal rows older than `STALE_AFTER_MS` (10 min) to
     `failed('timeout…')` immediately before the pending insert, so a unique
     violation (surfaced as `RunInFlightError`) always means a genuinely live
     run → 409 naming it. A crashed invocation can therefore never wedge its
     author.
  2. *Soft:* a per-author hourly cap — runs created in the last hour (any
     status; each represented potential spend) ≥ cap → 429. Default 5,
     tunable via `OPPORTUNITY_ENGINE_MAX_RUNS_PER_HOUR`. The count read races
     in principle, but the index bounds concurrent damage to one run.
- **Failure detail is scrubbed.** The author-readable `error` column gets a
  generic per-stage message (`validation|research|scoring|persistence stage
  failed`, or the sweep's `timeout…`); full detail (stack included) goes to
  server logs only. Nothing internal crosses the wire (500 carries only the
  run id).
- **Terminal states are immutable (audit fix).** `advanceRunStatus`,
  `failRun`, and `persistRun`'s finalize path are all scoped to in-flight
  statuses: a zombie invocation whose row the sweep failed can never
  resurrect it to researching/scoring or finalize it to complete — the update
  matches zero rows, the zombie converges to a scrubbed 500, and its verdict
  is discarded (correct: the author already started a replacement run).
  `persistRun`'s terminal patch also sets `error: null` so a complete row can
  never carry a stale error string.
- **No client DELETE on `ideas` (audit fix).** The `for all` policy was split
  into select/insert/update: an owner deleting their idea would cascade away
  its runs, freeing the one-in-flight index slot mid-spend and resetting the
  hourly cap — an unbounded self-service bypass of both guards. Chosen over
  `on delete restrict` on the composite FK because restrict would hazard the
  auth.users→ideas cascade that account deletion and the persist-probe's
  cleanup rely on.
- **Posture notes (recorded decisions, not open items):** CSRF — Supabase's
  SameSite=Lax cookies are the app-wide story; acceptable for the
  single-founder target and consistent with every other mutating route. Run
  ids stay internal-only (minted server-side within the same request); the
  status-scoping above now also covers the bare-id concern. Pre-lifecycle
  infra failures (ownership read, cap count, sweep, pending insert) are
  logged server-side by the POST wrapper and return a bare 500. Two live
  checks remain platform-trust items for the human batch: `maxDuration`
  being a hard kill (Fluid Compute), and PostgREST naming the in-flight
  index in its 23505 error (the free "second POST → 409" check proves it —
  a 500 there instead means the name detection needs a look; either way no
  spend and no corruption).
- **Lifecycle primitives live in `run.ts`** (`createPendingRun` — throws
  `RunInFlightError` on the index, `advanceRunStatus`, `failRun`,
  `sweepStaleRuns`, `findLiveRun`, `countRecentRuns`); `persistRun`'s optional
  `runId` finalizes the existing row (update scoped to
  `(id, idea_id, author_id)`) — its no-`runId` insert path (the
  persist-probe's) is unchanged and writes only terminal `complete` rows,
  which the in-flight index (non-terminal predicate) never touches —
  verified, not assumed.
- **Verified by `scripts/eval/route-probe.ts`** (`npm run eval:route-probe`,
  **$0** — handler driven through fakes, no Supabase/Anthropic/network):
  400 / 401 / 404 / 429 / 409 boundaries each leave the engine un-invoked;
  the 409 path asserts sweep-before-insert ordering and the live-run 409
  body (including the finished-in-between edge); happy path asserts the exact
  lifecycle order and session-derived authorId; engine failure asserts the
  generic row message with full detail reaching only the log sink; an infra
  failure of the ownership read throws (→ bare 500), never masquerading as
  404. This is the ceiling without live creds — the route's live pass is the
  human batch's final step.

## Eval + spend model

- **Cost gate:** the full five-idea eval is live web_search + LLM scoring per idea;
  the last full run cost ~$10 and hit the API cap.
- **Cheap now:** `npm run eval -- --only agent-payments` (one case). Smaller levers:
  `OPPORTUNITY_ENGINE_MODEL=claude-sonnet-5` (cheaper model),
  `OPPORTUNITY_ENGINE_MAX_SEARCHES=6` (fewer searches per sweep).
- **Research cache:** `eval/.cache/<id>.json` (gitignored) holds 4 of 5 ideas from
  the pre-fix run; on read they revalidate against `ResearchResultSchema` or fall
  back to a live sweep. Delete a file to force a clean live sweep for that idea.
- **Committed `EVAL_RESULTS.md` is STALE** (2026-07-08, all-error/cap) — predates
  the `score.ts` grounding fix. A green run has not been recorded.

## Human batch (one sitting)

**The eval does NOT exercise persistence** (it is DB-free; see the verification-boundary
section). Persistence is proven by the **probe** (steps 1–2); the eval **smoke** (step 3)
proves the live pipeline. They are independent — the probe needs Supabase service creds,
the smoke needs `ANTHROPIC_API_KEY` (already present). Do them in order:

1. **Apply migration 008** — **$0** — prerequisite for the **PROBE**, not for the eval.
   In the Supabase SQL editor, paste `supabase/migrations/008_opportunity_discovery.sql`.
   Deps `set_updated_at` + `uuid_generate_v4` exist from migration 001, so it applies
   cleanly on 001–007. **008 now also creates the one-in-flight partial unique index**
   (`evaluation_runs_one_in_flight_per_author`) — it was amended in place because 008
   has never been applied anywhere; there is deliberately no 009.
2. **Run the probe** — **$0** — the only thing that verifies persistence:
   ```
   npm run eval:persist-probe
   ```
   Asserts the happy-path write + read-back AND that a cross-author write is rejected by
   the composite FK (needs `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; no
   Anthropic call).
3. **Sonnet smoke** — **~$1** — verifies the pipeline runs **live**. Clear the cached
   research for the case first, or it replays from disk and never hits the API:
   ```
   rm -f eval/.cache/agent-payments.json
   OPPORTUNITY_ENGINE_MODEL=claude-sonnet-5 npm run eval -- --only agent-payments
   ```
   Writes `EVAL_RESULTS.partial.md` (canonical `EVAL_RESULTS.md` untouched).
4. **Route runtime pass** — **~$1** with the Sonnet override (≈ **$2** on the default
   Opus) — the only live verification of the step-9 route (the route-probe is $0
   and fake-driven). Needs 008 applied (step 1) + real Supabase creds + `ANTHROPIC_API_KEY`:
   ```
   -- (a) Supabase SQL editor: create an idea owned by you, note the returned id
   insert into ideas (author_id, title, thesis, space, claimed_advantage)
   values ((select id from auth.users where email = 'joshf5252@gmail.com'),
           'Route smoke idea', 'one-line thesis', 'some space', 'my edge')
   returning id;
   ```
   ```
   # (b) run the app locally on the cheap model
   OPPORTUNITY_ENGINE_MODEL=claude-sonnet-5 npm run dev
   ```
   ```js
   // (c) sign in at http://localhost:3000, then in the devtools console
   // (session cookies attach automatically):
   await fetch("/api/discovery/runs", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ ideaId: "<id from (a)>" }),
   }).then(r => r.json());
   ```
   Expect `{runId, status: "complete", verdict, searchesPerformed}` after ~1–3
   min and a matching `complete` row in `evaluation_runs` (verdict_json + flat
   projections). Optional free checks while it runs: a second POST → 409
   `run_in_flight` naming the live run (this is the one-in-flight index firing,
   not a timing read); a POST with a random uuid → 404; signed-out fetch → 401;
   a 6th run inside an hour → 429 `rate_limited` (cap tunable via
   `OPPORTUNITY_ENGINE_MAX_RUNS_PER_HOUR`, default 5).

## Next (after the batch)

- **Full canonical run** once the smoke is green: `npm run eval` → ~$10. Regenerates
  `EVAL_RESULTS.md`; iterate `score.ts` until all five reproduce ground truth.
- Build step 10 (minimal UI: intake form + run status/brief view). Step 9 is done —
  the route's posture and its residual gaps are recorded in the step-9 section. Read
  the frontend-design skill before the UI.
- No PR — Phase 2 stays on its branch until the phase is done.
