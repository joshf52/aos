/**
 * Manual probe for the research stage (SPEC step 5): runs researchIdea for one
 * or more fixture ideas and prints the resulting evidence so it's inspectable
 * without running the full eval harness or scoring stage.
 *
 * Cache-wrapped (eval/.cache/<id>.json via withResearchCache), so a re-run
 * against an already-probed idea is free instead of re-sweeping live.
 *
 * Usage: npm run eval:research [idea-id ...]
 * Defaults to ["agent-payments", "bycatch-memecoin"] when no ids are given.
 */
import { EVAL_CASES } from "../../eval/ideas";
import { researchIdea } from "../../lib/opportunity-engine/research";
import { withResearchCache } from "../../lib/opportunity-engine/research-cache";

// Load .env.local (gitignored) so a locally-provided ANTHROPIC_API_KEY is picked
// up — a plain tsx process does not auto-load it the way Next.js does.
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local — rely on ambient env (e.g. an exported ANTHROPIC_API_KEY)
}

const DEFAULT_IDS = ["agent-payments", "bycatch-memecoin"];

async function main(): Promise<void> {
  const ids = process.argv.slice(2);
  const targetIds = ids.length > 0 ? ids : DEFAULT_IDS;
  const research = withResearchCache(researchIdea); // cache write makes re-runs free

  for (const id of targetIds) {
    const found = EVAL_CASES.find((c) => c.idea.id === id);
    if (!found) {
      console.error(`No fixture idea with id "${id}" in eval/ideas.ts — skipping.`);
      continue;
    }
    process.stdout.write(`\n▸ researching ${id} …\n`);
    const result = await research(found.idea);
    console.log(
      JSON.stringify(
        { id, searches_performed: result.searches_performed, evidence: result.evidence },
        null,
        2,
      ),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
