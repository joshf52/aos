// Orchestrator. Step 7 replaces the stub body with the real research→score chain
// and adds a separate `persistRun()` (service-role writes to `evaluation_runs`).
// `runEvaluation` is deliberately DB-free so the eval harness can call it directly.

import { NotImplementedError } from "./errors";
import type { Idea, ResearchFn, Verdict } from "./schema";

export type RunOptions = {
  // Injected by the eval harness (a cache-wrapped live researcher). Defaults to
  // the live researcher once step 5 lands; keeping it injectable is what lets the
  // eval cache research to disk without changing production behavior.
  research?: ResearchFn;
};

export async function runEvaluation(_idea: Idea, _opts: RunOptions = {}): Promise<Verdict> {
  throw new NotImplementedError(
    "runEvaluation: orchestrator not built yet (SPEC steps 5–7). " +
      "The eval harness is scaffolded and will exercise this once research + scoring land.",
  );
}
