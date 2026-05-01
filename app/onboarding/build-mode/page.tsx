import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BuildModeContent } from "./build-mode-content";

async function saveBuildMode(formData: FormData): Promise<void> {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const mode = formData.get("build_mode") as string;
  if (mode !== "self" && mode !== "ai") return;

  await (supabase.from("profiles") as any)
    .update({ build_mode: mode })
    .eq("id", user.id);

  redirect("/onboarding/domains");
}

export default async function BuildModePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return <BuildModeContent saveAction={saveBuildMode} />;
}
