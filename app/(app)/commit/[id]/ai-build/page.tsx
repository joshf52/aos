import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AIBuildContent } from "./ai-build-content";
import { summarizeBuild } from "@/lib/ai-build/build-status";
import type { AiBuildStatus } from "@/types/database";

type CommitmentRow = {
  id: string;
  opportunity_id: string;
  lens_id: string;
};

type LensRow = {
  answer_1: string | null;
  answer_2: string | null;
  answer_3: string | null;
  answer_4: string | null;
  answer_5: string | null;
};

type AiBuildRow = {
  id: string;
  status: AiBuildStatus;
  deployment_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export default async function AIBuildPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: commitment } = (await supabase
    .from("commitments")
    .select("id, opportunity_id, lens_id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()) as unknown as { data: CommitmentRow | null };

  if (!commitment) redirect("/feed");

  const [{ data: lens }, { data: opp }, { data: build }] = await Promise.all([
    (supabase
      .from("decision_lenses")
      .select("answer_1, answer_2, answer_3, answer_4, answer_5")
      .eq("id", commitment.lens_id)
      .single()) as unknown as Promise<{ data: LensRow | null }>,
    (supabase
      .from("opportunities")
      .select("title")
      .eq("id", commitment.opportunity_id)
      .single()) as unknown as Promise<{ data: { title: string } | null }>,
    (supabase
      .from("ai_builds")
      .select("id, status, deployment_url, error, created_at, updated_at")
      .eq("commitment_id", commitment.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()) as unknown as Promise<{ data: AiBuildRow | null }>,
  ]);

  const answers: string[] = [
    lens?.answer_1 ?? "",
    lens?.answer_2 ?? "",
    lens?.answer_3 ?? "",
    lens?.answer_4 ?? "",
    lens?.answer_5 ?? "",
  ];

  return (
    <AIBuildContent
      commitmentId={commitment.id}
      opportunityTitle={opp?.title ?? ""}
      answers={answers}
      build={summarizeBuild(build)}
    />
  );
}
