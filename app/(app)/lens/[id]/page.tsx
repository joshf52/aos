import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LensContent } from "./lens-content";
import { recomputeReputation } from "@/lib/reputation";
import { effectiveTier, activeCommitmentCap } from "@/lib/billing";

type LensRow = {
  id: string;
  opportunity_id: string;
  current_step: number;
  answer_1: string | null;
  answer_2: string | null;
  answer_3: string | null;
  answer_4: string | null;
  answer_5: string | null;
  completed_at: string | null;
};

// Save one answer and advance the DB step counter (fire-and-forget from client)
async function saveStep(lensId: string, step: number, answer: string): Promise<void> {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await (supabase.from("decision_lenses") as any)
    .update({ [`answer_${step}`]: answer, current_step: step })
    .eq("id", lensId)
    .eq("user_id", user.id);
}

// Save all answers, mark complete, create commitment, return commitment ID
async function completeLens(lensId: string, answers: string[]): Promise<string> {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "";

  await (supabase.from("decision_lenses") as any)
    .update({
      answer_1: answers[0] ?? null,
      answer_2: answers[1] ?? null,
      answer_3: answers[2] ?? null,
      answer_4: answers[3] ?? null,
      answer_5: answers[4] ?? null,
      current_step: 5,
      completed_at: new Date().toISOString(),
    })
    .eq("id", lensId)
    .eq("user_id", user.id);

  const { data: lens } = (await supabase
    .from("decision_lenses")
    .select("opportunity_id")
    .eq("id", lensId)
    .single()) as unknown as { data: { opportunity_id: string } | null };

  if (!lens?.opportunity_id) return "";

  // Tier-aware cap: free = 1 active sprint, pro = 3. When at the cap we
  // surface the most recent active commitment instead of silently failing
  // the insert (RLS would reject too if we ever add a uniqueness constraint).
  const [{ data: profile }, { data: existing }] = await Promise.all([
    (supabase
      .from("profiles")
      .select("tier, pro_until")
      .eq("id", user.id)
      .single()) as unknown as Promise<{
      data: { tier: "free" | "pro"; pro_until: string | null } | null;
    }>,
    (supabase
      .from("commitments")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })) as unknown as Promise<{
      data: { id: string }[] | null;
    }>,
  ]);

  const cap = activeCommitmentCap(effectiveTier(profile));
  const activeCount = existing?.length ?? 0;
  if (activeCount >= cap) {
    return existing?.[0]?.id ?? "";
  }

  const { data: commitment } = (await (supabase.from("commitments") as any)
    .insert({
      user_id: user.id,
      opportunity_id: lens.opportunity_id,
      lens_id: lensId,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single()) as { data: { id: string } | null };

  if (commitment?.id) {
    await recomputeReputation(supabase, user.id);
  }

  return commitment?.id ?? "";
}

export default async function LensPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: lens } = (await supabase
    .from("decision_lenses")
    .select(
      "id, opportunity_id, current_step, answer_1, answer_2, answer_3, answer_4, answer_5, completed_at"
    )
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()) as unknown as { data: LensRow | null };

  if (!lens) redirect("/feed");
  if (lens.completed_at) redirect("/feed");

  // Fetch opportunity title for context
  const { data: opp } = (await supabase
    .from("opportunities")
    .select("title")
    .eq("id", lens.opportunity_id)
    .single()) as unknown as { data: { title: string } | null };

  const initialAnswers: string[] = [
    lens.answer_1 ?? "",
    lens.answer_2 ?? "",
    lens.answer_3 ?? "",
    lens.answer_4 ?? "",
    lens.answer_5 ?? "",
  ];

  return (
    <LensContent
      lensId={lens.id}
      opportunityTitle={opp?.title ?? ""}
      initialStep={lens.current_step ?? 1}
      initialAnswers={initialAnswers}
      saveStep={saveStep}
      completeLens={completeLens}
    />
  );
}
