import { NextRequest, NextResponse } from "next/server";
import { config as kit } from "@/kit.config";
import { admit, draft, LIMITS } from "@/lib/ai";

export const runtime = "nodejs";
// Room for the model call (LIMITS.timeoutMs) plus SDK retries on 429/5xx.
export const maxDuration = 60;

function clientKey(req: NextRequest): string {
  // Vercel sets x-forwarded-for; the first hop is the client.
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.ip || "unknown";
}

export async function POST(req: NextRequest) {
  const { input } = (await req.json().catch(() => ({}))) as { input?: unknown };
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
  const admission = admit(clientKey(req));
  if (!admission.ok) {
    return NextResponse.json(
      {
        error:
          admission.reason === "daily"
            ? "Today's drafting limit is reached. Try again tomorrow."
            : "Too many drafts in a short time. Try again in a few minutes.",
      },
      { status: 429, headers: { "retry-after": String(admission.retryAfterSeconds) } },
    );
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
