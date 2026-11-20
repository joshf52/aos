import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AIBuildContent } from "./ai-build-content";
import { summarizeBuild } from "@/lib/ai-build/build-status";
import { reconcileForDisplay } from "@/lib/ai-build/reconcile";
import { supabaseBuildStore, type BuildRecord } from "@/lib/ai-build/store";
import { createServiceClient } from "@/lib/supabase/service";
import type { AiBuildStatus } from "@/types/database";

// Every render may advance an in-flight build from Vercel's real state.
export const dynamic = "force-dynamic";

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

type AiBuildRow = BuildRecord & { status: AiBuildStatus };

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

  const [{ data: lens }, { data: opp }, { data: build, error: buildErr }] = await Promise.all([
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
      .select("id, commitment_id, user_id, status, deployment_id, deployment_url, project_name, error, verified_at, created_at, updated_at")
      .eq("commitment_id", commitment.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()) as unknown as Promise<{ data: AiBuildRow | null; error: { message: string } | null }>,
  ]);
  // A failed read is not "no builds yet": showing the approval screen would
  // invite a second build. Let the error boundary offer a retry instead.
  if (buildErr) throw new Error("Couldn't load the build status.");

  // The row was read as its owner (RLS). Advancing it is a privileged write,
  // scoped to that same user; what's shown is what the database now holds.
  let current: AiBuildRow | null = build;
  if (build?.status === "building") {
    try {
      current = await reconcileForDisplay(supabaseBuildStore(createServiceClient(), user.id), build);
    } catch (e) {
      console.error(JSON.stringify({ event: "ai_build_reconcile_unavailable", message: e instanceof Error ? e.message : String(e) }));
    }
  }

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
      build={summarizeBuild(current)}
    />
  );
}
