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
//   • Each run is real Anthropic spend (~$2). The spend guard is one
//     in-flight run per author: a non-terminal run created inside the
//     freshness window 409s new requests. Non-terminal rows older than the
//     window are stale (a killed invocation) and never block.

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getModel } from "@/lib/opportunity-engine/client";
import { researchIdea } from "@/lib/opportunity-engine/research";
import { scoreIdea } from "@/lib/opportunity-engine/score";
import {
  advanceRunStatus,
  createPendingRun,
  failRun,
  findInFlightRun,
  persistRun,
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

// Non-terminal runs younger than this block new runs for the author (409);
// older ones are stale leftovers and are ignored. 2× the route ceiling.
export const IN_FLIGHT_WINDOW_MS = 10 * 60 * 1000;

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
  findInFlightRun(authorId: string, createdAfterIso: string): Promise<{ id: string } | null>;
  createPendingRun(input: { ideaId: string; authorId: string; model: string }): Promise<{ id: string }>;
  advanceRunStatus(runId: string, status: "researching" | "scoring"): Promise<void>;
  research(idea: Idea): Promise<ResearchResult>;
  score(idea: Idea, research: ResearchResult): Promise<Verdict>;
  persistRun(input: PersistRunInput): Promise<{ id: string }>;
  failRun(runId: string, message: string): Promise<void>;
  model: string;
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

  const cutoff = new Date(Date.now() - IN_FLIGHT_WINDOW_MS).toISOString();
  const inFlight = await deps.findInFlightRun(userId, cutoff);
  if (inFlight) {
    return json(409, { error: "run_in_flight", runId: inFlight.id });
  }

  // First DB write — the composite FK re-checks the (idea, author) pair here,
  // before any Anthropic spend.
  const { id: runId } = await deps.createPendingRun({
    ideaId: idea.id,
    authorId: userId,
    model: deps.model,
  });

  try {
    const ideaInput: Idea = IdeaSchema.parse({
      id: idea.id,
      title: idea.title,
      thesis: idea.thesis,
      space: idea.space,
      claimed_advantage: idea.claimed_advantage,
      links: idea.links ?? [],
    });

    await deps.advanceRunStatus(runId, "researching");
    const research = await deps.research(ideaInput);
    await deps.advanceRunStatus(runId, "scoring");
    const verdict = await deps.score(ideaInput, research);

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
    const message = e instanceof Error ? e.message : String(e);
    try {
      await deps.failRun(runId, message);
    } catch {
      // Row stays non-terminal; the stale window unblocks the author.
    }
    // The message lands in the row's `error` column (author-readable via RLS),
    // not in the response — no internal detail over the wire.
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
    findInFlightRun,
    createPendingRun,
    advanceRunStatus,
    research: researchIdea,
    score: scoreIdea,
    persistRun,
    failRun,
    model: getModel(),
  };
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
  } catch {
    // Pre-lifecycle failures (e.g. the pending insert itself) — nothing to
    // mark failed yet, and nothing internal to leak.
    return json(500, { error: "internal" });
  }
}
