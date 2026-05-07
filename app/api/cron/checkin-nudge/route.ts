import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendCheckinNudge } from "@/lib/email/send";
import { fetchSuppressedAddresses } from "@/lib/email/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CommitmentRow = {
  id: string;
  user_id: string;
  opportunity_id: string;
  started_at: string;
};

type ProfileRow = {
  id: string;
  last_nudged_at: string | null;
};

type CheckinRow = {
  commitment_id: string;
  week_number: number;
};

type AuthUserRow = {
  id: string;
  email: string | null;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function displayName(email: string): string {
  const local = email.split("@")[0];
  const name = local.split(/[._]/)[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function calcDaysIn(startedAt: string): number {
  const start = new Date(startedAt);
  const now = new Date();
  return Math.min(
    Math.max(Math.floor((now.getTime() - start.getTime()) / ONE_DAY_MS) + 1, 1),
    30
  );
}

/**
 * Daily cron: find active commitments where the current week's check-in
 * is overdue and the user hasn't been nudged in the last 24h. Send one
 * email per user, stamp last_nudged_at.
 *
 * Triggered by Vercel Cron via vercel.json. Requires CRON_SECRET header
 * for authorization (matches Vercel's standard pattern).
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = Date.now();

  // 1) All active commitments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: commitmentsRaw, error: commitErr } = await (supabase as any)
    .from("commitments")
    .select("id, user_id, opportunity_id, started_at")
    .eq("status", "active");

  if (commitErr) {
    return NextResponse.json({ error: commitErr.message }, { status: 500 });
  }

  const commitments = (commitmentsRaw ?? []) as CommitmentRow[];
  if (commitments.length === 0) {
    return NextResponse.json({ sent: 0, considered: 0 });
  }

  const commitmentIds = commitments.map((c) => c.id);
  const userIds = Array.from(new Set(commitments.map((c) => c.user_id)));

  // 2) Existing check-ins for those commitments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: checkinsRaw } = await (supabase as any)
    .from("checkins")
    .select("commitment_id, week_number")
    .in("commitment_id", commitmentIds);

  const checkins = (checkinsRaw ?? []) as CheckinRow[];
  const checkinKey = new Set(
    checkins.map((c) => `${c.commitment_id}:${c.week_number}`)
  );

  // 3) Profiles (for last_nudged_at) and auth users (for email)
  const [profilesRes, usersRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("profiles")
      .select("id, last_nudged_at")
      .in("id", userIds),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const profiles = ((profilesRes.data ?? []) as ProfileRow[]).reduce(
    (acc, p) => acc.set(p.id, p),
    new Map<string, ProfileRow>()
  );

  const emailById = new Map<string, string>();
  for (const u of (usersRes.data?.users ?? []) as AuthUserRow[]) {
    if (u.email) emailById.set(u.id, u.email);
  }

  // 4) Opportunity titles
  const oppIds = Array.from(new Set(commitments.map((c) => c.opportunity_id)));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: oppsRaw } = await (supabase as any)
    .from("opportunities")
    .select("id, title")
    .in("id", oppIds);

  const titleById = new Map<string, string>();
  for (const o of (oppsRaw ?? []) as { id: string; title: string }[]) {
    titleById.set(o.id, o.title);
  }

  // 5) Suppression: skip addresses that have ever bounced or complained
  const suppressed = await fetchSuppressedAddresses();

  // 6) For each commitment, decide whether to nudge
  let sent = 0;
  let considered = 0;
  let skippedSuppressed = 0;
  const nowIso = new Date().toISOString();
  const userLastNudged = new Map<string, string>(); // throttle per user

  for (const commitment of commitments) {
    considered += 1;

    const daysIn = calcDaysIn(commitment.started_at);
    const currentWeek = Math.min(Math.ceil(daysIn / 7), 4);

    // Only nudge after at least 5 days into the week (give breathing room)
    const dayInWeek = ((daysIn - 1) % 7) + 1;
    if (dayInWeek < 5) continue;

    // Already logged this week's check-in?
    if (checkinKey.has(`${commitment.id}:${currentWeek}`)) continue;

    // Throttle: at most one nudge per user per 24h
    const profile = profiles.get(commitment.user_id);
    const lastNudgedRaw =
      userLastNudged.get(commitment.user_id) ?? profile?.last_nudged_at ?? null;
    if (lastNudgedRaw) {
      const last = new Date(lastNudgedRaw).getTime();
      if (now - last < ONE_DAY_MS) continue;
    }

    const email = emailById.get(commitment.user_id);
    if (!email) continue;
    if (suppressed.has(email.toLowerCase())) {
      skippedSuppressed += 1;
      continue;
    }

    const title = titleById.get(commitment.opportunity_id) ?? "your sprint";

    const result = await sendCheckinNudge({
      to: email,
      name: displayName(email),
      weekNumber: currentWeek,
      daysIn,
      opportunityTitle: title,
      commitmentId: commitment.id,
      userId: commitment.user_id,
    });

    if (result.ok) {
      sent += 1;
      userLastNudged.set(commitment.user_id, nowIso);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("profiles") as any)
        .update({ last_nudged_at: nowIso })
        .eq("id", commitment.user_id);
    }
  }

  return NextResponse.json({ sent, considered, skippedSuppressed });
}
