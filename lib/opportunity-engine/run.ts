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
  // When set, finalize this existing row (the route's pending→…→complete
  // lifecycle) instead of inserting a fresh terminal row (the probe's path).
  runId?: string;
};

type EvaluationRunInsert = Database["public"]["Tables"]["evaluation_runs"]["Insert"];
type EvaluationRunUpdate = Database["public"]["Tables"]["evaluation_runs"]["Update"];

// Non-terminal statuses. A run in one of these states is "in flight". The
// partial unique index evaluation_runs_one_in_flight_per_author (migration
// 008) allows at most one such row per author; the route sweeps stale ones to
// failed('timeout') before inserting, so a unique violation always means a
// genuinely live run.
const IN_FLIGHT_STATUSES = ["pending", "researching", "scoring"] as const;

const IN_FLIGHT_INDEX = "evaluation_runs_one_in_flight_per_author";

/**
 * The author already has a live (non-terminal, post-sweep) run — the pending
 * insert hit the partial unique index. The route maps this to 409.
 */
export class RunInFlightError extends Error {
  readonly code = "RUN_IN_FLIGHT";
  constructor() {
    super("an evaluation run is already in flight for this author");
    this.name = "RunInFlightError";
  }
}

/**
 * Insert a `pending` evaluation_runs row via the service-role client — the
 * start of the route-owned lifecycle (SPEC step 9). Two constraints fire
 * here, before any API spend: the composite FK (idea_id, author_id) →
 * ideas(id, author_id) rejects a mismatched pair, and the one-in-flight
 * partial unique index rejects a second live run for the author (surfaced as
 * RunInFlightError so the route can 409 instead of 500).
 */
export async function createPendingRun(input: {
  ideaId: string;
  authorId: string;
  model: string;
}): Promise<{ id: string }> {
  const supabase = createServiceClient();
  const row: EvaluationRunInsert = {
    idea_id: input.ideaId,
    author_id: input.authorId,
    status: "pending",
    model: input.model,
    started_at: new Date().toISOString(),
  };
  const { data, error } = (await (supabase.from("evaluation_runs") as any)
    .insert(row)
    .select("id")
    .single()) as {
    data: { id: string } | null;
    error: { code?: string; message: string; details?: string } | null;
  };
  if (error) {
    // 23505 = unique_violation. Only the one-in-flight index can realistically
    // fire (the PK is a fresh uuid); require its name so an unrelated future
    // unique constraint doesn't silently masquerade as "in flight".
    if (
      error.code === "23505" &&
      `${error.message} ${error.details ?? ""}`.includes(IN_FLIGHT_INDEX)
    ) {
      throw new RunInFlightError();
    }
    throw new Error(`createPendingRun: failed to insert pending run: ${error.message}`);
  }
  if (!data) {
    throw new Error("createPendingRun: failed to insert pending run: no row returned");
  }
  return { id: data.id };
}

/**
 * Recovery as an explicit state transition (see the index comment in
 * migration 008): mark the author's non-terminal runs older than
 * `staleBeforeIso` as failed('timeout'). Called by the route immediately
 * before the pending insert, so a stuck row from a killed invocation can
 * never wedge its author, and a subsequent unique violation is proof of a
 * genuinely live run. Returns how many rows were swept.
 */
export async function sweepStaleRuns(authorId: string, staleBeforeIso: string): Promise<number> {
  const supabase = createServiceClient();
  const patch: EvaluationRunUpdate = {
    status: "failed",
    error: "timeout: run exceeded the route duration ceiling and was swept",
    completed_at: new Date().toISOString(),
  };
  const { data, error } = (await (supabase.from("evaluation_runs") as any)
    .update(patch)
    .eq("author_id", authorId)
    .in("status", [...IN_FLIGHT_STATUSES])
    .lt("created_at", staleBeforeIso)
    .select("id")) as { data: { id: string }[] | null; error: { message: string } | null };
  if (error) {
    throw new Error(`sweepStaleRuns: ${error.message}`);
  }
  return data?.length ?? 0;
}

/**
 * The author's live non-terminal run, if any. Post-sweep the one-in-flight
 * index guarantees at most one. Used only to name the blocking run in the
 * route's 409 body.
 */
