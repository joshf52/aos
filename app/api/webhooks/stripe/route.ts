import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { retrieveSubscription } from "@/lib/stripe/client";
import type { Tier } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_TIMESTAMP_SKEW_SECS = 60 * 5;

type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

function timingSafeEq(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify a Stripe-Signature header. Format:
 *   t=<unix>,v1=<hex>,v1=<hex>,v0=<legacy>
 * Compute HMAC-SHA256(`${t}.${rawBody}`) with the webhook secret and match
 * against any v1 signature in constant time.
 */
function verifyStripeSignature({
  secret,
  body,
  header,
}: {
  secret: string;
  body: string;
  header: string;
}): boolean {
  const parts = header.split(",").map((p) => p.trim());
  let timestamp: string | null = null;
  const v1Sigs: string[] = [];
  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value;
    if (key === "v1") v1Sigs.push(value);
  }
  if (!timestamp || v1Sigs.length === 0) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > MAX_TIMESTAMP_SKEW_SECS) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return v1Sigs.some((sig) => timingSafeEq(sig, expected));
}

type SubscriptionFields = {
  id: string;
  status: string;
  customer: string;
  current_period_end: number;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string>;
};

const PRO_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Apply a subscription's state to the user's profile. Idempotent — running
 * twice with the same input is safe and returns the same result.
 */
async function applySubscription(sub: SubscriptionFields): Promise<void> {
  const svc = createServiceClient();
  const userId = sub.metadata?.user_id;

  // Resolve user: prefer metadata, fall back to stripe_customer_id lookup
  // for events that don't carry our metadata (e.g. portal-managed cancels).
  let resolvedUserId: string | null = userId ?? null;
  if (!resolvedUserId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (svc.from("profiles") as any)
      .select("id")
      .eq("stripe_customer_id", sub.customer)
      .maybeSingle();
    resolvedUserId = (data as { id: string } | null)?.id ?? null;
  }
  if (!resolvedUserId) {
    console.warn(
      `[stripe] could not resolve user for subscription ${sub.id} customer ${sub.customer}`
    );
    return;
  }

  const isPro = PRO_STATUSES.has(sub.status);
  const tier: Tier = isPro ? "pro" : "free";
  const proUntil = isPro
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (svc.from("profiles") as any)
    .update({
      tier,
      pro_until: proUntil,
      stripe_customer_id: sub.customer,
    })
    .eq("id", resolvedUserId);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "stripe webhook secret not configured" },
      { status: 500 }
    );
  }

  const sigHeader = request.headers.get("stripe-signature");
  if (!sigHeader) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const body = await request.text();
  if (!verifyStripeSignature({ secret, body, header: sigHeader })) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const obj = event.data.object as Record<string, unknown>;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // The session has subscription + customer. Pull the subscription so
        // we get period_end without depending on the event payload shape.
        const subscriptionId = obj.subscription as string | null;
        const customerId = obj.customer as string | null;
        const userId = (obj.metadata as Record<string, string> | undefined)
          ?.user_id;
        if (subscriptionId) {
          const sub = await retrieveSubscription(subscriptionId);
          await applySubscription({
            id: sub.id,
            status: sub.status,
            customer: sub.customer,
            current_period_end: sub.current_period_end,
            metadata: { ...(sub.metadata ?? {}), ...(userId ? { user_id: userId } : {}) },
          });
        } else if (userId && customerId) {
          // Subscriptionless checkout — record the customer for later.
          const svc = createServiceClient();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (svc.from("profiles") as any)
            .update({ stripe_customer_id: customerId })
            .eq("id", userId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await applySubscription(obj as unknown as SubscriptionFields);
        break;
      }
      case "invoice.payment_failed": {
        // Stripe will retry; a subsequent subscription.updated event with a
        // non-active status will demote the user. No-op here.
        break;
      }
      default:
        // Unknown event types are accepted to keep Stripe's retry counters clean.
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler failed", event.type, err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
