import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadInputs, runBuild } from "@/lib/ai-build/run";
import { compile } from "@/lib/ai-build/compile";
import { ArchitectureContent } from "./architecture-content";

/** Server action — rewrite one lens answer, then recompile on next render. */
async function updateLensAnswer(
  commitmentId: string,
  field: 1 | 3 | 4,
  value: string,
): Promise<void> {
  "use server";
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
async function beginBuild(commitmentId: string): Promise<void> {
  "use server";
  await runBuild(commitmentId);
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
