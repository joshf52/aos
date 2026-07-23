/**
 * Probe for the on-demand evaluation route (SPEC step 9): drives
 * `handleRunRequest` through every auth/ownership/spend boundary with ALL
 * dependencies faked — no Supabase, no Anthropic, no network, $0. This is the
 * verification ceiling available without live creds (HANDOFF.md); the live
 * pass is the human batch's final step.
 *
 * What it proves:
 *   (1) invalid body → 400, and NOTHING downstream runs (no reads, no writes,
 *       no engine — the spend gate holds at the cheapest boundary).
 *   (2) unauthenticated → 401, same zero-downstream guarantee.
 *   (3) authed but the RLS-scoped idea read returns null (idea absent OR owned
 *       by someone else — indistinguishable by design) → 404, engine never
 *       invoked, no run row created.
 *   (4) an in-flight run for the author → 409 naming the existing run, engine
 *       never invoked, no second pending row (the spend guard).
 *   (5) happy path → 200; the lifecycle is ordered pending → researching →
 *       scoring → complete; and the authorId reaching every write is the
 *       SESSION user id — a decoy authorId/ideaId planted in the request body
 *       must never reach a write (ownership comes from RLS + session, never
 *       the body).
 *   (6) engine failure → the run is marked failed with the error message, the
 *       response is 500 with no internal detail beyond the run id, and
 *       persistRun is never called.
 *   (7) an infra failure of the ownership read itself propagates (the POST
 *       wrapper's catch → bare 500) — it never collapses into the 404.
 *
 * Usage: npm run eval:route-probe
 */
import { deepStrictEqual, ok, rejects, strictEqual } from "node:assert/strict";
import {
  handleRunRequest,
  type RunRouteDeps,
} from "../../app/api/discovery/runs/route";
import type { PersistRunInput } from "../../lib/opportunity-engine/run";
import {
  VerdictSchema,
  type Idea,
  type ResearchResult,
  type Verdict,
} from "../../lib/opportunity-engine/schema";
import type { IdeaRow } from "../../types/database";

const SESSION_USER = "11111111-1111-4111-8111-111111111111"; // the authenticated author
const ATTACKER = "22222222-2222-4222-8222-222222222222"; // decoy planted in request bodies
const IDEA_ID = "33333333-3333-4333-8333-333333333333";
const RUN_ID = "44444444-4444-4444-8444-444444444444";
const MODEL = "route-probe-fixture";

function fixtureIdeaRow(): IdeaRow {
  return {
    id: IDEA_ID,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    author_id: SESSION_USER,
    title: "Route Probe Fixture Idea",
    thesis: "fixture idea used only to exercise the route boundary",
    space: "probe",
    claimed_advantage: "none — fixture",
    links: [],
    promoted_opportunity_id: null,
  };
}

function fixtureResearch(): ResearchResult {
  return {
    evidence: [
      {
        source: "probe-fixture",
        url: "https://example.com/route-probe",
        claim: "fixture evidence — the engine was mocked, no live sweep ran",
      },
    ],
    searches_performed: 7,
    digest: "fixture digest",
  };
}

function fixtureVerdict(): Verdict {
  return VerdictSchema.parse({
    schema_version: "1.0",
    idea_id: IDEA_ID,
    searches_performed: 7,
    evidence: fixtureResearch().evidence,
    occupancy: {
      level: "occupied",
      searches_performed: 7,
      summary: "fixture occupancy — a space with named incumbents",
      incumbents: [
        {
          name: "Fixture Incumbent",
          kind: "company",
          evidence: [
            {
              source: "probe-fixture",
              url: "https://example.com/incumbent",
              claim: "the incumbent operates in this space",
            },
          ],
        },
      ],
    },
    scores: [
      { filter: "unfair_advantage", score: 2, rationale: "fixture" },
      { filter: "intrinsic_use", score: 2, rationale: "fixture" },
      { filter: "expanding_market", score: 1, rationale: "fixture" },
      { filter: "speed_to_signal", score: 2, rationale: "fixture" },
    ],
    verdict: "fast-follow-on-execution",
    kill_condition: "fixture kill condition",
    brief_summary: "fixture brief for the route probe",
  });
}

/** Every downstream touch the handler makes, in call order. */
type Recorded = {
  ideaReads: string[];
  inFlightChecks: { authorId: string; createdAfterIso: string }[];
  pendingInserts: { ideaId: string; authorId: string; model: string }[];
  statusAdvances: { runId: string; status: string }[];
  researchCalls: Idea[];
  scoreCalls: Idea[];
  persistCalls: PersistRunInput[];
  failCalls: { runId: string; message: string }[];
  order: string[];
};

