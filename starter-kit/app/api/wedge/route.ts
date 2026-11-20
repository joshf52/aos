import { NextRequest, NextResponse } from "next/server";
import { config as kit } from "@/kit.config";
import { admit, admitGlobal, draft, globalLimiterConfigured, LIMITS, type Admission } from "@/lib/ai";

export const runtime = "nodejs";
// Room for the limiter (≤5 s) and one model call (LIMITS.timeoutMs, ≤55 s; no SDK retries).
export const maxDuration = 60;

// The limiter's per-app bucket: this app's commitment id.
const appId = kit.meta.commitmentId.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64) || "kit";

function refused(a: Extract<Admission, { ok: false }>) {
  const error =
    a.reason === "unavailable"
      ? "Drafting is paused right now. Try again in a minute."
      : a.reason === "daily"
        ? "Today's drafting limit is reached. Try again tomorrow."
        : "Too many drafts in a short time. Try again in a few minutes.";
  return NextResponse.json(
    { error },
    { status: a.reason === "unavailable" ? 503 : 429, headers: { "retry-after": String(a.retryAfterSeconds) } },
  );
}

function clientKey(req: NextRequest): string {
  // Vercel sets x-forwarded-for; the first hop is the client.
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.ip || "unknown";
}

export async function POST(req: NextRequest) {
  // A body of `null`, a number or an array parses fine but has no `input`.
  const body: unknown = await req.json().catch(() => null);
  const input = body !== null && typeof body === "object" ? (body as { input?: unknown }).input : undefined;
  if (typeof input !== "string" || input.trim().length === 0) {
    return NextResponse.json({ error: "Empty input." }, { status: 400 });
  }
  if (input.length > LIMITS.maxInputChars) {
    return NextResponse.json(
      { error: `Keep it under ${LIMITS.maxInputChars.toLocaleString("en-US")} characters.` },
      { status: 400 },
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  // Validation first, so malformed requests don't spend the visitor's quota.
  // One limiter decides: the global one (shared by every instance) when it is
  // configured or required, otherwise the per-instance one (local dev). Using
  // both would let a global refusal or outage burn local quota.
  const key = clientKey(req);
  if (globalLimiterConfigured() || LIMITS.requireGlobalLimit) {
    const global = await admitGlobal(appId, key);
    if (!global || !global.ok) return refused(global ?? { ok: false, reason: "unavailable", retryAfterSeconds: 60 });
  } else {
    const local = admit(key);
    if (!local.ok) return refused(local);
  }

  const prompt = kit.workflow.promptTemplate.replace("{input}", input);
  const result = await draft(kit.workflow.systemPrompt, prompt);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      {
        status: result.status,
        headers: result.retryAfterSeconds ? { "retry-after": String(result.retryAfterSeconds) } : undefined,
      },
    );
  }
  return NextResponse.json({ output: result.text, truncated: result.truncated });
}