export async function findLiveRun(authorId: string): Promise<{ id: string } | null> {
  const supabase = createServiceClient();
  const { data, error } = (await (supabase.from("evaluation_runs") as any)
    .select("id")
    .eq("author_id", authorId)
    .in("status", [...IN_FLIGHT_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: { id: string } | null; error: { message: string } | null };
  if (error) {
    throw new Error(`findLiveRun: ${error.message}`);
  }
  return data;
}

/**
 * Runs created by the author since `sinceIso`, any status — each one
 * represented potential spend. Backs the route's per-author hourly cap.
 */
export async function countRecentRuns(authorId: string, sinceIso: string): Promise<number> {
  const supabase = createServiceClient();
  const { count, error } = (await (supabase.from("evaluation_runs") as any)
    .select("id", { count: "exact", head: true })
    .eq("author_id", authorId)
    .gte("created_at", sinceIso)) as { count: number | null; error: { message: string } | null };
  if (error) {
    throw new Error(`countRecentRuns: ${error.message}`);
  }
  return count ?? 0;
}

/**
 * Advance a run's non-terminal status (researching → scoring). Scoped to
 * in-flight rows so terminal states are immutable: a zombie invocation whose
 * row was swept to failed can never resurrect it — the update matches zero
 * rows and this throws, converging the zombie to a scrubbed 500.
 */
export async function advanceRunStatus(
  runId: string,
  status: "researching" | "scoring",
): Promise<void> {
  const supabase = createServiceClient();
  const patch: EvaluationRunUpdate = { status };
  const { data, error } = (await (supabase.from("evaluation_runs") as any)
    .update(patch)
    .eq("id", runId)
    .in("status", [...IN_FLIGHT_STATUSES])
    .select("id")) as { data: { id: string }[] | null; error: { message: string } | null };
  if (error) {
    throw new Error(`advanceRunStatus(${status}): ${error.message}`);
  }
  if (!data?.length) {
    throw new Error(
      `advanceRunStatus(${status}): run ${runId} is no longer live (swept or finished)`,
    );
  }
}

/**
 * Mark a run terminally failed with its (already-scrubbed) message. Scoped to
 * in-flight rows; a run that is already terminal (swept, or completed) is left
 * untouched — best-effort cleanup, so zero matches is a no-op, not an error.
 */
export async function failRun(runId: string, message: string): Promise<void> {
  const supabase = createServiceClient();
  const patch: EvaluationRunUpdate = {
    status: "failed",
    error: message,
    completed_at: new Date().toISOString(),
  };
  const { error } = (await (supabase.from("evaluation_runs") as any)
    .update(patch)
    .eq("id", runId)
    .in("status", [...IN_FLIGHT_STATUSES])) as { error: { message: string } | null };
  if (error) {
    throw new Error(`failRun: ${error.message}`);
  }
}

/**
 * Write a COMPLETED evaluation run to `evaluation_runs` via the service-role
 * client. `verdict_json` is the source of truth; the flat columns (verdict,
 * searches_performed, kill_condition, brief_md) are projections for indexing and
 * listing (SPEC §4.7). Requires migration 008 applied and a real `ideas` row for
 * (ideaId, authorId) — otherwise the composite FK rejects the insert.
 *
 * Scope: this primitive records a terminal `complete` state. With `runId` it
 * finalizes that existing row (the route's pending→…→complete lifecycle); the
 * update is scoped to (id, author_id) so a mismatched author finalizes
 * nothing. Without `runId` it inserts a fresh terminal row (the probe's path),
 * where the composite FK rejects a cross-author pair.
 */
export async function persistRun(input: PersistRunInput): Promise<{ id: string }> {
  const { ideaId, authorId, verdict, model, startedAt, runId } = input;
  const supabase = createServiceClient();

  const terminal = {
    status: "complete" as const,
    model,
    searches_performed: verdict.searches_performed,
    verdict: verdict.verdict,
    // The full Zod-validated Verdict is the source of truth. It is a plain JSON
    // value (strings/numbers/arrays/objects); TS can't prove that against the Json
    // union, so cast to the column's own type — this is a shape cast, not `any`.
    verdict_json: verdict as unknown as EvaluationRunInsert["verdict_json"],
    brief_md: verdict.brief_summary,
    kill_condition: verdict.kill_condition,
    // A completed run has no error by construction; explicit null keeps the
    // terminal state self-consistent even if a future path sets error earlier.
    error: null,
    completed_at: new Date().toISOString(),
  };

  // supabase-js collapses typed .insert()/.update() args to `never` under this
  // Database type; the repo's established idiom is to cast the builder (see
  // lib/email/events.ts, app/(app)/commit/[id]/ship/page.tsx). The row objects
  // stay fully typed as Insert/Update shapes — only the builder call is cast.
  if (runId) {
    const patch: EvaluationRunUpdate = terminal;
    // Scoped to (id, idea_id, author_id) AND in-flight status: terminal
    // states are immutable, so a zombie invocation can never finalize a row
    // the sweep already failed — zero matches throws and the verdict is
    // discarded (the scrubbed-500 path), which is the correct outcome.
    const { data, error } = (await (supabase.from("evaluation_runs") as any)
      .update(patch)
      .eq("id", runId)
      .eq("idea_id", ideaId)
      .eq("author_id", authorId)
      .in("status", [...IN_FLIGHT_STATUSES])
      .select("id")
      .single()) as { data: { id: string } | null; error: { message: string } | null };
    if (error || !data) {
      throw new Error(
        `persistRun: failed to finalize run ${runId}: ${
          error?.message ?? "no matching live row (swept or already terminal)"
        }`,
      );
    }
    return { id: data.id };
  }

  const row: EvaluationRunInsert = {
    ...terminal,
    idea_id: ideaId,
    author_id: authorId,
    started_at: startedAt ?? null,
  };
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
