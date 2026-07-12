// Landscape sweep — STUB (SPEC step 5).
//
// Will use @anthropic-ai/sdk + the server-side web_search tool to gather
// occupancy evidence across the six facets, then return it in the Evidence shape
// defined by schema.ts. The schema is the contract: this function is built to fit
// EvidenceSchema, never the reverse. If a valid run is rejected by the honesty
// gate, the fix is here (the output shape), not the gate.

import { NotImplementedError } from "./errors";
import type { Idea, ResearchResult } from "./schema";

export async function researchIdea(_idea: Idea): Promise<ResearchResult> {
  throw new NotImplementedError(
    "researchIdea: web_search sweep not built yet (SPEC step 5).",
  );
}
