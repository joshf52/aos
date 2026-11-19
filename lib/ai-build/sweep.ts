/**
 * Cleanup for builds nobody is watching (the status page reconciles only
 * while someone has it open). Run by /api/cron/ai-builds.
 *
 *  1. Every "building" row is reconciled (READY → live, ERROR → failed,
 *     timeouts cancelled), scoped to its own user.
 *  2. Recent "failed" rows can still have a deployment on Vercel that is
 *     building — e.g. the status check gave up while Vercel was unreachable,
 *     or a cancel failed. Those are cancelled. A failed row whose deployment
 *     is READY is reported (it was never recorded live, so no user sees it;
 *     removing a production deployment is left to the operator).
 *
 * Only deployments carrying this exact build's tag (meta.aosBuildId) in this
 * commitment's project are ever cancelled. Untagged (legacy) ones are left
 * alone. The run stops starting new work near its time budget, and works in
 * a random order so a slow item can't starve the rest across runs.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { commitmentStamp } from "./deploy";
import { reconcileBuild } from "./reconcile";
import { BUILD_COLUMNS, supabaseBuildStore, type BuildRecord } from "./store";
import { cancelDeployment, findDeploymentForBuild, getDeployment, IN_PROGRESS, vercelScope, type Deployment } from "./vercel";

const RECENT_FAILED_MS = 14 * 24 * 60 * 60_000;
const BUDGET_MS = 45_000;
const ITEM_RESERVE_MS = 12_000;

export type SweepReport = {
  reconciled: number; nowLive: number; nowFailed: number; cancelled: number;
  readyButFailed: string[]; skippedUntagged: number; deferred: number; errors: number;
};

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

function taggedFor(d: Deployment, row: BuildRecord): boolean {
  return d.meta?.aosBuildId === row.id && !!d.name && d.name.endsWith(`-${commitmentStamp(row.commitment_id)}`);
}

export async function sweepBuilds(admin: SupabaseClient<Database>, limit = 100, now = Date.now()): Promise<SweepReport> {
  const report: SweepReport = { reconciled: 0, nowLive: 0, nowFailed: 0, cancelled: 0, readyButFailed: [], skippedUntagged: 0, deferred: 0, errors: 0 };
  const deadline = now + BUDGET_MS;
  const timeLeft = () => deadline - Date.now() > ITEM_RESERVE_MS;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = () => admin.from("ai_builds") as any;
  const scope = vercelScope();

  const { data: building, error: bErr } = await table().select(BUILD_COLUMNS).eq("status", "building").order("created_at").limit(limit);
  if (bErr) throw new Error(`ai_builds read failed: ${bErr.message}`);
  for (const row of shuffle((building ?? []) as BuildRecord[])) {
    if (!timeLeft()) { report.deferred++; continue; }
    try {
      const after = await reconcileBuild(supabaseBuildStore(admin, row.user_id), row, { scope, deadline: deadline - 2_000 });
      report.reconciled++;
      if (after.status === "live") report.nowLive++;
      if (after.status === "failed") report.nowFailed++;
    } catch {
      report.errors++;
    }
  }

  const since = new Date(now - RECENT_FAILED_MS).toISOString();
  const { data: failed, error: fErr } = await table()
    .select(BUILD_COLUMNS)
    .eq("status", "failed")
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (fErr) throw new Error(`ai_builds read failed: ${fErr.message}`);
  for (const row of shuffle((failed ?? []) as BuildRecord[])) {
    if (!timeLeft()) { report.deferred++; continue; }
    try {
      let d: Deployment | null = null;
      if (row.deployment_id) {
        d = await getDeployment(scope, row.deployment_id, deadline - 2_000).catch(() => null);
      } else if (row.project_name) {
        const f = await findDeploymentForBuild(scope, row.project_name, row.id, Date.parse(row.created_at), deadline - 2_000);
        d = f === "unknown" ? null : f;
      }
      if (!d) continue;
      if (!taggedFor(d, row)) { report.skippedUntagged++; continue; }
      if (IN_PROGRESS.includes(d.readyState)) {
        if ((await cancelDeployment(scope, d.id, deadline - 2_000)) === "cancelled") report.cancelled++;
      } else if (d.readyState === "READY") {
        report.readyButFailed.push(d.id);
      }
    } catch {
      report.errors++;
    }
  }
  if (report.readyButFailed.length) {
    console.warn(JSON.stringify({ event: "ai_build_ready_but_failed", deployments: report.readyButFailed }));
  }
  return report;
}
