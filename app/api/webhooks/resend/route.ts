import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import type { EmailKind, EmailStatus } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Resend → Svix webhook event types we care about. Anything outside this
// set is acknowledged but not logged, so adding a new Resend event type
// upstream never crashes the route.
const STATUS_BY_TYPE: Record<string, EmailStatus> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

// Reject events older than 5 minutes to neutralize replay attacks. Svix
// recommends this window.
const MAX_TIMESTAMP_SKEW_SECS = 60 * 5;

type ResendPayload = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    subject?: string;
    from?: string;
  };
};

function timingSafeEq(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify a Svix-style signature header against the raw request body.
 * Header format: "v1,<sig1> v1,<sig2> ..." (multiple sigs space-separated
 * during key rotation). Any one matching is sufficient.
 */
function verifySignature({
  secret,
  id,
  timestamp,
  body,
  signatureHeader,
}: {
  secret: string;
  id: string;
  timestamp: string;
  body: string;
  signatureHeader: string;
}): boolean {
  // Strip the whsec_ prefix and decode the shared secret.
  const cleaned = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(cleaned, "base64");
  } catch {
    return false;
  }
  const signed = `${id}.${timestamp}.${body}`;
  const expected = crypto
    .createHmac("sha256", key)
    .update(signed)
    .digest("base64");
  for (const part of signatureHeader.split(" ")) {
    const [version, sig] = part.split(",", 2);
    if (version !== "v1" || !sig) continue;
    if (timingSafeEq(sig, expected)) return true;
  }
  return false;
}

function inferKind(subject: string | undefined): EmailKind | null {
  if (!subject) return null;
  const s = subject.toLowerCase();
  if (s.includes("welcome")) return "welcome";
  if (s.includes("week") || s.includes("check-in") || s.includes("checkin")) {
    return "checkin_nudge";
  }
  return null;
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // Hard fail if the secret isn't configured rather than silently accepting
    // unsigned traffic.
    return NextResponse.json(
      { error: "webhook secret not configured" },
      { status: 500 }
    );
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "missing svix headers" },
      { status: 400 }
    );
  }

  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts)) {
    return NextResponse.json({ error: "bad timestamp" }, { status: 400 });
  }
  const skew = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (skew > MAX_TIMESTAMP_SKEW_SECS) {
    return NextResponse.json({ error: "timestamp too skewed" }, { status: 400 });
  }

  const body = await request.text();

  if (
    !verifySignature({
      secret,
      id: svixId,
      timestamp: svixTimestamp,
      body,
      signatureHeader: svixSignature,
    })
  ) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let payload: ResendPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const status = payload.type ? STATUS_BY_TYPE[payload.type] : undefined;
  if (!status) {
    // Unknown event type — accept gracefully without writing.
    return NextResponse.json({ ok: true, ignored: payload.type ?? null });
  }

  const data = payload.data ?? {};
  const recipient = Array.isArray(data.to) ? data.to[0] : data.to;
  const resendId = data.email_id ?? null;
  if (!recipient) {
    return NextResponse.json({ error: "no recipient" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Try to inherit the original send's kind + user_id by joining on resend_id.
  // Falls back to inferring from the subject line so we never drop an event.
  let kind: EmailKind | null = null;
  let userId: string | null = null;
  if (resendId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prior } = await (supabase.from("email_events") as any)
      .select("kind, user_id")
      .eq("resend_id", resendId)
      .eq("status", "sent")
      .limit(1)
      .maybeSingle();
    if (prior) {
      kind = (prior as { kind: EmailKind }).kind;
      userId = (prior as { user_id: string | null }).user_id;
    }
  }
  if (!kind) kind = inferKind(data.subject) ?? "welcome";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("email_events") as any).insert({
    user_id: userId,
    email: recipient.toLowerCase(),
    kind,
    status,
    resend_id: resendId,
    metadata: {
      type: payload.type,
      subject: data.subject ?? null,
      created_at: payload.created_at ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
