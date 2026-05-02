import { createClient } from "@/lib/supabase/server";
import { FeedContent } from "./feed-content";

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

export default async function FeedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [oppsResult, profileResult] = await Promise.all([
    supabase.from("opportunities").select("*").eq("is_active", true)
      .order("confidence", { ascending: false }).limit(5),
    user
      ? (supabase.from("profiles").select("domains").eq("id", user.id).single() as unknown as Promise<{ data: { domains: string[] | null } | null }>)
      : Promise.resolve({ data: null }),
  ]);

  const domains: string[] = (profileResult as { data: { domains: string[] | null } | null }).data?.domains ?? [];
  const first = domains.length > 0 ? (DOMAIN_LABELS[domains[0]] ?? domains[0]) : null;
  const extra = Math.max(0, domains.length - 1);
  const subtitle = first
    ? `Tuned to ${first.toLowerCase()}${extra > 0 ? ` and ${extra} other domain${extra > 1 ? "s" : ""}` : ""} you picked.`
    : "One opportunity worth your attention.";

  return (
    <FeedContent
      opportunities={oppsResult.data ?? []}
      dateLabel={formatDate()}
      subtitle={subtitle}
    />
  );
}
