import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion";
import { AOSAnimatedBackground } from "@/components/aos/animated-background";
import { AOSDepthCard } from "@/components/aos/depth-card";
import { MilestoneRail } from "@/components/aos/milestone-rail";
import { CurrentBuildPanel } from "@/components/aos/command/current-build-panel";
import { LaunchChecklist } from "@/components/aos/command/launch-checklist";

const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function calcDaysIn(startedAt: string): number {
  const start = new Date(startedAt);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(diff + 1, 1), 30);
}

function calcWeek(startedAt: string): number {
  return Math.min(Math.ceil(calcDaysIn(startedAt) / 7), 4);
}

function formatLogDate(iso: string): string {
  const d = new Date(iso);
  return `${DAYS_LONG[d.getDay()].slice(0, 3).toUpperCase()} · ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

type CommitmentRow = {
  id: string;
  opportunity_id: string;
  started_at: string;
};

type CheckinRow = {
  id: string;
  week_number: number;
  created_at: string;
  shipped_learned: string;
};

async function saveTodayCheckin(formData: FormData): Promise<void> {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const commitmentId = (formData.get("commitmentId") as string) || "";
  const shipped = ((formData.get("shipped") as string) || "").trim();
  if (!commitmentId || !shipped) return;

  // Verify commitment is the user's and active; derive current week
  const { data: commitment } = (await supabase
    .from("commitments")
    .select("id, started_at, status")
    .eq("id", commitmentId)
    .eq("user_id", user.id)
    .single()) as unknown as {
    data: { id: string; started_at: string; status: string } | null;
  };
  if (!commitment || commitment.status !== "active") return;

  const week = calcWeek(commitment.started_at);

  // Schema constraint: unique(commitment_id, week_number). If a row already
  // exists for this week, do nothing — UI shows the confirmation state.
  const { data: existing } = await supabase
    .from("checkins")
    .select("id")
    .eq("commitment_id", commitment.id)
    .eq("week_number", week)
    .maybeSingle();
  if (existing) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("checkins") as any).insert({
    commitment_id: commitment.id,
    week_number: week,
    shipped_learned: shipped,
    next_focus: "—",
  });

  revalidatePath("/dashboard");
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: commitments } = (await supabase
    .from("commitments")
    .select("id, opportunity_id, started_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)) as unknown as { data: CommitmentRow[] | null };

  const commitment = commitments?.[0] ?? null;

  if (!commitment) {
    return (
      <main className="relative min-h-dvh bg-aos-bg flex flex-col items-center justify-center px-6 text-center">
        <AOSAnimatedBackground variant="editorial" className="absolute inset-0 z-0" />
        <div className="relative z-[1] w-full max-w-lg">
          <FadeIn>
            <AOSDepthCard glow="gold" intensity="feature" className="p-10">
              <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-aos-tertiary mb-5">
                Sprint
              </p>
              <h1 className="font-serif text-5xl text-aos-text leading-[1.05] tracking-[-0.025em] text-balance">
                No active sprint.
              </h1>
              <p className="font-serif italic text-aos-secondary mt-5 leading-relaxed max-w-md mx-auto">
                Find an opportunity and commit to it to start your thirty-day sprint.
              </p>
              <div className="mt-10 flex justify-center">
                <Button variant="primary" size="lg" href="/feed">
                  Browse opportunities
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Button>
              </div>
            </AOSDepthCard>
          </FadeIn>
        </div>
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
      .select("id, week_number, created_at, shipped_learned")
      .eq("commitment_id", commitment.id)
      .order("created_at", { ascending: false }) as unknown as Promise<{
      data: CheckinRow[] | null;
    }>,
  ]);

  const opportunityTitle = oppResult.data?.title ?? "";
  const checkins = checkinsResult.data ?? [];
  const daysIn = calcDaysIn(commitment.started_at);
  const week = calcWeek(commitment.started_at);
  const progressPct = Math.min(Math.round((daysIn / 30) * 100), 100);
  const checkedInThisWeek = checkins.some((c) => c.week_number === week);

  // Real-data-derived rail: weeks before the current one are shipped, the
  // current week is active, later weeks are upcoming. No mock data — driven
  // entirely by `week`, which itself comes from commitment.started_at.
  const weekSteps: { label: string; sublabel?: string; status: "done" | "active" | "upcoming" }[] =
    [1, 2, 3, 4].map((w) => ({
      label: `Week ${w}`,
      sublabel: w < week ? "Shipped" : w === week ? "In progress" : "Upcoming",
      status: w < week ? "done" : w === week ? "active" : "upcoming",
    }));

  return (
    <main className="relative min-h-dvh bg-aos-bg">
      <AOSAnimatedBackground variant="command" grain rails className="absolute inset-0 z-0" />
      <div className="relative z-[1] px-6 pt-20 pb-32 max-w-3xl mx-auto">
        {/* HEADER */}
        <FadeIn>
          <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-aos-tertiary mb-5">
            Sprint
          </p>
          <h1 className="font-serif text-aos-text text-5xl md:text-6xl leading-[1.02] tracking-[-0.025em] text-balance">
            {opportunityTitle}
          </h1>
          <div className="mt-6 flex items-center gap-3">
            <span className="font-mono text-[12px] tracking-[0.18em] uppercase text-aos-gold tabular-nums">
              Day {daysIn} of 30
            </span>
            <span className="text-aos-tertiary">·</span>
            <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-aos-tertiary tabular-nums">
              Week {week} of 4
            </span>
          </div>
        </FadeIn>

        {/* PROGRESS PANEL — milestone rail (stage progress) + day-count bar */}
        <FadeIn delay={0.05}>
          <AOSDepthCard glow="dual" intensity="feature" className="mt-10 p-6 md:p-8">
            <MilestoneRail steps={weekSteps} />

            <div className="mt-10">
              <div
                className="relative h-1.5 w-full rounded-full overflow-hidden bg-ink-700 border border-aos-border"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={30}
                aria-valuenow={daysIn}
                aria-label={`Day ${daysIn} of 30`}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-aos-gold to-[#B8895A]
                             shadow-[0_0_18px_rgba(212,165,116,0.35)]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[10px] tracking-[0.18em] uppercase text-aos-tertiary tabular-nums">
                <span>{progressPct}%</span>
                <span>{30 - daysIn} days remaining</span>
              </div>
            </div>
          </AOSDepthCard>
        </FadeIn>

        {/* CHECK-IN CARD */}
        <FadeIn delay={0.1}>
          <CurrentBuildPanel
            checkedInThisWeek={checkedInThisWeek}
            week={week}
            commitmentId={commitment.id}
            action={saveTodayCheckin}
            className="mt-14"
          />
        </FadeIn>

        {/* STANDARD BUILD-PATH REFERENCE — static template, not persisted data */}
        <FadeIn delay={0.12}>
          <LaunchChecklist className="mt-14" />
        </FadeIn>

        {/* PAST CHECK-INS LOG */}
        {checkins.length > 0 && (
          <FadeIn delay={0.15}>
            <section className="mt-16">
              <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-aos-tertiary mb-6">
                The log
              </p>

              <AOSDepthCard glow="none" className="px-8">
                <ul className="divide-y divide-aos-border">
                  {checkins.map((c) => (
                    <li key={c.id} className="py-6">
                      <div className="flex items-baseline gap-4 mb-3">
                        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-aos-tertiary tabular-nums shrink-0">
                          {formatLogDate(c.created_at)}
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-aos-gold/70 tabular-nums">
                          Week {c.week_number}
                        </span>
                      </div>
                      <p className="font-serif text-[18px] leading-[1.4] text-aos-text tracking-[-0.005em] whitespace-pre-line text-balance">
                        {c.shipped_learned}
                      </p>
                    </li>
                  ))}
                </ul>
              </AOSDepthCard>
            </section>
          </FadeIn>
        )}

        {/* Quiet "back to feed" link */}
        <FadeIn delay={0.2}>
          <div className="mt-16 text-center">
            <Link
              href="/feed"
              className="font-mono text-[11px] tracking-[0.18em] uppercase text-aos-tertiary hover:text-aos-secondary transition-colors"
            >
              ← Back to today
            </Link>
          </div>
        </FadeIn>
      </div>
    </main>
  );
}
