/**
 * Starts a Vercel deployment of a materialized kit. It does not wait for the
 * build: the deployment is tracked to READY / ERROR by reconcile.ts, so a
 * slow build can't outlive the server action that started it, and "live" is
 * only ever recorded after Vercel reports READY.
 *
 * Order matters, and each step is checked before the next:
 *  1. upload every file (POST /v2/files, sha1 digest)
 *  2. create or find the project for this commitment
 *  3. set its env vars (project env API; the deployment API can't take them)
 *  4. create the deployment, which starts the build
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
  upsertEnv,
  uploadFile,
  vercelScope,
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
 * Vercel project names: lowercase [a-z0-9-], at most 100 chars. The production
 * alias is `<name>.vercel.app`, and a DNS label is at most 63 chars, so keep
 * the name within 63: "aos-" + up to 26 + "-" + 32 hex. The whole commitment id
 * is kept so two commitments never share a project or its alias.
 */
export function projectNameFor(config: BuildConfig): string {
  const stamp = config.meta.commitmentId.toLowerCase().replace(/[^a-z0-9]/g, "");
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

/** Env for the generated app. Every value is required for a real build. */
export function kitEnv(env: NodeJS.ProcessEnv = process.env): EnvVar[] {
  const anthropic = env.AI_BUILD_ANTHROPIC_KEY;
  const sbUrl = env.AI_BUILD_KIT_SUPABASE_URL;
  const sbKey = env.AI_BUILD_KIT_SUPABASE_ANON_KEY;
  const missing = [
    !anthropic && "AI_BUILD_ANTHROPIC_KEY",
    !sbUrl && "AI_BUILD_KIT_SUPABASE_URL",
    !sbKey && "AI_BUILD_KIT_SUPABASE_ANON_KEY",
  ].filter(Boolean);
  if (missing.length) throw new Error(`AI Build is not configured: ${missing.join(", ")} not set.`);
  const vars: EnvVar[] = [
    { key: "ANTHROPIC_API_KEY", value: anthropic!, type: "sensitive" },
    { key: "NEXT_PUBLIC_SUPABASE_URL", value: sbUrl!, type: "plain" },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: sbKey!, type: "encrypted" },
    // The kit refuses to call Claude unless the global limiter answers.
    { key: "AI_REQUIRE_GLOBAL_LIMIT", value: "1", type: "plain" },
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

async function uploadAll(scope: VercelScope, config: BuildConfig): Promise<UploadedFile[]> {
  const files = await materialize(config);
  const out: UploadedFile[] = [];
  // A few at a time: ~40 small files, and Vercel rate-limits bursts.
  for (let i = 0; i < files.length; i += 8) {
    const batch = files.slice(i, i + 8).map((f) => {
      const buf = Buffer.from(f.content, "utf-8");
      return uploadFile(scope, f.path, buf, crypto.createHash("sha1").update(buf).digest("hex"));
    });
    out.push(...(await Promise.all(batch)));
  }
  return out;
}

export type DeployHooks = {
  /** Called once the project exists, before any build starts. */
  onProject?: (p: { projectId: string; projectName: string }) => Promise<void>;
};

export async function startDeploy(config: BuildConfig, hooks: DeployHooks = {}): Promise<StartedDeploy> {
  const scope = vercelScope();
  const env = kitEnv();
  const uploaded = await uploadAll(scope, config);
  const project = await ensureProject(scope, projectNameFor(config));
  await hooks.onProject?.({ projectId: project.id, projectName: project.name });
  await upsertEnv(scope, project.id, env);
  const d = await createDeployment(scope, project, uploaded);
  if (!d?.id) throw new Error("Vercel accepted the deployment but returned no id.");
  return { projectId: project.id, projectName: project.name, deploymentId: d.id, readyState: d.readyState };
}
