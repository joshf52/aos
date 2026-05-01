import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PersonalizingContent } from "./personalizing-content";

export default async function PersonalizingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("build_mode, domains, audience, commitment_level")
    .eq("id", user.id)
    .single()) as unknown as {
    data: {
      build_mode: string | null;
      domains: string[] | null;
      audience: string | null;
      commitment_level: string | null;
    } | null;
  };

  return (
    <PersonalizingContent
      buildMode={(profile?.build_mode as "self" | "ai") ?? null}
      domains={profile?.domains ?? []}
      audience={profile?.audience ?? null}
      commitmentLevel={profile?.commitment_level ?? null}
    />
  );
}
