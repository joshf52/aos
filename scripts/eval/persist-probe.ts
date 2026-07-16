/**
 * Manual probe for persistRun (SPEC step 7b): proves the service-role write to
 * `evaluation_runs` end-to-end against a real Supabase, with NO Anthropic call
 * ($0 — the Verdict is a fixture, not a live scoring run). This is the ONLY thing
 * that verifies persistence; the eval harness is DB-free and never calls
 * persistRun (see HANDOFF.md, "persistRun verification boundary").
 *
 * It asserts BOTH halves of the `evaluation_runs` posture:
 *
 *   (a) Happy path — persistRun writes a terminal `complete` row for a real
 *       (idea, author) pair. Read it back and verify the source-of-truth
 *       `verdict_json` round-trips intact AND every flat-column projection
 *       (verdict, searches_performed, kill_condition, brief_md, model, status,
 *       started_at) matches.
 *
 *   (b) The write-time guard fires — a cross-author write (author_id ≠ the parent
 *       idea's author) is REJECTED. The outsider is a REAL auth.users row that
 *       owns no idea, so the `author_id → auth.users` FK is satisfied and the ONLY
 *       constraint that can fire is the composite FK
 *       `evaluation_runs_idea_author_fkey`: (idea_id, author_id) → ideas(id, author_id).
 *       The probe reports the exact SQLSTATE (23503, foreign_key_violation) and the
 *       constraint name, proving the rejector is the COMPOSITE FK — not the
 *       `guard_idea_promotion` trigger, which lives on `ideas.promoted_opportunity_id`
 *       and never runs for an `evaluation_runs` insert.
 *
 * Self-contained + idempotent: creates its own auth users + idea and deletes them
 * in a finally (an auth.users delete cascades to ideas and evaluation_runs). A
 * best-effort startup sweep mops any orphans left by a hard-killed prior run, so it
 * is safe to run repeatedly.
 *
 * Requires: migration 008 applied, NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * (from .env.local or ambient env). No ANTHROPIC_API_KEY needed.
 *
 * Usage: npm run eval:persist-probe
 */
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { createServiceClient } from "../../lib/supabase/service";
import { persistRun } from "../../lib/opportunity-engine/run";
import { VerdictSchema, type Verdict } from "../../lib/opportunity-engine/schema";
import type { EvaluationRun } from "../../types/database";

// Load .env.local (gitignored) so locally-provided Supabase creds are picked up —
// a plain tsx process does not auto-load it the way Next.js does.
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local — rely on ambient env (exported SUPABASE_SERVICE_ROLE_KEY etc.)
}

const FIXTURE_DOMAIN = "persist-probe.aos.invalid"; // reserved TLD — never a real inbox
const MODEL = "persist-probe-fixture"; // provenance marker; no live model was called
const FK_CONSTRAINT = "evaluation_runs_idea_author_fkey"; // the composite FK under test
const TRIGGER_TELL = "promoted_opportunity_id"; // text guard_idea_promotion raises — must NOT appear

type Supa = ReturnType<typeof createServiceClient>;
type PgError = { code?: string; message?: string; details?: string; hint?: string };

/** A schema-valid, non-pioneer fixture Verdict (parsed to prove it satisfies the gate). */
function makeVerdict(ideaId: string): Verdict {
  return VerdictSchema.parse({
    schema_version: "1.0",
    idea_id: ideaId,
    searches_performed: 7,
    evidence: [
      {
        source: "probe-fixture",
        url: "https://example.com/persist-probe",
        claim: "fixture evidence — this run never touched the live web_search sweep",
      },
    ],
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
    brief_summary: "fixture brief for the persist probe",
  });
}

async function createUser(supa: Supa, label: string, runTag: string): Promise<string> {
  const email = `${label}-${runTag}@${FIXTURE_DOMAIN}`;
  // email_confirm: admin creates a pre-confirmed user, so no confirmation mail is
  // ever sent to the .invalid address.
  const { data, error } = await supa.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { persist_probe: true },
  });
  if (error || !data?.user) {
    throw new Error(`createUser(${label}) failed: ${error?.message ?? "no user returned"}`);
  }
  return data.user.id;
}

