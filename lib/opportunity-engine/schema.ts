// Honesty-gate schema + types for the opportunity-discovery loop.
//
// This is the load-bearing contract (SPEC §6/§7). The Evidence shape and the
// Occupancy discriminated union are what make a dishonest verdict *inexpressible*:
// there is no "greenfield" / "empty" / "open" occupancy level, every occupancy
// claim must carry evidence, and "nothing found" is only sayable as
// `no_evidence_found` with a search count >= MIN_SEARCHES.
//
// Downstream stages (research, score) must produce data that fits THIS schema —
// never loosen the schema to fit a stage. If a valid run is rejected, fix the
// producing stage's output shape, not the gate.

import { z } from "zod";

export const MIN_SEARCHES = 5; // floor below which `no_evidence_found` is not assertable
export const MAX_SEARCHES = 12; // web_search max_uses ceiling (overridable via env at call sites)

// ── Idea (intake input) ───────────────────────────────────────────────
// `id` is a uuid for real (DB) ideas and a stable slug for eval fixtures
// (the slug doubles as the research-cache key). The DB column is uuid; format is
// enforced at the DB layer, not here, so eval slugs remain valid.
export const IdeaSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  thesis: z.string().min(1), // one-line
  space: z.string().min(1), // space / category
  claimed_advantage: z.string().min(1), // founder's claimed unfair advantage
  links: z.array(z.object({ label: z.string().min(1), url: z.url() })).default([]),
});
export type Idea = z.infer<typeof IdeaSchema>;

// ── Evidence (THE contract for the research stage) ────────────────────
// Research (SPEC step 5) must emit evidence in exactly this shape.
export const EvidenceSchema = z.object({
  source: z.string().min(1), // publisher / domain / named body
  url: z.url(),
  claim: z.string().min(1), // the specific occupancy assertion this supports
  observed_at: z.string().optional(), // ISO timestamp, optional metadata
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const INCUMBENT_KINDS = [
  "big_tech",
  "funded_startup",
  "company",
  "standards_body",
  "open_source",
  "protocol",
] as const;

export const IncumbentSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(INCUMBENT_KINDS),
  evidence: z.array(EvidenceSchema).min(1), // every named incumbent carries >=1 source
  note: z.string().optional(),
});
export type Incumbent = z.infer<typeof IncumbentSchema>;

// ── Occupancy (the honesty gate's core) ───────────────────────────────
// NOTE: there is deliberately NO "greenfield" | "empty" | "open" | "unoccupied"
// level. The only zero-incumbent state is `no_evidence_found`, which REQUIRES a
// search count >= MIN_SEARCHES. Claiming a space is empty is not expressible.
export const OCCUPIED_LEVELS = ["standardized", "crowded", "occupied", "emerging"] as const;

export const OccupancySchema = z.discriminatedUnion("level", [
  z.object({
    level: z.enum(OCCUPIED_LEVELS),
    incumbents: z.array(IncumbentSchema).min(1),
    searches_performed: z.number().int().min(1),
    summary: z.string().min(1),
  }),
  z.object({
    level: z.literal("no_evidence_found"),
    incumbents: z.array(z.never()).max(0), // must be empty
    searches_performed: z.number().int().min(MIN_SEARCHES),
    summary: z.string().min(1), // phrase as "no evidence found in N searches"
  }),
]);
export type Occupancy = z.infer<typeof OccupancySchema>;
export type OccupancyLevel = Occupancy["level"];

// ── Filter scores ─────────────────────────────────────────────────────
export const FILTERS = [
  "unfair_advantage",
  "intrinsic_use",
  "expanding_market",
  "speed_to_signal",
] as const;
export type Filter = (typeof FILTERS)[number];

export const FilterScoreSchema = z.object({
  filter: z.enum(FILTERS),
  score: z.number().int().min(0).max(3),
  rationale: z.string().min(1),
  evidence: z.array(EvidenceSchema).optional(),
});
export type FilterScore = z.infer<typeof FilterScoreSchema>;

// ── Verdict ───────────────────────────────────────────────────────────
export const VERDICTS = [
  "pioneer",
  "fast-follow-on-execution",
  "build-for-intrinsic-use",
  "dont-bother",
] as const;
export type VerdictName = (typeof VERDICTS)[number];

const pioneerNeedsOpenSpace = (v: {
  verdict: VerdictName;
  occupancy: Occupancy;
}): boolean =>
  v.verdict !== "pioneer" ||
  v.occupancy.level === "emerging" ||
  v.occupancy.level === "no_evidence_found";

// Base object (no top-level refine) so step 6 can `.omit()` the fields the model
// does not generate (idea_id / run_id / schema_version are attached by us).
export const VerdictObjectSchema = z.object({
  schema_version: z.literal("1.0"),
  idea_id: z.string().min(1), // uuid in DB; slug in eval fixtures (see IdeaSchema)
  run_id: z.string().optional(),
  searches_performed: z.number().int().min(0),
  evidence: z.array(EvidenceSchema),
  occupancy: OccupancySchema,
  scores: z
    .array(FilterScoreSchema)
    .length(4)
    .refine(
      (s) => new Set(s.map((x) => x.filter)).size === 4,
      "scores must cover all four filters with no duplicates",
    ),
  verdict: z.enum(VERDICTS),
  kill_condition: z.string().min(1),
  brief_summary: z.string().min(1),
  confidence_note: z.string().optional(),
});

export const VerdictSchema = VerdictObjectSchema.refine(
  pioneerNeedsOpenSpace,
  "pioneer is only valid when the space is emerging or no_evidence_found",
);
export type Verdict = z.infer<typeof VerdictSchema>;

// ── Research stage contract (step 5 will implement this) ──────────────
export type ResearchResult = {
  evidence: Evidence[]; // MUST match EvidenceSchema
  searches_performed: number;
  digest: string; // free-form research notes handed to the scoring stage
};
export type ResearchFn = (idea: Idea) => Promise<ResearchResult>;

// ── Verdict derivation (rubric reconciliation, SPEC §4.4) ─────────────
function scoreOf(scores: FilterScore[], filter: Filter): number {
  return scores.find((s) => s.filter === filter)?.score ?? 0;
}

/**
 * Deterministic decision table over (scores, occupancy level). The scoring stage
 * proposes a verdict; this derives the rubric-canonical one so a contradiction
 * (e.g. `pioneer` on a `standardized` space) can be rejected. Priority cascade —
 * returns exactly one verdict.
 */
export function deriveVerdict(scores: FilterScore[], level: OccupancyLevel): VerdictName {
  const ua = scoreOf(scores, "unfair_advantage");
  const iu = scoreOf(scores, "intrinsic_use");
  const em = scoreOf(scores, "expanding_market");
  const sts = scoreOf(scores, "speed_to_signal");
  const open = level === "emerging" || level === "no_evidence_found";

  if (open && ua >= 2 && (em >= 2 || sts >= 2)) return "pioneer";
  if (!open && ua >= 2 && sts >= 2) return "fast-follow-on-execution";
  if (iu >= 2) return "build-for-intrinsic-use";
  return "dont-bother";
}

export type Reconciliation = {
  ok: boolean;
  proposed: VerdictName;
  derived: VerdictName;
};

/** Check a model-proposed verdict against the rubric (used by the scoring stage). */
export function reconcileVerdict(v: Verdict): Reconciliation {
  const derived = deriveVerdict(v.scores, v.occupancy.level);
  return { ok: derived === v.verdict, proposed: v.verdict, derived };
}
