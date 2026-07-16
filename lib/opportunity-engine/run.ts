// Orchestrator (SPEC step 7). Two exports with deliberately different coupling:
//
//   • runEvaluation — the research→score→verdict chain. Stays DB-free so the eval
//     harness can call it directly with no Supabase dependency (research is
//     injectable for the eval cache).
//   • persistRun — the service-role write of a COMPLETED run to `evaluation_runs`.
//     Used by the on-demand route (SPEC step 9), never by the eval harness.
//
// RLS posture (mirrors supabase/migrations/008 header). `evaluation_runs` has RLS
// ON, a SELECT-only policy (`auth.uid() = author_id`), and NO insert/update/delete
// policy — so under RLS no authenticated/anon client can write a run at all. Every
// run write goes through createServiceClient(), which uses the service role and
// BYPASSES RLS (same trust boundary as the cron/webhook writers). Table posture is
// therefore system-write / author-read, NOT user-writable. The write-time integrity
// guard is not RLS but the composite FK (idea_id, author_id) → ideas(id, author_id):
// a run whose author_id doesn't match the parent idea's author fails the FK instead
// of silently creating a cross-author row. The caller passes the authenticated
// author's id; persistRun trusts it and the FK verifies it.

import { researchIdea } from "./research";
import { scoreIdea } from "./score";
import type { Idea, ResearchFn, Verdict } from "./schema";
import { createServiceClient } from "../supabase/service";
import type { Database } from "../../types/database";

export type RunOptions = {
  // Injected by the eval harness (a cache-wrapped live researcher). Defaults to
  // the live researcher; keeping it injectable is what lets the eval cache
  // research to disk without changing production behavior.
  research?: ResearchFn;
};

export async function runEvaluation(idea: Idea, opts: RunOptions = {}): Promise<Verdict> {
  const research = opts.research ?? researchIdea;
  const result = await research(idea);
  return scoreIdea(idea, result);
}

export type PersistRunInput = {
  ideaId: string; // real ideas.id (uuid) — the composite-FK target, NOT the eval slug
  authorId: string; // ideas.author_id (uuid); pinned to the idea by the composite FK
  verdict: Verdict; // validated result: carries evidence, occupancy, scores, verdict, kill_condition, brief
  model: string; // provenance, e.g. getModel()
  startedAt?: string; // ISO timestamp of when the run began (optional)
};

type EvaluationRunInsert = Database["public"]["Tables"]["evaluation_runs"]["Insert"];

/**
 * Write a COMPLETED evaluation run to `evaluation_runs` via the service-role
 * client. `verdict_json` is the source of truth; the flat columns (verdict,
 * searches_performed, kill_condition, brief_md) are projections for indexing and
 * listing (SPEC §4.7). Requires migration 008 applied and a real `ideas` row for
 * (ideaId, authorId) — otherwise the composite FK rejects the insert.
 *
 * Scope: this primitive records a terminal `complete` row. Status advancement
 * (pending → researching → scoring) and the failed-run path belong to the
 * on-demand route (SPEC step 9), which owns the run lifecycle.
 */
export async function persistRun(input: PersistRunInput): Promise<{ id: string }> {
  const { ideaId, authorId, verdict, model, startedAt } = input;
  const supabase = createServiceClient();

  const row: EvaluationRunInsert = {
    idea_id: ideaId,
    author_id: authorId,
    status: "complete",
    model,
    searches_performed: verdict.searches_performed,
    verdict: verdict.verdict,
    // The full Zod-validated Verdict is the source of truth. It is a plain JSON
    // value (strings/numbers/arrays/objects); TS can't prove that against the Json
    // union, so cast to the column's own type — this is a shape cast, not `any`.
    verdict_json: verdict as unknown as EvaluationRunInsert["verdict_json"],
    brief_md: verdict.brief_summary,
    kill_condition: verdict.kill_condition,
    started_at: startedAt ?? null,
    completed_at: new Date().toISOString(),
  };

  // supabase-js collapses typed .insert() args to `never` under this Database
  // type; the repo's established idiom is to cast the builder (see
  // lib/email/events.ts, app/(app)/commit/[id]/ship/page.tsx). `row` above stays
  // fully typed as the Insert shape — only this builder call is cast.
  const { data, error } = (await (supabase.from("evaluation_runs") as any)
    .insert(row)
    .select("id")
    .single()) as { data: { id: string } | null; error: { message: string } | null };

  if (error || !data) {
    throw new Error(
      `persistRun: failed to write evaluation_runs row: ${error?.message ?? "no row returned"}`,
    );
  }
  return { id: data.id };
}
