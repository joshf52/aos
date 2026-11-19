/**
 * Moves an in-flight build to its real outcome by asking Vercel, and records
 * it. The rule this file keeps: a build is "live" only after Vercel reports
 * READY with an assigned production alias, that public address answers
 * /api/health with this build's id (reachable without a login, served by
 * this deployment), AND the database accepted the write. The caller shows
 * what this returns, which is always the row as the database holds it.
 *
 * Called by the build status page on every render (it re-renders every 15 s
 * while building), by runBuild before it decides a build is running, and by
 * the cleanup cron (sweep.ts), which also covers builds nobody is watching.
 */

import { commitmentStamp } from "./deploy";
import { DEPLOY_TIMEOUT_MS, START_STALE_MS, UNCONFIRMED_GIVE_UP_MS } from "./limits";
import type { BuildRecord, BuildStore } from "./store";
import {
  cancelDeployment,
  findDeploymentForBuild,
  getDeployment,
  IN_PROGRESS,
  safeCode,
  vercelScope,
  VercelError,
  type Deployment,
  type VercelScope,
} from "./vercel";

const age = (iso: string, now: number) => now - Date.parse(iso);

/** The project's production alias of a READY deployment, or null if not (yet) assigned. */
export function publicUrl(d: Deployment): string | null {
  // The per-deployment URL sits behind Vercel's default deployment protection;
  // the production alias <project>.vercel.app is the one visitors open. Take
  // exactly that one, not whichever alias happens to be listed first.
  if (!d.aliasAssigned || d.aliasError || !d.name) return null;
  const want = `${d.name}.vercel.app`;
  return (d.alias ?? []).includes(want) ? `https://${want}` : null;
}

/**
 * The deployment carries this exact build's tag and lives in this
 * commitment's project. Every automated action (live, cancel) requires it;
 * untagged (legacy) deployments are never touched.
 */
function belongsTo(d: Deployment, row: BuildRecord): boolean {
  const stamp = commitmentStamp(row.commitment_id);
  const nameOk = !!d.name && d.name.startsWith("aos-") && d.name.endsWith(`-${stamp}`);
  return nameOk && d.meta?.aosBuildId === row.id;
}

/**
 * Does the public address answer, without a login, as this exact deployment
 * of this build? The app reports Vercel's own VERCEL_DEPLOYMENT_ID, so a
 * redeploy that inherited the project's AOS_BUILD_ID can't answer for it.
 */
