/**
 * Lightweight Stripe REST helpers using fetch directly. We deliberately
 * avoid the `stripe` Node SDK to keep the dependency surface tight (see
 * CLAUDE.md). All calls target the 2024-06-20 API version.
 *
 * Two operations are needed for the MVP:
 *   - createCheckoutSession: redirect user to Stripe Checkout for the Pro
 *     subscription
 *   - retrieveSubscription: read sub state when a webhook fires (used to
 *     compute pro_until in case the event payload omits it)
 */

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_API_VERSION = "2024-06-20";

function authHeaders(): Record<string, string> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return {
    Authorization: `Bearer ${key}`,
    "Stripe-Version": STRIPE_API_VERSION,
  };
}

/**
 * Stripe expects application/x-www-form-urlencoded with bracketed nested
 * keys (e.g. `metadata[user_id]=abc`). Flatten one level deep, which is all
 * we need for Checkout sessions.
 */
function encodeForm(params: Record<string, unknown>): string {
  const out: string[] = [];
  const push = (k: string, v: unknown) => {
    if (v === undefined || v === null) return;
    out.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  };
  for (const [key, value] of Object.entries(params)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [subKey, subVal] of Object.entries(
        value as Record<string, unknown>
      )) {
        push(`${key}[${subKey}]`, subVal);
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item && typeof item === "object") {
          for (const [subKey, subVal] of Object.entries(
            item as Record<string, unknown>
          )) {
            push(`${key}[${i}][${subKey}]`, subVal);
          }
        } else {
          push(`${key}[${i}]`, item);
        }
      });
    } else {
      push(key, value);
    }
  }
  return out.join("&");
}

export type CheckoutSession = {
  id: string;
  url: string | null;
  customer: string | null;
};

export async function createCheckoutSession(params: {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  customerId?: string | null;
  userId: string;
}): Promise<CheckoutSession> {
  const body: Record<string, unknown> = {
    mode: "subscription",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    "line_items[0][price]": params.priceId,
    "line_items[0][quantity]": 1,
    "metadata[user_id]": params.userId,
    "subscription_data[metadata][user_id]": params.userId,
    allow_promotion_codes: "true",
  };
  if (params.customerId) {
    body.customer = params.customerId;
  } else if (params.customerEmail) {
    body.customer_email = params.customerEmail;
  }

  const res = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodeForm(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe checkout.sessions.create failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as CheckoutSession;
  return json;
}

export type StripeSubscription = {
  id: string;
  status: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
  customer: string;
  metadata?: Record<string, string>;
  items?: { data: Array<{ price: { id: string } }> };
};

export async function retrieveSubscription(
  subscriptionId: string
): Promise<StripeSubscription> {
  const res = await fetch(
    `${STRIPE_API_BASE}/subscriptions/${subscriptionId}`,
    { method: "GET", headers: authHeaders() }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe subscriptions.retrieve failed: ${res.status} ${text}`);
  }
  return (await res.json()) as StripeSubscription;
}
