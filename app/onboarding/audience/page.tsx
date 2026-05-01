import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AudienceContent } from "./audience-content";

async function saveAudience(formData: FormData): Promise<void> {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const audience = formData.get("audience") as string;
  if (!audience) return;

  await (supabase.from("profiles") as any)
    .update({ audience })
    .eq("id", user.id);

  redirect("/onboarding/commitment");
}

export default async function AudiencePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("audience")
    .eq("id", user.id)
    .single()) as unknown as { data: { audience: string | null } | null };

  return (
    <AudienceContent
      initialAudience={profile?.audience ?? null}
      saveAction={saveAudience}
    />
  );
}
