import type { AiBuildStatus } from "@/types/database";
import { UNCONFIRMED_GIVE_UP_MS } from "./limits";

export type BuildRow = {
  status: AiBuildStatus;
  deployment_id: string | null;
  deployment_url: string | null;
  error: string | null;
  verified_at?: string | null;
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
  // While the row is reserved the page keeps polling: reconcile may still be
  // recovering a deployment (and a retry would be refused anyway). Only past
  // the point where reconcile itself gives up is it shown as failed.
  if (row.status === "building" && since(row.created_at) > UNCONFIRMED_GIVE_UP_MS) {
    return { status: "failed", deploymentUrl: null, error: "The deploy stopped responding and timed out." };
  }
  // Live needs what the current code records when it verifies an app: the
  // deployment id, an https address and verified_at. Legacy rows (the old
  // pipeline marked builds live on acceptance) have no verified_at.
  if (row.status === "live" && (!row.deployment_id || !row.verified_at || !/^https:\/\/\S+$/.test(row.deployment_url ?? ""))) {
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
