// Score+verdict stage (SPEC step 6) — Call B of the two-call pipeline (§4.2).
//
// Tool-free, structured-output call: given the evidence research.ts already
// gathered, the model groups it into an occupancy assessment, scores the four
// fixed filters, and proposes a verdict + kill condition + brief. This is where
// the honesty gate (§7) is enforced end to end:
//   - occupancy incumbents are grounded to REAL evidence indices from the
//     research pool (never free-form URLs the model could hallucinate) — same
//     grounding discipline as research.ts's extractEvidence.
//   - the model can never omit `no_evidence_found`'s search-count floor or
//     invent a "greenfield" level — those states are inexpressible in the schema.
//   - the proposed verdict is reconciled against deriveVerdict() (the
//     deterministic rubric); a contradiction triggers one re-ask, and if it still
//     contradicts, the rubric-derived verdict wins (SPEC §11 Q9).

import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { getClient, getModel } from "./client";
import {
  deriveVerdict,
  FilterScoresSchema,
  INCUMBENT_KINDS,
  OCCUPIED_LEVELS,
  MIN_SEARCHES,
  VerdictSchema,
  VERDICTS,
} from "./schema";
import type { Evidence, Idea, OccupancyLevel, ResearchResult, Verdict } from "./schema";

const MAX_REASK = 1; // one re-ask on a rubric contradiction, then the rubric wins (SPEC §11 Q9)

// ── Model-facing call schema ────────────────────────────────────────────
// Incumbents reference evidence by INDEX into the provided pool, not free-form
// Evidence objects — this makes hallucinated sources structurally impossible
// (the same discipline research.ts uses for its own extraction call), rather
// than relying on a post-hoc URL filter.
// `kind` is intentionally NOT z.enum(INCUMBENT_KINDS) here: a hard enum mismatch
// (the model says "vc-backed startup" instead of "funded_startup") would crash
// BOTH the primary parse() and the manual-JSON fallback identically, since it's
// the same model producing the same taxonomy guess either way. Accept free text
// and normalize to the locked taxonomy in normalizeKind() below — the final
// Verdict's IncumbentSchema.kind (schema.ts) stays a strict enum; only this
// model-facing parsing step is forgiving.
const RawIncumbentSchema = z.object({
  name: z.string().min(1),
  kind: z.string().min(1),
  evidence_indices: z.array(z.number().int().min(0)).min(1),
  note: z.string().optional(),
});

type IncumbentKind = (typeof INCUMBENT_KINDS)[number];

const KIND_ALIASES: Record<string, IncumbentKind> = {
  "big tech": "big_tech",
  bigtech: "big_tech",
  incumbent: "big_tech",
  startup: "funded_startup",
  "funded startup": "funded_startup",
  "vc backed": "funded_startup",
  "vc-backed": "funded_startup",
  "vc-backed startup": "funded_startup",
  "venture backed": "funded_startup",
  standard: "standards_body",
  "standards body": "standards_body",
  standards_org: "standards_body",
  regulator: "standards_body",
  "government body": "standards_body",
  opensource: "open_source",
  "open source": "open_source",
  oss: "open_source",
  github: "open_source",
  "open-source project": "open_source",
};

/** Map a model-proposed kind string onto the locked INCUMBENT_KINDS taxonomy. Never fails the run over a taxonomy quibble — defaults to "company". */
function normalizeKind(raw: string): IncumbentKind {
  const asIs = raw.trim().toLowerCase();
  if ((INCUMBENT_KINDS as readonly string[]).includes(asIs)) return asIs as IncumbentKind;
  const snake = asIs.replace(/[\s-]+/g, "_");
  if ((INCUMBENT_KINDS as readonly string[]).includes(snake)) return snake as IncumbentKind;
  if (asIs in KIND_ALIASES) return KIND_ALIASES[asIs];
  return "company";
}

const RawOccupancySchema = z.discriminatedUnion("level", [
  z.object({
    level: z.enum(OCCUPIED_LEVELS),
    incumbents: z.array(RawIncumbentSchema).min(1),
    summary: z.string().min(1),
  }),
  z.object({
    level: z.literal("no_evidence_found"),
    incumbents: z.array(z.never()).max(0),
    summary: z.string().min(1),
  }),
]);

const ScoreCallSchema = z.object({
  occupancy: RawOccupancySchema,
  scores: FilterScoresSchema,
  verdict: z.enum(VERDICTS),
  kill_condition: z.string().min(1),
  brief_summary: z.string().min(1),
  confidence_note: z.string().optional(),
});
type ScoreCallOutput = z.infer<typeof ScoreCallSchema>;

