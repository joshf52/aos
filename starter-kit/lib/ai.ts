// Single source of truth for how a generated app talks to Claude: model,
// pricing used for cost logging, spend limits, and error mapping. Nothing else
// in the kit names a model. Server-only — imported by API routes.
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Models this kit is allowed to run, with list prices (USD per million tokens)
 * from platform.claude.com/docs/en/about-claude/pricing, checked 2026-11-19.
 * An override outside this table is ignored so cost logging stays accurate.
 */
export const MODEL_PRICING = {
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
  // Server-side refusal fallback target for Sonnet 5.5 (same list price).
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2 },
} as const;

export type KitModel = keyof typeof MODEL_PRICING;

export const DEFAULT_MODEL: KitModel = "claude-sonnet-5-5";
const FALLBACK_MODEL: KitModel = "claude-sonnet-5";

function isKitModel(m: string | undefined): m is KitModel {
  return !!m && Object.prototype.hasOwnProperty.call(MODEL_PRICING, m);
}

/** AI_MODEL may override the default, but only to a model priced above. */
export function resolveModel(env: string | undefined = process.env.AI_MODEL): KitModel {
  return isKitModel(env) ? env : DEFAULT_MODEL;
}

function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

/**
 * Spend controls. Output is the expensive side ($10/MTok on Sonnet 5.5) and
 * thinking counts toward max_tokens, so the output cap bounds the worst case:
 * ~2k input + 2k output tokens is about $0.024 per request at list price.
 */
export const LIMITS = {
  maxInputChars: intFromEnv("AI_MAX_INPUT_CHARS", 6000, 200, 20000),
  maxOutputTokens: intFromEnv("AI_MAX_OUTPUT_TOKENS", 2000, 256, 8000),
  // Request caps. With the kit Supabase configured these are enforced
  // globally by kit_admit_ai (supabase/schema.sql) across every instance; the
  // in-memory copies below are only a cheap first line per instance. Neither
  // is a spend ceiling: that is the Anthropic workspace spend limit on the key.
  perIpPerWindow: intFromEnv("AI_RATE_LIMIT_PER_IP", 8, 1, 1000),
  windowMs: intFromEnv("AI_RATE_LIMIT_WINDOW_SECONDS", 600, 10, 86400) * 1000,
  // Per app per UTC day.
  dailyRequestsPerApp: intFromEnv("AI_DAILY_REQUEST_CAP", 200, 1, 100000),
  // Every app sharing the kit Supabase project, per UTC day.
  dailyRequestsAllApps: intFromEnv("AI_GLOBAL_DAILY_REQUEST_CAP", 1000, 1, 1000000),
  // AOS sets this on every generated app: no global answer, no Claude call.
  requireGlobalLimit: process.env.AI_REQUIRE_GLOBAL_LIMIT === "1",
  // One attempt, no SDK retries: the route's maxDuration is 60 s, and a retry
  // after a long first attempt would be killed mid-flight with no JSON reply.
  // Upstream 429/529 go back to the browser with retry-after instead.
  // At most 50 s, so the limiter (≤5 s) plus the call fit in maxDuration 60.
  timeoutMs: intFromEnv("AI_TIMEOUT_SECONDS", 50, 5, 50) * 1000,
} as const;

// ---- rate limiting -------------------------------------------------------------

export type Admission =
  | { ok: true }
  | { ok: false; reason: "rate" | "daily" | "unavailable"; retryAfterSeconds: number };

// Global: one atomic check in the shared kit Supabase project.

let sb: SupabaseClient | null = null;

/**
 * Asks kit_admit_ai whether this request may call Claude. Returns null when
 * the limiter isn't configured and isn't required (local dev). When it is
 * required (every AOS-generated app), any failure to get an answer refuses
 * the request: fail closed, because the alternative is unbounded spend.
 */
