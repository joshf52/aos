import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CommitmentContent } from "./commitment-content";

async function saveCommitment(formData: FormData): Promise<void> {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const commitment_level = formData.get("commitment_level") as string;
  if (!commitment_level) return;

  await (supabase.from("profiles") as any)
    .update({ commitment_level })
    .eq("id", user.id);

  redirect("/onboarding/advantage");
}

export default async function CommitmentPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("commitment_level, build_mode")
    .eq("id", user.id)
    .single()) as unknown as {
    data: { commitment_level: string | null; build_mode: string | null } | null;
  };

  return (
    <CommitmentContent
      initialCommitment={profile?.commitment_level ?? null}
      buildMode={(profile?.build_mode as "self" | "ai") ?? "self"}
      saveAction={saveCommitment}
    />
  );
}
