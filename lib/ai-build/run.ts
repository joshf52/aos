/**
 * Orchestrates a build run for a non-builder commitment.
 *
 *   loadInputs(commitmentId)  → CompileInputs
 *   runBuild(commitmentId)    → ai_builds row with deployment_url
 *
 * `runBuild` is the single entry point the architecture-card server action
 * calls. It compiles, deploys, and persists state on ai_builds. Failures
 * surface as `status='failed'` with the error captured — the UI shows them
 * inline rather than crashing.
 */

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";
import type { BuildConfig, CompileInputs } from "./build-config";
import { compile } from "./compile";
import { deploy } from "./deploy";

export type LoadedInputs = CompileInputs & { userId: string };

type CommitmentRow = Database["public"]["Tables"]["commitments"]["Row"];
type LensRow = Database["public"]["Tables"]["decision_lenses"]["Row"];
type OpportunityRow = Database["public"]["Tables"]["opportunities"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function loadInputs(commitmentId: string): Promise<LoadedInputs> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: commitment, error: cErr } = await supabase
    .from("commitments")
    .select("*")
    .eq("id", commitmentId)
    .eq("user_id", user.id)
    .single<CommitmentRow>();
  if (cErr || !commitment) throw new Error(cErr?.message ?? "Commitment not found.");

  const [
    { data: lens, error: lErr },
    { data: opp, error: oErr },
    { data: profile, error: pErr },
  ] = await Promise.all([
    supabase.from("decision_lenses").select("*").eq("id", commitment.lens_id).single<LensRow>(),
    supabase.from("opportunities").select("*").eq("id", commitment.opportunity_id).single<OpportunityRow>(),
    supabase.from("profiles").select("*").eq("id", user.id).single<ProfileRow>(),
  ]);
  if (lErr || !lens) throw new Error(lErr?.message ?? "Lens not found.");
  if (oErr || !opp) throw new Error(oErr?.message ?? "Opportunity not found.");
  if (pErr || !profile) throw new Error(pErr?.message ?? "Profile not found.");

  return {
    userId: user.id,
    opportunity: {
      id: opp.id,
      slug: opp.slug,
      title: opp.title,
      example_customer: opp.example_customer,
      why_now: opp.why_now,
    },
    lens: {
      answer_1: lens.answer_1,
      answer_2: lens.answer_2,
      answer_3: lens.answer_3,
      answer_4: lens.answer_4,
      answer_5: lens.answer_5,
    },
    profile: {
      user_id: user.id,
      unfair_advantage: profile.unfair_advantage,
    },
    commitment: {
      id: commitment.id,
      created_at: commitment.created_at,
    },
  };
}

export type BuildOutcome = {
  buildId: string;
  url: string | null;
  status: "live" | "failed";
  error: string | null;
};

/** Compile, deploy, and persist. Always returns; failure is a status, not a throw. */
export async function runBuild(commitmentId: string): Promise<BuildOutcome> {
  const supabase = createClient();
  const inputs = await loadInputs(commitmentId);
  const config = compile(inputs);

  // Reserve the row first so the user can see "building…" even if the deploy hangs.
  // The (as any) casts mirror the codebase's pattern for newly-added tables —
  // the generated Database types haven't been refreshed.
  const { data: inserted, error: iErr } = await (supabase.from("ai_builds") as any)
    .insert({
      commitment_id: commitmentId,
      user_id: inputs.userId,
      status: "building",
      build_config: config as unknown as Json,
    })
    .select("id")
    .single();
  if (iErr || !inserted) throw new Error(iErr?.message ?? "Could not record build.");
  const buildId = (inserted as { id: string }).id;

  try {
    const result = await deploy(config);
    await (supabase.from("ai_builds") as any)
      .update({
        status: "live",
        deployment_url: result.url,
        deployment_id: result.deploymentId,
        project_name: result.projectName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", buildId);
    return { buildId, url: result.url, status: "live", error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown deployment error.";
    await (supabase.from("ai_builds") as any)
      .update({ status: "failed", error: msg, updated_at: new Date().toISOString() })
      .eq("id", buildId);
    return { buildId, url: null, status: "failed", error: msg };
  }
}

export function compileForPreview(inputs: CompileInputs): BuildConfig {
  return compile(inputs);
}