async function servesDeployment(url: string, buildId: string, deploymentId: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/health`, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (res.status !== 200) return false;
    const body = (await res.json()) as { build?: unknown; deployment?: unknown };
    return body.build === buildId && body.deployment === deploymentId;
  } catch {
    return false;
  }
}

export type ReconcileDeps = {
  now?: number;
  scope?: VercelScope;
  /** Epoch ms: Vercel calls made by this check finish by then (the cron's budget). */
  deadline?: number;
  probe?: (url: string, buildId: string, deploymentId: string) => Promise<boolean>;
};

export async function reconcileBuild(store: BuildStore, row: BuildRecord, opts: ReconcileDeps = {}): Promise<BuildRecord> {
  if (row.status !== "building") return row;
  const now = opts.now ?? Date.now();
  const probe = opts.probe ?? servesDeployment;
  let current = row;

  // Logs carry ids, states and codes only — no provider text.
  const fail = async (error: string, detail?: Record<string, unknown>): Promise<BuildRecord> => {
    console.warn(JSON.stringify({ event: "ai_build_failed", build: row.id, deployment: current.deployment_id, error, ...detail }));
    const saved = await store.update(row.id, { status: "failed", error }, { status: "building", deploymentId: current.deployment_id });
    // Lost a race: show whatever the other writer recorded.
    return saved ?? current;
  };

  let scope: VercelScope;
  try {
    scope = opts.scope ?? vercelScope();
  } catch {
    return age(row.created_at, now) > UNCONFIRMED_GIVE_UP_MS ? fail("The deploy couldn't be confirmed.") : row;
  }

  if (!current.deployment_id) {
    // runBuild records the id seconds after the row is reserved; give it room
    // before searching Vercel.
    if (age(row.updated_at, now) < 30_000) return row;
    // The create request may have reached Vercel even though its answer (or
    // our write of the id) was lost. The deployment carries this build's id,
    // so look for it before deciding anything.
    if (current.project_name) {
      let found: Deployment | null | "unknown" = null;
      try {
        found = await findDeploymentForBuild(scope, current.project_name, row.id, Date.parse(row.created_at), opts.deadline);
      } catch (e) {
        console.warn(JSON.stringify({ event: "ai_build_lookup_failed", build: row.id, status: e instanceof VercelError ? e.status : null }));
        found = "unknown";
      }
      // An incomplete search is not absence: keep the row open (the page
      // keeps polling) until reconcile would give up anyway.
      if (found === "unknown") {
        return age(row.created_at, now) > UNCONFIRMED_GIVE_UP_MS ? fail("The deploy couldn't be confirmed.") : row;
      }
      if (found && belongsTo(found, row)) {
        const adopted = await store.update(row.id, { deployment_id: found.id }, { status: "building", deploymentId: null });
        if (!adopted) return row;
        console.warn(JSON.stringify({ event: "ai_build_adopted_deployment", build: row.id, deployment: found.id }));
        current = adopted;
      }
    }
    if (!current.deployment_id) {
      if (age(row.updated_at, now) > START_STALE_MS) return fail("The build stopped before the deploy started.");
      return row;
    }
  }

  let d: Deployment;
  try {
    d = await getDeployment(scope, current.deployment_id!, opts.deadline);
  } catch (e) {
    if (e instanceof VercelError && e.status === 404) return fail("The deploy is gone.", { status: 404 });
    console.warn(JSON.stringify({ event: "ai_build_status_check_failed", build: row.id, status: e instanceof VercelError ? e.status : null }));
    // Unknown is not success: stay "building" until we can confirm, then give
    // up. The cleanup cron keeps checking failed rows that carry a deployment.
    return age(row.created_at, now) > UNCONFIRMED_GIVE_UP_MS ? fail("The deploy couldn't be confirmed.") : current;
  }

  if (!belongsTo(d, current)) {
    // Never act on someone else's deployment (a legacy row could name any id).
    return fail("The deploy couldn't be matched to this build.");
  }

  if (d.readyState === "READY") {
    const url = publicUrl(d);
    if (url && (await probe(url, row.id, d.id))) {
      const saved = await store.update(
        row.id,
        { status: "live", deployment_url: url, error: null, verified_at: new Date().toISOString() },
        { status: "building", deploymentId: d.id },
      );
      return saved ?? current;
    }
    if (d.aliasError) return fail("The app built, but its address couldn't be assigned.", { aliasError: safeCode(d.aliasError.code) ?? null });
    // READY, but the alias or the app isn't answering yet — check again next time.
  } else if (d.readyState === "ERROR" || d.readyState === "CANCELED" || d.readyState === "BLOCKED" || d.readyState === "DELETED") {
    return fail(
      d.readyState === "CANCELED" ? "The deploy was cancelled." : "The deploy failed. Try again, or change the plan first.",
      { readyState: d.readyState, errorCode: safeCode(d.errorCode) ?? null },
    );
  }

  if (age(row.created_at, now) > DEPLOY_TIMEOUT_MS) {
    // Still building: stop it. READY but never reachable: nothing to cancel;
    // it isn't recorded live, and the cron reports it.
    const cancel = IN_PROGRESS.includes(d.readyState) ? await cancelDeployment(scope, d.id, opts.deadline) : "not-cancelable";
    return fail(
      cancel === "cancelled" ? "The deploy took too long and was stopped." : "The deploy took too long.",
      { readyState: d.readyState, cancel },
    );
  }
  return current;
}

/** Page helper: reconcile, but never let a status check break the page. */
export async function reconcileForDisplay(store: BuildStore, row: BuildRecord): Promise<BuildRecord> {
  try {
    return await reconcileBuild(store, row);
  } catch (e) {
    console.error(JSON.stringify({ event: "ai_build_reconcile_failed", build: row.id, kind: e instanceof Error ? e.name : "unknown" }));
    return row;
  }
}
