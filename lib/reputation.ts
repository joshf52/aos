import type { SupabaseClient } from "@supabase/supabase-js";

export type ReputationStage = "Explorer" | "Builder" | "Shipper" | "Proven";

/**
 * Derive the right reputation stage from a user's commitment history.
 *
 * Rules:
 *   Explorer — default; signed up but never committed
 *   Builder  — has signed at least one covenant (any status)
 *   Shipper  — shipped at least one commitment
 *   Proven   — shipped three or more commitments
 *
 * Order matters: each stage subsumes the prior, so we evaluate top-down.
 */
export function deriveStage({
  totalCommitments,
  shippedCount,
}: {
  totalCommitments: number;
  shippedCount: number;
}): ReputationStage {
  if (shippedCount >= 3) return "Proven";
  if (shippedCount >= 1) return "Shipper";
  if (totalCommitments >= 1) return "Builder";
  return "Explorer";
}

/**
 * Recompute a user's reputation_stage from their current commitment counts and
 * write it to their profile if it has changed. Safe to call from any server
 * action that mutates commitment status.
 */
export async function recomputeReputation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<ReputationStage> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = (await supabase
    .from("commitments")
    .select("status")
    .eq("user_id", userId)) as unknown as {
    data: { status: string }[] | null;
  };

  const commitments = rows ?? [];
  const totalCommitments = commitments.length;
  const shippedCount = commitments.filter((c) => c.status === "completed").length;

  const stage = deriveStage({ totalCommitments, shippedCount });

  // Active count for free-tier gating
  const activeCount = commitments.filter((c) => c.status === "active").length;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("profiles") as any)
    .update({
      reputation_stage: stage,
      active_commitment_count: activeCount,
    })
    .eq("id", userId);

  return stage;
}
