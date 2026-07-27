// On-demand evaluation route (SPEC step 9): POST {ideaId} → pending run →
// researching → scoring → terminal complete (verdict + projections) or failed.
// Synchronous by design — one founder dogfooding, the UI polls the run row via
// the author-only RLS SELECT (a real job queue is Phase 5+).
//
// SECURITY POSTURE (HANDOFF.md "RLS posture" — read before changing):
//   • Ownership is proven STRUCTURALLY: the idea is read through the
//     user-scoped (RLS) client, whose policy is `auth.uid() = author_id`. A
//     row coming back IS the proof the requester owns the idea. There is
//     deliberately no service-role read + manual author compare.
//   • authorId passed to the service-role writers comes from the auth
//     session, never the request body. The composite FK
//     (idea_id, author_id) → ideas(id, author_id) stays behind it as
//     defense-in-depth: a bug here still cannot mint a cross-author row.
//   • Each run is real Anthropic spend (~$2). Two spend guards:
//     (1) One in-flight run per author, enforced STRUCTURALLY by the partial
//         unique index evaluation_runs_one_in_flight_per_author (008) — not
//         by a check-then-insert read, which races. The index predicate can't
//         express staleness, so recovery is an explicit transition: the route
//         sweeps the author's stale non-terminal rows to failed('timeout')
//         before inserting; a unique violation on the insert therefore always
//         means a genuinely live run → 409.
//     (2) A per-author hourly cap (count query → 429), default 5, tunable via
//         OPPORTUNITY_ENGINE_MAX_RUNS_PER_HOUR. Soft guard — the count read
//         races in principle, but the index bounds concurrent damage to one.

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getModel } from "@/lib/opportunity-engine/client";
import { researchIdea } from "@/lib/opportunity-engine/research";
import { scoreIdea } from "@/lib/opportunity-engine/score";
import {
  advanceRunStatus,
  countRecentRuns,
  createPendingRun,
  failRun,
  findLiveRun,
  persistRun,
  RunInFlightError,
  sweepStaleRuns,
  type PersistRunInput,
} from "@/lib/opportunity-engine/run";
import {
  IdeaSchema,
  type Idea,
  type ResearchResult,
  type Verdict,
} from "@/lib/opportunity-engine/schema";
import type { IdeaRow } from "@/types/database";

export const runtime = "nodejs";
// Research sweep alone runs 30–120s. 300 assumes Fluid Compute (Vercel default
// since 2025), where Hobby and Pro both honor it; a legacy 60s cap would kill
// the invocation mid-run, and the stale window below un-wedges the author.
export const maxDuration = 300;

// Non-terminal runs older than this are stale leftovers of a killed
// invocation and get swept to failed('timeout') before a new insert. 2× the
// route ceiling.
export const STALE_AFTER_MS = 10 * 60 * 1000;

// Rolling window for the per-author run cap.
export const HOURLY_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_RUNS_PER_HOUR = 5;

const BodySchema = z.object({ ideaId: z.uuid() });

// Injected boundary so the probe can drive the handler with the engine and
// both Supabase clients mocked — no network, no spend (scripts/eval/route-probe.ts).
export type RunRouteDeps = {
  /** Authenticated user id from the session cookie, or null. */
  getSessionUserId(): Promise<string | null>;
  /**
   * RLS-scoped read: resolves the row only when the session user owns it.
   * null means absent-or-unowned (indistinguishable by design); a real query
   * failure must THROW — this is the sole ownership boundary before spend,
   * and an infra error must surface as 500, never read as "not found".
   */
  readOwnIdea(ideaId: string): Promise<IdeaRow | null>;
  /** Runs created by the author since `sinceIso`, any status (hourly cap). */
  countRecentRuns(authorId: string, sinceIso: string): Promise<number>;
  /** Explicit recovery: stale non-terminal rows → failed('timeout'). */
  sweepStaleRuns(authorId: string, staleBeforeIso: string): Promise<number>;
  /** Throws RunInFlightError when the one-in-flight index rejects the insert. */
  createPendingRun(input: { ideaId: string; authorId: string; model: string }): Promise<{ id: string }>;
  /** Names the blocking run for the 409 body; at most one exists post-sweep. */
  findLiveRun(authorId: string): Promise<{ id: string } | null>;
  advanceRunStatus(runId: string, status: "researching" | "scoring"): Promise<void>;
  research(idea: Idea): Promise<ResearchResult>;
  score(idea: Idea, research: ResearchResult): Promise<Verdict>;
  persistRun(input: PersistRunInput): Promise<{ id: string }>;
  failRun(runId: string, message: string): Promise<void>;
  /** Full failure detail goes here (server logs), never to the row or wire. */
  logError(message: string): void;
  model: string;
  /** Per-author runs-per-hour ceiling (env-tunable in liveDeps). */
  hourlyCap: number;
};

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status });
}

