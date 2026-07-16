# HANDOFF.md — Opportunity-Discovery Loop, Resume State

> Where Phase 2 stands, anchored to git + code (not conversation memory).
> Branch: `feat/opportunity-engine-phase2`. Build order per `SPEC.md` §10.
> Last reconciled: 2026-07-15.

## TL;DR

The research→score→verdict **pipeline is built and committed**; the **honesty gate**
(schema.ts discriminated union + `deriveVerdict`) is its load-bearing core.
`persistRun()` (SPEC step 7's persistence half) is now **written but uncommitted**
in the working tree. Migration 008 is **written + committed but NOT applied**. The
eval has **not been run green** since the scoring fix landed — the committed
`EVAL_RESULTS.md` is a stale pre-fix red run. Nothing here has made a verified live
API pass yet; the eval is the spend gate.

## State by SPEC step

| SPEC step | What | Status |
|---|---|---|
| 1 | Honesty-gate schema + types (`schema.ts`, `deriveVerdict`, `types/database.ts` rows) | ✅ committed `4c824f7` |
| 2 | Eval harness + fixtures (`scripts/eval/run.ts`, `eval/ideas.ts`) | ✅ committed `4c824f7`; **+ cost-control `--limit`/`--only` this session (uncommitted)** |
| 3 | Deps + env (`@anthropic-ai/sdk`, `tsx`, `.env.example`) | ✅ committed `4c824f7`; deps installed |
| 4 | Anthropic client (`client.ts`) | ✅ committed `4c824f7` |
| 5 | Research stage — web_search sweep + evidence extraction (`research.ts`) | ✅ committed `4c824f7` (runtime-unverified) |
| 6 | Score+verdict stage (`score.ts`) — index-grounded incumbents, rubric reconcile | ✅ committed `4c824f7` (runtime-unverified; **eval not yet green**) |
| 7a | Orchestrator `runEvaluation` (DB-free chain) | ✅ committed `4c824f7` |
| 7b | **Persistence `persistRun()`** — service-role write to `evaluation_runs` | 🟡 **built this session, UNCOMMITTED** (`run.ts`) |
| 8 | Migration `008_opportunity_discovery.sql` (ideas + evaluation_runs + RLS + guard) | ✅ committed `4c824f7`; **NOT applied** to Supabase |
| 9 | On-demand route (`app/api/discovery/runs`) | ❌ not built |
| 10 | Minimal UI (`app/(app)/discovery/*`) | ❌ not built |
| 11 | End-to-end verify | ❌ not done |

**Contradiction that prompted this reconcile:** commit `4c824f7` is titled "SPEC
steps 5-7," but step 7 is "orchestrator **+ persistence**." Only the orchestrator
landed; `runEvaluation` is intentionally DB-free (see `run.ts` header) and
`persistRun` was deferred. So "steps 1–7 committed" and "persistRun is new work"
were both partly true — the commit over-claimed by exactly one function.

## Uncommitted working-tree changes (this session)

- `lib/opportunity-engine/run.ts` — added `persistRun(input): Promise<{id}>` writing
  a terminal `complete` row to `evaluation_runs` via `createServiceClient()`.
  `runEvaluation` stays DB-free.
- `scripts/eval/run.ts` — `--limit N` / `--only id,id` (+ `EVAL_LIMIT` / `EVAL_ONLY`)
  so a single-case smoke replaces the ~$10 full five-idea run. Subset runs write
  `EVAL_RESULTS.partial.md` (gitignored) and never clobber the canonical file.
- `.gitignore` — ignore `EVAL_RESULTS.partial.md`.
- Typechecks clean (`npx tsc --noEmit` → 0). No live API call has been made.

## persistRun verification boundary (read before assuming the eval covers it)

The eval harness is **DB-free by design** and **does not call `persistRun`** — its
fixtures use slug ids (`agent-payments`) with no `ideas` row and no author, which
cannot satisfy `evaluation_runs`' composite FK. So **`npm run eval` verifies the
pipeline, not persistence.** `persistRun`'s DB write is exercised only by:
- the on-demand route (step 9, **unbuilt**), or
- a dedicated persist-probe (would need: migration 008 applied, a real `ideas`
  row with a real author uuid, and Supabase service creds — none present locally).

`persistRun` is verified to **compile** against the real generated schema; its
runtime write is a **known-untested** path until step 9 or a probe exists.

## RLS posture of `evaluation_runs` (a real trust boundary — review before shipping)

- **System-write / author-read.** RLS is ON. There is a SELECT policy
  (`auth.uid() = author_id`) and **no** insert/update/delete policy — so under RLS
  no authenticated/anon client can write a run. All writes go through the
  **service-role client, which BYPASSES RLS** (same boundary as cron/webhooks).
- **Integrity is enforced by the composite FK**, not RLS: `(idea_id, author_id) →
  ideas(id, author_id)`. A run whose `author_id` ≠ the parent idea's author fails
  the FK rather than silently creating a cross-author row. `persistRun` trusts the
  caller-supplied `authorId`; the FK verifies it.
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

## Human batch (one sitting; needs the local `ANTHROPIC_API_KEY`, already present)

1. **Apply migration 008** in the Supabase SQL editor (paste
   `supabase/migrations/008_opportunity_discovery.sql`). Deps `set_updated_at` +
   `uuid_generate_v4` exist from migration 001, so it applies cleanly on 001–007.
2. **Smoke (cheap):** `OPPORTUNITY_ENGINE_MODEL=claude-sonnet-5 npm run eval -- --only agent-payments`
   → ~$1. Verifies the pipeline runs live and the honesty gate holds on the canonical
   occupied-space case. Writes `EVAL_RESULTS.partial.md`.
3. **Full run (Opus default):** `npm run eval` → ~$10. Regenerates the canonical
   `EVAL_RESULTS.md`; iterate `score.ts` until all five reproduce ground truth.

## Next (after the batch)

- Decide how to verify `persistRun` at runtime (route vs probe) — see boundary above.
- Build step 9 (on-demand route) + step 10 (UI). Read the frontend-design skill first.
- Commit the working-tree changes to the branch when ready (not yet committed; no PR — Phase 2 stays on its branch).