export async function admitGlobal(appId: string, clientKey: string): Promise<Admission | null> {
  const unavailable: Admission = { ok: false, reason: "unavailable", retryAfterSeconds: 60 };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return LIMITS.requireGlobalLimit ? unavailable : null;
  sb ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // Raw IPs are never stored: the bucket key is a hash scoped to this app.
  const client = crypto.createHash("sha256").update(`${appId}:${clientKey}`).digest("hex").slice(0, 32);
  try {
    const { data, error } = await sb
      .rpc("kit_admit_ai", {
        p_app: appId,
        p_client: client,
        p_client_cap: LIMITS.perIpPerWindow,
        p_window_seconds: Math.round(LIMITS.windowMs / 1000),
        p_app_daily_cap: LIMITS.dailyRequestsPerApp,
        p_all_daily_cap: LIMITS.dailyRequestsAllApps,
      })
      .abortSignal(AbortSignal.timeout(5000));
    const r = data as { ok?: boolean; reason?: string; retry_after?: number } | null;
    if (error || !r || typeof r.ok !== "boolean") throw new Error(error?.message ?? "no answer");
    if (r.ok) return { ok: true };
    return {
      ok: false,
      reason: r.reason === "rate" ? "rate" : "daily",
      retryAfterSeconds: Math.max(1, Number(r.retry_after) || 60),
    };
  } catch (e) {
    console.error(JSON.stringify({ event: "ai_limiter_unavailable", required: LIMITS.requireGlobalLimit, message: e instanceof Error ? e.message : String(e) }));
    return LIMITS.requireGlobalLimit ? unavailable : null;
  }
}

// Local: in-memory, per server instance. A first line only — instances share
// no memory, so these numbers bound one instance, not the app.

const hits = new Map<string, number[]>();
let day = new Date().toISOString().slice(0, 10);
let dayCount = 0;

