import type { AiBuildStatus } from "@/types/database";
import { STALE_BUILD_MS } from "./limits";

export type BuildRow = {
  status: AiBuildStatus;
  deployment_url: string | null;
  error: string | null;
  updated_at: string;
};

export type BuildSummary = { status: AiBuildStatus; deploymentUrl: string | null; error: string | null };

/**
 * What the build page shows for the latest ai_builds row. A "building" row
 * nobody has touched for STALE_BUILD_MS is a crashed run (e.g. the function hit
 * its time limit): show it as failed so the user gets the retry path instead of
 * a status page that polls forever. runBuild expires the row itself on retry.
 */
export function summarizeBuild(row: BuildRow | null, now: number = Date.now()): BuildSummary | null {
  if (!row) return null;
  const updated = Date.parse(row.updated_at);
  if (row.status === "building" && Number.isFinite(updated) && now - updated > STALE_BUILD_MS) {
    return { status: "failed", deploymentUrl: null, error: "The deploy stopped responding and timed out." };
  }
  return { status: row.status, deploymentUrl: row.deployment_url, error: row.error };
}
