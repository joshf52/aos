/**
 * Moves an in-flight build to its real outcome by asking Vercel, and records
 * it. The rule this file keeps: a build is "live" only after Vercel reports
 * READY with a public production alias AND the database accepted that write.
 * The caller shows what this returns, which is always the row as the database
 * holds it — never a status computed here that failed to persist.
 *
 * Called by the build status page on every render (the page re-renders every
 * 15 s while building) and by runBuild before it decides a build is running.
 */

import { cancelDeployment, getDeployment, vercelScope, type Deployment, type VercelScope } from "./vercel";
import { DEPLOY_TIMEOUT_MS, START_STALE_MS, UNCONFIRMED_GIVE_UP_MS } from "./limits";
import type { BuildRecord, BuildStore } from "./store";

const age = (iso: string, now: number) => now - Date.parse(iso);

/** Public address of a READY production deployment, or null if none assigned yet. */
export function publicUrl(d: Deployment): string | null {
  // The per-deployment URL sits behind Vercel's default deployment protection;
  // the production alias (<project>.vercel.app) is the one visitors can open.
  const aliases = d.alias ?? [];
  const alias = aliases.find((a) => a.endsWith(".vercel.app")) ?? aliases[0];
  return alias ? `https://${alias}` : null;
}

// What the user sees (ai_builds.error is shown on the build page). Vercel's
// own detail goes to the server log instead.
function failureText(d: Deployment): string {
  if (d.readyState === "CANCELED") return "The deploy was cancelled.";
  return "The deploy failed. Try again, or change the plan first.";
}

export async function reconcileBuild(
  store: BuildStore,
  row: BuildRecord,
  opts: { now?: number; scope?: VercelScope } = {},
): Promise<BuildRecord> {
  if (row.status !== "building") return row;
  const now = opts.now ?? Date.now();

  const fail = async (error: string, detail?: unknown): Promise<BuildRecord> => {
    console.warn(JSON.stringify({ event: "ai_build_failed", build: row.id, deployment: row.deployment_id, error, detail }));
    // If the write loses a race, show whatever the other writer recorded.
    const saved = await store.update(row.id, { status: "failed", error }, "building");
    return saved ?? row;
  };

  if (!row.deployment_id) {
    // runBuild records the deployment id seconds after inserting the row; a
    // row without one this old means that request died first.
    if (age(row.updated_at, now) > START_STALE_MS) return fail("The build stopped before the deploy started.");
    return row;
  }

  let scope: VercelScope;
  try {
    scope = opts.scope ?? vercelScope();
  } catch {
    return age(row.created_at, now) > UNCONFIRMED_GIVE_UP_MS ? fail("The deploy couldn't be confirmed.") : row;
  }

  let d: Deployment;
  try {
    d = await getDeployment(scope, row.deployment_id);
  } catch (e) {
    console.warn(JSON.stringify({ event: "ai_build_status_check_failed", build: row.id, message: e instanceof Error ? e.message : String(e) }));
    // Unknown is not success: stay "building" until we can confirm, then give up.
    return age(row.created_at, now) > UNCONFIRMED_GIVE_UP_MS ? fail("The deploy couldn't be confirmed.") : row;
  }

  if (d.readyState === "READY") {
    const url = publicUrl(d);
    if (url) {
      const saved = await store.update(row.id, { status: "live", deployment_url: url, error: null }, "building");
      return saved ?? row;
    }
    if (d.aliasError) return fail("The app built, but its address couldn't be assigned.", d.aliasError);
    // READY but the alias is still being assigned — check again next time.
  } else if (d.readyState === "ERROR" || d.readyState === "CANCELED" || d.readyState === "BLOCKED") {
    return fail(failureText(d), { readyState: d.readyState, errorCode: d.errorCode, errorMessage: d.errorMessage });
  }

  if (age(row.created_at, now) > DEPLOY_TIMEOUT_MS) {
    await cancelDeployment(scope, row.deployment_id);
    return fail("The deploy took too long and was stopped.");
  }
  return row;
}

/** Page helper: reconcile, but never let a status check break the page. */
export async function reconcileForDisplay(store: BuildStore, row: BuildRecord): Promise<BuildRecord> {
  try {
    return await reconcileBuild(store, row);
  } catch (e) {
    console.error(JSON.stringify({ event: "ai_build_reconcile_failed", build: row.id, message: e instanceof Error ? e.message : String(e) }));
    return row;
  }
}