export function admit(clientKey: string, now = Date.now()): Admission {
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    dayCount = 0;
  }
  if (dayCount >= LIMITS.dailyRequestsPerApp) {
    const tomorrow = Date.parse(`${today}T00:00:00.000Z`) + 86_400_000;
    return { ok: false, reason: "daily", retryAfterSeconds: Math.ceil((tomorrow - now) / 1000) };
  }
  const recent = (hits.get(clientKey) ?? []).filter((t) => now - t < LIMITS.windowMs);
  if (recent.length >= LIMITS.perIpPerWindow) {
    hits.set(clientKey, recent);
    return { ok: false, reason: "rate", retryAfterSeconds: Math.ceil((LIMITS.windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(clientKey, recent);
  dayCount++;
  // Keep the map bounded on a long-lived instance.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now - v[v.length - 1] >= LIMITS.windowMs) hits.delete(k);
  }
  return { ok: true };
}

// ---- the call ---------------------------------------------------------------

export type DraftResult =
  | { ok: true; text: string; truncated: boolean }
  | { ok: false; status: number; error: string; retryAfterSeconds?: number };

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // Constructed lazily so a build without ANTHROPIC_API_KEY still succeeds.
  client ??= new Anthropic({ timeout: LIMITS.timeoutMs, maxRetries: 0 });
  return client;
}

type UsageLike = {
  model?: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

function attemptCost(model: string, u: UsageLike): number {
  const p = isKitModel(model) ? MODEL_PRICING[model] : MODEL_PRICING[DEFAULT_MODEL];
  return (
    ((u.input_tokens ?? 0) * p.input +
      (u.output_tokens ?? 0) * p.output +
      (u.cache_read_input_tokens ?? 0) * p.cacheRead +
      // 5-minute cache writes are 1.25x base input.
      (u.cache_creation_input_tokens ?? 0) * p.input * 1.25) /
    1_000_000
  );
}

/**
 * Top-level usage covers only the attempt that produced the reply. With a
 * server-side fallback, usage.iterations lists every attempt (a declined one
 * included), each with its own model — sum those. This is an upper bound: an
 * attempt declined before any output may not be billed.
 */
function estimateCostUsd(servedModel: string, usage: UsageLike & { iterations?: UsageLike[] | null }): number {
  const attempts = (usage.iterations ?? []).filter((i) => typeof i.input_tokens === "number");
  const cost = attempts.length
    ? attempts.reduce((sum, a) => sum + attemptCost(a.model ?? servedModel, a), 0)
    : attemptCost(servedModel, usage);
  return Math.round(cost * 1e6) / 1e6;
}

/** One drafting request. Never throws; upstream detail is logged, not returned. */
export async function draft(system: string, prompt: string): Promise<DraftResult> {
  const model = resolveModel();
  const started = Date.now();
  // Fallback entries must differ from the requested model (the API rejects a
  // duplicate), so an AI_MODEL override to the fallback model runs without one.
  const fallback = model === FALLBACK_MODEL ? null : FALLBACK_MODEL;
  try {
    const msg = await getClient().beta.messages.create({
      model,
      max_tokens: LIMITS.maxOutputTokens,
      // Adaptive thinking (the default on Sonnet 5.5) at low effort: the
      // documented setting for simple, cost-sensitive single-turn drafting.
      output_config: { effort: "low" },
      system,
      messages: [{ role: "user", content: prompt }],
      // On a safety decline the API re-runs the request on the fallback model
      // inside the same call (billed at that model's own rates). The docs
      // require `thinking` on a Claude Sonnet 5 entry under the 2026-06-01
      // header; set it explicitly (valid on Sonnet 5 under either header) and
      // use 2026-07-01, which also accepts this array form.
      ...(fallback
        ? {
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: [{ model: fallback, thinking: { type: "adaptive" as const } }],
          }
        : {}),
    });

    const text = msg.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    console.log(
      JSON.stringify({
        event: "ai_draft",
        requested_model: model,
        served_model: msg.model,
        stop_reason: msg.stop_reason,
        input_tokens: msg.usage.input_tokens,
        output_tokens: msg.usage.output_tokens,
        cache_read_input_tokens: msg.usage.cache_read_input_tokens ?? 0,
        attempts: msg.usage.iterations?.length ?? 1,
        est_cost_usd: estimateCostUsd(msg.model, msg.usage as UsageLike & { iterations?: UsageLike[] | null }),
        // A decline before any output is billed only in some refusal
        // categories, which iterations don't report, so any declined attempt
        // (a fallback ran, or the reply itself is a refusal) makes this an
        // upper bound.
        est_cost_is_upper_bound: (msg.usage.iterations?.length ?? 1) > 1 || msg.stop_reason === "refusal",
        ms: Date.now() - started,
      }),
    );

    if (msg.stop_reason === "refusal") {
      return { ok: false, status: 422, error: "This request can't be drafted. Try describing the situation differently." };
    }
    if (!text) {
      return { ok: false, status: 502, error: "No draft came back. Try again." };
    }
    return { ok: true, text, truncated: msg.stop_reason === "max_tokens" };
  } catch (e) {
    const ms = Date.now() - started;
    if (e instanceof Anthropic.RateLimitError) {
      const ra = Number.parseInt(e.headers?.get?.("retry-after") ?? "", 10);
      console.warn(JSON.stringify({ event: "ai_draft_error", kind: "rate_limited", status: 429, ms }));
      return { ok: false, status: 429, error: "Busy right now. Try again in a minute.", retryAfterSeconds: Number.isFinite(ra) ? ra : 60 };
    }
    if (e instanceof Anthropic.APIConnectionTimeoutError || e instanceof Anthropic.APIConnectionError) {
      console.warn(JSON.stringify({ event: "ai_draft_error", kind: "connection", ms }));
      return { ok: false, status: 504, error: "The drafting service didn't respond. Try again." };
    }
    if (e instanceof Anthropic.APIError && (e.status === 529 || e.status === 503)) {
      console.warn(JSON.stringify({ event: "ai_draft_error", kind: "overloaded", status: e.status, ms }));
      return { ok: false, status: 503, error: "Busy right now. Try again in a minute.", retryAfterSeconds: 30 };
    }
    if (e instanceof Anthropic.APIError) {
      // 400/401/403/404 are configuration problems (bad key, retired model,
      // malformed request) — loud in logs, generic to the visitor.
      console.error(JSON.stringify({ event: "ai_draft_error", kind: "api", status: e.status, type: (e.error as { error?: { type?: string } } | undefined)?.error?.type, ms }));
      return { ok: false, status: 502, error: "Drafting is unavailable right now." };
    }
    console.error(JSON.stringify({ event: "ai_draft_error", kind: "unexpected", ms, message: e instanceof Error ? e.message : String(e) }));
    return { ok: false, status: 500, error: "Something went wrong." };
  }
}
