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
  // Legacy rows (the old pipeline marked builds live on acceptance) can lack
  // either; a live claim needs both.
  if (row.status === "live" && (!row.deployment_id || !/^https:\/\/\S+$/.test(row.deployment_url ?? ""))) {
    return { status: "failed", deploymentUrl: null, error: "The deploy finished without an address." };
  }
  return { status: row.status, deploymentUrl: row.deployment_url, error: shownError(row.error) };
}

// Only messages this code writes are shown. Older rows hold raw provider
// errors from the previous pipeline; those stay in the database, not the page.
const KNOWN_ERRORS = new Set([
  "The deploy couldn't start. Try again in a moment.",
  "The deploy failed. Try again, or change the plan first.",
  "The deploy was cancelled.",
  "The deploy took too long and was stopped.",
  "The deploy took too long.",
  "The deploy couldn't be confirmed.",
  "The deploy is gone.",
  "The deploy couldn't be matched to this build.",
  "The app built, but its address couldn't be assigned.",
  "The build stopped before the deploy started.",
  "Superseded by a newer build.",
]);

function shownError(error: string | null): string | null {
  if (error === null) return null;
  return KNOWN_ERRORS.has(error) ? error : "The deploy failed. Try again, or change the plan first.";
}
