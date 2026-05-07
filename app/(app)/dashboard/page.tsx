import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DashboardContent } from "./dashboard-content";
import { recomputeReputation } from "@/lib/reputation";
import { dailyQuote } from "@/lib/quotes";
import Link from "next/link";

async function abandonCommitment(formData: FormData) {
  "use server";
  const commitmentId = formData.get("commitmentId") as string;
  if (!commitmentId) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("commitments") as any)
    .update({ status: "abandoned", abandoned_at: new Date().toISOString() })
    .eq("id", commitmentId)
    .eq("user_id", user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("events") as any).insert({
    user_id: user.id,
    event_name: "commitment_abandoned",
    payload: { commitment_id: commitmentId },
  });

  await recomputeReputation(supabase, user.id);

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  redirect("/feed");
}

type CommitmentRow = {
  id: string;
  opportunity_id: string;
  lens_id: string;
  started_at: string;
};

type CheckinRow = {
  id: string;
  week_number: number;
  created_at: string;
  next_focus: string;
  shipped_learned: string;
};

type LensRow = {
  answer_4: string | null;
  answer_5: string | null;
  completed_at: string | null;
};

function calcDaysIn(startedAt: string): number {
  const start = new Date(startedAt);
  const now = new Date();
  const diff = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.min(Math.max(diff + 1, 1), 30);
}

function formatStartDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Most recent active commitment + build_mode
  const [{ data: commitments }, { data: profile }] = await Promise.all([
    (supabase
      .from("commitments")
      .select("id, opportunity_id, lens_id, started_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)) as unknown as Promise<{ data: CommitmentRow[] | null }>,
    (supabase
      .from("profiles")
      .select("build_mode")
      .eq("id", user.id)
      .single()) as unknown as Promise<{ data: { build_mode: string | null } | null }>,
  ]);

  const buildMode: "self" | "ai" = profile?.build_mode === "ai" ? "ai" : "self";

  const commitment = commitments?.[0] ?? null;

  if (!commitment) {
    return (
      <main className="min-h-dvh bg-aos-bg flex flex-col items-center justify-center px-6 text-center">
        <p className="font-serif text-[32px] text-aos-text tracking-[-0.02em] leading-tight mb-3">
          No active sprint.
        </p>
        <p className="font-serif italic text-aos-secondary text-sm mb-8 leading-relaxed">
          Find an opportunity and commit to it
          <br />
          to start your 30-day sprint.
        </p>
        <Link
          href="/feed"
          className="px-6 py-3 rounded-full text-sm font-semibold tracking-[-0.01em] transition-opacity hover:opacity-80"
          style={{ background: "#F5F2ED", color: "#0A0A0C" }}
        >
          Browse opportunities
        </Link>
      </main>
    );
  }

  const [oppResult, checkinsResult, lensResult] = await Promise.all([
    supabase
      .from("opportunities")
      .select("title")
      .eq("id", commitment.opportunity_id)
      .single() as unknown as Promise<{ data: { title: string } | null }>,
    supabase
      .from("checkins")
      .select("id, week_number, created_at, next_focus, shipped_learned")
      .eq("commitment_id", commitment.id)
      .order("week_number", { ascending: true }) as unknown as Promise<{
      data: CheckinRow[] | null;
    }>,
    supabase
      .from("decision_lenses")
      .select("answer_4, answer_5, completed_at")
      .eq("id", commitment.lens_id)
      .single() as unknown as Promise<{ data: LensRow | null }>,
  ]);

  const daysIn = calcDaysIn(commitment.started_at);
  const currentWeek = Math.min(Math.ceil(daysIn / 7), 4);
  const checkins = checkinsResult.data ?? [];
  const checkinCount = checkins.length;
  const checkinDue = checkinCount < currentWeek;

  // Today's focus: most recent check-in's next_focus, else lens "smallest test"
  // (answer_4), else a default prompt. The lens completes before commitment is
  // created, so answer_4 is always populated for an active commitment.
  const lastCheckin = checkins[checkins.length - 1] ?? null;
  const focus = lastCheckin?.next_focus
    ? { source: "checkin" as const, week: lastCheckin.week_number, text: lastCheckin.next_focus }
    : lensResult.data?.answer_4
    ? { source: "lens" as const, week: 0, text: lensResult.data.answer_4 }
    : null;

  // Builder log: lens completion → sprint start → each check-in. Newest last.
  const log: { kind: "lens" | "start" | "checkin"; date: string; label: string; detail?: string }[] = [];
  if (lensResult.data?.completed_at) {
    log.push({ kind: "lens", date: lensResult.data.completed_at, label: "Decision Lens completed" });
  }
  log.push({
    kind: "start",
    date: commitment.started_at,
    label: "Sprint began",
    detail: "Covenant signed",
  });
  for (const c of checkins) {
    log.push({
      kind: "checkin",
      date: c.created_at,
      label: `Week ${c.week_number} check-in`,
      detail: c.shipped_learned.slice(0, 80) + (c.shipped_learned.length > 80 ? "…" : ""),
    });
  }

  return (
    <DashboardContent
      commitmentId={commitment.id}
      opportunityTitle={oppResult.data?.title ?? ""}
      daysIn={daysIn}
      currentWeek={currentWeek}
      checkinCount={checkinCount}
      checkinDue={checkinDue}
      startDate={formatStartDate(commitment.started_at)}
      buildMode={buildMode}
      focus={focus}
      log={log}
      quote={dailyQuote()}
      abandonCommitment={abandonCommitment}
    />
  );
}