function makeDeps(overrides: Partial<RunRouteDeps> = {}): { deps: RunRouteDeps; calls: Recorded } {
  const calls: Recorded = {
    ideaReads: [],
    inFlightChecks: [],
    pendingInserts: [],
    statusAdvances: [],
    researchCalls: [],
    scoreCalls: [],
    persistCalls: [],
    failCalls: [],
    order: [],
  };
  const deps: RunRouteDeps = {
    async getSessionUserId() {
      calls.order.push("auth");
      return SESSION_USER;
    },
    async readOwnIdea(ideaId) {
      calls.order.push("readIdea");
      calls.ideaReads.push(ideaId);
      return fixtureIdeaRow();
    },
    async findInFlightRun(authorId, createdAfterIso) {
      calls.order.push("inFlight");
      calls.inFlightChecks.push({ authorId, createdAfterIso });
      return null;
    },
    async createPendingRun(input) {
      calls.order.push("pending");
      calls.pendingInserts.push(input);
      return { id: RUN_ID };
    },
    async advanceRunStatus(runId, status) {
      calls.order.push(`advance:${status}`);
      calls.statusAdvances.push({ runId, status });
    },
    async research(idea) {
      calls.order.push("research");
      calls.researchCalls.push(idea);
      return fixtureResearch();
    },
    async score(idea, _research) {
      calls.order.push("score");
      calls.scoreCalls.push(idea);
      return fixtureVerdict();
    },
    async persistRun(input) {
      calls.order.push("persist");
      calls.persistCalls.push(input);
      return { id: input.runId ?? RUN_ID };
    },
    async failRun(runId, message) {
      calls.order.push("fail");
      calls.failCalls.push({ runId, message });
    },
    model: MODEL,
    ...overrides,
  };
  return { deps, calls };
}

function assertNoSpendAndNoWrites(calls: Recorded, label: string): void {
  strictEqual(calls.researchCalls.length, 0, `${label}: research was invoked`);
  strictEqual(calls.scoreCalls.length, 0, `${label}: score was invoked`);
  strictEqual(calls.pendingInserts.length, 0, `${label}: a pending run was inserted`);
  strictEqual(calls.persistCalls.length, 0, `${label}: persistRun was invoked`);
  strictEqual(calls.statusAdvances.length, 0, `${label}: a status advance was written`);
}

