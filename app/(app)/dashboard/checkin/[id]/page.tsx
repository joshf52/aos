import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CheckinContent } from "./checkin-content";

type CommitmentRow = {
  id: string;
  opportunity_id: string;
  started_at: string;
};

function calcWeek(startedAt: string): number {
  const diff = Math.floor(
    (Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.min(Math.ceil((diff + 1) / 7), 4);
}

async function saveCheckin(formData: FormData): Promise<void> {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const commitment_id = formData.get("commitment_id") as string;
  const week_number = Number(formData.get("week_number"));
  const shipped_learned = (formData.get("shipped_learned") as string)?.trim();
  const blockers = (formData.get("blockers") as string)?.trim() || null;
  const next_focus = (formData.get("next_focus") as string)?.trim();

  if (!shipped_learned || !next_focus) return;

  await (supabase.from("checkins") as any).insert({
    commitment_id,
    week_number,
    shipped_learned,
    blockers,
    next_focus,
  });

  redirect("/dashboard");
}

export default async function CheckinPage({
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
    .select("id, opportunity_id, started_at")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()) as unknown as { data: CommitmentRow | null };

  if (!commitment) redirect("/dashboard");

  const currentWeek = calcWeek(commitment.started_at);

  // Already checked in this week → nothing to log
  const { data: existing } = await supabase
    .from("checkins")
    .select("id")
    .eq("commitment_id", commitment.id)
    .eq("week_number", currentWeek)
    .maybeSingle();

  if (existing) redirect("/dashboard");

  const { data: opp } = (await supabase
    .from("opportunities")
    .select("title")
    .eq("id", commitment.opportunity_id)
    .single()) as unknown as { data: { title: string } | null };

  return (
    <CheckinContent
      commitmentId={commitment.id}
      opportunityTitle={opp?.title ?? ""}
      weekNumber={currentWeek}
      saveAction={saveCheckin}
    />
  );
}
