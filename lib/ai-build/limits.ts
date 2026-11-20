// Spend and time limits for AI builds. Every build is a Vercel deploy on AOS's
// build team (and, once live, an app spending AOS's Anthropic key), so these
// bound what one commitment can cost and how long a status can stay "building".

/**
 * Builds one commitment may start per rolling 24 hours. The database enforces
 * the same number in the ai_builds insert trigger (009); keep them in sync.
 * This copy only produces the friendlier message before the insert.
 */
export const MAX_BUILDS_PER_COMMITMENT_PER_DAY = 5;

/** A "building" row with no deployment id this old crashed before Vercel was called. */
export const START_STALE_MS = 5 * 60_000;

/** A deployment not READY by now is cancelled and recorded as failed. */
export const DEPLOY_TIMEOUT_MS = 20 * 60_000;

/**
 * If Vercel can't be reached to confirm a deployment's state, the row stays
 * "building" (never guessed "live") until this age, then is recorded failed.
 */
export const UNCONFIRMED_GIVE_UP_MS = 30 * 60_000;
