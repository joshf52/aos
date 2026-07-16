/**
 * Headless eval harness for the opportunity-discovery loop (SPEC §8).
 * Runs the regression set sequentially through runEvaluation, checks each verdict
 * against ground truth, writes EVAL_RESULTS.md, and exits non-zero on any
 * hard-invariant failure. No UI, no HTTP. Run with `npm run eval`.
 *
 * COST CONTROL — every case is a live web_search sweep + LLM scoring pass, so a
 * full run is the real spend gate. Run a cheap single-case smoke instead of all
 * five with a flag or an env var (CLI wins over env):
 *   npm run eval -- --only agent-payments      # one named case
 *   npm run eval -- --limit 1                   # first N cases
 *   EVAL_ONLY=agent-payments npm run eval        # env equivalents
 *   EVAL_LIMIT=1 npm run eval
 * A subset run writes EVAL_RESULTS.partial.md (gitignored) and leaves the
 * canonical EVAL_RESULTS.md untouched, so a smoke never clobbers the full result.
 *
 * Eval-only research cache: research is injected as withResearchCache(researchIdea)
 * so re-runs during scoring iteration hit disk (eval/.cache/<id>.json) instead of
 * re-running the live web_search sweep. Real runs via the on-demand route never
 * touch this cache.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { EVAL_CASES, type EvalCase } from "../../eval/ideas";
import { runEvaluation } from "../../lib/opportunity-engine/run";
import { researchIdea } from "../../lib/opportunity-engine/research";
import { withResearchCache } from "../../lib/opportunity-engine/research-cache";
import { MIN_SEARCHES, VerdictSchema, type Verdict } from "../../lib/opportunity-engine/schema";

// Load .env.local (gitignored) so a locally-provided ANTHROPIC_API_KEY is picked
// up — a plain tsx process does not auto-load it the way Next.js does.
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local — rely on ambient env (e.g. an exported ANTHROPIC_API_KEY)
}

type Outcome =
  | { state: "pending"; reason: string }
  | { state: "error"; reason: string }
  | { state: "pass"; verdict: Verdict }
  | { state: "fail"; verdict: Verdict; failures: string[] };

const isNotImplemented = (e: unknown): boolean =>
  e instanceof Error && (e as { code?: string }).code === "NOT_IMPLEMENTED";

// ── Case selection (cost control) ─────────────────────────────────────────
// `--limit N` / `--only id,id` (and EVAL_LIMIT / EVAL_ONLY env equivalents) let a
// smoke run exercise one case instead of the full five. CLI flags win over env.
type Selection = { cases: EvalCase[]; subset: boolean; note: string };

function parseArgs(argv: string[]): { limit?: number; only?: string[] } {
  const out: { limit?: number; only?: string[] } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    let key: "limit" | "only" | null = null;
    if (a === "--limit" || a.startsWith("--limit=")) key = "limit";
    else if (a === "--only" || a.startsWith("--only=")) key = "only";
    if (!key) continue;
    const eq = a.indexOf("=");
    const value = eq !== -1 ? a.slice(eq + 1) : argv[++i]; // inline (--limit=1) or next token (--limit 1)
    if (key === "limit") {
      const n = Number.parseInt(value ?? "", 10);
      if (Number.isFinite(n) && n > 0) out.limit = n;
    } else {
      out.only = (value ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return out;
}

function selectCases(): Selection {
  const args = parseArgs(process.argv.slice(2));
  const envOnly = process.env.EVAL_ONLY
    ? process.env.EVAL_ONLY.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const envLimitRaw = process.env.EVAL_LIMIT ? Number.parseInt(process.env.EVAL_LIMIT, 10) : undefined;
  const envLimit = envLimitRaw !== undefined && Number.isFinite(envLimitRaw) && envLimitRaw > 0 ? envLimitRaw : undefined;

  const only = args.only ?? envOnly;
  const limit = args.limit ?? envLimit;

  let cases = EVAL_CASES;
  const notes: string[] = [];

  if (only && only.length > 0) {
    const known = new Set(EVAL_CASES.map((c) => c.idea.id));
    const unknown = only.filter((id) => !known.has(id));
    if (unknown.length > 0) {
      throw new Error(
        `--only/EVAL_ONLY names unknown idea id(s): ${unknown.join(", ")}. Known ids: ${Array.from(known).join(", ")}`,
      );
    }
    cases = only.map((id) => EVAL_CASES.find((c) => c.idea.id === id)!);
    notes.push(`only=${only.join(",")}`);
  }
  if (limit !== undefined) {
    cases = cases.slice(0, limit);
    notes.push(`limit=${limit}`);
  }

  return { cases, subset: cases.length !== EVAL_CASES.length, note: notes.join(" ") };
}

function checkCase(c: EvalCase, verdict: Verdict): string[] {
  const failures: string[] = [];

  // Structural honesty gate must hold.
  const parsed = VerdictSchema.safeParse(verdict);
  if (!parsed.success) failures.push(`verdict fails schema: ${parsed.error.message}`);

  // Occupancy call within the accepted set.
  if (!c.expect.occupancyLevels.includes(verdict.occupancy.level))
    failures.push(
      `occupancy ${verdict.occupancy.level} not in [${c.expect.occupancyLevels.join(", ")}]`,
    );

  // Verdict within the accepted set.
  if (!c.expect.verdicts.includes(verdict.verdict))
    failures.push(`verdict ${verdict.verdict} not in [${c.expect.verdicts.join(", ")}]`);

  // Hard invariant — the must-never-fail check.
  if (!c.expect.hard(verdict)) failures.push(`HARD: ${c.expect.hardDesc}`);

  // >=1 expected incumbent surfaced (skip when the pool is empty).
  if (c.expect.incumbentPool.length > 0) {
    const hay = [
      ...verdict.occupancy.incumbents.map((i) => i.name),
      ...verdict.evidence.map((e) => `${e.source} ${e.claim}`),
    ]
      .join(" ")
      .toLowerCase();
    const hit = c.expect.incumbentPool.some((n) => hay.includes(n.toLowerCase()));
    if (!hit)
      failures.push(`no expected incumbent surfaced from [${c.expect.incumbentPool.join(", ")}]`);
  }

  // Enough searches to be honest.
  if (verdict.searches_performed < MIN_SEARCHES)
    failures.push(
      `searches_performed ${verdict.searches_performed} < MIN_SEARCHES ${MIN_SEARCHES}`,
    );

  return failures;
}

function writeReport(results: { c: EvalCase; outcome: Outcome }[], selection: Selection): string {
  const fileName = selection.subset ? "EVAL_RESULTS.partial.md" : "EVAL_RESULTS.md";
  const lines: string[] = [];
  lines.push(`# ${fileName} — opportunity-discovery regression`);
  lines.push("");
  lines.push(`> Generated by \`npm run eval\` at ${new Date().toISOString()}.`);
  if (selection.subset) {
    lines.push(">");
    lines.push(
      `> **PARTIAL RUN** — ${selection.note} (${results.length}/${EVAL_CASES.length} cases). ` +
        "This is a subset smoke, not a full regression result; the canonical EVAL_RESULTS.md was NOT modified.",
    );
  }
  lines.push("");

  if (results.every((r) => r.outcome.state === "pending")) {
    lines.push(
      "**SCAFFOLD STATE** — the pipeline (research + scoring) is not built yet; `runEvaluation`",
    );
    lines.push(
      "throws `NOT_IMPLEMENTED`, so every case reports PENDING. The harness, fixtures, honesty-gate",
    );
    lines.push("checks, and the eval-only research cache are wired and ready for steps 5–6.");
    lines.push("");
  }

  lines.push("| Idea | State | Occupancy | Verdict | Notes |");
  lines.push("|---|---|---|---|---|");
  for (const { c, outcome } of results) {
    let row: string;
    switch (outcome.state) {
      case "pending":
        row = `| \`${c.idea.id}\` | ⧗ pending | — | — | pipeline not built |`;
        break;
      case "error":
        row = `| \`${c.idea.id}\` | ✖ error | — | — | ${outcome.reason.replace(/\|/g, "/").slice(0, 120)} |`;
        break;
      case "pass":
        row = `| \`${c.idea.id}\` | ✓ pass | ${outcome.verdict.occupancy.level} | ${outcome.verdict.verdict} | canonical ${c.expect.canonicalVerdict} |`;
        break;
      case "fail":
        row = `| \`${c.idea.id}\` | ✖ fail | ${outcome.verdict.occupancy.level} | ${outcome.verdict.verdict} | ${outcome.failures.join("; ").replace(/\|/g, "/").slice(0, 200)} |`;
        break;
    }
    lines.push(row);
  }

  lines.push("");
  lines.push("## Expected ground truth");
  lines.push("");
  for (const { c } of results) {
    lines.push(
      `- **${c.idea.id}** — occupancy ∈ {${c.expect.occupancyLevels.join(", ")}}; verdict ∈ {${c.expect.verdicts.join(", ")}} (canonical \`${c.expect.canonicalVerdict}\`); hard: ${c.expect.hardDesc}.`,
    );
  }
  lines.push("");

  writeFileSync(
    join(process.cwd(), "docs", "aos", "opportunity-engine", fileName),
    lines.join("\n"),
    "utf8",
  );
  return fileName;
}

async function main(): Promise<void> {
  const selection = selectCases();
  const research = withResearchCache(researchIdea); // eval-only disk cache seam
  const results: { c: EvalCase; outcome: Outcome }[] = [];

  if (selection.subset)
    process.stdout.write(
      `Running SUBSET (${selection.note}) — ${selection.cases.length}/${EVAL_CASES.length} cases.\n`,
    );

  for (const c of selection.cases) {
    process.stdout.write(`\n▸ ${c.idea.id} … `);
    try {
      const verdict = await runEvaluation(c.idea, { research });
      const failures = checkCase(c, verdict);
      results.push({
        c,
        outcome:
          failures.length === 0
            ? { state: "pass", verdict }
            : { state: "fail", verdict, failures },
      });
      process.stdout.write(failures.length === 0 ? "PASS" : `FAIL (${failures.length})`);
    } catch (e) {
      if (isNotImplemented(e)) {
        results.push({ c, outcome: { state: "pending", reason: (e as Error).message } });
        process.stdout.write("PENDING (pipeline not built)");
      } else {
        results.push({ c, outcome: { state: "error", reason: String(e) } });
        process.stdout.write("ERROR");
      }
    }
  }

  const fileName = writeReport(results, selection);

  const passed = results.filter((r) => r.outcome.state === "pass").length;
  const failed = results.filter(
    (r) => r.outcome.state === "fail" || r.outcome.state === "error",
  ).length;
  const pending = results.filter((r) => r.outcome.state === "pending").length;

  process.stdout.write(
    `\n\n${passed} pass · ${failed} fail · ${pending} pending / ${results.length}\n`,
  );
  process.stdout.write(`Wrote docs/aos/opportunity-engine/${fileName}\n`);

  // Scaffold state (all pending) exits 0; any real fail/error exits 1.
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
