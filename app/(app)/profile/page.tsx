import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileContent } from "./profile-content";

type ProfileRow = {
  reputation_stage: string;
  build_mode: string | null;
  domains: string[] | null;
  unfair_advantage: string | null;
  active_commitment_count: number;
};

type CommitmentRow = {
  id: string;
  opportunity_id: string;
  started_at: string;
  status: string;
};

function displayName(email: string): string {
  const local = email.split("@")[0];
  const name = local.split(/[._]/)[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [profileResult, commitmentsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "reputation_stage, build_mode, domains, unfair_advantage, active_commitment_count"
      )
      .eq("id", user.id)
      .single() as unknown as Promise<{ data: ProfileRow | null }>,

    supabase
      .from("commitments")
      .select("id, opportunity_id, started_at, status")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false }) as unknown as Promise<{
      data: CommitmentRow[] | null;
    }>,
  ]);

  const profile = profileResult.data;
  const commitments = commitmentsResult.data ?? [];
  const activeCommitment =
    commitments.find((c) => c.status === "active") ?? null;
  const shippedCount = commitments.filter(
    (c) => c.status === "completed"
  ).length;

  // Fetch opportunity title for active commitment
  let activeTitleResult = null;
  if (activeCommitment) {
    const res = (await supabase
      .from("opportunities")
      .select("title")
      .eq("id", activeCommitment.opportunity_id)
      .single()) as unknown as { data: { title: string } | null };
    activeTitleResult = res.data?.title ?? null;
  }

  // Total check-ins across all commitments
  const { count: checkinCount } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .in(
      "commitment_id",
      commitments.map((c) => c.id).filter(Boolean)
    );

  return (
    <ProfileContent
      name={displayName(user.email ?? "Builder")}
      reputationStage={profile?.reputation_stage ?? "Explorer"}
      buildMode={(profile?.build_mode as "self" | "ai") ?? null}
      domains={profile?.domains ?? []}
      unfairAdvantage={profile?.unfair_advantage ?? null}
      totalCommitments={commitments.length}
      shippedCount={shippedCount}
      checkinCount={checkinCount ?? 0}
      activeCommitmentTitle={activeTitleResult}
    />
  );
}
