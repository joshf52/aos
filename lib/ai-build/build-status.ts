import type { AiBuildStatus } from "@/types/database";
import { START_STALE_MS, UNCONFIRMED_GIVE_UP_MS } from "./limits";

export type BuildRow = {
  status: AiBuildStatus;
  deployment_id: string | null;
  deployment_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type BuildSummary = { status: AiBuildStatus; deploymentUrl: string | null; error: string | null };

/**
 * What the build page shows for the latest ai_builds row, after reconcile.ts
 * has had its chance to advance it. Only the display is adjusted here, for the
 * case where reconcile couldn't write: a "building" row that is past the point
 * reconcile would have recorded it failed shows the retry path instead of
 * polling forever. "live" is shown only with an address to open.
 */
export function summarizeBuild(row: BuildRow | null, now: number = Date.now()): BuildSummary | null {
  if (!row) return null;
  const since = (iso: string) => now - Date.parse(iso);
  if (row.status === "building") {
    const dead =
      (!row.deployment_id && since(row.updated_at) > START_STALE_MS) || since(row.created_at) > UNCONFIRMED_GIVE_UP_MS;
    if (dead) return { status: "failed", deploymentUrl: null, error: "The deploy stopped responding and timed out." };
  }
  if (row.status === "live" && !row.deployment_url) {
    return { status: "failed", deploymentUrl: null, error: "The deploy finished without an address." };
  }
  return { status: row.status, deploymentUrl: row.deployment_url, error: row.error };
}