// ── Prompting ────────────────────────────────────────────────────────────
function scoreSystemPrompt(): string {
  return `You are the scoring stage of a strict, evidence-gated opportunity-evaluation pipeline. You are given evidence already gathered by a web research sweep. Your job is to assess market occupancy, score four fixed filters, and propose a verdict. You do NOT search the web yourself — work only from the evidence provided.

HONESTY GATE (non-negotiable):
- Never describe a space as "greenfield," "empty," "unoccupied," or "wide open." Those words are banned.
- Default posture: assume the space is occupied until the evidence says otherwise.
- Every incumbent you name must cite at least one evidence item from the numbered pool below, by its index. Never invent an incumbent, and never cite an index that isn't in the pool.
- Each incumbent's "kind" must be exactly one of: big_tech, funded_startup, company, standards_body, open_source, protocol. Pick the closest fit — do not invent new category names.
- The ONLY way to report an empty-looking space is occupancy level "no_evidence_found" — and even then you must phrase the summary literally as "no evidence found in N searches" (N = the actual search count given to you). This level is only valid if at least ${MIN_SEARCHES} searches were performed.
- occupancy.level must be one of: standardized, crowded, occupied, emerging, no_evidence_found. "emerging" means real but early activity WITH incumbent evidence — it still requires at least one cited incumbent.

SCORING RUBRIC — score each filter 0-3 with a rationale:
- unfair_advantage (audience / distribution / unique knowledge / speed): 0 = none, 1 = generic skill, 2 = real edge (audience, distribution, or domain knowledge), 3 = defensible, hard to replicate.
- intrinsic_use (would-build-anyway / useful without "making it big"): 0 = only worth it if it hits big, 1 = mild, 2 = would use it myself, 3 = would build regardless of market outcome, useful at n=1.
- expanding_market (does early beat first): 0 = shrinking/static winner-take-first, 1 = flat, 2 = growing, 3 = rapidly expanding, early >= first.
- speed_to_signal (users/revenue fast & cheap): 0 = months to any signal, 1 = slow, 2 = weeks to first users/revenue, 3 = days to a real demand signal, cheap to test.

VERDICT DECISION TABLE (apply this yourself; your proposed verdict will be checked against it):
- pioneer: occupancy is "emerging" or "no_evidence_found" AND unfair_advantage >= 2 AND (expanding_market >= 2 OR speed_to_signal >= 2). Pioneer is ONLY valid on a genuinely open space — never propose it against occupied/crowded/standardized evidence.
- fast-follow-on-execution: occupancy is "occupied", "crowded", or "standardized" AND unfair_advantage >= 2 AND speed_to_signal >= 2.
- build-for-intrinsic-use: intrinsic_use >= 2, and neither pioneer nor fast-follow-on-execution qualifies. Reserved for ideas worth SUSTAINED time where the value is real even if it stays small — not a capped weekend toy. A weekend-capped experiment whose only value is fun/learning has LOW intrinsic_use and should score dont-bother, not this.
- dont-bother: none of the above.

kill_condition must be a specific, measurable condition — not vague ("if it doesn't work out"), but concrete ("if fewer than 10 signups in 2 weeks" or, for a capped toy, an explicit time/scope cap like "shelve after one weekend regardless of outcome").

brief_summary is a short, honest paragraph: the occupancy call with named incumbents, the score rationale in brief, and the verdict.`;
}

function evidencePoolText(pool: Evidence[]): string {
  if (pool.length === 0) return "(no evidence was gathered by the research sweep)";
  return pool.map((e, i) => `[${i}] source: ${e.source} | url: ${e.url} | claim: ${e.claim}`).join("\n");
}

function scoreUserMessage(idea: Idea, research: ResearchResult, feedback?: string): string {
  const base = `## Idea
Title: ${idea.title}
Thesis: ${idea.thesis}
Space: ${idea.space}
Claimed advantage: ${idea.claimed_advantage}

## Research digest
${research.digest || "(the research sweep produced no summary text)"}

## Evidence pool (cite incumbents by index)
Searches performed: ${research.searches_performed}
${evidencePoolText(research.evidence)}

Assess occupancy (citing incumbents by evidence index), score the four filters, and propose a verdict + kill_condition + brief_summary.`;
  if (!feedback) return base;
  return `${base}\n\n## Correction needed\n${feedback}`;
}

/** Best-effort extraction of a JSON object from free-form model text (fallback path only). */
function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("scoreIdea fallback: no JSON object found in model response");
  }
  return text.slice(start, end + 1);
}

