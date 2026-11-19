/**
 * Orchestrates a build run for a non-builder commitment.
 *
 *   loadInputs(commitmentId)  → CompileInputs, for the signed-in owner only
 *   runBuild(commitmentId)    → starts a deploy and records it on ai_builds
 *
 * Reads that decide eligibility use the user's own session (RLS applies);
 * ai_builds writes use the server-only privileged client through store.ts,
 * because users can't write that table at all (009). runBuild returns once
 * Vercel has accepted the deployment; reconcile.ts follows it to READY or
 * ERROR. Failures are recorded as status='failed' with a user-facing message.
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database, Json } from "@/types/database";
import type { BuildConfig, CompileInputs } from "./build-config";
import { compile } from "./compile";
import { StartError, startDeploy, type DeployOptions, type StartedDeploy } from "./deploy";
import { MAX_BUILDS_PER_COMMITMENT_PER_DAY } from "./limits";
import { reconcileBuild } from "./reconcile";
import { BuildInsertRefused, supabaseBuildStore, type BuildStore } from "./store";
import { cancelDeployment, vercelScope, type CancelResult } from "./vercel";

export type LoadedInputs = CompileInputs & {
  userId: string;
  // Not compiler inputs — read by runBuild's eligibility guard.
  eligibility: { buildMode: string | null; commitmentStatus: string };
};

/** A build that throws this was refused before anything was deployed. */
export class BuildRefused extends Error {}

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
    supabase.from("decision_lenses").select("*").eq("id", commitment.lens_id).eq("user_id", user.id).single<LensRow>(),
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
    eligibility: {
      buildMode: profile.build_mode,
      commitmentStatus: commitment.status,
    },
  };
}

export type BuildOutcome = {
  buildId: string;
  /** "building" means Vercel accepted the deployment; it is not live yet. */
  status: "building" | "failed";
  error: string | null;
};

export type BuildDeps = {
  startDeploy: (config: BuildConfig, opts: DeployOptions) => Promise<StartedDeploy>;
  cancel: (deploymentId: string) => Promise<CancelResult>;
};

const defaultDeps: BuildDeps = {
  startDeploy,
  cancel: async (id) => cancelDeployment(vercelScope(), id),
};

// One clock for the whole action, started at entry: the architecture route's
// maxDuration is 60 s, and the Vercel calls must be answered by 45 s so the
// outcome can still be recorded (and, if needed, the deployment cancelled).
const START_BUDGET_MS = 45_000;

const CAP_MESSAGE = `This plan has been built ${MAX_BUILDS_PER_COMMITMENT_PER_DAY} times in the last 24 hours. Try again tomorrow.`;
const START_FAILED = "The deploy couldn't start. Try again in a moment.";

/** The server action's entry point. */
export async function runBuild(commitmentId: string): Promise<BuildOutcome> {
  const deadline = Date.now() + START_BUDGET_MS;
  const inputs = await loadInputs(commitmentId);
  const store = supabaseBuildStore(createServiceClient(), inputs.userId);
  return executeBuild(inputs, store, defaultDeps, deadline);
}

/**
 * Everything after authentication, with the store and Vercel calls injectable
 * so the failure paths can be exercised without live services.
 */
