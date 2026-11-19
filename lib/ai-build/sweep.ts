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
 *     removing it is a manual call).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { reconcileBuild } from "./reconcile";
import { supabaseBuildStore, type BuildRecord } from "./store";
import { cancelDeployment, findDeploymentForBuild, getDeployment, IN_PROGRESS, vercelScope, type Deployment } from "./vercel";

const COLUMNS = "id, commitment_id, user_id, status, deployment_id, deployment_url, project_name, error, created_at, updated_at";
const RECENT_FAILED_MS = 3 * 24 * 60 * 60_000;

export type SweepReport = { reconciled: number; nowLive: number; nowFailed: number; cancelled: number; readyButFailed: string[]; errors: number };

export async function sweepBuilds(admin: SupabaseClient<Database>, limit = 100): Promise<SweepReport> {
  const report: SweepReport = { reconciled: 0, nowLive: 0, nowFailed: 0, cancelled: 0, readyButFailed: [], errors: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = () => admin.from("ai_builds") as any;
  const scope = vercelScope();

  const { data: building, error: bErr } = await table().select(COLUMNS).eq("status", "building").order("created_at").limit(limit);
  if (bErr) throw new Error(`ai_builds read failed: ${bErr.message}`);
  for (const row of (building ?? []) as BuildRecord[]) {
    try {
      const after = await reconcileBuild(supabaseBuildStore(admin, row.user_id), row, { scope });
      report.reconciled++;
      if (after.status === "live") report.nowLive++;
      if (after.status === "failed") report.nowFailed++;
    } catch {
      report.errors++;
    }
  }

  const since = new Date(Date.now() - RECENT_FAILED_MS).toISOString();
  const { data: failed, error: fErr } = await table()
    .select(COLUMNS)
    .eq("status", "failed")
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (fErr) throw new Error(`ai_builds read failed: ${fErr.message}`);
  for (const row of (failed ?? []) as BuildRecord[]) {
    try {
      let d: Deployment | null = null;
      if (row.deployment_id) d = await getDeployment(scope, row.deployment_id).catch(() => null);
      else if (row.project_name) d = await findDeploymentForBuild(scope, row.project_name, row.id, Date.parse(row.created_at));
      // Only act on deployments tagged as this build (or legacy rows' own id).
      if (!d || (d.meta?.aosBuildId && d.meta.aosBuildId !== row.id)) continue;
      if (IN_PROGRESS.includes(d.readyState)) {
        if ((await cancelDeployment(scope, d.id)) === "cancelled") report.cancelled++;
      } else if (d.readyState === "READY" && d.meta?.aosBuildId === row.id) {
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