async function scoreCallOnce(
  client: Anthropic,
  idea: Idea,
  research: ResearchResult,
  feedback?: string,
): Promise<ScoreCallOutput> {
  const model = getModel();
  const userMessage = scoreUserMessage(idea, research, feedback);

  try {
    const message = await client.messages.parse({
      model,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: scoreSystemPrompt(),
      messages: [{ role: "user", content: userMessage }],
      output_config: { format: zodOutputFormat(ScoreCallSchema) },
    });
    if (message.parsed_output) return message.parsed_output;
  } catch {
    // fall through to the manual JSON fallback below
  }

  const fallback = await client.messages.create({
    model,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: scoreSystemPrompt(),
    messages: [
      {
        role: "user",
        content: `${userMessage}\n\nRespond with ONLY a single JSON object matching the required shape — no prose, no markdown code fences.`,
      },
    ],
  });
  const text = fallback.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  const json: unknown = JSON.parse(extractJsonObject(text));
  return ScoreCallSchema.parse(json);
}

/**
 * Ground the model's index-based occupancy claim into a real Occupancy object.
 * Drops any incumbent whose evidence_indices don't resolve to a real pool item;
 * an incumbent left with zero grounded evidence is dropped entirely (never kept
 * with fabricated evidence). If grounding empties the incumbent list on a
 * non-"no_evidence_found" claim, the space honestly falls back to
 * "no_evidence_found" (only if the search floor was met — otherwise this is a
 * pipeline bug, not an idea property, and we throw).
 */
function groundOccupancy(
  raw: ScoreCallOutput["occupancy"],
  pool: Evidence[],
  searchesPerformed: number,
): { level: OccupancyLevel; incumbents: ReturnType<typeof buildIncumbents>; summary: string } {
  if (raw.level === "no_evidence_found") {
    return { level: "no_evidence_found", incumbents: [], summary: raw.summary };
  }

  const incumbents = buildIncumbents(raw.incumbents, pool);
  if (incumbents.length > 0) {
    return { level: raw.level, incumbents, summary: raw.summary };
  }

  if (searchesPerformed >= MIN_SEARCHES) {
    return {
      level: "no_evidence_found",
      incumbents: [],
      summary: `no evidence found in ${searchesPerformed} searches (model-proposed incumbents did not ground to real evidence)`,
    };
  }
  throw new Error(
    `groundOccupancy: model claimed occupancy "${raw.level}" but no incumbent evidence grounded to the real pool, and searches_performed (${searchesPerformed}) is below MIN_SEARCHES (${MIN_SEARCHES}) — cannot honestly fall back to no_evidence_found.`,
  );
}

function buildIncumbents(
  raw: z.infer<typeof RawIncumbentSchema>[],
  pool: Evidence[],
): { name: string; kind: IncumbentKind; evidence: Evidence[]; note?: string }[] {
  return raw
    .map((inc) => ({
      name: inc.name,
      kind: normalizeKind(inc.kind),
      note: inc.note,
      evidence: inc.evidence_indices
        .map((i) => pool[i])
        .filter((e): e is Evidence => e !== undefined),
    }))
    .filter((inc) => inc.evidence.length > 0);
}

function reconciliationFeedback(proposed: string, derived: string): string {
  return `Your proposed verdict "${proposed}" contradicts the rubric given your own occupancy call and scores — the decision table derives "${derived}" from them. Re-read the VERDICT DECISION TABLE and return a verdict, occupancy, and scores that are internally consistent (adjust whichever was miscalibrated; do not just relabel the verdict).`;
}

export async function scoreIdea(idea: Idea, research: ResearchResult): Promise<Verdict> {
  const client = getClient();

  let raw = await scoreCallOnce(client, idea, research);
  let grounded = groundOccupancy(raw.occupancy, research.evidence, research.searches_performed);
  let derived = deriveVerdict(raw.scores, grounded.level);
  let confidenceNote = raw.confidence_note;

  for (let attempt = 0; attempt < MAX_REASK && derived !== raw.verdict; attempt++) {
    raw = await scoreCallOnce(
      client,
      idea,
      research,
      reconciliationFeedback(raw.verdict, derived),
    );
    grounded = groundOccupancy(raw.occupancy, research.evidence, research.searches_performed);
    derived = deriveVerdict(raw.scores, grounded.level);
    confidenceNote = raw.confidence_note;
  }

  const finalVerdictName = derived === raw.verdict ? raw.verdict : derived;
  if (derived !== raw.verdict) {
    confidenceNote = [
      confidenceNote,
      `Verdict overridden from the model's "${raw.verdict}" to the rubric-derived "${derived}" after a contradiction survived re-ask.`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return VerdictSchema.parse({
    schema_version: "1.0",
    idea_id: idea.id,
    searches_performed: research.searches_performed,
    evidence: research.evidence,
    occupancy: {
      level: grounded.level,
      incumbents: grounded.incumbents,
      searches_performed: research.searches_performed,
      summary: grounded.summary,
    },
    scores: raw.scores,
    verdict: finalVerdictName,
    kill_condition: raw.kill_condition,
    brief_summary: raw.brief_summary,
    confidence_note: confidenceNote,
  });
}
