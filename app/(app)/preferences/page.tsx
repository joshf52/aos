import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PreferencesContent } from "./preferences-content";

type ProfileRow = {
  build_mode: string | null;
  domains: string[] | null;
  audience: string | null;
  commitment_level: string | null;
  unfair_advantage: string | null;
};

async function signOut(): Promise<void> {
  "use server";
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export default async function PreferencesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("build_mode, domains, audience, commitment_level, unfair_advantage")
    .eq("id", user.id)
    .single()) as unknown as { data: ProfileRow | null };

  return (
    <PreferencesContent
      email={user.email ?? ""}
      buildMode={(profile?.build_mode as "self" | "ai") ?? null}
      domains={profile?.domains ?? []}
      audience={profile?.audience ?? null}
      commitmentLevel={profile?.commitment_level ?? null}
      unfairAdvantage={profile?.unfair_advantage ?? null}
      signOut={signOut}
    />
  );
}