async function createIdea(supa: Supa, authorId: string): Promise<string> {
  // Same builder-cast idiom as persistRun (supabase-js collapses typed .insert()
  // args to `never` under this Database type).
  const { data, error } = (await (supa.from("ideas") as any)
    .insert({
      author_id: authorId,
      title: "Persist Probe Fixture Idea",
      thesis: "fixture idea used only to exercise persistRun",
      space: "probe",
      claimed_advantage: "none — fixture",
    })
    .select("id")
    .single()) as { data: { id: string } | null; error: PgError | null };
  if (error || !data) {
    if (error?.code === "42P01" || /does not exist/i.test(error?.message ?? "")) {
      throw new Error(
        "`ideas` table not found — apply migration 008_opportunity_discovery.sql before running this probe.",
      );
    }
    throw new Error(`createIdea failed: ${error?.message ?? "no row returned"}`);
  }
  return data.id;
}

async function deleteUser(supa: Supa, id: string | null): Promise<void> {
  if (!id) return;
  try {
    await supa.auth.admin.deleteUser(id); // cascades to ideas + evaluation_runs
  } catch {
    // best-effort cleanup — never mask the real assertion outcome
  }
}

/** Best-effort hygiene: remove fixture users orphaned by a hard-killed prior run. */
async function sweepOrphans(supa: Supa): Promise<number> {
  let removed = 0;
  try {
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) {
        if (u.email?.endsWith(`@${FIXTURE_DOMAIN}`)) {
          await supa.auth.admin.deleteUser(u.id);
          removed++;
        }
      }
      if (data.users.length < 200) break;
    }
  } catch {
    // hygiene only — a failed sweep never blocks the run (unique per-run emails
    // mean createUser can't collide with a leftover anyway)
  }
  return removed;
}

