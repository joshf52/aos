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

  const returnTo = formData.get("_return_to") as string | null;
  redirect(returnTo || "/onboarding/domains");
}

export default async function BuildModePage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const returnTo = searchParams.from === "preferences" ? "/preferences" : undefined;
  return <BuildModeContent saveAction={saveBuildMode} returnTo={returnTo} />;
}
