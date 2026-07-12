// The 5-idea regression set — ground truth from the manual session (SPEC §8).
//
// Each case's `hard` invariant is the must-never-fail check. `verdicts` is the
// accepted set (canonical noted separately); occupancy levels and the incumbent
// pool are soft-checked. The single cross-cutting pass criterion: the occupied
// spaces (ideas 1–3) must never be reported open (occupancy != no_evidence_found
// and verdict != pioneer).

import type {
  Idea,
  OccupancyLevel,
  Verdict,
  VerdictName,
} from "../lib/opportunity-engine/schema";

export type EvalCase = {
  idea: Idea;
  expect: {
    occupancyLevels: OccupancyLevel[]; // acceptable occupancy calls
    verdicts: VerdictName[]; // acceptable verdicts
    canonicalVerdict: VerdictName; // the expected/canonical one
    incumbentPool: string[]; // >=1 must surface (case-insensitive); [] = skip
    hard: (v: Verdict) => boolean; // must-never-fail invariant
    hardDesc: string;
  };
};

// ideas 1–3 share this invariant: an occupied space, never reported open.
const occupiedNotOpen = (v: Verdict): boolean =>
  v.occupancy.level !== "no_evidence_found" && v.verdict !== "pioneer";

export const EVAL_CASES: EvalCase[] = [
  {
    idea: {
      id: "agent-payments",
      title: "Agent payments / agent wallet",
      thesis: "A wallet + payment rail so autonomous AI agents can pay for services.",
      space: "AI agent payments / agentic commerce infrastructure",
      claimed_advantage:
        "Comfortable with crypto rails and MCP; can ship a merchant integration fast.",
      links: [],
    },
    expect: {
      occupancyLevels: ["standardized", "crowded"],
      verdicts: ["fast-follow-on-execution", "dont-bother"],
      canonicalVerdict: "dont-bother",
      incumbentPool: ["x402", "AP2", "MPP", "agentpay-mcp", "Stripe", "Coinbase", "AWS"],
      hard: occupiedNotOpen,
      hardDesc: "occupancy != no_evidence_found AND verdict != pioneer (rails are occupied)",
    },
  },
  {
    idea: {
      id: "seafood-provenance",
      title: "Seafood provenance capture app",
      thesis: "A mobile app for fishing boats to log catch provenance at the point of capture.",
      space: "Seafood traceability / catch-to-plate provenance",
      claimed_advantage: "Grew up around commercial fishing; knows the deckhand workflow.",
      links: [],
    },
    expect: {
      occupancyLevels: ["occupied", "crowded"],
      verdicts: ["dont-bother", "fast-follow-on-execution"],
      canonicalVerdict: "dont-bother",
      incumbentPool: ["Deckhand", "Vericatch", "Wholechain", "ThisFish"],
      hard: occupiedNotOpen,
      hardDesc: "occupancy != no_evidence_found AND verdict != pioneer (capture + downstream occupied)",
    },
  },
  {
    idea: {
      id: "agent-identity",
      title: "Agent identity / personhood",
      thesis: "An identity + personhood-verification layer for autonomous AI agents.",
      space: "AI agent identity, authentication, and personhood",
      claimed_advantage: "Background in auth/IAM; can build a standards-aligned prototype.",
      links: [],
    },
    expect: {
      occupancyLevels: ["crowded", "standardized"],
      verdicts: ["dont-bother", "fast-follow-on-execution"],
      canonicalVerdict: "dont-bother",
      incumbentPool: ["Microsoft", "Okta", "Ping", "NIST", "W3C", "IETF"],
      hard: occupiedNotOpen,
      hardDesc: "not greenfield AND verdict != pioneer (identity gold rush)",
    },
  },
  {
    idea: {
      id: "sockeye-fleet",
      title: "Sockeye fleet business",
      thesis:
        "Run and expand a sockeye salmon fishing fleet operation the founder already has access to.",
      space: "Commercial sockeye salmon fishing / direct-to-buyer seafood",
      claimed_advantage:
        "Owns fleet access plus existing buyer distribution; would run it regardless of scale.",
      links: [],
    },
    expect: {
      occupancyLevels: ["occupied", "crowded", "emerging"],
      verdicts: ["build-for-intrinsic-use", "pioneer"],
      canonicalVerdict: "build-for-intrinsic-use",
      incumbentPool: [],
      hard: (v: Verdict): boolean =>
        v.verdict === "build-for-intrinsic-use" || v.verdict === "pioneer",
      hardDesc: "must be a BUILD verdict, not dont-bother (intrinsic use + unfair distribution)",
    },
  },
  {
    idea: {
      id: "bycatch-memecoin",
      title: "$BYCATCH / $GRIND memecoin",
      thesis: "Launch a fishing-themed memecoin as a fun, low-stakes crypto experiment.",
      space: "Memecoins / novelty crypto tokens",
      claimed_advantage: "Can deploy a token in a weekend; small existing audience for the theme.",
      links: [],
    },
    expect: {
      // Occupancy call is not the point for a toy — accept any level.
      occupancyLevels: ["standardized", "crowded", "occupied", "emerging", "no_evidence_found"],
      verdicts: ["dont-bother", "build-for-intrinsic-use"],
      canonicalVerdict: "dont-bother",
      incumbentPool: [],
      hard: (v: Verdict): boolean =>
        /week|weekend|cap|capped|scope|small|toy|throwaway|time.?box/i.test(v.kill_condition),
      hardDesc: "kill_condition encodes a weekend/scope cap (toy)",
    },
  },
];
