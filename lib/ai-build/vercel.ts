/**
 * The slice of the Vercel REST API that AI Build uses, written against the
 * published contract (vercel.com/docs/rest-api, checked 2026-11-19):
 *
 *   POST  /v2/files                           upload one file by sha1
 *   POST  /v11/projects                       create the generated app's project
 *   GET   /v9/projects/{idOrName}             find it again on a rebuild
 *   POST  /v10/projects/{id}/env?upsert=true  set its environment variables
 *   POST  /v13/deployments?forceNew=1         create a deployment of the files
 *   GET   /v13/deployments/{id}               readyState: QUEUED … READY | ERROR | CANCELED
 *   GET   /v7/deployments?projectId=…         find a deployment whose create response was lost
 *   PATCH /v12/deployments/{id}/cancel        stop a deployment that is still building
 *
 * `POST /v13/deployments` has no request field for environment variables
 * (the `env` in its response is a read-only list of key names), so env vars
 * go on the project before the deployment is created. Every deployment
 * carries meta.aosBuildId (the ai_builds row id) so it can be matched to its
 * row even if the create response never arrives.
 *
 * Generated apps live in their own Vercel team, never the one that hosts AOS:
 * AI_BUILD_VERCEL_TOKEN should be a token scoped to that team only, and
 * AI_BUILD_VERCEL_TEAM_ID is required so a request can't fall through to the
 * token owner's default scope.
 */

const VERCEL_API = "https://api.vercel.com";
const ATTEMPT_TIMEOUT_MS = 20_000;

export type VercelScope = { token: string; teamId: string };

export function vercelScope(env: NodeJS.ProcessEnv = process.env): VercelScope {
  const token = env.AI_BUILD_VERCEL_TOKEN;
  const teamId = env.AI_BUILD_VERCEL_TEAM_ID;
  if (!token || !teamId) {
    throw new Error("AI_BUILD_VERCEL_TOKEN and AI_BUILD_VERCEL_TEAM_ID must both be set (a team used only for generated apps).");
  }
  return { token, teamId };
}

/**
 * A failed Vercel call. The message carries the method, path, status and
 * Vercel's error code only — never response text, which can quote request
 * values (env vars) or build output back.
 */
