/**
 * Starts a Vercel deployment of a materialized kit. It does not wait for the
 * build: the deployment is tracked to READY / ERROR by reconcile.ts, so a
 * slow build can't outlive the server action that started it, and "live" is
 * only ever recorded after Vercel reports READY and the app answers.
 *
 * Order matters, and each step is checked before the next:
 *  1. upload every file (POST /v2/files, sha1 digest)
 *  2. create or find the project for this commitment, and record its name
 *  3. set its env vars (project env API; the deployment API can't take them)
 *  4. create the deployment, tagged with the build id, which starts the build
 *
 * The generated app runs with an AOS-owned Anthropic key (AI_BUILD_ANTHROPIC_KEY,
 * stored as a Vercel "sensitive" variable that can't be read back) and the
 * shared kit Supabase project, which holds the global request limiter.
 */

import crypto from "node:crypto";
import type { BuildConfig } from "./build-config";
import { materialize } from "./materialize";
import {
  createDeployment,
  ensureProject,
  ensureSystemEnvs,
  upsertEnv,
  uploadFile,
  vercelScope,
  VercelError,
  type EnvVar,
  type ReadyState,
  type UploadedFile,
  type VercelScope,
} from "./vercel";

export type StartedDeploy = {
  projectId: string;
  projectName: string;
  deploymentId: string;
  readyState: ReadyState;
};

/**
 * Starting failed. `deploymentMayExist` is true only when the create request
 * was sent and no definite answer came back: Vercel may have created it, and
 * reconcile.ts finds it by its build-id tag.
 */
export class StartError extends Error {
  constructor(message: string, readonly deploymentMayExist: boolean) {
    super(message);
  }
}

/**
 * Vercel project names: lowercase [a-z0-9-], at most 100 chars. The production
 * alias is `<name>.vercel.app`, and a DNS label is at most 63 chars, so keep
 * the name within 63: "aos-" + up to 26 + "-" + 32 hex. The whole commitment id
 * is kept so two commitments never share a project or its alias.
 */
export function projectNameFor(config: BuildConfig): string {
  const stamp = commitmentStamp(config.meta.commitmentId);
  const room = 63 - "aos-".length - 1 - stamp.length;
  const base =
    config.brand.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, Math.max(room, 1))
      .replace(/-+$/g, "") || "build";
  return `aos-${base}-${stamp}`;
}

export function commitmentStamp(commitmentId: string): string {
  return commitmentId.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Env for the generated app. Every value is required for a real build. */
export function kitEnv(buildId: string, env: NodeJS.ProcessEnv = process.env): EnvVar[] {
  const anthropic = env.AI_BUILD_ANTHROPIC_KEY;
  const sbUrl = env.AI_BUILD_KIT_SUPABASE_URL;
  const sbKey = env.AI_BUILD_KIT_SUPABASE_ANON_KEY;
  const sbSecret = env.AI_BUILD_KIT_SUPABASE_SECRET_KEY;
  const missing = [
    !anthropic && "AI_BUILD_ANTHROPIC_KEY",
    !sbUrl && "AI_BUILD_KIT_SUPABASE_URL",
    !sbKey && "AI_BUILD_KIT_SUPABASE_ANON_KEY",
    !sbSecret && "AI_BUILD_KIT_SUPABASE_SECRET_KEY",
  ].filter(Boolean);
  if (missing.length) throw new Error(`AI Build is not configured: ${missing.join(", ")} not set.`);
  const vars: EnvVar[] = [
    { key: "ANTHROPIC_API_KEY", value: anthropic!, type: "sensitive" },
    { key: "NEXT_PUBLIC_SUPABASE_URL", value: sbUrl!, type: "plain" },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: sbKey!, type: "encrypted" },
    // Server-only: the global limiter is callable only with this key.
    { key: "KIT_SUPABASE_SECRET_KEY", value: sbSecret!, type: "sensitive" },
    // The kit refuses to call Claude unless the global limiter answers.
    { key: "AI_REQUIRE_GLOBAL_LIMIT", value: "1", type: "plain" },
    // Read back from /api/health to confirm the public address serves this build.
    { key: "AOS_BUILD_ID", value: buildId, type: "plain" },
  ];
  const passthrough: [string, string][] = [
    ["AI_BUILD_KIT_DAILY_REQUEST_CAP", "AI_DAILY_REQUEST_CAP"],
    ["AI_BUILD_KIT_GLOBAL_DAILY_REQUEST_CAP", "AI_GLOBAL_DAILY_REQUEST_CAP"],
    ["AI_BUILD_KIT_RATE_LIMIT_PER_IP", "AI_RATE_LIMIT_PER_IP"],
  ];
  for (const [from, to] of passthrough) {
    if (env[from]) vars.push({ key: to, value: env[from]!, type: "plain" });
  }
  return vars;
}

async function uploadAll(scope: VercelScope, config: BuildConfig, deadline: number): Promise<UploadedFile[]> {
  const files = await materialize(config);
  const out: UploadedFile[] = [];
  // A few at a time: ~20 small files, and Vercel rate-limits bursts.
  for (let i = 0; i < files.length; i += 8) {
    const batch = files.slice(i, i + 8).map((f) => {
      const buf = Buffer.from(f.content, "utf-8");
      return uploadFile(scope, f.path, buf, crypto.createHash("sha1").update(buf).digest("hex"), deadline);
    });
    out.push(...(await Promise.all(batch)));
  }
  return out;
}

export type DeployOptions = {
  buildId: string;
  /** Epoch ms by which the create request must have been answered. */
  deadline: number;
  /**
   * Called once the project exists, before any build starts. Returning false
   * (the build's row was taken over, e.g. expired by a status check) stops
   * before a deployment is created.
   */
  onProject?: (p: { projectId: string; projectName: string }) => Promise<boolean>;
};

export async function startDeploy(config: BuildConfig, opts: DeployOptions): Promise<StartedDeploy> {
  try {
    const scope = vercelScope();
    const env = kitEnv(opts.buildId);
    const uploaded = await uploadAll(scope, config, opts.deadline);
    const project = await ensureProject(scope, projectNameFor(config), opts.deadline);
    if (opts.onProject && !(await opts.onProject({ projectId: project.id, projectName: project.name }))) {
      throw new StartError("The build's record changed before the deploy started.", false);
    }
    await upsertEnv(scope, project.id, env, opts.deadline);
    await ensureSystemEnvs(scope, project.id, opts.deadline);
    let d;
    try {
      d = await createDeployment(scope, project, uploaded, opts.buildId, opts.deadline);
    } catch (e) {
      // No answer, a 5xx, or a 2xx we couldn't read: Vercel may have created it.
      const mayExist = e instanceof VercelError ? e.ambiguous || e.code === "bad_json" : true;
      throw new StartError(e instanceof Error ? e.message : String(e), mayExist);
    }
    if (!d?.id) throw new StartError("Vercel accepted the deployment but returned no id.", true);
    return { projectId: project.id, projectName: project.name, deploymentId: d.id, readyState: d.readyState };
  } catch (e) {
    if (e instanceof StartError) throw e;
    // Everything before the create request: no deployment can exist.
    throw new StartError(e instanceof Error ? e.message : String(e), false);
  }
}
