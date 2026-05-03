import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ShipContent } from "./ship-content";
import { recomputeReputation } from "@/lib/reputation";

type CommitmentRow = {
  id: string;
  opportunity_id: string;
  user_id: string;
  status: string;
  started_at: string;
};

async function markShipped(formData: FormData) {
  "use server";
  const commitmentId = formData.get("commitmentId") as string;
  const url = (formData.get("url") as string)?.trim();
  const reflection = (formData.get("reflection") as string)?.trim();

  if (!commitmentId || !url || !reflection) redirect("/dashboard");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("commitments") as any)
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      shipped_url: url,
    })
    .eq("id", commitmentId)
    .eq("user_id", user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("events") as any).insert({
    user_id: user.id,
    event_name: "commitment_shipped",
    payload: { commitment_id: commitmentId, url, reflection },
  });

  await recomputeReputation(supabase, user.id);

  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export default async function ShipPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: commitment } = (await supabase
    .from("commitments")
    .select("id, opportunity_id, user_id, status, started_at")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()) as unknown as { data: CommitmentRow | null };

  if (!commitment) redirect("/dashboard");
  if (commitment.status !== "active") redirect("/dashboard");

  const { data: opportunity } = (await supabase
    .from("opportunities")
    .select("title, capability")
    .eq("id", commitment.opportunity_id)
    .single()) as unknown as { data: { title: string; capability: string } | null };

  const start = new Date(commitment.started_at);
  const now = new Date();
  const daysIn = Math.min(
    Math.max(Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1, 1),
    30
  );

  return (
    <ShipContent
      commitmentId={commitment.id}
      opportunityTitle={opportunity?.title ?? ""}
      capability={opportunity?.capability ?? ""}
      daysIn={daysIn}
      markShipped={markShipped}
    />
  );
}
