import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe/client";
import { effectiveTier, PRO_PRICE_USD_MONTHLY } from "@/lib/billing";
import { UpgradeContent } from "./upgrade-content";

export const dynamic = "force-dynamic";

async function startCheckout(): Promise<void> {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/upgrade");

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRO_PRICE_ID not set");
  }

  // Reuse the customer if we already have one.
  const { data: profile } = (await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single()) as unknown as {
    data: { stripe_customer_id: string | null } | null;
  };

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  const session = await createCheckoutSession({
    priceId,
    userId: user.id,
    customerEmail: user.email ?? undefined,
    customerId: profile?.stripe_customer_id ?? null,
    successUrl: `${appUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appUrl}/upgrade?canceled=1`,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  redirect(session.url);
}

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: { canceled?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/upgrade");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("tier, pro_until")
    .eq("id", user.id)
    .single()) as unknown as {
    data: { tier: "free" | "pro"; pro_until: string | null } | null;
  };

  const tier = effectiveTier(profile);
  if (tier === "pro") redirect("/profile");

  return (
    <UpgradeContent
      priceUsd={PRO_PRICE_USD_MONTHLY}
      canceled={searchParams.canceled === "1"}
      startCheckout={startCheckout}
    />
  );
}
