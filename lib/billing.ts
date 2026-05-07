import type { Profile, Tier } from "@/types/database";

/**
 * Single source of truth for tier-derived limits.
 *
 * Pro is "active" iff `tier === 'pro'` AND `pro_until` is in the future.
 * Storing both fields lets us model: a user upgraded, then their card
 * declined — the renewal webhook clears `pro_until`, demoting them next
 * tick without overwriting their `tier` row state explicitly.
 *
 * In practice the Stripe webhook will keep both fields in lockstep, but the
 * "future date" check is the load-bearing one for entitlement decisions.
 */
export function effectiveTier(
  profile: Pick<Profile, "tier" | "pro_until"> | null
): Tier {
  if (!profile) return "free";
  if (profile.tier !== "pro") return "free";
  if (!profile.pro_until) return "free";
  return new Date(profile.pro_until).getTime() > Date.now() ? "pro" : "free";
}

export function activeCommitmentCap(tier: Tier): number {
  return tier === "pro" ? 3 : 1;
}

export const PRO_PRICE_USD_MONTHLY = 29;
