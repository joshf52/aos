import { createClient } from "@/lib/supabase/server";
import { FeedContent } from "./feed-content";
import type { Opportunity } from "@/types/database";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DOMAIN_LABELS: Record<string, string> = {
  ai: "AI & ML", creator: "Creator Economy", b2b: "B2B SaaS",
  devtools: "Dev Tools", health: "Health", finance: "Finance",
  education: "Education", productivity: "Productivity",
  commerce: "E-commerce", community: "Community", media: "Media", climate: "Climate",
};

function formatDate(): string {
  const d = new Date();
  return `${DAYS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

type OpportunityWithDomains = Opportunity & { domains?: string[] | null };

/**
 * Score = base confidence + 2 * (number of overlapping domains).
 * A strong domain match (3+ overlaps) outweighs a one-point confidence
 * difference, but base quality still anchors ranking.
 */
function scoreOpportunity(
  opp: OpportunityWithDomains,
  userDomains: Set<string>
): number {
  const overlap = (opp.domains ?? []).reduce(
    (acc, d) => (userDomains.has(d) ? acc + 1 : acc),
    0
  );
  return opp.confidence + overlap * 2;
}

function calcDaysIn(startedAt: string): number {
  const diff = Math.floor(
    (Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.min(Math.max(diff + 1, 1), 30);
}

type ActiveCommitmentRow = {
  id: string;
  opportunity_id: string;
  started_at: string;
};

type ShippedRow = {
  completed_at: string | null;
  shipped_url: string;
  opportunity: { title: string; capability: string } | null;
};

export type ShippedCard = {
  title: string;
  capability: string;
  url: string;
  shippedAt: string;
};

export type TrendingSignal = {
  domain: string;
  label: string;
  count: number;
};

export default async function FeedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [oppsResult, profileResult, commitmentResult, shippedResult] = await Promise.all([
    supabase
      .from("opportunities")
      .select("*")
      .eq("is_active", true) as unknown as Promise<{
      data: OpportunityWithDomains[] | null;
    }>,
    user
      ? (supabase
          .from("profiles")
          .select("domains, build_mode")
          .eq("id", user.id)
          .single() as unknown as Promise<{
          data: { domains: string[] | null; build_mode: string | null } | null;
        }>)
      : Promise.resolve({ data: null }),
    user
      ? (supabase
          .from("commitments")
          .select("id, opportunity_id, started_at")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("started_at", { ascending: false })
          .limit(1) as unknown as Promise<{
          data: ActiveCommitmentRow[] | null;
        }>)
      : Promise.resolve({ data: null }),
    supabase
      .from("commitments")
      .select("completed_at, shipped_url, opportunity:opportunities(title, capability)")
      .not("shipped_url", "is", null)
      .order("completed_at", { ascending: false })
      .limit(3) as unknown as Promise<{ data: ShippedRow[] | null }>,
  ]);

  const profile = (profileResult as {
    data: { domains: string[] | null; build_mode: string | null } | null;
  }).data;
  const userDomains = new Set<string>(profile?.domains ?? []);
  const allOpps = oppsResult.data ?? [];

  const activeCommitment = (commitmentResult as { data: ActiveCommitmentRow[] | null }).data?.[0] ?? null;

  let sprint: {
    commitmentId: string;
    opportunityTitle: string;
    daysIn: number;
    checkinDue: boolean;
    buildMode: "self" | "ai";
  } | null = null;

  if (activeCommitment) {
    const opp = allOpps.find((o) => o.id === activeCommitment.opportunity_id);
    const daysIn = calcDaysIn(activeCommitment.started_at);
    const currentWeek = Math.min(Math.ceil(daysIn / 7), 4);

    const { data: checkins } = (await supabase
      .from("checkins")
      .select("id")
      .eq("commitment_id", activeCommitment.id)) as unknown as {
      data: { id: string }[] | null;
    };
    const checkinCount = checkins?.length ?? 0;

    sprint = {
      commitmentId: activeCommitment.id,
      opportunityTitle: opp?.title ?? "Your sprint",
      daysIn,
      checkinDue: checkinCount < currentWeek,
      buildMode: profile?.build_mode === "ai" ? "ai" : "self",
    };
  }

  // Rank: score desc, then confidence desc, then most recent
  const ranked = [...allOpps].sort((a, b) => {
    const sa = scoreOpportunity(a, userDomains);
    const sb = scoreOpportunity(b, userDomains);
    if (sb !== sa) return sb - sa;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const opportunities = ranked.slice(0, 5);

  // Subtitle copy adapts to whether the user has selected domains and whether
  // we found any matches in the top result.
  const domainsArr = Array.from(userDomains);
  const featured = opportunities[0];
  const featuredOverlap = featured?.domains?.filter((d) =>
    userDomains.has(d)
  ) ?? [];

  let subtitle: string;
  if (domainsArr.length === 0) {
    subtitle = "One opportunity worth your attention.";
  } else if (featuredOverlap.length > 0) {
    const label = DOMAIN_LABELS[featuredOverlap[0]] ?? featuredOverlap[0];
    subtitle = `Matched to your interest in ${label.toLowerCase()}.`;
  } else {
    const first = DOMAIN_LABELS[domainsArr[0]] ?? domainsArr[0];
    const extra = domainsArr.length - 1;
    subtitle = `Tuned to ${first.toLowerCase()}${
      extra > 0 ? ` and ${extra} other domain${extra > 1 ? "s" : ""}` : ""
    } you picked.`;
  }

  // Trending signals — count domain occurrences across all active opps,
  // top 4 wins. Gives the feed a "what's hot this week" pulse without
  // needing real time-series data.
  const domainCounts = new Map<string, number>();
  for (const opp of allOpps) {
    for (const d of opp.domains ?? []) {
      domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
    }
  }
  const trending: TrendingSignal[] = Array.from(domainCounts.entries())
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([domain, count]) => ({
      domain,
      label: DOMAIN_LABELS[domain] ?? domain,
      count,
    }));

  // Just shipped — anonymized recent ships. Social proof that this thing works.
  const shipped: ShippedCard[] = (shippedResult.data ?? [])
    .filter((s) => s.opportunity && s.shipped_url && s.completed_at)
    .map((s) => ({
      title: s.opportunity!.title,
      capability: s.opportunity!.capability,
      url: s.shipped_url,
      shippedAt: s.completed_at!,
    }));

  return (
    <FeedContent
      opportunities={opportunities}
      dateLabel={formatDate()}
      subtitle={subtitle}
      userDomains={domainsArr}
      sprint={sprint}
      trending={trending}
      shipped={shipped}
    />
  );
}
