// Spend limits for AI builds. Every build is a Vercel deploy on AOS's account
// (and, once live, an app spending AOS's Anthropic key), so these bound what one
// commitment can cost. Shared by the server action path and the status page.

/** A "building" row older than this is a crashed run (e.g. the function hit its time limit). */
export const STALE_BUILD_MS = 15 * 60_000;

/**
 * Builds one commitment may start per rolling 24 hours. Counted from
 * ai_builds.created_at, which 009 makes non-updatable and non-deletable for
 * users, so the count can't be reset by editing or deleting rows.
 */
export const MAX_BUILDS_PER_COMMITMENT_PER_DAY = 5;
