// Orchestrator. Step 7 will add a separate `persistRun()` (service-role writes
// to `evaluation_runs`) alongside this. `runEvaluation` stays DB-free so the eval
// harness can call it directly (research→score, no Supabase dependency).

import { researchIdea } from "./research";
import { scoreIdea } from "./score";
import type { Idea, ResearchFn, Verdict } from "./schema";

export type RunOptions = {
  // Injected by the eval harness (a cache-wrapped live researcher). Defaults to
  // the live researcher; keeping it injectable is what lets the eval cache
  // research to disk without changing production behavior.
  research?: ResearchFn;
};

export async function runEvaluation(idea: Idea, opts: RunOptions = {}): Promise<Verdict> {
  const research = opts.research ?? researchIdea;
  const result = await research(idea);
  return scoreIdea(idea, result);
}
