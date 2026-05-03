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
  completed_at: string | null;
  shipped_url: string | null;
};

type OpportunityTitleRow = { id: string; title: string };

type ShippedItem = {
  id: string;
  title: string;
  url: string | null;
  completedAt: string | null;
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
      .select("id, opportunity_id, started_at, status, completed_at, shipped_url")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false }) as unknown as Promise<{
      data: CommitmentRow[] | null;
    }>,
  ]);

  const profile = profileResult.data;
  const commitments = commitmentsResult.data ?? [];
  const activeCommitment =
    commitments.find((c) => c.status === "active") ?? null;
  const shippedCommitments = commitments.filter(
    (c) => c.status === "completed"
  );
  const shippedCount = shippedCommitments.length;

  // Fetch titles for active + shipped commitments in one query
  const idsToFetch = [
    ...(activeCommitment ? [activeCommitment.opportunity_id] : []),
    ...shippedCommitments.map((c) => c.opportunity_id),
  ];

  const titleById = new Map<string, string>();
  if (idsToFetch.length > 0) {
    const { data: titles } = (await supabase
      .from("opportunities")
      .select("id, title")
      .in("id", idsToFetch)) as unknown as { data: OpportunityTitleRow[] | null };
    (titles ?? []).forEach((row) => titleById.set(row.id, row.title));
  }

  const activeTitleResult = activeCommitment
    ? titleById.get(activeCommitment.opportunity_id) ?? null
    : null;

  const shippedHistory: ShippedItem[] = shippedCommitments.map((c) => ({
    id: c.id,
    title: titleById.get(c.opportunity_id) ?? "Untitled sprint",
    url: c.shipped_url,
    completedAt: c.completed_at,
  }));

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
      shippedHistory={shippedHistory}
    />
  );
}
