import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OpportunityContent } from "./opportunity-content";
import { effectiveTier, activeCommitmentCap } from "@/lib/billing";
import type { Opportunity } from "@/types/database";

// Supabase v2.105 type inference breaks on complex chains with our local Database type;
// explicit casts match the pattern already used in auth/callback/route.ts.
type LensIdRow = { id: string };

type WedgeRow = { answer_3: string | null };

async function startEvaluation(formData: FormData) {
  "use server";
  const opportunityId = formData.get("opportunityId") as string;
  if (!opportunityId) redirect("/feed");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Reuse an existing incomplete lens
  const { data: found } = (await supabase
    .from("decision_lenses")
    .select("id")
    .eq("user_id", user.id)
    .eq("opportunity_id", opportunityId)
    .is("completed_at", null)
    .limit(1)) as unknown as { data: LensIdRow[] | null };

  if (found?.[0]?.id) redirect(`/lens/${found[0].id}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lens } = (await supabase
    .from("decision_lenses")
    .insert({ user_id: user.id, opportunity_id: opportunityId, current_step: 1 } as any)
    .select("id")
    .single()) as unknown as { data: LensIdRow | null };

  redirect(lens?.id ? `/lens/${lens.id}` : "/feed");
}

export default async function OpportunityPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  const [{ data: opportunity }, { data: { user } }] = await Promise.all([
    (supabase
      .from("opportunities")
      .select("*")
      .eq("slug", params.slug)
      .single()) as unknown as Promise<{ data: Opportunity | null }>,
    supabase.auth.getUser(),
  ]);

  if (!opportunity) redirect("/feed");

  // Adjacent opportunities — share at least one domain, otherwise fall back
  // to same capability. Excludes the current one and inactive ones.
  let adjacent: Opportunity[] = [];
  const oppDomains = opportunity.domains ?? [];
  if (oppDomains.length > 0) {
    const { data } = (await supabase
      .from("opportunities")
      .select("*")
      .eq("is_active", true)
      .neq("id", opportunity.id)
      .overlaps("domains", oppDomains)
      .order("confidence", { ascending: false })
      .limit(4)) as unknown as { data: Opportunity[] | null };
    adjacent = data ?? [];
  }
  if (adjacent.length === 0) {
    const { data } = (await supabase
      .from("opportunities")
      .select("*")
      .eq("is_active", true)
      .neq("id", opportunity.id)
      .eq("capability", opportunity.capability)
      .order("confidence", { ascending: false })
      .limit(4)) as unknown as { data: Opportunity[] | null };
    adjacent = data ?? [];
  }

  // Who's exploring — count completed lenses for this opportunity, plus
  // surface up to 3 anonymized wedge answers for color. Privacy: no user_id
  // travels to the client, only the wedge text snippet.
  const [{ count: explorerCount }, { data: wedgeRows }] = await Promise.all([
    supabase
      .from("decision_lenses")
      .select("id", { count: "exact", head: true })
      .eq("opportunity_id", opportunity.id)
      .not("completed_at", "is", null) as unknown as Promise<{ count: number | null }>,
    supabase
      .from("decision_lenses")
      .select("answer_3")
      .eq("opportunity_id", opportunity.id)
      .not("completed_at", "is", null)
      .not("answer_3", "is", null)
      .order("completed_at", { ascending: false })
      .limit(3) as unknown as Promise<{ data: WedgeRow[] | null }>,
  ]);

  const wedges: string[] = (wedgeRows ?? [])
    .map((r) => r.answer_3?.trim() ?? "")
    .filter(Boolean)
    .map((w) => (w.length > 140 ? w.slice(0, 140) + "…" : w));

  let buildMode: "self" | "ai" = "self";
  let activeCommitmentId: string | null = null;
  let atCap = false;

  if (user) {
    const [{ data: profile }, { data: existing }, { data: activeAll }] =
      await Promise.all([
        (supabase
          .from("profiles")
          .select("build_mode, tier, pro_until")
          .eq("id", user.id)
          .single()) as unknown as Promise<{
          data: {
            build_mode: string | null;
            tier: "free" | "pro";
            pro_until: string | null;
          } | null;
        }>,
        (supabase
          .from("commitments")
          .select("id")
          .eq("user_id", user.id)
          .eq("opportunity_id", opportunity.id)
          .eq("status", "active")
          .limit(1)) as unknown as Promise<{ data: { id: string }[] | null }>,
        (supabase
          .from("commitments")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active")) as unknown as Promise<{
          data: { id: string }[] | null;
        }>,
      ]);
    if (profile?.build_mode === "ai") buildMode = "ai";
    activeCommitmentId = existing?.[0]?.id ?? null;
    const cap = activeCommitmentCap(effectiveTier(profile));
    atCap = (activeAll?.length ?? 0) >= cap && !activeCommitmentId;
  }

  return (
    <OpportunityContent
      opportunity={opportunity}
      adjacent={adjacent}
      explorerCount={explorerCount ?? 0}
      wedges={wedges}
      buildMode={buildMode}
      activeCommitmentId={activeCommitmentId}
      atCap={atCap}
      startEvaluation={startEvaluation}
    />
  );
}
