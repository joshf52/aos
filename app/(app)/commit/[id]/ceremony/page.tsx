import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CeremonyContent } from "./ceremony-content";

type CommitmentRow = {
  id: string;
  opportunity_id: string;
  lens_id: string;
  started_at: string;
};

type LensRow = {
  answer_1: string | null;
  answer_2: string | null;
  answer_3: string | null;
  answer_4: string | null;
  answer_5: string | null;
};

function formatIssuanceDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function CeremonyPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: commitment } = (await supabase
    .from("commitments")
    .select("id, opportunity_id, lens_id, started_at")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()) as unknown as { data: CommitmentRow | null };

  if (!commitment) redirect("/feed");

  const { data: lens } = (await supabase
    .from("decision_lenses")
    .select("answer_1, answer_2, answer_3, answer_4, answer_5")
    .eq("id", commitment.lens_id)
    .single()) as unknown as { data: LensRow | null };

  const { data: opp } = (await supabase
    .from("opportunities")
    .select("title")
    .eq("id", commitment.opportunity_id)
    .single()) as unknown as { data: { title: string } | null };

  const answers: string[] = [
    lens?.answer_1 ?? "",
    lens?.answer_2 ?? "",
    lens?.answer_3 ?? "",
    lens?.answer_4 ?? "",
    lens?.answer_5 ?? "",
  ];

  return (
    <CeremonyContent
      commitmentId={commitment.id}
      opportunityTitle={opp?.title ?? ""}
      issuanceDate={formatIssuanceDate(commitment.started_at)}
      answers={answers}
    />
  );
}
