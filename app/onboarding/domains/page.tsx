import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DomainsContent } from "./domains-content";

async function saveDomains(formData: FormData): Promise<void> {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const domains = formData.getAll("domains") as string[];
  if (domains.length < 3) return;

  await (supabase.from("profiles") as any)
    .update({ domains })
    .eq("id", user.id);

  redirect("/onboarding/audience");
}

export default async function DomainsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("domains")
    .eq("id", user.id)
    .single()) as unknown as { data: { domains: string[] | null } | null };

  return (
    <DomainsContent
      initialDomains={profile?.domains ?? []}
      saveAction={saveDomains}
    />
  );
}
