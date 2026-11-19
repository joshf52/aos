/**
 * The slice of the Vercel REST API that AI Build uses, written against the
 * published contract (vercel.com/docs/rest-api, checked 2026-11-19):
 *
 *   POST  /v2/files                         upload one file by sha1
 *   POST  /v11/projects                     create the generated app's project
 *   GET   /v9/projects/{idOrName}           find it again on a rebuild
 *   POST  /v10/projects/{id}/env?upsert=true  set its environment variables
 *   POST  /v13/deployments                  create a deployment of the files
 *   GET   /v13/deployments/{id}             readyState: QUEUED … READY | ERROR | CANCELED
 *   PATCH /v12/deployments/{id}/cancel      stop a deployment we can't track
 *
 * `POST /v13/deployments` has no request field for environment variables
 * (the `env` in its response is a read-only list of key names), so env vars
 * go on the project before the deployment is created.
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

export class VercelError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
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
   * a second, untracked build, so that call retries only on 429.
   */
  retry?: "idempotent" | "rate-limit-only" | "none";
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Error text from Vercel, without echoing request values (env values could appear). */
async function describe(res: Response): Promise<{ message: string; code?: string }> {
  const text = await res.text().catch(() => "");
  try {
    const j = JSON.parse(text) as { error?: { code?: string; message?: string } };
    if (j.error) return { message: (j.error.message ?? "").slice(0, 300), code: j.error.code };
  } catch {
    // not JSON
  }
  return { message: text.slice(0, 200) };
}

export async function vercel<T>(scope: VercelScope, path: string, opts: CallOptions = {}): Promise<T> {
  const url = new URL(VERCEL_API + path);
  url.searchParams.set("teamId", scope.teamId);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);
  const retry = opts.retry ?? "idempotent";
  const attempts = retry === "none" ? 1 : 3;

  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(500 * 2 ** (i - 1));
    let res: Response;
    try {
      res = await fetch(url, {
        method: opts.method ?? "GET",
        headers: {
          Authorization: `Bearer ${scope.token}`,
          ...(opts.json !== undefined ? { "Content-Type": "application/json" } : {}),
          ...opts.headers,
        },
        body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body ? new Uint8Array(opts.body) : undefined,
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (e) {
      last = new VercelError(`Vercel ${path.split("?")[0]} did not respond (${e instanceof Error ? e.name : "error"}).`, 0);
      if (retry === "idempotent") continue;
      throw last;
    }
    if (res.ok) {
      const text = await res.text();
      return (text ? JSON.parse(text) : {}) as T;
    }
    const { message, code } = await describe(res);
    last = new VercelError(`Vercel ${opts.method ?? "GET"} ${url.pathname} failed (${res.status}${code ? ` ${code}` : ""}): ${message}`, res.status, code);
    const retryable = res.status === 429 || (retry === "idempotent" && res.status >= 500);
    if (!retryable || retry === "none") throw last;
    const ra = Number.parseInt(res.headers.get("retry-after") ?? "", 10);
    if (Number.isFinite(ra) && ra > 0) await sleep(Math.min(ra, 5) * 1000);
  }
  throw last;
}

// ---- projects ---------------------------------------------------------------

export type EnvVar = { key: string; value: string; type: "plain" | "encrypted" | "sensitive" };

type Project = { id: string; name: string };

/** Create the project, or find it on a rebuild of the same commitment. */
export async function ensureProject(scope: VercelScope, name: string): Promise<Project> {
  try {
    return await vercel<Project>(scope, "/v11/projects", {
      method: "POST",
      json: { name, framework: "nextjs" },
    });
  } catch (e) {
    // An existing project (same commitment, earlier build) is the expected
    // conflict. Anything else is a real failure.
    if (!(e instanceof VercelError) || (e.status !== 409 && e.code !== "conflict")) throw e;
    const p = await vercel<Project>(scope, `/v9/projects/${encodeURIComponent(name)}`);
    if (p.name !== name) throw new Error(`Vercel returned project ${p.name} for ${name}.`);
    return p;
  }
}

/** Set (or overwrite) the project's env vars; throws unless every one landed. */
export async function upsertEnv(scope: VercelScope, projectId: string, vars: EnvVar[]): Promise<void> {
  if (vars.length === 0) return;
  type EnvResponse = { created?: unknown; failed?: { error?: { code?: string; key?: string; envVarKey?: string } }[] };
  let res: EnvResponse;
  try {
    res = await vercel<EnvResponse>(scope, `/v10/projects/${encodeURIComponent(projectId)}/env`, {
      method: "POST",
      query: { upsert: "true" },
      json: vars.map((v) => ({ ...v, target: ["production", "preview"] })),
    });
  } catch (e) {
    // This request carries secret values, and Vercel's error text can quote
    // the request back. Keep only the status and code.
    if (e instanceof VercelError) {
      throw new VercelError(`Vercel env update failed (${e.status}${e.code ? ` ${e.code}` : ""}).`, e.status, e.code);
    }
    throw e;
  }
  const failed = res.failed ?? [];
  if (failed.length > 0) {
    // Key names and codes only — never values.
    const which = failed.map((f) => `${f.error?.envVarKey ?? f.error?.key ?? "?"}:${f.error?.code ?? "?"}`).join(", ");
    throw new Error(`Vercel rejected ${failed.length} environment variable(s): ${which}`);
  }
}

// ---- deployments --------------------------------------------------------------

export type UploadedFile = { file: string; sha: string; size: number };

export async function uploadFile(scope: VercelScope, path: string, buf: Buffer, sha: string): Promise<UploadedFile> {
  await vercel(scope, "/v2/files", {
    method: "POST",
    body: buf,
    headers: {
      "Content-Type": "application/octet-stream",
      "x-vercel-digest": sha,
      "Content-Length": String(buf.byteLength),
    },
  });
  return { file: path, sha, size: buf.byteLength };
}

export type ReadyState = "QUEUED" | "INITIALIZING" | "BUILDING" | "READY" | "ERROR" | "CANCELED" | "BLOCKED";

export type Deployment = {
  id: string;
  url: string;
  readyState: ReadyState;
  alias?: string[];
  aliasAssigned?: boolean | number | null;
  aliasError?: { code?: string; message?: string } | null;
  errorCode?: string;
  errorMessage?: string | null;
};

export async function createDeployment(
  scope: VercelScope,
  project: Project,
  files: UploadedFile[],
): Promise<Deployment> {
  return vercel<Deployment>(scope, "/v13/deployments", {
    method: "POST",
    query: { skipAutoDetectionConfirmation: "1" },
    json: {
      name: project.name,
      project: project.id,
      files,
      projectSettings: { framework: "nextjs" },
      target: "production",
    },
    retry: "rate-limit-only",
  });
}

export function getDeployment(scope: VercelScope, id: string): Promise<Deployment> {
  return vercel<Deployment>(scope, `/v13/deployments/${encodeURIComponent(id)}`);
}

/** Best effort: a deployment already READY / ERROR / CANCELED answers 400. */
export async function cancelDeployment(scope: VercelScope, id: string): Promise<void> {
  await vercel(scope, `/v12/deployments/${encodeURIComponent(id)}/cancel`, { method: "PATCH", retry: "none" }).catch(() => {});
}
