import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "./dashboard-content";
import Link from "next/link";

type CommitmentRow = {
  id: string;
  opportunity_id: string;
  lens_id: string;
  started_at: string;
};

type CheckinRow = { id: string; week_number: number };

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

  // Most recent active commitment
  const { data: commitments } = (await supabase
    .from("commitments")
    .select("id, opportunity_id, lens_id, started_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)) as unknown as { data: CommitmentRow[] | null };

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

  const [oppResult, checkinsResult] = await Promise.all([
    supabase
      .from("opportunities")
      .select("title")
      .eq("id", commitment.opportunity_id)
      .single() as unknown as Promise<{ data: { title: string } | null }>,
    supabase
      .from("checkins")
      .select("id, week_number")
      .eq("commitment_id", commitment.id) as unknown as Promise<{
      data: CheckinRow[] | null;
    }>,
  ]);

  const daysIn = calcDaysIn(commitment.started_at);
  const currentWeek = Math.min(Math.ceil(daysIn / 7), 4);
  const checkinCount = checkinsResult.data?.length ?? 0;
  const checkinDue = checkinCount < currentWeek;

  return (
    <DashboardContent
      commitmentId={commitment.id}
      opportunityTitle={oppResult.data?.title ?? ""}
      daysIn={daysIn}
      currentWeek={currentWeek}
      checkinCount={checkinCount}
      checkinDue={checkinDue}
      startDate={formatStartDate(commitment.started_at)}
    />
  );
}