async function main(): Promise<void> {
  // ── (1) invalid body → 400, zero downstream ─────────────────────────────
  for (const bad of [
    {},
    { ideaId: "not-a-uuid" },
    { ideaId: 42 },
    { idea_id: IDEA_ID }, // wrong key
    null,
  ]) {
    const { deps, calls } = makeDeps();
    const res = await handleRunRequest(bad, deps);
    strictEqual(res.status, 400, `invalid body ${JSON.stringify(bad)} did not 400`);
    assertNoSpendAndNoWrites(calls, "invalid-body");
    strictEqual(calls.ideaReads.length, 0, "invalid-body: idea was read");
  }
  process.stdout.write("✓ (1) invalid bodies → 400, nothing downstream runs\n");

  // ── (2) unauthenticated → 401, zero downstream ──────────────────────────
  {
    const { deps, calls } = makeDeps({
      async getSessionUserId() {
        return null;
      },
    });
    const res = await handleRunRequest({ ideaId: IDEA_ID }, deps);
    strictEqual(res.status, 401, "unauthenticated request did not 401");
    assertNoSpendAndNoWrites(calls, "unauthenticated");
    strictEqual(calls.ideaReads.length, 0, "unauthenticated: idea was read");
  }
  process.stdout.write("✓ (2) unauthenticated → 401, nothing downstream runs\n");

  // ── (3) RLS read returns null (absent OR not owned) → 404, engine idle ──
  {
    const { deps, calls } = makeDeps({
      async readOwnIdea() {
        return null;
      },
    });
    const res = await handleRunRequest({ ideaId: IDEA_ID }, deps);
    strictEqual(res.status, 404, "unowned/absent idea did not 404");
    deepStrictEqual(await res.json(), { error: "idea_not_found" });
    assertNoSpendAndNoWrites(calls, "unowned-idea");
  }
  process.stdout.write(
    "✓ (3) RLS-scoped read is the ownership boundary — null → 404, engine never invoked\n",
  );

  // ── (4) in-flight run → 409 with the existing run id, engine idle ───────
  {
    const existing = "55555555-5555-4555-8555-555555555555";
    const { deps, calls } = makeDeps({
      async findInFlightRun() {
        return { id: existing };
      },
    });
    const res = await handleRunRequest({ ideaId: IDEA_ID }, deps);
    strictEqual(res.status, 409, "in-flight run did not 409");
    deepStrictEqual(await res.json(), { error: "run_in_flight", runId: existing });
    assertNoSpendAndNoWrites(calls, "in-flight");
  }
  process.stdout.write("✓ (4) in-flight run → 409, no second run, no spend\n");

  // ── (5) happy path — lifecycle order + session-derived authorId ─────────
  {
    const { deps, calls } = makeDeps();
    // Decoys: a body that tries to smuggle an attacker authorId and a second
    // ideaId key. The schema ignores unknown keys; ownership must come from
    // the session + RLS read alone.
    const res = await handleRunRequest(
      { ideaId: IDEA_ID, authorId: ATTACKER, author_id: ATTACKER, idea_id: ATTACKER },
      deps,
    );
    strictEqual(res.status, 200, "happy path did not 200");
    const body = (await res.json()) as Record<string, unknown>;
    strictEqual(body.runId, RUN_ID);
    strictEqual(body.status, "complete");
    strictEqual(body.verdict, "fast-follow-on-execution");
    strictEqual(body.searchesPerformed, 7);

    // Lifecycle order is exactly SPEC step 9's.
    deepStrictEqual(
      calls.order,
      [
        "auth",
        "readIdea",
        "inFlight",
        "pending",
        "advance:researching",
        "research",
        "advance:scoring",
        "score",
        "persist",
      ],
      "lifecycle order mismatch",
    );

    // The authorId reaching every write is the SESSION user — never the decoy.
    strictEqual(calls.inFlightChecks[0].authorId, SESSION_USER);
    strictEqual(calls.pendingInserts[0].authorId, SESSION_USER);
    strictEqual(calls.pendingInserts[0].ideaId, IDEA_ID);
    strictEqual(calls.persistCalls[0].authorId, SESSION_USER);
    strictEqual(calls.persistCalls[0].ideaId, IDEA_ID);
    strictEqual(calls.persistCalls[0].runId, RUN_ID, "persist did not finalize the pending row");
    ok(
      JSON.stringify(calls.pendingInserts).includes(ATTACKER) === false &&
        JSON.stringify(calls.persistCalls[0].authorId).includes(ATTACKER) === false,
      "a body-supplied decoy authorId reached a write",
    );
    strictEqual(calls.failCalls.length, 0, "happy path called failRun");
  }
  process.stdout.write(
    "✓ (5) happy path — pending → researching → scoring → complete; authorId is session-derived, body decoys ignored\n",
  );

  // ── (6) engine failure → run marked failed, 500, no persist ─────────────
  {
    const { deps, calls } = makeDeps({
      async score() {
        throw new Error("scoring stage exploded (fixture)");
      },
    });
    const res = await handleRunRequest({ ideaId: IDEA_ID }, deps);
    strictEqual(res.status, 500, "engine failure did not 500");
    deepStrictEqual(await res.json(), { error: "run_failed", runId: RUN_ID });
    strictEqual(calls.persistCalls.length, 0, "failed run was persisted as complete");
    strictEqual(calls.failCalls.length, 1, "failRun was not called");
    strictEqual(calls.failCalls[0].runId, RUN_ID);
    ok(
      calls.failCalls[0].message.includes("scoring stage exploded"),
      "failure message did not reach the run row",
    );
  }
  process.stdout.write("✓ (6) engine failure → row marked failed, 500 carries no internals\n");

  // ── (7) ownership-read INFRA failure throws — never reads as 404 ────────
  // A real query error at the sole ownership boundary must propagate (the
  // POST wrapper turns it into a bare 500), not collapse into idea_not_found.
  {
    const { deps, calls } = makeDeps({
      async readOwnIdea() {
        throw new Error("supabase query failed (fixture)");
      },
    });
    await rejects(
      () => handleRunRequest({ ideaId: IDEA_ID }, deps),
      /supabase query failed/,
      "an ownership-read infra failure did not propagate",
    );
    assertNoSpendAndNoWrites(calls, "ownership-read-failure");
  }
  process.stdout.write(
    "✓ (7) ownership-read infra failure propagates (→ 500), never masquerades as 404\n",
  );

  process.stdout.write("\nALL ROUTE-PROBE ASSERTIONS PASSED ($0 — every dependency faked)\n");
}

main().catch((e) => {
  console.error(`\n✖ route-probe FAILED: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
});
