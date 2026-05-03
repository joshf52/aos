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

export default async function FeedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [oppsResult, profileResult] = await Promise.all([
    supabase
      .from("opportunities")
      .select("*")
      .eq("is_active", true) as unknown as Promise<{
      data: OpportunityWithDomains[] | null;
    }>,
    user
      ? (supabase
          .from("profiles")
          .select("domains")
          .eq("id", user.id)
          .single() as unknown as Promise<{
          data: { domains: string[] | null } | null;
        }>)
      : Promise.resolve({ data: null }),
  ]);

  const userDomains = new Set<string>(
    (profileResult as { data: { domains: string[] | null } | null }).data
      ?.domains ?? []
  );
  const allOpps = oppsResult.data ?? [];

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

  return (
    <FeedContent
      opportunities={opportunities}
      dateLabel={formatDate()}
      subtitle={subtitle}
      userDomains={domainsArr}
    />
  );
}
