import Link from "next/link";

type Signups = {
  total: number;
  onboarded: number;
  recentWeek: number;
  buildSelf: number;
  buildAi: number;
};

type Commitments = {
  total: number;
  active: number;
  completed: number;
  abandoned: number;
  recentWeek: number;
  commitRate: number;
  shipRate: number;
  abandonRate: number;
};

type Lenses = {
  started: number;
  completed: number;
  abandoned: number;
  completionRate: number;
};

type Ttfc = {
  sample: number;
  medianHours: number | null;
  within7dRate: number;
};

type Week1 = {
  eligible: number;
  checkins: number;
  rate: number;
};

function pct(v: number): string {
  return `${(v * 100).toFixed(0)}%`;
}

function fmtHours(h: number | null): string {
  if (h === null) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function StatTile({
  label,
  value,
  hint,
  warn,
  good,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
  good?: boolean;
}) {
  const valueColor = good ? "#3DB87A" : warn ? "#D4A574" : "#F5F2ED";
  return (
    <div
      className="p-5 rounded-[18px]"
      style={{
        background: "#15151A",
        border: "1px solid rgba(245,242,237,0.08)",
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.16em] font-medium text-aos-tertiary mb-2">
        {label}
      </div>
      <div
        className="font-serif text-[32px] tracking-[-0.03em] tabular-nums leading-none"
        style={{ color: valueColor }}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-aos-secondary mt-2 tabular-nums">
          {hint}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-[22px] text-aos-text tracking-[-0.02em] mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function FoundersContent({
  generatedAt,
  signups,
  commitments,
  lenses,
  timeToFirstCommit,
  week1,
  reputation,
  catalog,
}: {
  generatedAt: string;
  signups: Signups;
  commitments: Commitments;
  lenses: Lenses;
  timeToFirstCommit: Ttfc;
  week1: Week1;
  reputation: Record<string, number>;
  catalog: { active: number; total: number };
}) {
  // Failure-mode flags from CLAUDE.md success metrics
  const commitRateWarn =
    commitments.total > 0 && commitments.commitRate < 0.1;
  const lensAbandonWarn =
    lenses.started > 0 && 1 - lenses.completionRate > 0.6;
  const noWeek1 = week1.eligible > 0 && week1.checkins === 0;

  const generated = new Date(generatedAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <main className="min-h-dvh bg-aos-bg text-aos-text">
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-24">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] font-medium text-aos-tertiary">
              Founders
            </div>
            <h1 className="font-serif text-[44px] text-aos-text tracking-[-0.035em] leading-[1.05] mt-2">
              How it&rsquo;s going.
            </h1>
            <p className="font-serif italic text-aos-secondary text-[15px] mt-3 leading-relaxed">
              The numbers behind the product. Refreshed on each load.
            </p>
          </div>
          <Link
            href="/feed"
            className="text-[12px] uppercase tracking-[0.14em] text-aos-secondary hover:text-aos-text transition-colors shrink-0"
          >
            ← Feed
          </Link>
        </div>

        <div className="text-[10px] uppercase tracking-[0.16em] text-aos-tertiary mt-6 tabular-nums">
          Generated {generated}
        </div>

        <Section title="Signups">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              label="Total"
              value={String(signups.total)}
              hint={`+${signups.recentWeek} in last 7d`}
            />
            <StatTile
              label="Onboarded"
              value={String(signups.onboarded)}
              hint={
                signups.total > 0
                  ? `${pct(signups.onboarded / signups.total)} of total`
                  : "—"
              }
            />
            <StatTile
              label="Self-build"
              value={String(signups.buildSelf)}
              hint={
                signups.onboarded > 0
                  ? `${pct(signups.buildSelf / signups.onboarded)} of onboarded`
                  : "—"
              }
            />
            <StatTile
              label="AI-build"
              value={String(signups.buildAi)}
              hint={
                signups.onboarded > 0
                  ? `${pct(signups.buildAi / signups.onboarded)} of onboarded`
                  : "—"
              }
            />
          </div>
        </Section>

        <Section title="Commitment funnel">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              label="Commit rate"
              value={pct(commitments.commitRate)}
              hint={`${commitments.total} sprint${
                commitments.total === 1 ? "" : "s"
              } from ${signups.total} signup${signups.total === 1 ? "" : "s"}`}
              warn={commitRateWarn}
              good={commitments.commitRate >= 0.2}
            />
            <StatTile
              label="Active"
              value={String(commitments.active)}
              hint={`+${commitments.recentWeek} in last 7d`}
            />
            <StatTile
              label="Ship rate"
              value={pct(commitments.shipRate)}
              hint={`${commitments.completed} of ${commitments.total} shipped`}
              good={commitments.shipRate >= 0.3}
            />
            <StatTile
              label="Abandon rate"
              value={pct(commitments.abandonRate)}
              hint={`${commitments.abandoned} abandoned`}
              warn={commitments.abandonRate >= 0.4}
            />
          </div>
        </Section>

        <Section title="Time to first commit">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatTile
              label="Median"
              value={fmtHours(timeToFirstCommit.medianHours)}
              hint={`n=${timeToFirstCommit.sample} committed users`}
            />
            <StatTile
              label="Within 7 days"
              value={pct(timeToFirstCommit.within7dRate)}
              hint="Atomic-unit benchmark from CLAUDE.md"
              good={timeToFirstCommit.within7dRate >= 0.5}
            />
            <StatTile
              label="Week-1 check-in"
              value={pct(week1.rate)}
              hint={`${week1.checkins} of ${week1.eligible} eligible`}
              warn={noWeek1}
              good={week1.rate >= 0.5}
            />
          </div>
        </Section>

        <Section title="Lens engagement">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="Started" value={String(lenses.started)} />
            <StatTile
              label="Completed"
              value={String(lenses.completed)}
              hint={`${pct(lenses.completionRate)} completion`}
            />
            <StatTile
              label="Abandoned"
              value={String(lenses.abandoned)}
              warn={lensAbandonWarn}
            />
            <StatTile
              label="Lens → commit"
              value={
                lenses.completed > 0
                  ? pct(commitments.total / lenses.completed)
                  : "—"
              }
              hint="Of lenses finished, share that became sprints"
            />
          </div>
        </Section>

        <Section title="Reputation">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(["Explorer", "Builder", "Shipper", "Proven"] as const).map(
              (stage) => (
                <StatTile
                  key={stage}
                  label={stage}
                  value={String(reputation[stage] ?? 0)}
                />
              )
            )}
          </div>
        </Section>

        <Section title="Catalog">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              label="Active opportunities"
              value={String(catalog.active)}
              hint={`${catalog.total} total in catalog`}
            />
          </div>
        </Section>

        {(commitRateWarn || lensAbandonWarn || noWeek1) && (
          <Section title="Flags">
            <ul className="space-y-2 text-[14px] text-aos-secondary">
              {commitRateWarn && (
                <li>
                  Commit rate below 10% — opportunities may not be compelling
                  enough.
                </li>
              )}
              {lensAbandonWarn && (
                <li>
                  Lens abandonment above 60% — the framework may be too heavy.
                </li>
              )}
              {noWeek1 && (
                <li>
                  No Week 1 check-ins among eligible commitments — commitment
                  may be performative.
                </li>
              )}
            </ul>
          </Section>
        )}
      </div>
    </main>
  );
}
