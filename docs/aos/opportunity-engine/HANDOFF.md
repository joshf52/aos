# HANDOFF.md — Opportunity-Discovery Loop, Resume State

> Where Phase 2 stands, anchored to git + code (not conversation memory).
> Branch: `feat/opportunity-engine-phase2`. Build order per `SPEC.md` §10.
> Last reconciled: 2026-07-15.

## TL;DR

The research→score→verdict **pipeline is built and committed**; the **honesty gate**
(schema.ts discriminated union + `deriveVerdict`) is its load-bearing core.
`persistRun()` (SPEC step 7's persistence half) is now **committed** (`43b8ba6`), and
a **persist-probe** (`scripts/eval/persist-probe.ts`) is the only thing that verifies
its DB write — the eval does not. Migration 008 is **written + committed but NOT
applied**, so neither the probe nor a real run has touched the DB yet. The eval has
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
| 9 | On-demand route (`app/api/discovery/runs`) | ❌ not built — **needs a security-posture pass first**: must verify the requester owns `ideaId` (the FK does not; see RLS posture) |
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

**Uncommitted (persist-probe work, this session):**
- `scripts/eval/persist-probe.ts` + the `eval:persist-probe` script in `package.json`
  — see the verification-boundary section below.
- These HANDOFF.md edits (CURRENT_STATE.md was already committed in `43b8ba6`).

Typechecks clean (`npx tsc --noEmit` → 0). No live API call has been made.

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
- `ideas` is the opposite posture — owner CRUD via RLS, plus a `guard_idea_promotion`
  trigger blocking client roles from forging `promoted_opportunity_id`.

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
   cleanly on 001–007.
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

## Next (after the batch)

- **Full canonical run** once the smoke is green: `npm run eval` → ~$10. Regenerates
  `EVAL_RESULTS.md`; iterate `score.ts` until all five reproduce ground truth.
- Build step 9 (on-demand route) + step 10 (UI). **Step 9 needs a security-posture pass
  first** — it must verify the authenticated requester owns `ideaId` before calling
  `persistRun` (the composite FK does not; see RLS posture). Read the frontend-design
  skill before the UI.
- Commit the persist-probe + these doc edits to the branch when ready (no PR — Phase 2
  stays on its branch).