export async function handleRunRequest(rawBody: unknown, deps: RunRouteDeps): Promise<Response> {
  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return json(400, { error: "invalid_body", detail: "expected { ideaId: <uuid> }" });
  }

  const userId = await deps.getSessionUserId();
  if (!userId) {
    return json(401, { error: "unauthorized" });
  }

  // Absent and not-owned are the same 404, so the route is not an existence
  // oracle for other authors' ideas.
  const idea = await deps.readOwnIdea(parsed.data.ideaId);
  if (!idea) {
    return json(404, { error: "idea_not_found" });
  }

  // Soft spend guard: per-author hourly cap. Counts every run created in the
  // window regardless of status — each one represented potential spend.
  const since = new Date(Date.now() - HOURLY_WINDOW_MS).toISOString();
  const recent = await deps.countRecentRuns(userId, since);
  if (recent >= deps.hourlyCap) {
    return json(429, {
      error: "rate_limited",
      detail: `at most ${deps.hourlyCap} runs per hour`,
    });
  }

  // Recovery as an explicit transition (see 008's index comment): sweep the
  // author's stale non-terminal rows to failed('timeout') so the unique
  // violation below can only mean a genuinely live run.
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS).toISOString();
  await deps.sweepStaleRuns(userId, staleBefore);

  // First DB write — before any Anthropic spend. Two constraints check it:
  // the composite FK re-checks the (idea, author) pair, and the one-in-flight
  // partial unique index rejects a second live run (the structural guard —
  // no check-then-insert race).
  let runId: string;
  try {
    ({ id: runId } = await deps.createPendingRun({
      ideaId: idea.id,
      authorId: userId,
      model: deps.model,
    }));
  } catch (e) {
    if (e instanceof RunInFlightError) {
      const live = await deps.findLiveRun(userId);
      return json(409, { error: "run_in_flight", ...(live ? { runId: live.id } : {}) });
    }
    throw e;
  }

  // From here every failure is recorded on the row — but SCRUBBED: the
  // author-readable `error` column gets a generic per-stage message; the full
  // detail goes to server logs only.
  let stage: "validation" | "research" | "scoring" | "persistence" = "validation";
  try {
    const ideaInput: Idea = IdeaSchema.parse({
      id: idea.id,
      title: idea.title,
      thesis: idea.thesis,
      space: idea.space,
      claimed_advantage: idea.claimed_advantage,
      links: idea.links ?? [],
    });

    stage = "research";
    await deps.advanceRunStatus(runId, "researching");
    const research = await deps.research(ideaInput);

    stage = "scoring";
    await deps.advanceRunStatus(runId, "scoring");
    const verdict = await deps.score(ideaInput, research);

    stage = "persistence";
    await deps.persistRun({
      runId,
      ideaId: idea.id,
      authorId: userId,
      verdict,
      model: deps.model,
    });

    return json(200, {
      runId,
      status: "complete",
      verdict: verdict.verdict,
      searchesPerformed: verdict.searches_performed,
    });
  } catch (e) {
    const detail = e instanceof Error ? (e.stack ?? e.message) : String(e);
    deps.logError(`[discovery/runs] run ${runId} failed at ${stage} stage: ${detail}`);
    try {
      await deps.failRun(runId, `${stage} stage failed`);
    } catch (failErr) {
      // Row stays non-terminal; the sweep unblocks the author next request.
      deps.logError(
        `[discovery/runs] run ${runId}: failRun also failed: ${
          failErr instanceof Error ? failErr.message : String(failErr)
        }`,
      );
    }
    return json(500, { error: "run_failed", runId });
  }
}

function liveDeps(): RunRouteDeps {
  return {
    async getSessionUserId() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    async readOwnIdea(ideaId) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("ideas")
        .select("*")
        .eq("id", ideaId)
        .maybeSingle();
      if (error) {
        throw new Error(`readOwnIdea: ${error.message}`);
      }
      return (data as IdeaRow | null) ?? null;
    },
    countRecentRuns,
    sweepStaleRuns,
    createPendingRun,
    findLiveRun,
    advanceRunStatus,
    research: researchIdea,
    score: scoreIdea,
    persistRun,
    failRun,
    logError: (message) => console.error(message),
    model: getModel(),
    hourlyCap: readHourlyCap(),
  };
}

function readHourlyCap(): number {
  const raw = Number.parseInt(process.env.OPPORTUNITY_ENGINE_MAX_RUNS_PER_HOUR ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RUNS_PER_HOUR;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "invalid_body", detail: "expected a JSON body" });
  }
  try {
    return await handleRunRequest(body, liveDeps());
  } catch (e) {
    // Pre-lifecycle failures (ownership read, cap count, sweep, the pending
    // insert itself) — nothing to mark failed yet and nothing internal to
    // leak, but the operator still needs eyes on DB-layer errors.
    console.error(
      `[discovery/runs] pre-lifecycle failure: ${
        e instanceof Error ? (e.stack ?? e.message) : String(e)
      }`,
    );
    return json(500, { error: "internal" });
  }
}
