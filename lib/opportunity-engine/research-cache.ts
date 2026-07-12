// Eval-ONLY research cache. Persists a ResearchResult to disk keyed by idea id so
// `npm run eval` can iterate on the scoring stage (SPEC step 6) without re-running
// the live web_search sweep every time. Real runs via the on-demand route NEVER
// use this — they always search live.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { EvidenceSchema, type Idea, type ResearchFn, type ResearchResult } from "./schema";

const CACHE_DIR = join(process.cwd(), "eval", ".cache");

const ResearchResultSchema = z.object({
  evidence: z.array(EvidenceSchema),
  searches_performed: z.number().int().min(0),
  digest: z.string(),
});

function cachePath(id: string): string {
  // ids are slugs/uuids — keep the filename filesystem-safe.
  const safe = id.replace(/[^a-zA-Z0-9._-]/g, "_");
  return join(CACHE_DIR, `${safe}.json`);
}

export function readResearchCache(id: string): ResearchResult | null {
  const p = cachePath(id);
  if (!existsSync(p)) return null;
  const parsed = ResearchResultSchema.safeParse(JSON.parse(readFileSync(p, "utf8")));
  return parsed.success ? parsed.data : null;
}

export function writeResearchCache(id: string, result: ResearchResult): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath(id), JSON.stringify(result, null, 2), "utf8");
}

/**
 * Wrap a live ResearchFn with the eval disk cache. Cache hit → return cached;
 * miss → run live once, persist, return. Used ONLY by the eval harness.
 */
export function withResearchCache(live: ResearchFn): ResearchFn {
  return async (idea: Idea): Promise<ResearchResult> => {
    const hit = readResearchCache(idea.id);
    if (hit) return hit;
    const fresh = await live(idea);
    writeResearchCache(idea.id, fresh);
    return fresh;
  };
}
