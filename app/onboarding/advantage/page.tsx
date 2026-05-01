import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdvantageContent } from "./advantage-content";

async function saveAdvantage(formData: FormData): Promise<void> {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const unfair_advantage = (formData.get("unfair_advantage") as string)?.trim();
  if (!unfair_advantage) return;

  await (supabase.from("profiles") as any)
    .update({ unfair_advantage })
    .eq("id", user.id);

  redirect("/onboarding/personalizing");
}

export default async function AdvantagePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("unfair_advantage, build_mode")
    .eq("id", user.id)
    .single()) as unknown as {
    data: { unfair_advantage: string | null; build_mode: string | null } | null;
  };

  return (
    <AdvantageContent
      initialText={profile?.unfair_advantage ?? ""}
      buildMode={(profile?.build_mode as "self" | "ai") ?? "self"}
      saveAction={saveAdvantage}
    />
  );
}
