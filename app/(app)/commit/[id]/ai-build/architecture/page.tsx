import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BuildRefused, loadInputs, runBuild } from "@/lib/ai-build/run";
import { compile } from "@/lib/ai-build/compile";
import { ArchitectureContent } from "./architecture-content";

// beginBuild uploads the kit and starts the deploy (budgeted at 45 s in
// run.ts); give the action room beyond that to record the outcome.
export const maxDuration = 60;

/** Server action — rewrite one lens answer, then recompile on next render. */
async function updateLensAnswer(
  commitmentId: string,
  field: 1 | 3 | 4,
  value: string,
): Promise<void> {
  "use server";
  // Server-action arguments arrive from the client unchecked; the TS types
  // above are not enforced at runtime.
  if (field !== 1 && field !== 3 && field !== 4) return;
  if (typeof value !== "string" || value.trim().length === 0) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: commitment } = (await supabase
    .from("commitments")
    .select("lens_id, user_id")
    .eq("id", commitmentId)
    .eq("user_id", user.id)
    .single()) as { data: { lens_id: string; user_id: string } | null };
  if (!commitment) return;

  const key = `answer_${field}` as const;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("decision_lenses") as any)
    .update({ [key]: value.trim() })
    .eq("id", commitment.lens_id);

  revalidatePath(`/commit/${commitmentId}/ai-build/architecture`);
}

/** Server action — kick off the deploy. Redirects to the live status page. */
async function beginBuild(commitmentId: string): Promise<{ error: string } | void> {
  "use server";
  try {
    await runBuild(commitmentId);
  } catch (e) {
    // Refusals carry a message meant for the user; anything else stays generic.
    if (e instanceof BuildRefused) return { error: e.message };
    console.error("beginBuild failed", e);
    return { error: "The build couldn't start. Try again in a moment." };
  }
  // Outside the try: redirect() works by throwing.
  redirect(`/commit/${commitmentId}/ai-build`);
}

export default async function ArchitecturePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  let inputs;
  try {
    inputs = await loadInputs(params.id);
  } catch {
    redirect("/feed");
  }

  // The plan only means something on the non-builder path; self-builders
  // land on their sprint, mirroring the Ceremony's routing.
  if (inputs.eligibility.buildMode !== "ai") redirect("/dashboard");

  const config = compile(inputs);
  const opportunityTitle = inputs.opportunity.title;

  return (
    <ArchitectureContent
      commitmentId={params.id}
      opportunityTitle={opportunityTitle}
      config={config}
      lens={inputs.lens}
      updateLensAnswer={updateLensAnswer}
      beginBuild={beginBuild}
    />
  );
}