export async function executeBuild(
  inputs: LoadedInputs,
  store: BuildStore,
  deps: BuildDeps = defaultDeps,
  deadline: number = Date.now() + START_BUDGET_MS,
): Promise<BuildOutcome> {
  const commitmentId = inputs.commitment.id;

  // Every deploy spends AOS's Vercel (and, in the generated app, Anthropic)
  // budget, so only the non-builder path on a live commitment may start one.
  if (inputs.eligibility.buildMode !== "ai") {
    throw new BuildRefused("AI builds are only available when your build mode is “Build it for me”.");
  }
  if (inputs.eligibility.commitmentStatus !== "active") {
    throw new BuildRefused("This commitment is no longer active, so it can't be built.");
  }

  // A build already in flight: bring it up to date first. Only one that is
  // genuinely still deploying blocks a new one; a dead one is recorded failed.
  const inflight = await store.latestInflight(commitmentId);
  if (inflight) {
    const now = await reconcileBuild(store, inflight, { deadline });
    if (now.status === "building") throw new BuildRefused("A build is already running for this commitment.");
  }

  if ((await store.countSince(commitmentId, new Date(Date.now() - 24 * 60 * 60_000).toISOString())) >= MAX_BUILDS_PER_COMMITMENT_PER_DAY) {
    throw new BuildRefused(CAP_MESSAGE);
  }

  const config = compile(inputs);

  // Reserve the row first. The database refuses a second in-flight row
  // (unique index), a sixth build in 24 h (trigger, race-free) and a row for
  // someone else's commitment (trigger) — the last can't happen here because
  // loadInputs read the commitment as its owner, but the privileged client
  // bypasses RLS, so the database checks again.
  let row;
  try {
    row = await store.insertBuilding(commitmentId, config as unknown as Json);
  } catch (e) {
    if (e instanceof BuildInsertRefused) {
      throw new BuildRefused(e.reason === "daily_cap" ? CAP_MESSAGE : e.message);
    }
    throw e;
  }

  let started: StartedDeploy;
  try {
    started = await deps.startDeploy(config, {
      buildId: row.id,
      deadline,
      // Record the project before the deployment exists, so a lost create
      // response can still be found (reconcile.ts looks it up by build id).
      // If the row was taken over meanwhile, stop before deploying.
      onProject: async ({ projectName }) =>
        (await store.update(row.id, { project_name: projectName }, { status: "building", deploymentId: null })) !== null,
    });
  } catch (e) {
    const mayExist = e instanceof StartError && e.deploymentMayExist;
    console.error(JSON.stringify({ event: "ai_build_start_failed", build: row.id, deploymentMayExist: mayExist, message: e instanceof Error ? e.message : String(e) }));
    if (mayExist) {
      // Vercel may have created it. Leave the row building: reconcile finds a
      // tagged deployment and adopts it, or records the build failed after
      // START_STALE_MS. Never reported as live without READY.
      return { buildId: row.id, status: "building", error: null };
    }
    await store.update(row.id, { status: "failed", error: START_FAILED }, { status: "building", deploymentId: null }).catch((err) => {
      // The row stays "building" with no deployment id; reconcile records it
      // failed after START_STALE_MS.
      console.error(JSON.stringify({ event: "ai_build_persist_failed", build: row.id, message: String(err) }));
    });
    return { buildId: row.id, status: "failed", error: START_FAILED };
  }

  // The deployment exists now. If its id can't be recorded we can't track it
  // to READY, so stop it rather than leave an untracked app on AOS's key. (If
  // the stop fails too, the deployment's build-id tag lets reconcile adopt it
  // while the row is building, or the cleanup cron cancel it once failed.)
  let saved = null;
  try {
    saved = await store.update(
      row.id,
      { deployment_id: started.deploymentId, project_name: started.projectName },
      { status: "building", deploymentId: null },
    );
  } catch (err) {
    console.error(JSON.stringify({ event: "ai_build_persist_failed", build: row.id, deployment: started.deploymentId, message: String(err) }));
  }
  if (!saved) {
    // The write may have landed with its answer lost, or a status check may
    // have adopted this very deployment first. Either way it is tracked.
    let now = await store.get(row.id).catch(() => undefined);
    if (now === undefined) {
      // Can't read the row: can't tell whether this deployment is tracked.
      // Its build-id tag lets reconcile adopt it later (or the cron cancel it
      // once the row is failed), so don't cancel something that may be live.
      console.error(JSON.stringify({ event: "ai_build_untracked_deployment", build: row.id, deployment: started.deploymentId, cancel: "deferred" }));
      return { buildId: row.id, status: "building", error: null };
    }
    if (now?.status === "building" && now.deployment_id === null) {
      // Readable and still unrecorded: one more try at recording it.
      now = await store
        .update(row.id, { deployment_id: started.deploymentId, project_name: started.projectName }, { status: "building", deploymentId: null })
        .catch(() => now);
    }
    if (now?.deployment_id === started.deploymentId) {
      const failedNow = now.status === "failed";
      return { buildId: row.id, status: failedNow ? "failed" : "building", error: failedNow ? START_FAILED : null };
    }
    // The row is gone, finished, or tracks something else: this deployment is ours alone to stop.
    const cancel = await deps.cancel(started.deploymentId).catch(() => "failed" as const);
    console.error(JSON.stringify({ event: "ai_build_untracked_deployment", build: row.id, deployment: started.deploymentId, cancel }));
    await store.update(row.id, { status: "failed", error: START_FAILED }, "building").catch(() => {});
    return { buildId: row.id, status: "failed", error: START_FAILED };
  }
  return { buildId: row.id, status: "building", error: null };
}

export function compileForPreview(inputs: CompileInputs): BuildConfig {
  return compile(inputs);
}
