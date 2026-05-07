import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { FoundersContent } from "./founders-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

type CommitmentRow = {
  user_id: string;
  status: "active" | "completed" | "abandoned";
  started_at: string;
  completed_at: string | null;
  abandoned_at: string | null;
};

type ProfileRow = {
  id: string;
  created_at: string;
  build_mode: "self" | "ai" | null;
  reputation_stage: string;
  capability: string | null;
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export default async function FoundersPage() {
  // Gate 1: must be signed in
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/founders");

  // Gate 2: email must be in the allowlist. We 404 (rather than 403) so the
  // route's existence isn't advertised to anyone outside the founder set.
  const allow = parseAllowlist(process.env.FOUNDERS_EMAILS);
  const email = (user.email ?? "").toLowerCase();
  if (allow.size === 0 || !allow.has(email)) notFound();

  // Service client to bypass RLS for cross-user aggregates.
  const svc = createServiceClient();

  const [profilesRes, commitmentsRes, lensesRes, checkinsRes, oppsRes] =
    await Promise.all([
      svc
        .from("profiles")
        .select("id, created_at, build_mode, reputation_stage, capability"),
      svc
        .from("commitments")
        .select("user_id, status, started_at, completed_at, abandoned_at"),
      svc
        .from("decision_lenses")
        .select("id, user_id, completed_at, current_step"),
      svc.from("checkins").select("id, week_number"),
      svc.from("opportunities").select("id, is_active"),
    ]);

  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const commitments = (commitmentsRes.data ?? []) as CommitmentRow[];
  const lenses = (lensesRes.data ?? []) as Array<{
    user_id: string;
    completed_at: string | null;
    current_step: number;
  }>;
  const checkins = (checkinsRes.data ?? []) as Array<{ week_number: number }>;
  const opps = (oppsRes.data ?? []) as Array<{ is_active: boolean }>;

  // Signup metrics
  const totalSignups = profiles.length;
  const onboardedSignups = profiles.filter(
    (p) => p.build_mode !== null && p.capability !== null
  ).length;
  const buildSelf = profiles.filter((p) => p.build_mode === "self").length;
  const buildAi = profiles.filter((p) => p.build_mode === "ai").length;

  // Reputation distribution
  const stageCounts: Record<string, number> = {
    Explorer: 0,
    Builder: 0,
    Shipper: 0,
    Proven: 0,
  };
  for (const p of profiles) {
    stageCounts[p.reputation_stage] = (stageCounts[p.reputation_stage] ?? 0) + 1;
  }

  // Commitment funnel
  const totalCommitments = commitments.length;
  const activeCount = commitments.filter((c) => c.status === "active").length;
  const completedCount = commitments.filter((c) => c.status === "completed")
    .length;
  const abandonedCount = commitments.filter((c) => c.status === "abandoned")
    .length;

  const committedUserIds = new Set(commitments.map((c) => c.user_id));
  const commitRate =
    totalSignups > 0 ? committedUserIds.size / totalSignups : 0;
  const shipRate =
    totalCommitments > 0 ? completedCount / totalCommitments : 0;
  const abandonRate =
    totalCommitments > 0 ? abandonedCount / totalCommitments : 0;

  // Lens metrics — abandonment is started-but-not-completed
  const startedLenses = lenses.length;
  const completedLenses = lenses.filter((l) => l.completed_at !== null).length;
  const abandonedLenses = startedLenses - completedLenses;
  const lensCompletionRate =
    startedLenses > 0 ? completedLenses / startedLenses : 0;

  // Time to first commit, per user (signup → first commitment.started_at)
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const firstCommitByUser = new Map<string, string>();
  for (const c of commitments) {
    const prev = firstCommitByUser.get(c.user_id);
    if (!prev || new Date(c.started_at) < new Date(prev)) {
      firstCommitByUser.set(c.user_id, c.started_at);
    }
  }
  const ttfcHours: number[] = [];
  firstCommitByUser.forEach((startedAt, uid) => {
    const profile = profileById.get(uid);
    if (!profile) return;
    const hrs =
      (new Date(startedAt).getTime() - new Date(profile.created_at).getTime()) /
      (1000 * 60 * 60);
    if (hrs >= 0) ttfcHours.push(hrs);
  });
  const ttfcMedianHours = median(ttfcHours);
  const ttfcWithin7d = ttfcHours.filter((h) => h <= 24 * 7).length;
  const ttfcWithin7dRate =
    ttfcHours.length > 0 ? ttfcWithin7d / ttfcHours.length : 0;

  // Recent activity (last 7 days)
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentSignups = profiles.filter(
    (p) => new Date(p.created_at).getTime() >= sevenDaysAgo
  ).length;
  const recentCommits = commitments.filter(
    (c) => new Date(c.started_at).getTime() >= sevenDaysAgo
  ).length;

  // Week 1 check-in rate: commitments at least 7 days old that have a week 1
  // check-in (the most diagnostic engagement signal per CLAUDE.md).
  const eligibleForW1 = commitments.filter(
    (c) =>
      c.status !== "abandoned" &&
      new Date(c.started_at).getTime() <= now - 7 * 24 * 60 * 60 * 1000
  );
  const week1Checkins = checkins.filter((ch) => ch.week_number === 1).length;
  const week1CheckinRate =
    eligibleForW1.length > 0
      ? Math.min(week1Checkins / eligibleForW1.length, 1)
      : 0;

  return (
    <FoundersContent
      generatedAt={new Date().toISOString()}
      signups={{
        total: totalSignups,
        onboarded: onboardedSignups,
        recentWeek: recentSignups,
        buildSelf,
        buildAi,
      }}
      commitments={{
        total: totalCommitments,
        active: activeCount,
        completed: completedCount,
        abandoned: abandonedCount,
        recentWeek: recentCommits,
        commitRate,
        shipRate,
        abandonRate,
      }}
      lenses={{
        started: startedLenses,
        completed: completedLenses,
        abandoned: abandonedLenses,
        completionRate: lensCompletionRate,
      }}
      timeToFirstCommit={{
        sample: ttfcHours.length,
        medianHours: ttfcMedianHours,
        within7dRate: ttfcWithin7dRate,
      }}
      week1={{
        eligible: eligibleForW1.length,
        checkins: week1Checkins,
        rate: week1CheckinRate,
      }}
      reputation={stageCounts}
      catalog={{
        active: opps.filter((o) => o.is_active).length,
        total: opps.length,
      }}
    />
  );
}
