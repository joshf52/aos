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
 *   (4) hourly cap reached → 429, and neither the sweep, the insert, nor the
 *       engine runs; one-under-the-cap proceeds.
 *   (5) the pending insert hitting the one-in-flight partial unique index
 *       (RunInFlightError) → 409 naming the live run; the stale sweep ran
 *       BEFORE the insert (recovery as an explicit transition), the engine
 *       never ran, and no decoy authorId from the body reached any call.
 *       Also covered: the live run finishing between insert-reject and
 *       lookup → 409 without a runId, never a crash.
 *   (6) happy path → 200; lifecycle ordered cap → sweep → pending →
 *       researching → scoring → complete; authorId session-derived everywhere.
 *   (7) engine failure → the row gets a GENERIC per-stage message ("scoring
 *       stage failed"), the full detail goes to the server-log sink only, the
 *       response is 500 with nothing but the run id, persistRun never called.
 *   (8) an infra failure of the ownership read itself propagates (the POST
 *       wrapper's catch → bare 500) — it never collapses into the 404.
 *   (9) infra failures of the cap count or the sweep propagate BEFORE the
 *       pending insert — no dangling row, no engine call, no spend.
 *
 * Usage: npm run eval:route-probe
 */
import { deepStrictEqual, ok, rejects, strictEqual } from "node:assert/strict";
import {
  handleRunRequest,
  type RunRouteDeps,
} from "../../app/api/discovery/runs/route";
import { RunInFlightError, type PersistRunInput } from "../../lib/opportunity-engine/run";
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
const LIVE_RUN_ID = "55555555-5555-4555-8555-555555555555";
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
  capChecks: { authorId: string; sinceIso: string }[];
  sweeps: { authorId: string; staleBeforeIso: string }[];
  liveLookups: string[];
  pendingInserts: { ideaId: string; authorId: string; model: string }[];
  statusAdvances: { runId: string; status: string }[];
  researchCalls: Idea[];
  scoreCalls: Idea[];
  persistCalls: PersistRunInput[];
  failCalls: { runId: string; message: string }[];
  logs: string[];
  order: string[];
};

function makeDeps(overrides: Partial<RunRouteDeps> = {}): { deps: RunRouteDeps; calls: Recorded } {
  const calls: Recorded = {
    ideaReads: [],
    capChecks: [],
    sweeps: [],
    liveLookups: [],
    pendingInserts: [],
    statusAdvances: [],
    researchCalls: [],
    scoreCalls: [],
    persistCalls: [],
    failCalls: [],
    logs: [],
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
    async countRecentRuns(authorId, sinceIso) {
      calls.order.push("cap");
      calls.capChecks.push({ authorId, sinceIso });
      return 0;
    },
    async sweepStaleRuns(authorId, staleBeforeIso) {
      calls.order.push("sweep");
      calls.sweeps.push({ authorId, staleBeforeIso });
      return 0;
    },
    async createPendingRun(input) {
      calls.order.push("pending");
      calls.pendingInserts.push(input);
      return { id: RUN_ID };
    },
    async findLiveRun(authorId) {
      calls.order.push("liveLookup");
      calls.liveLookups.push(authorId);
      return { id: LIVE_RUN_ID };
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
    logError(message) {
      calls.logs.push(message);
    },
    model: MODEL,
    hourlyCap: 5,
    ...overrides,
  };
  return { deps, calls };
}

function assertNoSpendAndNoWrites(calls: Recorded, label: string): void {
  strictEqual(calls.researchCalls.length, 0, `${label}: research was invoked`);
  strictEqual(calls.scoreCalls.length, 0, `${label}: score was invoked`);
  strictEqual(calls.sweeps.length, 0, `${label}: the stale sweep wrote`);
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
    strictEqual(calls.capChecks.length, 0, "unowned-idea: cap was checked");
  }
  process.stdout.write(
    "✓ (3) RLS-scoped read is the ownership boundary — null → 404, engine never invoked\n",
  );

  // ── (4) hourly cap reached → 429; no sweep, no insert, no engine ────────
  {
    const { deps, calls } = makeDeps({
      async countRecentRuns(authorId, sinceIso) {
        calls.capChecks.push({ authorId, sinceIso });
        return 5; // == hourlyCap
      },
    });
    const res = await handleRunRequest({ ideaId: IDEA_ID }, deps);
    strictEqual(res.status, 429, "cap-reached request did not 429");
    deepStrictEqual(await res.json(), {
      error: "rate_limited",
      detail: "at most 5 runs per hour",
    });
    assertNoSpendAndNoWrites(calls, "cap-reached");
    strictEqual(calls.capChecks[0].authorId, SESSION_USER);
  }
  // Boundary sanity: one under the cap proceeds.
  {
    const { deps, calls } = makeDeps({
      async countRecentRuns() {
        return 4;
      },
    });
    const res = await handleRunRequest({ ideaId: IDEA_ID }, deps);
    strictEqual(res.status, 200, "under-cap request did not proceed");
    strictEqual(calls.pendingInserts.length, 1, "under-cap: pending insert missing");
  }
  process.stdout.write(
    "✓ (4) hourly cap → 429 at the cap, proceeds one under it; no spend either way\n",
  );

  // ── (5) one-in-flight index rejects the insert → 409, sweep-before-insert ─
  {
    const { deps, calls } = makeDeps();
    deps.createPendingRun = async (input) => {
      calls.order.push("pending");
      calls.pendingInserts.push(input);
      throw new RunInFlightError();
    };
    const res = await handleRunRequest({ ideaId: IDEA_ID, authorId: ATTACKER }, deps);
    strictEqual(res.status, 409, "in-flight insert rejection did not 409");
    deepStrictEqual(await res.json(), { error: "run_in_flight", runId: LIVE_RUN_ID });
    // Recovery is explicit: the sweep must precede the insert attempt.
    deepStrictEqual(
      calls.order,
      ["auth", "readIdea", "cap", "sweep", "pending", "liveLookup"],
      "409 path order mismatch (sweep must run before the insert)",
    );
    strictEqual(calls.sweeps[0].authorId, SESSION_USER);
    strictEqual(calls.researchCalls.length, 0, "in-flight: research was invoked");
    strictEqual(calls.scoreCalls.length, 0, "in-flight: score was invoked");
    strictEqual(calls.persistCalls.length, 0, "in-flight: persistRun was invoked");
    ok(
      !JSON.stringify(calls.sweeps).includes(ATTACKER) &&
        calls.pendingInserts[0].authorId === SESSION_USER,
      "a body-supplied decoy authorId reached a write",
    );
  }
  // Edge: the live run finished between insert-reject and lookup → 409, no id.
  {
    const { deps } = makeDeps({
      async createPendingRun() {
        throw new RunInFlightError();
      },
      async findLiveRun() {
        return null;
      },
    });
    const res = await handleRunRequest({ ideaId: IDEA_ID }, deps);
    strictEqual(res.status, 409, "in-flight edge (no live row) did not 409");
    deepStrictEqual(await res.json(), { error: "run_in_flight" });
  }
  process.stdout.write(
    "✓ (5) unique-index rejection → 409 naming the live run; sweep precedes insert; engine idle\n",
  );

  // ── (6) happy path — lifecycle order + session-derived authorId ─────────
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

    // Lifecycle order is exactly SPEC step 9's, cap and sweep included.
    deepStrictEqual(
      calls.order,
      [
        "auth",
        "readIdea",
        "cap",
        "sweep",
        "pending",
        "advance:researching",
        "research",
        "advance:scoring",
        "score",
        "persist",
      ],
      "lifecycle order mismatch",
    );

    // The authorId reaching every call is the SESSION user — never the decoy.
    strictEqual(calls.capChecks[0].authorId, SESSION_USER);
    strictEqual(calls.sweeps[0].authorId, SESSION_USER);
    strictEqual(calls.pendingInserts[0].authorId, SESSION_USER);
    strictEqual(calls.pendingInserts[0].ideaId, IDEA_ID);
    strictEqual(calls.persistCalls[0].authorId, SESSION_USER);
    strictEqual(calls.persistCalls[0].ideaId, IDEA_ID);
    strictEqual(calls.persistCalls[0].runId, RUN_ID, "persist did not finalize the pending row");
    strictEqual(calls.failCalls.length, 0, "happy path called failRun");
    strictEqual(calls.logs.length, 0, "happy path wrote to the error log");
  }
  process.stdout.write(
    "✓ (6) happy path — cap → sweep → pending → researching → scoring → complete; decoys ignored\n",
  );

  // ── (7) engine failure → generic row message, full detail to logs only ──
  {
    const { deps, calls } = makeDeps({
      async score() {
        throw new Error("scoring stage exploded (fixture secret detail)");
      },
    });
    const res = await handleRunRequest({ ideaId: IDEA_ID }, deps);
    strictEqual(res.status, 500, "engine failure did not 500");
    deepStrictEqual(await res.json(), { error: "run_failed", runId: RUN_ID });
    strictEqual(calls.persistCalls.length, 0, "failed run was persisted as complete");
    strictEqual(calls.failCalls.length, 1, "failRun was not called");
    strictEqual(calls.failCalls[0].runId, RUN_ID);
    // SCRUBBED: the author-readable row gets the generic per-stage message…
    strictEqual(calls.failCalls[0].message, "scoring stage failed");
    ok(
      !calls.failCalls[0].message.includes("exploded"),
      "internal failure detail leaked into the row's error column",
    );
    // …and the full detail lands in the server-log sink.
    strictEqual(calls.logs.length, 1, "full detail did not reach the server-log sink");
    ok(
      calls.logs[0].includes("scoring stage") && calls.logs[0].includes("exploded"),
      "server log is missing the stage or the full detail",
    );
  }
  process.stdout.write(
    "✓ (7) engine failure → row says 'scoring stage failed'; full detail to server logs only\n",
  );

  // ── (8) ownership-read INFRA failure throws — never reads as 404 ────────
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
    "✓ (8) ownership-read infra failure propagates (→ 500), never masquerades as 404\n",
  );

  // ── (9) cap/sweep infra failures propagate pre-insert — zero writes/spend ─
  // Both run before createPendingRun, so a throw must leave no dangling row
  // and no engine call (the POST wrapper turns it into a logged bare 500).
  {
    const { deps, calls } = makeDeps({
      async countRecentRuns() {
        throw new Error("count query failed (fixture)");
      },
    });
    await rejects(
      () => handleRunRequest({ ideaId: IDEA_ID }, deps),
      /count query failed/,
      "a cap-count infra failure did not propagate",
    );
    assertNoSpendAndNoWrites(calls, "cap-count-failure");
  }
  {
    const { deps, calls } = makeDeps({
      async sweepStaleRuns() {
        throw new Error("sweep update failed (fixture)");
      },
    });
    await rejects(
      () => handleRunRequest({ ideaId: IDEA_ID }, deps),
      /sweep update failed/,
      "a sweep infra failure did not propagate",
    );
    strictEqual(calls.pendingInserts.length, 0, "sweep-failure: a pending run was inserted");
    strictEqual(calls.researchCalls.length, 0, "sweep-failure: research was invoked");
    strictEqual(calls.scoreCalls.length, 0, "sweep-failure: score was invoked");
    strictEqual(calls.persistCalls.length, 0, "sweep-failure: persistRun was invoked");
  }
  process.stdout.write(
    "✓ (9) cap/sweep infra failures propagate before any insert — no dangling row, no spend\n",
  );

  process.stdout.write("\nALL ROUTE-PROBE ASSERTIONS PASSED ($0 — every dependency faked)\n");
}

main().catch((e) => {
  console.error(`\n✖ route-probe FAILED: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
});