async function main(): Promise<void> {
  const supa = createServiceClient();

  process.stdout.write("▸ sweeping orphaned fixtures … ");
  process.stdout.write(`${await sweepOrphans(supa)} removed\n`);

  // Unique per-run identities → repeated runs never collide even if a prior run was
  // hard-killed before its finally cleanup.
  const runTag = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  let authorId: string | null = null;
  let outsiderId: string | null = null;

  try {
    authorId = await createUser(supa, "author", runTag);
    outsiderId = await createUser(supa, "outsider", runTag);
    const ideaId = await createIdea(supa, authorId);
    process.stdout.write(
      `▸ fixtures ready — idea ${ideaId}\n  author ${authorId}\n  outsider ${outsiderId}\n\n`,
    );

    const verdict = makeVerdict(ideaId);
    const startedAt = new Date(Date.now() - 60_000).toISOString();

    // ── (a) HAPPY PATH — write a completed run, read it back, verify projections ──
    const { id: runId } = await persistRun({ ideaId, authorId, verdict, model: MODEL, startedAt });
    ok(runId, "persistRun returned no id");

    const { data: row, error: readErr } = (await supa
      .from("evaluation_runs")
      .select("*")
      .eq("id", runId)
      .single()) as { data: EvaluationRun | null; error: PgError | null };
    ok(!readErr, `read-back failed: ${readErr?.message ?? ""}`);
    ok(row, "read-back returned no row");

    strictEqual(row.idea_id, ideaId, "idea_id mismatch");
    strictEqual(row.author_id, authorId, "author_id mismatch");
    strictEqual(row.status, "complete", "status is not `complete`");
    strictEqual(row.model, MODEL, "model mismatch");
    ok(row.completed_at, "completed_at was not set");
    // started_at compared by instant — PostgREST returns timestamptz as `+00:00`,
    // not the `Z` we sent, so a raw string compare would spuriously fail.
    ok(row.started_at, "started_at was not persisted");
    strictEqual(
      new Date(row.started_at).getTime(),
      new Date(startedAt).getTime(),
      "started_at instant mismatch",
    );
    // Flat-column projections vs the source-of-truth verdict.
    strictEqual(
      row.searches_performed,
      verdict.searches_performed,
      "searches_performed projection mismatch",
    );
    strictEqual(row.verdict, verdict.verdict, "verdict projection mismatch");
    strictEqual(row.brief_md, verdict.brief_summary, "brief_md projection mismatch");
    strictEqual(row.kill_condition, verdict.kill_condition, "kill_condition projection mismatch");
    // Source of truth round-trips intact through jsonb.
    deepStrictEqual(row.verdict_json, verdict, "verdict_json did not round-trip intact");
    process.stdout.write(
      `✓ (a) happy path — wrote + read run ${runId}; verdict_json round-trips and every flat projection matches\n`,
    );

    // ── (b) CROSS-AUTHOR WRITE IS REJECTED ──────────────────────────────────────
    // The real function first: persistRun for (idea owned by author, outsider) must throw.
    let threw: Error | null = null;
    try {
      await persistRun({ ideaId, authorId: outsiderId, verdict: makeVerdict(ideaId), model: MODEL });
    } catch (e) {
      threw = e as Error;
    }
    ok(
      threw,
      "persistRun did NOT reject a cross-author write — the composite FK is not protecting the table",
    );
    ok(
      threw.message.includes(FK_CONSTRAINT),
      `cross-author write was rejected, but the error did not name the composite FK. Message: ${threw.message}`,
    );
    ok(
      !threw.message.includes(TRIGGER_TELL),
      `rejection came from the promotion guard trigger, not the composite FK: ${threw.message}`,
    );
    process.stdout.write(`✓ (b) persistRun rejected the cross-author write via ${FK_CONSTRAINT}\n`);

    // Mechanism detail: a raw service-client insert of the same cross-author row,
    // to capture the structured SQLSTATE + constraint that persistRun's wrapped
    // Error string hides. This is what names the mechanism, not asserts it.
    const { error: rawErr } = (await (supa.from("evaluation_runs") as any).insert({
      idea_id: ideaId,
      author_id: outsiderId,
      status: "complete",
    })) as { error: PgError | null };
    ok(rawErr, "raw cross-author insert unexpectedly succeeded");
    strictEqual(rawErr.code, "23503", `expected foreign_key_violation (23503), got ${rawErr.code}`);
    ok(
      `${rawErr.message ?? ""} ${rawErr.details ?? ""}`.includes(FK_CONSTRAINT) ||
        (rawErr.details ?? "").includes("ideas"),
      `FK violation did not name ${FK_CONSTRAINT} / ideas — msg=${rawErr.message} details=${rawErr.details}`,
    );

    console.log(
      "\nMECHANISM — the constraint that rejects a cross-author run:\n" +
        JSON.stringify(
          {
            sqlstate: rawErr.code,
            constraint: FK_CONSTRAINT,
            message: rawErr.message,
            details: rawErr.details,
            hint: rawErr.hint ?? null,
          },
          null,
          2,
        ),
    );
    process.stdout.write(
      `\n✓ VERDICT: the composite FK ${FK_CONSTRAINT} — (idea_id, author_id) → ideas(id, author_id) —\n` +
        "  is what rejects a cross-author run (SQLSTATE 23503, foreign_key_violation).\n" +
        "  The guard_idea_promotion trigger guards ideas.promoted_opportunity_id and plays NO part\n" +
        "  in evaluation_runs writes.\n",
    );

    process.stdout.write("\nALL PROBE ASSERTIONS PASSED\n");
  } finally {
    process.stdout.write("\n▸ cleaning up fixtures …\n");
    await deleteUser(supa, authorId); // cascade removes the idea + persisted run
    await deleteUser(supa, outsiderId);
  }
}

main().catch((e) => {
  console.error(`\n✖ persist-probe FAILED: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
});
