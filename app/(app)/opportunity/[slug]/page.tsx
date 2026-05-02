import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OpportunityContent } from "./opportunity-content";
import type { Opportunity } from "@/types/database";

// Supabase v2.105 type inference breaks on complex chains with our local Database type;
// explicit casts match the pattern already used in auth/callback/route.ts.
type LensIdRow = { id: string };

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

  let buildMode: "self" | "ai" = "self";
  if (user) {
    const { data: profile } = (await supabase
      .from("profiles")
      .select("build_mode")
      .eq("id", user.id)
      .single()) as unknown as { data: { build_mode: string | null } | null };
    if (profile?.build_mode === "ai") buildMode = "ai";
  }

  return (
    <OpportunityContent
      opportunity={opportunity}
      buildMode={buildMode}
      startEvaluation={startEvaluation}
    />
  );
}