export class VercelError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
  /** No response at all: the request may or may not have been applied. */
  get ambiguous(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

type CallOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string>;
  json?: unknown;
  body?: Buffer;
  headers?: Record<string, string>;
  /**
   * Retry on 429 / 5xx / network errors. Only for calls that are safe to
   * repeat: a retried POST /v13/deployments after a lost response could start
   * a second build, so that call retries only on 429.
   */
  retry?: "idempotent" | "rate-limit-only" | "none";
  /** Epoch ms by which the whole call (all attempts) must be done. */
  deadline?: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A provider code safe to log: letters and underscores only (Vercel's codes
 * look like "not_found", "BUILD_FAILED"). Anything with digits or other
 * characters could be an id or a token, so it is dropped.
 */
export function safeCode(code: unknown): string | undefined {
  return typeof code === "string" && /^[A-Za-z_]{1,40}$/.test(code) ? code : undefined;
}

async function errorCode(res: Response): Promise<string | undefined> {
  try {
    const j = (await res.json()) as { error?: { code?: unknown } };
    return safeCode(j.error?.code);
  } catch {
    return undefined;
  }
}

export async function vercel<T>(scope: VercelScope, path: string, opts: CallOptions = {}): Promise<T> {
  const url = new URL(VERCEL_API + path);
  url.searchParams.set("teamId", scope.teamId);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);
  const method = opts.method ?? "GET";
  const where = `${method} ${url.pathname.replace(/\/(dpl|prj)_[A-Za-z0-9]+/g, "/$1_…")}`;
  const retry = opts.retry ?? "idempotent";
  const attempts = retry === "none" ? 1 : 3;

  let last: VercelError | undefined;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(500 * 2 ** (i - 1));
    const left = opts.deadline ? opts.deadline - Date.now() : ATTEMPT_TIMEOUT_MS;
    if (left < 1_000) throw last ?? new VercelError(`Vercel ${where}: out of time before the request was sent.`, -1, "deadline");
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${scope.token}`,
          ...(opts.json !== undefined ? { "Content-Type": "application/json" } : {}),
          ...opts.headers,
        },
        body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body ? new Uint8Array(opts.body) : undefined,
        signal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, left)),
        cache: "no-store",
      });
    } catch (e) {
      last = new VercelError(`Vercel ${where} did not respond (${e instanceof Error ? e.name : "error"}).`, 0);
      if (retry === "idempotent") continue;
      throw last;
    }
    if (res.ok) {
      const text = await res.text();
      try {
        return (text ? JSON.parse(text) : {}) as T;
      } catch {
        // The parser's message quotes the body; say only that it wasn't JSON.
        throw new VercelError(`Vercel ${where} answered ${res.status} with a body that is not JSON.`, -2, "bad_json");
      }
    }
    const code = await errorCode(res);
    last = new VercelError(`Vercel ${where} failed (${res.status}${code ? ` ${code}` : ""}).`, res.status, code);
    const retryable = res.status === 429 || (retry === "idempotent" && res.status >= 500);
    if (!retryable || retry === "none") throw last;
    const ra = Number.parseInt(res.headers.get("retry-after") ?? "", 10);
    if (Number.isFinite(ra) && ra > 0) await sleep(Math.min(ra, 5) * 1000);
  }
  throw last;
}

// ---- projects ---------------------------------------------------------------

export type EnvVar = { key: string; value: string; type: "plain" | "encrypted" | "sensitive" };

export type Project = { id: string; name: string };

/** Create the project, or find it on a rebuild of the same commitment. */
export async function ensureProject(scope: VercelScope, name: string, deadline?: number): Promise<Project> {
  try {
    return await vercel<Project>(scope, "/v11/projects", {
      method: "POST",
      json: { name, framework: "nextjs" },
      deadline,
    });
  } catch (e) {
    // An existing project (same commitment, earlier build) is the expected
    // conflict. Anything else is a real failure.
    if (!(e instanceof VercelError) || (e.status !== 409 && e.code !== "conflict")) throw e;
    const p = await vercel<Project>(scope, `/v9/projects/${encodeURIComponent(name)}`, { deadline });
    if (p.name !== name) throw new Error(`Vercel returned a different project for ${name}.`);
    return p;
  }
}

/** Set (or overwrite) the project's env vars; throws unless every one landed. */
export async function upsertEnv(scope: VercelScope, projectId: string, vars: EnvVar[], deadline?: number): Promise<void> {
  if (vars.length === 0) return;
  const res = await vercel<{ failed?: { error?: { code?: string; key?: string; envVarKey?: string } }[] }>(
    scope,
    `/v10/projects/${encodeURIComponent(projectId)}/env`,
    {
      method: "POST",
      query: { upsert: "true" },
      json: vars.map((v) => ({ ...v, target: ["production", "preview"] })),
      deadline,
    },
  );
  const failed = res.failed ?? [];
  if (failed.length > 0) {
    // Only key names we sent (never whatever the response put there) and safe codes.
    const sent = new Set(vars.map((v) => v.key));
    const which = failed
      .map((f) => {
        const k = f.error?.envVarKey ?? f.error?.key;
        return `${typeof k === "string" && sent.has(k) ? k : "?"}:${safeCode(f.error?.code) ?? "?"}`;
      })
      .join(", ");
    throw new Error(`Vercel rejected ${failed.length} environment variable(s): ${which}`);
  }
}

/**
 * The generated app's /api/health reports VERCEL_DEPLOYMENT_ID, a system env
 * var Vercel only exposes when the project allows it. Turn that on (and check
 * it took) before deploying, so a reused project can't silently fail
 * verification later.
 */
export async function ensureSystemEnvs(scope: VercelScope, projectId: string, deadline?: number): Promise<void> {
  const p = await vercel<{ autoExposeSystemEnvs?: boolean }>(scope, `/v9/projects/${encodeURIComponent(projectId)}`, {
    method: "PATCH",
    json: { autoExposeSystemEnvs: true },
    deadline,
  });
  if (p.autoExposeSystemEnvs !== true) throw new Error("Vercel did not enable system environment variables on the project.");
}

// ---- deployments --------------------------------------------------------------

export type UploadedFile = { file: string; sha: string; size: number };

export async function uploadFile(scope: VercelScope, path: string, buf: Buffer, sha: string, deadline?: number): Promise<UploadedFile> {
  await vercel(scope, "/v2/files", {
    method: "POST",
    body: buf,
    headers: {
      "Content-Type": "application/octet-stream",
      "x-vercel-digest": sha,
      "Content-Length": String(buf.byteLength),
    },
    deadline,
  });
  return { file: path, sha, size: buf.byteLength };
}

export type ReadyState = "QUEUED" | "INITIALIZING" | "BUILDING" | "READY" | "ERROR" | "CANCELED" | "BLOCKED" | "DELETED";

export type Deployment = {
  id: string;
  url: string;
  name?: string;
  projectId?: string;
  readyState: ReadyState;
  meta?: Record<string, string>;
  alias?: string[];
  aliasAssigned?: boolean | number | null;
  aliasError?: { code?: string; message?: string } | null;
  errorCode?: string;
};

export const IN_PROGRESS: ReadyState[] = ["QUEUED", "INITIALIZING", "BUILDING"];

export async function createDeployment(
  scope: VercelScope,
  project: Project,
  files: UploadedFile[],
  buildId: string,
  deadline?: number,
): Promise<Deployment> {
  return vercel<Deployment>(scope, "/v13/deployments", {
    method: "POST",
    // forceNew: every build is a new deployment, never a deduplicated earlier one.
    query: { skipAutoDetectionConfirmation: "1", forceNew: "1" },
    json: {
      name: project.name,
      project: project.id,
      files,
      projectSettings: { framework: "nextjs" },
      target: "production",
      meta: { aosBuildId: buildId },
    },
    retry: "rate-limit-only",
    deadline,
  });
}

export function getDeployment(scope: VercelScope, id: string, deadline?: number): Promise<Deployment> {
  return vercel<Deployment>(scope, `/v13/deployments/${encodeURIComponent(id)}`, { deadline });
}

/**
 * The deployment (if any) in this project tagged with this build id, created
 * at or after `sinceMs`. Used when a create response was lost. Returns
 * "unknown" when the search couldn't be completed: absence is reported only
 * after every candidate was checked.
 */
export async function findDeploymentForBuild(
  scope: VercelScope,
  projectIdOrName: string,
  buildId: string,
  sinceMs: number,
  deadline?: number,
): Promise<Deployment | null | "unknown"> {
  let until: string | undefined;
  for (let page = 0; page < 5; page++) {
    const list = await vercel<{ deployments: { uid: string }[]; pagination?: { next?: number | null } }>(scope, "/v7/deployments", {
      query: { projectId: projectIdOrName, since: String(sinceMs - 60_000), limit: "20", ...(until ? { until } : {}) },
      deadline,
    });
    for (const item of list.deployments ?? []) {
      let d: Deployment;
      try {
        d = await getDeployment(scope, item.uid, deadline);
      } catch (e) {
        // Deleted between list and read: not ours to find. Anything else: unknown.
        if (e instanceof VercelError && e.status === 404) continue;
        return "unknown";
      }
      if (d.meta?.aosBuildId === buildId) return d;
    }
    const next = list.pagination?.next;
    if (!next) return null;
    until = String(next);
  }
  return "unknown";
}

export type CancelResult = "cancelled" | "not-cancelable" | "failed";

/** A deployment already READY / ERROR / CANCELED answers 400 (not cancelable). */
export async function cancelDeployment(scope: VercelScope, id: string, deadline?: number): Promise<CancelResult> {
  try {
    await vercel(scope, `/v12/deployments/${encodeURIComponent(id)}/cancel`, { method: "PATCH", retry: "idempotent", deadline });
    return "cancelled";
  } catch (e) {
    return e instanceof VercelError && e.status === 400 ? "not-cancelable" : "failed";
  }
}
